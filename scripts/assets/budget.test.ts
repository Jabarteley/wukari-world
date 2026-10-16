import assert from 'node:assert/strict'
import { join } from 'node:path'
import { test } from 'node:test'
import { checkBudget, readPacks } from './budget.ts'
import { fakePng, model, packOf, tinyGlb } from './fixtures.test-helper.ts'
import { manifestProblems } from './pack-types.ts'

const licence = { name: 'LICENSE.txt', bytes: Buffer.from('CC0 1.0 Universal'), kind: 'licence' as const }

test('a pack within its caps passes and is measured per game', () => {
  const report = checkBudget([packOf('kit', [licence, model('car.glb', 'race', 'vehicle', 1400), model('ring.glb', 'fight', 'prop', 600), { name: 'atlas.png', bytes: fakePng(1024, 1024), kind: 'texture', game: 'race' }])])
  assert.deepEqual(report.problems, [])
  const race = report.games.find((g) => g.game === 'race')!
  assert.equal(race.files, 2)
  assert.ok(race.brotliBytes > 0 && race.ok)
  assert.equal(report.games.find((g) => g.game === 'football')!.files, 0)
})

test('it counts triangles from the file, not from the manifest', () => {
  const lying = model('car.glb', 'race', 'vehicle', 1600, { triangles: 1400 })
  const { problems } = checkBudget([packOf('kit', [lying])])
  assert.ok(problems.some((p) => /1600 triangles, over the 1500 cap for a vehicle/.test(p)), problems.join('\n'))
  assert.ok(problems.some((p) => /manifest says 1400 triangles, file draws 1600/.test(p)))
})

test('the caps are 3,000 for a character and 1,500 for a prop or a car', () => {
  assert.deepEqual(checkBudget([packOf('kit', [model('a.glb', 'fight', 'character', 3000), model('b.glb', 'race', 'prop', 1500)])]).problems, [])
  const { problems } = checkBudget([packOf('kit', [model('a.glb', 'fight', 'character', 3001), model('b.glb', 'race', 'prop', 1501)])])
  assert.equal(problems.length, 2)
})

test('textures over 1024 px fail, embedded or shared', () => {
  const big = { name: 'm.glb', bytes: tinyGlb({ image: [2048, 2048] }), kind: 'prop' as const, game: 'race' as const, triangles: 1 }
  const shared = { name: 'atlas.png', bytes: fakePng(1025, 16), kind: 'texture' as const, game: 'race' as const }
  const { problems } = checkBudget([packOf('kit', [big, shared])])
  assert.ok(problems.some((p) => /m\.glb: texture 2048x2048 is over 1024 px/.test(p)))
  assert.ok(problems.some((p) => /atlas\.png: texture 1025x16 is over 1024 px/.test(p)))
})

test('missing, resized, unlisted, unprepared and temporary files all fail', () => {
  const p = packOf('kit', [model('a.glb', 'race', 'prop', 2), model('b.glb', 'race', 'prop', 2, { prepared: false }), { name: 'tex.png', bytes: fakePng(4, 4), kind: 'texture', game: 'race', temporary: true }])
  p.files.delete('a.glb')
  p.files.set('stray.bin', Buffer.from('x'))
  p.manifest.assets[1]!.bytes += 1
  const { problems } = checkBudget([p])
  for (const re of [/a\.glb is listed but missing/, /b\.glb: manifest says \d+ bytes/, /b\.glb is not prepared/, /tex\.png is a fetched texture/, /stray\.bin is in the folder but not in manifest\.json/]) {
    assert.ok(problems.some((x) => re.test(x)), `${re} in\n${problems.join('\n')}`)
  }
})

test('the brotli size per game is summed over every pack and held to the budget', () => {
  const packs = [packOf('one', [model('a.glb', 'football', 'prop', 300)]), packOf('two', [model('b.glb', 'football', 'prop', 300)])]
  const { games } = checkBudget(packs, 10_000_000)
  const one = checkBudget([packs[0]!], 10_000_000).games.find((g) => g.game === 'football')!
  const both = games.find((g) => g.game === 'football')!
  assert.equal(both.files, 2)
  assert.ok(both.brotliBytes > one.brotliBytes)
  const tight = checkBudget(packs, one.brotliBytes)
  assert.ok(tight.problems.some((p) => /football: \d+ bytes brotli, over the \d+ budget/.test(p)))
})

test('licence texts never count against a game', () => {
  const { games } = checkBudget([packOf('kit', [{ ...licence, game: 'race' }])])
  assert.equal(games.find((g) => g.game === 'race')!.files, 0)
})

test('manifest problems: licences outside CC0, CC BY and ours, CC BY without a credit line, ours without its script', () => {
  const p = packOf('kit', [model('a.glb', 'race', 'prop', 1)])
  assert.deepEqual(manifestProblems(p.manifest, 'kit'), [])
  const bad = structuredClone(p.manifest)
  bad.assets[0]!.licenceId = 'GPL-3.0' as never
  assert.ok(manifestProblems(bad, 'kit').some((x) => /GPL-3\.0 is not allowed/.test(x)))
  const by = packOf('kit', [model('a.glb', 'race', 'prop', 1, { licenceId: 'CC-BY-4.0' })]).manifest
  assert.ok(manifestProblems(by, 'kit').some((x) => /CC BY needs the attribution text/.test(x)))
  const ours = packOf('mine', [model('a.glb', 'race', 'prop', 1)], 'AGPL-3.0-or-later').manifest
  assert.deepEqual(manifestProblems(ours, 'mine'), [])
  delete ours.assets[0]!.made
  assert.ok(manifestProblems(ours, 'mine').some((x) => /ours needs the script/.test(x)))
  assert.ok(manifestProblems(p.manifest, 'other').some((x) => /outside public\/assets\/packs\/other\//.test(x)))
})

test('the packs in the repository are within every cap and budget', () => {
  const packs = readPacks(join(import.meta.dirname, '..', '..', 'public', 'assets', 'packs'))
  assert.ok(packs.length >= 4)
  const report = checkBudget(packs)
  assert.deepEqual(report.problems, [])
  for (const game of ['fight', 'race', 'football']) assert.ok(report.games.find((g) => g.game === game)!.files > 0, `${game} has assets`)
})
