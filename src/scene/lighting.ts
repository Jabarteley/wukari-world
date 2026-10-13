/** Shared time and light presets; no geometry, renderer, asset or venue-builder imports. */
import { lagosTime } from '../game/clock.ts';
import type { Lighting, Mood, TimeOfDay } from './types.ts';

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
    day: { sky: ['#e6efe6', '#5fa8e4'], hemi: ['#e4f0ff', '#c4a678', 1.6], sun: ['#ffe6b8', 2.9, [-16, 22, 9]], rim: ['#cfe2ff', 0.7], glow: 0.6, lamps: 0.1 },
    dusk: { sky: ['#ffa77a', '#4f4a8c'], hemi: ['#f6bfa8', '#7d6270', 1.4], sun: ['#ff8a4a', 2.3, [-24, 9, 6]], rim: ['#d6a8f0', 1], glow: 1.1, lamps: 0.9 },
    night: { sky: ['#2c3c6a', '#0c1226'], hemi: ['#a4b8f2', '#46405e', 1.2], sun: ['#a6c0f4', 1, [-12, 25, 8]], rim: ['#bcd0ff', 1], glow: 1.3, lamps: 1.7 },
  },
  indoor: {
    day: { sky: ['#e4eee8', '#7fb8e6'], hemi: ['#fff4e2', '#c9ae92', 1.85], sun: ['#ffe8c4', 2.5, [-12, 24, 12]], rim: ['#dfeaff', 0.5], glow: 0.85, lamps: 0.5 },
    dusk: { sky: ['#f0a07a', '#5f5590'], hemi: ['#ffdcba', '#9a806f', 1.65], sun: ['#ffa468', 1.8, [-20, 12, 9]], rim: ['#dcb8f0', 0.7], glow: 1.1, lamps: 1 },
    night: { sky: ['#232e4a', '#0e1324'], hemi: ['#f2dcbc', '#826c70', 1.5], sun: ['#b4c6f0', 1.1, [-12, 25, 8]], rim: ['#c6d4ff', 0.75], glow: 1.25, lamps: 1.4 },
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
export const lightingFor = (mood: string, time: unknown): Lighting => (LIGHTING[mood as Mood] || LIGHTING.outdoor)[isTimeOfDay(time) ? time : 'day'];
