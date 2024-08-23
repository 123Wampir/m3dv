import { SceneManager } from "./Managers/SceneManager";
import { TrackballControls } from 'three/examples/jsm/controls/TrackballControls.js';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { SelectionManager } from "./Managers/SelectionManager";
import { OutlineEffect } from "three/examples/jsm/effects/OutlineEffect.js"
import { BoundingType } from "./Managers/ModelManager";
import Stats from 'three/examples/jsm/libs/stats.module.js';
import { ComputeVolume } from "./Utils/Math";
import { Enviroment } from "./Managers/Objects/Background";
import { Explode, ExplodeType } from "./Managers/Objects/Explode";
import { Object3D, Renderer, Scene, Sphere, Vector3, WebGLRenderer } from "three";
import { Appearance, ViewType } from "./Managers/Appearance";
import { Controls } from "./Managers/Controls";



export enum ViewFitType {
    model,
    selected,
    isolated
}

export class Viewer {
    constructor(context: WebGLRenderingContext) {
        this.context = context;
        this.renderer = new WebGLRenderer({ antialias: true, canvas: context.canvas, context: context!, logarithmicDepthBuffer: true });
        this.sceneManager = new SceneManager(new Scene());

        this.appearance = new Appearance(this);
        this.appearance.effects.outline = true;
        this.controls = new Controls(this);

        this.selectionManager = new SelectionManager(this.sceneManager, this);

        this.sceneManager.modelManager.addListener("change", this.onUpVectorChange);
        this.sceneManager.addListener("loaded", this.onModelLoaded);
        window.addEventListener("resize", () => this.OnResizeCallback());

        this.stats = new Stats();
        this.renderer.domElement.parentElement?.appendChild(this.stats.dom);

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




    FitInView(type: ViewFitType = ViewFitType.model) {
        let bsphere = new Sphere();
        switch (type) {
            case ViewFitType.model:
                bsphere = this.sceneManager.modelManager.GetBounding(BoundingType.sphere, ViewType.default) as Sphere;
                break;
            case ViewFitType.isolated:
                bsphere = this.sceneManager.modelManager.GetBounding(BoundingType.sphere, ViewType.isolated) as Sphere;
                break;
            case ViewFitType.selected:
                bsphere = this.selectionManager.GetBounding(BoundingType.sphere) as Sphere;
        }
        this.controls.GetCameraControl().target.copy(bsphere.center);
        const direction = new Vector3();
        this.appearance.GetCamera().getWorldDirection(direction);
        const finishPosition = bsphere.center.clone().add(direction.negate().normalize().multiplyScalar(bsphere.radius * 2));
        this.appearance.perspectiveCamera.position.copy(finishPosition);
    }



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
        this.explodeView.InitExplode(this.sceneManager.modelManager.GetModel(), this.explodeView.type);
        this.sceneManager.planes.forEach(plane => plane.Update());
        this.appearance.Render();
    }

    private onModelLoaded = (object: Object3D) => {
        console.log((this.renderer as WebGLRenderer).info.memory);
        this.sceneManager.modelManager.SetModel(object);
        this.setSmallParts(object);
        this.EnableClipping();
        this.sceneManager.InitPlanes();
        this.explodeView.InitExplode(object, ExplodeType.phased);
        this.FitInView(ViewFitType.model);
    }

    EnableClipping() {
        (this.renderer as WebGLRenderer).localClippingEnabled = true;
    }

    private hideSmallParts = false;
    smallParts: Map<Object3D, boolean> = new Map();
    private setSmallParts(model: Object3D) {
        this.smallParts.clear();
        const VOLUME_FACTOR = 10e3;
        const MIN_VOLUME = ComputeVolume(model) / VOLUME_FACTOR;
        model.traverse(item => {
            if (ComputeVolume(item) < MIN_VOLUME) {
                this.smallParts.set(item, item.visible);
            }
        });
    }

    OnResizeCallback() {
        const canvas = (this.context.canvas as HTMLElement);
        const width = canvas.clientWidth;
        const height = canvas.clientHeight;
        const aspect = width / height;
        const frustumSize = 12.5;
        this.renderer.setSize(width, height, false);
        this.appearance.composer.setSize(width, height);
        this.appearance.perspectiveCamera.aspect = aspect;
        this.appearance.perspectiveCamera.updateProjectionMatrix();
        this.appearance.orthographicCamera.left = -frustumSize * aspect / 2;
        this.appearance.orthographicCamera.right = frustumSize * aspect / 2;
        this.appearance.orthographicCamera.top = frustumSize / 2;
        this.appearance.orthographicCamera.bottom = -frustumSize / 2;
        this.appearance.orthographicCamera.updateProjectionMatrix();
        this.appearance.Render();
    }
}