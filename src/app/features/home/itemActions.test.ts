// The item sheet's choices for a tapped piece of furniture: a bed sleeps, a stove sends you to the kitchen, a lamp only moves, stores or sells.
import assert from 'node:assert/strict'
import test from 'node:test'
import { FURNITURE, SELL_REFUND_RATE } from '../../../game/content/furniture.ts'
import { itemActions } from './itemActions.ts'

test('a bed offers Sleep and Stay in Bed at the bedroom; selling gives back half', () => {
  const bed = FURNITURE['spring-bed']!
  const actions = itemActions(bed)
  assert.equal(actions.spot, 'bedroom')
  assert.equal(actions.spotLabel, 'Bedroom')
  assert.deepEqual(actions.uses.map((use) => use.activity), ['home-sleep', 'home-stay-in-bed'])
  assert.equal(actions.refund, Math.floor(bed.price * SELL_REFUND_RATE))
})

test('a piece whose actions live at its corner sends you there; a piece with no actions has no spot', () => {
  const stove = Object.values(FURNITURE).find((def) => def.kind === 'stove')!
  assert.deepEqual([itemActions(stove).spot, itemActions(stove).uses.length], ['kitchen', 0])
  const decor = Object.values(FURNITURE).find((def) => def.kind === 'decor')!
  assert.deepEqual([itemActions(decor).spot, itemActions(decor).uses.length], [null, 0])
  for (const def of Object.values(FURNITURE)) for (const use of itemActions(def).uses) assert.match(use.activity, /^home-[a-z-]+$/)
})
