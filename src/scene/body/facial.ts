import type { Expression } from '../characters.ts';
import type { BodyKey } from './manifest.ts';

/** Pixel measurements from the embedded 1024 px base-colour images in the shipped body GLBs. */
const FACE_ATLAS = {
  male: { eyes: [141 / 1024, 240 / 1024, 182 / 1024], mouth: [187 / 1024, 273 / 1024] },
  female: { eyes: [134 / 1024, 239 / 1024, 182 / 1024], mouth: [187 / 1024, 269 / 1024] },
} as const satisfies Record<BodyKey, { eyes: readonly [number, number, number]; mouth: readonly [number, number] }>;

export function faceAtlas(key: BodyKey): (typeof FACE_ATLAS)[BodyKey] {
  return FACE_ATLAS[key];
}

export const FACIAL_FRAGMENT_PARS = /* glsl */ `
uniform float uExpression, uExpressionMotion, uBlink, uSleeping;
uniform vec3 uEyeUv;
uniform vec2 uMouthUv;`;

/** Replace Three's map fragment. `faceMask` is the base body's skin-region mask, or 1 in the fit preview. */
export function facialMapFragment(faceMask: 'vRegion.r' | '1.0'): string {
  return /* glsl */ `
#ifdef USE_MAP
  float allworldFace = ${faceMask};
  float mouthX = (vMapUv.x - uMouthUv.x) / 0.046;
  float mouthZone = (1.0 - smoothstep(0.82, 1.08, abs(mouthX)))
    * (1.0 - smoothstep(0.025, 0.036, abs(vMapUv.y - uMouthUv.y))) * allworldFace;
  float expression = clamp(uExpression * (0.96 + 0.08 * uExpressionMotion), 0.0, 1.0) * (1.0 - uSleeping);
  vec2 allworldMapUv = vMapUv;
  allworldMapUv.y += mouthZone * expression * mouthX * mouthX * 0.009;
  vec4 sampledDiffuseColor = texture2D(map, allworldMapUv);
  #ifdef DECODE_VIDEO_TEXTURE
    sampledDiffuseColor = sRGBTransferEOTF(sampledDiffuseColor);
  #endif
  diffuseColor *= sampledDiffuseColor;

  vec3 faceTexel = diffuseColor.rgb;
  // The shipped base atlas paints the socket but contains no eyeball. Keep its lids and shade,
  // then fill only the aperture; all features stay in the existing body material and UV island.
  float eyeDx = abs(vMapUv.x - uEyeUv.x) < abs(vMapUv.x - uEyeUv.y)
    ? vMapUv.x - uEyeUv.x : vMapUv.x - uEyeUv.y;
  float eyeDy = vMapUv.y - uEyeUv.z;
  float aperture = 1.0 - smoothstep(0.83, 1.0, length(vec2(eyeDx / 0.025, eyeDy / 0.010)));
  float irisDistance = length(vec2(eyeDx / 0.009, eyeDy / 0.011));
  float iris = 1.0 - smoothstep(0.84, 1.0, irisDistance);
  float pupil = 1.0 - smoothstep(0.36, 0.5, irisDistance);
  vec3 eyeColour = vec3(0.72, 0.69, 0.62) * (1.0 - 0.16 * smoothstep(0.0, 0.009, -eyeDy));
  eyeColour = mix(eyeColour, mix(vec3(0.16, 0.075, 0.035), vec3(0.055, 0.033, 0.022), smoothstep(0.65, 1.0, irisDistance)), iris);
  eyeColour = mix(eyeColour, vec3(0.012, 0.009, 0.008), pupil);
  float glint = 1.0 - smoothstep(0.0007, 0.0016, length(vec2(eyeDx + 0.0025, eyeDy + 0.003)));
  eyeColour = mix(eyeColour, vec3(0.9, 0.87, 0.79), glint * iris);
  faceTexel = mix(faceTexel, eyeColour, aperture * allworldFace);
  float blink = max(uSleeping, uBlink);
  if (blink > 0.001) {
    float dx = eyeDx;
    float eye = (1.0 - smoothstep(0.82, 1.0, length(vec2(dx / 0.031, (vMapUv.y - uEyeUv.z) / 0.014)))) * allworldFace;
    vec3 cheek = texture2D(map, vec2(vMapUv.x, 0.205)).rgb;
    float lidY = uEyeUv.z + 0.0003 + 0.003 * (1.0 - min(1.0, dx * dx / 0.0009));
    float lid = (1.0 - smoothstep(0.0011, 0.0023, abs(vMapUv.y - lidY)))
      * (1.0 - smoothstep(0.026, 0.031, abs(dx)));
    faceTexel = mix(faceTexel, mix(cheek, cheek * 0.22, lid), eye * blink);
  }
  float grin = smoothstep(0.78, 0.98, expression);
  float smileY = uMouthUv.y - expression * mouthX * mouthX * 0.006;
  float tooth = (1.0 - smoothstep(0.55, 0.76, abs(mouthX)))
    * (1.0 - smoothstep(0.0025, 0.0065 + 0.0015 * uExpressionMotion, abs(vMapUv.y - smileY)))
    * grin * allworldFace;
  diffuseColor.rgb = mix(faceTexel, vec3(0.86, 0.78, 0.66), tooth);
#endif`;
}

export interface FacialState {
  expression: number;
  expressionMotion: number;
  blink: number;
}

export interface FacialSampler {
  readonly state: Readonly<FacialState>;
  wear(expression: Expression, seed: unknown): void;
  sample(seconds: number): void;
  settle(): void;
}

const EXPRESSION: Readonly<Record<Expression, number>> = Object.freeze({ neutral: 0, smile: 0.58, grin: 1 });

function seedHash(seed: unknown): number {
  const text = String(seed ?? 'allworld-face');
  let value = 2166136261;
  for (let i = 0; i < text.length; i++) value = Math.imul(value ^ text.charCodeAt(i), 16777619);
  return value >>> 0;
}

/**
 * No clock and no frame ownership: callers sample it only while their existing body motion already runs.
 * A settled body always has natural open eyes and keeps only its saved expression.
 */
export function createFacialSampler(expression: Expression, seed: unknown): FacialSampler {
  const state: FacialState = { expression: EXPRESSION[expression], expressionMotion: 0.5, blink: 0 };
  let hash = seedHash(seed);
  let cycle = 4.2 + (hash % 170) / 100;
  let offset = ((hash >>> 8) % 1000) / 1000 * cycle;
  let motionPhase = ((hash >>> 18) % 1000) / 1000 * Math.PI * 2;

  function wear(next: Expression, nextSeed: unknown): void {
    hash = seedHash(nextSeed);
    cycle = 4.2 + (hash % 170) / 100;
    offset = ((hash >>> 8) % 1000) / 1000 * cycle;
    motionPhase = ((hash >>> 18) % 1000) / 1000 * Math.PI * 2;
    state.expression = EXPRESSION[next];
    state.expressionMotion = 0.5;
    state.blink = 0;
  }
  function blinkPulse(at: number, start: number): number {
    const within = at - start;
    return within >= 0 && within <= 0.16 ? Math.sin(Math.PI * within / 0.16) ** 2 : 0;
  }
  return {
    state,
    wear,
    sample(seconds) {
      const time = Math.max(0, Number.isFinite(seconds) ? seconds : 0);
      const within = (time + offset) % cycle;
      const first = blinkPulse(within, 0);
      const second = (hash & 1) === 0 ? blinkPulse(within, 0.24) * 0.86 : 0;
      state.blink = Math.max(first, second);
      state.expressionMotion = 0.5 + 0.5 * Math.sin(time * 0.82 + motionPhase);
    },
    settle() { state.blink = 0; state.expressionMotion = 0.5; },
  };
}
