// @ts-nocheck -- offline helper: writes the shot list of the round-two gallery.   node gallery2-shots.mjs <out.json>
import { writeFileSync } from 'node:fs';
const shots = [];
const add = (name, spec) => shots.push({ name, spec });
const base = (sex, over = {}) => ({ sex, head: sex === 'male' ? 'm2-head' : 'w2-head', body: sex === 'male' ? 'm2-body' : 'w2-body', skin: '#8a5a38', top: '#2f6e68', bottom: '#1f2b44', shoes: '#2b2b2f', hair: 'low', hairColor: '#14100e', headwear: 'none', headwearColor: '#e9e2cf', height: 1, build: 0, jaw: 0, headSize: 1, print: 0, ...over });
const strip = (name, looks, o = {}) => add(name, { looks, pose: 'idle', cols: looks.length, spacingX: 0.95, width: 1700, height: 640, cam: { target: [0, 1.0, 0], dist: 7.2, az: 0, lift: 0.5, fov: 30 }, ...o });
const SK = ['#c48f66', '#a8704a', '#8a5a38', '#6e4429', '#523320', '#3a2317'];
const HC = ['#14100e', '#2b1d14', '#4a2e1c', '#6b3a1f', '#8e8a84', '#c9b27a'];
const CL = ['#f1efe8', '#1f2b44', '#2f6e68', '#9a2e2a', '#c88a1d', '#4f7d3a', '#6a3f8f', '#2b2b2f'];
for (const sex of ['male', 'female']) {
  const S = sex === 'male' ? 'man' : 'woman';
  strip(`strip-skin-${S}`, SK.map((c) => base(sex, { skin: c })));
  strip(`strip-face-${S}`, (sex === 'male' ? ['m2-head', 'm3-head', 'm1-head'] : ['w2-head', 'w3-head', 'w1-head']).flatMap((h) => [base(sex, { head: h, hair: 'none' }), base(sex, { head: h, hair: sex === 'male' ? 'fade' : 'puff' })]));
  strip(`strip-hair-${S}`, (sex === 'male' ? ['low', 'fade', 'afro', 'cornrows', 'puff', 'locs'] : ['low', 'afro', 'cornrows', 'puff', 'locs', 'braids']).map((h) => base(sex, { hair: h })));
  strip(`strip-haircolour-${S}`, HC.map((c) => base(sex, { hair: 'afro', hairColor: c })));
  strip(`strip-colour-${S}`, [0, 1, 2, 3, 4, 5].map((i) => base(sex, { top: CL[i], bottom: CL[(i + 3) % 8], shoes: ['#f4f4f0', '#2b2b2f', '#6b3d1f', '#9a2e2a', '#1f2b44', '#f4f4f0'][i] })));
  strip(`strip-height-${S}`, [0.92, 0.96, 1.0, 1.04, 1.08].map((h) => base(sex, { height: h })), { spacingX: 1.1 });
  strip(`strip-build-${S}`, [-1, -0.5, 0, 0.5, 1].map((b) => base(sex, { build: b })), { spacingX: 1.1 });
  strip(`strip-headsize-${S}`, [0.92, 0.97, 1.0, 1.05, 1.1].map((h) => base(sex, { headSize: h })), { spacingX: 1.1 });
  strip(`strip-build-poses-${S}`, [-1, 1, -1, 1, -1, 1].map((b, i) => base(sex, { build: b })), { poses: ['walk', 'walk', 'sit', 'sit', 'dance', 'dance'], phases: [0.3, 0.3, 0.5, 0.5, 0.4, 0.4], spacingX: 1.1, rys: [1.1, 1.1, 1.3, 1.3, 0.3, 0.3], seat: 0.5, height: 700, width: 1900 });
}
strip('strip-outfit-man', [base('male', { body: 'm2-body' }), base('male', { body: 'm1-body' }), base('male', { body: 'm3-body', print: 1 }), base('male', { body: 'm3-body', print: 2 }), base('male', { body: 'm3-body', print: 3 })], { spacingX: 1.1 });
strip('strip-outfit-woman', [base('female', { body: 'w2-body' }), base('female', { body: 'w3-body' }), base('female', { body: 'w1-body', print: 1 }), base('female', { body: 'w1-body', print: 2 }), base('female', { body: 'w1-body', print: 3 })], { spacingX: 1.1 });
strip('strip-headwear-man', [base('male', { hair: 'low', headwear: 'fila', headwearColor: '#e9e2cf' }), base('male', { hair: 'low', headwear: 'fila', headwearColor: '#1f2b44' }), base('male', { hair: 'afro', headwear: 'fila', headwearColor: '#9a2e2a' }), base('male', { hair: 'fade', headwear: 'none' })]);
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
for (const [S, sex, hairs] of [['man', 'male', ['low', 'fade', 'afro', 'cornrows', 'puff', 'locs']], ['woman', 'female', ['low', 'afro', 'cornrows', 'puff', 'locs', 'braids']]]) {
  const cy = sex === 'male' ? 1.8 : 1.68;
  for (const [v, ry] of [['front', 0], ['side', 1.4], ['back', 3.14], ['top', 0.0]]) close(`hairline-${S}-${v}`, hairs.map((h) => base(sex, { hair: h })), { cols: 6, rys: hairs.map(() => ry), cam: { target: [0, cy, 0], dist: 1.9, az: 0, lift: v === 'top' ? 0.6 : 0, fov: 30 }, spacingX: 0.5 });
}
close('edges-arms-man', [0, 1, 2].map((i) => base('male', { skin: SK[i * 2], hair: 'low' })), { cam: { target: [0.1, 1.35, 0], dist: 1.9, az: 0, lift: 0, fov: 30 }, spacingX: 0.85, cols: 3 });
close('edges-hands-shoes-woman', [0, 1, 2].map((i) => base('female', { body: 'w2-body', skin: SK[i * 2 + 0], shoes: ['#f4f4f0', '#6b3d1f', '#9a2e2a'][i] })), { cam: { target: [0, 0.55, 0], dist: 3.0, az: 0, lift: 0, fov: 30 }, spacingX: 0.85, cols: 3, height: 900 });
add('face-controls-jaw', { looks: [-0.5, 0, 0.5, 1].map((j) => base('male', { jaw: j, hair: 'none' })), pose: 'idle', cols: 4, spacingX: 0.5, width: 1500, height: 600, cam: { target: [0, 1.75, 0], dist: 1.6, az: 0, lift: 0, fov: 30 } });
writeFileSync(process.argv[2], JSON.stringify(shots));
console.log(shots.length, 'shots');
