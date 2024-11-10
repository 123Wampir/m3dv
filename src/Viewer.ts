import { SceneManager } from "./Managers/SceneManager";
import { SelectionManager } from "./Managers/SelectionManager";
import Stats from 'three/examples/jsm/libs/stats.module.js';
import { Object3D, Renderer, Scene, WebGLRenderer, ObjectLoader } from "three";
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
        (this.renderer as WebGLRenderer).localClippingEnabled = true;
        this.sceneManager = new SceneManager(this);
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
        this.stats.dom.style.position = "absolute";
        this.showStats = false;
        this.SetAnimationLoop();
        this.appearance.Resize();
    }

    readonly renderer: Renderer;

    readonly appearance: Appearance;
    readonly controls: Controls;

    readonly sceneManager: SceneManager;
    readonly selectionManager: SelectionManager;
    readonly fileManager: FileManager;

    private _showStats: boolean = true;
    get showStats() { return this._showStats; };
    set showStats(value: boolean) {
        this._showStats = value;
        if (value) {
            this.stats.dom.style.display = "block";
        }
        else { this.stats.dom.style.display = "none"; }
    };
    private stats: Stats;

    override emit(event: "loaded", ...any: any): void {
        super.emit(event, ...any);
    }

    override addListener(event: "loaded", listener: Function): void {
        super.addListener(event, listener);
    }

    LoadModelFromJson(modelJson: string) {
        const loader = new ObjectLoader();
        const model = loader.parse(JSON.parse(modelJson)) as Scene;
        this.onModelLoaded(model);
    }

    ExportModelAsJson(): string {
        const json = JSON.stringify(this.sceneManager.modelManager.model.toJSON());
        return json;
    }

    LoadModelFile(filename: string, src: string, useWorker = false) {
        if (window.Worker != undefined && useWorker) {
            this.fileManager.LoadModelInWorker(src, filename)
                .then(e => {
                    this.sceneManager.Clear();
                    this.onModelLoaded(e);
                    this.emit("loaded");
                })
                .catch(e => console.log(e));
        }
        else {
            this.fileManager.LoadModel(src, filename)
                .then((e) => {
                    this.sceneManager.Clear();
                    this.onModelLoaded(e);
                    this.emit("loaded");
                })
                .catch(e => console.log(e));
        }
    }

    Isolate() {
        if (this.appearance.viewType == ViewType.default) {
            if (this.selectionManager.target.length != 0) {
                this.selectionManager.target.forEach(object => object.traverse(item => {
                    item.layers.toggle(1);
                }));
                this.appearance.SetCameraViewType(ViewType.isolated);
                this.appearance.FitInView(ViewFitType.isolated);
            }
        }
        else {
            this.sceneManager.modelManager.model.traverse(object => object.traverse(item => {
                item.layers.disable(1);
            }));
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
            viewer.stats.update();
        }
        viewer.appearance.Render();
        animate();
    }


    private onUpVectorChange = () => {
        this.sceneManager.explodeView.InitExplode(this.sceneManager.modelManager.model, this.sceneManager.explodeView.type);
        this.sceneManager.planeManager.planes.forEach(plane => plane.Update());
        this.appearance.Render();
    }

    private onModelLoaded = (object: Object3D) => {
        console.log((this.renderer as WebGLRenderer).info.memory);
        this.sceneManager.explodeView.Reset();
        this.sceneManager.modelManager.SetModel(object);
        this.resetScene();
    }

    private resetScene() {
        this.appearance.Reset();
        this.sceneManager.planeManager.Update();
        this.sceneManager.explodeView.InitExplode(this.sceneManager.modelManager.model, this.sceneManager.explodeView.type);
        this.appearance.FitInView(ViewFitType.model);
    }
}