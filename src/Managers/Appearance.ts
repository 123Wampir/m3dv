
import { EventEmitter } from "../Event/Event";
import * as THREE from "three";
import { EffectComposer, OutputPass, Pass, RenderPass } from "three/examples/jsm/Addons.js";
import { Enviroment } from "./Objects/Background";
import { Viewer } from "../Viewer";
import { ControlsType } from "./Controls";
import { Effects } from "./Effects";

export enum ViewType {
    default,
    isolated
}

export enum CameraType {
    perspective,
    orthographic
}

export class Appearance extends EventEmitter {
    constructor(viewer: Viewer) {
        super();

        this.viewer = viewer;

        this.composer = new EffectComposer(viewer.renderer as THREE.WebGLRenderer);
        this.SetCameraType(CameraType.perspective);
        this._addDefaultPasses();

        this.enviroment = new Enviroment(viewer);
        // this.enviroment.SetBackgroundColor();

        this.effects = new Effects(viewer);
    }
    private readonly viewer: Viewer;
    readonly composer: EffectComposer;
    readonly effects: Effects;

    hideSmallPartsOnCameraMove: boolean = false;
    renderEffects: boolean = true;

    /// rework to get() set()
    viewType: ViewType = ViewType.default;
    readonly cameraType: CameraType = CameraType.perspective;
    private camera: THREE.Camera;
    readonly perspectiveCamera: THREE.PerspectiveCamera = new THREE.PerspectiveCamera(60, 16 / 9, 0.001, 10e6);
    readonly orthographicCamera: THREE.OrthographicCamera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0.001, 10e6);
    readonly enviroment: Enviroment;


    Render() {
        this.composer.render();
    }

    private _addDefaultPasses() {
        const renderPass = new RenderPass(this.viewer.sceneManager.GetScene(), this.camera);
        const outputPass = new OutputPass();
        this.composer.addPass(renderPass);
        this.composer.addPass(outputPass);
    }

    SetCameraType(type: CameraType) {
        this.camera = type == CameraType.perspective ? this.perspectiveCamera : this.orthographicCamera;
    }

    SetCameraViewType(view: ViewType) {
        if (view == ViewType.default) {
            this.perspectiveCamera.layers.set(0);
            this.orthographicCamera.layers.set(0);
        }
        else if (view == ViewType.isolated) {
            this.perspectiveCamera.layers.set(1);
            this.orthographicCamera.layers.set(1);
        }
        this.viewType = view;
    }

    GetCamera(): THREE.Camera {
        return this.camera;
    }

    CopyCameraPlacement() {
        if (this.viewer.controls.controlsType == ControlsType.trackball)
            this.viewer.controls.orbitControls.target.copy(this.viewer.controls.trackballControls.target);
        else this.viewer.controls.trackballControls.target.copy(this.viewer.controls.orbitControls.target);

        this.perspectiveCamera.updateMatrix();
        this.orthographicCamera.matrixAutoUpdate = false;
        this.orthographicCamera.matrix.copy(this.perspectiveCamera.matrix);
        let zoom = this.viewer.controls.trackballControls.position0.length() /
            this.perspectiveCamera.position.length() /
            (2 * Math.atan(Math.PI * this.perspectiveCamera.fov / 360));
        zoom /= 1.2;
        this.orthographicCamera.zoom = zoom;
        this.orthographicCamera.updateProjectionMatrix();
    }
}