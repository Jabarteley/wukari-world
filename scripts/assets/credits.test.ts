import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { test } from 'node:test'
import { readPacks } from './budget.ts'
import { buildCredits, noticeProblems } from './credits.ts'
import { model, packOf } from './fixtures.test-helper.ts'

const LINE = '"Stadium" by A Maker, CC BY 4.0, via a model library (https://example.org/stadium)'

test('credits list CC0 packs, our own packs and every CC BY line once with its files', () => {
  const cc0 = packOf('kit', [{ name: 'LICENSE.txt', bytes: Buffer.from('CC0'), kind: 'licence' }, model('car.glb', 'race', 'vehicle', 10)]).manifest
  const by = packOf('lib', [model('stand.glb', 'football', 'prop', 10, { licenceId: 'CC-BY-4.0', attribution: LINE }), model('stand-2.glb', 'football', 'prop', 10, { licenceId: 'CC-BY-4.0', attribution: LINE })], 'CC-BY-4.0').manifest
  const ours = packOf('mine', [model('ring.glb', 'fight', 'prop', 10)], 'AGPL-3.0-or-later').manifest
  const { json, text } = buildCredits([cc0, by, ours])
  assert.equal(json.attributions.length, 1)
  assert.deepEqual(json.attributions[0]!.files, ['public/assets/packs/lib/stand-2.glb', 'public/assets/packs/lib/stand.glb'])
  assert.equal(json.attributions[0]!.licenceUrl, 'https://creativecommons.org/licenses/by/4.0/')
  const kit = json.packs.find((p) => p.name === 'Pack kit')!
  assert.equal(kit.files, 1, 'the licence text is not a credited file')
  assert.deepEqual(kit.games, ['race'])
  assert.match(text, /Credit required[\s\S]*"Stadium" by A Maker/)
  assert.match(text, /Public domain[\s\S]*Pack kit by Maker/)
  assert.match(text, /Made for Allworld[\s\S]*Pack mine by Allworld/)
})

test('a CC BY line missing from NOTICE.md is a problem; one written there is not', () => {
  const by = packOf('lib', [model('stand.glb', 'football', 'prop', 10, { licenceId: 'CC-BY-4.0', attribution: LINE })], 'CC-BY-4.0').manifest
  const { json } = buildCredits([by])
  assert.equal(noticeProblems(json, '# Notice\n').length, 1)
  assert.deepEqual(noticeProblems(json, `# Notice\n- ${LINE}\n`), [])
})

test('a malformed manifest stops the credits rather than leaving a file out', () => {
  const bad = packOf('kit', [model('car.glb', 'race', 'vehicle', 10)]).manifest
  bad.assets[0]!.licenceId = 'CC-BY-NC-4.0' as never
  assert.throws(() => buildCredits([bad]), /not allowed/)
})

test('the committed credits are what the packs produce', () => {
  const root = join(import.meta.dirname, '..', '..')
  const { json, text } = buildCredits(readPacks(join(root, 'public', 'assets', 'packs')).map((p) => p.manifest))
  assert.equal(readFileSync(join(root, 'public', 'assets', 'CREDITS.txt'), 'utf8'), text)
  assert.equal(readFileSync(join(root, 'public', 'assets', 'credits.json'), 'utf8'), `${JSON.stringify(json, null, 2)}\n`)
  assert.deepEqual(noticeProblems(json, readFileSync(join(root, 'NOTICE.md'), 'utf8')), [])
})
