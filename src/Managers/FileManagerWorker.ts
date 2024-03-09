import { Object3D } from "three";
import { FileManager } from "./FileManager";

onmessage = async function (e) {

    let obj = new Object3D();
    let start = Date.now();
    await new FileManager(e.data[0]).LoadModel(e.data[1], e.data[2], obj);
    let end = Date.now();
    let diff = (end - start) / 1000;
    console.log(`elapsed: ${diff} sec`);
    postMessage(obj.toJSON());
}
