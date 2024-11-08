import { Box3, Mesh, Object3D, Vector3 } from "three";
import { ComputeVolume, GetVolume } from "../../Utils/Math";

export enum ExplodeType {
    simple,
    phased
}

export class Explode {
    private _type: ExplodeType = ExplodeType.simple;
    get type() { return this._type; };

    private model!: Object3D;
    private startPos: Map<Object3D, Vector3> = new Map();
    private offsets: Map<Object3D, Vector3[]> = new Map();
    private phase: number = 0;
    private initExplode: boolean = false;

    SetExplodeObject(model: Object3D) {
        this.model = model;
        this.model.traverse(item => {
            this.startPos.set(item, item.position.clone());
        })
    }


    InitExplode(model: Object3D, type: ExplodeType = ExplodeType.simple) {
        this.Reset();

        this.SetExplodeObject(model);

        this._type = type;

        switch (type) {
            case ExplodeType.simple:
                this.simpleExplodeGraph(this.model);
                break;
            case ExplodeType.phased:
                this.PhasedExplodeGraph(this.model);
                this.phase = 0;
                this.offsets.forEach((offsets, model) => {
                    if (offsets.length > this.phase)
                        this.phase = offsets.length;
                })
                break;
        }
        this.initExplode = true;
    }

    Explode(value: number = 0, power: number = 1) {
        if (!this.initExplode) {
            return;
        }
        switch (this.type) {
            case ExplodeType.simple:
                this.simpleExplode(value);
                break;
            case ExplodeType.phased:
                this.phasedExplode(value);
            default:
                break;
        }
    }

    Reset() {
        this.Explode(0);
        this.offsets.clear();
        this.startPos.clear();
        this.phase = 0;
    }

    private phasedExplode(value: number = 0, power: number = this.phase / 3) {
        const currentStep = Math.floor(value * this.phase);
        const diff = value - (currentStep / this.phase);

        this.offsets.forEach((offsets, model) => {
            let offset = new Vector3();
            for (let i = 0; i < currentStep; i++) {
                if (i < offsets.length) {
                    offset.add(offsets[i].clone().multiplyScalar(power));
                }
            }
            if (currentStep < offsets.length)
                offset.add(offsets[currentStep].clone().multiplyScalar(diff * this.phase * power));

            let pos = new Vector3().applyMatrix4(model.matrixWorld.clone());
            let finalpos = this.toLocal(pos.clone().add(offset.clone()), model);
            model.position.copy(finalpos!);
        })
    }

    private simpleExplode(value: number = 0, power: number = 3) {
        this.offsets.forEach((direction, model) => {
            model.updateWorldMatrix(true, true);
            let pos = new Vector3().applyMatrix4(model.matrixWorld.clone())
                .add(direction[0].clone().multiplyScalar(value * power));

            let finalpos = this.toLocal(pos, model);
            model.position.copy(finalpos);
        })
    }

    private PhasedExplodeGraph(model: Object3D, offsets: Vector3[] = []) {
        let offset = new Vector3();
        let parentBox = new Box3();
        parentBox = this.findBiggest(model.parent!);
        parentBox.setFromObject(model.parent!);
        const parentCenter = new Vector3();
        parentBox.getCenter(parentCenter);
        let childBox = new Box3();
        childBox.setFromObject(model);
        let childCenter = new Vector3();
        childBox.getCenter(childCenter);
        offset = offset.subVectors(childCenter, parentCenter);
        if (model.parent?.type == "Scene")
            offset = new Vector3(0);
        if (!offset.equals(new Vector3(0)))
            offsets.push(offset);
        model.children.forEach(child => {
            this.PhasedExplodeGraph(child, offsets.slice(0));
        })
        this.offsets.set(model, offsets);
    }

    private simpleExplodeGraph(model: Object3D) {
        let parentBox = new Box3().setFromObject(model);
        const parentCenter = parentBox.getCenter(new Vector3());

        model.traverse(item => {
            if ((item as any).geometry != undefined) {
                let mesh = item as Mesh;
                mesh.updateWorldMatrix(true, true);
                mesh.geometry.computeBoundingBox();
                let bbox = mesh.geometry.boundingBox!.clone().applyMatrix4(mesh.matrixWorld.clone());
                const childCenter = bbox.getCenter(new Vector3());

                let worldDir = childCenter.clone().sub(parentCenter);
                this.offsets.set(item, [worldDir]);
            }
        })
    }

    private toLocal(target: Vector3, model: Object3D): Vector3 {
        let startPos = this.startPos.get(model)!.clone();
        return target.applyMatrix4(model.matrixWorld.clone().invert())
            .applyQuaternion(model.quaternion.clone())
            .add(startPos);
    }

    private findBiggest(object: Object3D) {
        let box = new Box3();
        object.children.forEach(child => {
            let childBox = new Box3();
            childBox.setFromObject(child);
            const childVolume = GetVolume(childBox);
            const volume = GetVolume(box);
            if (childVolume > volume)
                box = childBox;
        })
        return box;
    }
}