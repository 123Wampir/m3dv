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
        this.trackballControls = new TrackballControls(viewer.appearance.camera, viewer.renderer.domElement);
        this.orbitControls = new OrbitControls(viewer.appearance.camera, viewer.renderer.domElement);
        this.SetCameraControl(ControlsType.orbit);
        this._initControls();
    }

    override addListener(event: "start" | "change" | "end", listener: Function): void {
        super.addListener(event, listener);
    }
    override emit(event: "start" | "change" | "end", ...any: any): void {
        super.emit(event, ...any);
    }

    private viewer: Viewer;

    readonly trackballControls: TrackballControls;
    readonly orbitControls: OrbitControls;

    controlsType: ControlsType = ControlsType.orbit;
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
            this.emit("start", this);
        }
        const onchange = () => {
            this.emit("change", this);
            this.viewer.appearance.Render();
        }
        const onend = () => {
            this.emit("end", this);
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