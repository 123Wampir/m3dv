import * as occtimportjs from "occt-import-js";
import * as THREE from "three";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";

export class FileManager {

    constructor(wasmPath: string = "") {
        this.SetOCCTImportWasm(wasmPath);
    }

    static occtimportjsWasmPath: string = "";
    private static occt: any = undefined;

    SetOCCTImportWasm(path: string) {
        FileManager.occtimportjsWasmPath = path;
    }

    private static async InitOCCT() {
        console.log(this.occt);
        if (this.occt == undefined)
            return occtimportjs.default({
                locateFile: (name: any) => {
                    return this.occtimportjsWasmPath;
                }
            })
        return this.occt;
    }

    async LoadModel(url: string, fileName: string, obj: THREE.Object3D): Promise<boolean> {
        if (/(.(stp|STEP|step)$)/.test(fileName!)) {
            console.log(/(.(stp|STEP|step)$)/.exec(fileName!)![2]);
            return FileManager.InitOCCT().then(result => {
                FileManager.occt = result;
                return this.LoadCADModel(url, obj, FileManager.occt.ReadStepFile);
            })
        }
        else if (/(.(iges|igs)$)/.test(fileName!)) {
            console.log(/(.(iges|igs)$)/.exec(fileName!)![2]);
            return FileManager.InitOCCT().then(result => {
                FileManager.occt = result;
                return this.LoadCADModel(url, obj, FileManager.occt.ReadIgesFile);
            });
        }
        else if (/(.(brep|BREP|BRep|Brep)$)/.test(fileName!)) {
            console.log(/(.(brep|BREP|BRep|Brep)$)/.exec(fileName!)![2]);
            return FileManager.InitOCCT().then(result => {
                FileManager.occt = result;
                return this.LoadCADModel(url, obj, FileManager.occt.ReadBrepFile);
            });
        }
        else if (/(.(gltf|glb)$)/.test(fileName!)) {
            console.log(/(.(gltf|glb)$)/.exec(fileName!)![2]);
            return this.LoadGLTFModel(url, obj);
        }
        else return false;
    }

    private async LoadCADModel(url: string, obj: THREE.Object3D, fn: Function): Promise<boolean> {
        return fetch(url)
            .then(response => {
                return response.arrayBuffer()
                    .then(buffer => {
                        let fileBuffer = new Uint8Array(buffer);
                        let result = fn(fileBuffer, null);
                        console.log(result);
                        let model = this.CreateModel(result, result.root);
                        obj.add(model);
                        return true;
                    })
                    .catch(e => {
                        console.log(e);
                        return false;
                    })
            })
            .catch(e => {
                console.log(e);
                return false;
            })
    }

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
                let mat = new THREE.MeshPhysicalMaterial({ color: 0xffffff, roughness: 0.6, metalness: 0.3 });
                if (res.meshes[data.meshes[j]].color != undefined) {
                    let color = res.meshes[data.meshes[j]].color;
                    mat.color = new THREE.Color(color[0], color[1], color[2]);
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

    private async LoadGLTFModel(url: string, obj: THREE.Object3D): Promise<boolean> {
        let loader = new GLTFLoader();
        return new Promise((resolve, reject) => {
            loader.loadAsync(
                url,
                function (xhr: any) {
                    console.log((xhr.loaded / xhr.total * 100) + '% loaded');
                }
            ).then(gltf => {
                if (gltf.scene.children.length != 0) {
                    obj.add(gltf.scene.children[0].clone());
                    gltf.scene.traverse(object => {
                        let obj = (object as any);
                        if (obj.geometry != undefined)
                            obj.geometry.dispose();
                        if (obj.material != undefined)
                            obj.material.dispose();
                    });
                    obj.updateMatrixWorld(true);
                    resolve(true);
                }
                return false;
            }).catch(e => {
                console.log(e);
                reject(false);
            })
        })
    }
    //#endregion
}