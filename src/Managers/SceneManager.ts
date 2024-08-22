import { AnimationManager } from "./AnimationManager/AnimationManager";
import { ModelManager } from "./ModelManager";
import * as THREE from "three";
import { FileManager } from "../Managers/FileManager";
import { EventEmitter } from "../EventListener/Event";
import { Plane } from "./Objects/Plate";

export enum CameraType {
    perspective,
    orthographic
}

export enum ViewType {
    default,
    isolated
}

export class SceneManager extends EventEmitter {
    constructor(scene: THREE.Scene) {
        super();
        this.scene = scene;
        this.SetCameraType(this.cameraType);
        this.camera.position.set(-10, 5, 5);
        this.modelManager = new ModelManager();
        this.scene.add(this.modelManager.GetModel());
        this.animationManager = new AnimationManager(this);

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

    viewType: ViewType = ViewType.default;
    animationManager: AnimationManager;
    modelManager!: ModelManager;
    cameraType: CameraType = CameraType.perspective;
    private camera!: THREE.Camera;
    perspectiveCamera: THREE.PerspectiveCamera = new THREE.PerspectiveCamera(60, 16 / 9, 0.001, 10e6);
    orthographicCamera: THREE.OrthographicCamera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0.001, 10e6);
    private serviceGroup: THREE.Group = new THREE.Group();
    readonly fileManager: FileManager = new FileManager();



    private scene!: THREE.Scene;

    SetScene(scene: THREE.Scene) {
        this.scene = scene;
        let ax = new THREE.AxesHelper(10);
        scene.add(ax);
        this.camera.position.set(-10, 5, 5);
    }
    GetScene() {
        return this.scene;
    }

    lights: THREE.Light[] = [];
    AddLight(light: THREE.Light) {
        this.lights.push(light);
        this.scene.add(light);
        this.animationManager.AddTrack(light);
    }
    DeleteLight(light: THREE.Light) {
        light.removeFromParent();
        light.dispose();
        this.lights = this.lights.filter(item => item.uuid != light.uuid);
        this.animationManager.DeleteTrack(light);
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

        let planeX = new Plane("x", x, this.modelManager.GetModel());
        let planeY = new Plane("y", y, this.modelManager.GetModel());
        let planeZ = new Plane("z", z, this.modelManager.GetModel());

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

    LoadModelFile(filename: string, src: string) {
        if (window.Worker == undefined) {
            const worker = new Worker(new URL("./FileManagerWorker", import.meta.url), { type: "module" });
            worker.postMessage([FileManager.occtimportjsWasmPath, src, filename]);
            console.log("posted");

            worker.onerror = function (e) { console.log(e); }
            worker.onmessageerror = function (e) { console.log(e); }
            worker.onmessage = (e) => {
                if (this.serviceGroup.children.length > 1)
                    this.serviceGroup.children[1].removeFromParent();
                let object = new THREE.ObjectLoader().parse(e.data);
                this.emit("loaded", object);
                worker.terminate();
            };
        }
        else {
            let object = new THREE.Object3D();
            let start = Date.now();
            this.fileManager.LoadModel(src, filename, object)
                .then((e) => {
                    let end = Date.now();
                    let diff = (end - start) / 1000;
                    console.log(`elapsed: ${diff} sec`);
                    this.emit("loaded", object);
                })
                .catch(e => console.log(e))
        }
    }


    SetCameraType(type: CameraType) {
        this.camera = type == CameraType.perspective ? this.perspectiveCamera : this.orthographicCamera;
    }

    SetCameraViewType(view: ViewType) {
        if (view == ViewType.default) {
            this.perspectiveCamera.layers.set(0);
            this.orthographicCamera.layers.set(0);
        }
        else if (view == ViewType.isolated) {
            this.perspectiveCamera.layers.set(1);
            this.orthographicCamera.layers.set(1);
        }
        this.viewType = view;
    }

    GetCamera(): THREE.Camera {
        return this.camera;
    }
}