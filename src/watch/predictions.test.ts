// OWNER: watch - match predictions: the sides of a fixture, when picks are open, a pick's shape (never an amount), points, badges, seasons, the board.
import test from 'node:test'
import assert from 'node:assert/strict'
import { PREDICT, badgeFor, cleanPick, cleanResult, outcomeOf, pickOpen, pickWords, pointsFor, rankBoard, resultCardWords, resultGist, scoreLine, seasonOf, teamsOf } from './predictions.ts'

const NOW = Date.UTC(2026, 9, 19, 12)

test('a fixture names two sides, or it is a match night with nothing to pick', () => {
  assert.deepEqual(teamsOf('Arsenal v Chelsea'), ['Arsenal', 'Chelsea'])
  assert.deepEqual(teamsOf('Super Eagles vs Black Stars'), ['Super Eagles', 'Black Stars'])
  assert.deepEqual(teamsOf('Enyimba vs. Rangers'), ['Enyimba', 'Rangers'])
  assert.equal(teamsOf('Match night'), null)
  assert.equal(teamsOf('A v B v C'), null)
})

test('picks open two weeks before kick-off and close at kick-off', () => {
  const start = NOW + 86400000
  assert.equal(pickOpen({ start }, NOW), true)
  assert.equal(pickOpen({ start }, start), false, 'closed at kick-off')
  assert.equal(pickOpen({ start: NOW + PREDICT.aheadMs + 1 }, NOW), false, 'not yet open')
})

test('a pick is a winner and maybe a score that agrees; an amount is never kept', () => {
  const plain = cleanPick({ winner: 'home', amount: 5000, stake: 100 }, NOW)
  assert.ok(plain.ok)
  assert.deepEqual(plain.ok && plain.pick, { w: 'home', at: NOW })
  assert.ok(!JSON.stringify(plain).includes('5000'), 'no amount rides along')
  const scored = cleanPick({ winner: 'away', score: [0, 2] }, NOW)
  assert.deepEqual(scored.ok && scored.pick, { w: 'away', s: [0, 2], at: NOW })
  assert.equal(cleanPick({ winner: 'home', score: [1, 1] }, NOW).ok, false, 'a draw score with a home win')
  assert.equal(cleanPick({ winner: 'draw', score: [1, 1] }, NOW).ok, true)
  assert.equal(cleanPick({ winner: 'nobody' }, NOW).ok, false)
  assert.equal(cleanPick({ winner: 'home', score: [1.5, 0] }, NOW).ok, false)
  assert.equal(cleanPick({ winner: 'home', score: [99, 0] }, NOW).ok, false)
  assert.equal(cleanResult({ home: 2, away: 1 }).ok, true)
  assert.equal(cleanResult({ home: -1, away: 1 }).ok, false)
})

test('points: the exact score is three, the right winner one; badges follow', () => {
  const result = { home: 2, away: 1 }
  assert.equal(outcomeOf(2, 1), 'home'); assert.equal(outcomeOf(0, 0), 'draw')
  assert.equal(pointsFor({ w: 'home', s: [2, 1], at: 0 }, result), PREDICT.exactPoints)
  assert.equal(pointsFor({ w: 'home', s: [3, 0], at: 0 }, result), PREDICT.outcomePoints)
  assert.equal(pointsFor({ w: 'home', at: 0 }, result), PREDICT.outcomePoints)
  assert.equal(pointsFor({ w: 'draw', at: 0 }, result), 0)
  assert.equal(badgeFor({ w: 'home', s: [2, 1], at: 0 }, result), 'exact')
  assert.equal(badgeFor({ w: 'home', at: 0 }, result), 'called')
  assert.equal(badgeFor({ w: 'away', at: 0 }, result), null)
})

test('a football season runs August to July, by the Lagos date', () => {
  assert.equal(seasonOf(Date.UTC(2026, 9, 19)), '2026/27')
  assert.equal(seasonOf(Date.UTC(2027, 4, 30)), '2026/27')
  assert.equal(seasonOf(Date.UTC(2027, 7, 1)), '2027/28')
  assert.equal(seasonOf(Date.UTC(2026, 6, 31, 23, 30)), '2026/27', 'already 1 August in Lagos')
})

test('the board ranks points, then exact scores, then right winners, then names', () => {
  const ranked = rankBoard([{ id: 'a', name: 'Bola', points: 4, right: 2, exact: 1 }, { id: 'b', name: 'Ada', points: 4, right: 4, exact: 0 }, { id: 'c', name: 'Chi', points: 6, right: 2, exact: 2 }, { id: 'd', name: 'Ade', points: 4, right: 2, exact: 1 }])
  assert.deepEqual(ranked.map((row) => row.id), ['c', 'd', 'a', 'b'])
})

test('the words: the result line, the gist line (no names, no money) and a person’s card', () => {
  assert.equal(scoreLine('Arsenal v Chelsea', { home: 2, away: 1 }), 'Arsenal 2–1 Chelsea')
  const gist = resultGist('Arsenal v Chelsea', { home: 2, away: 1 }, 3, 10)
  assert.equal(gist, 'Full time: Arsenal 2–1 Chelsea. 3 of 10 fans at the viewing centres called it.')
  assert.ok(gist.length <= 120)
  assert.doesNotMatch(gist, /₦|naira|bet|odds|stake/i)
  assert.equal(resultGist('Arsenal v Chelsea', { home: 0, away: 0 }, 0, 0), 'Full time: Arsenal 0–0 Chelsea.')
  assert.deepEqual(resultCardWords('Arsenal v Chelsea', { home: 2, away: 1 }, 'exact', '2026/27', 7), { headline: 'Spot on: Arsenal 2–1 Chelsea', sub: 'Spot on · 7 points in 2026/27' })
  assert.equal(pickWords('Arsenal v Chelsea', { w: 'away', s: [0, 2], at: 0 }), 'Chelsea to win, 0–2')
  assert.equal(pickWords('Arsenal v Chelsea', { w: 'draw', at: 0 }), 'A draw')
})
