// Face life for a character whose face is painted into one texture and has no blend shapes: eyelids and mouth shapes are painted on
// small patches and mixed into the base colour inside two rectangles of the front of the face (found by the rest-pose position of the
// surface, so no extra UV set is needed). Gaze and head life come from the head and neck bones, breathing from the spine.
import * as THREE from 'three';

export interface FaceSpec {
  /** The face front in rest-pose object space (x to the character's left, y up): x0, y0, x1, y1. */
  rect: [number, number, number, number];
  eyeL: [number, number]; eyeR: [number, number]; eyeW: number; eyeH: number;
  mouth: [number, number]; mouthW: number; mouthH: number;
  skin: [number, number]; lip: [number, number];
  /** Optional brow centres, used for the uneasy look. */
  browL?: [number, number]; browR?: [number, number]; browW?: number;
}

export interface FaceLife {
  uniforms: Record<string, THREE.IUniform>;
  patches: { eyes: HTMLCanvasElement; mouth: HTMLCanvasElement; base: HTMLCanvasElement };
  update(w: Record<string, number>): void;
}

const MOUTH_SHAPES = ['aa', 'oh', 'ee', 'mm', 'smile', 'flat', 'worry'] as const;

/** Renders the front of the textured mesh flat (no light) into a canvas. */
export function renderFront(renderer: THREE.WebGLRenderer, mesh: THREE.SkinnedMesh, spec: FaceSpec, px: number): HTMLCanvasElement {
  const [x0, y0, x1, y1] = spec.rect;
  const w = px, h = Math.round(px * (y1 - y0) / (x1 - x0));
  const rt = new THREE.WebGLRenderTarget(w, h, { colorSpace: THREE.SRGBColorSpace, samples: 4 });
  const cam = new THREE.OrthographicCamera(x0, x1, y1, y0, 0.01, 10); cam.position.set(0, 0, 3); cam.lookAt((x0 + x1) / 2 + 0, (y0 + y1) / 2, 0);
  cam.position.set((x0 + x1) / 2, (y0 + y1) / 2, 3); cam.lookAt((x0 + x1) / 2, (y0 + y1) / 2, 0);
  const src = mesh.material as THREE.MeshStandardMaterial;
  const flat = new THREE.MeshBasicMaterial({ map: src.map });
  const probe = new THREE.SkinnedMesh(mesh.geometry, flat); probe.bind(mesh.skeleton, mesh.bindMatrix);
  probe.frustumCulled = false;
  const scene = new THREE.Scene(); scene.add(probe);
  const keep = renderer.getRenderTarget(); const tm = renderer.toneMapping; renderer.toneMapping = THREE.NoToneMapping; const clear = renderer.getClearAlpha();
  renderer.setRenderTarget(rt); renderer.setClearColor(0x000000, 0); renderer.clear(); renderer.render(scene, cam);
  const data = new Uint8Array(w * h * 4); renderer.readRenderTargetPixels(rt, 0, 0, w, h, data);
  renderer.setRenderTarget(keep); renderer.toneMapping = tm; renderer.setClearColor(0x000000, clear);
  rt.dispose(); flat.dispose();
  const c = document.createElement('canvas'); c.width = w; c.height = h;
  const g = c.getContext('2d')!; const img = g.createImageData(w, h);
  for (let y = 0; y < h; y++) img.data.set(data.subarray((h - 1 - y) * w * 4, (h - y) * w * 4), y * w * 4);
  g.putImageData(img, 0, 0);
  return c;
}

const px = (spec: FaceSpec, c: HTMLCanvasElement, p: [number, number]): [number, number] => {
  const [x0, y0, x1, y1] = spec.rect; return [((p[0] - x0) / (x1 - x0)) * c.width, ((y1 - p[1]) / (y1 - y0)) * c.height];
};
const sample = (g: CanvasRenderingContext2D, x: number, y: number): string => { const d = g.getImageData(Math.round(x) - 2, Math.round(y) - 2, 5, 5).data; let r = 0, gg = 0, b = 0; for (let i = 0; i < d.length; i += 4) { r += d[i]!; gg += d[i + 1]!; b += d[i + 2]!; } const n = d.length / 4; return `rgb(${(r / n) | 0},${(gg / n) | 0},${(b / n) | 0})`; };

/** Paints the closed-eye patch (full-rect, transparent except at the eyes) and the mouth atlas (one cell per shape, each a full copy of the rect). */
export function paintPatches(base: HTMLCanvasElement, spec: FaceSpec): { eyes: HTMLCanvasElement; mouth: HTMLCanvasElement } {
  const W = base.width, Hh = base.height, bg = base.getContext('2d')!;
  const sc = W / (spec.rect[2] - spec.rect[0]);   // pixels per metre
  const skin = sample(bg, ...px(spec, base, spec.skin));
  const lipC = sample(bg, ...px(spec, base, spec.lip));
  // --- eyes
  const eyes = document.createElement('canvas'); eyes.width = W; eyes.height = Hh;
  const eg = eyes.getContext('2d')!;
  for (const e of [spec.eyeL, spec.eyeR]) {
    const [cx, cy] = px(spec, base, e); const rw = spec.eyeW * sc / 2, rh = spec.eyeH * sc / 2;
    eg.save();
    eg.filter = `blur(${Math.max(1, rh * 0.18)}px)`;
    eg.fillStyle = skin; eg.beginPath(); eg.ellipse(cx, cy, rw * 1.18, rh * 1.45, 0, 0, Math.PI * 2); eg.fill();
    eg.restore();
    // lid crease and lash line: a downward curve with a short flick at the outer end
    eg.strokeStyle = 'rgba(28,14,10,0.92)'; eg.lineCap = 'round'; eg.lineWidth = Math.max(1.5, rh * 0.28);
    const side = e === spec.eyeL ? 1 : -1;
    eg.beginPath(); eg.moveTo(cx - rw * 1.05, cy - rh * 0.05); eg.quadraticCurveTo(cx, cy + rh * 0.75, cx + rw * 1.05, cy - rh * 0.05); eg.stroke();
    eg.lineWidth = Math.max(1, rh * 0.14); eg.strokeStyle = 'rgba(80,44,32,0.55)';
    eg.beginPath(); eg.moveTo(cx - rw * 0.9, cy - rh * 0.55); eg.quadraticCurveTo(cx, cy - rh * 0.1, cx + rw * 0.9, cy - rh * 0.55); eg.stroke();
    void side;
  }
  // --- mouth cells
  const mouth = document.createElement('canvas'); mouth.width = W * MOUTH_SHAPES.length; mouth.height = Hh;
  const mg = mouth.getContext('2d')!;
  const [mx, my] = px(spec, base, spec.mouth); const mw = spec.mouthW * sc, mh = spec.mouthH * sc;
  MOUTH_SHAPES.forEach((shape, i) => {
    mg.save(); mg.translate(i * W, 0);
    mg.drawImage(base, 0, 0);
    const cover = (rx: number, ry: number, colour = lipC): void => { mg.save(); mg.filter = `blur(${Math.max(1, mh * 0.12)}px)`; mg.fillStyle = colour; mg.beginPath(); mg.ellipse(mx, my, rx, ry, 0, 0, Math.PI * 2); mg.fill(); mg.restore(); };
    const dark = 'rgb(58,16,20)';
    switch (shape) {
      case 'aa': { cover(mw * 0.62, mh * 1.25); mg.fillStyle = dark; mg.beginPath(); mg.ellipse(mx, my + mh * 0.05, mw * 0.42, mh * 0.78, 0, 0, Math.PI * 2); mg.fill(); mg.fillStyle = 'rgb(236,226,214)'; mg.beginPath(); mg.ellipse(mx, my - mh * 0.45, mw * 0.36, mh * 0.2, 0, 0, Math.PI * 2); mg.fill(); mg.fillStyle = 'rgb(150,70,74)'; mg.beginPath(); mg.ellipse(mx, my + mh * 0.45, mw * 0.26, mh * 0.26, 0, 0, Math.PI * 2); mg.fill(); break; }
      case 'oh': { cover(mw * 0.55, mh * 1.3); mg.fillStyle = dark; mg.beginPath(); mg.ellipse(mx, my, mw * 0.2, mh * 0.7, 0, 0, Math.PI * 2); mg.fill(); mg.strokeStyle = lipC; mg.lineWidth = mh * 0.18; mg.stroke(); break; }
      case 'ee': { cover(mw * 0.7, mh * 0.9); mg.fillStyle = dark; mg.beginPath(); mg.ellipse(mx, my, mw * 0.5, mh * 0.34, 0, 0, Math.PI * 2); mg.fill(); mg.fillStyle = 'rgb(236,226,214)'; mg.fillRect(mx - mw * 0.42, my - mh * 0.3, mw * 0.84, mh * 0.2); break; }
      case 'mm': { cover(mw * 0.6, mh * 0.7); mg.strokeStyle = 'rgba(60,20,22,0.85)'; mg.lineWidth = Math.max(1.5, mh * 0.18); mg.lineCap = 'round'; mg.beginPath(); mg.moveTo(mx - mw * 0.42, my); mg.quadraticCurveTo(mx, my + mh * 0.12, mx + mw * 0.42, my); mg.stroke(); break; }
      case 'flat': { cover(mw * 0.62, mh * 0.8); mg.strokeStyle = 'rgba(70,24,26,0.8)'; mg.lineWidth = Math.max(1.5, mh * 0.16); mg.lineCap = 'round'; mg.beginPath(); mg.moveTo(mx - mw * 0.4, my + mh * 0.02); mg.lineTo(mx + mw * 0.4, my + mh * 0.02); mg.stroke(); break; }
      case 'worry': { cover(mw * 0.62, mh * 0.85); mg.strokeStyle = 'rgba(70,24,26,0.85)'; mg.lineWidth = Math.max(1.5, mh * 0.17); mg.lineCap = 'round'; mg.beginPath(); mg.moveTo(mx - mw * 0.4, my + mh * 0.22); mg.quadraticCurveTo(mx, my - mh * 0.2, mx + mw * 0.4, my + mh * 0.22); mg.stroke(); break; }
      default: break; // smile: the painted one
    }
    mg.restore();
  });
  return { eyes, mouth };
}

const SHAPE_ROW: Record<string, number> = { visemeAA: 0, visemeOH: 1, visemeEE: 2, visemeMM: 3 };

/** Adds the face patches to a material and returns the object that drives them. */
export function addFaceLife(material: THREE.MeshStandardMaterial, base: HTMLCanvasElement, spec: FaceSpec): FaceLife {
  const { eyes, mouth } = paintPatches(base, spec);
  const tex = (c: HTMLCanvasElement): THREE.CanvasTexture => { const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 4; return t; };
  const uniforms: Record<string, THREE.IUniform> = {
    uRect: { value: new THREE.Vector4(...spec.rect) }, uEyes: { value: tex(eyes) }, uMouth: { value: tex(mouth) }, uBlink: { value: 0 },
    uCell: { value: new THREE.Vector3(0, 0, 0) }, uCells: { value: MOUTH_SHAPES.length },
    uMouthBox: { value: new THREE.Vector4(spec.mouth[0] - spec.mouthW * 0.9, spec.mouth[1] - spec.mouthH * 2.2, spec.mouth[0] + spec.mouthW * 0.9, spec.mouth[1] + spec.mouthH * 2.2) },
    uEyeBox: { value: new THREE.Vector4(Math.min(spec.eyeL[0], spec.eyeR[0]) - spec.eyeW * 1.4, spec.eyeL[1] - spec.eyeH * 3, Math.max(spec.eyeL[0], spec.eyeR[0]) + spec.eyeW * 1.4, spec.eyeL[1] + spec.eyeH * 3) },
  };
  material.onBeforeCompile = (shader) => {
    Object.assign(shader.uniforms, uniforms);
    shader.vertexShader = shader.vertexShader.replace('#include <common>', '#include <common>\nvarying vec3 vRest; varying vec3 vRestN;').replace('#include <begin_vertex>', '#include <begin_vertex>\nvRest = position; vRestN = normal;');
    shader.fragmentShader = shader.fragmentShader.replace('#include <common>', `#include <common>
varying vec3 vRest; varying vec3 vRestN;
uniform vec4 uRect, uMouthBox, uEyeBox; uniform sampler2D uEyes, uMouth; uniform float uBlink, uCells; uniform vec3 uCell;`).replace('#include <map_fragment>', `
vec4 sampledDiffuseColor = texture2D( map, vMapUv );
if (vRestN.z > 0.25) {
  vec2 q = (vRest.xy - uRect.xy) / (uRect.zw - uRect.xy);
  if (q.x > 0.0 && q.x < 1.0 && q.y > 0.0 && q.y < 1.0) {
    if (vRest.x > uEyeBox.x && vRest.x < uEyeBox.z && vRest.y > uEyeBox.y && vRest.y < uEyeBox.w) {
      vec4 p = texture2D(uEyes, q); sampledDiffuseColor.rgb = mix(sampledDiffuseColor.rgb, p.rgb, p.a * uBlink);
    }
    if (vRest.x > uMouthBox.x && vRest.x < uMouthBox.z && vRest.y > uMouthBox.y && vRest.y < uMouthBox.w) {
      vec3 a = texture2D(uMouth, vec2((q.x + uCell.x) / uCells, q.y)).rgb, b = texture2D(uMouth, vec2((q.x + uCell.y) / uCells, q.y)).rgb;
      vec3 m = mix(a, b, uCell.z);
      vec2 d = abs(vec2((vRest.x - (uMouthBox.x + uMouthBox.z) * 0.5) / (uMouthBox.z - uMouthBox.x), (vRest.y - (uMouthBox.y + uMouthBox.w) * 0.5) / (uMouthBox.w - uMouthBox.y))) * 2.0;
      float edge = 1.0 - smoothstep(0.78, 1.0, max(d.x, d.y));
      sampledDiffuseColor.rgb = mix(sampledDiffuseColor.rgb, m, edge);
    }
  }
}
diffuseColor *= sampledDiffuseColor;`);
  };
  material.customProgramCacheKey = () => 'aiface';
  const cellOf = (name: string): number => MOUTH_SHAPES.indexOf(name as typeof MOUTH_SHAPES[number]);
  let mixed = 0;
  return {
    uniforms, patches: { eyes, mouth, base },
    update(w) {
      (uniforms['uBlink']!.value as number) = Math.min(1, Math.max(w['blinkL'] ?? 0, w['blinkR'] ?? 0));
      // pick the strongest mouth shape; the painted smile is cell 4, the flat one 5, the worried one 6
      let best = 'smile', amt = 0;
      for (const [k, row] of Object.entries(SHAPE_ROW)) if ((w[k] ?? 0) > amt) { amt = w[k]!; best = MOUTH_SHAPES[row]!; }
      let rest = 'smile', restAmt = 1;
      if ((w['frown'] ?? 0) > 0.4) rest = 'worry'; else if ((w['smile'] ?? 0) < 0.2) rest = 'flat'; else rest = 'smile';
      const a = cellOf(rest), b = cellOf(best);
      const m = Math.min(1, amt / 0.35);
      (uniforms['uCell']!.value as THREE.Vector3).set(a, b, m); void restAmt; void mixed;
    },
  };
}
