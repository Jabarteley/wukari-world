/** Offline audit inputs. A kit-only bootstrap cannot require the not-yet-generated city registry. */
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { lstat, readFile, realpath } from 'node:fs/promises';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { REGION_IDS } from './contract.ts';
import type { MeasuredAsset, RegionId } from './contract.ts';
import { parseAssetRef, record } from './pack.ts';

interface KitRow { id: RegionId; asset: string; report: string }
const hash = (bytes: Uint8Array) => createHash('sha256').update(bytes).digest('hex');
export function hostKitPath(value: unknown): string {
  assert.ok(typeof value === 'string' && value.length <= 512 && value.split('/').every(part => /^[A-Za-z0-9][A-Za-z0-9._-]*$/.test(part)), 'kit input must be a normalized repository-relative path');
  assert.ok(!/^(?:tmp|private|docs\/agent-work)\//.test(value), 'private/prep kit inputs cannot publish canonical measurements');
  return value;
}
export function parseHostKitManifest(value: unknown): KitRow[] {
  const input = record(value, ['schema', 'version', 'kits']);
  assert.ok(input.schema === 'allworld-scene-host-kits' && input.version === 1, 'unsupported host kit manifest');
  assert.ok(Array.isArray(input.kits) && input.kits.length === REGION_IDS.length, 'exact fourteen-region kit coverage required');
  const rows = input.kits.map(value => {
    const row = record(value, ['id', 'asset', 'report']);
    assert.ok(REGION_IDS.some(id => id === row.id), 'unknown kit region');
    const asset = hostKitPath(row.asset), report = hostKitPath(row.report);
    assert.ok(asset.startsWith('scripts/scene-factory/inputs/kits/') && report.startsWith('scripts/scene-factory/inputs/kits/'), 'kits must use staged reproducible factory inputs');
    assert.ok(asset.endsWith('.glb') && report.endsWith('.json'), 'kit asset/report extensions differ');
    return { id: row.id as RegionId, asset, report };
  });
  assert.equal(new Set(rows.map(row => row.id)).size, REGION_IDS.length, 'duplicate/missing kit region');
  assert.equal(new Set(rows.flatMap(row => [row.asset, row.report])).size, REGION_IDS.length * 2, 'kit input paths must be distinct');
  return rows;
}
export async function readHostKitFile(root: string, path: string, limit: number) {
  const logical = hostKitPath(path), base = await realpath(root), absolute = resolve(base, logical);
  const stat = await lstat(absolute);
  assert.ok(stat.isFile() && !stat.isSymbolicLink() && stat.size > 0 && stat.size <= limit, `unbounded/non-regular kit input: ${logical}`);
  assert.equal(await realpath(absolute), absolute, `symlink kit input: ${logical}`);
  const bytes = await readFile(absolute);
  assert.equal(bytes.length, stat.size, `kit input changed during read: ${logical}`);
  return { path: logical, absolute, bytes, sha256: hash(bytes) };
}
function measured(value: unknown, id: RegionId) {
  // Reports additionally contain offline provenance. Only the strict runtime measurement is compared.
  assert.ok(value !== null && typeof value === 'object' && !Array.isArray(value), 'invalid kit report');
  const m = value as MeasuredAsset;
  assert.ok(Array.isArray(m.parts), 'invalid kit report parts');
  const measurement = { version: m.version, kind: m.kind, id: m.id, sha256: m.sha256, rawBytes: m.rawBytes, brotliBytes: m.brotliBytes, triangles: m.triangles,
    parts: m.parts.map(p => ({ node: p.node, triangles: p.triangles, bounds: p.bounds })).sort((a, b) => a.node.localeCompare(b.node, 'en')), atlas: m.atlas };
  return parseAssetRef({ url: `/assets/scene-factory/kits/${id}-${m.sha256}.glb`, measurement }, 'kit', id);
}
export function compareHostKitReport(declared: unknown, actual: MeasuredAsset, id: RegionId) {
  const ref = measured(declared, id);
  assert.deepEqual(ref, measured(actual, id), `kit ${id} report differs from validated GLB`);
  return ref;
}
export async function readHostKits(root: string, manifestPath: string) {
  const manifest = await readHostKitFile(root, manifestPath, 64 * 1024);
  const rows = parseHostKitManifest(JSON.parse(manifest.bytes.toString('utf8')));
  const sourcePins = [{ path: manifest.path, sha256: manifest.sha256 }];
  const kits = new Map<RegionId, { ref: ReturnType<typeof parseAssetRef>; file: URL }>();
  const { validateAsset } = await import('../../../scripts/scene-factory/assets.ts');
  for (const row of rows) {
    // Serial bounded validation of all fourteen inputs, even if fewer regions own representative scenes.
    const asset = await readHostKitFile(root, row.asset, 2 * 1024 * 1024);
    const report = await readHostKitFile(root, row.report, 5 * 1024 * 1024);
    const actual = await validateAsset(asset.bytes, 'kit', row.id);
    assert.equal(actual.sha256, asset.sha256, 'validated kit identity differs');
    const ref = compareHostKitReport(JSON.parse(report.bytes.toString('utf8')), actual, row.id);
    kits.set(row.id, { ref, file: pathToFileURL(asset.absolute) });
    sourcePins.push({ path: asset.path, sha256: asset.sha256 }, { path: report.path, sha256: report.sha256 });
  }
  return { kits, sourcePins };
}
