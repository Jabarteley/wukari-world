// The phone side of opt-in birthdays.
import assert from 'node:assert/strict'
import test from 'node:test'
import { dateWords, daysIn, friendsLine, greeting, readBirthday } from './birthdayModel.ts'

test('an answer is read defensively', () => {
  assert.equal(readBirthday(null), null)
  assert.deepEqual(readBirthday({ mine: null, today: false, friends: [] }), { mine: null, today: false, friends: [] })
  assert.deepEqual(readBirthday({ mine: { m: 10, d: 15, share: true }, today: true, friends: ['Ada', 4, ''] }), { mine: { m: 10, d: 15, share: true }, today: true, friends: ['Ada'] })
  assert.deepEqual(readBirthday({ mine: { m: 2, d: 30 }, today: true, friends: [] }), { mine: null, today: false, friends: [] }, 'a date that does not exist is not a birthday')
  assert.equal(readBirthday({ mine: { m: 2, d: 29 }, today: false, friends: [] })?.mine?.d, 29)
})
test('days and words', () => {
  assert.equal(daysIn(2).length, 29); assert.equal(daysIn(4).length, 30); assert.equal(daysIn(12).length, 31); assert.deepEqual(daysIn(13), [])
  assert.equal(dateWords(10, 15), '15 October')
  assert.equal(greeting({ mine: { m: 1, d: 1, share: false }, today: true, friends: [] }).startsWith('Happy birthday'), true)
  assert.equal(greeting({ mine: null, today: false, friends: [] }), '')
  assert.equal(friendsLine([]), '')
  assert.match(friendsLine(['Ada']), /^It is Ada's birthday today/)
  assert.match(friendsLine(['Ada', 'Bola', 'Chi']), /^It is the birthday of Ada, Bola and Chi today/)
})
