import { Viewer } from "../../Viewer";
import { Effect } from "./Effect";
import { OutlineEffectPass } from "./Passes/OutlineEffectPass";

export class OutlineEffect extends Effect {
    constructor(viewer: Viewer) {
        super("outline", new OutlineEffectPass(viewer));
    }
}