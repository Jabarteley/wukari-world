// What the generated figures get on top of their baked colour map: gaze and blink (a small canvas mixed over the baked eyes while they move),
// and a recolouring by region (skin, top, bottom, footwear) from a one-channel label map, so the game can choose skin tones and outfit colours.
// Both are added to the material's shader; the baked colour is what shows when nothing is asked for.
import * as THREE from 'three';

export interface EyeSpec {
  /** Rest-pose object space (x to the character's left, y up): the centres of the eye openings and their half width and half height. */
  eyeL: [number, number]; eyeR: [number, number]; a: number; b: number;
  skin: [number, number, number];
  iris: [number, number, number];
}
export interface Tint {
  /** A target skin colour (sRGB hex); the baked skin is scaled toward it. */
  skin?: string;
  /** Per region: hue shift in degrees, saturation and value multipliers. */
  top?: [number, number, number]; bottom?: [number, number, number]; shoes?: [number, number, number];
}
export interface Figure { eyes: (blink: number, gazeX: number, gazeY: number) => void; tint: (t: Tint) => void }

const LABELS = { skin: 1, top: 2, bottom: 3, shoes: 4 };

export function prepareFigure(material: THREE.MeshStandardMaterial, opts: { eyes?: EyeSpec; mask?: THREE.Texture; skinRef?: [number, number, number] }): Figure {
  const uniforms: Record<string, THREE.IUniform> = {
    uEyes: { value: null }, uEyeBox: { value: new THREE.Vector4() }, uEyeMix: { value: 0 },
    uMask: { value: opts.mask ?? null }, uUseMask: { value: opts.mask ? 1 : 0 },
    uSkinScale: { value: new THREE.Vector3(1, 1, 1) }, uTop: { value: new THREE.Vector3(0, 1, 1) }, uBottom: { value: new THREE.Vector3(0, 1, 1) }, uShoes: { value: new THREE.Vector3(0, 1, 1) },
  };
  let paint: ((blink: number, gx: number, gy: number) => void) | null = null;
  const spec = opts.eyes;
  if (spec) {
    const SC = 5200;
    const box: [number, number, number, number] = [Math.min(spec.eyeL[0], spec.eyeR[0]) - spec.a * 2.2, Math.min(spec.eyeL[1], spec.eyeR[1]) - spec.b * 3.2, Math.max(spec.eyeL[0], spec.eyeR[0]) + spec.a * 2.2, Math.max(spec.eyeL[1], spec.eyeR[1]) + spec.b * 3.2];
    const canvas = document.createElement('canvas'); canvas.width = Math.round((box[2] - box[0]) * SC); canvas.height = Math.round((box[3] - box[1]) * SC);
    const g = canvas.getContext('2d')!;
    const tex = new THREE.CanvasTexture(canvas); tex.colorSpace = THREE.SRGBColorSpace;
    uniforms['uEyes']!.value = tex; (uniforms['uEyeBox']!.value as THREE.Vector4).set(...box);
    const rgb = (c: number[], a = 1): string => `rgba(${Math.round(Math.min(1, c[0]!) * 255)},${Math.round(Math.min(1, c[1]!) * 255)},${Math.round(Math.min(1, c[2]!) * 255)},${a})`;
    const cv = (p: [number, number]): [number, number] => [(p[0] - box[0]) * SC, (box[3] - p[1]) * SC];
    const eye = (c: [number, number], blink: number, gx: number, gy: number): void => {
      const [cx, cy] = cv(c), w = spec.a * SC * 1.04, h = spec.b * SC * 1.1;
      g.save(); g.translate(cx, cy - h * 0.1); g.scale(w * 1.5, h * 2.6);
      const rg = g.createRadialGradient(0, 0, 0, 0, 0, 1); rg.addColorStop(0, rgb(spec.skin)); rg.addColorStop(0.75, rgb(spec.skin)); rg.addColorStop(1, rgb(spec.skin, 0));
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
    let key = '';
    paint = (blink, gx, gy) => {
      const active = blink > 0.02 || Math.abs(gx) > 0.1 || Math.abs(gy) > 0.1;
      const cur = uniforms['uEyeMix']!.value as number, next = cur + ((active ? 1 : 0) - cur) * 0.6;
      uniforms['uEyeMix']!.value = next < 0.02 ? 0 : next;
      const k = [blink, gx, gy].map((v) => Math.round(v * 30)).join(',');
      if (next < 0.02 || k === key) return; key = k;
      g.clearRect(0, 0, canvas.width, canvas.height); eye(spec.eyeL, blink, gx, gy); eye(spec.eyeR, blink, gx, gy); tex.needsUpdate = true;
    };
  }
  material.onBeforeCompile = (shader) => {
    Object.assign(shader.uniforms, uniforms);
    shader.vertexShader = shader.vertexShader.replace('#include <common>', '#include <common>\nvarying vec3 vRest; varying vec3 vRestN;').replace('#include <begin_vertex>', '#include <begin_vertex>\nvRest = position; vRestN = normal;');
    shader.fragmentShader = shader.fragmentShader.replace('#include <common>', `#include <common>
varying vec3 vRest; varying vec3 vRestN;
uniform vec4 uEyeBox; uniform sampler2D uEyes, uMask; uniform float uEyeMix, uUseMask; uniform vec3 uSkinScale, uTop, uBottom, uShoes;
vec3 rgb2hsv(vec3 c){ vec4 K=vec4(0.,-1./3.,2./3.,-1.); vec4 p=mix(vec4(c.bg,K.wz),vec4(c.gb,K.xy),step(c.b,c.g)); vec4 q=mix(vec4(p.xyw,c.r),vec4(c.r,p.yzx),step(p.x,c.r)); float d=q.x-min(q.w,q.y); float e=1e-10; return vec3(abs(q.z+(q.w-q.y)/(6.*d+e)),d/(q.x+e),q.x); }
vec3 hsv2rgb(vec3 c){ vec4 K=vec4(1.,2./3.,1./3.,3.); vec3 p=abs(fract(c.xxx+K.xyz)*6.-K.www); return c.z*mix(K.xxx,clamp(p-K.xxx,0.,1.),c.y); }
vec3 shift(vec3 c, vec3 t){ vec3 h=rgb2hsv(c); h.x=fract(h.x+t.x/360.); h.y=clamp(h.y*t.y,0.,1.); h.z=h.z*t.z; return hsv2rgb(h); }`).replace('#include <map_fragment>', `
vec4 sampledDiffuseColor = texture2D( map, vMapUv );
if (uUseMask > 0.5) {
  float lab = floor(texture2D(uMask, vMapUv).r * 255.0 / 51.0 + 0.5);
  if (lab < 0.5) { }
  else if (lab < 1.5) { vec3 s = pow(max(sampledDiffuseColor.rgb, vec3(0.0)), vec3(1.0 / 2.2)) * uSkinScale; s -= max(s - vec3(0.82), vec3(0.0)) * 0.8; sampledDiffuseColor.rgb = pow(max(s, vec3(0.0)), vec3(2.2)); }
  else if (lab < 2.5) sampledDiffuseColor.rgb = shift(sampledDiffuseColor.rgb, uTop);
  else if (lab < 3.5) sampledDiffuseColor.rgb = shift(sampledDiffuseColor.rgb, uBottom);
  else sampledDiffuseColor.rgb = shift(sampledDiffuseColor.rgb, uShoes);
}
if (uEyeMix > 0.0 && vRestN.z > 0.25 && vRest.x > uEyeBox.x && vRest.x < uEyeBox.z && vRest.y > uEyeBox.y && vRest.y < uEyeBox.w) {
  vec4 p = texture2D(uEyes, (vRest.xy - uEyeBox.xy) / (uEyeBox.zw - uEyeBox.xy)); sampledDiffuseColor.rgb = mix(sampledDiffuseColor.rgb, p.rgb, p.a * uEyeMix);
}
diffuseColor *= sampledDiffuseColor;`);
  };
  material.customProgramCacheKey = () => 'h1fig1';
  material.needsUpdate = true;
  void LABELS;
  const lin = (hex: string): THREE.Color => new THREE.Color(hex);
  return {
    eyes: (blink, gx, gy) => paint?.(blink, gx, gy),
    tint(t) {
      if (t.skin && opts.skinRef) {
        // scaled in display (gamma) space with a soft ceiling: a multiplication in linear light overshoots on light tones
        const to = (h: string): number[] => [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16) / 255), ref = opts.skinRef.map((v) => Math.pow(v, 1 / 2.2)), target = to(t.skin);
        (uniforms['uSkinScale']!.value as THREE.Vector3).set(target[0]! / ref[0]!, target[1]! / ref[1]!, target[2]! / ref[2]!);
      } else (uniforms['uSkinScale']!.value as THREE.Vector3).set(1, 1, 1);
      (uniforms['uTop']!.value as THREE.Vector3).set(...(t.top ?? [0, 1, 1])); (uniforms['uBottom']!.value as THREE.Vector3).set(...(t.bottom ?? [0, 1, 1])); (uniforms['uShoes']!.value as THREE.Vector3).set(...(t.shoes ?? [0, 1, 1]));
    },
  };
}
