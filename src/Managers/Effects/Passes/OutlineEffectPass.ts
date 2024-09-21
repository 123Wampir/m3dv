import { WebGLRenderer, WebGLRenderTarget } from "three";
import { OutlineEffect, Pass } from "three/examples/jsm/Addons.js";
import { Viewer } from "../../../Viewer";


export class OutlineEffectPass extends Pass {
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
        this.outlineEffect.renderOutline(this.viewer.sceneManager.modelManager.model as any, this.viewer.appearance.camera);

    }
}