/**
 * OWNER: scenes
 * The shared hilltop viewpoint scene. It stays lazy and is fetched only for a city whose loaded content uses the hilltop kind.
 * The plaque uses the venue's own label; the stylised distant town is scene art, not a claim about local buildings.
 */
import type { Batch, Colour, SceneDef } from './types.ts';
import { bench, leafTree, bush, lampPost, kiosk, flag, sign, landmark, extra, WHITE, LEAF } from './props.ts';

const PI = Math.PI, HALF = Math.PI / 2;
function seeded(seed: number): () => number { let state = seed >>> 0; return () => { state = (Math.imul(state, 1664525) + 1013904223) >>> 0; return state / 4294967296; }; }
const plain = (label: string): string => label.replace(/[’']/g, '');
const fitSize = (label: string, width: number, max: number): number => Math.min(max, (width * 5) / Math.max(1, label.length * 4 - 1));

// ---------------------------------------------------------------------------------------------
// Hilltop: a tall slender tower, a viewing terrace and the city's rust-brown roofs below.

const ROOFS: Colour[] = ['#8d4a2c', '#9b5532', '#7b4430', '#a65f3a', '#6f3f2d', '#b06a3f', '#84432b', '#94512f'];
const OLD_ROOFS: Colour[] = ['#8a8f92', '#a3a7a5', '#c8b9a0'];
/** [far edge, near edge, ground height] of the stepped hillside, nearest the terrace first. */
const HILLSIDE: [number, number, number][] = [[-12, -4.9, -1.6], [-19, -12, -3.4], [-26, -19, -5], [-34, -26, -6.2], [-44, -34, -5.4]];

function townBelow(b: Batch) {
  const rand = seeded(7);
  HILLSIDE.forEach(([far, near, y], step) => {
    b.box(0, y - 4, (far + near) / 2, 76, 8, near - far, step % 2 ? '#9a6a46' : '#a8714b');
    b.box(0, y - 0.02, (far + near) / 2, 76, 0.05, near - far - 0.2, step % 2 ? '#8f6540' : '#9c6a46');
    const rows = Math.floor((near - far - 1.4) / 3.4);
    for (let r = 0; r < rows; r++) {
      const z = near - 1.4 - r * 3.4 - rand() * 0.6;
      for (let x = -34; x < 34; x += 3.7) {
        if (rand() < 0.1 || (Math.round(x / 3.7) + r + step) % 6 === 0) continue;
        const cx = x + rand() * 0.9, w = 2 + rand() * 1.5, d = 2 + rand() * 1.1, h = 1 + rand() * 0.6;
        const turn = (rand() - 0.5) * 0.4, tone = rand() < 0.2 ? OLD_ROOFS[Math.floor(rand() * 3)]! : ROOFS[Math.floor(rand() * ROOFS.length)]!;
        b.at(cx, y, z, turn, () => {
          if (step < 2) b.box(0, h / 2, 0, w, h, d, '#d9c9a8');
          for (const side of [-1, 1]) b.box(0, h + 0.28, side * d * 0.25, w + 0.3, 0.1, d * 0.62, tone, { rx: side * 0.42 });
        });
      }
    }
    // Trees among the roofs, sparse, and one ridge of far hills
    for (let i = 0; i < 6; i++) b.ico(-30 + rand() * 60, y + 0.9, near - 1 - rand() * (near - far - 2), 1 + rand() * 0.5, 1.1, 1 + rand() * 0.5, rand() < 0.5 ? '#4f8a45' : '#3d7a4a');
  });
  // The old city's few tall shapes: a minaret and a church tower among the roofs
  b.cyl(-17, -3.4 + 2.6, -22.5, 0.3, 5.2, '#e9e1cd', { seg: 8 }); b.cone(-17, -3.4 + 5.6, -22.5, 0.42, 0.9, '#2f8f6a', { seg: 8 }); b.box(-17, -3.4 + 4.2, -22.5, 0.85, 0.12, 0.85, '#d6ccb2');
  b.box(14, -3.4 + 2, -23, 1.7, 4, 1.7, '#d9d0bc'); b.box(14, -3.4 + 4.6, -23, 1.2, 1.2, 1.2, '#cfc5ae'); b.cone(14, -3.4 + 5.7, -23, 1.15, 1.4, '#8d4a2c', { seg: 4, ry: PI / 4 });
  // Seven hills: low, hazy ridges at the back
  ([[-30, -46, 9, '#6f8f72'], [-12, -49, 7, '#7c9a82'], [8, -50, 10, '#6c8c6e'], [28, -47, 8, '#7a9a80'], [-2, -56, 11, '#86a58a']] as [number, number, number, Colour][]).forEach(([x, z, h, c]) => {
    b.ball(x, -5.4 + h * 0.15, z, 14, h, 9, c, { seg: 8 });
  });
}

function boweTower(b: Batch, px: number, pz: number) {
  b.at(px, 0, pz, 0, () => drawTower(b, 0, 0), 0, 0, 0.86);
}

function drawTower(b: Batch, x: number, z: number) {
  b.cyl(x, 0.25, z, 2.7, 0.5, '#8d887a', { seg: 12 });
  b.cyl(x, 0.6, z, 2.3, 0.2, '#a29c8b', { seg: 12 });
  // A tapering shaft of banded stone: rings every level, slit windows on the faces that look at the terrace
  b.cyl(x, 6.9, z, 1.5, 12.6, '#a09a89', { seg: 10, top: 0.62 });
  for (let i = 0; i < 6; i++) {
    const y = 1.6 + i * 2.1, r = 1.5 - (i * 2.1 + 1) / 12.6 * 0.88;
    b.cyl(x, y, z, r + 0.1, 0.16, i % 2 ? '#7f7a6c' : '#8b8575', { seg: 10 });
    for (const turn of [0, 0.7, 1.4]) b.box(x + Math.sin(turn) * (r - 0.1), y + 1, z + Math.cos(turn) * (r - 0.1), 0.2, 0.6, 0.2, '#2f2b26', { ry: turn });
  }
  b.box(x, 1.2, z + 1.45, 0.9, 1.7, 0.12, '#3b332b');
  b.cyl(x, 1.9, z + 1.42, 0.45, 0.14, '#3b332b', { seg: 8, rx: HALF });
  // The crown: a wider gallery with merlons, a small turret and a flagstaff
  b.cyl(x, 13.35, z, 1.35, 0.3, '#8b8575', { seg: 10, top: 1.15 });
  b.cyl(x, 13.7, z, 1.3, 0.14, '#9a9482', { seg: 10 });
  for (let i = 0; i < 10; i++) { const turn = (i / 10) * PI * 2; b.box(x + Math.sin(turn) * 1.22, 14.2, z + Math.cos(turn) * 1.22, 0.36, 0.7, 0.36, '#a39d8c', { ry: turn }); }
  b.cyl(x, 14.9, z, 0.62, 1.4, '#9d9786', { seg: 8, top: 0.9 });
  b.cone(x, 16.1, z, 0.85, 1, '#7a4a35', { seg: 8 });
  b.cyl(x, 17.3, z, 0.04, 1.6, '#c9ced3', { seg: 4 });
  b.box(x + 0.5, 17.8, z, 0.9, 0.5, 0.03, '#2f8f55'); b.box(x + 0.5, 17.8, z + 0.02, 0.3, 0.5, 0.03, WHITE);
}

export const hilltop: SceneDef = {
  mood: 'outdoor', accent: '#f2c14e',
  camera: { landscape: [23, 35, 43], portrait: [24, 49, 62], start: 3.5 },
  build(b, context) {
    const label = plain(context.label);
    // The terrace: paved stone, then the hillside falling away behind a low wall
    b.box(0, -0.3, 3.6, 28, 0.5, 17, '#8f8a7d');
    b.box(0, -0.02, 3.6, 27, 0.1, 16, '#c0b7a0');
    for (let x = -12; x <= 12; x += 3) b.box(x, 0.04, 3.6, 0.05, 0.02, 16, '#a69d86');
    for (let z = -2; z <= 10; z += 3) b.box(0, 0.04, z, 27, 0.02, 0.05, '#a69d86');
    b.box(0, -0.3, -4.2, 28, 0.5, 1, '#8f8a7d');
    townBelow(b);
    // The low wall along the drop, with piers
    b.box(0, 0.45, -4.4, 27.4, 0.9, 0.46, '#9a9482');
    b.box(0, 0.95, -4.4, 27.7, 0.12, 0.62, '#bab39f');
    for (let x = -13; x <= 13; x += 4.5) b.box(x, 0.7, -4.4, 0.7, 1.4, 0.7, '#a8a28f');
    b.box(-13.2, 0.45, -0.4, 0.46, 0.9, 7.8, '#9a9482'); b.box(-13.2, 0.95, -0.4, 0.62, 0.12, 7.8, '#bab39f');
    b.box(13.2, 0.45, -0.4, 0.46, 0.9, 7.8, '#9a9482'); b.box(13.2, 0.95, -0.4, 0.62, 0.12, 7.8, '#bab39f');
    boweTower(b, -6.2, -1.2);
    // The tower's own name on a low stone at its foot (the venue's label)
    b.box(-6.2, 0.35, 2.2, 3.4, 0.7, 0.5, '#8d887a');
    sign(b, -6.2, 0.38, 2.48, label, { size: fitSize(label, 3, 0.3), color: '#f1e6c4', board: '#2f4a45', pad: 0.12, depth: 0.04 });
    // A coin viewer on its post, benches that face the view, a lamp
    b.cyl(6.6, 0.7, -3.5, 0.1, 1.4, '#4a4f56', { seg: 6 });
    b.box(6.6, 1.5, -3.5, 0.5, 0.4, 0.9, '#2f6f8f'); b.cyl(6.6, 1.5, -3.95, 0.14, 0.4, '#1f2328', { seg: 6, rx: HALF });
    bench(b, 1.6, -3.4, { w: 2.8, ry: PI, back: true, color: '#8f8a7d', leg: '#6a665c' });
    bench(b, 10.2, -3.4, { w: 2.8, ry: PI, back: true, color: '#8f8a7d', leg: '#6a665c' });
    extra(b, 'hill-viewer-1', 1, -3.4, PI, 'sit', { seat: 0.6 });
    extra(b, 'hill-viewer-2', 10.2, -3.4, PI + 0.1, 'sit', { seat: 0.6 });
    extra(b, 'hill-photo', 4.6, -3.2, PI - 0.4, 'wave');
    lampPost(b, -0.2, 1.2, { light: true }); lampPost(b, 8.6, 1.6);
    // The caretaker's hut, planting and shade
    kiosk(b, 9.8, 7.6, { color: '#c9b78f', roof: '#7a4a35', fascia: '#e9dcb4' });
    extra(b, 'hill-caretaker', 9.8, 6.6, PI, 'work');
    flag(b, 12.2, 9.6, { h: 5 });
    ([[-11.4, 8.8, 1.2, 0], [-3.2, 10.4, 1, 2], [12, 3.4, 1, 1], [-12, 2.4, 1.1, 2]] as [number, number, number, number][]).forEach(([x, z, s, tone]) => leafTree(b, x, z, { s, tone }));
    ([[-9, 6.4], [5.6, 9.8], [-1.6, 6.4], [12.2, 6.4]] as [number, number][]).forEach(([x, z], i) => bush(b, x, z, { s: 0.8 + (i % 2) * 0.3, color: i % 2 ? '#c0407e' : LEAF }));
    return {
      spots: [
        landmark('top', /top|view|city|hill|roof|photo|lookout|seven/, 3.4, -2.9, PI),
        landmark('work', /work|staff|caretak|guide|ticket/, 9.8, 5.6, PI, { act: { pose: 'work' } }),
        landmark('tower', /tower|climb|stair|plaque|history/, -6.2, 3.4, PI),
        landmark('viewer', /telescope|binocular|viewer|scope/, 6.6, -2.7, PI),
        landmark('bench', /bench|sit|rest|chill|relax/, 3.6, -1.7, PI, { act: { pose: 'sit', x: 1.6, z: -3.4, ry: PI, seat: 0.6 } }),
        landmark('people', /people|crowd|meet/, 1.4, 5.6, 0),
      ],
      crowd: [[2.4, 4.4, 0.4], [-1.2, 6.4, -0.5], [4.2, 6.2, 2.6], [-3.4, 4.6, 1.2], [6.4, 3.8, -1], [-8, 5, 1.6], [0.6, 8.6, 2.2], [8.6, 4, -0.6], [-4.8, 8, 0.2], [2.4, 0.4, PI], [-9.6, 1.8, 2.6], [6.8, 9, 0.4]],
    };
  },
};

export const SCENES = { hilltop };

