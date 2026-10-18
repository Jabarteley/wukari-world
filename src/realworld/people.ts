import * as THREE from 'three';
import { createKit } from '../scene/kit.ts';
import { buildCanonicalCrowd } from '../scene/body/canonical-crowd.ts';
import type { CanonicalCrowdPerson } from '../scene/body/canonical-crowd.ts';
import type { Road } from './types.ts';

/**
 * Pedestrians: the game's own characters (the canonical crowd: real bodies in baked poses, instanced by look and pose) on the
 * pavements of every ordinary road, both sides, walking along the road or standing. 24 seeded looks. The bodies are drawn in the
 * game's units; `metres` scales them to a 1.7 m adult.
 */
export interface People { group: THREE.Group; count: number; ready: Promise<void>; update(camera: THREE.Camera): void }

/** People are baked per 200 m cell, and a cell is drawn only within VISIBLE metres of the camera (the haze hides the rest). */
const CELL = 200, VISIBLE = 320;

const SIDEWALK: Record<string, number> = { trunk: 2.5, primary: 3, primary_link: 2, secondary: 3, secondary_link: 2, tertiary: 2.5, residential: 2, unclassified: 2, living_street: 1.5, service: 1 };
const rand = (seed: number) => () => { seed = (seed * 16807) % 2147483647; return (seed - 1) / 2147483646; };

export function buildPeople(roads: Road[], blocked: (x: number, z: number) => boolean, onMaterial: (m: THREE.Material) => void, limit = 1400): People {
  const kit = createKit(), r = rand(91), people: CanonicalCrowdPerson[] = [];
  const outer = new THREE.Group();
  for (const road of roads) {
    const walk = SIDEWALK[road.class]; if (!walk || road.bridge || road.points.length < 2) continue;
    const spacing = road.major ? 9 : 16;
    for (let i = 0; i < road.points.length - 1; i++) {
      const a = road.points[i]!, b = road.points[i + 1]!, l = Math.hypot(b[0] - a[0], b[1] - a[1]); if (l < 2) continue;
      const dx = (b[0] - a[0]) / l, dz = (b[1] - a[1]) / l;
      for (let d = r() * spacing; d < l; d += spacing * (0.5 + r())) {
        const side = r() < 0.5 ? 1 : -1, off = road.width / 2 + walk * (0.25 + r() * 0.5);
        const x = a[0] + dx * d - dz * side * off, z = a[1] + dz * d + dx * side * off; if (blocked(x, z)) continue;
        const walking = r() < 0.72, heading = Math.atan2(dx, dz) + (r() < 0.5 ? 0 : Math.PI);
        people.push({ id: `p${people.length}`, look: {}, seed: `lagos-${Math.floor(r() * 24)}`, x, y: 0.15, z, ry: heading, pose: walking ? 'walk' : 'stand', stride: Math.floor(r() * 4) / 4, scale: 0.71 * (0.94 + r() * 0.12) });
      }
    }
  }
  people.sort(() => r() - 0.5);
  const chosen = people.slice(0, limit);
  const cells = new Map<string, CanonicalCrowdPerson[]>();
  for (const p of chosen) { const k = `${Math.floor(p.x! / CELL)},${Math.floor(p.z! / CELL)}`; cells.set(k, [...(cells.get(k) ?? []), p]); }
  const chunks = [...cells.entries()].map(([k, list]) => {
    const [cx, cz] = k.split(',').map(Number);
    const crowd = buildCanonicalCrowd(kit, list, { detail: 'lod' }); outer.add(crowd.group);
    return { crowd, centre: new THREE.Vector3((cx! + 0.5) * CELL, 0, (cz! + 0.5) * CELL) };
  });
  const ready = Promise.all(chunks.map(async ({ crowd }) => {
    for (let i = 0; i < 1200 && crowd.group.userData.characterStatus !== 'ready'; i++) await new Promise((res) => setTimeout(res, 250));
    crowd.group.traverse((o) => { const mesh = o as THREE.Mesh; if (mesh.isMesh) { mesh.castShadow = true; mesh.receiveShadow = true; for (const m of Array.isArray(mesh.material) ? mesh.material : [mesh.material]) onMaterial(m); } });
  })).then(() => undefined);
  const flat = new THREE.Vector3();
  return {
    group: outer, count: chosen.length, ready,
    update(camera) { flat.set(camera.position.x, 0, camera.position.z); for (const c of chunks) c.crowd.group.visible = c.centre.distanceTo(flat) < VISIBLE + CELL * 0.71; },
  };
}
