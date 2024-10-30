import { EventEmitter } from "../Event/Event";
import { ModelManager } from "./ModelManager";
import * as THREE from "three";


export class MaterialManager extends EventEmitter {
    constructor(modelManager: ModelManager) {
        super();

        this.modelManager = modelManager;
    }

    private readonly modelManager: ModelManager;
    private readonly materials: Set<THREE.Material> = new Set<THREE.Material>();

    private modelMaterials: Map<THREE.Mesh, THREE.Material> = new Map();

    LoadMaterialsFromModel() {
        this.materials.clear();
        this.modelMaterials.clear();
        this.modelManager.model.traverse(object => {
            const mesh = object as THREE.Mesh;
            if (mesh.isMesh != undefined && mesh.isMesh) {
                const material = mesh.material as THREE.Material;
                this.AddMaterial(material);
                this.modelMaterials.set(mesh, material);
            }
        });
        console.log(this.materials);
    }

    Has(material: THREE.Material): boolean {
        return this.materials.has(material);
    }

    GetMaterials(): readonly THREE.Material[] {
        return Array.from(this.materials.values());
    }

    GetMaterial(mesh: THREE.Mesh): THREE.Material {
        return this.modelMaterials.get(mesh);
    }

    AddMaterial(material: THREE.Material) {
        if (!this.materials.has(material))
            this.materials.add(material);
    }

    SetMaterial(mesh: THREE.Mesh, material: THREE.Material) {
        this.AddMaterial(material);
        this.modelMaterials.set(mesh, material);
    }

    DeleteMaterial(material: THREE.Material) {
        this.modelMaterials.forEach((v, k) => {
            if (v == material) {
                console.warn(`Can't delete material because it's used by object: name: ${k.name}; uuid: ${k.uuid}`);
                return;
            }
        })
        if (this.materials.delete(material)) {
            material.dispose();
        }
    }

    ReplaceMaterial(oldMaterial: THREE.Material, newMaterial: THREE.Material) {
        this.AddMaterial(newMaterial);
        this.modelMaterials.forEach((v, k) => {
            if (v == oldMaterial) {
                this.modelMaterials.set(k, newMaterial);
            }
        })
    }
}