// A crowd figure: the same parts at a lower level of detail, flattened at selection time into ONE skinned mesh with ONE atlas texture (one draw call).
// The atlas is made by drawing each part's colour map, recoloured by its mask, into a region of one render target; hair and headwear become flat colour patches.
import * as THREE from 'three';
import { clone } from 'three/examples/jsm/utils/SkeletonUtils.js';
import { Library, fitHead, applyShape } from './parts.ts';
import type { BodyMeta, HeadMeta, Look, Figure } from './parts.ts';
import { buildHair } from './hair.ts';
import { LifeDriver } from '../page4/anim.ts';
import type { Rig } from '../page3/character.ts';
import type { Tinted } from './tint.ts';

const hex = (h: string): THREE.Vector3 => new THREE.Vector3(...([1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16) / 255) as [number, number, number]));
const VS = 'varying vec2 vUv; uniform vec4 uRect; void main(){ vUv = uv; vec2 p = uRect.xy + uv * uRect.zw; gl_Position = vec4(p * 2.0 - 1.0, 0.0, 1.0); }';
const FS = `varying vec2 vUv; uniform sampler2D uMap, uMask; uniform float uFlat; uniform vec3 uColor, uRefSkin, uRefTop, uRefBottom, uRefShoes, uTSkin, uTTop, uTBottom, uTShoes;
vec3 recolour(vec3 g, vec3 ref, vec3 target) { vec3 r = g / max(ref, vec3(0.05)); r = r / (1.0 + max(r - vec3(1.25), vec3(0.0)) * 0.6); return clamp(target * r, 0.0, 1.0); }
void main(){
  if (uFlat > 0.5) { gl_FragColor = vec4(pow(uColor, vec3(2.2)), 1.0); return; }
  vec3 g0 = pow(max(texture2D(uMap, vUv).rgb, vec3(0.0)), vec3(0.4545)); vec4 m = texture2D(uMask, vUv); vec3 g = g0;
  float lr = dot(g0, vec3(0.3, 0.59, 0.11)) / max(dot(uRefSkin, vec3(0.3, 0.59, 0.11)), 0.05);
  float gm = max(max(g0.r, g0.g), g0.b), sat = (gm - min(min(g0.r, g0.g), g0.b)) / max(gm, 0.02);
  float skinW = m.r * smoothstep(0.68, 0.88, lr) * (1.0 - (1.0 - smoothstep(0.07, 0.16, sat)) * smoothstep(0.95, 1.1, lr));
  g = mix(g, recolour(g0, uRefSkin, uTSkin), skinW); g = mix(g, recolour(g0, uRefTop, uTTop), m.g); g = mix(g, recolour(g0, uRefBottom, uTBottom), m.b); g = mix(g, recolour(g0, uRefShoes, uTShoes), m.a);
  gl_FragColor = vec4(pow(g, vec3(2.2)), 1.0);
}`;

export function crowdRenderer(r: THREE.WebGLRenderer): void { (crowdRenderer as unknown as { r: THREE.WebGLRenderer }).r = r; }
const getRenderer = (): THREE.WebGLRenderer => (crowdRenderer as unknown as { r: THREE.WebGLRenderer }).r;

function drawTo(rt: THREE.WebGLRenderTarget, rect: THREE.Vector4, u: Record<string, THREE.IUniform>): void {
  const r = getRenderer();
  // a fresh material each time: three keeps the uniform objects it first compiled with
  const mat = new THREE.ShaderMaterial({ vertexShader: VS, fragmentShader: FS, depthTest: false, depthWrite: false, uniforms: { uRect: { value: rect }, ...u } });
  const q = new THREE.Mesh(new THREE.PlaneGeometry(1, 1).translate(0.5, 0.5, 0), mat); q.frustumCulled = false;
  const scene = new THREE.Scene(); scene.add(q); const cam = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
  const keep = r.getRenderTarget(), ac = r.autoClear; r.setRenderTarget(rt); r.autoClear = false; r.render(scene, cam); r.setRenderTarget(keep); r.autoClear = ac;
  mat.dispose(); q.geometry.dispose();
}

const D = new THREE.Vector3(1, 1, 1);
function partUniforms(map: THREE.Texture, mask: THREE.Texture, refs: { skin: number[]; top: number[] | null; bottom: number[] | null; shoes: number[] | null }, t: { skin: string; top?: string; bottom?: string; shoes?: string }): Record<string, THREE.IUniform> {
  const v = (a: number[] | null): THREE.Vector3 => a ? new THREE.Vector3(a[0], a[1], a[2]) : D;
  return { uMap: { value: map }, uMask: { value: mask }, uFlat: { value: 0 }, uColor: { value: D }, uRefSkin: { value: v(refs.skin) }, uRefTop: { value: v(refs.top) }, uRefBottom: { value: v(refs.bottom) }, uRefShoes: { value: v(refs.shoes) },
    uTSkin: { value: hex(t.skin) }, uTTop: { value: t.top && refs.top ? hex(t.top) : v(refs.top) }, uTBottom: { value: t.bottom && refs.bottom ? hex(t.bottom) : v(refs.bottom) }, uTShoes: { value: t.shoes ? hex(t.shoes) : v(refs.shoes) } };
}

export interface CrowdFigure { root: THREE.Group; rig: Rig; driver: LifeDriver; triangles: number; drawCalls: number; bytes: number; dispose(): void }

export async function buildCrowd(lib: Library, look: Look, seed = 5): Promise<CrowdFigure> {
  const headId = look.head.replace('-head', '-chead'), bodyId = look.body.replace('-body', '-cbody');
  const [bm, hm] = await Promise.all([lib.meta<BodyMeta>(`/m/${bodyId}.json`), lib.meta<HeadMeta>(`/m/${headId}.json`)]);
  const [bg, hg, bmask, hmask] = await Promise.all([lib.glb(`/m/${bm.file}`), lib.glb(`/m/${hm.file}`), lib.mask(`/m/${bm.mask}`), lib.mask(`/m/${hm.mask}`)]);
  const scene = clone(bg.scene) as THREE.Group, root = new THREE.Group(); root.add(scene);
  const bones: Record<string, THREE.Bone> = {}; let bodyMesh!: THREE.SkinnedMesh;
  scene.traverse((o) => { if ((o as THREE.Bone).isBone) bones[o.name] = o as THREE.Bone; if ((o as THREE.SkinnedMesh).isSkinnedMesh) bodyMesh = o as THREE.SkinnedMesh; });
  let headSrc!: THREE.SkinnedMesh; hg.scene.traverse((o) => { if ((o as THREE.SkinnedMesh).isSkinnedMesh) headSrc = o as THREE.SkinnedMesh; });
  const { geometry: hgeo, dy } = fitHead(headSrc.geometry, hm, bm);
  const wear = look.headwear === 'gele' ? 'scarf' : look.headwear;
  const pieces = await buildHair({ lib, look: { ...look, headwear: wear }, head: hm, dy, geometry: hgeo, skeleton: bodyMesh.skeleton, bindMatrix: bodyMesh.bindMatrix, lod: true });
  // atlas
  const SIZE = 512;
  const rt = new THREE.WebGLRenderTarget(SIZE, SIZE, { colorSpace: THREE.SRGBColorSpace, depthBuffer: false, generateMipmaps: true, minFilter: THREE.LinearMipmapLinearFilter, magFilter: THREE.LinearFilter });
  const bmapRect = new THREE.Vector4(0, 0.4, 1, 0.6), hmapRect = new THREE.Vector4(0, 0, 0.5, 0.4), hairRect = new THREE.Vector4(0.5, 0, 0.25, 0.2), wearRect = new THREE.Vector4(0.75, 0, 0.25, 0.2);
  const targets = { skin: look.skin, top: bm.refs.top ? look.top : undefined, bottom: bm.refs.bottom ? look.bottom : undefined, shoes: look.shoes };
  const bmap = (bodyMesh.material as THREE.MeshStandardMaterial).map!, hmap = (headSrc.material as THREE.MeshStandardMaterial).map!;
  if (look.print && look.print >= 2 && bm.prints?.[look.print - 2]) { /* a print variant is a separate texture */ const t = await lib.map(`/m/${bm.prints[look.print - 2]}`); drawTo(rt, bmapRect, partUniforms(t, bmask, bm.refs, targets)); }
  else drawTo(rt, bmapRect, partUniforms(bmap, bmask, bm.refs, targets));
  drawTo(rt, hmapRect, partUniforms(hmap, hmask, { skin: hm.refSkin, top: null, bottom: null, shoes: null }, { skin: look.skin }));
  const flat = (rect: THREE.Vector4, color: string): void => { drawTo(rt, rect, { uFlat: { value: 1 }, uColor: { value: hex(color) }, uMap: { value: bmap }, uMask: { value: bmask }, uRefSkin: { value: D }, uRefTop: { value: D }, uRefBottom: { value: D }, uRefShoes: { value: D }, uTSkin: { value: D }, uTTop: { value: D }, uTBottom: { value: D }, uTShoes: { value: D } }); };
  flat(hairRect, look.hairColor ?? '#14100e'); flat(wearRect, look.headwearColor ?? '#e9e2cf');
  // merged geometry
  type G = { geo: THREE.BufferGeometry; rect: THREE.Vector4; patch: boolean; head: boolean };
  const parts: G[] = [{ geo: bodyMesh.geometry, rect: bmapRect, patch: false, head: false }, { geo: hgeo, rect: hmapRect, patch: false, head: true }];
  for (const p of pieces) { const isWear = (p.mesh.material as THREE.MeshStandardMaterial).color?.getHex?.() === 0xffffff && (p.mesh.material as THREE.MeshStandardMaterial).vertexColors && look.headwear && look.headwear !== 'none' && !look.hair; parts.push({ geo: p.mesh.geometry, rect: look.hair && look.hair !== 'none' && !isWear && p === pieces[0] ? hairRect : wearRect, patch: true, head: false }); }
  let nv = 0, ni = 0; for (const p of parts) { nv += p.geo.getAttribute('position').count; ni += p.geo.index!.count; }
  const pos = new Float32Array(nv * 3), nrm = new Float32Array(nv * 3), uv = new Float32Array(nv * 2), si = new Uint16Array(nv * 4), sw = new Float32Array(nv * 4), ix = new Uint32Array(ni);
  const bodyBones = bodyMesh.skeleton.bones.map((b) => b.name), headBones = headSrc.skeleton.bones.map((b) => b.name), remap = headBones.map((n) => bodyBones.indexOf(n));
  let vo = 0, io = 0;
  for (const p of parts) {
    const g = p.geo, n = g.getAttribute('position').count, P = g.getAttribute('position'), N = g.getAttribute('normal'), U = g.getAttribute('uv'), SI = g.getAttribute('skinIndex'), SW = g.getAttribute('skinWeight');
    for (let i = 0; i < n; i++) {
      pos.set([P.getX(i), P.getY(i), P.getZ(i)], (vo + i) * 3); nrm.set([N.getX(i), N.getY(i), N.getZ(i)], (vo + i) * 3);
      if (p.patch) uv.set([p.rect.x + p.rect.z / 2, p.rect.y + p.rect.w / 2], (vo + i) * 2); else uv.set([p.rect.x + U.getX(i) * p.rect.z, p.rect.y + U.getY(i) * p.rect.w], (vo + i) * 2);
      for (let c = 0; c < 4; c++) { const b = SI.getComponent(i, c); si[(vo + i) * 4 + c] = p.head ? remap[b]! : b; sw[(vo + i) * 4 + c] = SW.getComponent(i, c); }
    }
    const a = g.index!.array; for (let i = 0; i < a.length; i++) ix[io + i] = a[i]! + vo; vo += n; io += a.length;
  }
  const geo = new THREE.BufferGeometry(); geo.setAttribute('position', new THREE.BufferAttribute(pos, 3)); geo.setAttribute('normal', new THREE.BufferAttribute(nrm, 3)); geo.setAttribute('uv', new THREE.BufferAttribute(uv, 2));
  geo.setAttribute('skinIndex', new THREE.BufferAttribute(si, 4)); geo.setAttribute('skinWeight', new THREE.BufferAttribute(sw, 4)); geo.setIndex(new THREE.BufferAttribute(ix, 1));
  const mat = new THREE.MeshStandardMaterial({ map: rt.texture, roughness: 0.85, metalness: 0 });
  const mesh = new THREE.SkinnedMesh(geo, mat); mesh.frustumCulled = false; mesh.bind(bodyMesh.skeleton, bodyMesh.bindMatrix);
  bodyMesh.parent!.add(mesh); bodyMesh.parent!.remove(bodyMesh);
  applyShape(bones, look);
  const mixer = new THREE.AnimationMixer(scene); const actions = new Map<string, THREE.AnimationAction>([...lib.clips].map(([n, c]) => [n, mixer.clipAction(c)]));
  const rig: Rig = { look: { body: look.sex } as unknown as Rig['look'], root, scene, bones, mixer, actions, face: [], eyes: undefined, sway: { uSway: { value: new THREE.Vector3() }, uTime: { value: 0 } }, materials: [mat], meshes: [mesh], dispose() {} };
  const driver = new LifeDriver(rig, seed);
  root.scale.setScalar(look.height ?? 1);
  const bytes = [bm.file, hm.file, bm.mask, hm.mask].reduce((s, f) => s + (lib.sizes.get(`/m/${f}`) ?? 0), 0);
  return { root, rig, driver, triangles: ni / 3, drawCalls: 1, bytes, dispose() { rt.dispose(); mat.dispose(); geo.dispose(); for (const p of pieces) p.mesh.geometry.dispose(); } };
}
export type { Figure, Tinted };
