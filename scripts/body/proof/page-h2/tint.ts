// The colour layer of a generated part: skin tone, garment colours and the gaze/blink overlay.
// A part's colour map is stored as generated.  A mask image (red skin, green top, blue bottom, alpha footwear; soft at every edge) says how much of each region a texel is, and the
// reference colour of each region says what the baked colour is.  A region is recoloured by dividing the texel by its reference and multiplying by the chosen colour, in display space,
// so shading, stitching, stubble and the lips' own redness all stay; only the base colour moves.  The weights are continuous, so nothing speckles at an edge.
import * as THREE from 'three';

export type RGB = [number, number, number];
export interface Regions { skin: RGB; top: RGB | null; bottom: RGB | null; shoes: RGB | null }
export interface EyeSpec { eyeL: [number, number]; eyeR: [number, number]; a: number; b: number; skin: RGB; iris: RGB }
export interface Targets { skin: string; top?: string; bottom?: string; shoes?: string }

const hex = (h: string): RGB => [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16) / 255) as RGB;
const ONE: RGB = [1, 1, 1];

export interface Tinted {
  material: THREE.MeshStandardMaterial;
  setTargets(t: Targets): void;
  setMap(map: THREE.Texture): void;
  eyes(blink: number, gazeX: number, gazeY: number): void;
  dispose(): void;
}

export function tintMaterial(source: THREE.MeshStandardMaterial, opts: { mask?: THREE.Texture | null; refs?: Regions; eyes?: EyeSpec; tintable?: boolean; neck?: { cx: number; cz: number; rx: number; rz: number; cutY: number } }): Tinted {
  const material = source.clone();
  const refs = opts.refs;
  const u = (v: RGB): THREE.Vector3 => new THREE.Vector3(...v);
  const uniforms: Record<string, THREE.IUniform> = {
    uMask: { value: opts.mask ?? null }, uUseMask: { value: opts.mask && refs ? 1 : 0 },
    uRefSkin: { value: u(refs?.skin ?? ONE) }, uRefTop: { value: u(refs?.top ?? ONE) }, uRefBottom: { value: u(refs?.bottom ?? ONE) }, uRefShoes: { value: u(refs?.shoes ?? ONE) },
    uTSkin: { value: u(refs?.skin ?? ONE) }, uTTop: { value: u(refs?.top ?? ONE) }, uTBottom: { value: u(refs?.bottom ?? ONE) }, uTShoes: { value: u(refs?.shoes ?? ONE) },
    uNeck: { value: new THREE.Vector4(opts.neck?.cx ?? 0, opts.neck?.cz ?? 0, opts.neck?.rx ?? 1, opts.neck?.rz ?? 1) }, uNeckY: { value: opts.neck ? opts.neck.cutY : -9 },
    uEyes: { value: null }, uEyeBox: { value: new THREE.Vector4() }, uEyeMix: { value: 0 },
  };
  let paint: ((blink: number, gx: number, gy: number) => void) | null = null;
  let skinNow: RGB = refs?.skin ?? [0.6, 0.4, 0.3];
  let repaint = (): void => {};
  let canvasTex: THREE.CanvasTexture | null = null;
  const spec = opts.eyes;
  if (spec) {
    const SC = 5200;
    const box: [number, number, number, number] = [Math.min(spec.eyeL[0], spec.eyeR[0]) - spec.a * 2.2, Math.min(spec.eyeL[1], spec.eyeR[1]) - spec.b * 3.2, Math.max(spec.eyeL[0], spec.eyeR[0]) + spec.a * 2.2, Math.max(spec.eyeL[1], spec.eyeR[1]) + spec.b * 3.2];
    const canvas = document.createElement('canvas'); canvas.width = Math.round((box[2] - box[0]) * SC); canvas.height = Math.round((box[3] - box[1]) * SC);
    const g = canvas.getContext('2d')!;
    canvasTex = new THREE.CanvasTexture(canvas); canvasTex.colorSpace = THREE.SRGBColorSpace;
    uniforms['uEyes']!.value = canvasTex; (uniforms['uEyeBox']!.value as THREE.Vector4).set(...box);
    const rgb = (c: number[], a = 1): string => `rgba(${Math.round(Math.min(1, c[0]!) * 255)},${Math.round(Math.min(1, c[1]!) * 255)},${Math.round(Math.min(1, c[2]!) * 255)},${a})`;
    const cv = (p: [number, number]): [number, number] => [(p[0] - box[0]) * SC, (box[3] - p[1]) * SC];
    const eye = (c: [number, number], blink: number, gx: number, gy: number): void => {
      const [cx, cy] = cv(c), w = spec.a * SC * 1.04, h = spec.b * SC * 1.1;
      g.save(); g.translate(cx, cy - h * 0.1); g.scale(w * 1.5, h * 2.6);
      const rg = g.createRadialGradient(0, 0, 0, 0, 0, 1); rg.addColorStop(0, rgb(skinNow)); rg.addColorStop(0.75, rgb(skinNow)); rg.addColorStop(1, rgb(skinNow, 0));
      g.fillStyle = rg; g.fillRect(-1, -1, 2, 2); g.restore();
      const open = Math.max(0, 1 - blink), ey = cy + h * (1 - open) * 0.45, ry = Math.max(h * open, 0.5);
      const x0 = cx - w, x1 = cx + w, top = ey - ry, bottom = ey + ry;
      if (open > 0.05) {
        g.save(); g.beginPath(); g.ellipse(cx, ey, w, ry, 0, 0, Math.PI * 2); g.clip();
        const sc = g.createLinearGradient(0, top, 0, bottom); sc.addColorStop(0, 'rgb(205,193,183)'); sc.addColorStop(0.3, 'rgb(238,232,224)'); sc.addColorStop(1, 'rgb(240,234,226)');
        g.fillStyle = sc; g.fillRect(x0, top, x1 - x0, bottom - top);
        const ri = Math.min(0.56 * spec.a * SC, 1.05 * spec.b * SC), ix = cx + gx * w * 0.34, iy = ey - gy * ry * 0.35;
        const ig = g.createRadialGradient(ix, iy, ri * 0.15, ix, iy, ri);
        ig.addColorStop(0, rgb(spec.iris.map((v) => v * 1.3))); ig.addColorStop(0.7, rgb(spec.iris.map((v) => v * 0.55))); ig.addColorStop(1, rgb(spec.iris.map((v) => v * 0.2)));
        g.fillStyle = ig; g.beginPath(); g.arc(ix, iy, ri, 0, Math.PI * 2); g.fill();
        g.fillStyle = 'rgb(6,4,4)'; g.beginPath(); g.arc(ix, iy, ri * 0.4, 0, Math.PI * 2); g.fill();
        g.fillStyle = 'rgba(255,255,255,0.95)'; g.beginPath(); g.arc(ix - ri * 0.3, iy - ri * 0.32, ri * 0.2, 0, Math.PI * 2); g.fill();
        g.fillStyle = 'rgba(255,255,255,0.45)'; g.beginPath(); g.arc(ix + ri * 0.28, iy + ri * 0.3, ri * 0.1, 0, Math.PI * 2); g.fill();
        g.restore();
      }
      g.strokeStyle = 'rgb(15,9,8)'; g.lineCap = 'round'; g.lineWidth = Math.max(2, h * 0.22);
      g.beginPath();
      if (open > 0.05) g.ellipse(cx, ey, w * 1.06, ry * 1.06, 0, Math.PI * 1.05, Math.PI * 1.95); else { g.moveTo(x0, ey); g.quadraticCurveTo(cx, ey + h * 0.18, x1, ey); }
      g.stroke();
    };
    let key = '', last: [number, number, number] = [0, 0, 0];
    const draw = (blink: number, gx: number, gy: number): void => { g.clearRect(0, 0, canvas.width, canvas.height); eye(spec.eyeL, blink, gx, gy); eye(spec.eyeR, blink, gx, gy); canvasTex!.needsUpdate = true; };
    paint = (blink, gx, gy) => {
      last = [blink, gx, gy];
      const active = blink > 0.02 || Math.abs(gx) > 0.1 || Math.abs(gy) > 0.1;
      const cur = uniforms['uEyeMix']!.value as number, next = cur + ((active ? 1 : 0) - cur) * 0.6;
      uniforms['uEyeMix']!.value = next < 0.02 ? 0 : next;
      const k = [blink, gx, gy, skinNow.join()].map((v) => typeof v === 'number' ? Math.round(v * 30) : v).join(',');
      if (next < 0.02 || k === key) return; key = k; draw(blink, gx, gy);
    };
    repaint = () => { key = ''; if ((uniforms['uEyeMix']!.value as number) > 0) draw(...last); };
  }
  material.onBeforeCompile = (shader) => {
    Object.assign(shader.uniforms, uniforms);
    shader.vertexShader = shader.vertexShader.replace('#include <common>', '#include <common>\nvarying vec3 vRest; varying vec3 vRestN;').replace('#include <begin_vertex>', '#include <begin_vertex>\nvRest = position; vRestN = normal;');
    shader.fragmentShader = shader.fragmentShader.replace('#include <common>', `#include <common>
varying vec3 vRest; varying vec3 vRestN;
uniform vec4 uEyeBox; uniform sampler2D uEyes, uMask; uniform float uEyeMix, uUseMask, uNeckY; uniform vec4 uNeck;
uniform vec3 uRefSkin, uRefTop, uRefBottom, uRefShoes, uTSkin, uTTop, uTBottom, uTShoes;
vec3 recolour(vec3 g, vec3 ref, vec3 target) { vec3 r = g / max(ref, vec3(0.05)); r = r / (1.0 + max(r - vec3(1.25), vec3(0.0)) * 0.6); return clamp(target * r, 0.0, 1.0); }`).replace('#include <map_fragment>', `
vec4 sampledDiffuseColor = texture2D( map, vMapUv );
if (uUseMask > 0.5) {
  vec3 g0 = pow(max(sampledDiffuseColor.rgb, vec3(0.0)), vec3(0.4545));
  vec4 m = texture2D(uMask, vMapUv);
  vec3 g = g0;
  float lr = dot(g0, vec3(0.3, 0.59, 0.11)) / max(dot(uRefSkin, vec3(0.3, 0.59, 0.11)), 0.05);
  float gm = max(max(g0.r, g0.g), g0.b), sat = (gm - min(min(g0.r, g0.g), g0.b)) / max(gm, 0.02);
  float skinW = m.r * smoothstep(0.68, 0.88, lr) * (1.0 - (1.0 - smoothstep(0.07, 0.16, sat)) * smoothstep(0.95, 1.1, lr));   // not the brows or irises (dark) and not the whites of the eyes (bright and grey)   // brows, lashes, irises and lips keep their own colour
  g = mix(g, recolour(g0, uRefSkin, uTSkin), skinW);
  g = mix(g, recolour(g0, uRefTop, uTTop), m.g);
  g = mix(g, recolour(g0, uRefBottom, uTBottom), m.b);
  g = mix(g, recolour(g0, uRefShoes, uTShoes), m.a);
  if (uNeckY > -5.0) {      // the neck skin that shows through a collar or neckline: one skin colour from the head's own value
    vec2 q = (vRest.xz - uNeck.xy) / uNeck.zw; float inside = 1.0 - smoothstep(1.1, 1.4, length(q)); float yy = smoothstep(-0.05, -0.012, vRest.y - uNeckY) * (1.0 - smoothstep(0.02, 0.06, vRest.y - uNeckY));
    g = mix(g, uTSkin * (0.78 + 0.3 * dot(g0, vec3(0.3, 0.59, 0.11))), inside * yy * 0.9);
  }
  sampledDiffuseColor.rgb = pow(g, vec3(2.2));
}
if (uEyeMix > 0.0 && vRestN.z > 0.25 && vRest.x > uEyeBox.x && vRest.x < uEyeBox.z && vRest.y > uEyeBox.y && vRest.y < uEyeBox.w) {
  vec4 p = texture2D(uEyes, (vRest.xy - uEyeBox.xy) / (uEyeBox.zw - uEyeBox.xy)); sampledDiffuseColor.rgb = mix(sampledDiffuseColor.rgb, p.rgb, p.a * uEyeMix);
}
diffuseColor *= sampledDiffuseColor;`);
  };
  material.customProgramCacheKey = () => 'h2tint2';
  material.needsUpdate = true;
  return {
    material,
    setTargets(t) {
      const set = (name: string, c: string | undefined, ref: RGB | null | undefined): void => { (uniforms[name]!.value as THREE.Vector3).set(...(c ? hex(c) : ref ?? ONE)); };
      set('uTSkin', t.skin, refs?.skin); set('uTTop', t.top, refs?.top); set('uTBottom', t.bottom, refs?.bottom); set('uTShoes', t.shoes, refs?.shoes);
      skinNow = hex(t.skin); repaint();
    },
    setMap(map) { material.map = map; material.needsUpdate = true; },
    eyes: (blink, gx, gy) => paint?.(blink, gx, gy),
    dispose() { material.dispose(); canvasTex?.dispose(); },
  };
}
