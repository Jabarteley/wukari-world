import assert from 'node:assert/strict'
import { join } from 'node:path'
import { test } from 'node:test'
import { readPacks } from './budget.ts'
import { cartridgeAssets, gameAssets } from './cartridge-assets.ts'
import { fakePng, model, packOf } from './fixtures.test-helper.ts'
import type { Game } from './pack-types.ts'
import { CARTRIDGES } from '../../src/arena/cartridges.ts'
import { checkCartridges, diskSource } from '../cartridge-check.ts'

const root = join(import.meta.dirname, '..', '..')

test('a pack manifest becomes cartridge entries: path from the repository root, licence, source, author', () => {
  const p = packOf('kit', [{ name: 'LICENSE.txt', bytes: Buffer.from('CC0'), kind: 'licence' }, model('car.glb', 'race', 'vehicle', 10), model('ring.glb', 'fight', 'prop', 10), { name: 'old.png', bytes: fakePng(2, 2), kind: 'texture', game: 'race', temporary: true }]).manifest
  assert.deepEqual(cartridgeAssets(p), [
    { path: 'public/assets/packs/kit/car.glb', licence: 'CC0', source: 'https://example.org/kit', author: 'Maker' },
    { path: 'public/assets/packs/kit/ring.glb', licence: 'CC0', source: 'https://example.org/kit', author: 'Maker' },
  ])
  assert.deepEqual(cartridgeAssets(p, { game: 'fight' }).map((a) => a.path), ['public/assets/packs/kit/ring.glb'])
  assert.deepEqual(cartridgeAssets(p, { files: ['ring.glb', 'car.glb'] }).map((a) => a.path), ['public/assets/packs/kit/ring.glb', 'public/assets/packs/kit/car.glb'])
  assert.throws(() => cartridgeAssets(p, { files: ['LICENSE.txt'] }), /no usable file LICENSE\.txt/)
  assert.throws(() => cartridgeAssets(p, { game: 'race', files: ['ring.glb'] }), /no usable file ring\.glb for race/)
})

test('CC BY keeps its credit line; ours says Allworld', () => {
  const line = '"Stand" by A Maker, CC BY 4.0'
  const by = packOf('lib', [model('stand.glb', 'football', 'prop', 1, { licenceId: 'CC-BY-4.0', attribution: line })], 'CC-BY-4.0').manifest
  assert.deepEqual(cartridgeAssets(by)[0], { path: 'public/assets/packs/lib/stand.glb', licence: 'CC-BY', source: 'https://example.org/lib', author: 'Maker', attribution: line })
  const ours = packOf('mine', [model('ring.glb', 'fight', 'prop', 1)], 'AGPL-3.0-or-later').manifest
  assert.deepEqual(cartridgeAssets(ours)[0], { path: 'public/assets/packs/mine/ring.glb', licence: 'ours', source: 'Allworld', author: 'Allworld' })
})

test('every game\'s files in the repository convert to entries the cartridge checker accepts', () => {
  const manifests = readPacks().map((p) => p.manifest)
  const listed = CARTRIDGES.map((c) => ({ ...c, manifest: { ...c.manifest, assets: gameAssets(manifests, c.id as Game) } }))
  for (const c of listed) assert.ok(c.manifest.assets.length > 0, `${c.id} has assets`)
  // The cartridge checker itself (scripts/cartridge-check.ts): valid entries, files that exist, CC BY lines in NOTICE.md.
  assert.deepEqual(checkCartridges(listed, diskSource(root), null).problems, [])
  const broken = listed.map((c) => (c.id === 'fight' ? { ...c, manifest: { ...c.manifest, assets: [{ ...c.manifest.assets[0]!, path: 'public/assets/packs/none.glb' }] } } : c))
  assert.ok(checkCartridges(broken, diskSource(root), null).problems.some((p) => /none\.glb does not exist/.test(p)))
})
