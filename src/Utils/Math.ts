import { Box3, Object3D, Vector3 } from 'three';
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
    let a = object.getWorldPosition(new Vector3(0, 0, 0));
    for (let index = 0; index < ch.faces.length; index++) {
        const face = ch.faces[index];
        let b = face.edge.tail().point;
        let c = face.edge.head().point;
        let d = face.edge.next.head().point;

        var V = tetrahedron_volume(a, b, c, d);
        sum += V;
    }
    return sum;
}