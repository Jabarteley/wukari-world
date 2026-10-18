import * as THREE from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import type { Road } from './types.ts';

/**
 * Lagos traffic, procedural: yellow danfo minibuses with black bands, saloon cars and SUVs, and kekes (tricycles). Each body is its side
 * profile extruded across its width with bevelled edges, glass as a separate darker shell, four wheels. Parked along kerbs of ordinary
 * roads, and moving along the main roads in their lanes (driving on the right), following the road's polyline.
 */
export interface Traffic { group: THREE.Group; update(dt: number): void; parked: number; moving: number }

type Kind = 'saloon' | 'suv' | 'danfo' | 'keke';
const SPEC: Record<Kind, { length: number; width: number; profile: [number, number][]; glass: [number, number][]; wheel: number; colours: string[] }> = {
  saloon: { length: 4.7, width: 1.8, wheel: 0.33,
    profile: [[0, 0.32], [0, 0.72], [0.95, 0.82], [1.55, 1.38], [3.15, 1.4], [3.85, 0.88], [4.7, 0.8], [4.7, 0.32]],
    glass: [[1.62, 0.86], [2.0, 1.33], [3.08, 1.35], [3.7, 0.88]], colours: ['#c9ccd0', '#1c1d20', '#8a8f96', '#e8e8e6', '#5a1f22', '#203a5c', '#b8a68a'] },
  suv: { length: 4.8, width: 1.95, wheel: 0.38,
    profile: [[0, 0.38], [0, 0.9], [0.8, 1.02], [1.25, 1.75], [4.3, 1.78], [4.75, 1.1], [4.8, 0.38]],
    glass: [[1.32, 1.06], [1.62, 1.68], [4.2, 1.7], [4.55, 1.1]], colours: ['#1c1d20', '#e8e8e6', '#7c8188', '#3b3f45', '#6b5a45'] },
  danfo: { length: 4.9, width: 1.85, wheel: 0.36,
    profile: [[0, 0.36], [0, 1.0], [0.25, 1.95], [4.75, 2.0], [4.9, 1.4], [4.9, 0.36]],
    glass: [[0.3, 1.25], [0.45, 1.85], [4.6, 1.88], [4.75, 1.3]], colours: ['#f2b705', '#e9ad05', '#f5bd12'] },
  keke: { length: 2.7, width: 1.3, wheel: 0.24,
    profile: [[0, 0.3], [0, 0.9], [0.5, 1.75], [2.3, 1.78], [2.7, 1.2], [2.7, 0.3]],
    glass: [[0.15, 1.0], [0.55, 1.6], [0.7, 1.6], [0.45, 1.0]], colours: ['#f2b705', '#2d7a3a', '#e9ad05'] },
};

function extrude(points: [number, number][], width: number, bevel: number): THREE.BufferGeometry {
  const shape = new THREE.Shape(points.map(([x, y]) => new THREE.Vector2(x, y)));
  const g = new THREE.ExtrudeGeometry(shape, { depth: width - bevel * 2, bevelEnabled: true, bevelSize: bevel, bevelThickness: bevel, bevelSegments: 2, curveSegments: 4 });
  g.translate(0, 0, -(width - bevel * 2) / 2);
  return g;
}

function vehicle(kind: Kind) {
  const s = SPEC[kind];
  const body = extrude(s.profile, s.width, 0.08);
  const glass = extrude(s.glass, s.width + 0.02, 0.04);
  const wheels: THREE.BufferGeometry[] = [];
  const axles = kind === 'keke' ? [0.35, 2.25] : [0.85, s.length - 0.9];
  for (const x of axles) for (const z of kind === 'keke' && x < 1 ? [0] : [-s.width / 2 + 0.12, s.width / 2 - 0.12]) {
    wheels.push(new THREE.CylinderGeometry(s.wheel, s.wheel, 0.22, 12).rotateX(Math.PI / 2).translate(x, s.wheel, z));
  }
  const centre = (g: THREE.BufferGeometry) => g.translate(-s.length / 2, 0, 0);
  const stripes = kind === 'danfo' ? [extrude([[0.02, 1.1], [4.88, 1.1], [4.88, 1.22], [0.02, 1.22]], s.width + 0.2, 0.01), extrude([[0.02, 0.6], [4.88, 0.6], [4.88, 0.72], [0.02, 0.72]], s.width + 0.2, 0.01)] : [];
  return { body: centre(body), glass: centre(glass), wheels: centre(mergeGeometries(wheels.map((w) => w.toNonIndexed()))!), stripes: stripes.length ? centre(mergeGeometries(stripes.map((g) => g.toNonIndexed()))!) : null };
}

const rand = (seed: number) => () => { seed = (seed * 16807) % 2147483647; return (seed - 1) / 2147483646; };

export function buildTraffic(roads: Road[], blocked: (x: number, z: number) => boolean): Traffic {
  const group = new THREE.Group(), r = rand(42);
  const paint = new THREE.MeshPhysicalMaterial({ roughness: 0.32, metalness: 0.45, clearcoat: 1, clearcoatRoughness: 0.12 });
  const glassM = new THREE.MeshPhysicalMaterial({ color: '#16202a', roughness: 0.05, metalness: 0.2, clearcoat: 1 });
  const tyre = new THREE.MeshStandardMaterial({ color: '#141414', roughness: 0.9 });
  const black = new THREE.MeshStandardMaterial({ color: '#111111', roughness: 0.6 });
  // Slots: parked on ordinary roads at the kerb; moving on main roads in lane.
  type Slot = { kind: Kind; x: number; z: number; yaw: number; road?: Road; s?: number; speed?: number; lane?: number; dir?: number };
  const slots: Slot[] = [];
  const pick = (): Kind => { const v = r(); return v < 0.32 ? 'danfo' : v < 0.62 ? 'saloon' : v < 0.85 ? 'suv' : 'keke'; };
  for (const road of roads) {
    if (road.bridge || road.points.length < 2 || /footway|pedestrian|path|steps/.test(road.class)) continue;
    const pts = road.points, lens = pts.slice(1).map((p, i) => Math.hypot(p[0] - pts[i]![0], p[1] - pts[i]![1])), total = lens.reduce((a, b) => a + b, 0);
    const at = (d: number) => { for (let i = 0; i < lens.length; i++) { if (d <= lens[i]! || i === lens.length - 1) { const t = Math.min(1, d / (lens[i]! || 1)), a = pts[i]!, b = pts[i + 1]!; return { x: a[0] + (b[0] - a[0]) * t, z: a[1] + (b[1] - a[1]) * t, dx: (b[0] - a[0]) / (lens[i]! || 1), dz: (b[1] - a[1]) / (lens[i]! || 1) }; } d -= lens[i]!; } return null; };
    if (road.major || /primary|secondary|trunk|motorway/.test(road.class)) {
      for (let d = 10 + r() * 30; d < total - 10; d += 35 + r() * 50) {
        const dir = road.oneway ? 1 : r() < 0.5 ? 1 : -1, lane = road.oneway ? (r() - 0.5) * road.width * 0.5 : dir * road.width * 0.25;
        slots.push({ kind: pick(), x: 0, z: 0, yaw: 0, road, s: d, speed: 6 + r() * 7, lane, dir });
      }
    } else if (road.width >= 5) {
      for (let d = 6 + r() * 10; d < total - 6; d += 7 + r() * 22) {
        if (r() < 0.45) continue;
        const p = at(d)!, side = r() < 0.5 ? 1 : -1, off = road.width / 2 - 1.1;
        const x = p.x - p.dz * side * off, z = p.z + p.dx * side * off; if (blocked(x, z)) continue;
        slots.push({ kind: pick(), x, z, yaw: Math.atan2(-p.dz, p.dx) + (r() < 0.5 ? 0 : Math.PI) });
      }
    }
  }
  const kinds: Kind[] = ['saloon', 'suv', 'danfo', 'keke'];
  const meshes = new Map<Kind, { body: THREE.InstancedMesh; glass: THREE.InstancedMesh; wheels: THREE.InstancedMesh; stripes: THREE.InstancedMesh | null; slots: Slot[] }>();
  const colour = new THREE.Color();
  for (const kind of kinds) {
    const mine = slots.filter((s) => s.kind === kind); if (!mine.length) continue;
    const g = vehicle(kind);
    const entry = { body: new THREE.InstancedMesh(g.body, paint, mine.length), glass: new THREE.InstancedMesh(g.glass, glassM, mine.length), wheels: new THREE.InstancedMesh(g.wheels, tyre, mine.length), stripes: g.stripes ? new THREE.InstancedMesh(g.stripes, black, mine.length) : null, slots: mine };
    mine.forEach((_, i) => { const options = SPEC[kind].colours; colour.set(options[Math.floor(r() * options.length)]!); entry.body.setColorAt(i, colour); });
    for (const m of [entry.body, entry.glass, entry.wheels, entry.stripes]) if (m) { m.castShadow = true; m.receiveShadow = true; m.frustumCulled = false; group.add(m); }
    meshes.set(kind, entry);
  }
  const m4 = new THREE.Matrix4(), q = new THREE.Quaternion(), up = new THREE.Vector3(0, 1, 0), pos = new THREE.Vector3(), one = new THREE.Vector3(1, 1, 1);
  const place = () => {
    for (const entry of meshes.values()) {
      entry.slots.forEach((s, i) => {
        if (s.road) {
          const pts = s.road.points; let d = s.s!, k = 0;
          for (; k < pts.length - 1; k++) { const l = Math.hypot(pts[k + 1]![0] - pts[k]![0], pts[k + 1]![1] - pts[k]![1]); if (d <= l) break; d -= l; }
          k = Math.min(k, pts.length - 2); const a = pts[k]!, b = pts[k + 1]!, l = Math.hypot(b[0] - a[0], b[1] - a[1]) || 1, dx = (b[0] - a[0]) / l, dz = (b[1] - a[1]) / l;
          s.x = a[0] + dx * Math.min(d, l) - dz * s.lane!; s.z = a[1] + dz * Math.min(d, l) + dx * s.lane!; s.yaw = Math.atan2(-dz, dx) + (s.dir! < 0 ? Math.PI : 0);
        }
        q.setFromAxisAngle(up, s.yaw); pos.set(s.x, 0.02, s.z); m4.compose(pos, q, one);
        entry.body.setMatrixAt(i, m4); entry.glass.setMatrixAt(i, m4); entry.wheels.setMatrixAt(i, m4); entry.stripes?.setMatrixAt(i, m4);
      });
      for (const m of [entry.body, entry.glass, entry.wheels, entry.stripes]) if (m) m.instanceMatrix.needsUpdate = true;
    }
  };
  place();
  const moving = slots.filter((s) => s.road);
  return {
    group, parked: slots.length - moving.length, moving: moving.length,
    update(dt) {
      for (const s of moving) { const total = s.road!.points.slice(1).reduce((n, p, i) => n + Math.hypot(p[0] - s.road!.points[i]![0], p[1] - s.road!.points[i]![1]), 0); s.s = ((s.s! + s.dir! * s.speed! * dt) % total + total) % total; }
      place();
    },
  };
}
