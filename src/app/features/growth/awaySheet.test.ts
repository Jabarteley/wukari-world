// The away sheet and the notification ask: what is included, that nothing private of another player is, that no word is guilt,
// and when the ask may appear.
import assert from 'node:assert/strict'
import { test } from 'node:test'
import { AWAY_SHEET_NEWS, buildAwaySheet } from './awaySheet.ts'
import type { AwaySheetInput } from './awaySheet.ts'
import { NOTIFY_ASK_SNOOZE_MS, NOTIFY_ASK_WORDS, askAnswer, askDue, askHeld, askMoment } from './notifyAsk.ts'
import type { AskState } from './notifyAsk.ts'

const SINCE = 1000
const me = (over: Record<string, unknown> = {}): NonNullable<AwaySheetInput['me']> => ({
  friends: [{ id: 'p1', name: 'Ada Obi' }], requests: { in: [{ id: 'p2', name: 'Bola Ade', at: 5000 }], out: [] },
  conversations: [{ id: 'c1', kind: 'dm', name: 'Ada Obi', unread: 2, last: { seq: 1, from: null, body: 'my pin is 1234, call me at 0803', at: 6000 } }],
  updates: [{ id: 1, kind: 'transfer', text: 'Ada Obi sent you ₦5,000', at: 4000, read: false, data: { from: 'p1', amount: 5000 } }, { id: 2, kind: 'report', text: 'Your report about Zed Q was reviewed', at: 4100, read: false }],
  ...over,
}) as unknown as NonNullable<AwaySheetInput['me']>
const base = (over: Partial<AwaySheetInput> = {}): AwaySheetInput => ({ hoursAway: 9, since: SINCE, me: me(), ...over })
const words = (input: unknown): string => JSON.stringify(input)

test('no sheet before three hours away, or when there is nothing to say', () => {
  assert.equal(buildAwaySheet(base({ hoursAway: 2 })), null)
  assert.equal(buildAwaySheet(base({ me: null })), null)
  assert.equal(buildAwaySheet(base({ me: me({ requests: { in: [], out: [] }, conversations: [], updates: [] }) })), null)
})

test('it gathers city news, people and money, and suggests one next step', () => {
  const sheet = buildAwaySheet(base({
    notices: [{ id: 1, kind: 'gov', text: 'Voting is open', at: 3000 }, { id: 2, kind: 'illness', text: 'You feel unwell', at: 3000 }, { id: 3, kind: 'rent-due', text: 'Rent of ₦6,000 is due on Friday.', at: 3500 }],
    records: [{ n: 7, at: 2000, title: 'A law passed in Lagos.' }, { n: 6, at: 500, title: 'Before you left.' }],
  }))
  assert.ok(sheet)
  assert.deepEqual(sheet.sections.map((section) => section.id), ['city', 'people', 'money'])
  const city = sheet.sections[0]?.lines.map((line) => line.text)
  assert.deepEqual(city, ['Voting is open', 'A law passed in Lagos.'], 'only public things, and only since the player left')
  const people = sheet.sections[1]?.lines.map((line) => line.text)
  assert.deepEqual(people, ['Bola would like to be friends', 'Ada wrote to you', 'Ada sent you a gift'])
  assert.equal(sheet.sections[2]?.lines[0]?.text, 'Rent of ₦6,000 is due on Friday.')
  assert.equal(sheet.next?.app, 'bank', 'something owed comes first')
})

test('nothing private of another player is included: no message text, no amounts, no reports about others', () => {
  const sheet = buildAwaySheet(base({ notices: [{ id: 2, kind: 'illness', text: 'You feel unwell', at: 3000 }] }))
  const text = words(sheet)
  for (const secret of ['pin is', '0803', '5,000', 'Zed', 'unwell', 'Obi', 'Ade']) assert.ok(!text.includes(secret), `leaked ${secret}`)
})

test('news is capped and the rest is counted', () => {
  const records = Array.from({ length: 9 }, (_, index) => ({ n: index, at: 2000 + index, title: `Entry ${index}` }))
  const city = buildAwaySheet(base({ records }))?.sections[0]
  assert.equal(city?.lines.length, AWAY_SHEET_NEWS)
  assert.equal(city?.more, 9 - AWAY_SHEET_NEWS)
})

test('the words are calm: no guilt, no streak, no countdown', () => {
  const sheet = buildAwaySheet(base({ billsDue: 2, claimable: 1, notices: [{ id: 1, kind: 'gov', text: 'Voting is open', at: 3000 }], records: [{ n: 1, at: 2000, title: 'A law passed.' }] }))
  const own = words({ title: sheet?.title, sub: sheet?.sub, next: sheet?.next, sections: sheet?.sections.map((section) => section.title) })
  assert.ok(!/miss|streak|lost|lose|hurry|last chance|expire|running out|don.t leave|come back|countdown|only \d|alone|waiting for you/i.test(own), own)
  assert.match(sheet?.sub ?? '', /Nothing was taken/)
  for (const ask of Object.values(NOTIFY_ASK_WORDS)) assert.ok(!/miss|streak|lost|hurry|last chance|expire|come back/i.test(ask.text))
})

test('with nothing else, a calm default is suggested; a finished mission or an event comes before it', () => {
  assert.equal(buildAwaySheet(base({ me: me({ conversations: [], requests: { in: [], out: [] }, updates: [] }), claimable: 2, notices: [{ id: 1, kind: 'gov', text: 'x', at: 3000 }] }))?.next?.app, 'missions')
  assert.equal(buildAwaySheet(base({ records: [{ n: 1, at: 2000, title: 'x' }], me: null }))?.next?.app, 'missions')
})

// ---- when the ask may appear ---------------------------------------------------------------------------------------------
const ready: AskState = { moment: 'table-win', push: 'ready', held: false, signedIn: true, connected: true, busy: false }

test('a moment needs a rise between two reads; the first read and arriving with wins are not moments', () => {
  assert.equal(askMoment(null, { tablesWon: 5, friends: 9 }), null, 'arrival')
  assert.equal(askMoment({ tablesWon: null, friends: null }, { tablesWon: 5, friends: 9 }), null, 'loading in is not a win')
  assert.equal(askMoment({ tablesWon: 5, friends: 9 }, { tablesWon: 5, friends: 9 }), null)
  assert.equal(askMoment({ tablesWon: 5, friends: 9 }, { tablesWon: 6, friends: 9 }), 'table-win')
  assert.equal(askMoment({ tablesWon: 5, friends: 9 }, { tablesWon: 5, friends: 10 }), 'friend')
  assert.equal(askMoment({ tablesWon: 5, friends: 9 }, { tablesWon: 5, friends: 8 }), null)
})

test('the ask is shown only for a moment, only when the browser can be asked, and never while something else is in front', () => {
  assert.equal(askDue(ready), true)
  assert.equal(askDue({ ...ready, moment: null }), false, 'never on arrival')
  for (const push of ['unsupported', 'needs-install', 'blocked', 'unknown'] as const) assert.equal(askDue({ ...ready, push }), false, push)
  assert.equal(askDue({ ...ready, held: true }), false)
  assert.equal(askDue({ ...ready, signedIn: false }), false)
  assert.equal(askDue({ ...ready, connected: false }), false)
  assert.equal(askDue({ ...ready, busy: true }), false)
})

test('"not now" waits 30 days; taking it up is final', () => {
  const kept = new Map<string, string>(), storage = { getItem: (key: string) => kept.get(key) ?? null, setItem: (key: string, value: string) => { kept.set(key, value) } }
  assert.equal(askHeld(storage, 1000), false)
  askAnswer(storage, 1000, false)
  assert.equal(askHeld(storage, 1000 + NOTIFY_ASK_SNOOZE_MS - 1), true)
  assert.equal(askHeld(storage, 1000 + NOTIFY_ASK_SNOOZE_MS + 1), false)
  askAnswer(storage, 1000, true)
  assert.equal(askHeld(storage, 1000 + 10 * NOTIFY_ASK_SNOOZE_MS), true)
})
