import type { Viewer } from "../../Viewer";
import * as THREE from "three"
import { RGBELoader } from 'three/examples/jsm/loaders/RGBELoader.js';

export enum BackgroundType {
    color,
    image
}

export enum ToneMapping {
    linear,
    Reinhard,
    cineon,
    ACESFilmic,
    AgX,
    neutral
}

export class Enviroment {

    constructor(viewer: Viewer) {
        this.viewer = viewer;
        this.toneMapping = ToneMapping.neutral;
    }

    private viewer: Viewer;

    private _color: THREE.Color = new THREE.Color(0xAAAAAA);
    get color(): string { return `#${this._color.getHexString()}`; };

    private _texture: THREE.DataTexture | null = null;
    get texture() { return this._texture; };

    private _type: BackgroundType = BackgroundType.color;
    get type(): BackgroundType { return this._type; };

    private _isReflectionMapEnabled: boolean = false;
    get isReflectionMapEnabled() { return this._isReflectionMapEnabled; };

    get exposure(): number { return (this.viewer.renderer as THREE.WebGLRenderer).toneMappingExposure; };
    set exposure(value: number) { (this.viewer.renderer as THREE.WebGLRenderer).toneMappingExposure = value; };

    private _toneMapping = ToneMapping.neutral;
    get toneMapping(): ToneMapping { return this._toneMapping; };
    set toneMapping(tone: ToneMapping) { this._changeToneMapping(tone); };

    get backgroundIntensity(): number { return this.viewer.sceneManager.scene.backgroundIntensity; };
    set backgroundIntensity(value: number) { this.viewer.sceneManager.scene.backgroundIntensity = value; };

    get backgroundBlurriness(): number { return this.viewer.sceneManager.scene.backgroundBlurriness; };
    set backgroundBlurriness(value: number) { this.viewer.sceneManager.scene.backgroundBlurriness = value; };

    get backgroundRotation(): THREE.Euler { return this.viewer.sceneManager.scene.backgroundRotation; };
    set backgroundRotation(value: THREE.Euler) {
        this.viewer.sceneManager.scene.backgroundRotation = value;
        this.viewer.sceneManager.scene.environmentRotation = value;
    };

    SetBackgroundColor(color: number | string | null = null) {
        if (color == null)
            color = this.color;

        this._color.set(color);
        this.viewer.sceneManager.scene.background = this._color;

        this._type = BackgroundType.color;
    }

    SetBackgroundImage(texture: THREE.DataTexture | null = null) {
        if (texture == null)
            texture = this.texture;
        if (texture == null)
            return;

        this.viewer.sceneManager.scene.background = texture;
        this._type = BackgroundType.image;
        this._texture = texture;
    }

    SetReflectionMap(enable: boolean) {
        if (enable) {
            this._enableTextureAsReflectionMap();
        }
        else this._disableTextureAsReflectionMap();
    }

    async LoadBackgroundImage(url: string) {
        let envMap = await new RGBELoader().loadAsync(url);
        if (envMap != undefined) {
            this.disposeTexture();

            envMap.mapping = THREE.EquirectangularReflectionMapping;
            this.SetBackgroundImage(envMap);
        }
    }

    private _changeToneMapping(tone: ToneMapping) {
        const renderer = this.viewer.renderer as THREE.WebGLRenderer;
        switch (tone) {
            case ToneMapping.ACESFilmic:
                renderer.toneMapping = THREE.ACESFilmicToneMapping;
                break;
            case ToneMapping.AgX:
                renderer.toneMapping = THREE.AgXToneMapping;
                break;
            case ToneMapping.Reinhard:
                renderer.toneMapping = THREE.ReinhardToneMapping;
                break;
            case ToneMapping.cineon:
                renderer.toneMapping = THREE.CineonToneMapping;
                break;
            case ToneMapping.linear:
                renderer.toneMapping = THREE.LinearToneMapping;
                break;
            case ToneMapping.neutral:
                renderer.toneMapping = THREE.NeutralToneMapping;
                break;
        }
        this._toneMapping = tone;
    }


    private _enableTextureAsReflectionMap() {
        if (this.texture != null) {
            this.viewer.sceneManager.scene.environment = this.texture;
            this._isReflectionMapEnabled = true;
        }
    }

    private _disableTextureAsReflectionMap() {
        this.viewer.sceneManager.scene.environment = null;
        this._isReflectionMapEnabled = false;
    }

    private disposeTexture() {
        if (this.texture != null) {
            this.texture.dispose();
            this._texture = null;
            this.viewer.sceneManager.scene.background = null;
            this._disableTextureAsReflectionMap();
        }
    }
}