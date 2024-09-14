import { Pass } from "three/examples/jsm/Addons.js";

export class Effect {
    constructor(name: string, pass: Pass) {
        this.name = name;
        this.pass = pass;
    }
    readonly name: string;
    readonly pass: Pass;
}