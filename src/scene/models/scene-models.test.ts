import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import { createKit } from '../kit.ts';
import { budgetOf, createModelCache, createModelLayer, labelCells, labelRect, mergeKeys } from './scene-models.ts';
import type { ModelData, ModelPart, ModelSource } from './scene-models.ts';

/** A model of `quads` quads (2 triangles each) on atlas `atlas`. */
function model(key: string, atlas: string, quads = 1, extra: Partial<ModelPart> = {}): ModelData {
  const position = new Float32Array(quads * 12), normal = new Float32Array(quads * 12), uv = new Float32Array(quads * 8), index = new Uint32Array(quads * 6);
  for (let q = 0; q < quads; q++) {
    position.set([0, 0, q, 1, 0, q, 1, 1, q, 0, 1, q], q * 12);
    for (let v = 0; v < 4; v++) normal[q * 12 + v * 3 + 2] = 1;
    uv.set([0, 0, 1, 0, 1, 1, 0, 1], q * 8);
    index.set([0, 1, 2, 0, 2, 3].map((i) => i + q * 4), q * 6);
  }
  return { key, anchors: {}, triangles: quads * 2, parts: [{ name: key, writable: false, atlas, position, normal, uv, color: null, index, ...extra }] };
}
function source(files: Record<string, ModelData | Error>, log: string[] = []): ModelSource {
  return {
    load: (key) => { log.push(key); const entry = files[key]; return entry instanceof Error || !entry ? Promise.reject(entry ?? new Error('missing')) : Promise.resolve(entry); },
    texture: () => null,
  };
}
const stand = (calls: { n: number }) => () => { calls.n += 1; };

test('a file is read once however many placements and layers use it', async () => {
  const log: string[] = [];
  const cache = createModelCache(source({ a: model('a', 'x') }, log));
  const kit = createKit();
  try {
    for (let round = 0; round < 2; round++) {
      const layer = createModelLayer(kit, cache);
      for (let i = 0; i < 5; i++) layer.add({ near: 'a', x: i, z: 0 });
      layer.build();
      await layer.load(() => undefined);
      layer.dispose();
    }
    assert.deepEqual(log, ['a']);
    assert.equal(cache.reads, 1);
  } finally { kit.dispose(); }
});

test('copies on one atlas are one mesh; another atlas is another; stats count them', async () => {
  const cache = createModelCache(source({ a: model('a', 'x', 3), b: model('b', 'x'), c: model('c', 'y') }));
  const kit = createKit();
  try {
    const layer = createModelLayer(kit, cache);
    layer.add({ near: 'a', x: 0, z: 0 }); layer.add({ near: 'a', x: 5, z: 0, ry: Math.PI / 2, scale: 2 }); layer.add({ near: 'b', x: 9, z: 0 }); layer.add({ near: 'c', x: 12, z: 0 });
    layer.build();
    let changed = 0;
    await layer.load(() => { changed += 1; });
    assert.equal(changed, 1, 'one swap, one notice');
    const s = layer.stats();
    assert.equal(s.drawCalls, 2); assert.equal(s.triangles, 6 + 6 + 2 + 2); assert.equal(s.models, 3); assert.deepEqual(s.atlases, ['x', 'y']);
    const meshes = layer.group.children.filter((c): c is THREE.Mesh => c instanceof THREE.Mesh);
    const merged = meshes.find((m) => m.name === 'model:x:near')!;
    const at = merged.geometry.getAttribute('position');
    // the turned, doubled copy of quad 0: local (1,0,0) -> x + 0*... scale 2, ry 90 degrees -> (5, 0, -2)
    // copy two is quad 0 of model a turned 90 degrees and doubled: its vertex (1,0,0) lands at (5, 0, -2)
    const found = Array.from({ length: at.count }, (_, i) => [at.getX(i), at.getY(i), at.getZ(i)].map((v) => Math.round(v * 100) / 100)).some(([x, y, z]) => x === 5 && y === 0 && z === -2);
    assert.ok(found);
    layer.dispose();
  } finally { kit.dispose(); }
});

test('a stand-in is drawn at once, swapped for the model when it arrives, and kept when the file fails', async () => {
  const cache = createModelCache(source({ ok: model('ok', 'x'), bad: new Error('404') }));
  const kit = createKit();
  try {
    const layer = createModelLayer(kit, cache), drawn = { n: 0 }, kept = { n: 0 };
    layer.add({ near: 'ok', x: 0, z: 0, standIn: stand(drawn) }); layer.add({ near: 'bad', x: 4, z: 0, standIn: stand(kept) });
    layer.build();
    assert.equal(layer.stats().standIns, 2); assert.equal(layer.stats().triangles, 0);
    assert.equal(drawn.n, 1);
    await layer.load(() => undefined);
    assert.equal(layer.stats().standIns, 1, 'only the failed one stays a stand-in');
    assert.equal(layer.stats().models, 1);
    assert.equal(kept.n, 2, 'the failed one is drawn again, the arrived one is not');
    assert.equal(drawn.n, 1);
    // a second layer finds the model already loaded: no stand-in at all
    const again = createModelLayer(kit, cache);
    again.add({ near: 'ok', x: 0, z: 0, standIn: stand(drawn) });
    again.build();
    assert.equal(again.stats().standIns, 0); assert.equal(drawn.n, 1);
    layer.dispose(); again.dispose();
  } finally { kit.dispose(); }
});

test('near and far follow the focus; far details are skipped; the far file is only read when needed', async () => {
  const log: string[] = [];
  const cache = createModelCache(source({ n: model('n', 'x', 4), f: model('f', 'x-far', 1), d: model('d', 'x') }, log));
  const kit = createKit();
  try {
    const layer = createModelLayer(kit, cache, { nearRadius: 50, focus: { x: 0, z: 0 } });
    layer.add({ near: 'n', far: 'f', x: 0, z: 0 }); layer.add({ near: 'n', far: 'f', x: 100, z: 0 }); layer.add({ near: 'd', x: 100, z: 0, detail: true });
    layer.build();
    await layer.load(() => undefined);
    assert.ok(log.includes('f') && log.includes('n'));
    assert.deepEqual(layer.stats().levels, { near: 1, far: 1 });
    assert.equal(layer.stats().triangles, 8 + 2, 'the detail at the far level is not drawn');
    assert.equal(layer.focus(100, 0), true);
    await new Promise((resolve) => setTimeout(resolve, 0));
    assert.deepEqual(layer.stats().levels, { near: 2, far: 1 });
    assert.equal(layer.focus(101, 0), false, 'a small move changes nothing');
    layer.dispose();
  } finally { kit.dispose(); }
});

test('the budget drops the cheapest and farthest first, and says so', async () => {
  const cache = createModelCache(source({ a: model('a', 'x', 5) }));
  const kit = createKit();
  try {
    const layer = createModelLayer(kit, cache, { budget: { triangles: 30, drawCalls: 5 }, focus: { x: 0, z: 0 } });
    for (let i = 0; i < 5; i++) layer.add({ near: 'a', x: i * 10, z: 0, priority: i === 4 ? 0 : 1 });
    layer.build(); await layer.load(() => undefined);
    const s = layer.stats();
    assert.equal(s.dropped, 2); assert.ok(s.triangles <= 30);
    layer.dispose();
  } finally { kit.dispose(); }
  const m = model('a', 'x', 5);
  const items = [0, 1, 2].map((i) => ({ model: m, mode: 'merge' as const, level: 'near' as const, labels: false, priority: i, distance: 0 }));
  const plan = budgetOf(items, { triangles: 20, drawCalls: 9 });
  assert.deepEqual([...plan.drop], [0]);
  assert.equal(plan.drawCalls, 1);
});

test('instanced placements are one instanced mesh per part', async () => {
  const cache = createModelCache(source({ p: model('p', 'own', 2) }));
  const kit = createKit();
  try {
    const layer = createModelLayer(kit, cache);
    for (let i = 0; i < 4; i++) layer.add({ near: 'p', x: i, z: 0, mode: 'instance' });
    layer.build(); await layer.load(() => undefined);
    const instanced = layer.group.children.filter((c): c is THREE.InstancedMesh => c instanceof THREE.InstancedMesh);
    assert.equal(instanced.length, 1); assert.equal(instanced[0]!.count, 4);
    assert.equal(layer.stats().drawCalls, 1); assert.equal(layer.stats().triangles, 16);
    layer.dispose();
  } finally { kit.dispose(); }
});

test('label cells are shared by equal text and sit inside the atlas', () => {
  const { cell, rows } = labelCells(['7', 'KIOSK', '7', 'BUS STOP', 'A', 'B']);
  assert.equal(cell.size, 5); assert.equal(rows, 2);
  const [u0, v0, u1, v1] = labelRect(4, rows);
  assert.ok(u0 >= 0 && v0 >= 0 && u1 <= 1 && v1 <= 1 && u1 > u0 && v1 > v0);
  const part = model('s', 'x').parts[0]!;
  assert.equal(mergeKeys(part, 'near', false), 'x:near');
  assert.equal(mergeKeys({ ...part, writable: true }, 'far', true), 'label:far');
});

test('moving the focus reads the file a placement now needs, and keeps its other version on screen meanwhile', async () => {
  const cache = createModelCache(source({ n: model('n', 'x', 4), f: model('f', 'x-far', 1) }));
  const kit = createKit();
  try {
    const layer = createModelLayer(kit, cache, { nearRadius: 50, focus: { x: 100, z: 0 } });
    let notices = 0;
    layer.add({ near: 'n', far: 'f', x: 0, z: 0, standIn: () => undefined });
    layer.build();
    await layer.load(() => { notices += 1; });
    assert.deepEqual(layer.stats().levels, { near: 0, far: 1 });
    assert.equal(cache.peek('n'), null, 'the full model has not been read');
    assert.equal(layer.focus(0, 0), true);
    assert.equal(layer.stats().standIns, 0, 'the far version stays until the full one has arrived');
    await new Promise((resolve) => setTimeout(resolve, 0));
    assert.equal(cache.peek('n') !== null, true); assert.equal(layer.stats().triangles, 8); assert.equal(notices, 2);
    layer.dispose();
  } finally { kit.dispose(); }
});

test('walking near and far builds the layer again without throwing its materials away (a material takes its compiled shader with it)', async () => {
  const cache = createModelCache(source({ n: model('n', 'x', 4), f: model('f', 'x-far', 1) }));
  const kit = createKit();
  try {
    const decorated: THREE.Material[] = [];
    const layer = createModelLayer(kit, cache, { nearRadius: 50, focus: { x: 0, z: 0 }, decorate: (material) => { decorated.push(material); } });
    layer.add({ near: 'n', far: 'f', x: 0, z: 0 }); layer.add({ near: 'n', far: 'f', x: 100, z: 0 });
    layer.build();
    await layer.load(() => undefined);
    const used = (): THREE.Material[] => { const found = new Set<THREE.Material>(); layer.group.traverse((object) => { const material = (object as THREE.Mesh).material; if (material && !Array.isArray(material)) found.add(material); }); return [...found]; };
    const first = used();
    let disposals = 0;
    for (const material of first) material.addEventListener('dispose', () => { disposals += 1; });
    assert.ok(first.length >= 2, 'one material per atlas in use');
    for (let lap = 0; lap < 6; lap++) { assert.equal(layer.focus(lap % 2 ? 0 : 100, 0), true, 'the levels swap, so the layer is built again'); await new Promise((resolve) => setTimeout(resolve, 0)); }
    assert.equal(disposals, 0, 'six builds disposed no material');
    assert.deepEqual(new Set(used()), new Set(first), 'and the meshes wear the same materials');
    assert.equal(decorated.length, first.length, 'each material was decorated once, not once per build');
    layer.dispose();
    assert.equal(disposals, first.length, 'closing the layer lets them all go');
  } finally { kit.dispose(); }
});
