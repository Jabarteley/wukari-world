import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { NIGERIA_RUNTIME_SCENES } from '../nigeria-runtime-scenes.ts';
import { loadCityScenes } from '../city-scenes.ts';
import { loadCityContent } from '../../game/cities/registry.ts';
import { venueFor } from '../../game/cities/runtime.ts';
import { buildVenueScene } from '../venue-scenes.ts';
import { createKit } from '../kit.ts';

test('deployed Nigeria tiers match pinned bytes and fit their host reservations including shadows', () => {
  for (const scene of Object.values(NIGERIA_RUNTIME_SCENES)) {
    const runtime = scene.runtime!;
    for (const tier of ['near', 'far'] as const) {
      const file = runtime.request[tier];
      const bytes = readFileSync(new URL(`../../../public${file.url}`, import.meta.url));
      assert.equal(createHash('sha256').update(bytes).digest('hex'), file.sha256);
      assert.equal(bytes.readUInt32LE(0), 0x46546c67);
      const doc = JSON.parse(bytes.subarray(20, 20 + bytes.readUInt32LE(12)).toString());
      let triangles = 0, draws = 0;
      const visit = (id: number) => {
        const node = doc.nodes[id];
        if (node.mesh !== undefined) for (const primitive of doc.meshes[node.mesh].primitives) {
          assert.equal(primitive.mode ?? 4, 4);
          triangles += doc.accessors[primitive.indices ?? primitive.attributes.POSITION].count / 3;
          const material = doc.materials[primitive.material];
          draws += (material.alphaMode === 'BLEND' && material.doubleSided ? 2 : 1) + 1;
        }
        for (const child of node.children ?? []) visit(child);
      };
      for (const node of doc.scenes[doc.scene ?? 0].nodes) visit(node);
      assert.ok(triangles <= runtime.reservation.triangles, `${file.url}: ${triangles} triangles`);
      assert.ok(draws <= runtime.reservation.drawCalls, `${file.url}: ${draws} draws`);
      assert.ok(bytes.byteLength < 8 * 1024 * 1024);
      assert.ok(!doc.extensions?.KHR_lights_punctual);
      assert.ok(doc.images.every((image: { uri?: string }) => !image.uri));
    }
  }
});

test('Lagos revision preserves accepted navigation and binds its published manifest', () => {
  const base = new URL('../../../docs/research/nigeria-runtime-20261015/asset-provenance/', import.meta.url);
  const original = JSON.parse(readFileSync(new URL('batch-001/lagos-broad-street-01/manifest.json', base), 'utf8'));
  const bytes = readFileSync(new URL('revisions/lagos-broad-street-02/manifest.json', base));
  assert.equal(createHash('sha256').update(bytes).digest('hex'), '8c6681fd6fb23b9080452c51caea721cbc42c838ac194df238b020ba611ca8e7');
  assert.deepEqual(JSON.parse(bytes.toString()).navigation, original.navigation);
});

test('actual Lagos host markers cannot disconnect the authored sidewalk or action anchors', async () => {
  await Promise.all([loadCityScenes('lagos'), loadCityContent('lagos')]);
  const kit = createKit(), entry = buildVenueScene(kit, venueFor('lagos', 'market'), 'lagos');
  try {
    const grid = entry.walk.grid!;
    const start = entry.walk.entrance!;
    for (const target of [{ x: 6, z: 2.8 }, ...entry.walk.spots()]) {
      const path = grid.path(start.x, start.z, target.x, target.z);
      assert.ok(path?.length);
      const end = path.at(-1)!;
      assert.ok(Math.hypot(end.x - target.x, end.z - target.z) < .001, `requested ${target.x},${target.z}; reached ${end.x},${end.z}`);
    }
    assert.equal(grid.free(.6 * 1.4, 2.1 * 1.4), false, 'authored furniture remains blocked');
  } finally { entry.dispose(); kit.dispose(); }
});
