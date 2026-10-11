/**
 * OWNER: scenes
 * Scenes with a character of their own for three Ibadan places: a university campus court
 * ('quad'), a hilltop tower with the city's roofs below ('hilltop') and a reservoir shore
 * ('lakeside'). Scene definition format: see venues-outdoor.ts.
 *
 * Every sign is drawn from the venue's own label (context.label); nothing here names a place.
 * All three are static; the roofs, reeds and far trees are plain baked boxes and blobs.
 */
import { GLASS } from './build.ts';
import { quad } from './venues-campus.ts';
import { hilltop } from './venues-viewpoint.ts';
import type { Batch, Colour, SceneDef } from './types.ts';
import {
  bench, leafTree, bush, lampPost, signBoard, landmark, extra,
  LEAF, LEAF_DARK,
} from './props.ts';

const PI = Math.PI, HALF = Math.PI / 2;

/** A small deterministic generator, so a scene is the same every time it is built. */
function seeded(seed: number): () => number {
  let state = seed >>> 0;
  return () => { state = (Math.imul(state, 1664525) + 1013904223) >>> 0; return state / 4294967296; };
}
/** Block lettering has no apostrophe: a possessive reads as one word. */
const plain = (label: string): string => label.replace(/[’']/g, '');
/** A sign width that fits a venue's own label between two points. */
const fitSize = (label: string, width: number, max: number): number => Math.min(max, (width * 5) / Math.max(1, label.length * 4 - 1));

// ---------------------------------------------------------------------------------------------
// Reservoir shore: still water, a low dam, reeds, a jetty with a canoe and a forested far shore.

const BANK_Z = -2.4, WATER = -0.12;

function reeds(b: Batch, x: number, z: number, n: number, rand: () => number) {
  for (let i = 0; i < n; i++) {
    const px = x + (rand() - 0.5) * 1.6, pz = z + (rand() - 0.5) * 0.9, h = 1.2 + rand() * 1, lean = (rand() - 0.5) * 0.25;
    b.cyl(px, WATER + h / 2, pz, 0.035, h, rand() < 0.5 ? '#9aa65a' : '#7e8f48', { seg: 3, rz: lean });
    if (rand() < 0.35) b.cyl(px - lean * h * 0.5, WATER + h, pz, 0.07, 0.34, '#6b4a2e', { seg: 4 });
  }
}

function egret(b: Batch, x: number, y: number, z: number, ry: number) {
  b.at(x, y, z, ry, () => {
    b.ball(0, 0.5, 0, 0.17, 0.17, 0.34, '#f4f1e8', { seg: 6 });
    b.box(0, 0.78, 0.2, 0.07, 0.4, 0.07, '#f4f1e8', { rx: -0.35 });
    b.ball(0, 0.98, 0.3, 0.08, 0.08, 0.1, '#f4f1e8', { seg: 5 });
    b.cone(0, 0.97, 0.45, 0.025, 0.2, '#e0b030', { seg: 3, rx: HALF });
    for (const side of [-1, 1]) b.box(side * 0.06, 0.18, 0, 0.025, 0.38, 0.025, '#2f2b26');
  });
}

function canoe(b: Batch, x: number, y: number, z: number, ry: number) {
  b.at(x, y, z, ry, () => {
    b.ball(0, 0.18, 0, 0.5, 0.26, 2.1, '#6b4a2e', { seg: 8 });
    b.ball(0, 0.3, 0, 0.36, 0.14, 1.85, '#3d2c1c', { seg: 8 });
    b.box(0.5, 0.42, 0.4, 0.06, 0.06, 1.6, '#8a6644', { ry: 0.5 });
  });
}

const lakeside: SceneDef = {
  mood: 'outdoor', accent: '#7fd1c8',
  camera: { landscape: [20, 27, 35], portrait: [18, 35, 47], start: 3.5 },
  build(b, context) {
    const label = plain(context.label);
    const rand = seeded(11);
    // The bank (grass over earth) and the water lying lower than it
    b.box(0, -0.3, 4.6, 29, 0.5, 15.4, '#6e5a3c');
    b.box(0, -0.02, 4.6, 28, 0.1, 15, '#6aa056');
    b.box(0, 0.03, 2.2, 28, 0.04, 1.6, '#8c7a52');
    b.box(0, -2, -16, 76, 3.4, 30, '#2f5f63');
    b.box(0, WATER - 0.02, -16.6, 76, 0.1, 28.4, '#3f7f82');
    b.box(0, WATER + 0.03, -16.6, 76, 0.06, 28.4, '#6fb7b2', GLASS);
    for (let i = 0; i < 9; i++) b.box(-24 + i * 6.2, WATER + 0.07, -7 - (i % 4) * 4.2, 3.2, 0.02, 0.14, '#cfe9e4', { layer: 'glass' });
    // Forested far shore: dark swells with a spread of treetops
    ([[-26, -33, 6.5, '#2f5f45'], [-8, -36, 8, '#35684a'], [12, -34, 7, '#2c5a42'], [30, -33, 6, '#34654a'], [0, -42, 10, '#3d6e50']] as [number, number, number, Colour][]).forEach(([x, z, h, c]) => b.ball(x, WATER, z, 17, h, 8, c, { seg: 8 }));
    for (let i = 0; i < 44; i++) {
      const x = -34 + rand() * 68, z = -30.5 - rand() * 9, tone = ['#3d7a4a', '#2f6a44', '#4f8a45', '#5b9a55'][i % 4]!;
      b.ico(x, WATER + 3 + rand() * 4.5, z, 1.5 + rand(), 1.4 + rand() * 0.8, 1.4 + rand(), tone);
    }
    b.box(-14, WATER + 0.3, -29, 7, 0.5, 1.6, '#a8714b');
    // The dam: an earth embankment with a concrete face, a crest road and a valve house
    b.box(11.6, 1.1, -9.4, 4.6, 0.5, 15.8, '#7a9a58');
    b.box(11.6, 0.5, -9.4, 5.4, 1.4, 16.4, '#8e8a7e');
    b.box(9.1, 0.35, -9.4, 0.5, 1, 15.8, '#b0aca0', { rz: 0.5 });
    b.box(11.6, 1.38, -9.4, 2.4, 0.06, 15.8, '#7d7a70');
    for (let z = -16; z <= -2; z += 2.3) b.cyl(10.4, 1.9, z, 0.06, 1, '#c9ced3', { seg: 4 });
    b.box(10.4, 2.35, -9.4, 0.05, 0.05, 14.2, '#c9ced3');
    b.cyl(8.2, 1.4, -7.4, 0.9, 2.8, '#c9c4b3', { seg: 8, top: 0.88 });
    b.cone(8.2, 3.3, -7.4, 1.15, 0.8, '#8d4a2c', { seg: 8 });
    b.box(9.6, 1.5, -7.4, 1.8, 0.14, 0.5, '#8e8a7e');
    b.box(8.2, 1.1, -6.55, 0.5, 0.9, 0.06, '#3b332b');
    // The jetty and its canoe
    for (let z = -1.6; z > -9.6; z -= 0.42) b.box(4.6, 0.06, z, 1.7, 0.07, 0.36, z % 0.84 < 0.42 ? '#8a6644' : '#7a5a3a');
    for (let z = -2; z > -9.4; z -= 1.7) for (const side of [-1, 1]) b.cyl(4.6 + side * 0.85, 0.2, z, 0.1, 1.1, '#4a3826', { seg: 5 });
    canoe(b, 6.1, WATER + 0.05, -6, 0.1);
    canoe(b, -3.8, 0.08, 1.2, 1.1);
    b.box(-1.8, 0.45, 1.8, 0.07, 0.07, 1.8, '#8a6644', { rz: 0.1, ry: 0.4 });
    // Reeds along the water's edge and a few birds
    for (const [x, z, n] of ([[-12, -1.9, 7], [-8.4, -2.8, 6], [-3, -2.6, 7], [1.6, -2.6, 5], [7.6, -2.2, 5], [-10, -5.6, 6], [8.6, -3.4, 4]] as [number, number, number][])) reeds(b, x, z, n, rand);
    egret(b, -7.4, WATER, -3.4, 0.5); egret(b, -2.6, 0.02, -1.6, -0.6); egret(b, 3.6, 0.13, -9.1, 0.2);
    // Shade, a sign with the venue's label, a bench facing the water
    ([[-12, 5, 1.25, 2], [-8.4, 9.6, 1.1, 0], [12, 4.6, 1.2, 1], [9.4, 10, 0.95, 2]] as [number, number, number, number][]).forEach(([x, z, s, tone]) => leafTree(b, x, z, { s, tone }));
    ([[-3.4, 4.6], [6.4, 6.2], [-12.4, -0.6], [2.6, 10.4]] as [number, number][]).forEach(([x, z], i) => bush(b, x, z, { s: 0.8 + (i % 2) * 0.3, color: i % 2 ? LEAF_DARK : LEAF }));
    signBoard(b, -4, 6.8, label, { y: 1.6, size: fitSize(label, 5.2, 0.34), color: '#f1e6c4', board: '#2f4a45' });
    bench(b, 0.6, 0.2, { w: 2.6, ry: PI, back: true, color: '#8a6644', leg: '#5f4630' });
    lampPost(b, 8.2, 3.2, { light: true });
    extra(b, 'lake-sitter', 0.6, 0.2, PI, 'sit', { seat: 0.6 });
    extra(b, 'lake-fisher', -6.4, -0.5, PI + 0.3, 'stand', { look: { outfit: 'casual', outfitColor: 'green' } });
    b.box(-6.9, 0.9, -1.4, 0.04, 0.04, 2.6, '#6b5a3a', { rx: 0.7 });
    return {
      spots: [
        landmark('shore', /shore|edge|water|bird|view|reservoir|lake/, 2.2, -0.9, PI),
        landmark('jetty', /jetty|canoe|boat|pier|dock/, 4.6, -8.4, PI),
        landmark('dam', /dam|embank|crest|valve/, 8.6, -0.8, PI),
        landmark('angler', /fish|angl|rod/, -5.2, -0.4, PI),
        landmark('bench', /bench|sit|rest|chill|relax/, 2.2, 1.4, -HALF, { act: { pose: 'sit', x: 0.6, z: 0.2, ry: PI, seat: 0.6 } }),
        landmark('people', /people|crowd|meet/, 3.6, 4.8, 0),
      ],
      crowd: [[2.4, 3.4, 0.4], [-1.4, 5.6, -0.5], [4.2, 5.4, 2.6], [-3.4, 3.2, 1.2], [6.4, 2.6, -1], [-8, 3.2, 1.6], [1.2, 8, 2.2], [8.6, 5.6, -0.6], [-5.8, 7.6, 0.2], [5.4, 0.8, PI], [-10, 1, 2.6], [6.8, 9, 0.4]],
    };
  },
};

export const SCENES = { quad, hilltop, lakeside };
