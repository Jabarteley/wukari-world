import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync, existsSync, truncateSync } from 'node:fs';
import { resolve } from 'node:path';
import { pack, receive } from '../../scripts/wukari/transfer.ts';
import { sha256 } from '../../scripts/wukari/offline.ts';
import { coverage, report } from '../../scripts/wukari/coverage.ts';
import { buildDataset } from './geography.ts';
function workspace(run: (dir: string) => void): void { mkdirSync('.cache/wukari', { recursive: true }); const dir = mkdtempSync(resolve('.cache/wukari/transfer-test-')); try {
    run(dir);
}
finally {
    rmSync(dir, { recursive: true, force: true });
} }
function inputs(dir: string, content = '<osm version="0.6"/>') { const input = resolve(dir, 'input.osm'), receipt = resolve(dir, 'receipt.json'), bundle = resolve(dir, 'transfer.json'); const bytes = Buffer.from(content); writeFileSync(input, bytes); writeFileSync(receipt, JSON.stringify({ sourceUrl: 'https://api.openstreetmap.org/api/0.6/map', retrievedAt: '2026-10-20T12:00:00Z', license: 'ODbL-1.0', attribution: '© OpenStreetMap contributors', sha256: sha256(bytes), mode: 'source-data', scope: 'EMPTY UNIT TEST — no claimed campus geometry' })); return { input, receipt, bundle }; }
test('pack/transfer/receive preserves exact XML and receipt bytes and invokes existing import', () => workspace(dir => {
    const i = inputs(dir), p = pack(i.input, i.receipt, 'osm-xml', i.bundle), out = resolve(dir, 'received');
    receive(i.bundle, p.sha256, out);
    assert.deepEqual(readFileSync(resolve(out, 'source.bin')), readFileSync(i.input));
    assert.deepEqual(readFileSync(resolve(out, 'receipt.json')), readFileSync(i.receipt));
    assert.deepEqual(readFileSync(resolve(out, 'transfer.json')), readFileSync(i.bundle));
    assert.equal(JSON.parse(readFileSync(resolve(out, 'transfer-validation.json'), 'utf8')).status, 'imported-source-review-required');
    assert.equal(JSON.parse(readFileSync(resolve(out, 'imported/coverage.json'), 'utf8')).campus, 'unknown');
    assert.throws(() => receive(i.bundle, p.sha256, out), /EEXIST/);
}));
test('whole-file and nested hashes detect corruption before writing output', () => workspace(dir => {
    const i = inputs(dir), p = pack(i.input, i.receipt, 'osm-xml', i.bundle), out = resolve(dir, 'received');
    assert.throws(() => receive(i.bundle, '0'.repeat(64), out), /SHA-256/);
    assert.equal(existsSync(out), false);
    const b = JSON.parse(readFileSync(i.bundle, 'utf8'));
    b.source.base64 = Buffer.from('altered').toString('base64');
    const changed = Buffer.from(JSON.stringify(b));
    writeFileSync(i.bundle, changed);
    assert.throws(() => receive(i.bundle, sha256(changed), out), /mismatch/);
    assert.equal(existsSync(out), false);
}));
test('invalid geometry is rejected by existing importer and journal remains explicitly rejected', () => workspace(dir => {
    const i = inputs(dir, '<osm version="0.6"><node id="1" lon="0" lat="91"/></osm>'), p = pack(i.input, i.receipt, 'osm-xml', i.bundle), out = resolve(dir, 'received');
    assert.throws(() => receive(i.bundle, p.sha256, out), /latitude/);
    assert.equal(JSON.parse(readFileSync(resolve(out, 'transfer-validation.json'), 'utf8')).status, 'rejected');
    assert.equal(existsSync(resolve(out, 'imported/dataset.json')), false);
}));
test('synthetic receipt, unsupported PBF and existing transfer outputs are refused', () => workspace(dir => {
    const i = inputs(dir);
    pack(i.input, i.receipt, 'osm-xml', i.bundle);
    assert.throws(() => pack(i.input, i.receipt, 'osm-xml', i.bundle), /EEXIST/);
    assert.throws(() => pack(i.input, i.receipt, 'osm-pbf', resolve(dir, 'bad')), /prepare PBF/);
    const receipt = JSON.parse(readFileSync(i.receipt, 'utf8'));
    receipt.mode = 'synthetic';
    writeFileSync(i.receipt, JSON.stringify(receipt));
    assert.throws(() => pack(i.input, i.receipt, 'osm-xml', resolve(dir, 'bad')), /Synthetic/);
}));
test('coverage graph uses original references and distinguishes disconnected crossings; synthetic fixtures stay labeled', () => {
    const boundary = JSON.parse(readFileSync('data/wukari/fixtures/boundary.synthetic.json', 'utf8')), osm = JSON.parse(readFileSync('data/wukari/fixtures/osm.synthetic.json', 'utf8'));
    const d = buildDataset(boundary, osm, { synthetic: true });
    // Explicit synthetic unit geometry. Crossing without shared OSM node is not a junction.
    d.osm.elements = [{ type: 'way', id: 1, nodes: [1, 2], geometry: [{ lon: 0, lat: 0 }, { lon: 1, lat: 1 }], tags: { highway: 'footway' } }, { type: 'way', id: 2, nodes: [3, 4], geometry: [{ lon: 0, lat: 1 }, { lon: 1, lat: 0 }], tags: { highway: 'path' } }];
    assert.equal(coverage(d).roadConnectivity.components, 2);
    assert.equal(coverage(d).mode, 'synthetic');
    assert.equal(coverage(d).sourceBackedNamedLandmarkRecords, null);
    workspace(dir => { const path = resolve(dir, 'synthetic.json'); writeFileSync(path, JSON.stringify(d)); assert.throws(() => report(path), /refuses synthetic/); });
    assert.equal(coverage(d).estimatedCampusCoveragePercent, null);
    d.osm.elements.push({ type: 'way', id: 3, nodes: [2, 3], geometry: [{ lon: 1, lat: 1 }, { lon: 0, lat: 1 }], tags: { highway: 'path' } });
    assert.equal(coverage(d).roadConnectivity.components, 1);
});
test('current FUW report has unknown geographic coverage and pinned attributed source, not a zero-percent survey', () => {
    const path = 'data/wukari/verified/context.dataset.json', r = report(path);
    assert.equal(r, readFileSync('docs/wukari/FUW_COVERAGE_REPORT.md', 'utf8'));
    assert.match(r, /CC-BY-4.0/);
    assert.match(r, /Unknown; no supported denominator/);
    assert.match(r, /Imported roads \/ footpaths \| 0/);
    assert.match(r, /bef7f2cfa45e012f4772eaa61c7b99e5188aeba4d5c6badae7e9f9aae8c02fcd/);
});
test('OSM JSON transfer follows the same existing import path', () => workspace(dir => {
    const i = inputs(dir, JSON.stringify({ version: 0.6, elements: [] })), p = pack(i.input, i.receipt, 'osm-json', i.bundle), out = resolve(dir, 'received');
    receive(i.bundle, p.sha256, out);
    assert.equal(JSON.parse(readFileSync(resolve(out, 'imported/provenance.json'), 'utf8')).format, 'osm-json');
}));
test('transfer source size limit is enforced before reading/package creation', () => workspace(dir => {
    const i = inputs(dir);
    truncateSync(i.input, 20 * 1024 * 1024 + 1);
    assert.throws(() => pack(i.input, i.receipt, 'osm-xml', i.bundle), /exceeds/);
    assert.equal(existsSync(i.bundle), false);
}));
