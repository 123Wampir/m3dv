import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import { PlaneManager } from "./PlaneManager"
import { EventEmitter } from '../../Event/Event';
import {
    AlwaysStencilFunc, BackSide, Box3, BufferGeometry, DecrementWrapStencilOp,
    FrontSide, Group, IncrementWrapStencilOp, Material, Mesh, MeshBasicMaterial,
    NotEqualStencilFunc, PlaneGeometry, PlaneHelper, ReplaceStencilOp, Sphere, Plane as ThreePlane
} from 'three';

export class Plane extends EventEmitter {
    constructor(planeManager: PlaneManager, name: string, plane: ThreePlane) {
        super();
        this.name = name;
        this.plane = plane;
        this.planeManager = planeManager;
        this.helper = new PlaneHelper(this.plane);
        this.helper.visible = false;
        this._order = this.planeManager.planes.length + 1;

        const planeGeom = new PlaneGeometry();
        this.cutPlane = new Mesh(planeGeom, this.planeMaterial);

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
    readonly plane: ThreePlane;
    readonly cutPlane: Mesh;
    readonly stencilGroup: Group = new Group();
    readonly helper: PlaneHelper;

    private _min: number = 0;
    private _max: number = 0;
    private _order: number = 0;
    get min() { return this._min; };
    get max() { return this._max; };
    get order() { return this._order; };
    get offset() { return this.plane.constant; };
    get visible() { return this.cutPlane.visible; }

    readonly planeMaterial = new MeshBasicMaterial({
        color: 0xfff000,
        stencilWrite: true,
        stencilRef: 0,
        stencilFunc: NotEqualStencilFunc,
        stencilFail: ReplaceStencilOp,
        stencilZFail: ReplaceStencilOp,
        stencilZPass: ReplaceStencilOp,
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
                (plane.cutPlane.material as Material).clippingPlanes =
                    threePlanes.filter((p) => p != plane.plane);
            })
        this.planeManager.included.forEach(item => {
            const obj = (item as any);
            if (obj.material != undefined) {
                (obj.material as Material).clippingPlanes = threePlanes;
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
        const box = new Box3().setFromObject(this.planeManager.GetModel());
        const size = box.getBoundingSphere(new Sphere()).radius * 2;
        const center = box.getBoundingSphere(new Sphere()).center;

        this._min = -box.min.clone().multiply(this.plane.normal).length() - 1e-6;
        this._max = box.max.clone().multiply(this.plane.normal).length() + 1e-6;

        this.stencilGroup.traverse(item => {
            if ((item as any).geometry != undefined) {
                var geom = (item as any).geometry as BufferGeometry;
                geom.dispose();
            }
        })
        this.stencilGroup.clear();
        this.stencilGroup.add(this.createStencilMesh());

        this.helper.size = size;

        const planeGeom = new PlaneGeometry(size * 3, size * 3);

        this.cutPlane.geometry.dispose();
        this.cutPlane.geometry = planeGeom;
        this.cutPlane.position.copy(center);
    }

    Dispose() {
        this.stencilGroup.removeFromParent();
        this.stencilGroup.traverse(item => {
            if ((item as any).geometry != undefined) {
                const geom = (item as any).geometry as BufferGeometry;
                geom.dispose();
            }
        })

        this.cutPlane.removeFromParent();
        this.cutPlane.geometry.dispose();
        (this.cutPlane.material as Material).dispose();

        this.helper.removeFromParent();
        this.helper.dispose();
    }

    private createStencilMesh(): Group {
        var geometries: BufferGeometry[] = [];
        this.planeManager.included.forEach(item => {
            if ((item as any).geometry != undefined) {
                var geom = (item as any).geometry as BufferGeometry;
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
        var geometry = mergeGeometries(geometries);
        geometries.forEach(item => item.dispose());
        geometries = [];

        const group = new Group();
        const mat1 = new MeshBasicMaterial({
            side: BackSide,
            stencilFunc: AlwaysStencilFunc,
            stencilFail: IncrementWrapStencilOp,
            stencilZFail: IncrementWrapStencilOp,
            stencilZPass: IncrementWrapStencilOp,
            colorWrite: false,
            depthTest: false,
            depthWrite: false,
            stencilWrite: true,
            clippingPlanes: [this.plane]
        });
        const mat2 = new MeshBasicMaterial({
            side: FrontSide,
            stencilFunc: AlwaysStencilFunc,
            stencilFail: DecrementWrapStencilOp,
            stencilZFail: DecrementWrapStencilOp,
            stencilZPass: DecrementWrapStencilOp,
            colorWrite: false,
            depthTest: false,
            depthWrite: false,
            stencilWrite: true,
            clippingPlanes: [this.plane]
        });
        const meshCopy1 = new Mesh(geometry, mat1);
        meshCopy1.renderOrder = this.order;
        group.add(meshCopy1);
        const meshCopy2 = new Mesh(geometry, mat2);
        meshCopy2.renderOrder = this.order;
        group.add(meshCopy2);
        return group;
    }

}