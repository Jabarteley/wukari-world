import assert from 'node:assert/strict'
import { test } from 'node:test'
import { ASSET_CREDITS } from './asset-credits.generated.ts'
import { assetCredits, readCredits } from './assetCredits.ts'

test('the generated credits read into a row for every pack', () => {
  const data = ASSET_CREDITS as { packs: unknown[]; attributions: unknown[] }
  const { required, thanks } = assetCredits()
  assert.equal(thanks.length, data.packs.length)
  assert.equal(required.length, data.attributions.length)
  assert.ok(thanks.length > 0)
  for (const row of thanks) {
    assert.match(row.title, / by /)
    assert.ok(row.url === null || row.url.startsWith('https://'))
  }
})

test('CC BY lines come first; bad links and unknown licences are left out', () => {
  const { required, thanks } = readCredits({
    attributions: [{ attribution: '"Stand" by A Maker, CC BY 4.0', licenceId: 'CC-BY-4.0', licenceUrl: 'https://creativecommons.org/licenses/by/4.0/', source: 'javascript:alert(1)', files: ['a', 'b'] }],
    packs: [
      { name: 'Kit', author: 'Maker', page: 'https://example.org/kit', licenceId: 'CC0-1.0', licenceUrl: 'https://creativecommons.org/publicdomain/zero/1.0/', games: ['race'] },
      { name: 'Odd', author: 'Someone', page: 'https://example.org', licenceId: 'CC-BY-NC-4.0' },
    ],
  })
  assert.deepEqual(required, [{ title: '"Stand" by A Maker, CC BY 4.0', detail: '2 files', url: null, licence: 'CC BY 4.0', licenceUrl: 'https://creativecommons.org/licenses/by/4.0/' }])
  assert.deepEqual(thanks.map((r) => r.title), ['Kit by Maker'])
  assert.equal(thanks[0]!.detail, 'In race')
  assert.deepEqual(readCredits(null), { required: [], thanks: [] })
})
