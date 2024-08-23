import { OutlineEffect, Pass } from "three/examples/jsm/Addons.js";
import { EventEmitter } from "../Event/Event";
import { Viewer } from "../Viewer";
import { WebGLRenderer, WebGLRenderTarget } from "three";


export class Effects extends EventEmitter {
    constructor(viewer: Viewer) {
        super();
        this.viewer = viewer;
    }

    private viewer: Viewer;

    private _outline: boolean = true;
    get outline() { return this._outline; };
    set outline(value: boolean) {
        this.outlinePass.enabled = value;
        this._outline = value;
    }

    private _outlinePass: OutlineEffectPass = null;
    private get outlinePass() {
        if (this._outlinePass == null) {
            this._outlinePass = new OutlineEffectPass(this.viewer);
            this.viewer.appearance.composer.insertPass(this._outlinePass, 1);
        }
        return this._outlinePass;
    }
}

class OutlineEffectPass extends Pass {
    constructor(viewer: Viewer, defaultAlpha: number = 0.7, defaultThickness: number = 0.004) {
        super();
        this.viewer = viewer;
        this.needsSwap = false;
        this.outlineEffect = new OutlineEffect(viewer.renderer as WebGLRenderer, { defaultAlpha: defaultAlpha, defaultThickness: defaultThickness });
    }
    private outlineEffect: OutlineEffect;
    private viewer: Viewer;
    override render(renderer: WebGLRenderer, writeBuffer: WebGLRenderTarget, readBuffer: WebGLRenderTarget, deltaTime: number, maskActive: boolean): void {
        if (maskActive)
            renderer.state.buffers.stencil.setTest(false);
        this.outlineEffect.renderOutline(this.viewer.sceneManager.modelManager.GetModel() as any, this.viewer.appearance.GetCamera());

    }
}