// The rewrite applies to the installed three.js, and the rewritten WebGLMorphtargets shares one texture between geometries with the
// same morph attributes, keeps it while any of them lives, and frees it with the last.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { shareMorphTextures } from './three-shared-morphs.ts';

const require = createRequire(import.meta.url);
const source = readFileSync(require.resolve('three').replace(/three\.cjs$/, 'three.module.js'), 'utf8');

test('the rewrite matches the installed three.js exactly once per part', () => {
  const out = shareMorphTextures(source);
  assert.ok(out.includes('morphTextures.get( morphKey )') && out.includes('shared.users.add( geometry )'));
  assert.throws(() => shareMorphTextures('function WebGLMorphtargets() {}'), /no longer matches/);
});

test('geometries sharing morph attributes share one texture; it is freed with the last user', () => {
  const at = source.indexOf('function WebGLMorphtargets(');
  const end = source.indexOf('\nfunction ', at + 30);
  const fn = shareMorphTextures(source).slice(at, end + (shareMorphTextures(source).length - source.length));
  const disposed: string[] = [];
  class Vector4 { x = 0; y = 0; z = 0; w = 0; fromBufferAttribute(a: { array: number[]; itemSize: number }, i: number) { this.x = a.array[i * a.itemSize]!; this.y = a.array[i * a.itemSize + 1]!; this.z = a.array[i * a.itemSize + 2]!; return this; } }
  class Vector2 { x: number; y: number; constructor(x: number, y: number) { this.x = x; this.y = y; } }
  let made = 0;
  class DataArrayTexture { id = ++made; type = 0; needsUpdate = false; dispose() { disposed.push(`t${this.id}`); } }
  const make = new Function('Vector4', 'Vector2', 'DataArrayTexture', 'FloatType', `${fn}; return WebGLMorphtargets;`)(Vector4, Vector2, DataArrayTexture, 1015);
  const morphs = make(null, { maxTextureSize: 16384 }, null);
  const shared = { position: [{ count: 3, itemSize: 3, array: [1, 2, 3, 4, 5, 6, 7, 8, 9] }] };
  const listeners = new Map<object, Set<(e: { target: object }) => void>>();
  const geometry = () => { const g = { morphAttributes: shared, attributes: { position: { count: 3 } }, addEventListener: (_: string, f: (e: { target: object }) => void) => { (listeners.get(g) ?? listeners.set(g, new Set()).get(g)!).add(f); }, removeEventListener: (_: string, f: (e: { target: object }) => void) => { listeners.get(g)?.delete(f); } }; return g; };
  const dispose = (g: object) => { for (const f of [...(listeners.get(g) ?? [])]) f({ target: g }); };
  const used: unknown[] = [];
  const program = { getUniforms: () => ({ setValue: (_gl: unknown, name: string, value: unknown) => { if (name === 'morphTargetsTexture') used.push(value); } }) };
  const object = { morphTargetInfluences: [0.5], isInstancedMesh: false };
  const gl = null;
  const a = geometry(), b = geometry(), c = geometry();
  for (const g of [a, b, c]) morphs.update(object, g, program);
  assert.equal(made, 1, 'one texture for three geometries');
  assert.equal(new Set(used).size, 1);
  dispose(a); dispose(b);
  assert.deepEqual(disposed, [], 'kept while a user remains');
  dispose(c);
  assert.deepEqual(disposed, ['t1'], 'freed with the last user');
  morphs.update(object, geometry(), program);
  assert.equal(made, 2, 'a new user after that builds it again');
  void gl;
});
