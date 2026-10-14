// The phone side of the city gist: reading an answer, "how long ago", the Square's radio-style line, the app and the store.
import assert from 'node:assert/strict'
import test from 'node:test'
import { SQUARE_LINES, agoText, gistPath, readGist, squareLine, squareLines } from './gistModel.ts'
import { gist, loadGist } from './gistStore.ts'
import { gistPanel } from '../panels.ts'

const line = (n: number, at: number, text = `Line ${n}`) => ({ n, at, city: 'lagos', kind: 'other', text })
const NOW = Date.UTC(2026, 9, 14, 12)

test('an answer is read defensively: only well-formed lines, newest first, words cut', () => {
  assert.deepEqual(readGist(null), [])
  assert.deepEqual(readGist({ items: 'x' }), [])
  const read = readGist({ items: [line(1, NOW), { n: 'x' }, null, line(3, NOW, 'y'.repeat(300)), { ...line(2, NOW), text: '' }] })
  assert.deepEqual(read.map((item) => item.n), [3, 1])
  assert.equal(read[0]?.text.length, 160)
  assert.equal(gistPath('lagos'), '/api/world/gist?id=lagos&limit=30')
  assert.equal(gistPath('ibadan', 5), '/api/world/gist?id=ibadan&limit=30&since=5')
})

test('how long ago is in plain words', () => {
  assert.deepEqual([0, 20_000, 5 * 60_000, 90 * 60_000, 26 * 3_600_000].map((ago) => agoText(NOW - ago, NOW)), ['just now', 'just now', '5 min ago', '1 h ago', '1 d ago'])
})

test('the Square reads out at most three fresh lines, one after another, with "Gist:" in front', () => {
  const lines = [line(5, NOW - 60_000), line(4, NOW - 120_000), line(3, NOW - 3 * 60_000), line(2, NOW - 4 * 60_000), line(1, NOW - 7 * 3_600_000)]
  assert.equal(squareLines(lines, NOW).length, SQUARE_LINES)
  assert.deepEqual([0, 1, 2, 3].map((turn) => squareLine(lines, NOW, turn)), ['Gist: Line 5', 'Gist: Line 4', 'Gist: Line 3', 'Gist: Line 5'])
  assert.equal(squareLine([line(1, NOW - 7 * 3_600_000)], NOW, 0), '', 'an old line is not the talk of the Square')
  assert.equal(squareLine([], NOW, 0), '')
})

test('the store asks once for a city, again only when stale or forced, and keeps the last gist when a read fails', async () => {
  let asked = 0, fail = false
  const fetchJson = async (): Promise<unknown> => { asked += 1; if (fail) throw new Error('offline'); return { items: [line(2, NOW), line(1, NOW)] } }
  await loadGist(fetchJson, 'lagos', NOW)
  await loadGist(fetchJson, 'lagos', NOW + 1000)
  assert.equal(asked, 1)
  assert.deepEqual(gist.lines.map((item) => item.n), [2, 1])
  fail = true
  await loadGist(fetchJson, 'lagos', NOW + 60_000)
  assert.equal(asked, 2)
  assert.equal(gist.failed, true)
  assert.equal(gist.lines.length, 2, 'the last gist stays')
  fail = false
  await loadGist(fetchJson, 'ibadan', NOW + 61_000)
  assert.equal(gist.city, 'ibadan')
})

test('the Gist app is a lazy phone app in the people group', async () => {
  assert.equal(gistPanel.id, 'gist')
  assert.equal(gistPanel.placement, 'phone')
  assert.equal(gistPanel.group, 'people')
})
