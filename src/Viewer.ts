import { SceneManager } from "./Managers/SceneManager";
import { SelectionManager } from "./Managers/SelectionManager";
import Stats from 'three/examples/jsm/libs/stats.module.js';
import { Explode, ExplodeType } from "./Managers/Objects/Explode";
import { Object3D, Renderer, Scene, WebGLRenderer } from "three";
import { Appearance, ViewFitType, ViewType } from "./Managers/Appearance";
import { Controls } from "./Managers/Controls";


export class Viewer {
    constructor(canvas: HTMLCanvasElement) {
        this.renderer = new WebGLRenderer({ antialias: true, canvas: canvas, logarithmicDepthBuffer: true });
        this.sceneManager = new SceneManager(new Scene());
        this.appearance = new Appearance(this);
        this.controls = new Controls(this);
        // document.body.appendChild(this.renderer.domElement)
        // this.appearance.effects.outline = true;

        this.selectionManager = new SelectionManager(this);

        this.sceneManager.modelManager.addListener("change", this.onUpVectorChange);
        this.sceneManager.addListener("loaded", this.onModelLoaded);

        this.stats = new Stats();
        this.renderer.domElement.parentElement?.appendChild(this.stats.dom);
        this.stats.dom.style.right = "0";
        this.stats.dom.style.left = "";
        this.SetAnimationLoop();
        this.appearance.Resize();
    }

    readonly renderer: Renderer;
    // private context: WebGLRenderingContext;

    readonly appearance: Appearance;
    readonly controls: Controls;

    readonly explodeView: Explode = new Explode();
    readonly sceneManager: SceneManager;
    readonly selectionManager: SelectionManager;


    private stats: Stats;

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