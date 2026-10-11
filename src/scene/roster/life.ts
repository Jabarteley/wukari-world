/**
 * The face of a roster figure: moods, the blink and the glance (a small version of the proof's life layer; everything is applied
 * to the shape keys and the painted eyes, never to the clip's bones, so it never accumulates on a pose).
 *
 *   rest()      one still face for a mood, drawn without time (a standing figure in a scene the game draws on demand).
 *   step(dt)    advance the blink and the glance by dt seconds; true while the face is moving and wants another frame.
 *
 * The host calls step only on frames it is drawing anyway (walking, a sit, the creator's turntable): the game never asks for a frame
 * to blink. Pure but for the figure's two methods, so it runs under `node --test` with a stub.
 */
export type Mood = 'neutral' | 'happy' | 'uneasy';
type Weights = Readonly<Record<string, number>>;

export const MOODS: Readonly<Record<Mood, Weights>> = Object.freeze({
  neutral: { smile: 0.38 },
  happy: { smile: 1, browUpL: 0.3, browUpR: 0.3 },
  uneasy: { frown: 0.9, browInnerUpL: 1, browInnerUpR: 1, browDownL: 0.15, browDownR: 0.15 },
});

/** What the face needs of a figure (RosterFigure has both). */
export interface FaceSurface {
  eyes(blink: number, gazeX: number, gazeY: number): void;
  shape(weights: Readonly<Record<string, number>>): void;
}

/** A blink: 0 open … 1 shut, closing in 70 ms, shut for 30 ms, opening in 100 ms. */
export const blinkAt = (seconds: number): number => (seconds < 0 ? 0 : seconds < 0.07 ? seconds / 0.07 : seconds < 0.1 ? 1 : seconds < 0.2 ? 1 - (seconds - 0.1) / 0.1 : 0);

export interface FaceLife {
  mood: Mood;
  /** Eyes shut (sleeping) until set false. */
  asleep: boolean;
  rest(): void;
  step(dt: number): boolean;
}

export function createFaceLife(face: FaceSurface, seed = 1): FaceLife {
  const random = (n: number): number => { const x = Math.sin((seed + n) * 12.9898) * 43758.5453; return x - Math.floor(x); };
  let time = 0, nextBlink = 1.2 + random(0) * 2.5, blinkStart = -10, glanceUntil = 0, glanceX = 0, glanceY = 0, shut = 0;
  const apply = (blink: number): void => {
    const weights: Record<string, number> = { ...MOODS[life.mood] };
    weights.blinkL = blink; weights.blinkR = blink;
    face.shape(weights);
    face.eyes(blink, glanceX, glanceY);
  };
  const life: FaceLife = {
    mood: 'neutral', asleep: false,
    rest() { glanceX = 0; glanceY = 0; shut = life.asleep ? 1 : 0; apply(shut); },
    step(dt) {
      time += dt;
      if (time >= nextBlink) { blinkStart = time; nextBlink = time + 2.2 + random(Math.floor(time)) * 3.8; }
      if (time >= glanceUntil && random(Math.floor(time * 2) + 7) > 0.7) { glanceUntil = time + 0.8; glanceX = (random(Math.floor(time) + 3) - 0.5) * 1.2; glanceY = (random(Math.floor(time) + 5) - 0.5) * 0.4; }
      else if (time >= glanceUntil) { glanceX = 0; glanceY = 0; }
      const blink = life.asleep ? 1 : blinkAt(time - blinkStart);
      if (blink !== shut || blink > 0 || glanceX !== 0 || glanceY !== 0) { shut = blink; apply(blink); }
      return blink > 0 || time - blinkStart < 0.25;
    },
  };
  return life;
}
