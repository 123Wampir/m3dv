import { FileManager, FileManagerOptions } from "./FileManager";

onmessage = async function (e) {
    const start = Date.now();
    const options: FileManagerOptions = JSON.parse(e.data[0]);
    const obj = await new FileManager(options).LoadModel(e.data[1], e.data[2]);
    const end = Date.now();
    const diff = (end - start) / 1000;
    console.log(`elapsed: ${diff} sec`);
    postMessage(obj.toJSON());
}
