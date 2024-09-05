import { ModelManager } from "./ModelManager";
import * as THREE from "three";
import { EventEmitter } from "../Event/Event";
import { Plane } from "./Objects/Plane";


export class SceneManager extends EventEmitter {
    constructor(scene: THREE.Scene) {
        super();
        this.SetScene(scene);
        this.modelManager = new ModelManager();
        this.scene.add(this.modelManager.model);

        const dirLight1 = new THREE.DirectionalLight();
        dirLight1.layers.enableAll();
        this.AddLight(dirLight1);
        const dirLight2 = new THREE.DirectionalLight();
        dirLight2.layers.enableAll();
        dirLight2.position.set(1, 0, 0);
        this.AddLight(dirLight2);

        this.serviceGroup.name = "SERVICE";
        scene.add(this.serviceGroup);
        let ax = new THREE.AxesHelper(10);
        this.serviceGroup.add(ax);

        console.log(scene);
    }

    modelManager!: ModelManager;

    private serviceGroup: THREE.Group = new THREE.Group();
    private _scene!: THREE.Scene;

    get scene() { return this._scene; };
    SetScene(scene: THREE.Scene) {
        this._scene = scene;
    }

    lights: THREE.Light[] = [];
    AddLight(light: THREE.Light) {
        this.lights.push(light);
        this.scene.add(light);
    }
    DeleteLight(light: THREE.Light) {
        light.removeFromParent();
        light.dispose();
        this.lights.splice(this.lights.indexOf(light));
    }

    planes: Plane[] = [];

    InitPlanes() {

        Plane.PLANES.forEach(plane => plane.Dispose());
        this.planes.length = 0;
        Plane.CUTPLANES.length = 0;
        Plane.PLANES.length = 0;
        Plane.included.clear();
        Plane.ORDERS = 0;
        Plane.clipIntersection = false;
        const x = new THREE.Plane(new THREE.Vector3(-1, 0, 0));
        const y = new THREE.Plane(new THREE.Vector3(0, -1, 0));
        const z = new THREE.Plane(new THREE.Vector3(0, 0, -1));

        let planeX = new Plane("x", x, this.modelManager.model);
        let planeY = new Plane("y", y, this.modelManager.model);
        let planeZ = new Plane("z", z, this.modelManager.model);

        this.planes.push(planeX);
        this.planes.push(planeY);
        this.planes.push(planeZ);

        const clippingGroup = new THREE.Group();
        clippingGroup.name = "ClippingGroup";
        this.serviceGroup.add(clippingGroup);

        const planeHelpers = new THREE.Group();
        clippingGroup.add(planeHelpers);
        planeHelpers.add(planeX.helper);
        planeHelpers.add(planeY.helper);
        planeHelpers.add(planeZ.helper);

        const cutPlanes = new THREE.Group();
        clippingGroup.add(cutPlanes);
        cutPlanes.add(planeX.cutPlane);
        cutPlanes.add(planeY.cutPlane);
        cutPlanes.add(planeZ.cutPlane);

        const stencilGroups = new THREE.Group();
        clippingGroup.add(stencilGroups);
        stencilGroups.add(planeX.stencilGroup);
        stencilGroups.add(planeY.stencilGroup);
        stencilGroups.add(planeZ.stencilGroup);

    }

    ClearScene() {
        if (this.serviceGroup.children.length > 1)
            this.serviceGroup.children[1].removeFromParent();
    }
}