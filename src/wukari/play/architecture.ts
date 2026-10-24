/** Original illustrative finishes on unchanged OSM polygons, never building identities. */
import * as T from 'three';
import { signTexture } from './labels.ts';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { inside, type Study, type Point } from './model.ts';
export function architecture(study: Study) {
    const group = new T.Group(), walls: T.BufferGeometry[] = [], roofs: T.BufferGeometry[] = [], details: {
        x: number;
        z: number;
        y: number;
        yaw: number;
        door: boolean;
        shop: boolean;
    }[] = [], shops: {
        x: number;
        z: number;
        y: number;
        yaw: number;
    }[] = [];
    const paint = ['#c7b28b', '#d6c7a3', '#a2b6ac', '#c59f87', '#b5b5aa', '#d3cbbd'], metal = ['#985c44', '#737d80', '#a78463', '#576e70'];
    function color(g: T.BufferGeometry, c: string) { const p = g.getAttribute('position'), v = new Float32Array(p.count * 3), base = new T.Color(c); for (let i = 0; i < p.count; i++)
        base.clone().multiplyScalar(.94 + Math.sin(p.getX(i) * 13 + p.getZ(i) * 9) * .04).toArray(v, i * 3); g.setAttribute('color', new T.BufferAttribute(v, 3)); g.deleteAttribute('uv'); g.clearGroups(); return g; }
    for (const b of study.buildings) {
        const context=study.entrance?.contextBuilding?.id===b.id;
        const knownShop = !!b.tags.shop || ['retail', 'commercial', 'kiosk'].includes(b.tags.building ?? ''), illustrativeShop = !context && (b.tags.building === 'yes' || !b.tags.building) && b.id % 7 === 0, isShop = knownShop || illustrativeShop;
        const points = b.points, shape = new T.Shape(points.map(p => new T.Vector2(p.x, -p.z))), raw = Number(b.tags.height?.replace(/\s*m$/, '')), height = Number.isFinite(raw) && raw >= 2 && raw <= 60 ? raw : context?study.entrance!.contextBuilding!.height:3.6;
        const g = new T.ExtrudeGeometry(shape, { depth: height, steps: 1, bevelEnabled: false });
        g.rotateX(-Math.PI / 2);
        walls.push(color(g, context?'#d4c9a7':paint[b.id % paint.length]!));
        const center = { x: points.reduce((s, p) => s + p.x, 0) / points.length, z: points.reduce((s, p) => s + p.z, 0) / points.length };
        let positive = false, negative = false;
        for (let i = 1; i < points.length - 1; i++) {
            const a = points[i - 1]!, p = points[i]!, c = points[i + 1]!, cross = (p.x - a.x) * (c.z - p.z) - (p.z - a.z) * (c.x - p.x);
            if (cross > .001)
                positive = true;
            if (cross < -.001)
                negative = true;
        }
        if (!(positive && negative) && inside(center, points) && (context || b.id % 3 !== 0)) {
            const vertices: number[] = [];
            for (let i = 1; i < points.length; i++) {
                const a = points[i - 1]!, c = points[i]!;
                vertices.push(a.x, height + .03, a.z, c.x, height + .03, c.z, center.x, height + Math.min(1.7, Math.sqrt(Math.abs((points[1]!.x - points[0]!.x) * (points[2]!.z - points[0]!.z))) * .13) + .5, center.z);
            }
            const r = new T.BufferGeometry();
            r.setAttribute('position', new T.Float32BufferAttribute(vertices, 3));
            r.computeVertexNormals();
            roofs.push(color(r, b.tags['roof:colour'] && /^#[a-f\d]{6}$/i.test(b.tags['roof:colour']) ? b.tags['roof:colour'] : context?'#915646':metal[b.id % metal.length]!));
        }
        else {
            const r = new T.ShapeGeometry(shape);
            r.rotateX(-Math.PI / 2);
            r.translate(0, height + .04, 0);
            roofs.push(color(r.toNonIndexed(), context?'#915646':metal[b.id % metal.length]!));
            r.dispose();
        }
        if (isShop && points.length > 2) {
            const a = points[0]!, c = points[1]!, d = Math.hypot(c.x - a.x, c.z - a.z);
            if (d > 4)
                shops.push({ x: (a.x + c.x) / 2, y: height - .5, z: (a.z + c.z) / 2, yaw: Math.atan2(c.x - a.x, c.z - a.z) });
        }
        let area = 0;
        for (let i = 1; i < points.length; i++)
            area += points[i - 1]!.x * points[i]!.z - points[i]!.x * points[i - 1]!.z;
        for (let i = 1; i < points.length; i++) {
            const a = points[i - 1]!, c = points[i]!, length = Math.hypot(c.x - a.x, c.z - a.z);
            if (length < 3.5)
                continue;
            const dx = (c.x - a.x) / length, dz = (c.z - a.z) / length, sign = area > 0 ? 1 : -1;
            for (let j = 0; j < Math.min(6, Math.floor(length / 3)); j++) {
                const t = (j + 1) / (Math.min(6, Math.floor(length / 3)) + 1);
                details.push({ x: a.x + (c.x - a.x) * t + dz * sign * .01, z: a.z + (c.z - a.z) * t - dx * sign * .01, y: j === 0 ? 1.15 : 1.9, yaw: context?Math.atan2(-dz,dx):Math.atan2(dx, dz), door: j === 0, shop: isShop });
                if(context)details.push({x:a.x+(c.x-a.x)*t+dz*sign*.01,z:a.z+(c.z-a.z)*t-dx*sign*.01,y:4.5,yaw:Math.atan2(-dz,dx),door:false,shop:false});
            }
        }
    }
    for (const list of [walls, roofs]) {
        if (!list.length)
            continue;
        const g = mergeGeometries(list)!;
        list.forEach(g => g.dispose());
        const m = new T.MeshLambertMaterial({ vertexColors: true, side: T.DoubleSide });
        const roof = list === roofs;
        m.onBeforeCompile = s => { s.vertexShader = 'varying vec3 vWukariSurface;\n' + s.vertexShader.replace('#include <begin_vertex>', '#include <begin_vertex>\nvWukariSurface=position;'); s.fragmentShader = 'varying vec3 vWukariSurface;\n' + s.fragmentShader.replace('#include <dithering_fragment>', '#include <dithering_fragment>\nfloat grain=fract(sin(dot(floor(vWukariSurface*30.0),vec3(12.9898,78.233,39.425)))*43758.5453);\ngl_FragColor.rgb *= ' + (roof ? '0.95+0.05*abs(sin((vWukariSurface.x+vWukariSurface.z)*18.0))' : '0.97+0.03*grain') + ';'); };
        m.customProgramCacheKey = () => roof ? 'wukari-metal-roof' : 'wukari-plaster';
        group.add(new T.Mesh(g, m));
    }
    const frame = new T.InstancedMesh(new T.BoxGeometry(1, 1, 1), new T.MeshLambertMaterial({ color: '#d2c6a7' }), Math.min(4000, details.length)), panels = new T.InstancedMesh(new T.BoxGeometry(1, 1, 1), new T.MeshLambertMaterial({ color: '#334b50' }), Math.min(4000, details.length));
    frame.count = panels.count = 0;
    frame.frustumCulled = panels.frustumCulled = false;
    group.add(frame, panels);
    const shopTexture = signTexture('PROVISIONS', 'ILLUSTRATIVE SHOPFRONT'), shopMaterial = new T.MeshBasicMaterial({ map: shopTexture, side: T.DoubleSide, polygonOffset: true, polygonOffsetFactor: -1 }), shopMesh = new T.InstancedMesh(new T.PlaneGeometry(2.2, .55), shopMaterial, Math.max(1, shops.length));
    shopMesh.count = 0;
    shopMesh.frustumCulled = false;
    group.add(shopMesh);
    const dummy = new T.Object3D();
    let lastX = Infinity, lastZ = Infinity, lastRadius = 0;
    function update(p: Point, radius: number) { if (Math.hypot(p.x - lastX, p.z - lastZ) < 12 && radius === lastRadius)
        return; lastX = p.x; lastZ = p.z; lastRadius = radius; let n = 0; for (const d of details) {
        if (n >= frame.instanceMatrix.count || Math.hypot(d.x - p.x, d.z - p.z) > radius)
            continue;
        dummy.position.set(d.x, d.y, d.z);
        dummy.rotation.set(0, d.yaw, 0);
        dummy.scale.set(d.door ? (d.shop ? 1.65 : 1) : 1.15, d.door ? 2.25 : 1.25, .02);
        dummy.updateMatrix();
        frame.setMatrixAt(n, dummy.matrix);
        dummy.scale.multiply(new T.Vector3(.84, .86, 1.5));
        dummy.updateMatrix();
        panels.setMatrixAt(n, dummy.matrix);
        panels.setColorAt(n, new T.Color(d.door ? (d.shop ? '#6b7776' : '#594a3d') : '#49616a'));
        n++;
    } frame.count = panels.count = n; frame.instanceMatrix.needsUpdate = panels.instanceMatrix.needsUpdate = true; if (panels.instanceColor)
        panels.instanceColor.needsUpdate = true; let count = 0; for (const s of shops) {
        if (Math.hypot(s.x - p.x, s.z - p.z) > radius)
            continue;
        dummy.position.set(s.x, s.y, s.z);
        dummy.rotation.set(0, s.yaw, 0);
        dummy.scale.set(1, 1, 1);
        dummy.updateMatrix();
        shopMesh.setMatrixAt(count++, dummy.matrix);
    } shopMesh.count = count; shopMesh.instanceMatrix.needsUpdate = true; }
    return { group, update, dispose() { shopTexture.dispose(); } };
}
