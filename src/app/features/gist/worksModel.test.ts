// The phone side of city works: reading an answer, the bar, the gift buttons, the order sent.
import assert from 'node:assert/strict'
import test from 'node:test'
import { firstInOrder, giftChoices, percentOf, readWorks, worksPath } from './worksModel.ts'

const limits = { min: 100, max: 5000, daily: 10000 }
const answer = { city: 'lagos', active: { id: 'clinic', label: 'Clinic', line: 'A clinic is being built.', paid: 150000, cost: 300000, gifts: 12 }, done: [{ id: 'pitch', label: 'Football pitch', line: 'There is a proper football pitch here.', at: 5 }], order: ['clinic', 'market-roof', 'pitch'], later: [{ id: 'market-roof', label: 'Market roof' }], limits, you: { canOrder: true } }

test('an answer is read defensively', () => {
  assert.equal(readWorks(null), null)
  assert.equal(readWorks({ done: 'x' }), null)
  const read = readWorks(answer)
  assert.equal(read?.active?.label, 'Clinic'); assert.equal(read?.canOrder, true); assert.deepEqual(read?.later, [{ id: 'market-roof', label: 'Market roof' }])
  assert.equal(readWorks({ ...answer, active: null, you: undefined })?.active, null)
  assert.equal(readWorks({ ...answer, you: undefined })?.canOrder, false)
  assert.deepEqual(readWorks({ ...answer, done: [null, { id: '' }, 4] })?.done, [])
  assert.equal(worksPath('lagos'), '/api/world/works?id=lagos')
})

test('the bar, the gift buttons and the order', () => {
  assert.equal(percentOf({ paid: 150000, cost: 300000 }), 50)
  assert.equal(percentOf({ paid: 400000, cost: 300000 }), 100)
  assert.deepEqual(giftChoices({ paid: 0, cost: 300000 }, limits), [500, 2500, 5000])
  assert.deepEqual(giftChoices({ paid: 299700, cost: 300000 }, limits), [300], 'never more than is left')
  assert.deepEqual(giftChoices({ paid: 300000, cost: 300000 }, limits), [])
  assert.deepEqual(firstInOrder(['clinic', 'pitch', 'market-roof'], 'pitch'), ['pitch', 'clinic', 'market-roof'])
})
