import type * as THREE from 'three';
import type { Kit } from '../kit.ts';
import type { ModelPart } from '../models/scene-models.ts';
import type { SceneRecipeV1, ValidatedRecipe } from './contract.ts';
import type { PreparedCityAssets } from './prepare.ts';
import { requireRecipe } from './pack.ts';

const ATTRIBUTE = 'recipeSurface';
const KEY = ':recipe-surface-v1';
export type SurfaceRole = 0 | 1 | 2;

/** The physical wall uses cell8 exclusively; establish exported V orientation from that known part. */
export function atlasRowsFlipped(wall: ModelPart): boolean {
  requireRecipe(wall.uv && wall.uv.length > 0, 'missing wall UV reference');
  const matches = [false, true].filter(flip => {
    for (let i = 0; i < wall.uv!.length; i += 2) if (atlasCell(wall.uv![i]!, wall.uv![i + 1]!, flip) !== 8) return false;
    return true;
  });
  requireRecipe(matches.length === 1, 'ambiguous physical atlas orientation');
  return matches[0]!;
}
export function atlasCell(u: number, v: number, flipped: boolean): number {
  const y = flipped ? 1 - v : v;
  if (![u, y].every(Number.isFinite) || u <= 0 || u >= 1 || y <= 0 || y >= 1) return -1;
  return Math.floor(u * 4) + Math.floor(y * 4) * 4;
}

/** Unknown props, heroes, caps, UV seams and shared vertices touching excluded triangles stay untreated. */
export function kitSurfaceMask(part: ModelPart, prop: string | null, flipped: boolean): Float32Array {
  const mask = new Float32Array(part.position.length / 3), excluded = new Uint8Array(mask.length);
  const wanted = prop === 'kiosk' ? 5 : prop === 'wall' || prop === 'gate' ? 8 : -1;
  if (wanted < 0 || !part.uv) return mask;
  for (let at = 0; at < part.index.length; at += 3) {
    const ids = [part.index[at]!, part.index[at + 1]!, part.index[at + 2]!];
    const [a, b, c] = ids.map(i => [part.position[i * 3]!, part.position[i * 3 + 1]!, part.position[i * 3 + 2]!] as const);
    const ux = b![0] - a![0], uy = b![1] - a![1], uz = b![2] - a![2];
    const vx = c![0] - a![0], vy = c![1] - a![1], vz = c![2] - a![2];
    const nx = uy * vz - uz * vy, ny = uz * vx - ux * vz, nz = ux * vy - uy * vx;
    const length = Math.hypot(nx, ny, nz);
    const eligible = length > 0 && Math.abs(ny) / length < 0.15 && ids.every(i => atlasCell(part.uv![2 * i]!, part.uv![2 * i + 1]!, flipped) === wanted);
    for (const i of ids) { if (eligible) mask[i] = 2; else excluded[i] = 1; }
  }
  for (let i = 0; i < mask.length; i++) if (excluded[i]) mask[i] = 0;
  // Propagate exclusions through shared vertices so every rendered triangle has one constant role.
  const touching: number[][] = Array.from({ length: mask.length }, () => []);
  for (let at = 0; at < part.index.length; at += 3) for (let k = 0; k < 3; k++) touching[part.index[at + k]!]!.push(at);
  const queue: number[] = [];
  for (let i = 0; i < mask.length; i++) if (!mask[i]) queue.push(i);
  for (let head = 0; head < queue.length; head++) for (const at of touching[queue[head]!]!) {
    for (let k = 0; k < 3; k++) {
      const i = part.index[at + k]!;
      if (mask[i]) { mask[i] = 0; queue.push(i); }
    }
  }
  return mask;
}

const VERTEX = `attribute float recipeSurface;
varying float vRecipeSurface;
varying vec3 vRecipePoint;`;
const FRAGMENT = `uniform float uRecipePhase;
uniform float uRecipeStrength;
varying float vRecipeSurface;
varying vec3 vRecipePoint;
float recipeBand(float value, float centre, float width) {
  float aa = max(fwidth(value), 0.003);
  return 1.0 - smoothstep(width, width + aa, abs(value - centre));
}`;
const PAINT = `
  if (vRecipeSurface > 0.001) {
    float resolved = 1.0 - smoothstep(0.5, 2.0, max(fwidth(vRecipePoint.x), max(fwidth(vRecipePoint.y), fwidth(vRecipePoint.z))));
    float broad = resolved * sin(vRecipePoint.x * 0.63 + uRecipePhase) * sin(vRecipePoint.z * 0.51 + vRecipePoint.y * 0.74);
    float groundTone = 0.975 + 0.025 * broad;
    float base = 1.0 - smoothstep(0.08, 0.72, vRecipePoint.y);
    float band = recipeBand(vRecipePoint.y, 1.12, 0.035);
    float wallTone = 0.985 + 0.015 * broad - 0.09 * base - 0.025 * band;
    float tone = mix(groundTone, wallTone, step(1.5, vRecipeSurface));
    diffuseColor.rgb *= mix(1.0, tone, uRecipeStrength * min(vRecipeSurface, 1.0));
  }`;

/** Owns only new layer materials and fallback clones; cached materials, textures and source arrays remain untouched. */
export function recipeSurfaceOwner(kit: Kit, recipe: SceneRecipeV1) {
  const decorated = new Set<THREE.Material>();
  const undo: (() => void)[] = [];
  let disposed = false, phase = 0;
  for (const char of `${recipe.city}:${recipe.venue}`) phase = (Math.imul(phase, 31) + char.charCodeAt(0)) >>> 0;
  const uniforms = { uRecipePhase: { value: (phase % 6283) / 1000 }, uRecipeStrength: { value: 0.65 } };
  function decorate(material: THREE.Material) {
    requireRecipe(!disposed, 'surface owner disposed');
    if (decorated.has(material)) return;
    requireRecipe(material.type === 'MeshStandardMaterial' || material.type === 'MeshLambertMaterial', 'unsupported recipe surface material');
    const prior = material.onBeforeCompile, priorKey = material.customProgramCacheKey();
    material.onBeforeCompile = (shader, renderer) => {
      prior.call(material, shader, renderer);
      requireRecipe(shader.vertexShader.includes('#include <project_vertex>') && shader.fragmentShader.includes('#include <map_fragment>'), 'recipe shader anchors changed');
      Object.assign(shader.uniforms, uniforms);
      shader.vertexShader = `${VERTEX}\n${shader.vertexShader}`.replace('#include <project_vertex>', `#include <project_vertex>
        vec4 recipePoint = vec4(transformed, 1.0);
        #ifdef USE_INSTANCING
          recipePoint = instanceMatrix * recipePoint;
        #endif
        vRecipePoint = (modelMatrix * recipePoint).xyz;
        vRecipeSurface = recipeSurface;`);
      shader.fragmentShader = `${FRAGMENT}\n${shader.fragmentShader}`.replace('#include <map_fragment>', `#include <map_fragment>\n${PAINT}`);
    };
    material.customProgramCacheKey = () => priorKey + KEY;
    material.needsUpdate = true;
    decorated.add(material);
  }
  function attribute(geometry: THREE.BufferGeometry, mask: Float32Array) {
    requireRecipe(!geometry.hasAttribute(ATTRIBUTE), 'surface mask already owned');
    geometry.setAttribute(ATTRIBUTE, new kit.THREE.BufferAttribute(mask, 1));
    undo.push(() => geometry.deleteAttribute(ATTRIBUTE));
  }
  function fallback(objects: readonly THREE.Object3D[]) {
    const meshes = objects.filter((o): o is THREE.Mesh => (o as THREE.Mesh).isMesh === true);
    requireRecipe(meshes.length === 1 && meshes[0]!.name === 'solid', 'recipe fallback topology changed');
    const mesh = meshes[0]!, geometry = mesh.geometry;
    const position = geometry.getAttribute('position'), normal = geometry.getAttribute('normal');
    const boxes = [{ position: [0, -0.1, 0], size: [recipe.footprint.w, 0.2, recipe.footprint.d], ry: 0 }, ...recipe.shell];
    requireRecipe(position.count === boxes.length * 24 && geometry.index?.count === boxes.length * 36, 'recipe fallback box layout changed');
    const mask = new Float32Array(position.count);
    boxes.forEach((box, boxIndex) => {
      const c = Math.cos(box.ry), s = Math.sin(box.ry);
      for (let k = 0; k < 24; k++) {
        const i = boxIndex * 24 + k, dx = position.getX(i) - box.position[0]!, dz = position.getZ(i) - box.position[2]!;
        const local = [dx * c - dz * s, position.getY(i) - box.position[1]!, dx * s + dz * c];
        requireRecipe(local.every((v, axis) => Math.abs(Math.abs(v) - box.size[axis]! / 2) < 0.0001), 'recipe fallback primitive order changed');
        mask[i] = boxIndex === 0 ? (normal.getY(i) > 0.99 ? 1 : 0) : (Math.abs(normal.getY(i)) < 0.15 ? 2 : 0);
      }
    });
    requireRecipe(!Array.isArray(mesh.material), 'recipe fallback material array unsupported');
    const original = mesh.material, clone = original.clone();
    // clone() copies userData but not shader callbacks. Re-adopt to reinstall the current ghost uniforms.
    delete clone.userData.jawGhost;
    kit.adopt(clone);
    try { decorate(clone); attribute(geometry, mask); } catch (error) { clone.dispose(); throw error; }
    mesh.material = clone;
    undo.push(() => { mesh.material = original; clone.dispose(); });
  }
  function merged(group: THREE.Group, value: ValidatedRecipe, prepared: PreparedCityAssets) {
    const reference = prepared.kit.models.get('wall');
    requireRecipe(reference?.parts.length === 1, 'missing physical wall reference');
    const flipped = atlasRowsFlipped(reference.parts[0]!);
    const groups = new Map<string, { part: ModelPart; p: ValidatedRecipe['placements'][number]; mask: Float32Array }[]>();
    for (const p of value.placements) {
      const asset = p.source === 'kit' ? prepared.kit : prepared.hero;
      const model = asset?.models.get(p.node); requireRecipe(model, 'surface placement missing');
      for (const part of model.parts) {
        const key = `model:${part.atlas || 'plain'}:near`, list = groups.get(key) ?? [];
        list.push({ part, p, mask: kitSurfaceMask(part, p.source === 'kit' ? p.node : null, flipped) }); groups.set(key, list);
      }
    }
    requireRecipe(group.children.length === groups.size, 'recipe merge group layout changed');
    for (const [name, parts] of groups) {
      const mesh = group.getObjectByName(name) as THREE.Mesh | undefined;
      requireRecipe(mesh?.isMesh && !(mesh as THREE.InstancedMesh).isInstancedMesh, 'recipe requires prepared merge geometry');
      const geometry = mesh.geometry, position = geometry.getAttribute('position'), uv = geometry.getAttribute('uv');
      const mask = new Float32Array(parts.reduce((n, v) => n + v.mask.length, 0));
      requireRecipe(position.count === mask.length, 'recipe merge vertex layout changed');
      let offset = 0, indexOffset = 0;
      for (const { part, p, mask: partMask } of parts) {
        const c = Math.cos(p.ry), s = Math.sin(p.ry);
        for (let i = 0; i < partMask.length; i++) {
          const x = part.position[i * 3]!, y = part.position[i * 3 + 1]!, z = part.position[i * 3 + 2]!;
          requireRecipe(position.getX(offset + i) === Math.fround((x * c + z * s) * p.scale + p.x) && position.getY(offset + i) === Math.fround(y * p.scale) && position.getZ(offset + i) === Math.fround((-x * s + z * c) * p.scale + p.z), 'recipe merge position order changed');
          requireRecipe(!part.uv || (uv.getX(offset + i) === part.uv[i * 2] && uv.getY(offset + i) === part.uv[i * 2 + 1]), 'recipe merge UV order changed');
        }
        for (let i = 0; i < part.index.length; i++) requireRecipe(geometry.index?.getX(indexOffset + i) === part.index[i]! + offset, 'recipe merge index order changed');
        mask.set(partMask, offset); offset += partMask.length; indexOffset += part.index.length;
      }
      requireRecipe(geometry.index?.count === indexOffset, 'recipe merge index count changed');
      attribute(geometry, mask);
    }
  }
  return { decorate, fallback, merged, dispose() {
    if (disposed) return; disposed = true;
    for (const release of undo.reverse()) release(); undo.length = 0; decorated.clear();
  } };
}
