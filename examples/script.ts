import * as THREE from "three"
import { Viewer } from "../src/Viewer"
import { SceneManager } from "../src/Managers/SceneManager";

const canvas = document.getElementById("canvas") as HTMLCanvasElement;
console.log(canvas);

const viewer = new Viewer(canvas.getContext("webgl2") as WebGL2RenderingContext);

const loadButton = document.getElementById("load-file");
loadButton!.onchange = (e) => {
    const files = (e.target as any).files;
    if (files.length != 0) {
        const file = files[0] as File;
        const src = URL.createObjectURL(file);
        viewer.sceneManager.LoadModelFile(file.name, src);
    }
}