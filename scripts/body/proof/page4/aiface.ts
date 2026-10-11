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
  const cam = new THREE.OrthographicCamera(-(x1 - x0) / 2, (x1 - x0) / 2, (y1 - y0) / 2, -(y1 - y0) / 2, 0.01, 10);
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
  const lipC = sample(bg, ...px(spec, base, spec.lip));
  const eyes = document.createElement('canvas'); eyes.width = 8; eyes.height = 8;
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

interface EyeState { blink: number; gx: number; gy: number; brow: number; inner: number; outer: number; mood: number }

/** The eyes and brows painted afresh each time their state changes, into a small canvas that covers both eyes and both brows. */
function makeEyePainter(base: HTMLCanvasElement, spec: FaceSpec): { canvas: HTMLCanvasElement; box: [number, number, number, number]; paint(st: EyeState): void } {
  const W = spec.eyeW, Hh = spec.eyeH;
  const browY = Math.max(spec.browL?.[1] ?? spec.eyeL[1] + 0.06, spec.browR?.[1] ?? spec.eyeR[1] + 0.06);
  const box: [number, number, number, number] = [Math.min(spec.eyeL[0], spec.eyeR[0]) - 0.085, Math.min(spec.eyeL[1], spec.eyeR[1]) - 0.05, Math.max(spec.eyeL[0], spec.eyeR[0]) + 0.085, browY + 0.05];
  const SC = 2400;
  const canvas = document.createElement('canvas'); canvas.width = Math.round((box[2] - box[0]) * SC); canvas.height = Math.round((box[3] - box[1]) * SC);
  const g = canvas.getContext('2d')!;
  const bg = base.getContext('2d')!;
  const rgbOf = (x: number, y: number): number[] => { const d = bg.getImageData(Math.round(px(spec, base, [x, y])[0]) - 2, Math.round(px(spec, base, [x, y])[1]) - 2, 5, 5).data; let r = 0, gg = 0, b = 0; for (let i = 0; i < d.length; i += 4) { r += d[i]!; gg += d[i + 1]!; b += d[i + 2]!; } const n = d.length / 4; return [r / n, gg / n, b / n]; };
  const pts = [spec.skin, [-spec.skin[0], spec.skin[1]], [0, browY + 0.045]].map((p) => rgbOf(p[0]!, p[1]!));
  const avg = [0, 1, 2].map((k) => Math.round(pts.reduce((a, c) => a + c[k]!, 0) / pts.length));
  const skinRgb = (a: number): string => `rgba(${avg[0]},${avg[1]},${avg[2]},${a})`;
  /** A soft-edged skin patch: opaque in the middle, fading to nothing at the rim. */
  const patch = (cx: number, cy: number, rx: number, ry: number): void => { g.save(); g.translate(cx, cy); g.scale(rx, ry); const rg = g.createRadialGradient(0, 0, 0, 0, 0, 1); rg.addColorStop(0, skinRgb(1)); rg.addColorStop(0.72, skinRgb(1)); rg.addColorStop(1, skinRgb(0)); g.fillStyle = rg; g.fillRect(-1, -1, 2, 2); g.restore(); };
  const cv = (p: [number, number]): [number, number] => [(p[0] - box[0]) * SC, (box[3] - p[1]) * SC];
  const m = (v: number): number => v * SC;
  const eye = (c: [number, number], side: number, st: EyeState): void => {
    const [cx, cy] = cv(c), w = m(W) / 2 * 1.08, h = m(Hh) / 2 * 1.12;
    // cover the painted eye (lashes and all) with skin
    patch(cx, cy - h * 0.05, w * 1.55, h * 2.7);
    const open = Math.max(0.0, 1 - st.blink) * (1 - 0.18 * st.mood);
    const top = cy - h * 0.95 * open + h * 0.12, bottom = cy + h * 0.78 - h * 0.18 * (1 - open);
    const x0 = cx - w * 1.02, x1 = cx + w * 1.02;
    const lid = (): void => { g.beginPath(); g.moveTo(x0, cy + h * 0.1); g.quadraticCurveTo(cx - w * 0.1 * side, top - h * 0.22 * open, x1, cy + h * 0.14); g.quadraticCurveTo(cx, bottom + h * 0.25, x0, cy + h * 0.1); g.closePath(); };
    if (open > 0.06) {
      g.save(); lid(); g.clip();
      const sc = g.createLinearGradient(0, top, 0, bottom); sc.addColorStop(0, 'rgb(205,192,182)'); sc.addColorStop(0.25, 'rgb(244,236,228)'); sc.addColorStop(1, 'rgb(250,244,238)');
      g.fillStyle = sc; g.fillRect(x0, top - h, x1 - x0, bottom - top + 2 * h);
      const ir = h * 1.02, ix = cx + st.gx * w * 0.26, iy = cy + h * 0.02 - st.gy * h * 0.18;
      const ig = g.createRadialGradient(ix, iy, ir * 0.1, ix, iy, ir); ig.addColorStop(0, 'rgb(14,8,7)'); ig.addColorStop(0.45, 'rgb(38,22,17)'); ig.addColorStop(0.85, 'rgb(86,52,38)'); ig.addColorStop(1, 'rgb(40,24,18)');
      g.fillStyle = ig; g.beginPath(); g.arc(ix, iy, ir, 0, Math.PI * 2); g.fill();
      g.fillStyle = 'rgb(8,5,5)'; g.beginPath(); g.arc(ix, iy, ir * 0.46, 0, Math.PI * 2); g.fill();
      g.fillStyle = 'rgba(255,255,255,0.95)'; g.beginPath(); g.arc(ix + ir * 0.32, iy - ir * 0.34, ir * 0.2, 0, Math.PI * 2); g.fill();
      g.fillStyle = 'rgba(255,255,255,0.5)'; g.beginPath(); g.arc(ix - ir * 0.3, iy + ir * 0.3, ir * 0.1, 0, Math.PI * 2); g.fill();
      // shadow of the upper lid on the eye
      const sh = g.createLinearGradient(0, top, 0, top + h * 0.7); sh.addColorStop(0, 'rgba(10,5,4,0.55)'); sh.addColorStop(1, 'rgba(10,5,4,0)'); g.fillStyle = sh; g.fillRect(x0, top - h, x1 - x0, h * 2);
      g.restore();
    }
    // lash line along the upper lid, with the wing at the outer corner
    g.strokeStyle = 'rgb(26,15,12)'; g.lineCap = 'round'; g.lineJoin = 'round'; g.lineWidth = Math.max(2, h * 0.34);
    g.beginPath(); g.moveTo(x0 - w * 0.02, cy + h * 0.12); g.quadraticCurveTo(cx - w * 0.1 * side, top - h * 0.3 * open - h * 0.05, x1, cy + h * 0.16); g.stroke();
    g.lineWidth = Math.max(1.5, h * 0.2);
    const ox = side > 0 ? x1 : x0, dir = side > 0 ? 1 : -1;
    g.beginPath(); g.moveTo(ox, cy + h * 0.15); g.lineTo(ox + dir * w * 0.16, cy - h * 0.12); g.stroke();
    g.strokeStyle = 'rgba(70,40,30,0.4)'; g.lineWidth = Math.max(1, h * 0.12);
    g.beginPath(); g.moveTo(x0 + w * 0.15, cy + h * 0.2); g.quadraticCurveTo(cx, bottom + h * 0.3, x1 - w * 0.15, cy + h * 0.2); g.stroke();
  };
  const brow = (c: [number, number], side: number, st: EyeState): void => {
    const bw = spec.browW ?? 0.1;
    const [cx, cy] = cv(c);
    patch(cx, cy, m(bw) * 0.78, m(0.05));
    const inX = cx - side * m(bw) * 0.5, outX = cx + side * m(bw) * 0.5;
    const rise = m(st.brow), inn = m(st.inner), out = m(st.outer);
    g.strokeStyle = 'rgb(34,22,17)'; g.lineCap = 'round';
    for (const [lw, a] of [[m(0.0155), 1], [m(0.0085), 1]] as [number, number][]) {
      g.lineWidth = lw; g.globalAlpha = a;
      g.beginPath(); g.moveTo(inX, cy + m(0.004) - rise - inn); g.quadraticCurveTo(cx - side * m(bw) * 0.05, cy - m(0.016) - rise - inn * 0.4, outX, cy + m(0.006) - rise + out); g.stroke();
    }
    g.globalAlpha = 1;
  };
  let key = '';
  return {
    canvas, box,
    paint(st) {
      const k = [st.blink, st.gx, st.gy, st.brow * 4000, st.inner * 4000, st.outer * 4000, st.mood].map((v) => Math.round(v * 40)).join(',');
      if (k === key) return; key = k;
      g.clearRect(0, 0, canvas.width, canvas.height);
      // the baked eye and brow are covered only inside the box, so nothing outside it is touched
      eye(spec.eyeL, 1, st); eye(spec.eyeR, -1, st);
      if (spec.browL) brow(spec.browL, 1, st);
      if (spec.browR) brow(spec.browR, -1, st);
      (canvas as HTMLCanvasElement & { dirty?: boolean }).dirty = true;
    },
  };
}

/** Adds the face patches to a material and returns the object that drives them. */
export function addFaceLife(material: THREE.MeshStandardMaterial, base: HTMLCanvasElement, spec: FaceSpec): FaceLife {
  const { mouth } = paintPatches(base, spec);
  const painter = makeEyePainter(base, spec);
  const tex = (c: HTMLCanvasElement): THREE.CanvasTexture => { const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 4; return t; };
  const eyeTex = tex(painter.canvas);
  const uniforms: Record<string, THREE.IUniform> = {
    uRect: { value: new THREE.Vector4(...spec.rect) }, uEyes: { value: eyeTex }, uMouth: { value: tex(mouth) }, uBlink: { value: 0 },
    uCell: { value: new THREE.Vector3(4, 4, 0) }, uCells: { value: MOUTH_SHAPES.length },
    uMouthBox: { value: new THREE.Vector4(spec.mouth[0] - spec.mouthW * 0.9, spec.mouth[1] - spec.mouthH * 2.2, spec.mouth[0] + spec.mouthW * 0.9, spec.mouth[1] + spec.mouthH * 2.2) },
    uEyeBox: { value: new THREE.Vector4(...painter.box) },
  };
  painter.paint({ blink: 0, gx: 0, gy: 0, brow: 0, inner: 0, outer: 0, mood: 0 });
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
      vec4 p = texture2D(uEyes, (vRest.xy - uEyeBox.xy) / (uEyeBox.zw - uEyeBox.xy)); sampledDiffuseColor.rgb = mix(sampledDiffuseColor.rgb, p.rgb, p.a * uBlink);
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
  material.customProgramCacheKey = () => 'aiface2';
  let mix = 0;
  const cellOf = (name: string): number => MOUTH_SHAPES.indexOf(name as typeof MOUTH_SHAPES[number]);
  return {
    uniforms, patches: { eyes: painter.canvas, mouth, base },
    update(w) {
      const blink = Math.min(1, Math.max(w['blinkL'] ?? 0, w['blinkR'] ?? 0));
      const smile = w['smile'] ?? 0, frown = w['frown'] ?? 0;
      const active = blink > 0.02 || Math.abs(w['gazeX'] ?? 0) > 0.12 || Math.abs(w['gazeY'] ?? 0) > 0.2 || (w['browInnerUpL'] ?? 0) > 0.05 || (w['browUpL'] ?? 0) > 0.05 || (w['browDownL'] ?? 0) > 0.05 || frown > 0.1;
      mix += ((active ? 1 : 0) - mix) * 0.5; uniforms['uBlink']!.value = mix < 0.02 ? 0 : mix;
      if (mix >= 0.02) painter.paint({
        blink, gx: Math.max(-1, Math.min(1, w['gazeX'] ?? 0)), gy: Math.max(-1, Math.min(1, w['gazeY'] ?? 0)),
        brow: 0.012 * (((w['browUpL'] ?? 0) + (w['browUpR'] ?? 0)) / 2) - 0.008 * (((w['browDownL'] ?? 0) + (w['browDownR'] ?? 0)) / 2),
        inner: 0.016 * (((w['browInnerUpL'] ?? 0) + (w['browInnerUpR'] ?? 0)) / 2) - 0.006 * (((w['browDownL'] ?? 0) + (w['browDownR'] ?? 0)) / 2),
        outer: 0.004 * frown, mood: frown * 0.5 - smile * 0.1,
      });
      if (mix >= 0.02 && (painter.canvas as HTMLCanvasElement & { dirty?: boolean }).dirty) { eyeTex.needsUpdate = true; (painter.canvas as HTMLCanvasElement & { dirty?: boolean }).dirty = false; }
      let best = 'smile', amt = 0;
      for (const [k, row] of Object.entries(SHAPE_ROW)) if ((w[k] ?? 0) > amt) { amt = w[k]!; best = MOUTH_SHAPES[row]!; }
      const rest = frown > 0.4 ? 'worry' : smile < 0.2 ? 'flat' : 'smile';
      (uniforms['uCell']!.value as THREE.Vector3).set(cellOf(rest), cellOf(best), Math.min(1, amt / 0.35));
    },
  };
}
