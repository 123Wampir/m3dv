import { SceneManager } from "./Managers/SceneManager";
import { SelectionManager } from "./Managers/SelectionManager";
import Stats from 'three/examples/jsm/libs/stats.module.js';
import { Explode, ExplodeType } from "./Managers/Objects/Explode";
import { Object3D, Renderer, Scene, WebGLRenderer } from "three";
import { Appearance, ViewFitType, ViewType } from "./Managers/Appearance";
import { Controls } from "./Managers/Controls";
import { FileManager, FileManagerOptions } from "./Managers/FileManager";
import { EventEmitter } from "./Event/Event";

export interface ViewerOptions {
    occtImportJsWasmPath?: string
}

export class Viewer extends EventEmitter {
    constructor(canvas: HTMLCanvasElement, options: ViewerOptions = null) {
        super();
        this.renderer = new WebGLRenderer({ antialias: true, canvas: canvas, logarithmicDepthBuffer: true });
        this.sceneManager = new SceneManager(new Scene());
        this.appearance = new Appearance(this);
        this.controls = new Controls(this);
        this.selectionManager = new SelectionManager(this);

        let fileManagerOptions: FileManagerOptions = {};
        if (options != null) {
            fileManagerOptions.occtimportjsWasmPath = options.occtImportJsWasmPath;
        }

        this.fileManager = new FileManager(fileManagerOptions);
        this.sceneManager.modelManager.addListener("change", this.onUpVectorChange);

        this.stats = new Stats();
        this.renderer.domElement.parentElement?.appendChild(this.stats.dom);
        this.stats.dom.style.right = "0";
        this.stats.dom.style.left = "";
        this.SetAnimationLoop();
        this.appearance.Resize();


    }

    readonly renderer: Renderer;

    readonly appearance: Appearance;
    readonly controls: Controls;

    readonly explodeView: Explode = new Explode();
    readonly sceneManager: SceneManager;
    readonly selectionManager: SelectionManager;
    readonly fileManager: FileManager;


    private stats: Stats;

    override emit(event: "loaded", ...any: any): void {
        super.emit(event, ...any);
    }

    override addListener(event: "loaded", listener: Function): void {
        super.addListener(event, listener);
    }

    LoadModelFile(filename: string, src: string, useWorker = true) {
        if (window.Worker != undefined && useWorker) {
            this.fileManager.LoadModelInWorker(src, filename)
                .then(e => {
                    this.sceneManager.ClearScene();
                    this.onModelLoaded(e);
                    this.emit("loaded");
                })
                .catch(e => console.log(e));
        }
        else {
            this.fileManager.LoadModel(src, filename)
                .then((e) => {
                    this.sceneManager.ClearScene();
                    this.onModelLoaded(e);
                    this.emit("loaded");
                })
                .catch(e => console.log(e));
        }
    }

    Isolate() {
        if (this.appearance.viewType == ViewType.default) {
            if (this.selectionManager.target.length != 0) {
                this.selectionManager.target.forEach(object => {
                    object.layers.toggle(1);
                })
                this.appearance.SetCameraViewType(ViewType.isolated);
                this.appearance.FitInView(ViewFitType.isolated);
            }
        }
        else {
            this.sceneManager.modelManager.model.traverse(obj => {
                obj.layers.disable(1);
            })
            this.appearance.SetCameraViewType(ViewType.default);
            this.appearance.FitInView(ViewFitType.model);
        }
        this.appearance.Render();
    }

    SetVisibility(model: Object3D, visible: boolean) {
        model.traverse(item => {
            item.visible = visible;
        })
        this.appearance.Render();
    }

    private SetAnimationLoop() {
        let viewer = this;
        function animate() {
            requestAnimationFrame(animate);
            viewer.controls.GetCameraControl().update();
            viewer.appearance.CopyCameraPlacement();
            viewer.stats.update();
        }
        viewer.appearance.Render();
        animate();
    }


    private onUpVectorChange = () => {
        this.explodeView.InitExplode(this.sceneManager.modelManager.model, this.explodeView.type);
        this.sceneManager.planes.forEach(plane => plane.Update());
        this.appearance.Render();
    }

    private onModelLoaded = (object: Object3D) => {
        console.log((this.renderer as WebGLRenderer).info.memory);
        this.sceneManager.modelManager.SetModel(object);
        this.appearance.Reset();
        this.EnableClipping();
        this.sceneManager.InitPlanes();
        this.explodeView.InitExplode(object, ExplodeType.phased);
        this.appearance.FitInView(ViewFitType.model);
    }

    EnableClipping() {
        (this.renderer as WebGLRenderer).localClippingEnabled = true;
    }
}