import test from 'node:test'
import assert from 'node:assert/strict'
import { settleWanted } from './tourState.ts'

test('the settle-in offer applies to a connected guest past the creator, until put away', () => {
  const view = (o: Partial<{ connected: boolean; guest: boolean; required: boolean }> = {}) => ({ connected: o.connected ?? true, onboarding: { guest: o.guest ?? true, required: o.required ?? false } })
  assert.equal(settleWanted(view(), false), true)
  assert.equal(settleWanted(view(), true), false, 'dismissed')
  assert.equal(settleWanted(view({ guest: false }), false), false, 'settled')
  assert.equal(settleWanted(view({ required: true }), false), false, 'creator open')
  assert.equal(settleWanted(view({ connected: false }), false), false)
})
