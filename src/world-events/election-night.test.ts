// Election night's pure parts (src/world-events/election-night.ts): the times, the board's numbers, the debate choice and the card's words.
import test from 'node:test'
import assert from 'node:assert/strict'
import { lagosTime } from '../game/clock.ts'
import { DEBATE_SLOTS, boardSeat, debateSlot, nightPhase, nightTimes, percents, pickDebates, resultLine } from './election-night.ts'
import type { Race } from './election-night.ts'

const race = (votes: number[], more: Partial<Race> = {}): Race => ({ scope: 'state:lagos', tier: 'state', side: 'humans', place: 'Lagos', title: 'Governor', quorum: 10,
  candidates: votes.map((n, at) => ({ id: `c${at}`, name: ['Ada', 'Tunde', 'Chi', 'Bisi'][at] ?? `C${at}`, votes: n, party: null, ai: false })), ...more })

test('the night follows the civic week: debate on Friday 20:00, results live from Saturday 18:00, polls close at Sunday 00:00', () => {
  const week = lagosTime(Date.UTC(2026, 9, 24)).week, times = nightTimes(week)
  const debate = lagosTime(times.debateAt), live = lagosTime(times.liveAt), close = lagosTime(times.closesAt)
  assert.deepEqual([debate.weekday, debate.hour], [5, 20])
  assert.deepEqual([live.weekday, live.hour], [6, 18])
  assert.deepEqual([close.weekday, close.hour], [0, 0])
  assert.equal(times.debateEnds - times.debateAt, DEBATE_SLOTS * 30 * 60000)
  assert.equal(nightPhase(times, times.debateAt + 1), 'debate')
  assert.equal(nightPhase(times, times.liveAt + 1), 'live')
  assert.equal(nightPhase(times, times.closesAt), 'results')
  assert.equal(nightPhase(times, times.resultsEnd), 'quiet')
  assert.equal(debateSlot(times, times.debateAt + 31 * 60000), 1)
  assert.equal(debateSlot(times, times.debateEnds), -1)
})

test('the board: per cents that add up to 100, the leader before the close, the winner after it, void under the quorum', () => {
  assert.deepEqual(percents([61, 39]), [61, 39])
  assert.deepEqual(percents([1, 1, 1]), [34, 33, 33])
  assert.deepEqual(percents([0, 0]), [0, 0])
  const open = boardSeat(race([11, 7]), false)
  assert.equal(open.total, 18); assert.equal(open.winner, null); assert.equal(open.rows[0]!.leading, true)
  assert.deepEqual(open.rows.map((row) => row.percent), [61, 39])
  const closed = boardSeat(race([11, 7]), true)
  assert.deepEqual(closed.winner, { id: 'c0', name: 'Ada', percent: 61, ai: false })
  const short = boardSeat(race([5, 4]), true)
  assert.equal(short.winner, null); assert.equal(short.void, true, 'under the quorum of 10 the election does not count')
  assert.equal(boardSeat(race([0, 0]), true).winner, null)
  const agents = boardSeat(race([12, 1], { side: 'agents', candidates: [{ id: 'a1', name: 'Bot', votes: 12, party: null, ai: true }, { id: 'a2', name: 'Bit', votes: 1, party: null, ai: true }] }), true)
  assert.deepEqual(agents.winner, { id: 'a1', name: 'Bot', percent: 92, ai: true })
})

test('the card: "Ada wins Lagos with 61%", an AI winner marked', () => {
  assert.equal(resultLine('Ada', 'Lagos', 61, false), 'Ada wins Lagos with 61%')
  assert.equal(resultLine('Bot', 'Lagos', 92, true), 'Bot (AI) wins Lagos with 92%')
})

test('debates go to people’s races with two or more candidates: the nation first, then states, then cities, the most candidates first', () => {
  const r = (scope: string, tier: Race['tier'], n: number, side: Race['side'] = 'humans') => ({ scope, tier, side, candidates: Array.from({ length: n }, (_, at) => ({ id: `${scope}${at}`, name: 'X', votes: at, party: null, ai: false })) })
  const picked = pickDebates([r('city:lagos', 'city', 5), r('city:accra', 'city', 1), r('state:lagos', 'state', 2), r('nation:ng', 'nation', 3), r('nation:ng@ai', 'nation', 4, 'agents'), r('city:abuja', 'city', 3), r('city:ibadan', 'city', 2)])
  assert.deepEqual(picked, ['nation:ng', 'state:lagos', 'city:lagos', 'city:abuja'])
  assert.equal(picked.length, DEBATE_SLOTS)
})
