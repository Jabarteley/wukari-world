// The shipped vehicle files: present, small, named for what the code asks for, with the nodes the code uses, and inside the triangle caps.
import test from 'node:test';
import assert from 'node:assert/strict';
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { GLB_KINDS, GLB_VARIANTS, glbKey } from './glb-parts.ts';
import type { GlbLod } from './glb-parts.ts';

const dir = new URL('./assets/', import.meta.url);
const files = readdirSync(dir).filter((name) => name.endsWith('.glb'));

interface Header { nodes: { name?: string }[]; meshes: { primitives: { indices?: number; attributes: { POSITION: number } }[] }[]; accessors: { count: number }[]; extensionsUsed?: string[] }
function header(name: string): Header {
  const bytes = readFileSync(new URL(name, dir));
  assert.equal(bytes.toString('latin1', 0, 4), 'glTF', `${name} is a binary glTF`);
  return JSON.parse(bytes.toString('utf8', 20, 20 + bytes.readUInt32LE(12))) as Header;
}
const triangles = (h: Header): number => h.meshes.reduce((sum, mesh) => sum + mesh.primitives.reduce((inner, p) => inner + h.accessors[p.indices ?? p.attributes.POSITION]!.count / 3, 0), 0);
const requests = GLB_KINDS.flatMap((kind) => GLB_VARIANTS[kind].flatMap((variant) => (['near', 'far'] as GlbLod[]).map((lod) => ({ kind, variant, lod }))));

test('every file the code can ask for is shipped, and nothing else', () => {
  assert.deepEqual(files.sort(), requests.map((request) => `${glbKey(request)}.glb`).sort());
});

test('every address in glb-files.ts is a ?url import of a shipped file', () => {
  const source = readFileSync(new URL('./glb-files.ts', import.meta.url), 'utf8');
  for (const name of files) assert.ok(source.includes(`'./assets/${name}?url'`), `${name} is imported`);
  assert.equal([...source.matchAll(/\?url'/g)].length, files.length);
});

test('each file is far under 2 MiB, compressed, and one far model is under the street cap of 1,500 triangles with room for riders and lamps', () => {
  for (const name of files) {
    const size = statSync(new URL(name, dir)).size;
    assert.ok(size < 400 * 1024, `${name}: ${size} bytes`);
    const h = header(name);
    assert.ok(h.extensionsUsed?.includes('EXT_meshopt_compression'), `${name} is meshopt-compressed (the loader sets the decoder)`);
    const count = triangles(h), far = name.endsWith('-far.glb');
    assert.ok(count > 100, `${name}: ${count} triangles`);
    if (far) {
      assert.ok(count + 100 <= 1500, `${name}: ${count} triangles + a few figures stays under 1,500`);
      assert.equal(h.meshes.length, 1, `${name} is one mesh (one draw call)`);
    } else assert.ok(count < 2600, `${name}: ${count}`);
  }
});

test('the nodes the code uses are in the files: seats and lamps in all, turning wheels in the near ones', () => {
  for (const name of files) {
    const names = new Set(header(name).nodes.map((node) => node.name));
    assert.ok(names.has('seat_driver') && names.has('seat_1'), `${name} has seats`);
    assert.ok([...names].some((n) => n?.startsWith('light_head_')) && [...names].some((n) => n?.startsWith('light_tail_')), `${name} has lamps`);
    const wheels = [...names].filter((n) => n?.startsWith('wheel_'));
    if (name.endsWith('-far.glb')) assert.equal(wheels.length, 0, `${name}: wheels are baked into the far body`);
    else assert.ok(wheels.length >= 2, `${name} has ${wheels.length} wheel nodes`);
  }
});
