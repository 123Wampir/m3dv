import { Pass } from "three/examples/jsm/Addons.js";
import { Viewer } from "../../../Viewer";
import { WebGLRenderer, WebGLRenderTarget } from "three";

export class RenderPass extends Pass {
    constructor(viewer: Viewer) {
        super();
        this.viewer = viewer;
        this.needsSwap = true;
    }
    private viewer: Viewer;
    override render(renderer: WebGLRenderer, writeBuffer: WebGLRenderTarget, readBuffer: WebGLRenderTarget, deltaTime: number, maskActive: boolean): void {
        writeBuffer.stencilBuffer = true;
        renderer.setRenderTarget(this.renderToScreen ? null : writeBuffer);
        this.viewer.renderer.render(this.viewer.sceneManager.scene, this.viewer.appearance.camera);
    }
}