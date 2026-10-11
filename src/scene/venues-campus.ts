/**
 * OWNER: scenes
 * The shared university courtyard scene. It stays lazy and is fetched only for a city whose loaded content uses the quad kind.
 * Signs use the venue's own label, so one courtyard definition serves every city without claiming a local building design.
 */
import type { Batch, Colour, SceneDef } from './types.ts';
import { ground, bench, leafTree, tallTree, bush, lampPost, windowPane, sign, landmark, extra, WOOD_DARK, WHITE, LEAF, LEAF_DARK } from './props.ts';

const PI = Math.PI, HALF = Math.PI / 2;
const plain = (label: string): string => label.replace(/[’']/g, '');
const fitSize = (label: string, width: number, max: number): number => Math.min(max, (width * 5) / Math.max(1, label.length * 4 - 1));

// ---------------------------------------------------------------------------------------------
// Campus court: a clock tower, an arcaded faculty block, a gate, a notice board and benches.

function clockTower(b: Batch, x: number, z: number) {
  b.box(x, 0.2, z, 4.2, 0.4, 4.2, '#b7ad98');
  b.box(x, 0.55, z, 3.5, 0.3, 3.5, '#c9bfa8');
  b.box(x, 4.7, z, 2.2, 8.3, 2.2, '#ece3cc');
  for (const [dx, dz] of [[-1.05, -1.05], [1.05, -1.05], [-1.05, 1.05], [1.05, 1.05]] as [number, number][]) b.box(x + dx, 4.7, z + dz, 0.32, 8.3, 0.32, '#d6ccb2');
  for (const y of [2.2, 4.6, 6.8]) b.box(x, y, z, 2.5, 0.16, 2.5, '#c2b79d');
  // Slit windows up the shaft and a door at the foot
  for (const y of [3.2, 5.7]) { b.box(x, y, z + 1.11, 0.28, 1.1, 0.06, '#3d352c'); b.box(x + 1.11, y, z, 0.06, 1.1, 0.28, '#3d352c'); }
  b.box(x, 1.2, z + 1.11, 0.9, 1.5, 0.08, '#4a3a2c');
  // The clock stage: wider, with a face on each side that looks into the court
  b.box(x, 9.7, z, 2.9, 2.2, 2.9, '#e6dcc2');
  b.box(x, 8.5, z, 3.1, 0.2, 3.1, '#b9ae94');
  b.box(x, 10.9, z, 3.1, 0.2, 3.1, '#b9ae94');
  b.cyl(x, 9.7, z + 1.46, 0.95, 0.08, WHITE, { seg: 16, rx: HALF });
  b.cyl(x, 9.7, z + 1.5, 0.95, 0.03, '#2f2a24', { seg: 16, rx: HALF, top: 1 });
  b.cyl(x, 9.7, z + 1.51, 0.82, 0.03, '#fff3c4', { seg: 16, rx: HALF, layer: 'glow' });
  b.cyl(x + 1.46, 9.7, z, 0.95, 0.08, WHITE, { seg: 16, rz: HALF });
  b.cyl(x + 1.5, 9.7, z, 0.95, 0.03, '#2f2a24', { seg: 16, rz: HALF });
  b.cyl(x + 1.51, 9.7, z, 0.82, 0.03, '#fff3c4', { seg: 16, rz: HALF, layer: 'glow' });
  b.box(x, 9.95, z + 1.55, 0.09, 0.62, 0.03, '#2f2a24'); b.box(x + 0.22, 9.7, z + 1.55, 0.5, 0.08, 0.03, '#2f2a24');
  b.box(x + 1.55, 9.95, z, 0.03, 0.62, 0.09, '#2f2a24'); b.box(x + 1.55, 9.7, z - 0.22, 0.03, 0.08, 0.5, '#2f2a24');
  // A square pyramid roof of clay tile, and a finial
  b.cone(x, 12.1, z, 2.3, 2.4, '#9b4a30', { seg: 4, ry: PI / 4 });
  b.cyl(x, 13.6, z, 0.05, 1.1, '#c9ced3', { seg: 5 });
  b.ball(x, 14.2, z, 0.12, 0.12, 0.12, '#d9b24c', { seg: 5 });
}

/** A two-storey block with a pillared arcade along its front (+z) face. */
function arcadeBlock(b: Batch, cx: number, cz: number, w: number) {
  const front = cz + 1.7;
  b.box(cx, 1.6, cz, w, 3.2, 3.4, '#e7ddc4');
  b.box(cx, 4.6, cz, w - 0.3, 2.8, 3.2, '#efe6cf');
  b.box(cx, 3.22, cz, w + 0.2, 0.22, 3.6, '#bdb298');
  // Roof of clay tile: two slopes and a ridge
  for (const side of [-1, 1]) b.box(cx, 6.5, cz + side * 1.14, w + 0.6, 0.14, 2.5, '#a4492d', { rx: side * 0.42 });
  b.box(cx, 6.98, cz, w + 0.6, 0.16, 0.3, '#7c3722');
  // Arches in the recessed wall, pillars standing forward of it
  const bays = Math.round(w / 2);
  for (let i = 0; i < bays; i++) {
    const x = cx - w / 2 + (i + 0.5) * (w / bays);
    b.box(x, 1.0, front - 0.02, 1.35, 2.0, 0.1, '#43362b');
    b.cyl(x, 2.0, front - 0.02, 0.67, 0.1, '#43362b', { seg: 10, rx: HALF });
    windowPane(b, x, 4.7, front - 0.06, { w: 0.95, h: 1.3, glass: '#9fc4d6' });
  }
  for (let i = 0; i <= bays; i++) b.box(cx - w / 2 + i * (w / bays), 1.6, front + 0.75, 0.5, 3.2, 0.5, '#f1e8d0');
  b.box(cx, 3.35, front + 0.75, w + 0.4, 0.3, 0.8, '#d3c8ae');
  b.box(cx, 0.05, front + 0.4, w, 0.08, 1.8, '#cbbf9f');
}

function campusGate(b: Batch, x: number, z0: number, z1: number, label: string) {
  for (const z of [z0, z1]) {
    b.box(x, 0.3, z, 1.5, 0.6, 1.5, '#b9ae94');
    b.box(x, 2.3, z, 1.1, 3.8, 1.1, '#d7ccb0');
    b.box(x, 4.35, z, 1.4, 0.3, 1.4, '#a99e86');
    b.ball(x, 4.75, z, 0.32, 0.32, 0.32, '#c9bfa6', { seg: 6 });
  }
  const mid = (z0 + z1) / 2;
  b.box(x, 4.15, mid, 0.5, 0.9, z1 - z0, '#2f4a45');
  sign(b, x + 0.28, 4.15, mid, label, { size: fitSize(label, z1 - z0 - 1.5, 0.36), color: '#f1e6c4', ry: HALF });
}

function noticeBoard(b: Batch, x: number, z: number) {
  b.at(x, 0, z, 0, () => {
    for (const side of [-1, 1]) b.box(side * 1.7, 1.1, 0, 0.14, 2.2, 0.14, WOOD_DARK);
    b.box(0, 1.65, 0, 3.6, 1.5, 0.12, '#6b4a2f');
    b.quad(0, 1.65, 0.07, 3.3, 1.25, '#b98d58');
    ['#f4efe2', '#9fd0e6', '#f2d27a', '#f4efe2', '#e9a6b8', '#f4efe2', '#a8d9a0', '#f2d27a'].forEach((colour, i) => {
      const px = -1.2 + (i % 4) * 0.82, py = 1.95 - Math.floor(i / 4) * 0.62;
      b.quad(px, py, 0.08, 0.55, 0.5, colour as Colour);
      b.quad(px, py + 0.12, 0.09, 0.4, 0.04, '#7a6f60');
    });
    b.box(0, 2.62, 0.1, 3.9, 0.12, 1, '#7a4a35', { rx: 0.3 });
  });
}

export const quad: SceneDef = {
  mood: 'outdoor', accent: '#e0b04a',
  camera: { landscape: [17, 23, 29], portrait: [18, 34, 44], start: 3.5 },
  build(b, context) {
    const label = plain(context.label);
    ground(b, { w: 30, d: 26, color: '#62a04f', edge: '#46703a' });
    const tx = -3.5, tz = -3.4;
    // The paved court around the tower and the red laterite paths into it
    b.disc(0.2, 0.04, 0.4, 7.9, '#b9a98a', { seg: 28 });
    b.disc(0.2, 0.05, 0.4, 7.4, '#dcd3bf', { seg: 28 });
    b.disc(tx, 0.06, tz, 3.5, '#c9b98f', { seg: 18 });
    b.box(-8.5, 0.045, 6.4, 8, 0.05, 2.4, '#b6744d');
    b.box(0.4, 0.045, 9.2, 2.6, 0.05, 6, '#b6744d');
    b.box(8.6, 0.045, -1.4, 2.4, 0.05, 8.6, '#b6744d');
    // The faculty block and the gate
    arcadeBlock(b, 7.8, -8.2, 11);
    campusGate(b, -13, 3.2, 9.8, label);
    for (const [z0, z1] of [[-6, 2.4], [10.6, 12.2]] as [number, number][]) b.box(-13, 0.45, (z0 + z1) / 2, 0.45, 0.9, z1 - z0, '#cfc4aa');
    clockTower(b, tx, tz);
    for (let i = 0; i < 10; i++) {
      const turn = (i / 10) * PI * 2;
      bush(b, tx + Math.sin(turn) * 3, tz + Math.cos(turn) * 3, { s: 0.55, color: i % 3 === 0 ? '#c0407e' : i % 3 === 1 ? '#e0a83a' : LEAF });
    }
    // Shade trees: tall at the back, round on the lawn
    ([[-12, -9, 1.3, 0], [-8.4, -10.4, 1.2, 2], [-12.4, -2.6, 1.15, 1], [2, -11, 1.1, 0], [-11.8, 11.6, 1, 2], [12, 6.2, 1.15, 1], [12.6, -1.6, 1, 2]] as [number, number, number, number][]).forEach(([x, z, s, tone]) => leafTree(b, x, z, { s, tone }));
    tallTree(b, 10.6, 10, { h: 6, s: 0.9, tone: 2 });
    ([[-7, 0.2], [5.4, 7.8], [-2, 8], [11, 2.6], [-9.2, -6.6]] as [number, number][]).forEach(([x, z], i) => bush(b, x, z, { s: 0.85 + (i % 2) * 0.25, color: i % 2 ? LEAF_DARK : LEAF }));
    lampPost(b, -9.6, 5, { light: true }); lampPost(b, 3.4, 8.4); lampPost(b, 8.6, 3.6);
    // Students: benches under the trees, a notice board, a few on the paths
    noticeBoard(b, 6.4, 4);
    bench(b, -8.4, 2.4, { w: 2.8, ry: HALF, back: true, color: '#bdb7a6', leg: '#8f8a7d' });
    bench(b, -4.6, 9.2, { w: 2.8, ry: PI, back: true, color: '#bdb7a6', leg: '#8f8a7d' });
    bench(b, 10.6, 8.2, { w: 2.8, ry: -HALF, back: true, color: '#bdb7a6', leg: '#8f8a7d' });
    extra(b, 'campus-reader', -8.4, 2.1, HALF, 'sit', { seat: 0.6 });
    extra(b, 'campus-chat-1', 5.6, 6.2, PI - 0.3, 'stand');
    extra(b, 'campus-chat-2', 7.4, 6.1, PI + 0.4, 'wave');
    extra(b, 'campus-walker', -6.4, 6.4, HALF, 'walk');
    extra(b, 'campus-lecturer', 7.8, -4.4, PI, 'stand', { look: { outfit: 'sitework', outfitColor: 'navy' } });
    return {
      spots: [
        landmark('court', /court|walk|campus|route|stroll|lawn|green/, 1.6, 4.2, 0, { act: { pose: 'walk' } }),
        landmark('work', /work|staff|office|admin|lecture|teach/, 7.8, -4.1, PI, { act: { pose: 'work' } }),
        landmark('notice', /notice|board|read|news|announce/, 6.4, 6, PI),
        landmark('tower', /clock|tower|time|hall/, tx, tz + 2.8, PI),
        landmark('benches', /bench|sit|rest|study|student|chill/, -6.8, 2.4, -HALF, { act: { pose: 'sit', x: -8.4, z: 2.1, ry: HALF, seat: 0.6 } }),
        landmark('gate', /gate|entry|entrance|arriv/, -10.8, 6.5, -HALF),
        landmark('people', /people|crowd|meet/, 3.4, 1.2, 0),
      ],
      crowd: [[2.6, 2.4, 0.4], [-0.6, 5.2, -0.5], [4.2, 3, 2.6], [-2.4, 3.4, 1.2], [1, 7, 2.8], [-6, 0.4, 1.6], [3.8, -2, PI], [-1.8, 1, 2.6], [6, 1.4, -1], [-5, 6.2, 0.6], [9.6, 4.6, 2.2], [0.6, 10, 3.1]],
    };
  },
};

export const SCENES = { quad };

