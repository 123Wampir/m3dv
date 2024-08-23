import * as THREE from "three";
import { EventEmitter } from "../Event/Event";
import { ViewType } from "./Appearance";

export enum BoundingType {
    box,
    sphere
}

export enum UpVectorAxis {
    axisY,
    axisZ
}

export class ModelManager extends EventEmitter {
    constructor() {
        super()
    }

    private model: THREE.Object3D = new THREE.Object3D();
    private upVectorAxis: UpVectorAxis = UpVectorAxis.axisY;
    private defaultPositions: Map<THREE.Object3D, THREE.Vector3> = new Map();

    override addListener(event: "change", listener: Function): void {
        super.addListener(event, listener);
    }
    override emit(event: "change", ...any: any): void {
        super.emit(event, ...any);
    }

    GetModel() {
        return this.model;
    }

    SetModel(model: THREE.Object3D) {
        this.Dispose();
        this.model.add(model);
        this.model.rotation.x = 0;
        this.upVectorAxis = UpVectorAxis.axisY;
        this.model.position.set(0, 0, 0);
        this.createUniqueMaterial();
        this.moveToCenter();
        this.saveState();
    }

    SwitchUpVector() {
        if (this.upVectorAxis == UpVectorAxis.axisY)
            this.SetUpVector(UpVectorAxis.axisZ);
        else this.SetUpVector(UpVectorAxis.axisY);
    }

    SetUpVector(upVector: UpVectorAxis) {
        this.ResetState();
        switch (upVector) {
            case UpVectorAxis.axisY:
                this.model.rotation.x = 0;
                break;
            case UpVectorAxis.axisZ:
                this.model.rotation.x = -Math.PI * 90 / 180;
                break;
        }
        this.upVectorAxis = upVector;
        this.moveToCenter();
        this.saveState();
        this.emit("change", { up: upVector });
    }

    ResetState() {
        this.model.traverse(item => {
            item.position.copy(this.defaultPositions.get(item)!);
        })
    }

    GetDefaultPosition(model: THREE.Object3D) {
        return this.defaultPositions.get(model);
    }

    ShowWireframe(show: boolean = true) {
        this.model.traverse(object => {
            let obj = object as any;
            if (obj.material != undefined) {
                obj.material.wireframe = show;
            }
        })
    }

    GetBounding(type: BoundingType, view: ViewType = ViewType.default): THREE.Box3 | THREE.Sphere {
        switch (type) {
            case BoundingType.box:
                return this.getBoundingBox(view);
            case BoundingType.sphere:
                return this.getBoundingSphere(view);
        }
    }

    private getBoundingBox(view: ViewType): THREE.Box3 {
        switch (view) {
            case ViewType.default:
                return this.calculateBounding(this.model).bbox;
            case ViewType.isolated:
                const box3 = new THREE.Box3();
                this.model.traverseVisible(object => {
                    if (object.layers.isEnabled(1)) {
                        const box = new THREE.Box3().setFromObject(object);
                        box3.union(box);
                    }
                })
                return box3;
        }
    }

    private getBoundingSphere(view: ViewType): THREE.Sphere {
        switch (view) {
            case ViewType.default:
                return this.calculateBounding(this.model).bsphere;
            case ViewType.isolated:
                const box3 = new THREE.Box3();
                this.model.traverseVisible(object => {
                    if (object.layers.isEnabled(1)) {
                        const box = new THREE.Box3().setFromObject(object);
                        box3.union(box);
                    }
                })
                const sphere = new THREE.Sphere;
                return box3.getBoundingSphere(sphere);
        }
    }

    private createUniqueGeometry() {
        this.model.traverse(obj => {
            if ((obj as any).geometry != undefined)
                (obj as any).geometry = (obj as any).geometry.clone();
        })
    }
    private createUniqueMaterial() {
        this.model.traverse(obj => {
            if ((obj as any).material != undefined) {
                let mesh = obj as any;
                // let material = new THREE.MeshPhysicalMaterial({
                //     color: mesh.material.color,
                //     metalness: mesh.material.metalness,
                //     roughness: mesh.material.roughness,
                //     opacity: mesh.material.opacity,
                //     transparent: mesh.material.transparent,
                //     side: THREE.FrontSide,
                //     shadowSide: THREE.BackSide,
                // });
                let material = new THREE.MeshToonMaterial({
                    color: mesh.material.color,
                    side: THREE.DoubleSide
                });
                mesh.material = material;
                if (mesh.geometry.hasAttribute('color')) {
                    mesh.material.vertexColors = true;
                }
                mesh.receiveShadow = true;
                mesh.castShadow = true;
                (mesh as THREE.Mesh).onBeforeRender = function (renderer, scene, camera, geometry, material) {
                    if (material.opacity != 1)
                        material.transparent = true;
                    else material.transparent = false;
                }
                mesh.material.onBeforeCompile = function (shader: any) {
                    shader.fragmentShader = shader.fragmentShader.replace(
                        `}`,
                        `
                            gl_FragColor = ( gl_FrontFacing ) ? vec4( outgoingLight, opacity ) : vec4(diffuse*0.2, 1.0 );
                        }
                        `
                    );
                };
            }
        })
    }

    private fixMeshPivot() {
        this.model.traverse(obj => {
            if ((obj as any).geometry != undefined) {
                let pos = obj.position.clone();
                var geometry = (obj as THREE.Mesh).geometry;
                geometry.computeBoundingBox();
                var center = new THREE.Vector3();
                geometry.boundingBox?.getCenter(center);
                geometry.center()
                obj.position.set(center.x, center.y, center.z);
                obj.position.add(pos);
            }
        })
    }

    private saveState() {
        this.model.traverse(item => {
            this.defaultPositions.set(item, item.position.clone());
        });
    }

    private moveToCenter() {
        this.model.position.set(0, 0, 0);
        this.model.updateMatrixWorld(true);
        let result = this.calculateBounding(this.model);
        let bbox = result.bbox;
        let center = new THREE.Vector3();
        bbox.getCenter(center).negate();
        center.y = -bbox.min.y;
        this.model.position.set(center.x, center.y, center.z);
    }

    private calculateBounding(object: THREE.Object3D) {
        let bbox = new THREE.Box3().setFromObject(object);
        let bsphere = new THREE.Sphere();
        bbox.getBoundingSphere(bsphere);
        return { bbox, bsphere };
    }

    Dispose() {
        this.defaultPositions.clear();
        if (this.model.children.length != 0) {
            let old = this.model.children[0];
            old.removeFromParent();
            old.traverse(object => {
                let obj = object as any;
                if (obj.geometry != undefined)
                    obj.geometry.dispose();
                if (obj.material != undefined) {
                    if (obj.material.clearcoatMap != undefined)
                        obj.material.clearcoatMap.dispose();
                    if (obj.material.clearcoatNormalMap != undefined)
                        obj.material.clearcoatNormalMap.dispose();
                    if (obj.material.clearcoatRoughnessMap != undefined)
                        obj.material.clearcoatRoughnessMap.dispose();
                    if (obj.material.iridescenceMap != undefined)
                        obj.material.iridescenceMap.dispose();
                    if (obj.material.iridescenceThicknessMap != undefined)
                        obj.material.iridescenceThicknessMap.dispose();
                    if (obj.material.sheenRoughnessMap != undefined)
                        obj.material.sheenRoughnessMap.dispose();
                    if (obj.material.sheenColorMap != undefined)
                        obj.material.sheenColorMap.dispose();
                    if (obj.material.specularIntensityMap != undefined)
                        obj.material.specularIntensityMap.dispose();
                    if (obj.material.specularColorMap != undefined)
                        obj.material.specularColorMap.dispose();
                    if (obj.material.thicknessMap != undefined)
                        obj.material.thicknessMap.dispose();
                    if (obj.material.transmissionMap != undefined)
                        obj.material.transmissionMap.dispose();
                    if (obj.material.alphaMap != undefined)
                        obj.material.alphaMap.dispose();
                    if (obj.material.aoMap != undefined)
                        obj.material.aoMap.dispose();
                    if (obj.material.bumpMap != undefined)
                        obj.material.bumpMap.dispose();
                    if (obj.material.displacementMap != undefined)
                        obj.material.displacementMap.dispose();
                    if (obj.material.emissiveMap != undefined)
                        obj.material.emissiveMap.dispose();
                    if (obj.material.lightMap != undefined)
                        obj.material.lightMap.dispose();
                    if (obj.material.map != undefined)
                        obj.material.map.dispose();
                    if (obj.material.metalnessMap != undefined)
                        obj.material.metalnessMap.dispose();
                    if (obj.material.normalMap != undefined)
                        obj.material.normalMap.dispose();
                    if (obj.material.roughnessMap != undefined)
                        obj.material.roughnessMap.dispose();
                    obj.material.dispose();
                }
                if (obj.dispose != undefined)
                    obj.dispose();
            })
        }
    }
}