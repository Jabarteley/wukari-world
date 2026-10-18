// The chat kept on the phone (agentContacts.ts): reading stored values back, adding lines, the rows the chat screen draws, contacts.
import assert from 'node:assert/strict'
import { test } from 'node:test'
import { addLine, chatRows, filterAgentChats, historyOf, readChats, readContacts, recentChats, toggleContact, CHATS_MAX, LINES_MAX } from './agentContacts.ts'
import type { Chat, ChatLine } from './agentContacts.ts'

const who = { id: 'resident.lagos.tunji', name: 'Tunji Bello', city: 'lagos' }
const at = (hours: number, minutes = 0): number => new Date(2026, 9, 18, hours, minutes).getTime()
const line = (me: boolean, text: string, when: number, note?: true): ChatLine => ({ me, text, at: when, ...(note ? { note } : {}) })

test('stored chats and contacts are read back only in the right shape, within the limits', () => {
  assert.deepEqual(readChats(null), {})
  assert.deepEqual(readChats('not json'), {})
  const many = { lines: Array.from({ length: LINES_MAX + 5 }, (_, n) => line(n % 2 === 0, `line ${n}`, at(9, n))) }
  const chats = readChats(JSON.stringify({ [who.id]: { ...who, at: at(10), ...many }, bad: { name: '', city: 'lagos', at: 1, lines: [] }, [`${who.id}.2`]: { ...who, at: at(10), lines: [{ me: true, text: 'ok', at: at(9) }, { text: 42 }, 'x'] } }))
  assert.equal(chats[who.id]?.lines.length, LINES_MAX, 'the newest lines are kept')
  assert.equal(chats[who.id]?.lines[0]?.text, 'line 5')
  assert.equal(chats.bad, undefined)
  assert.deepEqual(chats[`${who.id}.2`]?.lines, [{ me: true, text: 'ok', at: at(9) }], 'malformed lines are dropped')
  assert.deepEqual(readContacts('[1, {"id":"house.lagos.remi","name":"Remi","city":"lagos","at":5}]'), [{ id: 'house.lagos.remi', name: 'Remi', city: 'lagos', at: 5 }])
})

test('a line is added to its chat; the oldest chats go beyond the limit; the history is the last few lines without the game\'s notes', () => {
  let chats: Record<string, Chat> = {}
  for (let n = 0; n < CHATS_MAX + 2; n += 1) chats = addLine(chats, { id: `resident.lagos.p${n}`, name: `P${n}`, city: 'lagos' }, line(true, 'hello', at(8, n)))
  assert.equal(Object.keys(chats).length, CHATS_MAX)
  assert.equal(chats['resident.lagos.p0'], undefined, 'the oldest chat was dropped')
  chats = addLine(chats, who, line(true, 'How far?', at(12)))
  chats = addLine(chats, who, line(false, 'Tunji is asleep now.', at(12, 1), true))
  chats = addLine(chats, who, line(false, 'I dey o', at(12, 2)))
  assert.deepEqual(historyOf(chats[who.id]), [{ me: true, text: 'How far?' }, { me: false, text: 'I dey o' }])
  assert.equal(recentChats(chats)[0]?.id, who.id, 'the chat written to last comes first')
  assert.deepEqual(filterAgentChats(recentChats(chats), 'tun').map((chat) => chat.id), [who.id])
})

test('the rows of a chat: a day label, lines in runs with the time on the last, then what is still being sent', () => {
  const now = at(20)
  const lines = [line(true, 'Hi', at(9)), line(true, 'You there?', at(9, 2)), line(false, 'Yes o', at(9, 3)), line(false, 'Come to the park', at(9, 5)), line(false, 'Asleep now.', at(9, 21), true)]
  const rows = chatRows(lines, [{ id: 'a', text: 'Coming', status: 'sending' }], now)
  assert.deepEqual(rows.map((row) => row.kind), ['day', 'line', 'line', 'line', 'line', 'line', 'out'])
  assert.equal(rows[0]?.kind === 'day' && rows[0].label, 'Today')
  assert.deepEqual(rows.filter((row) => row.kind === 'line').map((row) => row.kind === 'line' && row.tail), [false, true, false, true, true], 'one run from me, one from them, then the note')
  const yesterday = chatRows([line(true, 'Hi', at(9) - 86400000)], [{ id: 'b', text: 'Still there?', status: 'failed', reason: 'offline' }], now)
  assert.deepEqual(yesterday.map((row) => row.kind), ['day', 'line', 'day', 'out'], 'a line sent today after yesterday\'s gets today\'s label')
})

test('a contact is kept or dropped with a tap, newest first', () => {
  const kept = toggleContact([], who, 5)
  assert.deepEqual(kept, [{ ...who, at: 5 }])
  assert.deepEqual(toggleContact(kept, who, 6), [])
  assert.equal(toggleContact(kept, { id: 'house.lagos.remi', name: 'Remi', city: 'lagos' }, 7)[0]?.id, 'house.lagos.remi')
})
