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

    LoadMaterialsFromModel() {
        this.materials.clear();
        this.modelManager.model.traverse(object => {
            const obj = object as any;
            if (obj.material != undefined) {
                const material = obj.material as THREE.Material;
                this.AddMaterial(material);
            }
        });
        console.log(this.materials);
    }

    Has(material: THREE.Material): boolean {
        return this.materials.has(material);
    }

    AddMaterial(material: THREE.Material) {
        if (!this.materials.has(material))
            this.materials.add(material);
    }

    DeleteMaterial(material: THREE.Material) {
        this.modelManager.model.traverse(object => {
            const obj = object as any;
            if (obj.material != undefined) {
                const currentMaterial = obj.material as THREE.Material;
                if (currentMaterial.uuid == material.uuid) {
                    console.warn(`Can't delete material because it's used by object: name: ${object.name}; uuid: ${object.uuid}`);
                    return;
                }
            }
        })
        if (this.materials.delete(material)) {
            material.dispose();
        }
    }

    ReplaceMaterial(oldMaterial: THREE.Material, newMaterial: THREE.Material) {
        this.modelManager.model.traverse(object => {
            const obj = object as any;
            if (obj.material != undefined) {
                const currentMaterial = obj.material as THREE.Material;
                if (currentMaterial.uuid == oldMaterial.uuid)
                    obj.material = newMaterial;
            }
        })
    }
}