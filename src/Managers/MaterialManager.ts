import { Material, Mesh } from "three";
import { EventEmitter } from "../Event/Event";
import { ModelManager } from "./ModelManager";


export class MaterialManager extends EventEmitter {
    constructor(modelManager: ModelManager) {
        super();

        this.modelManager = modelManager;
    }

    private readonly modelManager: ModelManager;
    private readonly materials: Set<Material> = new Set<Material>();

    private modelMaterials: Map<Mesh, Material> = new Map();

    LoadMaterialsFromModel() {
        this.materials.clear();
        this.modelMaterials.clear();
        this.modelManager.model.traverse(object => {
            const mesh = object as Mesh;
            if (mesh.isMesh != undefined && mesh.isMesh) {
                const material = mesh.material as Material;
                this.AddMaterial(material);
                this.modelMaterials.set(mesh, material);
            }
        });
        console.log(this.materials);
    }

    Has(material: Material): boolean {
        return this.materials.has(material);
    }

    GetMaterials(): readonly Material[] {
        return Array.from(this.materials.values());
    }

    GetMaterial(mesh: Mesh): Material {
        return this.modelMaterials.get(mesh);
    }

    AddMaterial(material: Material) {
        if (!this.materials.has(material))
            this.materials.add(material);
    }

    SetMaterial(mesh: Mesh, material: Material) {
        this.AddMaterial(material);
        this.modelMaterials.set(mesh, material);
    }

    DeleteMaterial(material: Material) {
        let canDelete = true;
        this.modelMaterials.forEach((v, k) => {
            if (v.uuid == material.uuid) {
                console.warn(`Can't delete material because it's used by object: name: ${k.name}; uuid: ${k.uuid}`);
                canDelete = false;
                return;
            }
        })
        if (canDelete) {
            if (this.materials.delete(material)) {
                material.dispose();
            }
        }
    }

    ReplaceMaterial(oldMaterial: Material, newMaterial: Material) {
        this.AddMaterial(newMaterial);
        this.modelMaterials.forEach((v, k) => {
            if (v.uuid == oldMaterial.uuid) {
                this.modelMaterials.set(k, newMaterial);
            }
        })
    }
}