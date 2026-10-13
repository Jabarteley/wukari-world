import test from 'node:test'
import assert from 'node:assert/strict'
import { quietNow } from './told.ts'

const none = { tour: false, settle: false, coach: false, lesson: false, dialog: false }
test('the "Sound is on" toast waits for a moment with no other prompt', () => {
  assert.equal(quietNow(none), true)
  for (const key of Object.keys(none) as (keyof typeof none)[]) assert.equal(quietNow({ ...none, [key]: true }), false, key)
})
