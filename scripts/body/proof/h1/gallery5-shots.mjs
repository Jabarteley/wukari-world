// @ts-nocheck -- offline helper: shot list of the roster gallery.   node gallery5-shots.mjs <out.json>
import { writeFileSync } from 'node:fs';
const shots = []; const add = (name, spec) => shots.push({ name, spec });
const MEN = ['m1', 'm2', 'm3', 'm4', 'm5', 'm6'], WOMEN = ['w1', 'w2', 'w3', 'w4', 'w5', 'w6'], ALL = [...MEN, ...WOMEN];
const PRINT = { m5: 1, m6: 1, w1: 1, w6: 1 }, ROWS = { m1: ['top', 'bottom'], m2: ['top'], m3: ['top'], m4: ['top', 'bottom'], m5: ['top', 'bottom'], m6: ['top', 'bottom'], w1: ['top', 'bottom'], w2: ['top'], w3: ['top', 'bottom'], w4: ['top', 'bottom'], w5: ['top', 'bottom'], w6: ['top'] };
const cam = (t, d, az = 0, lift = 0.4, fov = 30) => ({ target: t, dist: d, az, lift, fov });
const wide = (picks, name, o = {}) => add(name, { picks, pose: 'idle', cols: picks.length, spacingX: 1.0, width: 1900, height: 700, cam: cam([0, 1.0, 0], 8.0, 0, 0.5, 30), ...o });
wide(ALL.slice(0, 6).map((id) => ({ id })), 'roster-men-front'); wide(ALL.slice(6).map((id) => ({ id })), 'roster-women-front');
wide(MEN.map((id) => ({ id })), 'roster-men-back', { rys: Array(6).fill(Math.PI) }); wide(WOMEN.map((id) => ({ id })), 'roster-women-back', { rys: Array(6).fill(Math.PI) });
wide(MEN.map((id) => ({ id })), 'roster-men-side', { rys: Array(6).fill(1.5) }); wide(WOMEN.map((id) => ({ id })), 'roster-women-side', { rys: Array(6).fill(1.5) });
const PRESETS = [{ top: '#1f2b44', bottom: '#7a5a3c', skin: '#8a5a38' }, { top: '#6e2a35', bottom: '#2b2b2f', skin: '#523320', print: 'b' }, { top: '#2f6e68', bottom: '#e6dcc4', skin: '#c48f66', print: 'd' }];
for (const id of ALL) {
  const picks = [{ id }];
  PRESETS.forEach((p, i) => { const q = { id, skin: p.skin }; for (const r of ROWS[id]) q[r] = r === 'top' ? p.top : p.bottom; if (PRINT[id] && p.print) q.print = p.print; picks.push(q); });
  add(`outfits-${id}`, { picks, pose: 'idle', cols: 4, spacingX: 0.9, width: 1100, height: 620, cam: cam([0, 1.0, 0], 5.6, 0, 0.4, 30) });
}
const faceCam = (id) => cam([0, id[0] === 'w' ? 1.58 : 1.68, 0], 1.0, 0, 0, 28);
for (const id of ALL) for (const [ry, n] of [[0, 'front'], [0.7, 'tq'], [1.5, 'side']]) add(`face-${id}-${n}`, { picks: [{ id }], pose: 'idle', rys: [ry], cols: 1, spacingX: 1, width: 500, height: 500, cam: faceCam(id) });
add('wall-men', { random: { n: 12, seed: 11, sex: 'male' }, pose: 'idle', cols: 6, spacingX: 0.9, spacingZ: 1.7, width: 2000, height: 1000, cam: cam([0, 1.0, 0], 10.5, 0, 1.1, 30) });
add('wall-women', { random: { n: 12, seed: 22, sex: 'female' }, pose: 'idle', cols: 6, spacingX: 0.9, spacingZ: 1.7, width: 2000, height: 1000, cam: cam([0, 1.0, 0], 10.5, 0, 1.1, 30) });
add('wall-24', { random: { n: 24, seed: 33 }, pose: 'idle', cols: 8, spacingX: 0.85, spacingZ: 1.5, width: 2200, height: 1100, cam: cam([0, 1.0, 0], 12.5, 0, 1.6, 30) });
add('walk-eight', { random: { n: 8, seed: 44 }, pose: 'walk', phases: [0.05, 0.2, 0.35, 0.5, 0.65, 0.8, 0.92, 0.28], cols: 8, spacingX: 1.0, width: 2000, height: 640, cam: cam([0, 1.0, 0], 9.5, 0, 0.5, 30) });
add('walk-eight-crowd', { random: { n: 8, seed: 44, lod: 'crowd' }, pose: 'walk', phases: [0.05, 0.2, 0.35, 0.5, 0.65, 0.8, 0.92, 0.28], cols: 8, spacingX: 1.0, width: 2000, height: 640, cam: cam([0, 1.0, 0], 9.5, 0, 0.5, 30) });
for (const [pose, ph] of [['walk', 0.28], ['jog', 0.3], ['dance', 0.4], ['sit', 0.5]]) wide(ALL.map((id) => ({ id })), `moves-${pose}`, { pose, phase: ph, spacingX: 0.95, cam: cam([0, 1.0, 0], 12.5, 0, 0.8, 30), width: 2200, height: 700, rys: Array(12).fill(0.5) });
add('crowd-vs-player', { picks: ['m1', 'w1', 'm6', 'w3'].flatMap((id) => [{ id }, { id, lod: 'crowd' }]), pose: 'walk', phase: 0.3, cols: 8, spacingX: 0.95, width: 2000, height: 700, cam: cam([0, 1.0, 0], 9.5, 0, 0.5, 30) });
add('street-40', { fn: 'street', street: { n: 40, seed: 77 }, width: 1900, height: 900 });
add('today-beside', { fn: 'withToday', extra: { body: 'man', hair: 'lowcut', outfit: 'kaftan', fabric: 'plain', skin: '#8a5a38', hairColor: '#1c1917', outfitColor: '#2f7d78', bottomsColor: '#243a66', accessories: [], face: 'oval', expression: 'smile' }, picks: [{ id: 'm2' }, { id: 'w2' }], pose: 'idle', cols: 3, spacingX: 1.4, width: 1500, height: 800, cam: cam([-0.4, 1.0, 0], 6.0, 0, 0.4, 30) });
writeFileSync(process.argv[2], JSON.stringify(shots)); console.log(shots.length, 'shots');
