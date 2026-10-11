// @ts-nocheck -- offline helper: writes the shot list of the round-two gallery.   node gallery2-shots.mjs <out.json>
import { writeFileSync } from 'node:fs';
const shots = [];
const add = (name, spec) => shots.push({ name, spec });
const base = (sex, over = {}) => ({ sex, head: sex === 'male' ? 'm2-head' : 'w2-head', body: sex === 'male' ? 'm2-body' : 'w2-body', skin: '#82502f', top: '#e6dcc4', bottom: '#2f3f5f', shoes: '#2b2b2f', hair: 'low', hairColor: '#14100e', headwear: 'none', headwearColor: '#e9e2cf', height: 1, build: 0, jaw: 0, headSize: sex === 'male' ? 0.92 : 0.95, print: 0, ...over });
const strip = (name, looks, o = {}) => add(name, { looks, pose: 'idle', cols: looks.length, spacingX: 0.95, width: 1700, height: 640, cam: { target: [0, 1.0, 0], dist: 7.2, az: 0, lift: 0.5, fov: 30 }, ...o });
const SK = ['#b4784f', '#9a6342', '#82502f', '#6a3f27', '#52301f', '#3a2218'];
const HC = ['#14100e', '#1d1612', '#2b1d14', '#3b2a1e', '#8e8a84', '#b4b0a8'];
const CL = ['#f1efe8', '#1f2b44', '#6e2a35', '#5a6a3a', '#7a5a3c', '#2f3f5f', '#e6dcc4', '#2b2b2f'];
for (const sex of ['male', 'female']) {
  const S = sex === 'male' ? 'man' : 'woman';
  strip(`strip-skin-${S}`, SK.map((c) => base(sex, { skin: c })));
  strip(`strip-face-${S}`, (sex === 'male' ? ['m2-head', 'm3-head', 'm1-head'] : ['w2-head', 'w3-head', 'w1-head']).flatMap((h) => [base(sex, { head: h, hair: 'none' }), base(sex, { head: h, hair: sex === 'male' ? 'fade' : 'puff' })]));
  strip(`strip-hair-${S}`, (sex === 'male' ? ['low', 'fade', 'lineup', 'afro', 'cornrows', 'locs'] : ['low', 'afro', 'cornrows', 'puff', 'locs', 'braids']).map((h) => base(sex, { hair: h })));
  strip(`strip-haircolour-${S}`, HC.map((c) => base(sex, { hair: 'afro', hairColor: c })));
  strip(`strip-colour-${S}`, [0, 1, 2, 3, 4, 5].map((i) => base(sex, { top: CL[i], bottom: CL[(i + 3) % 8], shoes: ['#f4f4f0', '#2b2b2f', '#6b3d1f', '#9a2e2a', '#1f2b44', '#f4f4f0'][i] })));
  strip(`strip-height-${S}`, [0.92, 0.96, 1.0, 1.04, 1.08].map((h) => base(sex, { height: h })), { spacingX: 1.1 });
  strip(`strip-build-${S}`, [-1, -0.5, 0, 0.5, 1].map((b) => base(sex, { build: b })), { spacingX: 1.1 });
  strip(`strip-headsize-${S}`, [0.92, 0.97, 1.0, 1.05, 1.1].map((h) => base(sex, { headSize: h })), { spacingX: 1.1 });
  strip(`strip-build-poses-${S}`, [-1, 1, -1, 1, -1, 1].map((b, i) => base(sex, { build: b })), { poses: ['walk', 'walk', 'sit', 'sit', 'dance', 'dance'], phases: [0.3, 0.3, 0.5, 0.5, 0.4, 0.4], spacingX: 1.1, rys: [1.1, 1.1, 1.3, 1.3, 0.3, 0.3], seat: 0.5, height: 700, width: 1900 });
}
strip('strip-outfit-man', [base('male', { body: 'm2-body' }), base('male', { body: 'm1-body' }), base('male', { body: 'm3-body', print: 1 }), base('male', { body: 'm3-body', print: 2 }), base('male', { body: 'm3-body', print: 3 })], { spacingX: 1.1 });
strip('strip-outfit-woman', [base('female', { body: 'w2-body' }), base('female', { body: 'w3-body' }), base('female', { body: 'w1-body', print: 1 }), base('female', { body: 'w1-body', print: 2 }), base('female', { body: 'w1-body', print: 3 })], { spacingX: 1.1 });
strip('strip-headwear-man', [base('male', { hair: 'low', headwear: 'fila', headwearColor: '#e9e2cf' }), base('male', { hair: 'low', headwear: 'fila', headwearColor: '#1f2b44' }), base('male', { hair: 'afro', headwear: 'fila', headwearColor: '#6e2a35' }), base('male', { hair: 'fade', headwear: 'none' })]);
strip('strip-headwear-woman', [base('female', { hair: 'none', headwear: 'gele', headwearColor: '#c88a1d' }), base('female', { head: 'w3-head', hair: 'none', headwear: 'gele' }), base('female', { hair: 'none', headwear: 'scarf', headwearColor: '#9a2e2a' }), base('female', { head: 'w3-head', hair: 'none', headwear: 'scarf', headwearColor: '#2f6e68' }), base('female', { head: 'w1-head', hair: 'none', headwear: 'scarf', headwearColor: '#6a3f8f' })]);
// the walls
const rnd = (seed) => `seed:${seed}`;
add('wall-men', { random: { sex: 'male', n: 12, seed: 101 }, pose: 'idle', cols: 6, spacingX: 0.9, spacingZ: 1.7, width: 2000, height: 1000, cam: { target: [0, 1.0, 0], dist: 10.5, az: 0, lift: 1.1, fov: 30 } });
add('wall-women', { random: { sex: 'female', n: 12, seed: 202 }, pose: 'idle', cols: 6, spacingX: 0.9, spacingZ: 1.7, width: 2000, height: 1000, cam: { target: [0, 1.0, 0], dist: 10.5, az: 0, lift: 1.1, fov: 30 } });
add('walk-eight', { random: { mix: ['male', 'female', 'male', 'female', 'male', 'female', 'male', 'female'], seed: 303 }, pose: 'walk', phases: [0.05, 0.2, 0.35, 0.5, 0.65, 0.8, 0.92, 0.28], cols: 8, spacingX: 1.0, width: 2000, height: 640, cam: { target: [0, 1.0, 0], dist: 9.5, az: 0, lift: 0.5, fov: 30 } });
// close-ups
const close = (name, looks, o = {}) => add(name, { looks, pose: 'idle', cols: looks.length, spacingX: 0.55, width: 1700, height: 700, cam: { target: [0, 1.62, 0], dist: 1.9, az: 0, lift: 0, fov: 30 }, ...o });
const mix = [['m2-head', 'm2-body'], ['m3-head', 'm2-body'], ['m1-head', 'm1-body'], ['m2-head', 'm3-body']].map(([h, b], i) => base('male', { head: h, body: b, print: b === 'm3-body' ? 1 : 0, hair: 'none', skin: SK[[0, 2, 4, 5][i]] }));
const mixw = [['w2-head', 'w2-body'], ['w3-head', 'w2-body'], ['w1-head', 'w3-body'], ['w2-head', 'w1-body']].map(([h, b], i) => base('female', { head: h, body: b, print: b === 'w1-body' ? 1 : 0, hair: 'none', skin: SK[[0, 2, 4, 5][i]] }));
close('seam-man-front', mix, { cam: { target: [0, 1.58, 0], dist: 1.5, az: 0, lift: 0, fov: 30 } }); close('seam-man-side', mix, { rys: [1.5, 1.5, 1.5, 1.5], cam: { target: [0, 1.58, 0], dist: 1.5, az: 0, lift: 0, fov: 30 } });
close('seam-man-back', mix, { rys: [3.14, 3.14, 3.14, 3.14], cam: { target: [0, 1.58, 0], dist: 1.5, az: 0, lift: 0, fov: 30 } });
close('seam-woman-front', mixw, { cam: { target: [0, 1.5, 0], dist: 1.5, az: 0, lift: 0, fov: 30 } }); close('seam-woman-side', mixw, { rys: [1.5, 1.5, 1.5, 1.5], cam: { target: [0, 1.5, 0], dist: 1.5, az: 0, lift: 0, fov: 30 } });
close('seam-woman-back', mixw, { rys: [3.14, 3.14, 3.14, 3.14], cam: { target: [0, 1.5, 0], dist: 1.5, az: 0, lift: 0, fov: 30 } });
for (const [S, sex, hairs] of [['man', 'male', ['low', 'fade', 'lineup', 'afro', 'cornrows', 'puff']], ['woman', 'female', ['low', 'afro', 'cornrows', 'puff', 'locs', 'braids']]]) {
  const cy = sex === 'male' ? 1.8 : 1.68;
  for (const [v, ry] of [['front', 0], ['side', 1.4], ['back', 3.14], ['top', 0.0]]) close(`hairline-${S}-${v}`, hairs.map((h) => base(sex, { hair: h })), { cols: 6, rys: hairs.map(() => ry), cam: { target: [0, cy, 0], dist: 1.9, az: 0, lift: v === 'top' ? 0.6 : 0, fov: 30 }, spacingX: 0.5 });
}
close('edges-arms-man', [0, 1, 2].map((i) => base('male', { skin: SK[i * 2], hair: 'low' })), { cam: { target: [0.1, 1.35, 0], dist: 1.9, az: 0, lift: 0, fov: 30 }, spacingX: 0.85, cols: 3 });
close('edges-hands-shoes-woman', [0, 1, 2].map((i) => base('female', { body: 'w2-body', skin: SK[i * 2 + 0], shoes: ['#f4f4f0', '#6b3d1f', '#9a2e2a'][i] })), { cam: { target: [0, 0.55, 0], dist: 3.0, az: 0, lift: 0, fov: 30 }, spacingX: 0.85, cols: 3, height: 900 });
add('face-controls-jaw', { looks: [-0.5, 0, 0.5, 1].map((j) => base('male', { jaw: j, hair: 'none' })), pose: 'idle', cols: 4, spacingX: 0.5, width: 1500, height: 600, cam: { target: [0, 1.75, 0], dist: 1.6, az: 0, lift: 0, fov: 30 } });

// eyes at three angles, all six heads
const EH = [['male', 'm2-head', 'm2-body'], ['male', 'm3-head', 'm3-body'], ['male', 'm1-head', 'm1-body'], ['female', 'w2-head', 'w2-body'], ['female', 'w3-head', 'w3-body'], ['female', 'w1-head', 'w1-body']];
for (const [ry, n] of [[0, 'front'], [0.7, 'tq'], [1.5, 'side']]) add(`eyes-${n}`, { looks: EH.map(([s, h, b]) => base(s, { head: h, body: b, hair: 'none', print: 0, skin: '#82502f' })), pose: 'idle', cols: 6, spacingX: 0.42, rys: Array(6).fill(ry), width: 1800, height: 500, cam: { target: [0, 1.68, 0], dist: 1.7, az: 0, lift: 0, fov: 28 } });
for (const [ry, n] of [[0, 'front'], [0.7, 'tq'], [1.5, 'side']]) add(`eyes-light-${n}`, { looks: EH.map(([s, h, b]) => base(s, { head: h, body: b, hair: 'none', skin: '#b4784f' })), pose: 'idle', cols: 6, spacingX: 0.42, rys: Array(6).fill(ry), width: 1800, height: 500, cam: { target: [0, 1.68, 0], dist: 1.7, az: 0, lift: 0, fov: 28 } });
// the 18-pair neck grid
for (const [sex, hs, S] of [['male', ['m2', 'm3', 'm1'], 'man'], ['female', ['w2', 'w3', 'w1'], 'woman']]) {
  const looks = []; for (const h of hs) for (const b of hs) looks.push(base(sex, { head: h + '-head', body: b + '-body', hair: 'none', print: b === 'm3' || b === 'w1' ? 1 : 0, skin: '#82502f' }));
  for (const [ry, n] of [[0, 'front'], [1.5, 'side']]) add(`grid-${S}-${n}`, { looks, pose: 'idle', cols: 9, spacingX: 0.4, rys: Array(9).fill(ry), width: 1900, height: 520, cam: { target: [0, sex === 'male' ? 1.5 : 1.42, 0], dist: 2.3, az: 0, lift: 0, fov: 28 } });
}
// the sleeves and hands at the lightest and darkest tones, every outfit
for (const sex of ['male', 'female']) { const S = sex === 'male' ? 'man' : 'woman'; const bs = sex === 'male' ? ['m2', 'm1', 'm3'] : ['w2', 'w3', 'w1'];
  for (const [tone, n] of [[SK[0], 'light'], [SK[5], 'dark']]) add(`sleeves-${S}-${n}`, { looks: bs.map((b) => base(sex, { head: b + '-head', body: b + '-body', print: b === 'm3' || b === 'w1' ? 1 : 0, skin: tone, hair: 'low' })), pose: 'idle', cols: 3, spacingX: 0.8, rys: [0.5, 0.5, 0.5], width: 1500, height: 800, cam: { target: [0, 1.15, 0], dist: 3.3, az: 0, lift: 0, fov: 28 } }); }
// hero beside crowd, and the street
add('crowd-vs-hero', { looks: [base('male', { hair: 'low' }), base('male', { hair: 'low' }), base('female', { hair: 'afro' }), base('female', { hair: 'afro' })], pose: 'walk', phase: 0.3, cols: 4, spacingX: 0.95, width: 1500, height: 800, cam: { target: [0, 1.0, 0], dist: 6.6, az: 0, lift: 0.4, fov: 30 }, crowdMask: [false, true, false, true] });
add('street-40', { street: { n: 40, seed: 77 }, width: 1900, height: 900 });
writeFileSync(process.argv[2], JSON.stringify(shots));

console.log(shots.length, 'shots');
