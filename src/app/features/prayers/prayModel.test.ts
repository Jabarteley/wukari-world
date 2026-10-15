// The Pray action's rules: the notice comes before the box, and only after it can a prayer be sent (docs/PRAYERS.md).
import assert from 'node:assert/strict'
import { test } from 'node:test'
import { NOTICE, PRAY_MAX, canSend, isWorship, nextStep, prayerBody } from './prayModel.ts'

test('the notice says who reads prayers, in the words the server uses', () => {
  assert.equal(NOTICE, 'Prayers are read by the people who run Allworld.')
})
test('the box cannot be reached without passing the notice', () => {
  assert.equal(nextStep('closed', 'open'), 'notice')
  assert.equal(nextStep('closed', 'continue'), 'closed', 'no way past the notice from nowhere')
  assert.equal(nextStep('closed', 'sent'), 'closed')
  assert.equal(nextStep('notice', 'sent'), 'notice', 'nothing is sent from the notice')
  assert.equal(nextStep('notice', 'continue'), 'write')
  assert.equal(nextStep('write', 'sent'), 'sent')
  assert.equal(nextStep('sent', 'open'), 'notice', 'a second prayer shows the notice again')
  assert.equal(nextStep('write', 'close'), 'closed')
})
test('a prayer is built only from the writing step, and always carries the notice flag', () => {
  assert.equal(prayerBody('notice', 'Thank you', ''), null)
  assert.equal(prayerBody('closed', 'Thank you', ''), null)
  assert.deepEqual(prayerBody('write', '  Thank   you  ', 'church'), { text: 'Thank you', notice: true, venue: 'church' })
  assert.equal(prayerBody('write', 'x'.repeat(PRAY_MAX + 50), '')!.text.length, PRAY_MAX)
})
test('sending needs the writing step, enough words, a prayer left and no request in flight', () => {
  assert.equal(canSend('notice', 'Thank you', 3, false), false)
  assert.equal(canSend('write', 'hi', 3, false), false)
  assert.equal(canSend('write', 'Thank you', 0, false), false)
  assert.equal(canSend('write', 'Thank you', 3, true), false)
  assert.equal(canSend('write', 'Thank you', 3, false), true)
})
test('every place of worship offers it alike', () => {
  assert.equal(isWorship('worship'), true)
  assert.equal(isWorship('shrine'), true)
  assert.equal(isWorship('market'), false)
  assert.equal(isWorship(undefined), false)
})
