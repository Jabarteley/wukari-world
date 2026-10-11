/** Shared time and light presets; no geometry, renderer, asset or venue-builder imports. */
import { lagosTime } from '../game/clock.ts';
import type { Colour, Lighting, Mood, TimeOfDay } from './types.ts';

export const TIMES: readonly TimeOfDay[] = Object.freeze<TimeOfDay[]>(['day', 'dusk', 'night']);
export const isTimeOfDay = (value: unknown): value is TimeOfDay => TIMES.includes(value as TimeOfDay);

/**
 * Day / dusk / night presets per mood. sky: [horizon, zenith]; hemi: [sky, ground, intensity];
 * sun: [colour, intensity, position]; rim: [colour, intensity] (the host's back light);
 * glow: strength of lit surfaces; lamps: point-light scale.
 *
 * LIT FOR EVERY SKIN TONE. The hemisphere's ground colour is the light that reaches a face from
 * below: it is a warm bounce off sand, laterite or a wooden floor — never dark green or near-black,
 * which is what turned the darkest skin tones into silhouettes. Night keeps a hemisphere of at
 * least 1 and leans on the rim light, so people stay readable against a dark sky; the club keeps
 * its purple but gets a warmer floor bounce for faces.
 */
export const LIGHTING: Readonly<Record<Mood, Readonly<Record<TimeOfDay, Lighting>>>> = Object.freeze({
  outdoor: {
    day: { sky: ['#cfe9f3', '#6fb4e6'], hemi: ['#e4f0ff', '#bca57f', 1.0], sun: ['#fff1d6', 2.9, [-18, 22, 4]], rim: ['#cfe2ff', 0.7], glow: 0.6, lamps: 0.1 },
    dusk: { sky: ['#f0b48c', '#5d528f'], hemi: ['#c4bde6', '#9a7a6c', 1.0], sun: ['#ffa468', 2.7, [-22, 11, 7]], rim: ['#c9b6f0', 0.9], glow: 1.05, lamps: 0.8 },
    night: { sky: ['#243152', '#0b1020'], hemi: ['#9fb4e6', '#3a3550', 1.1], sun: ['#9fb9ea', 1.1, [-12, 25, 8]], rim: ['#bcd0ff', 0.95], glow: 1.3, lamps: 1.6 },
  },
  indoor: {
    day: { sky: ['#d6e9ef', '#8cc0e2'], hemi: ['#fff6ea', '#cdbba6', 1.5], sun: ['#fff1d8', 2.6, [-18, 22, 4]], rim: ['#dfeaff', 0.5], glow: 0.85, lamps: 0.45 },
    dusk: { sky: ['#e3a37c', '#6f5f95'], hemi: ['#ffe4c7', '#a8937f', 1.3], sun: ['#ffb57c', 2.2, [-22, 11, 7]], rim: ['#d9c8f2', 0.6], glow: 1.05, lamps: 0.85 },
    night: { sky: ['#232e4a', '#0e1324'], hemi: ['#ecdfc9', '#7a6f78', 1.3], sun: ['#c9d3ee', 0.9, [-12, 25, 8]], rim: ['#c6d4ff', 0.7], glow: 1.2, lamps: 1.1 },
  },
  club: {
    day: { sky: ['#241d3a', '#120f1f'], hemi: ['#b3a2ea', '#4a3550', 1.1], sun: ['#c0b0ff', 0.7, [-10, 26, 10]], rim: ['#ffd9b0', 0.8], glow: 1.2, lamps: 1.05 },
    dusk: { sky: ['#221b36', '#110e1d'], hemi: ['#a996e2', '#46324c', 1.05], sun: ['#b8a4ff', 0.6, [-10, 26, 10]], rim: ['#ffd9b0', 0.8], glow: 1.3, lamps: 1.15 },
    night: { sky: ['#1e1833', '#0d0a18'], hemi: ['#a08cdc', '#422f48', 1], sun: ['#b8a4ff', 0.55, [-10, 26, 10]], rim: ['#ffd9b0', 0.85], glow: 1.35, lamps: 1.2 },
  },
});

/** Lagos time of day from server ms: day 06:30–17:30, dusk for the hour either side of night. */
export function timeOfDay(ms: number): TimeOfDay {
  const { minuteOfDay } = lagosTime(ms);
  if (minuteOfDay >= 390 && minuteOfDay < 1050) return 'day';
  if ((minuteOfDay >= 330 && minuteOfDay < 390) || (minuteOfDay >= 1050 && minuteOfDay < 1170)) return 'dusk';
  return 'night';
}
/** How many minutes the light holds still between one step and the next: the sun moves in steps, and a scene is drawn again at most once per step. */
export const LIGHT_STEP = 5;
/** The minute of the Lagos day (0-1439) the light is at: server ms, floored to the step. */
export const lagosMinute = (ms: number): number => Math.floor(lagosTime(ms).minuteOfDay / LIGHT_STEP) * LIGHT_STEP;
export const lightingFor = (mood: string, time: unknown): Lighting => (LIGHTING[mood as Mood] || LIGHTING.outdoor)[isTimeOfDay(time) ? time : 'day'];


/** Lagos sunrise and sunset, in minutes of the day (06:30 and 18:45). */
const SUNRISE = 390, SUNSET = 1125;
const smooth = (a: number, b: number, x: number): number => { const t = Math.min(1, Math.max(0, (x - a) / (b - a))); return t * t * (3 - 2 * t); };
/** How high the sun is at a minute of the day: sin of its arc by day (0 at the horizon, 1 at noon), a shallow negative by night. */
export function sunHeight(minute: number): number {
  const m = ((minute % 1440) + 1440) % 1440;
  if (m >= SUNRISE && m <= SUNSET) return Math.sin(Math.PI * (m - SUNRISE) / (SUNSET - SUNRISE));
  const into = m > SUNSET ? m - SUNSET : m + 1440 - SUNSET;
  return -0.25 * Math.sin(Math.PI * into / (1440 - (SUNSET - SUNRISE)));
}
/** How much of the night, dusk and day looks the sky has at a minute of the Lagos day (they sum to 1): the sun's height decides. */
export function skyWeights(minute: number): [number, number, number] {
  const height = sunHeight(minute);
  const day = smooth(0.16, 0.5, height), night = 1 - smooth(-0.16, 0.06, height);
  return [night, Math.max(0, 1 - day - night), day];
}
const hex = (value: Colour): [number, number, number] => { const n = parseInt(String(value).slice(1), 16); return [(n >> 16) & 255, (n >> 8) & 255, n & 255]; };
/** The weighted mean of three colours (weights sum to 1). */
export function mix3(a: Colour, b: Colour, c: Colour, wa: number, wb: number, wc: number): Colour {
  const x = hex(a), y = hex(b), z = hex(c);
  return `#${[0, 1, 2].map((i) => Math.round(x[i]! * wa + y[i]! * wb + z[i]! * wc).toString(16).padStart(2, '0')).join('')}`;
}
/** [night, dusk, day] fog distances: where the fog starts and ends, as multiples of how far the camera is from what it looks at. */
const FOG_REACH: readonly (readonly [number, number])[] = [[1, 2.8], [1.2, 3.4], [1.4, 4.2]];

/**
 * The light of a mood at a minute of the Lagos day: the day, dusk and night presets blended by the sun's height, so the light
 * eases through the morning and the evening instead of switching, and the sun crosses the sky (low and warm at the ends of the
 * day, high at noon; by night the preset's moon). Also says how dark it is and where the fog stands. Pure and cheap.
 */
export function lightingAt(mood: string, minute: number): Lighting {
  const set = LIGHTING[mood as Mood] || LIGHTING.outdoor;
  const height = sunHeight(minute), w = skyWeights(minute), [night, dusk] = w;
  const t = [set.night, set.dusk, set.day] as const;
  const num = (pick: (l: Lighting) => number) => t.reduce((sum, l, i) => sum + pick(l) * w[i]!, 0);
  const col = (pick: (l: Lighting) => Colour) => mix3(pick(t[0]), pick(t[1]), pick(t[2]), w[0], w[1], w[2]);
  // The sun's path: from the left of the camera's view, across to the right, never straight overhead (a shadow that falls away from the camera is hidden), higher towards noon; at night the preset's moon.
  const noon = Math.max(height, 0.02), across = -Math.cos(Math.PI * Math.min(1, Math.max(0, ((((minute % 1440) + 1440) % 1440) - SUNRISE) / (SUNSET - SUNRISE))));
  const moon = set.night.sun[2];
  const place = (axis: 0 | 1 | 2, sun: number) => Math.round((sun * (1 - night) + moon[axis] * night) * 100) / 100;
  const sky: [Colour, Colour] = [col((l) => l.sky[0]), col((l) => l.sky[1])];
  return {
    sky,
    hemi: [col((l) => l.hemi[0]), col((l) => l.hemi[1]), num((l) => l.hemi[2])],
    sun: [col((l) => l.sun[0]), num((l) => l.sun[1]), [place(0, -16 + across * 20), place(1, 8 + 14 * noon), place(2, 4)]],
    rim: [col((l) => l.rim[0]), num((l) => l.rim[1])],
    glow: num((l) => l.glow), lamps: num((l) => l.lamps),
    night: night + dusk * 0.5,
    fog: [sky[0], FOG_REACH.reduce((sum, r, i) => sum + r[0] * w[i]!, 0), FOG_REACH.reduce((sum, r, i) => sum + r[1] * w[i]!, 0)],
  };
}
