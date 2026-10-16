// OWNER: games (real-time) — arena stakes, pure: who may play for one, how backers share the prize, and the words.
import test from 'node:test'
import assert from 'node:assert/strict'
import { FORBIDDEN_WORDS } from '../game/table-stakes.ts'
import { TABLE_STAKES } from '../game/content/growth.ts'
import { BACK_CHOICES, PLAY_CHOICES, PLAY_MONEY, backLine, backOutcome, backingOpen, isBackStake, isPlayStake, playLine, settleBacks, stakeHolds } from './stakes.ts'

test('the arena uses the table stakes exactly, and backing is small', () => {
  assert.deepEqual(PLAY_CHOICES, TABLE_STAKES.choices)
  assert.ok(Math.max(...BACK_CHOICES) <= 500)
  assert.ok(isPlayStake(500) && !isPlayStake(300) && isBackStake(100) && !isBackStake(0))
})

test('a stake holds only between exactly two people', () => {
  assert.equal(stakeHolds([{ bot: false }, { bot: false }]), true)
  assert.equal(stakeHolds([{ bot: false }, { bot: true }]), false)
  assert.equal(stakeHolds([{ bot: false }, { bot: false }, { bot: false }]), false)
})

test('the winner’s backers share the whole prize in proportion, to the naira; nothing is made or lost', () => {
  const backs = [{ id: 'a', seat: 0, amount: 100 }, { id: 'b', seat: 0, amount: 500 }, { id: 'c', seat: 1, amount: 500 }, { id: 'd', seat: 1, amount: 100 }]
  const out = settleBacks(backs, 0)
  assert.equal(out.reduce((s, p) => s + p.paid, 0), 1200, 'everything put in is paid out')
  assert.deepEqual(out.map((p) => p.paid), [200, 1000, 0, 0])
  const odd = settleBacks([{ id: 'a', seat: 0, amount: 100 }, { id: 'b', seat: 0, amount: 100 }, { id: 'c', seat: 0, amount: 100 }, { id: 'd', seat: 1, amount: 100 }], 0)
  assert.equal(odd.reduce((s, p) => s + p.paid, 0), 400); assert.deepEqual(odd.map((p) => p.paid), [134, 133, 133, 0], 'rounding goes to the earliest of the biggest')
})

test('a draw, nobody on the other side, or nobody on the winner gives every stake back', () => {
  const backs = [{ id: 'a', seat: 0, amount: 100 }, { id: 'b', seat: 1, amount: 500 }]
  for (const out of [settleBacks(backs, null), settleBacks([{ id: 'a', seat: 0, amount: 100 }], 0), settleBacks([{ id: 'a', seat: 1, amount: 100 }], 0)]) {
    assert.ok(out.every((p) => p.refund && p.paid === p.stake))
  }
  assert.deepEqual(settleBacks([], 0), [])
})

test('backing is open in the lobby and the first ten seconds only', () => {
  assert.equal(backingOpen('lobby', 0, 20), true)
  assert.equal(backingOpen('playing', 199, 20), true)
  assert.equal(backingOpen('playing', 200, 20), false)
  assert.equal(backingOpen('over', 0, 20), false)
})

test('every line says stake, prize and back, never a betting word, and never shows odds', () => {
  const lines = [PLAY_MONEY, playLine(0), playLine(500), backLine('Ada', 100), backOutcome({ id: 'a', paid: 300, refund: false, stake: 100 }, 'Ada'), backOutcome({ id: 'a', paid: 0, refund: false, stake: 100 }, 'Ada'), backOutcome({ id: 'a', paid: 100, refund: true, stake: 100 }, 'Ada')]
  for (const line of lines) { assert.doesNotMatch(line, FORBIDDEN_WORDS, line); assert.doesNotMatch(line, /odds|\d+\s*(to|:)\s*\d+|luck|chance|tip/i, line) }
  assert.match(playLine(500), /prize/)
})
