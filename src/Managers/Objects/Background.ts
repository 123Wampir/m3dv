import type { Viewer } from "../..//Viewer";
import * as THREE from "three"
import { RGBELoader } from 'three/examples/jsm/loaders/RGBELoader.js';

export enum BackgroundType {
    color,
    image
}

export class Enviroment {

    constructor(viewer: Viewer) {
        this.viewer = viewer;
        this.scene = viewer.sceneManager.GetScene();
    }

    private viewer: Viewer;
    private scene: THREE.Scene;
    type: BackgroundType = BackgroundType.color;
    color: number | string = 0xAAAAAA;
    texture: THREE.DataTexture | null = null;


    SetBackgroundColor(color: number | string | null = null) {
        if (color == null)
            color = this.color;

        const colorObj = new THREE.Color(color);
        this.scene.background = colorObj;

        this.type = BackgroundType.color;
        this.color = color;

        this.viewer.Render();
    }

    async SetBackgroundImage(url: string) {
        let envMap = await new RGBELoader().loadAsync(url);
        if (envMap != undefined) {
            this.disposeTexture();

            envMap.mapping = THREE.EquirectangularReflectionMapping;

            this.scene.background = envMap;

            this.texture = envMap;

            this.viewer.Render();
        }
    }

    EnableTextureAsReflectionMap() {
        if (this.texture != null) {
            this.scene.environment = this.texture;

            this.viewer.Render();
        }
    }

    DisableTextureAsReflectionMap() {
        this.scene.environment = null;

        this.viewer.Render();
    }

    private disposeTexture() {
        if (this.texture != null) {
            this.texture.dispose();
            this.texture = null;
            this.scene.background = null;
            this.scene.environment = null;
        }
    }
}