import { SceneManager } from "./Managers/SceneManager";
import { SelectionManager } from "./Managers/SelectionManager";
import Stats from 'three/examples/jsm/libs/stats.module.js';
import { Explode, ExplodeType } from "./Managers/Objects/Explode";
import { Object3D, Renderer, Scene, WebGLRenderer } from "three";
import { Appearance, ViewFitType } from "./Managers/Appearance";
import { Controls } from "./Managers/Controls";


export class Viewer {
    constructor(context: WebGLRenderingContext) {
        this.context = context;
        this.renderer = new WebGLRenderer({ antialias: true, canvas: context.canvas, context: context!, logarithmicDepthBuffer: true });
        this.sceneManager = new SceneManager(new Scene());
        this.appearance = new Appearance(this);
        this.controls = new Controls(this);

        this.appearance.effects.outline = true;

        this.selectionManager = new SelectionManager(this);

        this.sceneManager.modelManager.addListener("change", this.onUpVectorChange);
        this.sceneManager.addListener("loaded", this.onModelLoaded);

        this.stats = new Stats();
        this.renderer.domElement.parentElement?.appendChild(this.stats.dom);
        this.stats.dom.style.right = "0";
        this.stats.dom.style.left = "";

        this.SetAnimationLoop();
    }

    readonly renderer: Renderer;
    private context: WebGLRenderingContext;

    readonly appearance: Appearance;
    readonly controls: Controls;

    readonly explodeView: Explode = new Explode();
    readonly sceneManager: SceneManager;
    readonly selectionManager: SelectionManager;


    private stats: Stats;
    optimizedRendering: boolean = false;

    SwitchCameraType() {
        // this.sceneManager.cameraType = this.sceneManager.cameraType == CameraType.perspective ? CameraType.orthographic : CameraType.perspective;
        // this.sceneManager.SetCameraType(this.sceneManager.cameraType);
        // this.selectionManager.transformControls.camera = this.sceneManager.GetCamera();
        // this.appearance.Render();
    }

    Isolate() {
        // if (this.sceneManager.viewType == ViewType.default) {
        //     if (this.selectionManager.target.length != 0) {
        //         console.log(this.selectionManager.target.length);
        //         this.selectionManager.target.forEach(object => {
        //             object.layers.toggle(1);
        //         })
        //         this.sceneManager.SetCameraViewType(ViewType.isolated);
        //         this.FitInView(ViewFitType.isolated);
        //     }
        // }
        // else {
        //     this.sceneManager.modelManager.GetModel().traverse(obj => {
        //         obj.layers.disable(1);
        //     })
        //     this.sceneManager.SetCameraViewType(ViewType.default);
        //     this.FitInView(ViewFitType.model);
        // }
        // this.appearance.Render();
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