import assert from 'node:assert/strict'
import { test } from 'node:test'
import { accountsPerDay, activationCell, campaignRows, day7Cell, fillTone, returning, shortDate, sizeTone, tileChange, attentionOf, trendOf } from './dashboardModel.ts'
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

test('campaign rows put activation and day-7 return side by side, with the sample size and "not yet observed" for young cohorts', () => {
  const cell = (lives: number, returned: number) => ({ lives, returned, rate: lives ? Math.round((returned / lives) * 1000) / 10 : null })
  const zero = cell(0, 0)
  const rows = campaignRows(
    [{ source: 'tiktok', medium: 'paid', campaign: 'visit-home', landed: 400, activated: 52, rate: 13 }, { source: 'direct', medium: 'direct', campaign: 'direct', landed: 90, activated: 9, rate: 10 }, { source: 'ig', medium: 'paid', campaign: 'new', landed: 12, activated: 3, rate: 25 }],
    { bySource: [{ source: 'tiktok', medium: 'paid', campaign: 'visit-home', d1: zero, d7: cell(40, 10), d30: zero }, { source: 'ig', medium: 'paid', campaign: 'new', d1: zero, d7: zero, d30: zero }, { source: 'old', medium: 'ref', campaign: 'x', d1: zero, d7: cell(5, 1), d30: zero }] },
  )
  assert.deepEqual(rows.map((row) => row.label), ['tiktok / paid / visit-home', 'direct / direct / direct', 'ig / paid / new', 'old / ref / x'])
  assert.equal(rows[0]?.activation, '13% (52 of 400 landed)'); assert.equal(rows[0]?.day7, '25% (10 of 40)'); assert.equal(rows[0]?.observed, 40)
  assert.equal(rows[1]?.day7, 'not yet observed', 'no life of this campaign has reached day 7 yet')
  assert.equal(rows[2]?.activation, '25% (3 of 12 landed), small sample'); assert.equal(rows[2]?.day7, 'not yet observed')
  assert.equal(rows[3]?.activation, 'no landings yet'); assert.equal(rows[3]?.day7, '20% (1 of 5), small sample')
  assert.equal(activationCell({ landed: 0, activated: 2, rate: null }), '2 activated, no landings counted')
  assert.equal(day7Cell(undefined), 'not yet observed')
  assert.deepEqual(campaignRows(undefined, undefined), [])
})
