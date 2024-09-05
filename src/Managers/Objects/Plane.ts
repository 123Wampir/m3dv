import * as BufferGeometryUtils from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import * as THREE from "three";

export class Plane {
    constructor(name: string, plane: THREE.Plane, model: THREE.Object3D) {
        this.name = name;
        this.plane = plane;
        Plane.PLANES.push(this);

        Plane.model = model;

        this.helper = new THREE.PlaneHelper(this.plane);
        this.helper.visible = false;


        this.order = Plane.ORDERS++;

        Plane.map.repeat = new THREE.Vector2(256, 256);
        Plane.map.wrapS = THREE.RepeatWrapping;
        Plane.map.wrapT = THREE.RepeatWrapping;
        const planeMat = new THREE.MeshBasicMaterial({
            // color: 0xfff000,
            map: Plane.map,
            stencilWrite: true,
            stencilRef: 0,
            stencilFunc: THREE.NotEqualStencilFunc,
            stencilFail: THREE.ReplaceStencilOp,
            stencilZFail: THREE.ReplaceStencilOp,
            stencilZPass: THREE.ReplaceStencilOp,
        });
        const planeGeom = new THREE.PlaneGeometry();
        this.cutPlane = new THREE.Mesh(planeGeom, planeMat);
        Plane.CUTPLANES.push(this.cutPlane);

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

        Plane.Include(model);
        this.Update();
    }
    name: string;
    plane: THREE.Plane;
    cutPlane: THREE.Mesh;
    stencilGroup: THREE.Group = new THREE.Group();
    helper: THREE.PlaneHelper;
    min: number = 0;
    max: number = 0;
    order: number;
    private visible = false;
    static model: THREE.Object3D;
    static ORDERS: number = 0;
    static PLANES: Plane[] = [];
    static CUTPLANES: THREE.Mesh[] = [];
    static map = new THREE.TextureLoader().load("/src/assets/test.jpg");
    static included: Map<THREE.Object3D, boolean> = new Map();
    static clipIntersection: boolean = false;

    SetVisibility(visible: boolean) {
        this.visible = visible;
        this.cutPlane.visible = visible;
        this.stencilGroup.visible = visible;

        const threePlanes = Plane.getPlanes();

        if (!Plane.clipIntersection)
            Plane.PLANES.forEach(plane => {
                (plane.cutPlane.material as THREE.Material).clippingPlanes =
                    threePlanes.filter((p) => p != plane.plane);
            })
        Plane.included.forEach((include, item) => {
            if (include) {
                const obj = (item as any);
                if (obj.material != undefined) {
                    (obj.material as THREE.Material).clippingPlanes = threePlanes;
                }
            }
        })
    }

    Invert() {
        this.plane.negate();
        this.min /= -1;
        this.max /= -1;
        const max = this.max;
        this.max = this.min;
        this.min = max;
    }

    SetOffset(offset: number) {
        this.plane.constant = offset;
    }

    Update() {
        const box = new THREE.Box3().setFromObject(Plane.model);
        const size = box.getBoundingSphere(new THREE.Sphere()).radius * 2;
        const center = box.getBoundingSphere(new THREE.Sphere()).center;

        this.min = -box.min.clone().multiply(this.plane.normal).length() - 1e-6;
        this.max = box.max.clone().multiply(this.plane.normal).length() + 1e-6;

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

    static Exclude(model: THREE.Object3D) {
        model.traverse(item => {
            if ((item as any).material != undefined) {
                const mat = (item as any).material as THREE.Material;
                mat.clippingPlanes = [];
            }
            Plane.included.set(item, false);
        });
    }

    static Include(model: THREE.Object3D) {
        let threePlanes = this.getPlanes();
        model.traverse(item => {
            if ((item as any).material != undefined) {
                const mat = (item as any).material as THREE.Material;
                mat.clippingPlanes = threePlanes;
            }
            Plane.included.set(item, true);
        });
    }

    static ClipIntersection(value: boolean) {
        this.model.traverse(item => {
            if ((item as any).material != undefined) {
                const mat = (item as any).material as THREE.Material;
                mat.clipIntersection = value;
            }
        })

        const threePlanes = this.getPlanes();

        this.PLANES.forEach(plane => {
            const mat = plane.cutPlane.material as THREE.Material;
            if (value)
                mat.clippingPlanes = [];
            else {
                mat.clippingPlanes =
                    threePlanes.filter((p) => p != plane.plane);
            }
        })

        this.clipIntersection = value;
    }

    private static getPlanes() {
        const planes = Plane.PLANES.filter(plane => plane.visible == true);
        const threePlanes: THREE.Plane[] = [];
        planes.forEach(plane => threePlanes.push(plane.plane));
        return threePlanes;
    }

    private createStencilMesh(): THREE.Group {
        var geometries: THREE.BufferGeometry[] = [];
        Plane.included.forEach((include, item) => {
            if (include)
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