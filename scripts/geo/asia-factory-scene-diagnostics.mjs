import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { readFileSync, writeFileSync, mkdirSync, realpathSync } from 'node:fs';
import { join, relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const SOURCE_SHA256 = '3ee12ce238c35780adbc43a2922dd92ba484b1a8e2f78fca45f63fc1a0d3656e';
const SEAM = '  const drawCalls = built.group.children.filter(child => Reflect.get(child, \'isMesh\') === true).length;';
const RETURN_SEAM = 'return { sourceProblems, unknownKinds,';
const DIAGNOSTIC = `
  const meshDiagnostics = [];
  built.group.traverse(mesh => {
    if (Reflect.get(mesh, 'isMesh') !== true) return;
    const geometryTriangles = (mesh.geometry.index?.count ?? mesh.geometry.attributes.position.count) / 3;
    const instanceCount = Reflect.get(mesh, 'isInstancedMesh') === true ? mesh.count : 1;
    let effectiveVisible = true;
    for (let ancestor = mesh; ancestor; ancestor = ancestor.parent) effectiveVisible &&= ancestor.visible;
    meshDiagnostics.push({ name: mesh.name, parent: mesh.parent?.name ?? null, visible: mesh.visible, effectiveVisible, instanced: Reflect.get(mesh, 'isInstancedMesh') === true, instanceCount, geometryTriangles, currentTriangles: geometryTriangles * instanceCount });
  });
  const sceneDiagnostics = { kind: 'asia-factory-per-mesh-v1', builtTriangleAccounting: built.triangles, counts: built.counts, pack: { bounds: pack.bounds, core: pack.core ?? null, surround: pack.surround ?? null, inland: pack.inland ?? false, landPolygons: pack.land.length, waterPolygons: pack.water?.length ?? 0, fabricAreas: pack.fabric?.length ?? 0 }, meshes: meshDiagnostics, currentMeshTriangles: meshDiagnostics.reduce((sum, mesh) => sum + mesh.currentTriangles, 0), visibleMeshTriangles: meshDiagnostics.filter(mesh => mesh.effectiveVisible).reduce((sum, mesh) => sum + mesh.currentTriangles, 0), accountingNote: 'Current mesh instances may differ from buildCity accounting after initial traffic visibility is applied; the existing built.triangles gate remains authoritative.' };
`;

const args = process.argv.slice(2);
const get = flag => {
  const index = args.indexOf(flag);
  assert.ok(index >= 0 && args[index + 1] && !args[index + 1].startsWith('--'), `Missing ${flag}`);
  return args[index + 1];
};
assert.ok(!args.includes('--source-stdin') || args.includes('--check'), 'Standard input is check-only');
const factory = args.includes('--source-stdin') ? null : realpathSync(resolve(get('--factory-source')));
const path = factory ? join(factory, 'scripts/geo/factory/source-scene.mjs') : null;
const original = readFileSync(path ?? 0, 'utf8');
const hash = value => createHash('sha256').update(value).digest('hex');
assert.equal(hash(original), SOURCE_SHA256, 'Pinned factory source-scene bytes changed');
assert.equal(original.split(SEAM).length, 2, 'Expected exactly one pinned buildCity seam');
assert.equal(original.split(RETURN_SEAM).length, 2, 'Expected exactly one source-scene return seam');
const patched = original.replace(SEAM, SEAM + DIAGNOSTIC).replace(RETURN_SEAM, 'return { sceneDiagnostics, sourceProblems, unknownKinds,');
assert.ok(patched.includes('scene.triangles < scene.triangleLimit && scene.drawCalls <= scene.drawCallLimit'), 'Budget gate must remain intact');
assert.equal(patched.slice(patched.indexOf('export function assertSourceScene')), original.slice(original.indexOf('export function assertSourceScene')), 'Acceptance and CLI must remain byte-identical');
if (args.includes('--check')) {
  console.log(JSON.stringify({ mode: 'check', originalSha256: SOURCE_SHA256, instrumentedSha256: hash(patched), assertionsPreserved: true }));
} else {
  assert.equal(process.env.GITHUB_ACTIONS, 'true', 'Instrumentation may run only in the cloud candidate job');
  const sandbox = realpathSync(resolve(get('--sandbox-root')));
  const provenance = resolve(get('--provenance-dir'));
  const rel = relative(sandbox, provenance);
  assert.ok(rel && rel !== '..' && !rel.startsWith('../') && !rel.startsWith('/'), 'Provenance must be inside the candidate sandbox');
  mkdirSync(provenance, { recursive: true });
  const receipt = { kind: 'asia-factory-per-mesh-instrumentation-v1', factorySourceScene: path, originalSha256: SOURCE_SHA256, instrumentedSha256: hash(patched), helperSha256: hash(readFileSync(fileURLToPath(import.meta.url))), assertionsPreserved: true, scope: 'Diagnostic fields only; no geometry, budget, source or acceptance change' };
  writeFileSync(path, patched);
  assert.equal(hash(readFileSync(path)), receipt.instrumentedSha256);
  writeFileSync(join(provenance, 'factory-scene-diagnostics.json'), JSON.stringify(receipt, null, 2) + '\n');
  console.log(JSON.stringify(receipt));
}
