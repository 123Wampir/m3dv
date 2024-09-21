import { Viewer } from "../../Viewer";
import { Effect } from "./Effect";
import { UnrealBloomEffectPass } from "./Passes/UnrealBloomEffectPass";

export class UnrealBloomEffect extends Effect {
    constructor(viewer: Viewer) {
        super("unreal-bloom", new UnrealBloomEffectPass(viewer));
    }
}