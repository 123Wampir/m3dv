import * as occtimportjs from "occt-import-js";
import * as THREE from "three";
import { BufferGeometryUtils } from "three/examples/jsm/Addons.js";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";

export interface FileManagerOptions {
    occtimportjsWasmPath?: string
}

export class FileManager {

    constructor(options: FileManagerOptions = null) {
        this.options = options ?? {};
    }

    private occt: any = undefined;

    readonly options: FileManagerOptions = {};

    private async InitOCCT() {
        if (this.occt == undefined)
            return occtimportjs.default({
                locateFile: (name: any) => {
                    return this.options.occtimportjsWasmPath;
                }
            })
        return this.occt;
    }

    async LoadModelInWorker(url: string, filename: string): Promise<THREE.Object3D> {
        const workerUrl = new URL("./FileManagerWorker", import.meta.url);
        const worker = new Worker(workerUrl, { type: "module" });
        return new Promise((resolve, reject) => {
            worker.onerror = function (e) {
                console.log(e);
                worker.terminate();
                reject(e);
            }
            worker.onmessageerror = function (e) {
                console.log(e);
                worker.terminate();
                reject(e);
            }
            worker.onmessage = (e) => {
                worker.terminate();
                let object = new THREE.ObjectLoader().parse(e.data);
                resolve(object);
            }
            const options = JSON.stringify(this.options);
            worker.postMessage([options, url, filename]);
        })
    }

    async LoadModel(url: string, filename: string): Promise<THREE.Object3D> {
        this.materials.length = 0;
        if (/(.(stp|STEP|step)$)/.test(filename!)) {
            console.log(/(.(stp|STEP|step)$)/.exec(filename!)![2]);
            return this.InitOCCT().then(result => {
                this.occt = result;
                return this.LoadCADModel(url, this.occt.ReadStepFile);
            })
        }
        else if (/(.(iges|igs)$)/.test(filename!)) {
            console.log(/(.(iges|igs)$)/.exec(filename!)![2]);
            return this.InitOCCT().then(result => {
                this.occt = result;
                return this.LoadCADModel(url, this.occt.ReadIgesFile);
            });
        }
        else if (/(.(brep|BREP|BRep|Brep)$)/.test(filename!)) {
            console.log(/(.(brep|BREP|BRep|Brep)$)/.exec(filename!)![2]);
            return this.InitOCCT().then(result => {
                this.occt = result;
                return this.LoadCADModel(url, this.occt.ReadBrepFile);
            });
        }
        else if (/(.(gltf|glb)$)/.test(filename!)) {
            console.log(/(.(gltf|glb)$)/.exec(filename!)![2]);
            return this.LoadGLTFModel(url);
        }
        else return null;
    }

    private async LoadCADModel(url: string, fn: Function): Promise<THREE.Object3D> {
        return fetch(url)
            .then(response => {
                return response.arrayBuffer()
                    .then(buffer => {
                        let fileBuffer = new Uint8Array(buffer);
                        let result = fn(fileBuffer, null);
                        console.log(result);
                        let model = this.CreateModel(result, result.root);
                        return model;
                    })
                    .catch(e => {
                        console.log(e);
                        return null;
                    })
            })
            .catch(e => {
                console.log(e);
                return null;
            })
    }

    private materials: THREE.MeshPhysicalMaterial[] = [];

    private CreateModel(res: any, data: any, i = 0, root?: THREE.Object3D): THREE.Object3D {
        i++;
        let obj = new THREE.Object3D();
        if (root != undefined)
            root?.add(obj);
        else root = obj;
        if (data.name != "")
            obj.name = data.name;
        else obj.name = `Object3D_${i}`;
        if (data.meshes.length != 0) {
            for (let j = 0; j < data.meshes.length; j++) {
                i++;
                let geom = new THREE.BufferGeometry();
                geom.setAttribute('position', new THREE.Float32BufferAttribute(res.meshes[data.meshes[j]].attributes.position.array, 3));
                if (res.meshes[data.meshes[j]].attributes.normal)
                    geom.setAttribute('normal', new THREE.Float32BufferAttribute(res.meshes[data.meshes[j]].attributes.normal.array, 3));
                let index = Uint32Array.from(res.meshes[data.meshes[j]].index.array);
                geom.setIndex(new THREE.BufferAttribute(index, 1));
                let color = new THREE.Color(0xffffff);
                if (res.meshes[data.meshes[j]].color != undefined) {
                    let colorArray = res.meshes[data.meshes[j]].color;
                    color = new THREE.Color(colorArray[0], colorArray[1], colorArray[2]);
                }
                let mat = this.materials.find(m => m.color.getHexString() == color.getHexString());
                if (mat == undefined) {
                    mat = new THREE.MeshPhysicalMaterial({ color: color, roughness: 0.6, metalness: 0.3 });
                    this.materials.push(mat);
                }
                let faceColorArray = new Array(geom.attributes['position'].count).fill(0);
                for (let f = 0; f < res.meshes[data.meshes[j]].brep_faces.length; f++) {
                    let faceColor = res.meshes[data.meshes[j]].brep_faces[f];
                    if (faceColor.color != null) {
                        mat.vertexColors = true;
                        geom = geom.toNonIndexed();
                        for (let n = faceColor.first; n <= faceColor.last; n++) {
                            faceColorArray.splice(Math.floor(n * 9), 9, ...faceColor.color, ...faceColor.color, ...faceColor.color);
                        }
                    }
                }
                if (mat.vertexColors)
                    geom.setAttribute('color', new THREE.Float32BufferAttribute(faceColorArray, 3));
                let mesh = new THREE.Mesh(geom, mat);
                if (res.meshes[data.meshes[j]].name != "")
                    mesh.name = `${res.meshes[data.meshes[j]].name}_${mesh.id}`;
                else mesh.name = `Mesh_${mesh.id}`;
                obj.add(mesh);
            }
        }
        if (data.children.length != 0) {
            for (let j = 0; j < data.children.length; j++) {
                this.CreateModel(res, data.children[j], i, obj);
            }
        }
        return root;
    }

    private async LoadGLTFModel(url: string): Promise<THREE.Object3D> {
        let loader = new GLTFLoader();
        return new Promise((resolve, reject) => {
            loader.loadAsync(
                url,
                function (xhr: any) {
                    console.log((xhr.loaded / xhr.total * 100) + '% loaded');
                }
            ).then(gltf => {
                if (gltf.scene.children.length != 0) {
                    let obj = gltf.scene.children[0].clone();
                    gltf.scene.traverse(object => {
                        let obj = (object as any);
                        if (obj.geometry != undefined)
                            obj.geometry.dispose();
                        if (obj.material != undefined)
                            obj.material.dispose();
                    });
                    obj.updateMatrixWorld(true);
                    this._mergeGeometryGroups(obj);
                    resolve(obj);
                }
            }).catch(e => {
                console.log(e);
                reject(null);
            })
        })
    }

    private _mergeGeometryGroups(object: THREE.Object3D) {
        object.traverse(obj => {
            const group = obj as THREE.Group;
            if (group.isGroup != undefined && group.isGroup) {

                const geom: Set<THREE.BufferGeometry> = new Set();
                let material: THREE.Material | THREE.Material[] | null = null;

                group.children.forEach(child => {
                    const mesh = child as THREE.Mesh;
                    if (mesh.isMesh != undefined && mesh.isMesh) {
                        if (!geom.has(mesh.geometry)) {
                            geom.add(mesh.geometry);
                        }
                        if (material == null) {
                            material = mesh.material;
                        }
                        else {
                            if (Array.isArray(mesh.material)) {
                                mesh.material.forEach(m => m.dispose());
                            }
                            else mesh.material.dispose();
                        }
                    }
                })
                const resultGeom = BufferGeometryUtils.mergeGeometries(Array.from(geom));

                geom.forEach(g => g.dispose());
                group.children = [];

                const resultMesh = new THREE.Mesh(resultGeom, material);
                resultMesh.name = group.name;
                group.add(resultMesh);
            }
        })
    }

    //#endregion
}