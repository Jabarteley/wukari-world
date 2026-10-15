// The words under an agent's task in the Missions app (missionsLines.ts): where and when to find the agent, what it pays, and that it is done.
import assert from 'node:assert/strict'
import { test } from 'node:test'
import { agentHint, agentPercent } from './missionsLines.ts'

const money = (value: number): string => `₦${value.toLocaleString('en-NG')}`
const by = { id: 'house.lagos.tolani', name: 'Mama Tolani', place: 'Lagos Market', hours: '9 AM to 6 PM' }

test('an open task says where to find the agent, when, and what it pays', () => {
  assert.equal(agentHint({ by, cash: 250, done: false, claimed: false }, money), 'Lagos Market, 9 AM to 6 PM · ₦250')
  assert.equal(agentHint({ by: { ...by, hours: '' }, cash: 250, done: false, claimed: false }, money), 'Lagos Market · ₦250')
})

test('a finished task says it is waiting to be collected, and a collected one says it is done', () => {
  assert.equal(agentHint({ by, cash: 600, done: true, claimed: false }, money), 'Done · ₦600 to collect')
  assert.equal(agentHint({ by, cash: 600, done: true, claimed: true }, money), 'Done')
})

test('progress is a whole percent of the count', () => {
  assert.equal(agentPercent({ n: 1, count: 3 }), 33)
  assert.equal(agentPercent({ n: 3, count: 3 }), 100)
})
