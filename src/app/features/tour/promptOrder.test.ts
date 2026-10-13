import test from 'node:test'
import assert from 'node:assert/strict'
import { promptTurn, settleWanted } from './tourState.ts'

test('one prompt at a time: tour, then settle-in, then the coach line', () => {
  assert.equal(promptTurn({ tour: true, settle: true, coach: true }), 'tour')
  assert.equal(promptTurn({ tour: false, settle: true, coach: true }), 'settle', 'the coach line waits for the settle-in offer')
  assert.equal(promptTurn({ tour: false, settle: false, coach: true }), 'coach', 'once the offer is put away or done')
  assert.equal(promptTurn({ tour: false, settle: true, coach: false }), 'settle')
  assert.equal(promptTurn({ tour: false, settle: false, coach: false }), null)
})

test('the settle-in offer applies to a connected guest past the creator, until put away', () => {
  const view = (o: Partial<{ connected: boolean; guest: boolean; required: boolean }> = {}) => ({ connected: o.connected ?? true, onboarding: { guest: o.guest ?? true, required: o.required ?? false } })
  assert.equal(settleWanted(view(), false), true)
  assert.equal(settleWanted(view(), true), false, 'dismissed')
  assert.equal(settleWanted(view({ guest: false }), false), false, 'settled')
  assert.equal(settleWanted(view({ required: true }), false), false, 'creator open')
  assert.equal(settleWanted(view({ connected: false }), false), false)
})
