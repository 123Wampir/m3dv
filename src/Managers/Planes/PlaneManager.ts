import { EventEmitter } from "../../Event/Event";
import { Plane } from "./Plane";
import { SceneManager } from "../SceneManager";
import * as THREE from "three";


export enum SectionFillType {
    color,
    image
}

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

    override addListener(event: "change" | "delete", listener: Function): void {
        super.addListener(event, listener);
    }
    override emit(event: "change" | "delete", ...any: any): void {
        super.emit(event, ...any);
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

    private _color: THREE.Color = new THREE.Color(0xAAAAAA);
    get color(): string { return `#${this._color.getHexString()}`; };

    private _texture: THREE.Texture | null = null;
    get texture() { return this._texture; };

    private _type: SectionFillType = SectionFillType.color;
    get type(): SectionFillType { return this._type; };

    private readonly initialMaterials: Map<THREE.Mesh, THREE.Material> = new Map();

    Update() {
        if (this._planes.length != 0) {
            this._included.clear();
            this.Include(this.GetModel());
            this._planes.forEach(p => p.Update());
        }
        else this.InitPlanes();
    }


    InitPlanes() {
        this._planes.forEach(p => p.Dispose());
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
        this.emit("change", plane);
        return plane;
    }

    DeletePlane(plane: Plane) {
        this._planes.splice(this._planes.indexOf(plane));
        plane.Dispose();
        this.emit("delete", plane);
    }

    Exclude(model: THREE.Object3D) {
        model.traverse(item => {
            const mesh = item as THREE.Mesh;
            if (mesh.isMesh != undefined && mesh.isMesh) {
                const material = this.sceneManager.modelManager.materialManager.GetMaterial(mesh);
                if (!this.initialMaterials.has(mesh)) {
                    this.initialMaterials.set(mesh, material);
                    const tempMaterial = material.clone();
                    tempMaterial.clippingPlanes.length = 0;
                    this.sceneManager.modelManager.materialManager.SetMaterial(mesh, tempMaterial);
                }
            }
            this._included.delete(item);
        });
    }

    Include(model: THREE.Object3D) {
        model.traverse(item => {
            const mesh = item as THREE.Mesh;
            if (mesh.isMesh != undefined && mesh.isMesh) {
                if (this.initialMaterials.has(mesh)) {
                    const material = this.initialMaterials.get(mesh);
                    const tempMaterial = this.sceneManager.modelManager.materialManager.GetMaterial(mesh);
                    this.sceneManager.modelManager.materialManager.SetMaterial(mesh, material);
                    this.sceneManager.modelManager.materialManager.DeleteMaterial(tempMaterial);
                    this.initialMaterials.delete(mesh);
                }
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
            const planes = threePlanes.filter((p) => p != plane.plane);
            if (value) {
                for (let i = 0; i < planes.length; i++) {
                    planes[i] = planes[i].clone().negate();
                }
            }
            mat.clippingPlanes = planes;
        })

        this._clipIntersection = value;
    }

    GetModel(): THREE.Object3D {
        return this.sceneManager.modelManager.model;
    }

    GetThreePlanes(): THREE.Plane[] {
        const planes = this.planes.filter(plane => plane.visible == true);
        const threePlanes: THREE.Plane[] = [];
        planes.forEach(plane => threePlanes.push(plane.plane));
        return threePlanes;
    }

    SetSectionFillColor(color: number | string | null = null) {
        if (color == null)
            color = this.color;

        this._color.set(color);
        this.planes.forEach(p => p.planeMaterial.color = this._color);

        this._type = SectionFillType.color;
    }

    SetSectionFillImage(texture: THREE.Texture | null = null) {
        if (texture == null)
            texture = this.texture;
        if (texture == null)
            return;

        this.planes.forEach(p => {
            p.planeMaterial.map = texture;
            p.planeMaterial.needsUpdate = true;
        });
        this._type = SectionFillType.image;
        this._texture = texture;
    }

    async LoadSectionFillImage(url: string) {
        let map = await new THREE.TextureLoader().loadAsync(url);
        if (map != undefined) {
            this.disposeTexture();

            map.wrapS = THREE.RepeatWrapping;
            map.wrapT = THREE.RepeatWrapping;
            map.repeat.set(128, 128);
            console.log(map);

            this.SetSectionFillImage(map);
        }
    }

    private disposeTexture() {
        if (this.texture != null) {
            this.texture.dispose();
            this.planes.forEach(p => p.planeMaterial.map = null);
            this._texture = null;
        }
    }
}