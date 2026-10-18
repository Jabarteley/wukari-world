import * as THREE from 'three';
import type { P, Polygon, Road, World } from './types.ts';
import { Mesher, addFlat, open, signedArea } from './geometry.ts';
import type { PbrSet } from './textures.ts';

/**
 * The ground: land cut to the real shoreline with a concrete quay edge, the lagoon round it, the merged asphalt (prepared as one
 * surface so junctions are clean) with lane markings, raised pavements with kerbs, parks and pitches, and viaducts on piers.
 */
export interface Sets { asphalt: PbrSet; paving: PbrSet; ground: PbrSet; grass: PbrSet; concrete: PbrSet }
/** The aerial photograph over the area and its fit from street metres to uv (scripts/geo/export-ortho.py). */
export interface Ortho { texture: THREE.Texture; u: [number, number, number]; v: [number, number, number] }
export interface Surfaces { group: THREE.Group; water: THREE.Mesh; update(time: number): void }

const SIDEWALK_TOP = 0.15, ROAD_Y = 0.02;

function pbr(set: PbrSet, extra: THREE.MeshStandardMaterialParameters = {}): THREE.MeshStandardMaterial {
  return new THREE.MeshStandardMaterial({ map: set.map, normalMap: set.normalMap, roughnessMap: set.roughnessMap, aoMap: set.aoMap, metalnessMap: set.metalnessMap, ...extra });
}

export function buildSurfaces(world: World, sets: Sets, ortho?: Ortho): Surfaces {
  const group = new THREE.Group();
  // Land: the outlines traced from imagery, with a concrete quay face down into the water along real shore (not along the straight
  // cuts where the traced box ends).
  const landMesh = new Mesher(), quay = new Mesher();
  const xs = world.land.flat().map((p) => p[0]), zs = world.land.flat().map((p) => p[1]);
  const box = { x0: Math.min(...xs), x1: Math.max(...xs), z0: Math.min(...zs), z1: Math.max(...zs) };
  const onBox = ([x, z]: P) => Math.abs(x - box.x0) < 6 || Math.abs(x - box.x1) < 6 || Math.abs(z - box.z0) < 6 || Math.abs(z - box.z1) < 6;
  for (const ring of world.land) {
    const outer = open(ring);
    addFlat(landMesh, { outer, holes: [] }, 0, new THREE.Color('#c9b79a'));
    const ccw = signedArea(outer) > 0;
    for (let i = 0; i < outer.length; i++) {
      const a = outer[i]!, b = outer[(i + 1) % outer.length]!; if (onBox(a) && onBox(b)) continue;
      const [ax, az] = a, [bx, bz] = b, len = Math.hypot(bx - ax, bz - az); if (len < 0.01) continue;
      let nx = (bz - az) / len, nz = -(bx - ax) / len; if (!ccw) { nx = -nx; nz = -nz; }
      const base = quay.count;
      quay.vertex(ax, 0.05, az, nx, 0, nz, 0, 0.05); quay.vertex(bx, 0.05, bz, nx, 0, nz, len, 0.05);
      quay.vertex(bx, -2, bz, nx, 0, nz, len, -2); quay.vertex(ax, -2, az, nx, 0, nz, 0, -2);
      quay.quad(base, base + 3, base + 2, base + 1); quay.quad(base, base + 1, base + 2, base + 3);
    }
  }
  // The ground's colour is the aerial photograph (yards, lots, beaches, what the roads and buildings do not cover), its relief and
  // roughness the ground texture at a metre scale.
  const landGeometry = landMesh.build();
  if (ortho) {
    const pos = landGeometry.attributes.position!, uv1 = new Float32Array(pos.count * 2);
    for (let i = 0; i < pos.count; i++) { const x = pos.getX(i), z = pos.getZ(i); uv1[i * 2] = ortho.u[0] * x + ortho.u[1] * z + ortho.u[2]; uv1[i * 2 + 1] = ortho.v[0] * x + ortho.v[1] * z + ortho.v[2]; }
    landGeometry.setAttribute('uv1', new THREE.BufferAttribute(uv1, 2));
    ortho.texture.channel = 1;
  }
  const landMaterial = pbr(sets.ground, { roughness: 1 });
  if (ortho) {
    landMaterial.map = ortho.texture; ortho.texture.wrapS = ortho.texture.wrapT = THREE.ClampToEdgeWrapping;
    // Outside the photograph: plain ground, faded in over the last 2 % of the frame.
    landMaterial.onBeforeCompile = (shader) => {
      shader.fragmentShader = shader.fragmentShader.replace('#include <map_fragment>', `#include <map_fragment>
        { vec2 edge = min(vMapUv, 1.0 - vMapUv); float inside = smoothstep(0.0, 0.02, min(edge.x, edge.y));
          diffuseColor.rgb = mix(vec3(0.42, 0.37, 0.3), diffuseColor.rgb, inside); }`);
    };
    landMaterial.customProgramCacheKey = () => 'realworld-ortho-ground';
  }
  const landObject = new THREE.Mesh(landGeometry, landMaterial); landObject.receiveShadow = true; group.add(landObject);
  group.add(mesh(quay, pbr(sets.concrete, { color: '#9c978c' }), true));

  // Lagoon water: one large plane below the quay, glossy with moving ripples, reflecting the sky (scene.environment).
  const water = new THREE.Mesh(new THREE.PlaneGeometry(40000, 40000), waterMaterial());
  water.rotation.x = -Math.PI / 2; water.position.y = -0.7; water.receiveShadow = false;
  group.add(water);

  // Land use under everything else.
  const parks = new Mesher(), lots = new Mesher();
  for (const area of world.landUse) {
    const ring = open(area.ring); if (ring.length < 3) continue;
    if (/park|grass|garden|pitch|recreation|cemetery|stadium/.test(area.kind)) addFlat(parks, { outer: ring, holes: [] }, 0.01, new THREE.Color(area.kind === 'pitch' ? '#7f9c5a' : '#8fa36b'));
    else if (area.kind === 'parking') addFlat(lots, { outer: ring, holes: [] }, 0.012, new THREE.Color('#b0aca4'));
  }
  group.add(mesh(parks, pbr(sets.grass, { vertexColors: true }), false));
  group.add(mesh(lots, pbr(sets.asphalt, { vertexColors: true, polygonOffset: true, polygonOffsetFactor: -1 }), false));

  // Asphalt: the merged carriageways.
  const road = new Mesher();
  for (const polygon of world.asphalt) addFlat(road, polygon, ROAD_Y, new THREE.Color('#ffffff'));
  group.add(mesh(road, pbr(sets.asphalt, { polygonOffset: true, polygonOffsetFactor: -2 }), false));

  // Pavements: a 15 cm slab with kerb faces round every edge (to the road and to the plots).
  const walk = new Mesher(), kerb = new Mesher();
  for (const polygon of world.sidewalks) { addFlat(walk, polygon, SIDEWALK_TOP); for (const ring of [polygon.outer, ...polygon.holes]) addKerb(kerb, open(ring), ring === polygon.outer); }
  group.add(mesh(walk, pbr(sets.paving, { color: '#d8d2c6' }), true));
  group.add(mesh(kerb, pbr(sets.concrete, { color: '#cfcac0' }), true));

  // Markings: dashed centre lines on two-way main roads, solid edge lines, away from the junction ends.
  const marks = new Mesher();
  for (const r of world.roads) if (!r.bridge && r.width >= 7) addMarkings(marks, r);
  group.add(mesh(marks, new THREE.MeshStandardMaterial({ color: '#e8e4d6', roughness: 0.7, polygonOffset: true, polygonOffsetFactor: -4 }), false));

  // Viaducts: the deck at 8.5 m on piers every 28 m.
  const deck = new Mesher(), piers = new Mesher();
  for (const r of world.roads) if (r.bridge) addViaduct(deck, piers, r);
  group.add(mesh(deck, pbr(sets.concrete, { color: '#b9b4aa' }), true));
  group.add(mesh(piers, pbr(sets.concrete, { color: '#a8a398' }), true));

  return { group, water, update(time) { const m = water.material as THREE.MeshPhysicalMaterial; m.normalMap!.offset.set(time * 0.004, time * 0.0027); } };
}

function mesh(m: Mesher, material: THREE.Material, castShadow: boolean): THREE.Mesh {
  const out = new THREE.Mesh(m.build(), material);
  out.receiveShadow = true; out.castShadow = castShadow;
  return out;
}

function addKerb(m: Mesher, ring: P[], outer: boolean) {
  const ccw = signedArea(ring) > 0;
  for (let i = 0; i < ring.length; i++) {
    const [ax, az] = ring[i]!, [bx, bz] = ring[(i + 1) % ring.length]!, len = Math.hypot(bx - ax, bz - az); if (len < 0.01) continue;
    // Outward from the pavement: right of the edge on a counter-clockwise outer ring, left on a hole.
    let nx = (bz - az) / len, nz = -(bx - ax) / len; if (ccw !== outer) { nx = -nx; nz = -nz; }
    if (!outer) { nx = -nx; nz = -nz; }
    const base = m.count;
    m.vertex(ax, 0, az, nx, 0, nz, 0, 0); m.vertex(bx, 0, bz, nx, 0, nz, len, 0);
    m.vertex(bx, SIDEWALK_TOP, bz, nx, 0, nz, len, SIDEWALK_TOP); m.vertex(ax, SIDEWALK_TOP, az, nx, 0, nz, 0, SIDEWALK_TOP);
    m.quad(base, base + 3, base + 2, base + 1); m.quad(base, base + 1, base + 2, base + 3);
  }
}

function addMarkings(m: Mesher, r: Road) {
  const pts = r.points; if (pts.length < 2) return;
  let total = 0; const lens: number[] = [];
  for (let i = 0; i < pts.length - 1; i++) { const l = Math.hypot(pts[i + 1]![0] - pts[i]![0], pts[i + 1]![1] - pts[i]![1]); lens.push(l); total += l; }
  const keepOff = 9, y = ROAD_Y + 0.005;
  const strip = (s0: number, s1: number, offset: number, w: number) => {
    // A strip from s0 to s1 along the line, `offset` metres to its right.
    let s = 0;
    for (let i = 0; i < pts.length - 1; i++) {
      const a = pts[i]!, b = pts[i + 1]!, l = lens[i]!; const t0 = Math.max(s0, s), t1 = Math.min(s1, s + l);
      if (t1 > t0 && l > 0) {
        const dx = (b[0] - a[0]) / l, dz = (b[1] - a[1]) / l, rx = -dz, rz = dx;
        const p0: P = [a[0] + dx * (t0 - s) + rx * offset, a[1] + dz * (t0 - s) + rz * offset], p1: P = [a[0] + dx * (t1 - s) + rx * offset, a[1] + dz * (t1 - s) + rz * offset];
        const base = m.count;
        m.vertex(p0[0] - rx * w, y, p0[1] - rz * w, 0, 1, 0, 0, 0); m.vertex(p1[0] - rx * w, y, p1[1] - rz * w, 0, 1, 0, 0, 0);
        m.vertex(p1[0] + rx * w, y, p1[1] + rz * w, 0, 1, 0, 0, 0); m.vertex(p0[0] + rx * w, y, p0[1] + rz * w, 0, 1, 0, 0, 0);
        m.quad(base, base + 3, base + 2, base + 1);
      }
      s += l;
    }
  };
  if (!r.oneway) for (let s = keepOff; s < total - keepOff; s += 9) strip(s, Math.min(s + 4.5, total - keepOff), 0, 0.075);
  if (r.width >= 9) { strip(keepOff, total - keepOff, r.width / 2 - 0.5, 0.07); strip(keepOff, total - keepOff, -(r.width / 2 - 0.5), 0.07); }
}

function addViaduct(deck: Mesher, piers: Mesher, r: Road) {
  const pts = r.points, half = r.width / 2 + 0.6, top = 8.5, bottom = 7.3;
  let along = 0;
  for (let i = 0; i < pts.length - 1; i++) {
    const a = pts[i]!, b = pts[i + 1]!, l = Math.hypot(b[0] - a[0], b[1] - a[1]); if (l < 0.01) continue;
    const dx = (b[0] - a[0]) / l, dz = (b[1] - a[1]) / l, rx = -dz, rz = dx;
    const corners = (y: number) => [[a[0] - rx * half, y, a[1] - rz * half], [b[0] - rx * half, y, b[1] - rz * half], [b[0] + rx * half, y, b[1] + rz * half], [a[0] + rx * half, y, a[1] + rz * half]] as [number, number, number][];
    const t = corners(top), u = corners(bottom), base = deck.count;
    for (const [x, y, z] of t) deck.vertex(x, y, z, 0, 1, 0, x, z);
    for (const [x, y, z] of u) deck.vertex(x, y, z, 0, -1, 0, x, z);
    deck.quad(base, base + 3, base + 2, base + 1); deck.quad(base + 4, base + 5, base + 6, base + 7);
    deck.quad(base, base + 1, base + 5, base + 4); deck.quad(base + 3, base + 7, base + 6, base + 2);
    for (let s = Math.ceil(along / 28) * 28; s < along + l; s += 28) {
      const k = s - along, px = a[0] + dx * k, pz = a[1] + dz * k;
      addBox(piers, px, bottom / 2, pz, 1.4, bottom, Math.max(2.5, half * 1.2), dx, dz);
    }
    along += l;
  }
}
function addBox(m: Mesher, x: number, y: number, z: number, w: number, h: number, d: number, dx: number, dz: number) {
  const g = new THREE.BoxGeometry(w, h, d); g.rotateY(Math.atan2(-dz, dx)); g.translate(x, y, z);
  const p = g.attributes.position!, n = g.attributes.normal!, uv = g.attributes.uv!, idx = g.index!, base = m.count;
  for (let i = 0; i < p.count; i++) m.vertex(p.getX(i), p.getY(i), p.getZ(i), n.getX(i), n.getY(i), n.getZ(i), uv.getX(i) * 3, uv.getY(i) * 3);
  for (let i = 0; i < idx.count; i++) m.index.push(base + idx.getX(i));
  g.dispose();
}

function waterMaterial(): THREE.MeshPhysicalMaterial {
  // Ripple normals: a few octaves of value noise baked into a tiling canvas.
  const size = 512, canvas = document.createElement('canvas'); canvas.width = canvas.height = size;
  const g = canvas.getContext('2d')!, img = g.createImageData(size, size), height = new Float32Array(size * size);
  const rnd = (x: number, y: number, s: number) => { const n = Math.sin(x * 127.1 + y * 311.7 + s * 74.7) * 43758.5453; return n - Math.floor(n); };
  for (let o = 0; o < 5; o++) {
    const cells = 4 << o, amp = 1 / (o + 1.5);
    for (let y = 0; y < size; y++) for (let x = 0; x < size; x++) {
      const fx = (x / size) * cells, fy = (y / size) * cells, ix = Math.floor(fx), iy = Math.floor(fy), tx = fx - ix, ty = fy - iy;
      const c = (i: number, j: number) => rnd(((ix + i) % cells + cells) % cells, ((iy + j) % cells + cells) % cells, o);
      const sx = tx * tx * (3 - 2 * tx), sy = ty * ty * (3 - 2 * ty);
      height[y * size + x]! += amp * ((c(0, 0) * (1 - sx) + c(1, 0) * sx) * (1 - sy) + (c(0, 1) * (1 - sx) + c(1, 1) * sx) * sy);
    }
  }
  for (let y = 0; y < size; y++) for (let x = 0; x < size; x++) {
    const h = (i: number, j: number) => height[((y + j + size) % size) * size + ((x + i + size) % size)]!;
    const nx = (h(-1, 0) - h(1, 0)) * 6, ny = (h(0, -1) - h(0, 1)) * 6, l = Math.hypot(nx, ny, 1), k = (y * size + x) * 4;
    img.data[k] = (nx / l * 0.5 + 0.5) * 255; img.data[k + 1] = (ny / l * 0.5 + 0.5) * 255; img.data[k + 2] = (1 / l * 0.5 + 0.5) * 255; img.data[k + 3] = 255;
  }
  g.putImageData(img, 0, 0);
  const normalMap = new THREE.CanvasTexture(canvas); normalMap.wrapS = normalMap.wrapT = THREE.RepeatWrapping; normalMap.repeat.set(900, 900); normalMap.colorSpace = THREE.NoColorSpace;
  return new THREE.MeshPhysicalMaterial({ color: '#28443f', roughness: 0.08, metalness: 0, normalMap, normalScale: new THREE.Vector2(0.35, 0.35), clearcoat: 1, clearcoatRoughness: 0.05, envMapIntensity: 1.1 });
}

export type { Polygon };
