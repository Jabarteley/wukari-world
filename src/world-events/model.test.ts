// The weekly world event's pure rules (src/world-events/model.ts): the schedule, the rotation, the phases, drops, the AI share and the words.
import test from 'node:test'
import assert from 'node:assert/strict'
import { lagosTime } from '../game/clock.ts'
import { AI_SHARE_MAX, BUILT_IN, DEFAULT_SCHEDULE, aiDue, chipShows, cleanEvent, cleanSchedule, currentOccurrence, dropsOf, eventList, lineResult, normalAnswer, occurrenceOf, openDrop, percentOf, phaseOf } from './model.ts'

const CITIES = ['lagos', 'accra', 'nairobi']
/** 2026-10-24 is a Saturday. */
const SATURDAY_UTC = Date.UTC(2026, 9, 24)

test('the default schedule is Saturday 20:00 Lagos time, an hour long, with an hour of warm-up before', () => {
  const week = lagosTime(SATURDAY_UTC).week, found = occurrenceOf(week)
  assert.ok(found)
  const start = lagosTime(found.startsAt)
  assert.equal(start.weekday, 6); assert.equal(start.hour, 20); assert.equal(start.minute, 0)
  assert.equal(found.startsAt, Date.UTC(2026, 9, 24, 19), '20:00 in Lagos is 19:00 UTC')
  assert.equal(found.endsAt - found.startsAt, 60 * 60000)
  assert.equal(found.startsAt - found.warmupAt, 60 * 60000)
  assert.equal(lagosTime(found.announcedAt).weekday, 1, 'announced from the Monday of the week')
  assert.deepEqual({ ...DEFAULT_SCHEDULE }, { weekday: 6, hour: 20, minute: 0, minutes: 60, warmup: 60, off: false })
})

test('phases move announced, warm-up, live, done; a late event of last week still counts after midnight on Monday', () => {
  const week = lagosTime(SATURDAY_UTC).week, o = occurrenceOf(week)!
  assert.equal(phaseOf(o, o.warmupAt - 1), 'announced')
  assert.equal(phaseOf(o, o.warmupAt), 'warmup')
  assert.equal(phaseOf(o, o.startsAt), 'live')
  assert.equal(phaseOf(o, o.endsAt), 'done')
  assert.equal(currentOccurrence(o.startsAt + 1)?.phase, 'live')
  // Sunday 23:30, two hours long: still running at 00:30 on Monday of the next week.
  const late = { schedule: { weekday: 0, hour: 23, minute: 30, minutes: 120, warmup: 0 } }
  const sunday = occurrenceOf(week, late)!
  assert.equal(lagosTime(sunday.startsAt).weekday, 0)
  const monday = sunday.startsAt + 60 * 60000
  assert.equal(lagosTime(monday).week, week + 1)
  assert.equal(currentOccurrence(monday, late)?.week, week, 'last week’s event while it runs')
  assert.equal(currentOccurrence(sunday.endsAt, late)?.week, week + 1)
})

test('the rotation walks the built-in list week by week; a dated event wins its week; hidden ones are skipped; off means none', () => {
  const week = lagosTime(SATURDAY_UTC).week
  const ids = [0, 1, 2, 3, 4].map((k) => occurrenceOf(week + k)!.def.id)
  assert.equal(new Set(ids).size, BUILT_IN.length, 'five weeks, five different events')
  const own = cleanEvent({ id: 'abuja-cleanup', title: 'Clean up the gardens', blurb: 'Walk the gardens.', city: 'lagos', goal: 'gather', target: 40, venues: ['park'], change: { label: 'Gardens in bloom', colours: ['#00ff00', '#ffffff'] }, on: '2026-10-24' }, CITIES)
  assert.ok(own.ok)
  assert.equal(occurrenceOf(week, { events: [own.value] })!.def.id, 'abuja-cleanup')
  assert.notEqual(occurrenceOf(week + 1, { events: [own.value] })!.def.id, 'abuja-cleanup', 'a dated event is not in the rotation')
  const first = occurrenceOf(week)!.def.id
  assert.notEqual(occurrenceOf(week, { hidden: [first] })!.def.id, first)
  assert.equal(occurrenceOf(week, { hidden: BUILT_IN.map((item) => item.id) }), null)
  assert.equal(occurrenceOf(week, { schedule: { off: true } }), null)
  // An added event with a built-in id replaces the built-in.
  const replaced = cleanEvent({ ...BUILT_IN[0], title: 'A better bridge' }, ['lagos'])
  assert.ok(replaced.ok)
  const weekOf = [0, 1, 2, 3, 4].map((k) => week + k).find((w) => occurrenceOf(w)!.def.id === BUILT_IN[0]!.id)!
  assert.equal(occurrenceOf(weekOf, { events: [replaced.value] })!.def.title, 'A better bridge')
})

test('an admin’s schedule and events are checked: ranges, two venues for a delivery, questions with answers, no links, two colours', () => {
  assert.ok(cleanSchedule({ weekday: 5, hour: 19, minute: 30, minutes: 90, warmup: 30 }).ok)
  for (const bad of [{ weekday: 7, hour: 1, minute: 0, minutes: 60, warmup: 0 }, { weekday: 1, hour: 24, minute: 0, minutes: 60, warmup: 0 }, { weekday: 1, hour: 1, minute: 0, minutes: 5, warmup: 0 }, { weekday: 1, hour: 1, minute: 0, minutes: 60, warmup: 500 }]) assert.equal(cleanSchedule(bad).ok, false, JSON.stringify(bad))
  const base = { id: 'test-event', title: 'A test event', blurb: 'Words.', city: 'lagos', goal: 'gather', target: 50, venues: [], change: { label: 'Something new', colours: ['#112233', '#445566'] } }
  assert.ok(cleanEvent(base, CITIES).ok)
  assert.equal(cleanEvent({ ...base, city: 'atlantis' }, CITIES).ok, false)
  assert.equal(cleanEvent({ ...base, goal: 'fly' }, CITIES).ok, false)
  assert.equal(cleanEvent({ ...base, target: 5 }, CITIES).ok, false)
  assert.equal(cleanEvent({ ...base, goal: 'deliver', venues: ['market'] }, CITIES).ok, false)
  assert.equal(cleanEvent({ ...base, goal: 'deliver', venues: ['market', 'market'] }, CITIES).ok, false)
  assert.ok(cleanEvent({ ...base, goal: 'deliver', venues: ['market', 'park'] }, CITIES).ok)
  assert.equal(cleanEvent({ ...base, goal: 'answer' }, CITIES).ok, false, 'an answer event needs questions')
  const quiz = cleanEvent({ ...base, goal: 'answer', questions: [{ q: 'What is the capital?', answers: ['  The ABUJA! '] }] }, CITIES)
  assert.ok(quiz.ok); assert.deepEqual(quiz.value.questions, [{ id: 'q1', q: 'What is the capital?', answers: ['abuja'] }])
  assert.equal(cleanEvent({ ...base, title: 'Visit www.example.com' }, CITIES).ok, false)
  assert.equal(cleanEvent({ ...base, change: { label: 'New', colours: ['red', '#445566'] } }, CITIES).ok, false)
  assert.equal(cleanEvent({ ...base, on: '2026-13-45' }, CITIES).ok, false)
  assert.equal(eventList([base, base, { junk: true }], CITIES).length, 1, 'a stored list drops duplicates and damage')
  assert.equal(normalAnswer('  Éle-gushi  Beach!'), 'ele gushi beach')
})

test('warm-up drops land every fifteen minutes and close before the event; the open one is found by time', () => {
  const o = occurrenceOf(lagosTime(SATURDAY_UTC).week)!, drops = dropsOf(o)
  assert.equal(drops.length, 4)
  assert.ok(drops.every((drop) => drop.closesAt <= o.startsAt && drop.closesAt > drop.opensAt))
  assert.equal(openDrop(drops, o.warmupAt + 60000)?.id, 'd0')
  assert.equal(openDrop(drops, o.warmupAt + 10 * 60000), null, 'between drops')
  assert.equal(openDrop(drops, o.warmupAt + 16 * 60000)?.id, 'd1')
  assert.deepEqual(dropsOf({ warmupAt: 10, startsAt: 10 }), [], 'no warm-up, no drops')
})

test('the AI residents add their share evenly over the hour and never more than the cap', () => {
  const o = occurrenceOf(lagosTime(SATURDAY_UTC).week)!, target = o.def.target
  assert.equal(aiDue(o, o.startsAt - 1, 35), 0)
  assert.equal(aiDue(o, o.startsAt + 30 * 60000, 35), Math.floor(target * 0.35 * 0.5))
  assert.equal(aiDue(o, o.endsAt + 99999, 35), Math.floor(target * 0.35))
  assert.equal(aiDue(o, o.endsAt, 100), Math.floor(target * AI_SHARE_MAX / 100), 'capped below the target: people finish it')
  assert.ok(aiDue(o, o.endsAt, 100) < target)
  assert.equal(aiDue(o, o.endsAt, 0), 0)
  assert.equal(percentOf(41, 80), 51); assert.equal(percentOf(200, 80), 100); assert.equal(percentOf(0, 0), 0)
})

test('the chip shows from a day before the warm-up to three hours after the end', () => {
  const o = occurrenceOf(lagosTime(SATURDAY_UTC).week)!
  assert.equal(chipShows(o, o.warmupAt - 25 * 3600000), false)
  assert.equal(chipShows(o, o.warmupAt - 23 * 3600000), true)
  assert.equal(chipShows(o, o.endsAt + 2 * 3600000), true)
  assert.equal(chipShows(o, o.endsAt + 4 * 3600000), false)
})

test('the result line, which is the share card, says what happened in numbers, at most 120 characters', () => {
  const def = { title: 'Rebuild the footbridge at Freedom Park' }
  assert.equal(lineResult(def, 'Lagos', { people: 214, ai: 3, count: 90, target: 80, done: true }), 'Lagos did it: Rebuild the footbridge at Freedom Park. 214 people and 3 AI residents helped')
  assert.equal(lineResult(def, 'Lagos', { people: 1, ai: 0, count: 41, target: 80, done: false }), 'Lagos got 51% of the way: Rebuild the footbridge at Freedom Park. 1 person helped')
  assert.ok(lineResult({ title: 'x'.repeat(200) }, 'Lagos', { people: 2, ai: 1, count: 1, target: 2, done: false }).length <= 120)
})
