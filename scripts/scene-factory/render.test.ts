import assert from 'node:assert/strict';
import test from 'node:test';
import type { Json } from '../assets/glb.ts';
import { selectKitPreviewPart } from './render.ts';

test('isolating a kit prop retains its transformed ancestors and all descendants', () => {
  const doc: Json = {
    scene: 0, scenes: [{ nodes: [0, 5] }],
    nodes: [
      { translation: [10, 2, -3], children: [1, 4] },
      { scale: [.01, .02, .03], rotation: [0, 0, .70710678, .70710678], children: [2, 6] },
      { name: 'market-stall', translation: [100, 200, 300], children: [3] },
      { mesh: 0, matrix: [1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 4, 5, 6, 1] },
      { name: 'bench', mesh: 1 }, { name: 'palm', mesh: 2 }, { name: 'crate-stack', mesh: 3 },
    ],
  };
  const before = structuredClone(doc);
  selectKitPreviewPart(doc, 'market-stall');
  assert.deepEqual(doc.scenes[0].nodes, [0]);
  assert.deepEqual(doc.nodes[0].children, [1]);
  assert.deepEqual(doc.nodes[1].children, [2]);
  assert.deepEqual(doc.nodes[0].translation, before.nodes[0].translation);
  assert.deepEqual(doc.nodes[1].scale, before.nodes[1].scale);
  assert.deepEqual(doc.nodes[1].rotation, before.nodes[1].rotation);
  assert.deepEqual(doc.nodes[2], before.nodes[2]);
  assert.deepEqual(doc.nodes[3], before.nodes[3]);
  assert.deepEqual(doc.nodes[4], before.nodes[4]);
});

test('a prop already at the scene root keeps its subtree and selects only that root', () => {
  const doc: Json = {
    scenes: [{ nodes: [0, 1] }],
    nodes: [{ name: 'bench', mesh: 0 }, { name: 'canopy', scale: [1.4, 1.4, 1.4], children: [2] }, { mesh: 1 }],
  };
  const subtree = structuredClone(doc.nodes.slice(1));
  selectKitPreviewPart(doc, 'canopy');
  assert.deepEqual(doc.scenes[0].nodes, [1]);
  assert.deepEqual(doc.nodes.slice(1), subtree);
});

test('an unknown part is refused before changing the preview scene', () => {
  const doc: Json = { scenes: [{ nodes: [0] }], nodes: [{ name: 'bench', mesh: 0 }] };
  const before = structuredClone(doc);
  assert.throws(() => selectKitPreviewPart(doc, 'missing'), /part node is missing/);
  assert.deepEqual(doc, before);
});
