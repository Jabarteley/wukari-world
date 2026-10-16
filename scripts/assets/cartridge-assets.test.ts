import assert from 'node:assert/strict'
import { existsSync, readFileSync } from 'node:fs'
import { join } from 'node:path'
import { test } from 'node:test'
import { readPacks } from './budget.ts'
import { cartridgeAssets, gameAssets } from './cartridge-assets.ts'
import type { CartridgeAssetEntry } from './cartridge-assets.ts'
import { fakePng, model, packOf } from './fixtures.test-helper.ts'
import { GAMES } from './pack-types.ts'

const root = join(import.meta.dirname, '..', '..')

/** The cartridge contract's rules for an asset entry (validateCartridge and scripts/cartridge-check.ts on the cartridge branch). */
function contractProblems(entries: readonly CartridgeAssetEntry[], notice: string): string[] {
  const bad: string[] = []
  const seen = new Set<string>()
  for (const a of entries) {
    if (!a.path || a.path.startsWith('/') || a.path.includes('..')) bad.push(`${a.path} must be inside the repository`)
    if (seen.has(a.path)) bad.push(`${a.path} listed twice`)
    seen.add(a.path)
    if (!['CC0', 'CC-BY', 'MIT', 'ours'].includes(a.licence)) bad.push(`${a.path} has no valid licence`)
    if (!a.source.trim()) bad.push(`${a.path} has no source`)
    if (a.licence === 'CC-BY' && !a.attribution?.trim()) bad.push(`${a.path} needs attribution`)
    if (a.licence === 'CC-BY' && a.attribution && !notice.includes(a.attribution.trim())) bad.push(`${a.path}: credit line not in NOTICE.md`)
    if (a.licence === 'ours' && a.source !== 'Allworld') bad.push(`${a.path}: ours comes from Allworld`)
    if (!existsSync(join(root, a.path))) bad.push(`${a.path} does not exist`)
  }
  return bad
}

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
  const notice = readFileSync(join(root, 'NOTICE.md'), 'utf8')
  for (const game of GAMES) {
    const entries = gameAssets(manifests, game)
    assert.ok(entries.length > 0, `${game} has assets`)
    assert.deepEqual(contractProblems(entries, notice), [], game)
  }
})
