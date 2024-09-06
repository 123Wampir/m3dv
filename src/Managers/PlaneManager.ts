import { EventEmitter } from "../Event/Event";
import { Plane } from "./Objects/Plane";
import { SceneManager } from "./SceneManager";
import * as THREE from "three";


export class PlaneManager extends EventEmitter {
    constructor(sceneManager: SceneManager, serviceGroup: THREE.Group) {
        super();
        this.sceneManager = sceneManager;

        this.clippingGroup.name = "ClippingGroup";
        this.clippingGroup.add(this.helpersGroup);
        this.clippingGroup.add(this.cutPlanesGroup);
        this.clippingGroup.add(this.stencilGroup);

        serviceGroup.add(this.clippingGroup);
    }

    private readonly sceneManager: SceneManager;
    private readonly clippingGroup: THREE.Group = new THREE.Group();
    private readonly helpersGroup: THREE.Group = new THREE.Group();
    private readonly cutPlanesGroup: THREE.Group = new THREE.Group();
    private readonly stencilGroup: THREE.Group = new THREE.Group();

    private readonly _planes: Plane[] = [];
    private _clipIntersection: boolean = false;
    private readonly _included: Set<THREE.Object3D> = new Set();
    get included(): readonly THREE.Object3D[] { return Array.from(this._included.values()); };

    get planes(): readonly Plane[] { return this._planes; };
    get clipIntersection() { return this._clipIntersection; };

    Update() {
        if (this._planes.length != 0) {
            this._included.clear();
            this.Include(this.GetModel());
            this._planes.forEach(p => p.Update());
        }
        else this.InitPlanes();
    }


    InitPlanes() {
        this._planes.length = 0;

        this.Include(this.GetModel());
        this.AddPlane("x", new THREE.Vector3(-1, 0, 0));
        this.AddPlane("y", new THREE.Vector3(0, -1, 0));
        this.AddPlane("z", new THREE.Vector3(0, 0, -1));
    }

    AddPlane(name: string, normal: THREE.Vector3): Plane {
        const threePlane = new THREE.Plane(normal);
        let plane = new Plane(this, name, threePlane);
        this._planes.push(plane);
        this.helpersGroup.add(plane.helper);
        this.cutPlanesGroup.add(plane.cutPlane);
        this.stencilGroup.add(plane.stencilGroup);
        return plane;
    }

    DeletePlane(plane: Plane) {
        this._planes.splice(this._planes.indexOf(plane));
        plane.Dispose();
    }

    Exclude(model: THREE.Object3D) {
        model.traverse(item => {
            if ((item as any).material != undefined) {
                const mat = (item as any).material as THREE.Material;
                mat.clippingPlanes = [];
            }
            this._included.delete(item);
        });
    }

    Include(model: THREE.Object3D) {
        let threePlanes = this.GetThreePlanes();
        model.traverse(item => {
            if ((item as any).material != undefined) {
                const mat = (item as any).material as THREE.Material;
                mat.clippingPlanes = threePlanes;
            }
            this._included.add(item);
        });
    }

    ClipIntersection(value: boolean) {
        this.sceneManager.modelManager.model.traverse(item => {
            if ((item as any).material != undefined) {
                const mat = (item as any).material as THREE.Material;
                mat.clipIntersection = value;
            }
        })

        const threePlanes = this.GetThreePlanes();

        this._planes.forEach(plane => {
            const mat = plane.cutPlane.material as THREE.Material;
            if (value)
                mat.clippingPlanes = [];
            else {
                mat.clippingPlanes =
                    threePlanes.filter((p) => p != plane.plane);
            }
        })

        this._clipIntersection = value;
    }

    GetModel(): THREE.Object3D {
        return this.sceneManager.modelManager.model;
    }

    GetThreePlanes(): THREE.Plane[] {
        const planes = this._planes.filter(plane => plane.visible == true);
        const threePlanes: THREE.Plane[] = [];
        planes.forEach(plane => threePlanes.push(plane.plane));
        return threePlanes;
    }
}