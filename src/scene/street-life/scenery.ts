/**
 * OWNER: scenes
 * Street life, the street's scenery drawn (zoom phase 3b): shopfronts on the street's own buildings (shopfronts.ts) and street furniture
 * (furniture.ts), as FOUR InstancedMeshes (parts.ts): boxes, glass and lamp heads lit from inside at dusk, atlas cells (signs, mannequins,
 * the flag) and canopies. The signs, mannequins and flag are painted once on one canvas (no download). Fetched only on a device that
 * passed street life's gate, after the scene's first frame, and only by a street scene (never part of the first download or of the
 * shared scene chunk). Static: nothing here asks for frames.
 */
import type * as THREE from 'three';
import type { Kit } from '../kit.ts';
import { ATLAS_SIZE, FLAG_CELL, FIRST_MANNEQUIN, MANNEQUIN_CELLS, atlasRect, atlasUv, joinParts, partCalls, partTriangles } from './parts.ts';
import type { BoxPart, Parts } from './parts.ts';
import { SHOP_NAMES, SIGN_COLOURS, planShopfronts, shopParts } from './shopfronts.ts';
import type { Bay, Frontage } from './shopfronts.ts';
export { frontagesOf, planShopfronts } from './shopfronts.ts';
import { flagFor, furnitureParts, planFurniture, planters } from './furniture.ts';
import type { FlagSpec, FurnitureInput, FurnitureItem } from './furniture.ts';

export type SceneryTime = 'day' | 'dusk' | 'night';
/** How brightly the windows and lamp heads glow, and the signs, by the time of day. */
export const GLASS_GLOW: Readonly<Record<SceneryTime, number>> = Object.freeze({ day: 0.12, dusk: 0.85, night: 1.3 });
export const SIGN_GLOW: Readonly<Record<SceneryTime, number>> = Object.freeze({ day: 0, dusk: 0.45, night: 0.8 });

export interface SceneryPlan { bays: Bay[]; items: FurnitureItem[]; parts: Parts }
/** The whole street's scenery as parts: the shop bays on the frontages, their planters, the furniture along the kerb line. */
export function planScenery(frontages: readonly Frontage[], furniture: Omit<FurnitureInput, 'seed'>, seed: string): SceneryPlan {
  const bays = planShopfronts(frontages, seed);
  const items = [...planFurniture({ ...furniture, seed }), ...planters(bays)];
  return { bays, items, parts: joinParts(shopParts(bays, furniture.base), furnitureParts(items, furniture.crossings, furniture.road, seed, furniture.base)) };
}

export interface SceneryOptions {
  parent: THREE.Object3D
  frontages: readonly Frontage[]
  furniture: Omit<FurnitureInput, 'seed'>
  seed: string
  /** The city's country id (the flag). */
  country: string | null
  time: SceneryTime
}
export interface StreetScenery {
  readonly group: THREE.Group
  setTime(time: SceneryTime): void
  readonly bays: number
  readonly items: number
  readonly triangles: number
  readonly drawCalls: number
  dispose(): void
}

// ---- the atlas ---------------------------------------------------------------------------------------------------------------------

/** Four shop-window figures: a dress, a suit, a long coat, a child's outfit (white display forms on the cell's clear ground). */
function paintMannequin(g: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, pose: number): void {
  g.save(); g.translate(x + w / 2, y);
  const s = h / 256;
  g.fillStyle = '#f2efe8';
  g.beginPath(); g.arc(0, 26 * s, 13 * s, 0, Math.PI * 2); g.fill();                                // the head
  g.fillRect(-4 * s, 38 * s, 8 * s, 8 * s);                                                          // the neck
  const cloth = ['#a33a4a', '#2b3a5a', '#8a6a4a', '#2e8a7a'][pose % 4]!;
  g.fillStyle = cloth;
  if (pose % 4 === 0) { g.beginPath(); g.moveTo(-20 * s, 46 * s); g.lineTo(20 * s, 46 * s); g.lineTo(34 * s, 168 * s); g.lineTo(-34 * s, 168 * s); g.closePath(); g.fill(); }
  else if (pose % 4 === 2) { g.beginPath(); g.moveTo(-24 * s, 46 * s); g.lineTo(24 * s, 46 * s); g.lineTo(28 * s, 190 * s); g.lineTo(-28 * s, 190 * s); g.closePath(); g.fill(); }
  else { g.fillRect(-22 * s, 46 * s, 44 * s, 80 * s); g.fillRect(-20 * s, 126 * s, 18 * s, 92 * s); g.fillRect(2 * s, 126 * s, 18 * s, 92 * s); }
  g.fillStyle = '#f2efe8';
  g.fillRect(-30 * s, 50 * s, 8 * s, 66 * s); g.fillRect(22 * s, 50 * s, 8 * s, 66 * s);              // the arms
  if (pose % 4 === 0 || pose % 4 === 2) { g.fillRect(-12 * s, 168 * s, 7 * s, 54 * s); g.fillRect(5 * s, 168 * s, 7 * s, 54 * s); }
  g.fillStyle = '#5a5f66'; g.fillRect(-3 * s, 222 * s, 6 * s, 26 * s); g.fillRect(-26 * s, 246 * s, 52 * s, 6 * s);   // the stand
  g.restore();
}
function paintFlag(g: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, flag: FlagSpec): void {
  const n = flag.bands.length;
  flag.bands.forEach((colour, i) => {
    g.fillStyle = colour;
    if (flag.vertical) g.fillRect(x + (w * i) / n, y, Math.ceil(w / n), h); else g.fillRect(x, y + (h * i) / n, w, Math.ceil(h / n));
  });
  if (flag.disc) { g.fillStyle = flag.disc; g.beginPath(); g.arc(x + w / 2, y + h / 2, h * 0.3, 0, Math.PI * 2); g.fill(); }
}
function paintAtlas(kit: Kit, country: string | null): THREE.CanvasTexture | null {
  const canvas = globalThis.document?.createElement?.('canvas');
  const g = canvas?.getContext?.('2d');
  if (!canvas || !g) return null;
  canvas.width = canvas.height = ATLAS_SIZE;
  g.clearRect(0, 0, ATLAS_SIZE, ATLAS_SIZE);
  SHOP_NAMES.forEach((shop, i) => {
    const r = atlasRect(i), [ground, ink] = SIGN_COLOURS[i % SIGN_COLOURS.length]!;
    g.fillStyle = ground; g.fillRect(r.x, r.y, r.w, r.h);
    g.fillStyle = ink; g.fillRect(r.x + 6, r.y + 6, r.w - 12, 2); g.fillRect(r.x + 6, r.y + r.h - 8, r.w - 12, 2);
    g.font = `bold ${Math.round(r.h * 0.52)}px Georgia, 'Times New Roman', serif`; g.textAlign = 'center'; g.textBaseline = 'middle';
    g.fillText(shop.name, r.x + r.w / 2, r.y + r.h / 2 + 2, r.w - 40);
  });
  for (let m = 0; m < MANNEQUIN_CELLS; m++) { const r = atlasRect(FIRST_MANNEQUIN + m); paintMannequin(g, r.x, r.y, r.w, r.h, m); }
  const f = atlasRect(FLAG_CELL);
  paintFlag(g, f.x, f.y, f.w, f.h, flagFor(country));
  const texture = new kit.THREE.CanvasTexture(canvas);
  texture.colorSpace = kit.THREE.SRGBColorSpace;
  texture.anisotropy = 4;
  return texture;
}

// ---- the meshes --------------------------------------------------------------------------------------------------------------------

const QUAD_PARS = /* glsl */`
attribute vec4 aCell;
attribute float aLit;
varying float vLit;
`;
const QUAD_UV = /* glsl */`
#include <uv_vertex>
#ifdef USE_MAP
vMapUv = uv * aCell.zw + aCell.xy;
#endif
vLit = aLit;
`;

export function createStreetScenery(kit: Kit, options: SceneryOptions): StreetScenery {
  const { THREE } = kit;
  const group = new THREE.Group();
  group.name = 'street-scenery';
  options.parent.add(group);
  const plan = planScenery(options.frontages, options.furniture, options.seed), parts = plan.parts;
  const glow = { value: GLASS_GLOW[options.time] }, signGlow = { value: SIGN_GLOW[options.time] };
  const owned: { geometry: THREE.BufferGeometry; material: THREE.Material; mesh: THREE.InstancedMesh }[] = [];
  const matrix = new THREE.Matrix4(), position = new THREE.Vector3(), scale = new THREE.Vector3(), turn = new THREE.Quaternion(), euler = new THREE.Euler(0, 0, 0, 'YXZ'), colour = new THREE.Color();

  const instanced = (name: string, geometry: THREE.BufferGeometry, material: THREE.Material, count: number, place: (i: number) => void): THREE.InstancedMesh => {
    const mesh = new THREE.InstancedMesh(geometry, material, count);
    mesh.name = name;
    mesh.castShadow = false; mesh.receiveShadow = false;
    for (let i = 0; i < count; i++) { place(i); mesh.setMatrixAt(i, matrix); }
    mesh.instanceMatrix.needsUpdate = true;
    if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
    group.add(mesh);
    owned.push({ geometry, material, mesh });
    return mesh;
  };
  const boxMatrix = (b: BoxPart): void => {
    position.set(b.x, b.y, b.z); scale.set(b.w, b.h, b.d);
    matrix.compose(position, turn.setFromEuler(euler.set(b.tilt ?? 0, b.ry, 0, 'YXZ')), scale);
  };

  if (parts.boxes.length) {
    const mesh = instanced('street-scenery-boxes', new THREE.BoxGeometry(1, 1, 1), new THREE.MeshLambertMaterial({ color: '#ffffff' }), parts.boxes.length, (i) => boxMatrix(parts.boxes[i]!));
    parts.boxes.forEach((b, i) => mesh.setColorAt(i, colour.set(b.colour)));
    mesh.instanceColor!.needsUpdate = true;
  }
  if (parts.glows.length) {
    const material = new THREE.MeshLambertMaterial({ color: '#5a5f66' });
    material.onBeforeCompile = (shader) => {
      shader.uniforms.uGlow = glow;
      shader.fragmentShader = shader.fragmentShader
        .replace('#include <common>', '#include <common>\nuniform float uGlow;')
        .replace('#include <emissivemap_fragment>', '#include <emissivemap_fragment>\n#ifdef USE_COLOR\ntotalEmissiveRadiance += vColor.rgb * uGlow;\n#endif');
    };
    material.customProgramCacheKey = () => 'street-scenery-glow-1';
    const mesh = instanced('street-scenery-glow', new THREE.BoxGeometry(1, 1, 1), material, parts.glows.length, (i) => boxMatrix(parts.glows[i]!));
    parts.glows.forEach((b, i) => mesh.setColorAt(i, colour.set(b.colour)));
    mesh.instanceColor!.needsUpdate = true;
  }
  if (parts.quads.length) {
    const geometry = new THREE.PlaneGeometry(1, 1);
    const cells = new Float32Array(parts.quads.length * 4), lit = new Float32Array(parts.quads.length);
    parts.quads.forEach((q, i) => { cells.set(atlasUv(q.cell), i * 4); lit[i] = q.lit ? 1 : 0; });
    geometry.setAttribute('aCell', new THREE.InstancedBufferAttribute(cells, 4));
    geometry.setAttribute('aLit', new THREE.InstancedBufferAttribute(lit, 1));
    const map = paintAtlas(kit, options.country);
    const material = new THREE.MeshLambertMaterial({ color: '#ffffff', map, alphaTest: 0.5, side: THREE.DoubleSide });
    material.onBeforeCompile = (shader) => {
      shader.uniforms.uSignGlow = signGlow;
      shader.vertexShader = shader.vertexShader.replace('#include <common>', `#include <common>\n${QUAD_PARS}`).replace('#include <uv_vertex>', QUAD_UV);
      shader.fragmentShader = shader.fragmentShader
        .replace('#include <common>', '#include <common>\nuniform float uSignGlow;\nvarying float vLit;')
        .replace('#include <emissivemap_fragment>', '#include <emissivemap_fragment>\ntotalEmissiveRadiance += diffuseColor.rgb * uSignGlow * vLit;');
    };
    material.customProgramCacheKey = () => 'street-scenery-atlas-1';
    instanced('street-scenery-atlas', geometry, material, parts.quads.length, (i) => {
      const q = parts.quads[i]!;
      matrix.compose(position.set(q.x, q.y, q.z), turn.setFromEuler(euler.set(0, q.ry, 0, 'YXZ')), scale.set(q.w, q.h, 1));
    });
  }
  if (parts.blobs.length) {
    const mesh = instanced('street-scenery-canopies', new THREE.IcosahedronGeometry(1, 0), new THREE.MeshLambertMaterial({ color: '#ffffff', flatShading: true }), parts.blobs.length, (i) => {
      const b = parts.blobs[i]!;
      matrix.compose(position.set(b.x, b.y, b.z), turn.identity(), scale.set(b.r, b.r * 0.85, b.r));
    });
    parts.blobs.forEach((b, i) => mesh.setColorAt(i, colour.set(b.colour)));
    mesh.instanceColor!.needsUpdate = true;
  }

  const triangles = partTriangles(parts), drawCalls = partCalls(parts);
  let disposed = false;
  return {
    group,
    get bays() { return plan.bays.length; },
    get items() { return plan.items.length; },
    get triangles() { return disposed ? 0 : triangles; },
    get drawCalls() { return disposed ? 0 : drawCalls; },
    setTime(time) { glow.value = GLASS_GLOW[time] ?? GLASS_GLOW.day; signGlow.value = SIGN_GLOW[time] ?? 0; },
    dispose() {
      if (disposed) return;
      disposed = true;
      for (const { geometry, material, mesh } of owned) {
        geometry.dispose();
        (material as THREE.MeshLambertMaterial).map?.dispose();
        material.dispose();
        mesh.dispose();
      }
      group.parent?.remove(group);
    },
  };
}
