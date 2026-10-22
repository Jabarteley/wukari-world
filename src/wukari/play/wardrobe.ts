/** Original rigged wardrobe surfaces and anatomical shoe lasts; no external assets. */
import * as T from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import type { Appearance } from './appearance.ts';
type V = {
    p: T.Vector3;
    n: T.Vector3;
    w: Map<number, number>;
};
export function finishWardrobe(body: T.SkinnedMesh, a: Appearance, shirt: {
    geometry: T.BufferGeometry;
    mesh: T.SkinnedMesh;
}) {
    const source = body.geometry, p = source.getAttribute('position'), normal = source.getAttribute('normal'), joints = source.getAttribute('skinIndex'), weights = source.getAttribute('skinWeight'), index = source.index;
    const positions: number[] = [], normals: number[] = [], colors: number[] = [], skinIndex: number[] = [], skinWeight: number[] = [], bottom = new T.Color(a.trousers), top = new T.Color(a.top);
    const vertex = (i: number): V => { const w = new Map<number, number>(); for (let k = 0; k < 4; k++)
        w.set(joints.getComponent(i, k), (w.get(joints.getComponent(i, k)) ?? 0) + weights.getComponent(i, k)); return { p: new T.Vector3().fromBufferAttribute(p, i), n: new T.Vector3().fromBufferAttribute(normal, i), w }; };
    function mix(a: V, b: V, t: number): V { const w = new Map<number, number>(); for (const [j, v] of a.w)
        w.set(j, v * (1 - t)); for (const [j, v] of b.w)
        w.set(j, (w.get(j) ?? 0) + v * t); return { p: a.p.clone().lerp(b.p, t), n: a.n.clone().lerp(b.n, t).normalize(), w }; }
    function emit(v: V, color: T.Color) { v.p.toArray(positions, positions.length); v.n.toArray(normals, normals.length); color.toArray(colors, colors.length); const w = [...v.w].sort((a, b) => b[1] - a[1]).slice(0, 4), sum = w.reduce((s, [, v]) => s + v, 0); for (let i = 0; i < 4; i++) {
        skinIndex.push(w[i]?.[0] ?? 0);
        skinWeight.push((w[i]?.[1] ?? 0) / sum);
    } }
    const cuff = a.bottom === 'shorts' ? .59 : a.bottom === 'joggers' ? .14 : .11;
    for (let i = 0; i < (index?.count ?? p.count); i += 3) {
        const ids = [index ? index.getX(i) : i, index ? index.getX(i + 1) : i + 1, index ? index.getX(i + 2) : i + 2];
        if (ids.every(i => p.getY(i) > .943) || ids.every(i => p.getY(i) < cuff))
            continue;
        let poly = ids.map(vertex);
        for (const cut of [(v: V) => .942 - v.p.y, (v: V) => v.p.y - cuff]) {
            const out: V[] = [];
            for (let k = 0; k < poly.length; k++) {
                const u = poly[k]!, v = poly[(k + 1) % poly.length]!, d = cut(u), e = cut(v);
                if (d >= 0)
                    out.push(u);
                if ((d >= 0) !== (e >= 0))
                    out.push(mix(u, v, d / (d - e)));
            }
            poly = out;
        }
        for (let k = 1; k + 1 < poly.length; k++)
            for (const original of [poly[0]!, poly[k]!, poly[k + 1]!]) {
                const v = { ...original, p: original.p.clone(), n: original.n.clone() }, inflation = a.bottom === 'cargo' ? .026 : a.bottom === 'jeans' ? .021 : a.bottom === 'joggers' ? .015 : .012;
                v.p.addScaledVector(v.n, inflation * (a.bottom === 'joggers' && v.p.y < .35 ? .45 : 1));
                const c = bottom.clone();
                if (Math.abs(v.p.y - cuff) < .02)
                    c.multiplyScalar(.83);
                emit(v, c);
            }
    }
    function accessory(g: T.BufferGeometry, color: T.Color) { const expanded = g.index ? g.toNonIndexed() : g.clone(), pos = expanded.getAttribute('position'), n = expanded.getAttribute('normal'); for (let i = 0; i < pos.count; i++) {
        const point = new T.Vector3().fromBufferAttribute(pos, i);
        let best = Infinity, closest = 0;
        for (let j = 0; j < p.count; j++) {
            const d = (p.getX(j) - point.x) ** 2 + (p.getY(j) - point.y) ** 2 + (p.getZ(j) - point.z) ** 2;
            if (d < best) {
                best = d;
                closest = j;
            }
        }
        const v = vertex(closest);
        v.p = point;
        v.n = new T.Vector3().fromBufferAttribute(n, i);
        emit(v, color);
    } expanded.dispose(); g.dispose(); }
    if (a.bottom === 'cargo')
        for (const sign of [-1, 1]) {
            const g = new T.BoxGeometry(.07, .13, .055);
            g.translate(sign * .155, .69, .085);
            accessory(g, bottom.clone().multiplyScalar(.88));
        }
    if (a.bottom === 'jeans')
        for (const sign of [-1, 1]) {
            const g = new T.BoxGeometry(.07, .095, .008);
            g.translate(sign * .08, .86, -.14);
            accessory(g, bottom.clone().multiplyScalar(.87));
        }
    const neck = a.preset === 'female' ? 1.448 : 1.49;
    if (a.outfit === 'hoodie') {
        const g = new T.SphereGeometry(1, 12, 8);
        g.scale(.125, .09, .065);
        g.translate(0, neck - .13, -.19);
        accessory(g, top.clone().multiplyScalar(.9));
        for (const sign of [-1, 1]) {
            const cord = new T.CylinderGeometry(.0025, .0025, .17, 5);
            cord.translate(sign * .032, neck - .10, .105);
            accessory(cord, new T.Color('#d7d4bd'));
        }
    }
    if (a.outfit === 'polo' || a.outfit === 'shirt' || a.outfit === 'jacket')
        for (const sign of [-1, 1]) {
            const vertices = [sign * .018, neck + .008, .068, sign * .10, neck - .04, .09, sign * .055, neck - .095, .14];
            const g = new T.BufferGeometry();
            g.setAttribute('position', new T.Float32BufferAttribute(vertices, 3));
            g.computeVertexNormals();
            accessory(g, top.clone().multiplyScalar(a.outfit === 'jacket' ? .78 : .9));
        }
    if (a.outfit === 'shirt')
        for (let i = 0; i < 5; i++) {
            const g = new T.SphereGeometry(.004, 6, 4);
            g.translate(0, neck - .15 - i * .065, .156);
            accessory(g, new T.Color('#e0d9c3'));
        }
    const geometry = new T.BufferGeometry();
    geometry.setAttribute('position', new T.Float32BufferAttribute(positions, 3));
    geometry.setAttribute('normal', new T.Float32BufferAttribute(normals, 3));
    geometry.setAttribute('color', new T.Float32BufferAttribute(colors, 3));
    geometry.setAttribute('skinIndex', new T.Uint16BufferAttribute(skinIndex, 4));
    geometry.setAttribute('skinWeight', new T.Float32BufferAttribute(skinWeight, 4));
    // Match indexing; the original shirt is non-indexed. A single garment draw/rig.
    const combined = mergeGeometries([shirt.geometry, geometry])!;
    shirt.geometry.dispose();
    geometry.dispose();
    shirt.geometry = combined;
    shirt.mesh.geometry = combined;
}
export function shoeGeometries(style: Appearance['footwear']) {
    const shapes: {
        geometry: T.BufferGeometry;
        part: 'sole' | 'upper' | 'trim';
    }[] = [], shape = new T.Shape();
    const outline = [[-.038, -.14], [-.058, -.10], [-.065, .035], [-.057, .11], [-.034, .15], [0, .16], [.034, .15], [.057, .11], [.065, .035], [.058, -.10], [.038, -.14], [-.038, -.14]];
    shape.moveTo(outline[0]![0]!, -outline[0]![1]!);
    shape.splineThru(outline.slice(1).map(([x, z]) => new T.Vector2(x!, -z!)));
    shape.closePath();
    const sole = new T.ExtrudeGeometry(shape, { depth: .024, steps: 1, bevelEnabled: true, bevelSegments: 1, bevelSize: .003, bevelThickness: .002, curveSegments: 2 });
    sole.rotateX(-Math.PI / 2);
    sole.translate(0, .012, 0);
    shapes.push({ geometry: sole, part: 'sole' });
    if (style !== 'sandals') {
        const ring = shape.getPoints(2), positions: number[] = [], index: number[] = [], N = ring.length;
        for (let row = 0; row < 4; row++)
            for (let i = 0; i < N; i++) {
                const x = ring[i]!.x, z = -ring[i]!.y;
                let px = x, pz = z, y = .035;
                if (row === 1) {
                    px *= .98;
                    pz *= .98;
                    y = z > 0 ? .075 : style === 'boots' ? .13 : .095;
                }
                if (row === 2) {
                    px *= .72;
                    pz = pz * .65 - .018;
                    y = z > 0 ? .095 : style === 'boots' ? .19 : style === 'casual' ? .10 : .115;
                }
                if (row === 3) {
                    px *= .72;
                    pz = pz * .20 - .065;
                    y = style === 'boots' ? .205 : style === 'casual' ? .105 : .13;
                }
                positions.push(px, y, pz);
                if (row < 3 && i + 1 < N) {
                    const n = row * N + i;
                    index.push(n, n + 1, n + N, n + 1, n + N + 1, n + N);
                }
            }
        const upper = new T.BufferGeometry();
        upper.setAttribute('position', new T.Float32BufferAttribute(positions, 3));
        upper.setIndex(index);
        upper.computeVertexNormals();
        shapes.push({ geometry: upper, part: 'upper' });
        for (let i = 0; i < (style === 'casual' ? 1 : 3); i++) {
            const g = new T.BoxGeometry(.068, .006, .009);
            g.translate(0, style === 'boots' ? .17 - i * .018 : .112 - i * .005, .015 + i * .022);
            shapes.push({ geometry: g, part: 'trim' });
        }
    }
    else
        for (const z of [.02, .10]) {
            const g = new T.TorusGeometry(.054, .011, 5, 12, Math.PI);
            g.translate(0, .04, z);
            shapes.push({ geometry: g, part: 'upper' });
        }
    return shapes;
}
