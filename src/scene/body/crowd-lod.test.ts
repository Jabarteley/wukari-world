// The near crowd's level of detail (assets/base-body-<key>-lod.bin, made by scripts/body/build-lod.ts): made from the very body files
// shipped now, indices into their own vertices (so the skin weights, UVs, clothing regions and wardrobe masks all hold), a quarter or so
// of the triangles, small, and served the way the body files are (a ?url import the download budgets measure).
import test from 'node:test';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { brotliCompressSync } from 'node:zlib';
import { ASSET_PATTERNS } from '../../../scripts/download-budget.ts';
import { BODY_MANIFEST } from './manifest.ts';
import { CROWD_LOD } from './crowd-lod.ts';

const file = (name: string) => readFileSync(new URL(`./assets/${name}`, import.meta.url));

for (const key of ['male', 'female'] as const) {
  test(`base-body-${key}-lod.bin: from today's body file, inside its vertices, about a quarter of its triangles, every triangle whole`, () => {
    const facts = CROWD_LOD.bodies[key], body = BODY_MANIFEST.bodies[key], bytes = file(`base-body-${key}-lod.bin`);
    assert.equal(facts.source, body.sha, 'made from the body file shipped now (run npm run body:lod after npm run body:build)');
    assert.equal(facts.source, createHash('sha256').update(file(`base-body-${key}.glb`)).digest('hex').slice(0, 10));
    assert.equal(facts.sha, createHash('sha256').update(bytes).digest('hex').slice(0, 10));
    assert.equal(bytes.length, facts.bytes);
    assert.equal(bytes.length % 6, 0, 'whole triangles of 16-bit indices');
    const index = new Uint16Array(bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.length));
    assert.equal(index.length / 3, facts.triangles);
    assert.ok(facts.triangles <= body.triangles * 0.3 && facts.triangles >= body.triangles * 0.2, `${facts.triangles} of ${body.triangles}`);
    let degenerate = 0;
    for (let i = 0; i < index.length; i += 3) {
      for (let k = 0; k < 3; k++) assert.ok(index[i + k]! < facts.vertices, 'inside the body\'s vertices');
      if (index[i] === index[i + 1] || index[i + 1] === index[i + 2] || index[i] === index[i + 2]) degenerate += 1;
    }
    assert.equal(degenerate, 0);
    // Under a millimetre-scale error budget: the simplifier's relative error is under half a percent of the body's size.
    assert.ok(facts.error < 0.005, `error ${facts.error}`);
    assert.ok(brotliCompressSync(bytes).length < 20_000, 'small');
  });
}

test('the index files are ?url imports beside the bodies, measured by the body budget, and fetched only by the crowd', () => {
  const files = readFileSync(new URL('./files.ts', import.meta.url), 'utf8');
  for (const key of ['male', 'female']) assert.ok(files.includes(`./assets/base-body-${key}-lod.bin?url`));
  assert.ok(ASSET_PATTERNS.BASE_BODY_BROTLI!.pattern.test('assets/base-body-male-lod-0123abcd.bin'));
  const skinned = readFileSync(new URL('./skinned.ts', import.meta.url), 'utf8');
  assert.equal(skinned.match(/CROWD_LOD_FILES\[/g)?.length, 1, 'one reader: createCrowdBodies');
});
