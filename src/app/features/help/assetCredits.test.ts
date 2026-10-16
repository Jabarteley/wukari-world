import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { test } from 'node:test'
import { loadCredits, readCredits } from './assetCredits.ts'

test('the committed credits read into rows for every pack', () => {
  const json = JSON.parse(readFileSync(join(import.meta.dirname, '..', '..', '..', '..', 'public', 'assets', 'credits.json'), 'utf8'))
  const { required, thanks } = readCredits(json)
  assert.equal(thanks.length, json.packs.length)
  assert.equal(required.length, json.attributions.length)
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

test('loading asks for /assets/credits.json and fails plainly on an error answer', async () => {
  const asked: string[] = []
  const ok = (async (url: string) => { asked.push(url); return new Response(JSON.stringify({ packs: [], attributions: [] })) }) as unknown as typeof fetch
  assert.deepEqual(await loadCredits(ok), { required: [], thanks: [] })
  assert.deepEqual(asked, ['/assets/credits.json'])
  const bad = (async () => new Response('', { status: 404 })) as unknown as typeof fetch
  await assert.rejects(loadCredits(bad), /HTTP 404/)
})
