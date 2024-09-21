import { Pass, UnrealBloomPass } from "three/examples/jsm/Addons.js";
import { Viewer } from "../../../Viewer";
import { Vector2, WebGLRenderer, WebGLRenderTarget } from "three";


export class UnrealBloomEffectPass extends Pass {
    constructor(viewer: Viewer) {
        super();
        this.viewer = viewer;
        const canvas = this.viewer.renderer.domElement;
        const width = canvas.clientWidth;
        const height = canvas.clientHeight;
        this.pass = new UnrealBloomPass(new Vector2(width, height), 0.8, 0.05, 0.25);
    }

    private readonly pass: UnrealBloomPass;
    private readonly viewer: Viewer;
    get strength() { return this.pass.strength; };
    get threshold() { return this.pass.threshold; };
    get radius() { return this.pass.radius; };

    set strength(value: number) { this.pass.strength = value; };
    set threshold(value: number) { this.pass.threshold = value; };
    set radius(value: number) { this.pass.radius = value; };

    override render(renderer: WebGLRenderer, writeBuffer: WebGLRenderTarget, readBuffer: WebGLRenderTarget, deltaTime: number, maskActive: boolean): void {
        this.pass.render(renderer, writeBuffer, readBuffer, deltaTime, maskActive);
    }
}