import * as THREE from "three";
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
        this._selectionColor = new THREE.Color(color);
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
    private selectionEnabled = false;
    private readonly viewer: Viewer;
    private readonly sceneManager: SceneManager;
    private readonly transformControls: TransformControls;
    selectMany = false;
    readonly filters: string[] = [];
    private readonly _target: Set<THREE.Object3D> = new Set();
    private _selectionColor: THREE.Color;

    get selectionColor() { return this._selectionColor; };
    get target(): readonly THREE.Object3D[] { return Array.from(this._target); };

    override addListener(event: "change", listener: Function): void {
        super.addListener(event, listener);
    }
    override emit(event: "change", ...any: any): void {
        super.emit(event, ...any);
    }

    Select(object?: THREE.Object3D) {
        if (!this.selectMany) {
            this._target.clear();
        }
        if (object != undefined) {
            if (this._target.has(object)) {
                this._target.delete(object);
            }
            else {
                this._target.add(object);
            }
        }
        this.emit("change", this._target);
    }
    ShowSelected() {
        this._target.forEach(obj => obj.traverse(item => {
            if ((item as any).material == undefined)
                return;
            if ((item as any).material.userData.emissive == undefined)
                (item as any).material.userData.emissive = (item as any).material.emissive.getHex();
            (item as any).material.emissive.setHex(this.selectionColor.getHex());
            item.renderOrder = -1;
            item.onBeforeRender = (r, s, c, g, m, group) => {
                const material = m as any;
                if (material.emissive != undefined) {
                    material.emissive.setHex(this.selectionColor.getHex());
                }
            }
            item.onAfterRender = (r, s, c, g, m, group) => {
                const material = m as any;
                if (material.emissive != undefined)
                    material.emissive.setHex((item as any).material.userData.emissive);
            }
        }));
    }

    HideSelected() {
        this._target.forEach(obj => obj.traverse(item => {
            if ((item as any).material == undefined)
                return;
            item.renderOrder = 0;
            if ((item as any).material.userData.emissive != undefined) {
                (item as any).material.emissive.setHex((item as any).material.userData.emissive);
                item.onBeforeRender = () => { };
                item.onAfterRender = () => { };
            }
        }));
    }

    GetBounding(type: BoundingType): THREE.Box3 | THREE.Sphere {
        switch (type) {
            case BoundingType.box:
                return this.GetBoundingBox();
            case BoundingType.sphere:
                return this.GetBoundingSphere();
        }
    }

    private GetBoundingBox(): THREE.Box3 {
        const box3 = new THREE.Box3();
        this._target.forEach(object => {
            const box = new THREE.Box3().setFromObject(object);
            box3.union(box);
        })
        return box3;
    }

    private GetBoundingSphere(): THREE.Sphere {
        const box3 = new THREE.Box3();
        this._target.forEach(object => {
            const box = new THREE.Box3().setFromObject(object);
            box3.union(box);
        })
        const sphere = new THREE.Sphere;
        return box3.getBoundingSphere(sphere);
    }

    SetSelectionColor(color: number | string) {
        this._selectionColor = new THREE.Color(color);
        this.HideSelected();
        this.ShowSelected();
    }

    private onClickCallback(event: MouseEvent) {
        const pointer = new THREE.Vector2();
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

    private FindIntersection(pointer: THREE.Vector2): THREE.Object3D | undefined {
        let raycaster = new THREE.Raycaster();
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