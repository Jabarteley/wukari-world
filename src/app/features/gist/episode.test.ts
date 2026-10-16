// The episode card's reading and words (src/app/features/gist/episodeModel.ts, src/episode/text.ts).
import assert from 'node:assert/strict'
import test from 'node:test'
import { episodeFacts, episodeShareLine, ordinal } from '../../../episode/text.ts'
import { episodeApiPath, episodeSharePath, readEpisode } from './episodeModel.ts'

const good = { episode: { city: 'lagos', cityName: 'Lagos', week: '2026-10-12', from: 1, to: 2, current: true, quiet: false, headline: 'This week in Lagos', description: 'x', stalls: 2,
  lines: [{ text: 'Tunde was elected governor of Lagos', kind: 'election', at: 5, ai: true }, { text: 'A law', kind: 'law', at: 6 }], league: { rank: 2, of: 5, final: false, leader: { id: 'ibadan', name: 'Ibadan' } }, office: { title: 'Governor', name: 'Tunde' } } }

test('paths', () => {
  assert.equal(episodeApiPath('lagos'), '/api/world/episode?id=lagos')
  assert.equal(episodeSharePath('lagos'), '/episode/lagos')
})
test('an answer is read defensively', () => {
  const read = readEpisode(good)
  assert.equal(read?.lines.length, 2)
  assert.equal(read?.lines[0]?.ai, true)
  assert.equal(read?.lines[1]?.ai, undefined)
  assert.equal(read?.league?.leader?.name, 'Ibadan')
  for (const bad of [null, 'x', {}, { episode: null }, { episode: { lines: 3 } }]) assert.equal(readEpisode(bad), null)
  assert.equal(readEpisode({ episode: { lines: [{ text: '' }, 7, null], league: { rank: 0 } } })?.lines.length, 0)
  assert.equal(readEpisode({ episode: { lines: new Array(20).fill({ text: 'a' }) } })?.lines.length, 5)
})
test('words', () => {
  assert.deepEqual([1, 2, 3, 4, 11, 12, 13, 21, 22].map(ordinal), ['1st', '2nd', '3rd', '4th', '11th', '12th', '13th', '21st', '22nd'])
  const read = readEpisode(good)!
  assert.deepEqual(episodeFacts(read), ['Lagos is 2nd of 5 in the city league, behind Ibadan.', 'On the public record: Governor Tunde.', '2 new stalls opened.'])
  assert.equal(episodeShareLine(read), 'This week in Lagos: Tunde was elected governor of Lagos.')
  assert.equal(episodeFacts({ ...read, league: { rank: 1, of: 3, final: true, leader: { id: 'lagos', name: 'Lagos' } }, office: null, stalls: 1, current: false })[0], 'Lagos was 1st of 3 in the city league and took the week.')
  assert.equal(episodeShareLine({ headline: 'A quiet week in Lagos', lines: [] }), 'A quiet week in Lagos.')
})
