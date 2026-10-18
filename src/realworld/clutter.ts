import * as THREE from 'three';
import type { Building, P } from './types.ts';
import { open, signedArea } from './geometry.ts';

/**
 * Rooftop and wall clutter of a Lagos block: plastic water tanks (black, blue) on steel stands, stair houses on taller flat roofs,
 * satellite dishes, and split air-conditioner units hung beside windows. All instanced; positions are seeded per building so they
 * stay put. Flat roofs only (buildings over 9.5 m, as buildings.ts draws them).
 */
export interface Clutter { group: THREE.Group; counts: Record<string, number> }

const hash = (text: string) => { let h = 2166136261; for (let i = 0; i < text.length; i++) { h ^= text.charCodeAt(i); h = Math.imul(h, 16777619); } return h >>> 0; };
const rand = (seed: number) => () => { seed = (Math.imul(seed, 16807) % 2147483647 + 2147483647) % 2147483647 || 1; return (seed - 1) / 2147483646; };

function inside(ring: P[], x: number, z: number): boolean { let c = false; for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) { const [xi, zi] = ring[i]!, [xj, zj] = ring[j]!; if ((zi > z) !== (zj > z) && x < ((xj - xi) * (z - zi)) / (zj - zi) + xi) c = !c; } return c; }
function edgeDistance(ring: P[], x: number, z: number): number {
  let best = Infinity;
  for (let i = 0; i < ring.length; i++) { const [ax, az] = ring[i]!, [bx, bz] = ring[(i + 1) % ring.length]!, dx = bx - ax, dz = bz - az, l2 = dx * dx + dz * dz || 1, t = Math.max(0, Math.min(1, ((x - ax) * dx + (z - az) * dz) / l2)); best = Math.min(best, Math.hypot(ax + dx * t - x, az + dz * t - z)); }
  return best;
}

export function buildClutter(buildings: Building[]): Clutter {
  type Item = { m: THREE.Matrix4; c?: THREE.Color };
  const items: Record<'tank' | 'stand' | 'stair' | 'dish' | 'ac', Item[]> = { tank: [], stand: [], stair: [], dish: [], ac: [] };
  const q = new THREE.Quaternion(), up = new THREE.Vector3(0, 1, 0);
  const at = (x: number, y: number, z: number, yaw: number, sx = 1, sy = 1, sz = 1) => new THREE.Matrix4().compose(new THREE.Vector3(x, y, z), q.setFromAxisAngle(up, yaw).clone(), new THREE.Vector3(sx, sy, sz));
  for (const b of buildings) {
    let ring = open(b.ring); if (ring.length < 3 || Math.abs(signedArea(ring)) < 30) continue;
    if (signedArea(ring) < 0) ring = [...ring].reverse();
    const r = rand(hash(b.id)), flat = b.height > 9.5;
    const xs = ring.map((p) => p[0]), zs = ring.map((p) => p[1]), x0 = Math.min(...xs), x1 = Math.max(...xs), z0 = Math.min(...zs), z1 = Math.max(...zs);
    const spot = (margin: number) => { for (let k = 0; k < 20; k++) { const x = x0 + r() * (x1 - x0), z = z0 + r() * (z1 - z0); if (inside(ring, x, z) && edgeDistance(ring, x, z) > margin) return [x, z] as P; } return null; };
    if (flat) {
      const roof = b.height;
      const tanks = 1 + Math.floor(r() * (b.height > 20 ? 4 : 2.5));
      for (let k = 0; k < tanks; k++) {
        const p = spot(1.2); if (!p) break;
        const big = r() < 0.4, s = big ? 1.25 : 1, raised = r() < 0.6 ? 1.6 : 0;
        if (raised) items.stand.push({ m: at(p[0], roof, p[1], r() * 6, s, raised, s) });
        items.tank.push({ m: at(p[0], roof + raised, p[1], r() * 6, s, s, s), c: new THREE.Color(r() < 0.65 ? '#1b1c1e' : r() < 0.6 ? '#2a5fa8' : '#d7d2c4') });
      }
      if (b.height > 13 && r() < 0.7) { const p = spot(2.5); if (p) items.stair.push({ m: at(p[0], roof, p[1], r() * Math.PI, 2.6 + r(), 2.6, 3 + r() * 1.5) }); }
      if (r() < 0.35) { const p = spot(1); if (p) items.dish.push({ m: at(p[0], roof + 0.9, p[1], r() * 6, 1, 1, 1) }); }
    }
    // Split AC units: a few per wall edge long enough, under a window line, on upper floors.
    const floors = Math.max(1, Math.floor(b.height / 3.2));
    for (let i = 0; i < ring.length; i++) {
      const a = ring[i]!, c = ring[(i + 1) % ring.length]!, len = Math.hypot(c[0] - a[0], c[1] - a[1]); if (len < 6) continue;
      const dx = (c[0] - a[0]) / len, dz = (c[1] - a[1]) / len, nx = dz, nz = -dx, yaw = Math.atan2(-nz, nx) + Math.PI / 2;
      const units = Math.floor(len / 9 * r() * 1.4);
      for (let k = 0; k < units; k++) {
        const s = 1 + r() * (len - 2), f = 1 + Math.floor(r() * Math.max(1, floors - 1)), y = f * 3.2 + 0.4;
        if (y > b.height - 1) continue;
        items.ac.push({ m: at(a[0] + dx * s + nx * 0.2, y, a[1] + dz * s + nz * 0.2, yaw) });
      }
    }
  }
  const geoms = {
    tank: new THREE.CylinderGeometry(0.55, 0.55, 1.15, 14).translate(0, 0.575, 0),
    stand: new THREE.BoxGeometry(1.2, 1, 1.2).translate(0, 0.5, 0),
    stair: new THREE.BoxGeometry(1, 1, 1).translate(0, 0.5, 0),
    dish: new THREE.CircleGeometry(0.45, 14).rotateX(-0.6),
    ac: new THREE.BoxGeometry(0.8, 0.55, 0.3),
  };
  const mats = {
    tank: new THREE.MeshStandardMaterial({ roughness: 0.55 }),
    stand: new THREE.MeshStandardMaterial({ color: '#5b5f63', roughness: 0.6, metalness: 0.6, wireframe: false }),
    stair: new THREE.MeshStandardMaterial({ color: '#c9c2b4', roughness: 0.95 }),
    dish: new THREE.MeshStandardMaterial({ color: '#e5e5e2', roughness: 0.4, side: THREE.DoubleSide }),
    ac: new THREE.MeshStandardMaterial({ color: '#dcdcd6', roughness: 0.5 }),
  };
  const group = new THREE.Group(), counts: Record<string, number> = {};
  for (const key of Object.keys(items) as (keyof typeof items)[]) {
    const list = items[key]; counts[key] = list.length; if (!list.length) continue;
    const mesh = new THREE.InstancedMesh(geoms[key], mats[key], list.length);
    list.forEach((it, i) => { mesh.setMatrixAt(i, it.m); if (it.c) mesh.setColorAt(i, it.c); });
    mesh.castShadow = mesh.receiveShadow = true; mesh.computeBoundingSphere(); group.add(mesh);
  }
  return { group, counts };
}
