// The spray sheet's amounts and words stay inside the gift rules.
import assert from 'node:assert/strict'
import test from 'node:test'
import { TRANSFER_LIMITS } from '../../../game/content/npcs.ts'
import { SPRAY_CHOICES, SPRAY_LIMITS, sprayLine, sprayReach, sprayWhy } from './sprayModel.ts'

test('the copied limits are the gift limits', () => {
  assert.equal(SPRAY_LIMITS.min, TRANSFER_LIMITS.min)
  assert.equal(SPRAY_LIMITS.maxPerTransfer, TRANSFER_LIMITS.maxPerTransfer)
})
test('every offered packet is inside the gift limits', () => {
  for (const choice of SPRAY_CHOICES) assert.equal(sprayWhy(choice, 3), '')
  assert.equal(Math.max(...SPRAY_CHOICES), TRANSFER_LIMITS.maxPerTransfer)
})
test('the words for a packet that cannot be sprayed', () => {
  assert.match(sprayWhy(TRANSFER_LIMITS.min - 1, 3), /at least/)
  assert.match(sprayWhy(TRANSFER_LIMITS.maxPerTransfer + 1, 3), /at most/)
  assert.match(sprayWhy(1.5, 3), /at least/)
  assert.match(sprayWhy(1000, 0), /friends/)
})
test('a packet reaches as many friends as it can give the smallest share', () => {
  assert.equal(sprayReach(1000, 3), 3)
  assert.equal(sprayReach(250, 5), 2)
  assert.equal(sprayReach(50, 5), 0)
  assert.equal(sprayLine(1000, 1), 'Split at random among 1 friend in this group. Game money only.')
  assert.equal(sprayLine(50, 5), '')
})
