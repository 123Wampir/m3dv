import { Box3, Color, Object3D, Sphere } from "three";
import { TransformControls } from "three/examples/jsm/controls/TransformControls.js"
import type { Viewer } from "../Viewer";
import { ViewType, type SceneManager } from "./SceneManager";
import { EventEmitter } from "../EventListener/Event";
import { BoundingType } from "./ModelManager";

export class SelectionManager extends EventEmitter {
    constructor(sceneManager: SceneManager, viewer: Viewer, color: number = 0x0099FF) {
        super();
        this.sceneManager = sceneManager;
        this.viewer = viewer;
        this.SELECTIONCOLOR = color;
        this.transformControls = new TransformControls(this.sceneManager.GetCamera(), this.viewer.renderer.domElement);
        this.transformControls.setSpace("local");
        sceneManager.GetScene().add(this.transformControls);
        this.transformControls.addEventListener('mouseUp', e => this.selectionEnabled = false);
        this.viewer.orbitControls.addEventListener('change', e => this.selectionEnabled = false);
        this.viewer.trackballControls.addEventListener('change', e => this.selectionEnabled = false);
        let context = viewer;
        this.transformControls.addEventListener('dragging-changed', function (event: any) {
            context.GetCameraControl().enabled = !event.value;
        });
    }
    selectionEnabled = false;
    viewer: Viewer;
    sceneManager: SceneManager;
    transformControls: TransformControls;
    selectMany = false;
    filters: string[] = [];
    target: Object3D[] = [];
    SELECTIONCOLOR = 0xff0000;

    Select(object?: Object3D) {
        if (!this.selectMany) {
            this.target.length = 0;
        }
        if (object != undefined) {
            if (this.filters.includes(object.type) || this.filters.length == 0) {
                let index = this.target.findIndex(obj => obj.uuid == object.uuid);
                if (index == -1) {
                    this.target.push(object);
                }
                else {
                    this.target.splice(index, 1);
                }
            }
        }
        this.emit("change", this.target);
    }
    ShowSelected() {
        this.target.forEach(obj => {
            obj.userData.emissive = (obj as any).material.emissive.getHex();
            (obj as any).material.emissive.setHex(this.SELECTIONCOLOR);
        });
    }

    HideSelected() {
        this.target.forEach(obj => {
            if (obj.userData.emissive != undefined)
                (obj as any).material.emissive.setHex(obj.userData.emissive);
        });
    }

    GetBounding(type: BoundingType): Box3 | Sphere {
        switch (type) {
            case BoundingType.box:
                return this.GetBoundingBox();
            case BoundingType.sphere:
                return this.GetBoundingSphere();
        }
    }

    private GetBoundingBox(): Box3 {
        const box3 = new Box3();
        this.target.forEach(object => {
            const box = new Box3().setFromObject(object);
            box3.union(box);
        })
        return box3;
    }

    private GetBoundingSphere(): Sphere {
        const box3 = new Box3();
        this.target.forEach(object => {
            const box = new Box3().setFromObject(object);
            box3.union(box);
        })
        const sphere = new Sphere;
        return box3.getBoundingSphere(sphere);
    }

    SetSelectionColor(color: number | string) {
        this.SELECTIONCOLOR = new Color(color).getHex();
        this.HideSelected();
        this.ShowSelected();
    }
}