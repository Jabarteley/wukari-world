// The words of the "what AI characters remember" screen: why a Partner button is missing says the true reason, and the words stay short.
import assert from 'node:assert/strict'
import { test } from 'node:test'
import { memoryWords } from './memoryModel.ts'

test('the reason a partner button is missing is the real one, in plain words', () => {
  assert.match(memoryWords.partnerWhy(false, 80, 40), /18 or older/)
  assert.match(memoryWords.partnerWhy(true, 12.6, 40), /12 of 40/)
  assert.match(memoryWords.partnerWhy(true, 50, 40), /Bae/)
  assert.ok(memoryWords.explainer.length < 260 && /delete/.test(memoryWords.explainer))
})
