import assert from 'node:assert/strict';
import { readFileSync, rmSync } from 'node:fs';
import { test } from 'node:test';
import { fileURLToPath } from 'node:url';
import { run } from '../../scripts/wukari/import.ts';

test('CLI produces repeatable synthetic content, retains raw inputs, rejects unsafe outputs and missing evidence', () => {
  const out = fileURLToPath(new URL('../../.cache/wukari/import-test/', import.meta.url));
  try {
    run(['--synthetic', '--out', out]);
    const first = JSON.parse(readFileSync(`${out}/dataset.json`, 'utf8'));
    assert.equal(first.mode, 'synthetic'); assert.equal(first.provenance.sources[0].url, null);
    assert.deepEqual(JSON.parse(readFileSync(`${out}/osm.source.json`, 'utf8')).elements, first.osm.elements);
    run(['--synthetic', '--out', out]);
    const second = JSON.parse(readFileSync(`${out}/dataset.json`, 'utf8'));
    delete first.provenance.importedAt; delete second.provenance.importedAt;
    assert.deepEqual(first, second);
    assert.throws(() => run(['--synthetic', '--out', '/tmp/should-not-write-wukari']), /must stay/);
    assert.throws(() => run([]), /Supply/);
    assert.throws(() => run(['--made-up']), /Unknown/);
  } finally { rmSync(out, { recursive: true, force: true }); }
});
