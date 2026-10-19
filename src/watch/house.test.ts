// OWNER: watch - Allworld House: the season's times, the phases, who is still in, the tally (fewest saves leave, the finale's most win,
// ties by hash), choosing AI housemates, diary lines and the words (always labelled AI).
import test from 'node:test'
import assert from 'node:assert/strict'
import { lagosTime } from '../game/clock.ts'
import { HOUSE, decideWeek, diaryGist, diaryLine, evictAt, evictGist, housePhase, label, pickHousemates, remaining, revealAt, seasonDay, seasonEnd, seasonStart, startGist, startWeekFor, weekStartMs, winnerGist } from './house.ts'
import type { HouseSeason, Housemate } from './house.ts'

const MON = Date.UTC(2026, 9, 18, 23) // Monday 19 October 2026, 00:00 in Lagos
const mates: Housemate[] = ['Ada', 'Bola', 'Chi', 'Dayo', 'Efe', 'Femi', 'Gbemi', 'Hauwa'].map((name, i) => ({ id: `resident.lagos.${name.toLowerCase()}`, name, city: i % 2 ? 'abuja' : 'lagos' }))
const season = (over: Partial<HouseSeason> = {}): HouseSeason => ({ id: 's1-abc', number: 1, startWeek: lagosTime(MON).week, mates, room: 'world:square', weeks: {}, lines: {}, ...over })

test('a season starts on a Lagos Monday and its eviction nights are Sundays at 20:00, the reveal at 20:30', () => {
  const s = season()
  assert.equal(weekStartMs(s.startWeek), MON)
  assert.equal(seasonStart(s), MON)
  const first = lagosTime(evictAt(s, 0))
  assert.deepEqual([first.weekday, first.hour, first.minute], [0, 20, 0])
  assert.equal(revealAt(s, 0) - evictAt(s, 0), 30 * 60000)
  assert.equal(lagosTime(evictAt(s, 3)).day - lagosTime(evictAt(s, 0)).day, 21)
  assert.equal(seasonEnd(s), evictAt(s, 3) + HOUSE.stageMinutes * 60000)
  assert.equal(startWeekFor(MON + 86400000), s.startWeek, 'a Tuesday start begins this week')
  assert.equal(startWeekFor(MON + 4 * 86400000), s.startWeek + 1, 'a Friday start waits for Monday')
})

test('the phases: announced, voting until Sunday 20:00, eviction night, the next week, done; a stopped season is stopped', () => {
  const s = season()
  assert.equal(housePhase(s, MON - 1).phase, 'announced')
  assert.deepEqual(housePhase(s, MON + 3600000), { phase: 'voting', week: 0 })
  assert.deepEqual(housePhase(s, evictAt(s, 0) + 1), { phase: 'eviction', week: 0 })
  assert.deepEqual(housePhase(s, evictAt(s, 0) + 61 * 60000), { phase: 'voting', week: 1 }, 'Sunday 21:01 is the next week’s vote')
  assert.deepEqual(housePhase(s, evictAt(s, 3) + 10), { phase: 'eviction', week: 3 })
  assert.equal(housePhase(s, seasonEnd(s)).phase, 'done')
  assert.equal(housePhase(season({ stopped: MON + 5 }), MON + 10).phase, 'stopped')
  assert.equal(seasonDay(s, MON - 1), 0); assert.equal(seasonDay(s, MON + 1), 1); assert.equal(seasonDay(s, MON + 86400000 * 2 + 1), 3)
})

test('the fewest save votes leave; a tie is broken by a hash, not by list order; the finale’s most votes win', () => {
  const s = season()
  const week0 = decideWeek(s, 0, { [mates[0]!.id]: 5, [mates[1]!.id]: 1, [mates[2]!.id]: 3 })
  assert.ok(week0.evicted && week0.evicted !== mates[0]!.id && week0.evicted !== mates[2]!.id, 'somebody with no votes leaves')
  const tied = decideWeek(s, 0, {})
  const reversed = decideWeek({ ...s, mates: [...mates].reverse() }, 0, {})
  assert.equal(tied.evicted, reversed.evicted, 'order does not matter')
  const out = { ...s, weeks: { 0: { evicted: mates[0]!.id }, 1: { evicted: mates[1]!.id }, 2: { evicted: mates[2]!.id } } }
  assert.equal(remaining(out, 3).length, 5)
  const finale = decideWeek(out, 3, { [mates[3]!.id]: 2, [mates[4]!.id]: 6, [mates[0]!.id]: 50 })
  assert.equal(finale.winner, mates[4]!.id, 'an evicted housemate’s votes do not count')
  assert.equal(finale.share, 75)
  assert.equal(finale.evicted, undefined)
})

test('housemates: 6 to 8 AI residents, different first names, spread over cities, the same for the same seed', () => {
  const pool: Housemate[] = [...mates, { id: 'resident.accra.ada', name: 'Ada Mensah', city: 'accra' }, { id: 'resident.kano.zara', name: 'Zara', city: 'kano' }]
  const picked = pickHousemates(pool, 8, 's1')
  assert.equal(picked.length, 8)
  assert.equal(new Set(picked.map((m) => m.name.split(' ')[0]!.toLowerCase())).size, 8, 'no two Adas')
  assert.deepEqual(pickHousemates(pool, 8, 's1'), picked)
  assert.equal(pickHousemates(pool, 3, 's1').length, HOUSE.minMates, 'at least six')
  assert.equal(pickHousemates(pool, 12, 's1').length, HOUSE.maxMates, 'at most eight')
})

test('diary lines are written, name only housemates, and every word line marks the AI', () => {
  const line = diaryLine(mates[0]!, 3, mates, 's1')
  assert.match(line, /^Day 3\./)
  assert.equal(diaryLine(mates[0]!, 3, mates, 's1'), line, 'the same day says the same')
  assert.ok(!line.includes('{'), 'every placeholder filled')
  assert.equal(label(mates[0]!), 'Ada (AI)')
  for (const text of [startGist(season()), diaryGist(mates[0]!, line), evictGist(mates[1]!, 0, 12), winnerGist(season(), mates[2]!, 41)]) {
    assert.ok(text.length <= 120, text)
    assert.doesNotMatch(text, /₦|naira|Big Brother/i)
  }
  assert.match(evictGist(mates[1]!, 0, 12), /Bola \(AI\) leaves the house in week 1, with 12% of the save votes/)
  assert.match(winnerGist(season(), mates[2]!, 41), /season 1: Chi \(AI\) wins, with 41%/)
})
