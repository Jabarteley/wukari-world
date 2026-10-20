import assert from 'node:assert/strict';
import { mkdtemp, readFile, readdir, rm, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { test } from 'node:test';
import { verifyBoundary } from '../../scripts/wukari/verify-boundary.ts';
import { boundaryContext, boundsOf, discoveryQuery } from '../../scripts/wukari/acquire.ts';
import { fromWorld, rings, selectBoundary, toWorld } from './geography.ts';

const directory = new URL('../../data/wukari/verified/', import.meta.url).pathname;
test('committed real boundary verifies offline with source attribution and honest missing-campus state', async () => {
  await verifyBoundary(directory);
  const boundary = selectBoundary(JSON.parse(await readFile(join(directory, 'wukari-adm2.geojson'), 'utf8')));
  const context = boundaryContext(boundary);
  assert.equal(context.mode, 'source-data'); assert.equal(context.extents.campus.geometry, null);
  assert.equal(context.extents.town.geometry, null); assert.deepEqual(context.osm.elements, []);
  assert.match(context.disclaimer, /not a campus map/); assert.equal(context.extents.lga.feature.properties.shapeName, 'Wukari');
  const box = boundsOf(boundary.geometry); assert.ok(box[0] < box[2] && box[1] < box[3]);
  assert.ok(discoveryQuery(boundary.geometry).includes(box.join(',')));
});
test('every preserved real Wukari vertex round-trips without source rounding or axis swap', async () => {
  const boundary = selectBoundary(JSON.parse(await readFile(join(directory, 'wukari-adm2.geojson'), 'utf8')));
  const origin = rings(boundary.geometry)[0]![0]!;
  for (const p of rings(boundary.geometry).flat()) {
    const world = toWorld(origin, p), back = fromWorld(origin, world.x, world.z);
    assert.ok(Math.abs(p[0] - back[0]) < 1e-12 && Math.abs(p[1] - back[1]) < 1e-12);
  }
});
test('tampered coordinates, licenses, receipt hash, query, campus claims and dataset content are refused', async () => {
  for (const change of ['coordinates', 'license', 'hash', 'query', 'campus', 'dataset']) {
    const copy = await mkdtemp(join(tmpdir(), 'wukari-boundary-test-'));
    try {
      for (const name of await readdir(directory)) await writeFile(join(copy, name), await readFile(join(directory, name)));
      if (change === 'coordinates') await writeFile(join(copy, 'wukari-adm2.geojson'), '{}');
      if (change === 'query') await writeFile(join(copy, 'discovery.overpassql'), '[out:json];out;');
      if (change === 'license' || change === 'hash') {
        const p = JSON.parse(await readFile(join(copy, 'provenance.json'), 'utf8'));
        p.sources[0][change === 'license' ? 'license' : 'sha256'] = 'modified';
        await writeFile(join(copy, 'provenance.json'), JSON.stringify(p));
      }
      if (change === 'campus') {
        const c = JSON.parse(await readFile(join(copy, 'coverage.json'), 'utf8')); c.campusBoundary = 'verified';
        await writeFile(join(copy, 'coverage.json'), JSON.stringify(c));
      }
      if (change === 'dataset') {
        const c = JSON.parse(await readFile(join(copy, 'context.dataset.json'), 'utf8')); c.origin[0] += 0.00001;
        await writeFile(join(copy, 'context.dataset.json'), JSON.stringify(c));
      }
      await assert.rejects(verifyBoundary(copy));
    } finally { await rm(copy, { recursive: true, force: true }); }
  }
});
