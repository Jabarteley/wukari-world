import * as THREE from 'three';
import type { Building, P, World } from './types.ts';
import { Mesher, open, signedArea } from './geometry.ts';

/**
 * Street dressing from the data: a painted signboard with the real name on the facade of every mapped business (Overture places,
 * matched to their building), concrete utility poles every ~32 m along ordinary roads with sagging power cables between them, and
 * lamp heads on the main roads (lit at night).
 */
export interface Dressing { group: THREE.Group; signs: number; poles: number; setNight(night: number): void }

const STYLES: Record<string, [string, string][]> = {
  bank: [['#0c3d7a', '#ffffff'], ['#f2f2f2', '#0c3d7a'], ['#7a0c18', '#ffffff']],
  church: [['#f5f5f0', '#1b3f8f'], ['#f5f5f0', '#9b1020'], ['#1b3f8f', '#ffffff']],
  mosque: [['#0f5a2a', '#ffffff']],
  shop: [['#d42020', '#ffffff'], ['#f3c018', '#1a1a1a'], ['#ffffff', '#c41414'], ['#1f6fbf', '#ffffff'], ['#1a1a1a', '#f3c018'], ['#0f7a3a', '#ffffff']],
  eatery: [['#c8161d', '#ffd200'], ['#ffd200', '#c8161d'], ['#ffffff', '#c8161d']],
  salon: [['#d63384', '#ffffff'], ['#5b2a86', '#ffffff'], ['#ffffff', '#d63384']],
  clinic: [['#ffffff', '#0f7a3a'], ['#ffffff', '#c41414']],
  school: [['#ffffff', '#1b3f8f'], ['#1b3f8f', '#ffffff']],
  office: [['#ffffff', '#183a66'], ['#e9ecef', '#212529'], ['#183a66', '#ffffff']],
  other: [['#ffffff', '#222222'], ['#2c3e50', '#ffffff'], ['#f3c018', '#1a1a1a']],
};
const hash = (text: string) => { let h = 2166136261; for (let i = 0; i < text.length; i++) { h ^= text.charCodeAt(i); h = Math.imul(h, 16777619); } return (h >>> 0) / 4294967295; };

/** Paints up to 256 boards (512 x 128 each) on one 4096² canvas. */
function signAtlas(boards: { name: string; kind: string; seed: number }[]) {
  const W = 4096, cw = 512, ch = 128, cols = W / cw, canvas = document.createElement('canvas'); canvas.width = canvas.height = W;
  const g = canvas.getContext('2d')!;
  boards.forEach((b, i) => {
    const x = (i % cols) * cw, y = Math.floor(i / cols) * ch, styles = STYLES[b.kind] ?? STYLES.other!, [bg, ink] = styles[Math.floor(b.seed * 997) % styles.length]!;
    g.fillStyle = bg; g.fillRect(x, y, cw, ch);
    g.strokeStyle = ink; g.lineWidth = 5; g.strokeRect(x + 6, y + 6, cw - 12, ch - 12);
    const text = b.name.toUpperCase().slice(0, 34);
    let size = 64; g.font = `800 ${size}px "Arial Narrow", Arial, sans-serif`;
    while (g.measureText(text).width > cw - 40 && size > 22) { size -= 2; g.font = `800 ${size}px "Arial Narrow", Arial, sans-serif`; }
    g.fillStyle = ink; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText(text, x + cw / 2, y + ch / 2 + 3);
    // Weathering: a faint dirty gradient at the bottom.
    const grad = g.createLinearGradient(0, y + ch * 0.6, 0, y + ch); grad.addColorStop(0, 'rgba(60,50,40,0)'); grad.addColorStop(1, 'rgba(60,50,40,0.18)');
    g.fillStyle = grad; g.fillRect(x, y, cw, ch);
  });
  const texture = new THREE.CanvasTexture(canvas); texture.colorSpace = THREE.SRGBColorSpace; texture.anisotropy = 8;
  return { texture, uv: (i: number) => { const x = (i % cols) * cw, y = Math.floor(i / cols) * ch; return [x / W, 1 - (y + ch) / W, (x + cw) / W, 1 - y / W] as const; } };
}

export function buildDressing(world: World): Dressing {
  const group = new THREE.Group();
  const byId = new Map<string, Building>(world.buildings.map((b) => [b.id, b]));
  // Signs: on the wall edge of the place's building nearest to its point, facing out, above the shopfront line.
  const placed: { name: string; kind: string; seed: number; a: P; b: P; n: P; y: number; h: number }[] = [];
  for (const place of world.places) {
    const b = byId.get(place.building ?? ''); if (!b) continue;
    let ring = open(b.ring); if (ring.length < 3) continue; if (signedArea(ring) < 0) ring = [...ring].reverse();
    let best = Infinity, edge: [P, P] | null = null;
    for (let i = 0; i < ring.length; i++) {
      const p = ring[i]!, q = ring[(i + 1) % ring.length]!, dx = q[0] - p[0], dz = q[1] - p[1], len2 = dx * dx + dz * dz; if (len2 < 4) continue;
      const t = Math.max(0, Math.min(1, ((place.x - p[0]) * dx + (place.z - p[1]) * dz) / len2)), d = Math.hypot(p[0] + dx * t - place.x, p[1] + dz * t - place.z);
      if (d < best) { best = d; edge = [p, q]; }
    }
    if (!edge) continue;
    const [p, q] = edge, len = Math.hypot(q[0] - p[0], q[1] - p[1]), dir: P = [(q[0] - p[0]) / len, (q[1] - p[1]) / len], n: P = [dir[1], -dir[0]];
    const seed = hash(place.id), width = Math.min(len * 0.85, 2.6 + seed * 3.2), h = width / 4, mid = Math.max(width / 2, Math.min(len - width / 2, ((place.x - p[0]) * dir[0] + (place.z - p[1]) * dir[1])));
    const c: P = [p[0] + dir[0] * mid + n[0] * 0.09, p[1] + dir[1] * mid + n[1] * 0.09];
    placed.push({ name: place.name, kind: place.kind, seed, a: [c[0] - dir[0] * width / 2, c[1] - dir[1] * width / 2], b: [c[0] + dir[0] * width / 2, c[1] + dir[1] * width / 2], n, y: Math.min(b.height - h - 0.4, 2.95 + seed * 0.5), h });
  }
  const signMaterials: THREE.MeshStandardMaterial[] = [];
  for (let start = 0; start < placed.length; start += 256) {
    const chunk = placed.slice(start, start + 256), atlas = signAtlas(chunk), m = new Mesher();
    chunk.forEach((s, i) => {
      const [u0, v0, u1, v1] = atlas.uv(i), base = m.count;
      // Seen from outside, a is the board's right end: the text runs from b to a.
      m.vertex(s.a[0], s.y, s.a[1], s.n[0], 0, s.n[1], u1, v0); m.vertex(s.b[0], s.y, s.b[1], s.n[0], 0, s.n[1], u0, v0);
      m.vertex(s.b[0], s.y + s.h, s.b[1], s.n[0], 0, s.n[1], u0, v1); m.vertex(s.a[0], s.y + s.h, s.a[1], s.n[0], 0, s.n[1], u1, v1);
      m.quad(base, base + 3, base + 2, base + 1);
    });
    const material = new THREE.MeshStandardMaterial({ map: atlas.texture, roughness: 0.55, emissiveMap: atlas.texture, emissive: '#000000' });
    signMaterials.push(material);
    const mesh = new THREE.Mesh(m.build(), material); mesh.castShadow = true; mesh.receiveShadow = true; group.add(mesh);
  }

  // Poles and cables: a spatial grid of footprints keeps poles out of buildings.
  const cell = 20, grid = new Map<string, P[][]>();
  for (const b of world.buildings) { const ring = open(b.ring), xs = ring.map((p) => p[0]), zs = ring.map((p) => p[1]);
    for (let gx = Math.floor(Math.min(...xs) / cell); gx <= Math.floor(Math.max(...xs) / cell); gx++) for (let gz = Math.floor(Math.min(...zs) / cell); gz <= Math.floor(Math.max(...zs) / cell); gz++) { const k = `${gx},${gz}`; grid.set(k, [...(grid.get(k) ?? []), ring]); } }
  const inBuilding = (x: number, z: number) => (grid.get(`${Math.floor(x / cell)},${Math.floor(z / cell)}`) ?? []).some((ring) => { let c = false; for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) { const [xi, zi] = ring[i]!, [xj, zj] = ring[j]!; if ((zi > z) !== (zj > z) && x < ((xj - xi) * (z - zi)) / (zj - zi) + xi) c = !c; } return c; });
  const poles = new Mesher(), lamps = new Mesher(), cables: number[] = [], pools: [number, number][] = [];
  const pole = new THREE.CylinderGeometry(0.1, 0.16, 9, 6).translate(0, 4.5, 0), arm = new THREE.BoxGeometry(1.8, 0.12, 0.12).translate(0, 8.6, 0);
  const lampArm = new THREE.BoxGeometry(1.6, 0.08, 0.08).translate(-0.8, 8.0, 0), lampHead = new THREE.BoxGeometry(0.6, 0.12, 0.28).translate(-1.55, 7.95, 0);
  const put = (m: Mesher, g: THREE.BufferGeometry, x: number, z: number, yaw: number) => { const c = g.clone().rotateY(yaw).translate(x, 0, z); const p = c.attributes.position!, n = c.attributes.normal!, uv = c.attributes.uv!, idx = c.index!, base = m.count;
    for (let i = 0; i < p.count; i++) m.vertex(p.getX(i), p.getY(i), p.getZ(i), n.getX(i), n.getY(i), n.getZ(i), uv.getX(i), uv.getY(i));
    for (let i = 0; i < idx.count; i++) m.index.push(base + idx.getX(i)); c.dispose(); };
  let count = 0;
  for (const r of world.roads) {
    if (r.bridge || /motorway|trunk|footway|pedestrian|path|steps/.test(r.class) || r.points.length < 2) continue;
    const side = hash(r.id) < 0.5 ? 1 : -1, off = r.width / 2 + 0.6, spacing = 32;
    let along = 0, next = 6 + hash(r.id + 'p') * 20, prev: [number, number, number] | null = null;
    for (let i = 0; i < r.points.length - 1; i++) {
      const a = r.points[i]!, b = r.points[i + 1]!, l = Math.hypot(b[0] - a[0], b[1] - a[1]); if (l < 0.01) continue;
      const dx = (b[0] - a[0]) / l, dz = (b[1] - a[1]) / l, rx = -dz * side, rz = dx * side;
      while (next <= along + l) {
        const t = next - along, x = a[0] + dx * t + rx * off, z = a[1] + dz * t + rz * off; next += spacing;
        if (inBuilding(x, z)) { prev = null; continue; }
        const yaw = Math.atan2(-dz, dx) + (side > 0 ? Math.PI / 2 : -Math.PI / 2);
        put(poles, pole, x, z, yaw); put(poles, arm, x, z, Math.atan2(-dz, dx) + Math.PI / 2);
        if (r.major) { put(poles, lampArm, x, z, yaw); put(lamps, lampHead, x, z, yaw); const hx = x + Math.cos(yaw) * -1.55, hz = z - Math.sin(yaw) * -1.55; pools.push([hx, hz]); }
        // Three cables from the cross arm to the previous pole's, sagging 0.6 m in the middle.
        if (prev) for (const k of [-0.8, 0, 0.8]) {
          const ax = prev[0] + dz * k * 0 + -dz * k, az = prev[1] + dx * k, bx = x - dz * k, bz = z + dx * k;
          for (let s = 0; s < 8; s++) { const t0 = s / 8, t1 = (s + 1) / 8, sag = (t: number) => 8.62 - 0.6 * 4 * t * (1 - t);
            cables.push(ax + (bx - ax) * t0, sag(t0), az + (bz - az) * t0, ax + (bx - ax) * t1, sag(t1), az + (bz - az) * t1); }
        }
        prev = [x, z, 0]; count++;
      }
      along += l;
    }
  }
  const poleMesh = new THREE.Mesh(poles.build(), new THREE.MeshStandardMaterial({ color: '#8f8a80', roughness: 0.9 })); poleMesh.castShadow = poleMesh.receiveShadow = true; group.add(poleMesh);
  const lampMaterial = new THREE.MeshStandardMaterial({ color: '#3a3d40', emissive: '#000000', roughness: 0.5 });
  group.add(new THREE.Mesh(lamps.build(), lampMaterial));
  const cableGeometry = new THREE.BufferGeometry(); cableGeometry.setAttribute('position', new THREE.Float32BufferAttribute(cables, 3));
  group.add(new THREE.LineSegments(cableGeometry, new THREE.LineBasicMaterial({ color: '#1d1d1d' })));
  // Pools of lamp light on the ground: additive discs with a soft falloff, shown at night.
  const pool = document.createElement('canvas'); pool.width = pool.height = 128; const pg = pool.getContext('2d')!, grad = pg.createRadialGradient(64, 64, 0, 64, 64, 64);
  grad.addColorStop(0, 'rgba(255,214,150,1)'); grad.addColorStop(0.35, 'rgba(255,190,120,0.45)'); grad.addColorStop(1, 'rgba(255,170,90,0)'); pg.fillStyle = grad; pg.fillRect(0, 0, 128, 128);
  const poolMaterial = new THREE.MeshBasicMaterial({ map: new THREE.CanvasTexture(pool), transparent: true, blending: THREE.AdditiveBlending, depthWrite: false, opacity: 0, polygonOffset: true, polygonOffsetFactor: -8, fog: true });
  const poolMesh = new THREE.InstancedMesh(new THREE.PlaneGeometry(16, 16).rotateX(-Math.PI / 2), poolMaterial, Math.max(1, pools.length));
  pools.forEach(([x, z], i) => poolMesh.setMatrixAt(i, new THREE.Matrix4().makeTranslation(x, 0.2, z))); poolMesh.count = pools.length; poolMesh.computeBoundingSphere(); poolMesh.frustumCulled = false; poolMesh.renderOrder = 2;
  group.add(poolMesh);
  return {
    group, signs: placed.length, poles: count,
    setNight(night) { for (const m of signMaterials) m.emissive.setScalar(night * 0.25); lampMaterial.emissive.set('#ffd9a0').multiplyScalar(night * 6); poolMaterial.opacity = night * 0.38; poolMesh.visible = night > 0.01; },
  };
}
