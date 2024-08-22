import * as THREE from "three"
import { Viewer } from "../src/Viewer"
import { SceneManager } from "../src/Managers/SceneManager";

const canvas = document.getElementById("canvas");
console.log(canvas);

const viewer = new Viewer(
    new THREE.WebGLRenderer({ antialias: true, canvas: canvas!, logarithmicDepthBuffer: true }),
    new SceneManager(new THREE.Scene()));

const loadButton = document.getElementById("load-file");
loadButton!.onchange = (e) => {
    console.log(e);
    viewer.sceneManager.LoadModelFile(e);
}