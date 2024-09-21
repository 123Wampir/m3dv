import { Viewer } from "../../Viewer";
import { Effect } from "./Effect";
import { BokehEffectPass } from "./Passes/BokehEffectPass";

export class BokehEffect extends Effect {
    constructor(viewer: Viewer) {
        super("bokeh", new BokehEffectPass(viewer));
    }
}