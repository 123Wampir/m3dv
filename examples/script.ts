import { CameraType, ControlsType, Viewer, ViewFitType, ToneMapping } from "../src/m3dv"

const canvas = document.getElementById("canvas") as HTMLCanvasElement;
const wireframe = document.getElementById("wireframe") as HTMLInputElement;
const smallparts = document.getElementById("smallparts") as HTMLInputElement;
const camera = document.getElementById("camera") as HTMLInputElement;
const controls = document.getElementById("controls") as HTMLInputElement;


const planex = document.getElementById("planex") as HTMLInputElement;
const xoffset = document.getElementById("planex-offset") as HTMLInputElement;
const planey = document.getElementById("planey") as HTMLInputElement;
const yoffset = document.getElementById("planey-offset") as HTMLInputElement;
const planez = document.getElementById("planez") as HTMLInputElement;
const zoffset = document.getElementById("planez-offset") as HTMLInputElement;

const intersection = document.getElementById("intersection") as HTMLInputElement;
const include = document.getElementById("include");
const exclude = document.getElementById("exclude");

const sectionFillColor = document.getElementById("sectionFillColor") as HTMLInputElement;
const sectionFillMap = document.getElementById("sectionFillMap") as HTMLInputElement;

const explode = document.getElementById("explode-value") as HTMLInputElement;

const background = document.getElementById("background") as HTMLInputElement;
const hdr = document.getElementById("hdr") as HTMLInputElement;
const reflection = document.getElementById("reflection") as HTMLInputElement;
const isReflectionMapEnabled = document.getElementById("isReflectionMapEnabled") as HTMLInputElement;

const exposure = document.getElementById("exposure") as HTMLInputElement;
const backgroundIntensity = document.getElementById("backgroundIntensity") as HTMLInputElement;
const backgroundBlurriness = document.getElementById("backgroundBlurriness") as HTMLInputElement;
const backgroundRotationX = document.getElementById("backgroundRotationX") as HTMLInputElement;
const backgroundRotationY = document.getElementById("backgroundRotationY") as HTMLInputElement;
const backgroundRotationZ = document.getElementById("backgroundRotationZ") as HTMLInputElement;

const tone = document.getElementById("tone") as HTMLSelectElement;


window.onkeydown = (e: KeyboardEvent) => {
    if (e.code == "KeyF") {
        if (viewer.selectionManager.target.length != 0)
            viewer?.appearance.FitInView(ViewFitType.selected);
        else viewer?.appearance.FitInView(ViewFitType.model);
        viewer?.appearance.Render();
    }
    if (e.code == "KeyI") {
        viewer.Isolate();
    }

}

const occtImportJsWasmPath = new URL("../libs/occt-import-js/occt-import-js.wasm", import.meta.url).href;
const viewer = new Viewer(canvas, { occtImportJsWasmPath: occtImportJsWasmPath });
viewer.appearance.enviroment.SetBackgroundColor(0x222222)
viewer.addListener("loaded", () => UpdatePlanesMinMax());
const loadButton = document.getElementById("load-file");
loadButton!.onchange = (e) => {
    const files = (e.target as any).files;
    if (files.length != 0) {
        const file = files[0] as File;
        const src = URL.createObjectURL(file);
        viewer.LoadModelFile(file.name, src);
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
planex.onchange = (e) => {
    const value = (e.target as any).checked as boolean;
    viewer.sceneManager.planeManager.planes[0].SetVisibility(value);
}
xoffset.onchange = (e) => {
    const value = (e.target as any).value as number;
    viewer.sceneManager.planeManager.planes[0].SetOffset(value);
}
planey.onchange = (e) => {
    const value = (e.target as any).checked as boolean;
    viewer.sceneManager.planeManager.planes[1].SetVisibility(value);
}
yoffset.onchange = (e) => {
    const value = (e.target as any).value as number;
    viewer.sceneManager.planeManager.planes[1].SetOffset(value);
}
planez.onchange = (e) => {
    const value = (e.target as any).checked as boolean;
    viewer.sceneManager.planeManager.planes[2].SetVisibility(value);
}
zoffset.onchange = (e) => {
    const value = (e.target as any).value as number;
    viewer.sceneManager.planeManager.planes[2].SetOffset(value);
}
intersection.onchange = (e) => {
    const value = (e.target as any).checked as boolean;
    viewer.sceneManager.planeManager.ClipIntersection(value);
}
include!.onclick = (e) => {
    viewer.selectionManager.target.forEach(t => viewer.sceneManager.planeManager.Include(t));
}
exclude!.onclick = (e) => {
    viewer.selectionManager.target.forEach(t => viewer.sceneManager.planeManager.Exclude(t));
}

sectionFillColor!.oninput = (e) => {
    const hex = (e.target as any).value;
    viewer.sceneManager.planeManager.SetSectionFillColor(hex);
    viewer.appearance.Render();
}
sectionFillMap!.onchange = (e) => {
    const files = (e.target as any).files;
    if (files.length != 0) {
        const file = files[0] as File;
        const src = URL.createObjectURL(file);
        viewer.sceneManager.planeManager.LoadSectionFillImage(src).then(() => {
            viewer.appearance.Render();
        });
    }
}

explode!.oninput = (e) => {
    const value = (e.target as any).value;
    viewer.explodeView.Explode(value);
    viewer.appearance.Render();
}

background.oninput = (e) => {
    const hex = (e.target as any).value;
    viewer.appearance.enviroment.SetBackgroundColor(hex);
    isReflectionMapEnabled.checked = viewer.appearance.enviroment.isReflectionMapEnabled;
    viewer.appearance.Render();
}

hdr!.onchange = (e) => {
    const files = (e.target as any).files;
    if (files.length != 0) {
        const file = files[0] as File;
        const src = URL.createObjectURL(file);
        viewer.appearance.enviroment.LoadBackgroundImage(src).then(() => {
            isReflectionMapEnabled.checked = viewer.appearance.enviroment.isReflectionMapEnabled;
            viewer.appearance.Render();
        });
    }
}

reflection.oninput = (e) => {
    const value = (e.target as any).checked;
    viewer.appearance.enviroment.SetReflectionMap(value);
    isReflectionMapEnabled.checked = viewer.appearance.enviroment.isReflectionMapEnabled;
    viewer.appearance.Render();
}

exposure.oninput = (e) => {
    viewer.appearance.enviroment.exposure = (e.target as any).value;
    viewer.appearance.Render();
}

backgroundIntensity.oninput = (e) => {
    viewer.appearance.enviroment.backgroundIntensity = (e.target as any).value;
    viewer.appearance.Render();
}

backgroundBlurriness.oninput = (e) => {
    viewer.appearance.enviroment.backgroundBlurriness = (e.target as any).value;
    viewer.appearance.Render();
}

backgroundRotationX.oninput = (e) => {
    viewer.appearance.enviroment.backgroundRotation.x = (e.target as any).value * Math.PI / 180;
    viewer.appearance.Render();
}

backgroundRotationY.oninput = (e) => {
    viewer.appearance.enviroment.backgroundRotation.y = (e.target as any).value * Math.PI / 180;
    viewer.appearance.Render();
}

backgroundRotationZ.oninput = (e) => {
    viewer.appearance.enviroment.backgroundRotation.z = (e.target as any).value * Math.PI / 180;
    viewer.appearance.Render();
}

tone.onchange = (e) => {
    const value = Number.parseInt((e.target as any).value);
    console.log(value);

    viewer.appearance.enviroment.toneMapping = value as ToneMapping;
    viewer.appearance.Render();
}

function UpdatePlanesMinMax() {
    xoffset.min = (viewer.sceneManager.planeManager.planes[0].min - 1e-6).toString();
    xoffset.max = (viewer.sceneManager.planeManager.planes[0].max + 1e-6).toString();
    yoffset.min = (viewer.sceneManager.planeManager.planes[1].min - 1e-6).toString();
    yoffset.max = (viewer.sceneManager.planeManager.planes[1].max + 1e-6).toString();
    zoffset.min = (viewer.sceneManager.planeManager.planes[2].min - 1e-6).toString();
    zoffset.max = (viewer.sceneManager.planeManager.planes[2].max + 1e-6).toString();
    xoffset.step = 1e-6.toString();
    yoffset.step = 1e-6.toString();
    zoffset.step = 1e-6.toString();

}