import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { NIGERIA_RUNTIME_SCENES } from '../nigeria-runtime-scenes.ts';

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
  const base = new URL('../../../public/assets/nigeria-runtime/', import.meta.url);
  const original = JSON.parse(readFileSync(new URL('batch-001/lagos-broad-street-01/manifest.json', base), 'utf8'));
  const bytes = readFileSync(new URL('revisions/lagos-broad-street-02/manifest.json', base));
  assert.equal(createHash('sha256').update(bytes).digest('hex'), '8c6681fd6fb23b9080452c51caea721cbc42c838ac194df238b020ba611ca8e7');
  assert.deepEqual(JSON.parse(bytes.toString()).navigation, original.navigation);
});
