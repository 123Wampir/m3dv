import { CameraType } from "../src/Managers/Appearance";
import { ControlsType } from "../src/Managers/Controls";
import { Viewer } from "../src/Viewer";

const canvas = document.getElementById("canvas") as HTMLCanvasElement;
const wireframe = document.getElementById("wireframe") as HTMLInputElement;
const smallparts = document.getElementById("smallparts") as HTMLInputElement;
const camera = document.getElementById("camera") as HTMLInputElement;
const controls = document.getElementById("controls") as HTMLInputElement;

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

wireframe.onchange = (e) => {
    viewer.appearance.wireframe = (e.target as any).checked;
}
smallparts.onchange = (e) => {
    viewer.appearance.hideSmallPartsOnCameraMove = (e.target as any).checked;
}
camera.onchange = (e) => {
    const value = (e.target as any).checked as boolean;
    viewer.appearance.SetCameraType(value == true ? CameraType.orthographic : CameraType.perspective);
}
controls.onchange = (e) => {
    const value = (e.target as any).checked as boolean;
    viewer.controls.SetCameraControl(value == true ? ControlsType.trackball : ControlsType.orbit);
}