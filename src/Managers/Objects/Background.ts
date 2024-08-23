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
    }

    private viewer: Viewer;
    type: BackgroundType = BackgroundType.color;
    color: number | string = 0xAAAAAA;
    texture: THREE.DataTexture | null = null;


    SetBackgroundColor(color: number | string | null = null) {
        if (color == null)
            color = this.color;

        const colorObj = new THREE.Color(color);
        this.viewer.sceneManager.GetScene().background = colorObj;

        this.type = BackgroundType.color;
        this.color = color;

        this.viewer.appearance.Render();
    }

    async SetBackgroundImage(url: string) {
        let envMap = await new RGBELoader().loadAsync(url);
        if (envMap != undefined) {
            this.disposeTexture();

            envMap.mapping = THREE.EquirectangularReflectionMapping;

            this.viewer.sceneManager.GetScene().background = envMap;

            this.texture = envMap;

            this.viewer.appearance.Render();
        }
    }

    EnableTextureAsReflectionMap() {
        if (this.texture != null) {
            this.viewer.sceneManager.GetScene().environment = this.texture;

            this.viewer.appearance.Render();
        }
    }

    DisableTextureAsReflectionMap() {
        this.viewer.sceneManager.GetScene().environment = null;

        this.viewer.appearance.Render();
    }

    private disposeTexture() {
        if (this.texture != null) {
            this.texture.dispose();
            this.texture = null;
            this.viewer.sceneManager.GetScene().background = null;
            this.viewer.sceneManager.GetScene().environment = null;
        }
    }
}