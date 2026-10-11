import { loadCityContent as preloadCityContent } from '../cities/registry.ts'
await Promise.all(['lagos', 'ibadan'].map(preloadCityContent))
// What a regular remembers of the player across visits: a few bits per regular (days met, things bought, closeness, last day), a standing from cold to
// friendly, and what that changes in what they say and offer. Saved lives from before the bits existed must load and read as one visit, never zero.
import test from 'node:test'
import assert from 'node:assert/strict'
import { advanceLife, createLife, dispatch } from '../../life.ts'
import { makeContext } from '../util.ts'
import { standingOf, loyaltyDue, LOYALTY_EVERY, LOYALTY_PERCENT, NEGLECT_DAYS, REGULAR_VISITS } from './mind.ts'
import { VISITS_KEPT } from './facts.ts'
import { standingLine } from './lines.ts'
import type { Standing } from './lines.ts'
import type { LifeState } from '../../types/life.ts'
import { NPCS } from '../cities/lagos/regulars.ts'
import { activityId } from '../systems/social.ts'

const DAY = 86_400_000
const START = Date.UTC(2026, 0, 5, 9)
const ctx = (now: number) => makeContext({ now, cityId: 'lagos', seed: 'memory' })
const npc = Object.values(NPCS).find((n) => n.venue === 'park') ?? Object.values(NPCS)[0]!
const FRIEND = 20, WARM = 5

test('standing moves from new to known to regular, and from regular to neglected when the player stays away, and to friend with closeness', () => {
  const at = (rel: { p: number; d: number; v?: number } | undefined, day = 100): Standing => standingOf(rel, day, FRIEND, WARM)
  assert.equal(at(undefined), 'new')
  assert.equal(at({ p: 2, d: 99, v: 1 }), 'known')
  assert.equal(at({ p: 8, d: 99, v: 2 }), 'known')
  assert.equal(at({ p: 2, d: 99, v: 3 }), 'cold', 'visited three times and never warmed')
  assert.equal(at({ p: 8, d: 99, v: 3 }), 'known')
  assert.equal(at({ p: 8, d: 99, v: REGULAR_VISITS }), 'regular')
  assert.equal(at({ p: 25, d: 99, v: 1 }), 'friend')
  assert.equal(at({ p: 25, d: 100 - NEGLECT_DAYS, v: 5 }), 'neglected', 'a friend gone a week is remarked on')
  assert.equal(at({ p: 8, d: 100 - NEGLECT_DAYS, v: 5 }), 'neglected', 'so is a regular customer')
  assert.equal(at({ p: 8, d: 100 - NEGLECT_DAYS + 1, v: 5 }), 'regular')
  assert.equal(at({ p: 8, d: 10, v: 1 }), 'known', 'someone who came once long ago is known, not neglected')
  assert.equal(at({ p: 3, d: 99 }), 'known', 'a life saved before the count existed reads as one visit')
})

test('what they say changes with how they stand: formal to a new face, by name to a regular, the absence remarked on', () => {
  const said = (standing: Standing, name = 'Ada') => standingLine(standing, name, 12, 3)
  assert.match(said('new'), /new|first|not think we have met/i)
  assert.ok(!said('new').includes('Ada'), 'a new face is not called by name')
  assert.ok(said('regular').includes('Ada'))
  assert.match(said('neglected'), /where have you been|long time|forgot/i)
  assert.ok(said('regular', '').includes('my friend'), 'no name, no crash')
  assert.notEqual(said('known'), said('cold'))
  const all = (['new', 'known', 'cold', 'regular', 'friend', 'neglected'] as const).flatMap((s) => [0, 1, 2, 3].map((d) => standingLine(s, 'Ada', d)))
  assert.ok(all.every((line) => line.length > 20 && !line.includes('{name}')))
})

test('the loyalty treat comes on every third visit of a regular customer, and only then', () => {
  const due = Array.from({ length: 12 }, (_, i) => loyaltyDue(i))
  assert.deepEqual(due.map((d, i) => d ? i + 1 : 0).filter(Boolean), [6, 9, 12], 'visit numbers that earn it: the fourth-or-later that are a multiple of three')
  assert.equal(LOYALTY_EVERY, 3); assert.ok(LOYALTY_PERCENT > 0 && LOYALTY_PERCENT <= 10)
})

/** One visit: say hello at the park on a day. Returns the NPC line in the message. */
function visit(state: LifeState, day: number): string {
  const now = START + day * DAY
  state.t = now
  state.location = npc.venue; state.spot = 'people'
  const started = dispatch(state, { type: 'activity', payload: { id: activityId(npc.id, 'hello') } }, ctx(now))
  assert.ok(started.ok, started.ok ? '' : started.reason)
  advanceLife(state, 60, ctx(now + 60_000))
  return state.message
}

test('over visits one, three and ten the regular warms from formal to by name, keeps three bits, and the treat arrives', () => {
  const state = createLife({ location: npc.venue, spot: 'people', name: 'Ada Obi' }, ctx(START))
  const lines: string[] = []
  const rel = () => state.social.rel[npc.id]!
  for (let n = 1; n <= 10; n++) {
    const line = visit(state, n * 2)
    lines.push(line)
    assert.equal(rel().v, n, `visit ${n} counted once`)
  }
  assert.ok(!lines[0]!.includes('Ada') && /new|met|first/i.test(lines[0]!), `visit one is formal: ${lines[0]}`)
  assert.ok(lines.slice(3).some((l) => l.includes('Ada')), `a regular is greeted by name: ${lines.slice(3).join(' | ')}`)
  assert.ok(lines.some((l) => /off your next grocery/.test(l)), 'a regular customer is treated now and then')
  assert.ok(rel().v! <= VISITS_KEPT && Object.keys(rel()).every((k) => ['p', 'd', 'n', 'npc', 'at', 'v', 'b', 'm', 'tags', 'npcSnapshot'].includes(k)), 'only the small bits are kept')
  // a second hello the same day is the same visit
  visit(state, 22); visit(state, 22)
  assert.equal(rel().v, 10 + 1)
  // and a long absence is remarked on
  const back = visit(state, 40)
  assert.match(back, /where have you been|long time|forgot|stranger returns/i, back)
})

test('a life saved before the visit count existed upgrades cleanly: it loads, reads as one visit, and counts from there', () => {
  const old = createLife({ location: npc.venue, spot: 'people', name: 'Ada' }, ctx(START))
  visit(old, 1)
  const saved = JSON.parse(JSON.stringify(old)) as Record<string, any>
  delete saved.social.rel[npc.id].v; delete saved.social.rel[npc.id].b
  const loaded = createLife(saved, ctx(START + 5 * DAY))
  const rel = loaded.social.rel[npc.id]!
  assert.equal(rel.v, undefined, 'nothing is invented at load')
  assert.equal(standingOf(rel, 6, FRIEND, WARM), 'known')
  const line = visit(loaded, 6)
  assert.ok(loaded.social.rel[npc.id]!.v === 2, `the next visit counts as the second: ${loaded.social.rel[npc.id]!.v}`)
  assert.ok(line.length > 0)
  // hostile or malformed values are dropped, good ones kept and capped
  const hostile = JSON.parse(JSON.stringify(old)) as Record<string, any>
  hostile.social.rel[npc.id].v = -4; hostile.social.rel[npc.id].b = 'many'
  const clean = createLife(hostile, ctx(START)).social.rel[npc.id]!
  assert.equal(clean.v, undefined); assert.equal(clean.b, undefined)
  hostile.social.rel[npc.id].v = 5000; hostile.social.rel[npc.id].b = 7
  const capped = createLife(hostile, ctx(START)).social.rel[npc.id]!
  assert.deepEqual([capped.v, capped.b], [VISITS_KEPT, 7])
  // a saved life round-trips with the bits
  const again = createLife(JSON.parse(JSON.stringify(loaded)), ctx(START + 6 * DAY))
  assert.equal(again.social.rel[npc.id]!.v, loaded.social.rel[npc.id]!.v)
})
