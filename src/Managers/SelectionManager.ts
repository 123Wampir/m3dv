import type { Viewer } from "../Viewer";
import { EventEmitter } from "../Event/Event";
import { BoundingType } from "./ModelManager";
import { ViewType } from "./Appearance";
import { Box3, Color, Mesh, MeshToonMaterial, Object3D, Raycaster, Sphere, Vector2 } from "three";

export class SelectionManager extends EventEmitter {
    constructor(viewer: Viewer, color: number = 0x0099FF) {
        super();
        this.viewer = viewer;
        this._selectedMaterial.emissive = new Color(color);
        this.viewer.controls.orbitControls.addEventListener('change', e => this.selectionEnabled = false);
        this.viewer.controls.trackballControls.addEventListener('change', e => this.selectionEnabled = false);
        this.viewer.renderer.domElement.addEventListener("click", e => this.onClickCallback(e));
    }

    allowMultiple = false;
    readonly filters: string[] = [];
    get selectionColor() { return this._selectedMaterial.emissive; };
    get target(): readonly Object3D[] { return Array.from(this._target); };

    private selectionEnabled = false;
    private readonly viewer: Viewer;
    private readonly _target: Set<Object3D> = new Set();
    private _selectedMaterial = new MeshToonMaterial();

    override addListener(event: "change", listener: Function): void {
        super.addListener(event, listener);
    }
    override emit(event: "change", ...any: any): void {
        super.emit(event, ...any);
    }

    Select(object?: Object3D) {
        console.log(object);

        if (!this.allowMultiple) {
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
            const mesh = item as Mesh;
            if (mesh.isMesh != undefined && mesh.isMesh) {
                mesh.material = this._selectedMaterial;
            }
        }));
    }

    HideSelected() {
        this._target.forEach(obj => obj.traverse(item => {
            const mesh = item as Mesh;
            if (mesh.isMesh != undefined && mesh.isMesh) {
                mesh.material = this.viewer.sceneManager.modelManager.materialManager.GetMaterial(mesh);
            }
        }));
    }

    SetSelectionColor(color: number | string) {
        this._selectedMaterial.emissive = new Color(color);
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
        this._target.forEach(object => {
            const box = new Box3().setFromObject(object);
            box3.union(box);
        })
        return box3;
    }

    private GetBoundingSphere(): Sphere {
        const box3 = new Box3();
        this._target.forEach(object => {
            const box = new Box3().setFromObject(object);
            box3.union(box);
        })
        const sphere = new Sphere;
        return box3.getBoundingSphere(sphere);
    }

    private onClickCallback(event: MouseEvent) {
        if (this.selectionEnabled) {
            const pointer = new Vector2();
            pointer.x = (event.offsetX / this.viewer.renderer.domElement.clientWidth) * 2 - 1;
            pointer.y = - (event.offsetY / this.viewer.renderer.domElement.clientHeight) * 2 + 1;
            this.allowMultiple = event.shiftKey;
            this.HideSelected();
            this.Select(this.FindIntersection(pointer));
            this.ShowSelected();
            this.viewer.appearance.Render();
        }
        else this.selectionEnabled = true;
    }

    private FindIntersection(pointer: Vector2): Object3D | undefined {
        let raycaster = new Raycaster();
        if (this.viewer.appearance.viewType == ViewType.isolated)
            raycaster.layers.set(1);
        raycaster.setFromCamera(pointer, this.viewer.appearance.camera);
        let intersects = raycaster.intersectObjects(this.viewer.sceneManager.modelManager.model.children);
        if (intersects.length != 0) {
            const visible = intersects.filter(i => i.object.visible);
            if (visible.length != 0) {
                return visible[0].object;
            }
        }
        else return undefined;
    }
}