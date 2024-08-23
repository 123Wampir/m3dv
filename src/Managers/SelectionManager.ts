import { Box3, Color, Object3D, Raycaster, Sphere, Vector2 } from "three";
import { TransformControls } from "three/examples/jsm/controls/TransformControls.js"
import type { Viewer } from "../Viewer";
import { type SceneManager } from "./SceneManager";
import { EventEmitter } from "../Event/Event";
import { BoundingType } from "./ModelManager";
import { ViewType } from "./Appearance";

export class SelectionManager extends EventEmitter {
    constructor(viewer: Viewer, color: number = 0x0099FF) {
        super();
        this.sceneManager = viewer.sceneManager;
        this.viewer = viewer;
        this.SELECTIONCOLOR = color;
        this.transformControls = new TransformControls(this.viewer.appearance.camera, this.viewer.renderer.domElement);
        this.transformControls.setSpace("local");
        viewer.sceneManager.scene.add(this.transformControls);
        this.transformControls.addEventListener('mouseUp', e => this.selectionEnabled = false);
        this.viewer.controls.orbitControls.addEventListener('change', e => this.selectionEnabled = false);
        this.viewer.controls.trackballControls.addEventListener('change', e => this.selectionEnabled = false);
        let context = viewer;
        this.transformControls.addEventListener('dragging-changed', function (event: any) {
            context.controls.GetCameraControl().enabled = !event.value;
        });
        this.viewer.renderer.domElement.addEventListener("click", e => this.onClickCallback(e));
    }
    selectionEnabled = false;
    viewer: Viewer;
    sceneManager: SceneManager;
    transformControls: TransformControls;
    selectMany = false;
    filters: string[] = [];
    target: Object3D[] = [];
    SELECTIONCOLOR = 0xff0000;

    override addListener(event: "change", listener: Function): void {
        super.addListener(event, listener);
    }
    override emit(event: "change", ...any: any): void {
        super.emit(event, ...any);
    }

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

    private onClickCallback(event: MouseEvent) {
        const pointer = new Vector2();
        pointer.x = (event.offsetX / this.viewer.renderer.domElement.clientWidth) * 2 - 1;
        pointer.y = - (event.offsetY / this.viewer.renderer.domElement.clientHeight) * 2 + 1;
        this.selectMany = event.shiftKey;
        this.HideSelected();
        if (this.selectionEnabled)
            this.Select(this.FindIntersection(pointer));
        else this.selectionEnabled = true;
        this.ShowSelected();
        this.viewer.appearance.Render();
    }

    private FindIntersection(pointer: Vector2): Object3D | undefined {
        let raycaster = new Raycaster();
        if (this.viewer.appearance.viewType == ViewType.isolated)
            raycaster.layers.set(1);
        raycaster.setFromCamera(pointer, this.viewer.appearance.camera);
        let intersects = raycaster.intersectObjects(this.sceneManager.modelManager.model.children);
        if (intersects.length != 0) {
            return intersects[0].object;
        }
        else return undefined;
    }
}