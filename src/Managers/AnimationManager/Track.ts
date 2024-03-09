import { Object3D } from "three";
import type { IOperation } from "./Operations/Operation";

export class Track {
    constructor(object: Object3D) {
        this.target = object;
    }
    target: Object3D;
    operations: IOperation[] = [];
    Update(time: number) {
        this.operations.forEach(operation => operation.Update(time));
    }
    Reset() {
        this.operations.forEach(operation => operation.Reset());
    }
}