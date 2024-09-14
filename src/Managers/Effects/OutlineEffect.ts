import { Viewer } from "../../Viewer";
import { Effect } from "./Effect";
import { OutlineEffectPass } from "./Passes/OutlinePass";

export class OutlineEffect extends Effect {
    constructor(viewer: Viewer) {
        super("outline", new OutlineEffectPass(viewer));
    }
}