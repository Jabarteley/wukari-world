import assert from 'node:assert/strict';
import test from 'node:test';
import * as THREE from 'three';
import { createKit } from '../kit.ts';
import { createBatch, sceneMaterials } from '../build.ts';
import { createModelLayer } from '../models/scene-models.ts';
import type { ModelPart, ModelCache } from '../models/scene-models.ts';
import type { SceneRecipeV1, ValidatedRecipe } from './contract.ts';
import type { PreparedCityAssets } from './prepare.ts';
import { atlasCell, atlasRowsFlipped, kitSurfaceMask, recipeSurfaceOwner } from './surface-material.ts';

const recipe: SceneRecipeV1 = {
  schema: 'allworld-scene', version: 1, units: 'scene', city: 'accra', venue: 'test-market', kind: 'market', region: 'gulf-guinea', mood: 'outdoor',
  palette: { ground: '#777777', wall: '#777777', roof: '#777777', accent: '#777777', trim: '#777777' },
  footprint: { w: 12, d: 10 }, entrance: [0, 3, 0],
  shell: [{ position: [0, 1, -4], size: [8, 2, 0.4], ry: 0.35, colour: '#777777' }],
  props: [], signs: [], spots: [], crowd: [], lamps: [], camera: { landscape: [0, 20, 20], portrait: [0, 20, 20] },
};
function part(cell = 8, name = 'wall', horizontal = false): ModelPart {
  const u = ((cell % 4) + 0.4) / 4, v = 1 - (Math.floor(cell / 4) + 0.4) / 4;
  return { name, writable: false, atlas: 'test-atlas',
    position: new Float32Array(horizontal ? [0, 0, 0, 1, 0, 0, 0, 0, 1] : [0, 0, 0, 1, 0, 0, 0, 1, 0]),
    normal: new Float32Array(horizontal ? [0, 1, 0, 0, 1, 0, 0, 1, 0] : [0, 0, 1, 0, 0, 1, 0, 0, 1]),
    uv: new Float32Array([u, v, u + 0.03, v, u, v + 0.03]), color: null, index: new Uint32Array([0, 1, 2]) };
}

test('semantic masks require known prop, complete UV cell and vertical triangle', () => {
  assert.equal(atlasRowsFlipped(part()), true);
  assert.equal(atlasCell(0.1, 0.9, true), 0);
  assert.deepEqual([...kitSurfaceMask(part(), 'wall', true)], [2, 2, 2]);
  assert.deepEqual([...kitSurfaceMask(part(5, 'kiosk'), 'kiosk', true)], [2, 2, 2]);
  for (const name of [null, 'minibus', 'broadleaf-tree', 'market-stall']) assert.ok(kitSurfaceMask(part(), name, true).every(v => v === 0));
  for (const cell of [0, 1, 2, 3, 4, 5, 6, 7, 9, 10, 11, 12, 13, 14, 15]) assert.ok(kitSurfaceMask(part(cell), 'wall', true).every(v => v === 0));
  assert.ok(kitSurfaceMask(part(8, 'wall', true), 'wall', true).every(v => v === 0));
  const seam = part(); seam.uv![0] = 0.9;
  assert.ok(kitSurfaceMask(seam, 'wall', true).every(v => v === 0));
  assert.throws(() => atlasRowsFlipped(part(5)), /orientation/);
});

test('actual Batch floor/shell use isolated clone and explicit roles, restore on disposal', () => {
  const kit = createKit(), batch = createBatch(THREE);
  let adopted = 0;
  kit.eachMaterial(material => {
    if (material.userData.jawGhost) return;
    material.userData.jawGhost = true; adopted++;
    material.onBeforeCompile = shader => { shader.uniforms.uGhost = { value: 1 }; };
    material.customProgramCacheKey = () => 'ghost-test';
  });
  batch.box(0, -0.1, 0, 12, 0.2, 10, '#777777');
  for (const box of recipe.shell) batch.at(...box.position, box.ry, b => b.box(0, 0, 0, ...box.size, box.colour));
  const built = batch.build(sceneMaterials(kit)), mesh = built.meshes[0]!, original = mesh.material;
  const arrays = Object.fromEntries(Object.entries(mesh.geometry.attributes).map(([k, v]) => [k, Array.from(v.array)]));
  const owner = recipeSurfaceOwner(kit, recipe), before = adopted;
  owner.fallback(built.meshes);
  assert.notEqual(mesh.material, original); assert.equal(adopted, before + 1);
  const mask = mesh.geometry.getAttribute('recipeSurface');
  assert.equal(Array.from(mask.array).filter(v => v === 1).length, 4);
  assert.equal(Array.from(mask.array).filter(v => v === 2).length, 16);
  for (const [key, values] of Object.entries(arrays)) assert.deepEqual(Array.from(mesh.geometry.getAttribute(key).array), values);
  let disposed = 0; (mesh.material as THREE.Material).addEventListener('dispose', () => disposed++);
  owner.dispose(); owner.dispose(); assert.equal(disposed, 1); assert.equal(mesh.material, original); assert.equal(mesh.geometry.hasAttribute('recipeSurface'), false);
  mesh.geometry.dispose(); kit.dispose();
});

test('shader composes prior hook/cache key, isolates owners and works for both lit material types', () => {
  for (const matte of [false, true]) {
    const kit = createKit({ matte }), a = recipeSurfaceOwner(kit, recipe), b = recipeSurfaceOwner(kit, { ...recipe, city: 'nairobi' });
    const first = kit.material('#aaaaaa').clone(), second = kit.material('#bbbbbb').clone();
    let calls = 0;
    first.onBeforeCompile = shader => { calls++; shader.fragmentShader += '\n// prior ghost discard'; shader.uniforms.uGhost = { value: 0.5 }; };
    first.customProgramCacheKey = () => 'prior-ghost';
    a.decorate(first); a.decorate(first); b.decorate(second);
    function shader() { return { uniforms: {}, vertexShader: '#include <project_vertex>', fragmentShader: '#include <map_fragment>\n#include <clipping_planes_fragment>' } as THREE.WebGLProgramParametersWithUniforms; }
    const one = shader(), two = shader(); first.onBeforeCompile(one, {} as THREE.WebGLRenderer); second.onBeforeCompile(two, {} as THREE.WebGLRenderer);
    assert.equal(calls, 1); assert.equal(first.customProgramCacheKey(), 'prior-ghost:recipe-surface-v1');
    assert.match(one.fragmentShader, /prior ghost discard/); assert.match(one.fragmentShader, /clipping_planes_fragment/); assert.match(one.fragmentShader, /fwidth/);
    assert.notEqual(one.uniforms.uRecipePhase, two.uniforms.uRecipePhase); assert.notEqual(one.uniforms.uRecipePhase!.value, two.uniforms.uRecipePhase!.value);
    assert.equal(first.side, THREE.FrontSide); assert.equal(first.transparent, false);
    a.dispose(); b.dispose(); first.dispose(); second.dispose(); kit.dispose();
  }
});

test('real ModelLayer merge masks preserve transforms, arrays and hero exclusion with shared atlas', () => {
  const kit = createKit(), wall = part(), hero = part(8, 'hero');
  const models = new Map([['wall', { key: 'kit:wall', parts: [wall], anchors: {}, triangles: 1 }], ['hero', { key: 'hero:hero', parts: [hero], anchors: {}, triangles: 1 }]]);
  const cache: ModelCache = { reads: 0, source: { load: async key => models.get(key.split(':').at(-1)!)!, texture: () => null },
    peek: key => models.get(key.split(':').at(-1)!) ?? null, request: async key => models.get(key.split(':').at(-1)!) ?? null, failed: () => false };
  const measure = { version: 1 as const, kind: 'kit' as const, id: 'gulf-guinea', sha256: 'kit', rawBytes: 1, brotliBytes: 1, triangles: 1, parts: [] };
  const prepared: PreparedCityAssets = { kit: { measurement: measure, models: new Map([['wall', models.get('wall')!]]) }, hero: { measurement: { ...measure, kind: 'hero', sha256: 'hero' }, models: new Map([['hero', models.get('hero')!]]) } };
  const base = { x: 2, z: -1, ry: 0.73, scale: 1.4, bounds: { min: [0, 0, 0] as [number, number, number], max: [1, 1, 1] as [number, number, number] }, footprint: [0, 0, 1, 1] as [number, number, number, number], triangles: 1 };
  const value: ValidatedRecipe = { recipe, placements: [{ ...base, source: 'kit', id: 'wall', node: 'wall', assetSha256: 'kit' }, { ...base, source: 'hero', id: 'hero', node: 'hero', assetSha256: 'hero' }], walk: { bounds: [-6, -5, 6, 5], block: [] }, solids: [], estimate: { triangles: 2, meshes: 1, lights: 0 }, evidence: 'recipe-validation-only' };
  const owner = recipeSurfaceOwner(kit, recipe), layer = createModelLayer(kit, cache, { decorate: owner.decorate });
  for (const p of value.placements) layer.add({ near: `${p.assetSha256}:${p.node}`, x: p.x, z: p.z, ry: p.ry, scale: p.scale, mode: 'merge' });
  layer.build(); const mesh = layer.group.children[0] as THREE.Mesh;
  const position = Array.from(mesh.geometry.getAttribute('position').array), indices = Array.from(mesh.geometry.index!.array), stats = layer.stats();
  owner.merged(layer.group, value, prepared);
  assert.deepEqual(Array.from(mesh.geometry.getAttribute('recipeSurface').array), [2, 2, 2, 0, 0, 0]);
  assert.deepEqual(Array.from(mesh.geometry.getAttribute('position').array), position); assert.deepEqual(Array.from(mesh.geometry.index!.array), indices); assert.deepEqual(layer.stats(), stats);
  assert.equal(wall.position[0], 0); assert.equal(wall.uv![0], part().uv![0]);
  owner.dispose(); layer.dispose(); kit.dispose();
});
