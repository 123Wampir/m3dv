import { OrbitControls, TrackballControls } from "three/examples/jsm/Addons.js";
import { EventEmitter } from "../Event/Event";
import { Object3D } from "three";
import { Viewer } from "../Viewer";

export enum ControlsType {
    orbit,
    trackball
}

export class Controls extends EventEmitter {
    constructor(viewer: Viewer) {
        super();

        this.viewer = viewer;
        this.trackballControls = new TrackballControls(viewer.appearance.GetCamera(), viewer.renderer.domElement);
        this.orbitControls = new OrbitControls(viewer.appearance.GetCamera(), viewer.renderer.domElement);
        this.SetCameraControl(ControlsType.orbit);
        this._initControls();
    }

    private viewer: Viewer;

    readonly trackballControls: TrackballControls;
    readonly orbitControls: OrbitControls;

    controlsType: ControlsType = ControlsType.trackball;
    private cameraControl!: OrbitControls | TrackballControls;

    SetCameraControl(type: ControlsType) {
        this.controlsType = type;
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

    SwitchCameraControls() {
        this.controlsType = this.controlsType == ControlsType.trackball ? ControlsType.orbit : ControlsType.trackball;
        this.SetCameraControl(this.controlsType);
    }

    private _initControls() {
        const onstart = () => {
            // if (this.viewer.appearance.hideSmallPartsOnCameraMove)
            //     this.hideSmallParts = true;
        }
        const onchange = () => {
            // if (this.hideSmallParts && this.viewer.appearance.viewType != ViewType.isolated) {
            //     this.smallParts.forEach((value, item) => item.visible = false);
            //     this.hideSmallParts = false;
            // }
            this.viewer.appearance.Render();
        }
        const onend = () => {
            // this.smallParts.forEach((value, item) => item.visible = value);
            // this.hideSmallParts = false;
            this.viewer.appearance.Render();
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
}