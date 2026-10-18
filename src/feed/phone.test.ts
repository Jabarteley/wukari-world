import test from 'node:test'
import assert from 'node:assert/strict'
import { numbersInText, numbersInVcf, phoneHash, toE164 } from './phone.ts'

test('phone: local, international and messy numbers become E.164; junk is refused', async () => {
  for (const raw of ['0803 123 4567', '+234 803 123 4567', '2348031234567', '00234-803-123-4567', '(0803) 123-4567']) assert.equal(toE164(raw), '+2348031234567', raw)
  assert.equal(toE164('0244 123 456', 'GH'), '+233244123456')
  assert.equal(toE164('+44 7700 900123'), '+447700900123')
  for (const raw of ['', 'abc', '12', '+0123456789']) assert.equal(toE164(raw), null, raw)
  assert.match(await phoneHash('+2348031234567'), /^[0-9a-f]{32}$/)
  assert.equal(await phoneHash('+2348031234567'), await phoneHash('+2348031234567'))
  assert.deepEqual(numbersInVcf('BEGIN:VCARD\nFN:Ada\nTEL;TYPE=CELL:+234 803 123 4567\nTEL:0805 000 1111\nEND:VCARD'), ['+234 803 123 4567', '0805 000 1111'])
  assert.deepEqual(numbersInText('0803 123 4567, 0805 000 1111\nhello'), ['0803 123 4567', '0805 000 1111'])
})
