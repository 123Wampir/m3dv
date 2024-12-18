import { Box3, Float32BufferAttribute, Int32BufferAttribute, Mesh, Object3D, Triangle, Vector3 } from 'three';
import { ConvexHull } from 'three/examples/jsm/math/ConvexHull.js'

function determinant_3x3(m: number[][]) {
    return (m[0][0] * (m[1][1] * m[2][2] - m[1][2] * m[2][1]) -
        m[1][0] * (m[0][1] * m[2][2] - m[0][2] * m[2][1]) +
        m[2][0] * (m[0][1] * m[1][2] - m[0][2] * m[1][1]))
}

function subtract(a: Vector3, b: Vector3) {
    return [a.x - b.x, a.y - b.y, a.z - b.z]
}

function tetrahedron_volume(a: Vector3, b: Vector3, c: Vector3, d: Vector3) {
    return Math.abs(
        determinant_3x3(
            [subtract(a, b),
            subtract(b, c),
            subtract(c, d)])) / 6.0
}

export function GetVolume(box: Box3) {
    let size = new Vector3();
    box.getSize(size);
    return size.x * size.y * size.z;
}

export function ComputeVolume(object: Object3D) {
    var ch = new ConvexHull();
    ch.setFromObject(object);
    let sum = 0;
    const a = object.getWorldPosition(new Vector3(0, 0, 0));
    for (let index = 0; index < ch.faces.length; index++) {
        const face = ch.faces[index];
        const b = face.edge.tail().point;
        const c = face.edge.head().point;
        const d = face.edge.next.head().point;

        const V = tetrahedron_volume(a, b, c, d);
        sum += V;
    }
    ch.cleanup();
    return sum;
}

export function ComputeArea(object: Object3D): number {
    let area = 0;
    object.traverse(item => {
        const mesh = item as Mesh;
        if (mesh.isMesh == true) {
            const geometry = mesh.geometry.clone();
            geometry.toNonIndexed();
            const positions = geometry.getAttribute("position") as Float32BufferAttribute;
            for (let i = 0; i < positions.count; i += 3) {
                const a = new Vector3(positions.array[i], positions.array[i + 1], positions.array[i + 2]);
                const b = new Vector3(positions.array[i + 3], positions.array[i + 4], positions.array[i + 5]);
                const c = new Vector3(positions.array[i + 6], positions.array[i + 7], positions.array[i + 9]);
                const face = new Triangle(a, b, c);
                area += face.getArea();
            }
            geometry.dispose();
        }
    })
    return area;
}