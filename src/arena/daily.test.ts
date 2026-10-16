// OWNER: games (real-time) — the daily challenge: one goal a day, judged from how the match ended, and the streak.
import test from 'node:test'
import assert from 'node:assert/strict'
import { goalFor, goalMet, nextStreak, streakNow } from './daily.ts'

test('one goal a day, the same for everybody, in turn; a game without one has none', () => {
  const days = [0, 1, 2, 3].map((d) => goalFor('fight', d)?.id)
  assert.deepEqual(days, ['ko', 'quick', 'clean', 'ko'])
  assert.equal(goalFor('race', 5), null)
  assert.equal(goalFor('fight', -1)?.id, 'clean')
})

test('the goal is met only by a win that matches it', () => {
  const win = { won: true, reason: 'ko', seconds: 80, hpLeft: 20 }
  assert.equal(goalMet('fight', 0, win), true)
  assert.equal(goalMet('fight', 0, { ...win, won: false }), false)
  assert.equal(goalMet('fight', 1, win), false); assert.equal(goalMet('fight', 1, { ...win, seconds: 45 }), true)
  assert.equal(goalMet('fight', 2, win), false); assert.equal(goalMet('fight', 2, { ...win, hpLeft: 51 }), true)
})

test('a streak grows on days in a row, starts again after a gap, and lapses when a day is missed', () => {
  assert.equal(nextStreak(undefined, 10), 1)
  assert.equal(nextStreak({ day: 9, streak: 3 }, 10), 4)
  assert.equal(nextStreak({ day: 10, streak: 4 }, 10), 4)
  assert.equal(nextStreak({ day: 7, streak: 4 }, 10), 1)
  assert.equal(streakNow({ day: 9, streak: 3 }, 10), 3); assert.equal(streakNow({ day: 8, streak: 3 }, 10), 0)
})
