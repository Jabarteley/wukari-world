// Pass on (docs/LEGACY.md): the screen's pure parts read the server's answers defensively and never offer a title to a friend.
import test from 'node:test'
import assert from 'node:assert/strict'
import { confirmWords, expiryWords, includeOf, readPreview, readView } from './legacyModel.ts'
import type { LegacyKind } from '../../../types/legacy.ts'

test('the view is read defensively: an older or broken answer shows nothing rather than failing', () => {
  assert.equal(readView(null), null)
  assert.deepEqual(readView({}), { heirs: [], friends: [], kinds: [], adult: false, outgoing: null, incoming: [], nextGiftAt: null })
  const view = readView({ heirs: [{ id: 'h', name: 'Dayo' }, 7], friends: [{ id: 'f', name: 'Bola' }], adult: true, kinds: [{ key: 'cars', label: 'Cars', lines: ['A car', 4], stays: [{ what: 'x', why: 'y' }, {}], heirOnly: false }, { key: 'nope', label: 'x' }],
    outgoing: { id: 'L-1', mine: true, from: { id: 'a', name: 'Ada' }, to: { id: 'f', name: 'Bola' }, lines: ['A shop with its stock'], expires: 5 }, incoming: [null, { id: 'L-2' }] })
  assert.deepEqual(view?.heirs, [{ id: 'h', name: 'Dayo' }])
  assert.deepEqual(view?.kinds.map((kind) => [kind.key, kind.lines, kind.stays]), [['cars', ['A car'], [{ what: 'x', why: 'y' }]]])
  assert.equal(view?.outgoing?.to.name, 'Bola'); assert.deepEqual(view?.incoming, [])
})

test('what is sent is what is ticked, and a friend never gets the titles', () => {
  const picked = new Set<LegacyKind>(['houses', 'titles', 'cars'])
  assert.deepEqual(includeOf(picked, false), { houses: true, titles: true, cars: true })
  assert.deepEqual(includeOf(picked, true), { houses: true, cars: true })
  assert.deepEqual(includeOf(new Set(), false), {})
})

test('the summary and the words around it', () => {
  assert.deepEqual(readPreview({ ok: true, kind: 'heir', to: { id: 'h', name: 'Dayo' }, lines: ['A Bungalow in Lagos'], stays: [{ what: 'A car', why: 'They already own one.' }] }), { ok: true, kind: 'heir', to: { id: 'h', name: 'Dayo' }, lines: ['A Bungalow in Lagos'], stays: [{ what: 'A car', why: 'They already own one.' }] })
  assert.deepEqual(readPreview({ ok: false, code: 'too_soon', reason: 'Wait.' }), { ok: false, lines: [], stays: [], code: 'too_soon', reason: 'Wait.' })
  assert.equal(readPreview('x').ok, false)
  assert.equal(confirmWords('heir', 'Dayo'), 'Pass these to Dayo now'); assert.equal(confirmWords('other', 'Bola'), 'Offer these to Bola')
  assert.equal(expiryWords(86400000 * 3, 0), 'for 3 more days'); assert.equal(expiryWords(1000, 5000), 'until tomorrow')
})
