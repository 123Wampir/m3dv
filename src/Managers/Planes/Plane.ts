import * as BufferGeometryUtils from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import { PlaneManager } from "./PlaneManager"
import * as THREE from "three";
import { EventEmitter } from '../../Event/Event';

export class Plane extends EventEmitter {
    constructor(planeManager: PlaneManager, name: string, plane: THREE.Plane) {
        super();
        this.name = name;
        this.plane = plane;
        this.planeManager = planeManager;
        this.helper = new THREE.PlaneHelper(this.plane);
        this.helper.visible = false;
        this._order = this.planeManager.planes.length + 1;

        const planeGeom = new THREE.PlaneGeometry();
        this.cutPlane = new THREE.Mesh(planeGeom, this.planeMaterial);

        this.cutPlane.onBeforeRender = () => {
            plane.coplanarPoint(this.cutPlane.position);
            this.cutPlane.lookAt(
                this.cutPlane.position.x - plane.normal.x,
                this.cutPlane.position.y - plane.normal.y,
                this.cutPlane.position.z - plane.normal.z,
            );
        }
        this.cutPlane.onAfterRender = (renderer) => {
            renderer.clearStencil();
        }
        this.cutPlane.renderOrder = this.order + 0.1;
        this.SetVisibility(false);
        this.Update();
    }
    readonly name: string;
    private readonly planeManager: PlaneManager;
    readonly plane: THREE.Plane;
    readonly cutPlane: THREE.Mesh;
    readonly stencilGroup: THREE.Group = new THREE.Group();
    readonly helper: THREE.PlaneHelper;

    private _min: number = 0;
    private _max: number = 0;
    private _order: number = 0;
    get min() { return this._min; };
    get max() { return this._max; };
    get order() { return this._order; };
    get offset() { return this.plane.constant; };
    get visible() { return this.cutPlane.visible; }

    readonly planeMaterial = new THREE.MeshBasicMaterial({
        color: 0xfff000,
        stencilWrite: true,
        stencilRef: 0,
        stencilFunc: THREE.NotEqualStencilFunc,
        stencilFail: THREE.ReplaceStencilOp,
        stencilZFail: THREE.ReplaceStencilOp,
        stencilZPass: THREE.ReplaceStencilOp,
    });

    override addListener(event: "change", listener: Function): void {
        super.addListener(event, listener);
    }
    override emit(event: "change", ...any: any): void {
        super.emit(event, ...any);
    }

    SetVisibility(visible: boolean) {
        this.cutPlane.visible = visible;
        this.stencilGroup.visible = visible;

        const threePlanes = this.planeManager.GetThreePlanes();

        if (!this.planeManager.clipIntersection)
            this.planeManager.planes.forEach(plane => {
                (plane.cutPlane.material as THREE.Material).clippingPlanes =
                    threePlanes.filter((p) => p != plane.plane);
            })
        this.planeManager.included.forEach(item => {
            const obj = (item as any);
            if (obj.material != undefined) {
                (obj.material as THREE.Material).clippingPlanes = threePlanes;
            }
        });
        this.planeManager.ClipIntersection(this.planeManager.clipIntersection);
        this.emit("change");
    }

    Invert() {
        this.plane.negate();
        this._min /= -1;
        this._max /= -1;
        const max = this.max;
        this._max = this.min;
        this._min = max;
        this.emit("change");
    }

    SetOffset(offset: number) {
        this.plane.constant = offset;
        this.planeManager.ClipIntersection(this.planeManager.clipIntersection);
        this.emit("change");
    }

    Update() {
        const box = new THREE.Box3().setFromObject(this.planeManager.GetModel());
        const size = box.getBoundingSphere(new THREE.Sphere()).radius * 2;
        const center = box.getBoundingSphere(new THREE.Sphere()).center;

        this._min = -box.min.clone().multiply(this.plane.normal).length() - 1e-6;
        this._max = box.max.clone().multiply(this.plane.normal).length() + 1e-6;

        this.stencilGroup.traverse(item => {
            if ((item as any).geometry != undefined) {
                var geom = (item as any).geometry as THREE.BufferGeometry;
                geom.dispose();
            }
        })
        this.stencilGroup.clear();
        this.stencilGroup.add(this.createStencilMesh());

        this.helper.size = size;

        const planeGeom = new THREE.PlaneGeometry(size * 3, size * 3);

        this.cutPlane.geometry.dispose();
        this.cutPlane.geometry = planeGeom;
        this.cutPlane.position.copy(center);
    }

    Dispose() {
        this.stencilGroup.removeFromParent();
        this.stencilGroup.traverse(item => {
            if ((item as any).geometry != undefined) {
                const geom = (item as any).geometry as THREE.BufferGeometry;
                geom.dispose();
            }
        })

        this.cutPlane.removeFromParent();
        this.cutPlane.geometry.dispose();
        (this.cutPlane.material as THREE.Material).dispose();

        this.helper.removeFromParent();
        this.helper.dispose();
    }

    private createStencilMesh(): THREE.Group {
        var geometries: THREE.BufferGeometry[] = [];
        this.planeManager.included.forEach(item => {
            if ((item as any).geometry != undefined) {
                var geom = (item as any).geometry as THREE.BufferGeometry;
                geom = geom.clone();
                item.updateMatrixWorld(true);
                geom.applyMatrix4(item.matrixWorld);
                if (geom.index != null)
                    geom = geom.toNonIndexed();
                if (geom.hasAttribute("color"))
                    geom.deleteAttribute("color");
                geometries.push(geom);
            }
        })
        var geometry = BufferGeometryUtils.mergeGeometries(geometries);
        geometries.forEach(item => item.dispose());
        geometries = [];

        const group = new THREE.Group();
        const mat1 = new THREE.MeshBasicMaterial({
            side: THREE.BackSide,
            stencilFunc: THREE.AlwaysStencilFunc,
            stencilFail: THREE.IncrementWrapStencilOp,
            stencilZFail: THREE.IncrementWrapStencilOp,
            stencilZPass: THREE.IncrementWrapStencilOp,
            colorWrite: false,
            depthTest: false,
            depthWrite: false,
            stencilWrite: true,
            clippingPlanes: [this.plane]
        });
        const mat2 = new THREE.MeshBasicMaterial({
            side: THREE.FrontSide,
            stencilFunc: THREE.AlwaysStencilFunc,
            stencilFail: THREE.DecrementWrapStencilOp,
            stencilZFail: THREE.DecrementWrapStencilOp,
            stencilZPass: THREE.DecrementWrapStencilOp,
            colorWrite: false,
            depthTest: false,
            depthWrite: false,
            stencilWrite: true,
            clippingPlanes: [this.plane]
        });
        const meshCopy1 = new THREE.Mesh(geometry, mat1);
        meshCopy1.renderOrder = this.order;
        group.add(meshCopy1);
        const meshCopy2 = new THREE.Mesh(geometry, mat2);
        meshCopy2.renderOrder = this.order;
        group.add(meshCopy2);
        return group;
    }

}