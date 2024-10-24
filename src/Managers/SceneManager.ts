import { ModelManager } from "./ModelManager";
import * as THREE from "three";
import { EventEmitter } from "../Event/Event";
import { Viewer } from "../Viewer";
import { PlaneManager } from "./Planes/PlaneManager";


export class SceneManager extends EventEmitter {
    constructor(viewer: Viewer) {
        super();
        this.viewer = viewer;
        this.scene.add(this.modelManager.model);

        const dirLight1 = new THREE.DirectionalLight();
        this.AddLight(dirLight1);
        const dirLight2 = new THREE.DirectionalLight();
        dirLight2.position.set(1, 0, 0);
        this.AddLight(dirLight2);

        this.serviceGroup.name = "SERVICE";
        this.scene.add(this.serviceGroup);
        let ax = new THREE.AxesHelper(10);
        this.serviceGroup.add(ax);

        this.planeManager = new PlaneManager(this, this.serviceGroup);
        console.log(this.scene);
    }

    readonly modelManager: ModelManager = new ModelManager();
    readonly planeManager: PlaneManager;
    private readonly viewer: Viewer;
    private serviceGroup: THREE.Group = new THREE.Group();
    private _scene: THREE.Scene = new THREE.Scene();

    get scene() { return this._scene; };
    SetScene(scene: THREE.Scene) {
        this._scene = scene;
    }

    private readonly lights: THREE.Light[] = [];
    AddLight(light: THREE.Light) {
        light.layers.enableAll();
        this.lights.push(light);
        this.scene.add(light);
    }
    DeleteLight(light: THREE.Light) {
        light.removeFromParent();
        light.dispose();
        this.lights.splice(this.lights.indexOf(light));
    }

    Clear() {

    }
}