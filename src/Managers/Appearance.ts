import { EventEmitter } from "../Event/Event";
import * as THREE from "three";
import { EffectComposer, OutputPass } from "three/examples/jsm/Addons.js";
import { Enviroment } from "./Objects/Enviroment";
import { Viewer } from "../Viewer";
import { ControlsType } from "./Controls";
import { Effects, MyRenderPass } from "./Effects";
import { ComputeVolume } from "../Utils/Math";
import { BoundingType } from "./ModelManager";

export enum ViewType {
    default,
    isolated
}

export enum CameraType {
    perspective,
    orthographic
}

export enum ViewFitType {
    model,
    selected,
    isolated
}

export class Appearance extends EventEmitter {
    constructor(viewer: Viewer) {
        super();

        this.viewer = viewer;
        // viewer.sceneManager.scene.add(this.orthographicCamera);
        this.composer = new EffectComposer(viewer.renderer as THREE.WebGLRenderer);
        this.SetCameraType(CameraType.perspective);
        this.SetCameraPos(new THREE.Vector3(5, 5, 5));
        this._addDefaultPasses();

        this.enviroment = new Enviroment(viewer);
        this.enviroment.SetBackgroundColor();

        this.effects = new Effects(viewer);
        window.addEventListener("resize", () => this._onResizeCallback());
    }
    private readonly viewer: Viewer;

    readonly composer: EffectComposer;
    readonly effects: Effects;
    readonly enviroment: Enviroment;

    renderEffects: boolean = true;

    private _hideSmallPartsOnCameraMove: boolean = false;
    get hideSmallPartsOnCameraMove() { return this._hideSmallPartsOnCameraMove; };
    set hideSmallPartsOnCameraMove(value: boolean) {
        if (value == true) {
            this.viewer.controls.addListener("start", (e) => this._onstart());
            this.viewer.controls.addListener("change", (e) => this._onchange());
            this.viewer.controls.addListener("end", (e) => this._onend());
        }
        else {
            console.log("");

            this._smallParts.clear();
            this.viewer.controls.removeListener("start", (e) => this._onstart());
            this.viewer.controls.removeListener("change", (e) => this._onchange());
            this.viewer.controls.removeListener("end", (e) => this._onend());
            console.log(this.viewer.controls);

        }
        this._hideSmallPartsOnCameraMove = value;
    }

    private _noSmallParts = false;
    private _smallParts: Map<THREE.Object3D, boolean> = new Map();
    private _setSmallParts() {
        const model = this.viewer.sceneManager.modelManager.model;
        this._smallParts.clear();
        const VOLUME_FACTOR = 10e3;
        const MIN_VOLUME = ComputeVolume(model) / VOLUME_FACTOR;
        model.traverse(item => {
            if (ComputeVolume(item) < MIN_VOLUME) {
                this._smallParts.set(item, item.visible);
            }
        });
        this._noSmallParts = this._smallParts.size == 0;
    }
    private _onstart() {
        if (this._smallParts.size == 0 && !this._noSmallParts)
            this._setSmallParts();
    }
    private _onchange() {
        if (this.viewer.appearance.viewType != ViewType.isolated) {
            this._smallParts.forEach((value, item) => item.visible = false);
        }
    }
    private _onend() {
        this._smallParts.forEach((value, item) => item.visible = value);
    }

    private _wireframe: boolean = false;
    get wireframe() { return this._wireframe; };
    set wireframe(value: boolean) {
        this.viewer.sceneManager.modelManager.model.traverse(object => {
            let obj = object as any;
            if (obj.material != undefined) {
                obj.material.wireframe = value;
            }
        })
        this._wireframe = value;
    }

    private _viewType: ViewType = ViewType.default;
    get viewType() { return this._viewType; };

    private _camera: THREE.Camera;
    get camera() { return this._camera; };
    private _cameraType: CameraType = CameraType.perspective;
    get cameraType() { return this._cameraType; };

    private readonly perspectiveCamera: THREE.PerspectiveCamera = new THREE.PerspectiveCamera(60, 16 / 9, 0.001, 10e6);
    private readonly orthographicCamera: THREE.OrthographicCamera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0.001, 10e6);


    Render() {
        this.composer.render();
    }

    private _addDefaultPasses() {
        const renderPass = new MyRenderPass(this.viewer);
        const outputPass = new OutputPass();
        this.composer.addPass(renderPass);
        this.composer.addPass(outputPass);
    }

    SetCameraType(type: CameraType) {
        this._camera = type == CameraType.perspective ? this.perspectiveCamera : this.orthographicCamera;
        this.composer.passes.forEach((pass: any) => {
            if (pass.camera)
                pass.camera = this.camera;
        })
        this._cameraType = type;
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
        this._viewType = view;
    }

    SetCameraPos(vec: THREE.Vector3) {
        this.perspectiveCamera.position.copy(vec);
    }

    CopyCameraPlacement() {
        if (this.viewer.controls.controlsType == ControlsType.trackball)
            this.viewer.controls.orbitControls.target.copy(this.viewer.controls.trackballControls.target);
        else this.viewer.controls.trackballControls.target.copy(this.viewer.controls.orbitControls.target);

        this.perspectiveCamera.updateMatrix();
        this.orthographicCamera.matrixAutoUpdate = false;
        this.orthographicCamera.matrix.copy(this.perspectiveCamera.matrix);
        this.orthographicCamera.matrixWorld.copy(this.perspectiveCamera.matrix);
        this._updateOrthographicCameraFrustum(this.perspectiveCamera.aspect);
    }

    FitInView(type: ViewFitType = ViewFitType.model) {
        let bsphere = new THREE.Sphere();
        switch (type) {
            case ViewFitType.model:
                bsphere = this.viewer.sceneManager.modelManager.GetBounding(BoundingType.sphere, ViewType.default) as THREE.Sphere;
                break;
            case ViewFitType.isolated:
                bsphere = this.viewer.sceneManager.modelManager.GetBounding(BoundingType.sphere, ViewType.isolated) as THREE.Sphere;
                break;
            case ViewFitType.selected:
                bsphere = this.viewer.selectionManager.GetBounding(BoundingType.sphere) as THREE.Sphere;
        }
        this.viewer.controls.GetCameraControl().target.copy(bsphere.center);
        const direction = new THREE.Vector3();
        this.camera.getWorldDirection(direction);
        const finishPosition = bsphere.center.clone().add(direction.negate().normalize().multiplyScalar(bsphere.radius * 2));
        this.SetCameraPos(finishPosition);
    }

    Reset() {
        this.wireframe = false;
        this._smallParts.clear();
        this._noSmallParts = false;
    }

    private _onResizeCallback() {
        const canvas = this.viewer.renderer.domElement;
        const width = canvas.clientWidth;
        const height = canvas.clientHeight;
        const aspect = width / height;

        this.viewer.renderer.setSize(width, height, false);
        this.composer.setSize(width, height);

        this.perspectiveCamera.aspect = aspect;
        this.perspectiveCamera.updateProjectionMatrix();

        this._updateOrthographicCameraFrustum(aspect);

        this.Render();
    }

    private _updateOrthographicCameraFrustum(aspect: number) {
        const length = this.viewer.controls.orbitControls.target.clone().sub(this.perspectiveCamera.position).length();
        const vertFov = this.perspectiveCamera.getEffectiveFOV();
        const h = Math.abs(2 * length * Math.tan(vertFov / 2 * Math.PI / 180));
        const w = h * aspect;
        this.orthographicCamera.left = -w / 2;
        this.orthographicCamera.right = w / 2;
        this.orthographicCamera.top = h / 2;
        this.orthographicCamera.bottom = -h / 2;
        this.orthographicCamera.updateProjectionMatrix();
    }

}