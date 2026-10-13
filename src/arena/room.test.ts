// OWNER: games (real-time) — the result line of a finished game.
import test from 'node:test'
import assert from 'node:assert/strict'
import { placeHeadline } from './room.ts'

test('first wins, second and third get their place, the rest say where they finished', () => {
  assert.equal(placeHeadline(1, true, 4), 'You won!')
  assert.equal(placeHeadline(2, true, 4), '2nd place')
  assert.equal(placeHeadline(3, true, 4), '3rd place')
  assert.equal(placeHeadline(4, false, 4), 'You finished 4th')
  assert.equal(placeHeadline(2, true, 2), 'You finished 2nd')
})

test('a game with no places is won or lost', () => {
  assert.equal(placeHeadline(undefined, true, 2), 'You won!')
  assert.equal(placeHeadline(undefined, false, 2), 'You lost')
})
