import { BokehPass, Pass } from "three/examples/jsm/Addons.js";
import { Viewer } from "../../../Viewer";
import { WebGLRenderer, WebGLRenderTarget } from "three";

export class BokehEffectPass extends Pass {
    constructor(viewer: Viewer) {
        super();
        this.viewer = viewer;
        const canvas = this.viewer.renderer.domElement;
        const width = canvas.clientWidth;
        const height = canvas.clientHeight;
        this.pass = new BokehPass(viewer.sceneManager.scene, viewer.appearance.camera, { aperture: 1e-6, focus: 5000, maxblur: 0.01 });

    }
    private readonly pass: BokehPass;
    private readonly viewer: Viewer;

    get focus() { return this.pass.uniforms['focus']; };
    get aperture() { return this.pass.uniforms['aperture']; };
    get maxblur() { return this.pass.uniforms['maxblur']; };

    set focus(value: number) { this.pass.uniforms['focus'] = value; };
    set aperture(value: number) { this.pass.uniforms['aperture'] = value; };
    set maxblur(value: number) { this.pass.uniforms['maxblur'] = value; };

    override render(renderer: WebGLRenderer, writeBuffer: WebGLRenderTarget, readBuffer: WebGLRenderTarget, deltaTime: number, maskActive: boolean): void {
        this.pass.render(renderer, writeBuffer, readBuffer, deltaTime, maskActive);
    }
}