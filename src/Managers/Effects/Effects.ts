import { EffectComposer, Pass } from "three/examples/jsm/Addons.js";
import { EventEmitter } from "../../Event/Event";
import { Effect } from "./Effect";


export class Effects extends EventEmitter {
    constructor(composer: EffectComposer) {
        super();
        this.composer = composer;
    }
    private readonly composer: EffectComposer;

    private _effects: Set<Effect> = new Set();
    get effects(): readonly Effect[] { return Array.from(this._effects.values()); };

    AddEffect(effect: Effect) {
        this.composer.insertPass(effect.pass, this.composer.passes.length - 1);
        this._effects.add(effect);
    }

    InsertEffect(effect: Effect, index: number) {
        if (index < 1)
            index = 1;
        if (index > this.composer.passes.length - 1)
            index = this.composer.passes.length - 1;
        this.composer.insertPass(effect.pass, index);
        this._effects.add(effect);
    }

    GetEffectByName(name: string): Effect {
        return this.effects.find(effect => effect.name == name);
    }

    GetEffectIndex(effect: Effect): number {
        return this.composer.passes.indexOf(effect.pass);
    }

    RemoveEffect(effect: Effect) {
        const index = this.GetEffectIndex(effect);
        if (index != -1) {
            this.composer.passes.splice(index);
            this._effects.delete(effect);
        }
    }
}