import assert from 'node:assert/strict'
import { test } from 'node:test'
import { accountsPerDay, fillTone, returning, shortDate, sizeTone, tileChange, attentionOf, trendOf } from './dashboardModel.ts'
import type { DayRow } from './dashboardModel.ts'

const row = (accounts: number | null, over: Partial<DayRow> = {}): DayRow => ({ day: 1, date: '2026-10-06', new: 0, seen: 0, sessions: 0, funnel: {}, daily: accounts === null ? null : { accounts }, ...over })
test('new accounts a day come from the growth of the count between measured days', () => {
  assert.deepEqual(accountsPerDay([row(10), row(14), row(null), row(20), row(19)]), [null, 4, null, null, null])
})
test('dates, changes, returning players and the colour of a fill', () => {
  assert.equal(shortDate('2026-10-06'), '6 Oct'); assert.equal(shortDate('2026-01-31'), '31 Jan')
  assert.equal(tileChange([3, 5]), '+2 (+67%) vs yesterday'); assert.equal(tileChange([5]), null); assert.equal(tileChange([null, 4]), null)
  assert.equal(returning(40, 12), 28); assert.equal(returning(5, 9), 0)
  assert.deepEqual([fillTone(10, 100), fillTone(70, 100), fillTone(95, 100), fillTone(5, 0)], ['ok', 'warn', 'bad', 'ok'])
  assert.deepEqual([sizeTone(1000), sizeTone(2_500_000), sizeTone(9_000_000)], ['ok', 'warn', 'bad'])
})

test('today against yesterday reads as a direction and words, never colour alone', () => {
  assert.deepEqual(trendOf(5, 3), { dir: 'up', text: '+2 (+67%) vs yesterday' })
  assert.deepEqual(trendOf(1, 3), { dir: 'down', text: '−2 (−67%) vs yesterday' })
  assert.deepEqual(trendOf(4, 4), { dir: 'flat', text: 'same as yesterday' })
  assert.deepEqual(trendOf(4, 0), { dir: 'up', text: '+4 vs yesterday' })
  assert.equal(trendOf(4, null).dir, 'none')
})

test('the attention list names what needs an admin and where to go, and is empty when all is calm', () => {
  const calm = { reports: 0, problems: 0, sessions: { held: 10, most: 100 }, sockets: { open: 1, most: 100 }, tests: 0, emailOff: false, pushOff: false }
  assert.deepEqual(attentionOf(calm), [])
  const busy = attentionOf({ ...calm, reports: 2, sessions: { held: 95, most: 100 }, tests: 8800, emailOff: true })
  assert.deepEqual(busy.map((item) => [item.id, item.tone, item.view]), [['reports', 'warn', 'moderation'], ['sessions', 'bad', 'world'], ['tests', 'info', 'players'], ['email', 'info', 'world']])
  assert.equal(busy[0]?.text, '2 player reports waiting for a decision')
  assert.equal(busy[2]?.filter, 'test')
})
