// @ts-nocheck -- offline build helper for the figure proof, run by hand; reads untyped JSON
// Writes the shot list of the gallery: node gallery-shots.mjs <out.json>
import { writeFileSync } from 'node:fs';
const out = process.argv[2];
const shots = [];
const add = (name, spec) => shots.push({ name, spec });
const six = [{ who: 'man', lod: 'today' }, { who: 'man', lod: 'hero', label: 'Man · player' }, { who: 'man', lod: 'crowd', label: 'Man · crowd' }, { who: 'woman', lod: 'today' }, { who: 'woman', lod: 'hero', label: 'Woman · player' }, { who: 'woman', lod: 'crowd', label: 'Woman · crowd' }];
const lineCam = { target: [0, 1.0, 0], dist: 7.5, az: 0.0, lift: 0.6, fov: 32 };
for (const [pose, phase] of [['idle', 0], ['walk', 0.28], ['jog', 0.3], ['dance', 0.4]]) add(`line-${pose}`, { pose, phase, spacing: 1.35, items: six, width: 1600, height: 700, cam: lineCam });
// the same, seen from the side
for (const [pose, phase] of [['idle', 0], ['walk', 0.28]]) add(`side-${pose}`, { pose, phase, spacing: 1.35, items: six.map((i) => ({ ...i, ry: Math.PI / 2 })), width: 1600, height: 700, cam: lineCam });
// sitting on the shipped bench
for (const who of ['man', 'woman']) for (const lod of ['today', 'hero']) add(`bench-${who}-${lod}`, { pose: 'sit', phase: 0.5, furniture: 'bench', items: [{ who, lod, label: lod === 'today' ? 'Today' : `${who === 'man' ? 'Man' : 'Woman'} · player` }], width: 900, height: 700 });
// sitting at the heights the game's seats use (stool, chair or bench, bed edge)
for (const [seat, name] of [[0.4, 'stool'], [0.6, 'chair'], [0.74, 'bed']]) {
  const items = [];
  for (const who of ['man', 'woman']) for (const lod of ['today', 'hero']) items.push({ who, lod, seat, ry: Math.PI / 2, label: `${lod === 'today' ? 'Today' : 'New'} · ${who}` });
  add(`seat-${name}`, { pose: 'sit', phase: 0.5, furniture: 'boxes', spacing: 1.3, items, width: 1500, height: 650, cam: { target: [0, 0.95, 0], dist: 6.4, az: 0, lift: 0.4, fov: 30 } });
}
// faces
const faceCam = { target: [0, 2.2, 0], dist: 1.25, az: 0.0, lift: 0.0, fov: 30 };
const faces = { rest: {}, blink: { blink: 1 }, 'gaze-left': { gaze: [-1, 0] }, 'gaze-right': { gaze: [1, 0] }, 'gaze-up': { gaze: [0, 1] }, happy: { mood: 'happy' }, uneasy: { mood: 'uneasy' }, 'talk-aa': { viseme: { shape: 'visemeAA', amount: 1 } }, 'talk-oh': { viseme: { shape: 'visemeOH', amount: 1 } }, 'talk-ee': { viseme: { shape: 'visemeEE', amount: 1 } } };
for (const [name, face] of Object.entries(faces)) add(`face-${name}`, { pose: 'idle', spacing: 0.5, items: [{ who: 'man', lod: 'hero', face, label: `Man · ${name}` }, { who: 'woman', lod: 'hero', face, label: `Woman · ${name}` }], width: 1000, height: 560, cam: faceCam });
add('face-today', { pose: 'idle', spacing: 0.5, items: [{ who: 'man', lod: 'today' }, { who: 'woman', lod: 'today' }], width: 1000, height: 560, cam: faceCam });
add('face-crowd', { pose: 'idle', spacing: 0.5, items: [{ who: 'man', lod: 'crowd', label: 'Man · crowd' }, { who: 'woman', lod: 'crowd', label: 'Woman · crowd' }], width: 1000, height: 560, cam: faceCam });
// backs
const backCam = { target: [0, 1.15, 0], dist: 6.8, az: 0.0, lift: 0.4, fov: 32 };
add('back-idle', { pose: 'idle', spacing: 1.1, items: [{ who: 'man', lod: 'hero', ry: Math.PI }, { who: 'woman', lod: 'hero', ry: Math.PI }, { who: 'man', lod: 'hero', ry: 2.3 }, { who: 'woman', lod: 'hero', ry: 2.3 }], width: 1500, height: 800, cam: backCam });
add('back-today', { pose: 'idle', spacing: 1.1, items: [{ who: 'man', lod: 'today', ry: Math.PI }, { who: 'woman', lod: 'today', ry: Math.PI }], width: 800, height: 800, cam: backCam });
// player beside crowd, near and far
add('lod-near', { pose: 'idle', spacing: 0.95, items: [{ who: 'man', lod: 'hero', label: 'Man · player 13k' }, { who: 'man', lod: 'crowd', label: 'Man · crowd 2.8k' }, { who: 'woman', lod: 'hero', label: 'Woman · player' }, { who: 'woman', lod: 'crowd', label: 'Woman · crowd' }], width: 1500, height: 800, cam: { target: [0, 1.2, 0], dist: 6.6, az: 0, lift: 0.4, fov: 32 } });
add('lod-far', { pose: 'walk', phase: 0.3, spacing: 0.95, items: [{ who: 'man', lod: 'hero', label: 'Man · player' }, { who: 'man', lod: 'crowd', label: 'Man · crowd' }, { who: 'woman', lod: 'hero', label: 'Woman · player' }, { who: 'woman', lod: 'crowd', label: 'Woman · crowd' }], width: 1500, height: 520, cam: { target: [0, 1.3, 0], dist: 12, az: 0, lift: 0.5, fov: 30 } });
// colour variants
const skins = [['#d6a07a', 'light'], ['#a8704a', 'medium'], ['#4a2a1a', 'deep']];
const hues = { man: [[0, 1, 1], [115, 1, 1], [-70, 1, 0.9]], woman: [[0, 1, 1], [75, 1, 1], [-90, 1, 1]] };
for (const who of ['man', 'woman']) {
  add(`skin-${who}`, { pose: 'idle', spacing: 1.05, items: skins.map(([c, n]) => ({ who, lod: 'hero', tint: { skin: c }, label: `${who === 'man' ? 'Man' : 'Woman'} · ${n} skin` })), width: 1300, height: 800, cam: { target: [0, 1.2, 0], dist: 6.4, az: 0, lift: 0.4, fov: 32 } });
  add(`outfit-${who}`, { pose: 'idle', spacing: 1.05, items: hues[who].map((h, i) => ({ who, lod: 'hero', tint: { top: h, bottom: i === 1 ? [h[0] + 60, 1, 1] : h }, label: `${who === 'man' ? 'Man' : 'Woman'} · colouring ${i + 1}` })), width: 1300, height: 800, cam: { target: [0, 1.2, 0], dist: 6.4, az: 0, lift: 0.4, fov: 32 } });
}
add('variants-crowd', { pose: 'walk', phase: 0.3, spacing: 0.9, items: [{ who: 'man', lod: 'crowd', tint: { skin: '#e8bb92', top: [115, 1, 1] } }, { who: 'man', lod: 'crowd', tint: { skin: '#4a2a1a', top: [-70, 1, 0.9], bottom: [-70, 1, 0.9] } }, { who: 'woman', lod: 'crowd', tint: { skin: '#a8704a', top: [75, 1, 1], bottom: [75, 1, 1] } }, { who: 'woman', lod: 'crowd', tint: { skin: '#4a2a1a', top: [-90, 1, 1] } }], width: 1300, height: 700, cam: { target: [0, 1.2, 0], dist: 6.4, az: 0, lift: 0.4, fov: 32 } });
// hair
const hairCam = { target: [0, 1.15, 0], dist: 6.8, az: 0, lift: 0.4, fov: 32 };
add('hair-woman-front', { pose: 'idle', spacing: 0.95, items: [{ who: 'woman', lod: 'hero', label: 'bald (as generated)' }, { who: 'woman', lod: 'hero', hair: 'hair-gele', label: 'head wrap' }, { who: 'woman', lod: 'hero', hair: 'hair-braids', label: 'braids' }], width: 1300, height: 800, cam: hairCam });
add('hair-woman-back', { pose: 'idle', spacing: 0.95, items: [{ who: 'woman', lod: 'hero', ry: Math.PI }, { who: 'woman', lod: 'hero', hair: 'hair-gele', ry: Math.PI }, { who: 'woman', lod: 'hero', hair: 'hair-braids', ry: Math.PI }], width: 1300, height: 800, cam: hairCam });
add('hair-woman-close', { pose: 'idle', spacing: 0.45, items: [{ who: 'woman', lod: 'hero', hair: 'hair-gele' }, { who: 'woman', lod: 'hero', hair: 'hair-braids' }, { who: 'woman', lod: 'hero', hair: 'hair-braids', ry: 0.9 }, { who: 'man', lod: 'hero', hair: 'hair-cap' }, { who: 'man', lod: 'hero', hair: 'hair-cap', ry: 0.9 }], width: 1500, height: 700, cam: { target: [0, 2.15, 0], dist: 2.3, az: 0, lift: 0.0, fov: 30 } });
add('hair-man', { pose: 'idle', spacing: 0.95, items: [{ who: 'man', lod: 'hero', label: 'bald (as generated)' }, { who: 'man', lod: 'hero', hair: 'hair-cap', label: 'short cap' }, { who: 'man', lod: 'hero', hair: 'hair-cap', ry: Math.PI, label: 'short cap, back' }, { who: 'woman', lod: 'hero', hair: 'hair-braids', tint: { skin: '#4a2a1a' }, label: 'braids, deep skin' }], width: 1500, height: 800, cam: hairCam });
// the clip-like strips
for (const who of ['man', 'woman']) {
  const items = Array.from({ length: 6 }, (_, i) => ({ who, lod: 'hero', phase: i / 6, ry: Math.PI / 2, label: `${i + 1}/6` }));
  add(`strip-walk-${who}`, { pose: 'walk', spacing: 0.95, items, width: 1700, height: 520, cam: { target: [0, 1.0, 0], dist: 7.2, az: 0, lift: 0.2, fov: 32 } });
  const today = Array.from({ length: 6 }, (_, i) => ({ who, lod: 'today', phase: i / 6, ry: Math.PI / 2, label: `${i + 1}/6` }));
  add(`strip-walk-${who}-today`, { pose: 'walk', spacing: 0.95, items: today, width: 1700, height: 520, cam: { target: [0, 1.0, 0], dist: 7.2, az: 0, lift: 0.2, fov: 32 } });
}
writeFileSync(out, JSON.stringify(shots, null, 1));
console.log(shots.length, 'shots');
