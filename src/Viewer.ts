import { CameraType, SceneManager, ViewType } from "./Managers/SceneManager";
import { TrackballControls } from 'three/examples/jsm/controls/TrackballControls.js';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { SelectionManager } from "./Managers/SelectionManager";
import { OutlineEffect } from "three/examples/jsm/effects/OutlineEffect.js"
import { BoundingType } from "./Managers/ModelManager";
import Stats from 'three/examples/jsm/libs/stats.module.js';
import { ComputeVolume } from "./Utils/Math";
import { Enviroment } from "./Managers/Objects/Background";
import { Explode, ExplodeType } from "./Managers/Objects/Explode";
import { Object3D, Raycaster, Renderer, Sphere, Vector2, Vector3, WebGLRenderer } from "three";

export enum ControlsType {
    orbit,
    trackball
}

export enum ViewFitType {
    model,
    selected,
    isolated
}

export class Viewer {
    constructor(renderer: Renderer, sceneManager: SceneManager) {
        this.renderer = renderer;
        this.sceneManager = sceneManager;

        this.outlineEffect = new OutlineEffect(this.renderer as WebGLRenderer, { defaultAlpha: 0.7, defaultThickness: 0.004 });

        this.enviroment = new Enviroment(this);
        this.enviroment.SetBackgroundColor();

        this.trackballControls = new TrackballControls(this.sceneManager.GetCamera(), this.renderer.domElement);
        this.orbitControls = new OrbitControls(this.sceneManager.GetCamera(), this.renderer.domElement);
        this.initControls();

        this.selectionManager = new SelectionManager(this.sceneManager, this);
        this.SetCameraControl(this.controlsType);

        this.OnResizeCallback();
        this.sceneManager.modelManager.addListener("upVecChange", this.onUpVectorChange);
        this.sceneManager.addListener("loaded", this.onModelLoaded);

        this.stats = new Stats();
        renderer.domElement.parentElement?.appendChild(this.stats.dom);

        this.SetAnimationLoop();
    }
    readonly explodeView: Explode = new Explode();
    readonly enviroment: Enviroment;
    readonly renderer: Renderer;
    readonly sceneManager: SceneManager;
    readonly selectionManager: SelectionManager;
    readonly trackballControls: TrackballControls;
    readonly orbitControls: OrbitControls;

    private controlsType: ControlsType = ControlsType.trackball;
    private cameraControl!: OrbitControls | TrackballControls;
    private outlineEffect: OutlineEffect;

    private stats: Stats;
    optimizedRendering: boolean = false;


    SetCameraControl(type: ControlsType) {
        if (type == ControlsType.orbit) {
            this.cameraControl = this.orbitControls;
            this.cameraControl.object.up = Object3D.DEFAULT_UP.clone();
            this.trackballControls.enabled = false;
        }
        else {
            this.cameraControl = this.trackballControls;
            this.orbitControls.enabled = false;
        }
        this.cameraControl.enabled = true;
    }

    GetCameraControl() {
        return this.cameraControl;
    }

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
        this.GetCameraControl().target.copy(bsphere.center);
        const direction = new Vector3();
        this.sceneManager.GetCamera().getWorldDirection(direction);
        const finishPosition = bsphere.center.clone().add(direction.negate().normalize().multiplyScalar(bsphere.radius * 2));
        this.sceneManager.perspectiveCamera.position.copy(finishPosition);
    }

    SwitchCameraControls() {
        this.controlsType = this.controlsType == ControlsType.trackball ? ControlsType.orbit : ControlsType.trackball;
        this.SetCameraControl(this.controlsType);
    }

    SwitchCameraType() {
        this.sceneManager.cameraType = this.sceneManager.cameraType == CameraType.perspective ? CameraType.orthographic : CameraType.perspective;
        this.sceneManager.SetCameraType(this.sceneManager.cameraType);
        this.selectionManager.transformControls.camera = this.sceneManager.GetCamera();
        this.Render();
    }

    FindIntersection(pointer: Vector2): Object3D | undefined {
        let raycaster = new Raycaster();
        if (this.sceneManager.viewType == ViewType.isolated)
            raycaster.layers.set(1);
        raycaster.setFromCamera(pointer, this.sceneManager.GetCamera());
        let intersects = raycaster.intersectObjects(this.sceneManager.modelManager.GetModel().children);
        if (intersects.length != 0) {
            return intersects[0].object;
        }
        else return undefined;
    }

    Isolate() {
        if (this.sceneManager.viewType == ViewType.default) {
            if (this.selectionManager.target.length != 0) {
                console.log(this.selectionManager.target.length);
                this.selectionManager.target.forEach(object => {
                    object.layers.toggle(1);
                })
                this.sceneManager.SetCameraViewType(ViewType.isolated);
                this.FitInView(ViewFitType.isolated);
            }
        }
        else {
            this.sceneManager.modelManager.GetModel().traverse(obj => {
                obj.layers.disable(1);
            })
            this.sceneManager.SetCameraViewType(ViewType.default);
            this.FitInView(ViewFitType.model);
        }
        this.Render();
    }

    SetVisibility(model: Object3D, visible: boolean) {
        model.traverse(item => {
            item.visible = visible;
        })
        this.Render();
    }

    private CopyCameraPlacement() {
        if (this.controlsType == ControlsType.trackball)
            this.orbitControls.target.copy(this.trackballControls.target);
        else this.trackballControls.target.copy(this.orbitControls.target);

        this.sceneManager.perspectiveCamera.updateMatrix();
        this.sceneManager.orthographicCamera.matrixAutoUpdate = false;
        this.sceneManager.orthographicCamera.matrix.copy(this.sceneManager.perspectiveCamera.matrix);
        let zoom = this.trackballControls.position0.length() /
            this.sceneManager.perspectiveCamera.position.length() /
            (2 * Math.atan(Math.PI * this.sceneManager.perspectiveCamera.fov / 360));
        zoom /= 1.2;
        this.sceneManager.orthographicCamera.zoom = zoom;
        this.sceneManager.orthographicCamera.updateProjectionMatrix();
    }

    private SetAnimationLoop() {
        let viewer = this;
        function animate() {
            requestAnimationFrame(animate);
            viewer.cameraControl.update();
            viewer.CopyCameraPlacement();
            viewer.stats.update();
        }
        this.Render();
        animate();
    }

    Render() {
        this.renderer.render(this.sceneManager.GetScene(), this.sceneManager.GetCamera());
        if (!this.optimizedRendering)
            this.renderEffects();
    }

    private renderEffects() {
        this.outlineEffect.renderOutline(this.sceneManager.modelManager.GetModel() as any, this.sceneManager.GetCamera());
    }

    private onUpVectorChange = () => {
        this.explodeView.InitExplode(this.sceneManager.modelManager.GetModel(), this.explodeView.type);
        this.sceneManager.planes.forEach(plane => plane.Update());
        this.Render();
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

    private initControls() {
        const onstart = () => {
            if (this.optimizedRendering)
                this.hideSmallParts = true;
        }
        const onchange = () => {
            if (this.hideSmallParts && this.sceneManager.viewType != ViewType.isolated) {
                this.smallParts.forEach((value, item) => item.visible = false);
                this.hideSmallParts = false;
            }
            this.Render();
        }
        const onend = () => {
            this.smallParts.forEach((value, item) => item.visible = value);
            this.hideSmallParts = false;
            this.Render();
        }

        this.trackballControls.rotateSpeed = 5;
        this.trackballControls.panSpeed = 1;
        this.trackballControls.staticMoving = true;
        this.trackballControls.addEventListener("start", onstart);
        this.trackballControls.addEventListener("change", onchange);
        this.trackballControls.addEventListener("end", onend);
        this.orbitControls.addEventListener("start", onstart);
        this.orbitControls.addEventListener("change", onchange);
        this.orbitControls.addEventListener("end", onend);
    }

    OnResizeCallback() {
        let aspect = window.innerWidth / window.innerHeight;
        let width = window.innerWidth;
        let height = window.innerHeight;
        const frustumSize = 12.5;
        this.renderer.setSize(width, height);
        this.sceneManager.perspectiveCamera.aspect = aspect;
        this.sceneManager.perspectiveCamera.updateProjectionMatrix();
        this.sceneManager.orthographicCamera.left = -frustumSize * aspect / 2;
        this.sceneManager.orthographicCamera.right = frustumSize * aspect / 2;
        this.sceneManager.orthographicCamera.top = frustumSize / 2;
        this.sceneManager.orthographicCamera.bottom = -frustumSize / 2;
        this.sceneManager.orthographicCamera.updateProjectionMatrix();
        this.Render();
    }
}