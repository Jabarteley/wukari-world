import assert from 'node:assert/strict'
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { test } from 'node:test'
import { glbChunks, glbJson, writeGlb } from './glb.ts'
import { fakePng, packOf, tinyGlb } from './fixtures.test-helper.ts'
import { OverCapError, prepareModel, preparePack } from './prepare.ts'
import type { Packer, TextureEncoder } from './prepare.ts'
import type { WantList } from './pack-types.ts'

/** Stands in for cwebp: records the call and returns a smaller "WebP" (here a PNG header of the capped size). */
const encoder = (calls: string[]): TextureEncoder => (bytes, mimeType, maxPx) => { calls.push(mimeType); return { bytes: fakePng(Math.min(maxPx, 1024), 4), mimeType: 'image/webp' } }
/** Stands in for gltfpack: "simplifies" by keeping the given share of the first mesh's indices. */
const packer: Packer = (glb, simplify) => {
  const doc = glbChunks(glb)
  if (simplify) { const acc = doc.json.accessors[doc.json.meshes[0].primitives[0].indices]; acc.count = Math.floor((acc.count / 3) * simplify.ratio) * 3 }
  doc.json.extensionsUsed = [...(doc.json.extensionsUsed ?? []), 'EXT_meshopt_compression']
  return writeGlb(doc)
}

test('a model over its cap is refused, unless it is simplified under it', () => {
  const file = tinyGlb({ triangles: 4000, size: 1.8 })
  assert.throws(() => prepareModel('x.glb', file, { kind: 'character' }, undefined, undefined), (e: unknown) => e instanceof OverCapError && e.triangles === 4000 && e.cap === 3000)
  assert.throws(() => prepareModel('x.glb', file, { kind: 'character', simplify: { ratio: 0.9 } }, undefined, packer), /3600 triangles is over the 3000 cap/)
  const ok = prepareModel('x.glb', file, { kind: 'character', simplify: { ratio: 0.7 } }, undefined, packer)
  assert.equal(ok.triangles, 2800)
  assert.equal(trianglesIn(ok.glb), 2800)
})

const trianglesIn = (glb: Buffer): number => glbJson(glb).accessors[1].count / 3

test('fit scales to metres, and a model of the wrong size for its kind is refused', () => {
  const out = prepareModel('car.glb', tinyGlb({ size: 0.5 }), { kind: 'vehicle', fit: { axis: 'x', metres: 4 } }, undefined, undefined)
  assert.equal(out.scale, 8)
  assert.deepEqual(out.size, [4, 4, 0])
  assert.throws(() => prepareModel('car.glb', tinyGlb({ size: 0.5 }), { kind: 'vehicle' }, undefined, undefined), /0\.50 m is outside 1\.5-8 m for a vehicle/)
})

test('textures go through the encoder and stay at most 1024 px', () => {
  const calls: string[] = []
  const out = prepareModel('m.glb', tinyGlb({ image: [2048, 2048] }), { kind: 'prop' }, encoder(calls), undefined)
  assert.deepEqual(calls, ['image/png'])
  assert.equal(glbJson(out.glb).images[0].mimeType, 'image/webp')
  assert.throws(() => prepareModel('m.glb', tinyGlb({ image: [2048, 2048] }), { kind: 'prop' }, undefined, undefined), /texture 2048x2048 is over 1024 px/)
})

test('a pack is prepared in place: models compressed, a texture shared within one game becomes one file, the manifest updated', () => {
  const dir = mkdtempSync(join(tmpdir(), 'aw-prepare-'))
  try {
    const goal = tinyGlb({ image: [64, 64], size: 3 })
    const p = packOf('kit', [
      { name: 'goal.glb', bytes: goal, kind: 'prop', game: 'football', triangles: 0, prepared: false },
      { name: 'goal-big.glb', bytes: goal, kind: 'prop', game: 'football', triangles: 0, prepared: false },
    ])
    for (const [name, bytes] of p.files) writeFileSync(join(dir, name), bytes)
    writeFileSync(join(dir, 'manifest.json'), JSON.stringify(p.manifest))
    const want: WantList = { pack: 'kit', name: 'Kit', kind: 'kenney', page: 'https://example.org/kit', author: 'Maker', licenceId: 'CC0-1.0', want: [
      { from: 'a', as: 'goal.glb', game: 'football', kind: 'prop' },
      { from: 'b', as: 'goal-big.glb', game: 'football', kind: 'prop', scale: 2 },
    ] }
    const report = preparePack(dir, want, { encode: encoder([]), pack: packer })
    assert.equal(report.length, 2)
    const manifest = JSON.parse(readFileSync(join(dir, 'manifest.json'), 'utf8'))
    const atlas = manifest.assets.find((a: { kind: string }) => a.kind === 'texture')
    assert.match(atlas.path, /^public\/assets\/packs\/kit\/atlas-football-[0-9a-f]{8}\.webp$/)
    assert.equal(atlas.game, 'football')
    assert.equal(atlas.source, 'https://example.org/kit')
    for (const name of ['goal.glb', 'goal-big.glb']) {
      const json = glbJson(readFileSync(join(dir, name)))
      assert.equal(json.images[0].uri, atlas.path.split('/').pop())
      assert.ok(json.extensionsUsed.includes('EXT_meshopt_compression'))
      const entry = manifest.assets.find((a: { path: string }) => a.path.endsWith(`/${name}`))
      assert.equal(entry.prepared, true)
      assert.equal(entry.bytes, readFileSync(join(dir, name)).length)
    }
    // Preparing again leaves prepared models alone (it would scale them twice).
    assert.deepEqual(preparePack(dir, want, { encode: encoder([]), pack: packer }), [])
  } finally { rmSync(dir, { recursive: true, force: true }) }
})

test('one bad model stops the pack before anything is written', () => {
  const dir = mkdtempSync(join(tmpdir(), 'aw-prepare-'))
  try {
    const p = packOf('kit', [
      { name: 'ok.glb', bytes: tinyGlb({ triangles: 10 }), kind: 'prop', game: 'race', triangles: 0, prepared: false },
      { name: 'big.glb', bytes: tinyGlb({ triangles: 2000 }), kind: 'prop', game: 'race', triangles: 0, prepared: false },
    ])
    for (const [name, bytes] of p.files) writeFileSync(join(dir, name), bytes)
    writeFileSync(join(dir, 'manifest.json'), JSON.stringify(p.manifest))
    const before = readFileSync(join(dir, 'ok.glb'))
    const want: WantList = { pack: 'kit', name: 'Kit', kind: 'kenney', page: 'https://example.org/kit', author: 'Maker', licenceId: 'CC0-1.0', want: [{ as: 'ok.glb', game: 'race', kind: 'prop' }, { as: 'big.glb', game: 'race', kind: 'prop' }] }
    assert.throws(() => preparePack(dir, want, { pack: packer }), OverCapError)
    assert.ok(readFileSync(join(dir, 'ok.glb')).equals(before))
  } finally { rmSync(dir, { recursive: true, force: true }) }
})
