/**
 * OWNER: scenes
 * Pools of lamplight on the ground: one soft additive disc under each of a scene's lamps, all merged into a single mesh (one draw
 * call, no light). On a device that draws real point lights they add the glow on the ground and the lit air; on the low tier,
 * where the scene's point lights are off, they are the lamps. set() reads the scene's lighting: they show at dusk and by night
 * and are gone by day. No frame loop: it is called when the lighting changes.
 */
import type * as THREE from 'three';
import type { Lighting, PoolLamp, ThreeModule } from './types.ts';

const SIZE = 32;
const FLOOR = 0.045;

let falloff: THREE.DataTexture | null = null;
/** The soft round falloff every pool shares (made once; 4 KB). */
function falloffTexture(THREE: ThreeModule): THREE.DataTexture {
  if (falloff) return falloff;
  const data = new Uint8Array(SIZE * SIZE * 4);
  for (let y = 0; y < SIZE; y += 1) for (let x = 0; x < SIZE; x += 1) {
    const d = Math.min(1, Math.hypot((x + 0.5) / SIZE - 0.5, (y + 0.5) / SIZE - 0.5) * 2), edge = 1 - d * d * (3 - 2 * d), v = Math.round(255 * edge * edge);
    data.set([v, v, v, 255], (y * SIZE + x) * 4);
  }
  falloff = new THREE.DataTexture(data, SIZE, SIZE, THREE.RGBAFormat);
  falloff.colorSpace = THREE.NoColorSpace; falloff.magFilter = THREE.LinearFilter; falloff.minFilter = THREE.LinearFilter; falloff.generateMipmaps = false;
  falloff.needsUpdate = true;
  return falloff;
}

/** → { mesh, set(lighting), dispose() } for a list of lamps; null when there are none. */
export function createPools(THREE: ThreeModule, lamps: readonly PoolLamp[]) {
  if (!lamps.length) return null;
  const positions: number[] = [], colours: number[] = [], uvs: number[] = [], index: number[] = [];
  lamps.forEach((lamp, i) => {
    const r = Math.min(7, Math.max(1.6, lamp.distance * 0.42)), x = lamp.position.x, z = lamp.position.z, base = i * 4;
    for (const [dx, dz, u, v] of [[-1, -1, 0, 0], [1, -1, 1, 0], [1, 1, 1, 1], [-1, 1, 0, 1]] as const) {
      positions.push(x + dx * r, (lamp.floor ?? 0) + FLOOR, z + dz * r); uvs.push(u, v); colours.push(lamp.color.r, lamp.color.g, lamp.color.b);
    }
    index.push(base, base + 2, base + 1, base, base + 3, base + 2);
  });
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  geometry.setAttribute('normal', new THREE.Float32BufferAttribute(positions.map((_, i) => (i % 3 === 1 ? 1 : 0)), 3));
  geometry.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
  geometry.setAttribute('color', new THREE.Float32BufferAttribute(colours, 3));
  geometry.setIndex(index);
  const material = new THREE.MeshBasicMaterial({ map: falloffTexture(THREE), vertexColors: true, transparent: true, opacity: 0, blending: THREE.AdditiveBlending, depthWrite: false, toneMapped: true });
  const mesh = Object.assign(new THREE.Mesh(geometry, material), { dispose() { material.dispose(); } });
  mesh.name = 'lamp-pools'; mesh.renderOrder = 2; mesh.visible = false; mesh.castShadow = false; mesh.receiveShadow = false; mesh.frustumCulled = false;
  return {
    mesh,
    /** True when what is shown changed. */
    set(light: Pick<Lighting, 'night' | 'lamps'>, scale = 1): boolean {
      const strength = Math.min(0.7, Math.max(0, ((light.night ?? 0) - 0.12) * 0.62) * Math.min(1.4, light.lamps / 0.9)) * scale;
      const was = mesh.visible && material.opacity;
      material.opacity = strength; mesh.visible = strength > 0.01;
      return (mesh.visible && material.opacity) !== was;
    },
    dispose() { mesh.parent?.remove(mesh); geometry.dispose(); material.dispose(); },
  };
}
