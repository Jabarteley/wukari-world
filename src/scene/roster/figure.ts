/**
 * A roster character as a drawable figure (the skinned body's other source: src/scene/body/skinned.ts wears one of these where it would
 * wear the base body). Reached only through the body chunk, so this module, the glTF loader and the meshopt decoder are the lazy part.
 *
 *   loadRosterFigure(kit, pick, lod) → RosterFigure
 *     one SkinnedMesh on the game's 23-bone skeleton (the clip pack drives it), one material, from <id>-hero.glb (about 13,000
 *     triangles, shape keys for jaw, mouth and brows, a painted-eye overlay that blinks and looks) or <id>-crowd.glb (about 3,000).
 *
 * WHAT IS SHARED. A model file is fetched and parsed once a session; every figure of that character is a clone of its scene (the
 * geometry and the first outfit's texture are shared, the skeleton and the material are the figure's own). One texture per outfit,
 * fetched when an outfit is first worn. The skin tone step is two uniforms in the material, so a step costs no texture.
 *
 * COLOUR. The outfit is a texture swap on the same UVs. The skin step recolours only the texels a one-channel mask marks as skin,
 * by dividing by the texture's own reference skin and multiplying by the step's tone (in display space), so shading, stubble,
 * lips and lashes stay and only the base colour moves.
 */
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { MeshoptDecoder } from 'three/examples/jsm/libs/meshopt_decoder.module.js';
import { clone } from 'three/examples/jsm/utils/SkeletonUtils.js';
import type * as THREE from 'three';
import type { Kit } from '../kit.ts';
import { rosterAsset, rosterMeta } from './files.ts';
import { SKIN_HEX } from './map.ts';
import type { RosterPick } from './map.ts';

export type RosterLod = 'hero' | 'crowd';
type Rgb = [number, number, number];
/** What the pipeline measured of one model file (the `.json` beside it). */
export interface RosterMeta {
  height: number;
  skeleton: 'male' | 'female';
  mask: string;
  eyes?: { eyeL: [number, number]; eyeR: [number, number]; a: number; b: number; skin: Rgb; iris: Rgb };
  refs: { skin: Rgb; skin2?: Rgb | null };
}

export interface RosterFigure {
  readonly pick: RosterPick;
  readonly lod: RosterLod;
  readonly sex: 'male' | 'female';
  /** Standing height in the model's own units (metres). */
  readonly height: number;
  readonly triangles: number;
  /** The figure's scene (armature and mesh): add it to an object. */
  readonly scene: THREE.Group;
  readonly mesh: THREE.SkinnedMesh;
  /** Wear an outfit (0 is the one it is made in) and a skin tone step (0 is the tone it is made in). Resolves once the texture is in. */
  dress(outfit: number, skin: number): Promise<void>;
  /** The painted eyes: blink 0 (open) to 1 (shut), gaze -1 to 1 either way. No effect on a crowd figure. */
  eyes(blink: number, gazeX: number, gazeY: number): void;
  /** Set shape keys by name (smile, frown, browUpL, blinkL, visemeAA ...). Names the model does not have are ignored. */
  shape(weights: Readonly<Record<string, number>>): void;
  readonly hasShapes: boolean;
  dispose(): void;
}

let loader: GLTFLoader | null = null;
/** The one glTF loader of the body chunk (the base body and the roster share it). */
export function gltfLoader(): GLTFLoader {
  if (!loader) loader = new GLTFLoader().setMeshoptDecoder(MeshoptDecoder);
  return loader;
}

interface Model { gltf: { scene: THREE.Group }; meta: RosterMeta; mask: THREE.Texture }
const models = new Map<string, Promise<Model>>();
const outfits = new Map<string, Promise<THREE.Texture>>();

/** Whether a character's model for a level of detail is in this build. */
export const rosterShipped = (id: string, lod: RosterLod): boolean => rosterAsset(`${id}-${lod}.glb`) !== null && rosterMeta(`${id}-${lod}`) !== null;

function fetchMask(T: Kit['THREE'], url: string): Promise<THREE.Texture> {
  return fetch(url).then((response) => { if (!response.ok) throw new Error(`mask ${response.status}`); return response.blob(); })
    .then((blob) => createImageBitmap(blob, { imageOrientation: 'none', premultiplyAlpha: 'none', colorSpaceConversion: 'none' }))
    .then((bitmap) => {
      const texture = new T.Texture(bitmap);
      texture.flipY = false; texture.colorSpace = T.NoColorSpace; texture.format = T.RGBAFormat;
      texture.generateMipmaps = false; texture.minFilter = T.LinearFilter; texture.magFilter = T.LinearFilter; texture.needsUpdate = true;
      return texture;
    });
}
function loadModel(kit: Kit, id: string, lod: RosterLod): Promise<Model> {
  const key = `${id}-${lod}`;
  let found = models.get(key);
  if (!found) {
    const file = rosterAsset(`${key}.glb`), meta = rosterMeta(key), mask = meta ? rosterAsset(meta.mask) : null;
    if (!file || !meta || !mask) return Promise.reject(new Error(`roster model ${key} is not shipped`));
    found = MeshoptDecoder.ready.then(() => Promise.all([gltfLoader().loadAsync(file), fetchMask(kit.THREE, mask)]))
      .then(([gltf, texture]): Model => ({ gltf, meta, mask: texture }));
    // A failed fetch can be tried again.
    found.catch(() => { models.delete(key); });
    models.set(key, found);
  }
  return found;
}
function loadOutfit(kit: Kit, id: string, lod: RosterLod, outfit: number): Promise<THREE.Texture> {
  const key = `${id}-${lod}-o${outfit}.jpg`;
  let found = outfits.get(key);
  if (!found) {
    const file = rosterAsset(key);
    if (!file) return Promise.reject(new Error(`roster outfit ${key} is not shipped`));
    found = new kit.THREE.TextureLoader().loadAsync(file).then((texture) => {
      texture.flipY = false; texture.colorSpace = kit.THREE.SRGBColorSpace; texture.anisotropy = 4;
      return texture;
    });
    found.catch(() => { outfits.delete(key); });
    outfits.set(key, found);
  }
  return found;
}

// The colour layer: the skin step through the mask, and the painted eyes over the baked ones while they move.
const VERTEX = /* glsl */ `
varying vec3 vRest; varying vec3 vRestN;`;
const FRAGMENT = /* glsl */ `
varying vec3 vRest; varying vec3 vRestN;
uniform vec4 uEyeBox; uniform sampler2D uEyes, uMask; uniform vec3 uRefSkin, uTSkin, uRefSkin2, uTSkin2; uniform float uSkinOn, uSkin2On, uEyeMix, uMaskOn;
vec3 recolour(vec3 g, vec3 ref, vec3 target) { vec3 r = g / max(ref, vec3(0.05)); r = r / (1.0 + max(r - vec3(1.25), vec3(0.0)) * 0.6); r = vec3(1.0) + (r - vec3(1.0)) * 0.62; return clamp(target * r, 0.0, 1.0); }
float skinWeight(vec3 g0, vec3 ref, float mask) {
  float lr = dot(g0, vec3(0.3, 0.59, 0.11)) / max(dot(ref, vec3(0.3, 0.59, 0.11)), 0.05);
  float gm = max(max(g0.r, g0.g), g0.b), sat = (gm - min(min(g0.r, g0.g), g0.b)) / max(gm, 0.02);
  // not the brows or irises (dark), not the whites of the eyes (bright and grey); lips, lashes and brows keep their own colour
  return mask * smoothstep(0.68, 0.88, lr) * (1.0 - (1.0 - smoothstep(0.07, 0.16, sat)) * smoothstep(0.95, 1.1, lr));
}`;
const DRESS = /* glsl */ `
vec4 sampledDiffuseColor = texture2D( map, vMapUv );
if (uMaskOn > 0.5 && uSkinOn > 0.5) {
  vec3 g0 = pow(max(sampledDiffuseColor.rgb, vec3(0.0)), vec3(0.4545));
  vec4 m = texture2D(uMask, vMapUv);
  vec3 g = mix(g0, recolour(g0, uRefSkin, uTSkin), skinWeight(g0, uRefSkin, m.r));
  if (uSkin2On > 0.5) g = mix(g, recolour(g0, uRefSkin2, uTSkin2), skinWeight(g0, uRefSkin2, m.g));
  sampledDiffuseColor.rgb = pow(g, vec3(2.2));
}
if (uEyeMix > 0.0 && vRestN.z > 0.25 && vRest.x > uEyeBox.x && vRest.x < uEyeBox.z && vRest.y > uEyeBox.y && vRest.y < uEyeBox.w) {
  vec4 p = texture2D(uEyes, (vRest.xy - uEyeBox.xy) / (uEyeBox.zw - uEyeBox.xy)); sampledDiffuseColor.rgb = mix(sampledDiffuseColor.rgb, p.rgb, p.a * uEyeMix);
}
diffuseColor *= sampledDiffuseColor;`;

const hex = (value: string): Rgb => [1, 3, 5].map((at) => parseInt(value.slice(at, at + 2), 16) / 255) as Rgb;

/** The painted eyes: a small canvas drawn over the baked eyes (the whites, the iris, the lid line), redrawn only when the blink or the gaze moved. */
function eyePainter(T: Kit['THREE'], spec: NonNullable<RosterMeta['eyes']>, uniforms: Record<string, THREE.IUniform>) {
  const SCALE = 5200;
  const box: [number, number, number, number] = [
    Math.min(spec.eyeL[0], spec.eyeR[0]) - spec.a * 2.2, Math.min(spec.eyeL[1], spec.eyeR[1]) - spec.b * 3.2,
    Math.max(spec.eyeL[0], spec.eyeR[0]) + spec.a * 2.2, Math.max(spec.eyeL[1], spec.eyeR[1]) + spec.b * 3.2,
  ];
  const canvas = document.createElement('canvas');
  canvas.width = Math.round((box[2] - box[0]) * SCALE); canvas.height = Math.round((box[3] - box[1]) * SCALE);
  const g = canvas.getContext('2d');
  const texture = new T.CanvasTexture(canvas);
  texture.colorSpace = T.SRGBColorSpace;
  (uniforms.uEyes as THREE.IUniform).value = texture;
  ((uniforms.uEyeBox as THREE.IUniform).value as THREE.Vector4).set(...box);
  let skin: Rgb = spec.skin, key = '', last: [number, number, number] = [0, 0, 0];
  const rgb = (c: number[], alpha = 1): string => `rgba(${Math.round(Math.min(1, c[0]!) * 255)},${Math.round(Math.min(1, c[1]!) * 255)},${Math.round(Math.min(1, c[2]!) * 255)},${alpha})`;
  const at = (p: [number, number]): [number, number] => [(p[0] - box[0]) * SCALE, (box[3] - p[1]) * SCALE];
  function eye(g2: CanvasRenderingContext2D, centre: [number, number], blink: number, gx: number, gy: number): void {
    const [cx, cy] = at(centre), w = spec.a * SCALE * 1.04, h = spec.b * SCALE * 1.1;
    g2.save(); g2.translate(cx, cy - h * 0.1); g2.scale(w * 1.5, h * 2.6);
    const soft = g2.createRadialGradient(0, 0, 0, 0, 0, 1); soft.addColorStop(0, rgb(skin)); soft.addColorStop(0.75, rgb(skin)); soft.addColorStop(1, rgb(skin, 0));
    g2.fillStyle = soft; g2.fillRect(-1, -1, 2, 2); g2.restore();
    const open = Math.max(0, 1 - blink), ey = cy + h * (1 - open) * 0.45, ry = Math.max(h * open, 0.5), x0 = cx - w, x1 = cx + w, top = ey - ry, bottom = ey + ry;
    if (open > 0.05) {
      g2.save(); g2.beginPath(); g2.ellipse(cx, ey, w, ry, 0, 0, Math.PI * 2); g2.clip();
      const white = g2.createLinearGradient(0, top, 0, bottom); white.addColorStop(0, 'rgb(205,193,183)'); white.addColorStop(0.3, 'rgb(238,232,224)'); white.addColorStop(1, 'rgb(240,234,226)');
      g2.fillStyle = white; g2.fillRect(x0, top, x1 - x0, bottom - top);
      const radius = Math.min(0.56 * spec.a * SCALE, 1.05 * spec.b * SCALE), ix = cx + gx * w * 0.34, iy = ey - gy * ry * 0.35;
      const iris = g2.createRadialGradient(ix, iy, radius * 0.15, ix, iy, radius);
      iris.addColorStop(0, rgb(spec.iris.map((v) => v * 1.3))); iris.addColorStop(0.7, rgb(spec.iris.map((v) => v * 0.55))); iris.addColorStop(1, rgb(spec.iris.map((v) => v * 0.2)));
      g2.fillStyle = iris; g2.beginPath(); g2.arc(ix, iy, radius, 0, Math.PI * 2); g2.fill();
      g2.fillStyle = 'rgb(6,4,4)'; g2.beginPath(); g2.arc(ix, iy, radius * 0.4, 0, Math.PI * 2); g2.fill();
      g2.fillStyle = 'rgba(255,255,255,0.95)'; g2.beginPath(); g2.arc(ix - radius * 0.3, iy - radius * 0.32, radius * 0.2, 0, Math.PI * 2); g2.fill();
      g2.fillStyle = 'rgba(255,255,255,0.45)'; g2.beginPath(); g2.arc(ix + radius * 0.28, iy + radius * 0.3, radius * 0.1, 0, Math.PI * 2); g2.fill();
      g2.restore();
    }
    g2.strokeStyle = 'rgb(15,9,8)'; g2.lineCap = 'round'; g2.lineWidth = Math.max(2, h * 0.22);
    g2.beginPath();
    if (open > 0.05) g2.ellipse(cx, ey, w * 1.06, ry * 1.06, 0, Math.PI * 1.05, Math.PI * 1.95); else { g2.moveTo(x0, ey); g2.quadraticCurveTo(cx, ey + h * 0.18, x1, ey); }
    g2.stroke();
  }
  const draw = (blink: number, gx: number, gy: number): void => {
    if (!g) return;
    g.clearRect(0, 0, canvas.width, canvas.height); eye(g, spec.eyeL, blink, gx, gy); eye(g, spec.eyeR, blink, gx, gy); texture.needsUpdate = true;
  };
  return {
    paint(blink: number, gx: number, gy: number): void {
      last = [blink, gx, gy];
      const active = blink > 0.02 || Math.abs(gx) > 0.1 || Math.abs(gy) > 0.1;
      const now = uniforms.uEyeMix!.value as number, next = now + ((active ? 1 : 0) - now) * 0.6;
      uniforms.uEyeMix!.value = next < 0.02 ? 0 : next;
      const wanted = [blink, gx, gy, skin.join()].map((v) => (typeof v === 'number' ? Math.round(v * 30) : v)).join(',');
      if (next < 0.02 || wanted === key) return;
      key = wanted; draw(blink, gx, gy);
    },
    /** The skin colour the lids are filled with follows the tone step. */
    skin(next: Rgb): void { skin = next; key = ''; if ((uniforms.uEyeMix!.value as number) > 0) draw(...last); },
    dispose(): void { texture.dispose(); },
  };
}

/** Load a character at a level of detail, ready to dress (outfit 0 and the made-in skin until `dress` says otherwise). */
export async function loadRosterFigure(kit: Kit, pick: RosterPick, lod: RosterLod): Promise<RosterFigure> {
  const T = kit.THREE;
  const model = await loadModel(kit, pick.id, lod), meta = model.meta;
  const scene = clone(model.gltf.scene) as THREE.Group;
  let mesh: THREE.SkinnedMesh | null = null;
  scene.traverse((node) => { if ((node as THREE.SkinnedMesh).isSkinnedMesh && !mesh) mesh = node as THREE.SkinnedMesh; });
  if (!mesh) throw new Error(`no skinned mesh in ${pick.id}-${lod}`);
  const skinned: THREE.SkinnedMesh = mesh;
  const source = skinned.material as THREE.MeshStandardMaterial, baseMap = source.map;
  if (!baseMap) throw new Error(`no base colour in ${pick.id}-${lod}`);
  const material = kit.matte ? new T.MeshLambertMaterial({ map: baseMap }) : new T.MeshStandardMaterial({ map: baseMap, roughness: 0.82, metalness: 0 });
  const refs = meta.refs, one = new T.Vector3(1, 1, 1);
  const refSkin = new T.Vector3(...(refs.skin ?? [1, 1, 1])), refSkin2 = new T.Vector3(...(refs.skin2 ?? refs.skin ?? [1, 1, 1]));
  const uniforms: Record<string, THREE.IUniform> = {
    uMask: { value: model.mask }, uMaskOn: { value: 1 }, uSkinOn: { value: 0 }, uSkin2On: { value: refs.skin2 ? 1 : 0 },
    uRefSkin: { value: refSkin }, uTSkin: { value: refSkin.clone() }, uRefSkin2: { value: refSkin2 }, uTSkin2: { value: refSkin2.clone() },
    uEyes: { value: null }, uEyeBox: { value: new T.Vector4() }, uEyeMix: { value: 0 },
  };
  void one;
  const painter = lod === 'hero' && meta.eyes ? eyePainter(T, meta.eyes, uniforms) : null;
  material.onBeforeCompile = (shader) => {
    Object.assign(shader.uniforms, uniforms);
    shader.vertexShader = shader.vertexShader.replace('#include <common>', `#include <common>${VERTEX}`).replace('#include <begin_vertex>', '#include <begin_vertex>\nvRest = position; vRestN = normal;');
    shader.fragmentShader = shader.fragmentShader.replace('#include <common>', `#include <common>${FRAGMENT}`).replace('#include <map_fragment>', DRESS);
  };
  material.customProgramCacheKey = () => 'allworld-roster-1';
  skinned.material = material;
  // A posed figure leaves its bind-pose bounds; one small mesh is cheaper to draw than to cull wrongly.
  skinned.frustumCulled = false;
  skinned.name = `roster-${pick.id}-${lod}`;
  const index = skinned.geometry.index, triangles = Math.round((index ? index.count : skinned.geometry.getAttribute('position').count) / 3);
  const dictionary = skinned.morphTargetDictionary, influences = skinned.morphTargetInfluences;
  let worn = 0, disposed = false;
  const figure: RosterFigure = {
    pick, lod, sex: meta.skeleton, height: meta.height, triangles, scene, mesh: skinned,
    hasShapes: Boolean(dictionary && influences),
    async dress(outfit, skin) {
      const step = Math.max(0, Math.min(SKIN_HEX.length, Math.round(skin)));
      const on = step > 0;
      uniforms.uSkinOn!.value = on ? 1 : 0;
      if (on) {
        const target = hex(SKIN_HEX[step - 1]!), ref = refs.skin ?? [1, 1, 1], ref2 = refs.skin2;
        (uniforms.uTSkin!.value as THREE.Vector3).set(...target);
        if (ref2) (uniforms.uTSkin2!.value as THREE.Vector3).set(Math.min(1, target[0] * ref2[0] / ref[0]), Math.min(1, target[1] * ref2[1] / ref[1]), Math.min(1, target[2] * ref2[2] / ref[2]));
        painter?.skin(target);
      } else painter?.skin(meta.eyes?.skin ?? [0.5, 0.4, 0.3]);
      const wanted = Math.max(0, Math.round(outfit));
      if (wanted === worn && material.map) return;
      const map = wanted === 0 ? baseMap : await loadOutfit(kit, pick.id, lod, wanted);
      if (disposed) return;
      material.map = map; material.needsUpdate = true; worn = wanted;
    },
    eyes(blink, gazeX, gazeY) { painter?.paint(blink, gazeX, gazeY); },
    shape(weights) {
      if (!dictionary || !influences) return;
      for (const [name, at] of Object.entries(dictionary)) {
        if (name.startsWith('look') || name === 'jawWide') continue;
        influences[at] = weights[name] ?? 0;
      }
    },
    dispose() {
      disposed = true;
      painter?.dispose();
      material.dispose();
      skinned.skeleton.dispose();
      scene.removeFromParent();
    },
  };
  await figure.dress(pick.outfit, pick.skin);
  return figure;
}
