import assert from 'node:assert/strict'
import { test } from 'node:test'
import { lagosDayStart } from '../../../game/clock.ts'
import { compactMoney } from '../../ui/format.ts'
import { dayHeading, dayTotals, groupLedger, lineIcon, percentOf, weekFlow } from './ledgerModel.ts'

const at = (day: number, hour = 12): number => lagosDayStart(day) + hour * 3600000
const DAY = 20000

test('compactMoney keeps small amounts exact and rounds big ones down', () => {
  assert.equal(compactMoney(850), '₦850')
  assert.equal(compactMoney(1200), '₦1.2k')
  assert.equal(compactMoney(1000), '₦1k')
  assert.equal(compactMoney(34999), '₦34k')
  assert.equal(compactMoney(3_450_000), '₦3.4m')
  assert.equal(compactMoney(1_100_000_000), '₦1.1b')
  assert.equal(compactMoney(-2500), '−₦2.5k')
  assert.equal(compactMoney('nope'), '₦0')
})

test('lines get a mark for what they were for, else a plain in or out', () => {
  assert.equal(lineIcon('Rent for Yaba flat', -4600), 'home')
  assert.equal(lineIcon('Loan repayment (paid early)', -2000), 'handshake')
  assert.equal(lineIcon('Danfo to Freedom Park', -300), 'bus')
  assert.equal(lineIcon('Welcome gift', 5000), 'gift')
  assert.equal(lineIcon('Mystery', -5), 'spend')
  assert.equal(lineIcon('Mystery', 5), 'earn')
})

test('the ledger is grouped by Lagos day, newest first, with day totals', () => {
  const ledger = [
    { at: at(DAY), amount: -300, reason: 'Danfo', balance: 700 },
    { at: at(DAY, 8), amount: 1000, reason: 'Wage', balance: 1000 },
    { at: at(DAY - 1), amount: -50, reason: 'Snack', balance: 0 },
  ]
  const groups = groupLedger(ledger, at(DAY, 15))
  assert.deepEqual(groups.map((g) => [g.label, g.in, g.out, g.net, g.lines.length]), [['Today', 1000, 300, 700, 2], ['Yesterday', 0, 50, -50, 1]])
  assert.equal(dayTotals(groups[0]!), '+₦1k · −₦300')
  assert.equal(dayHeading(DAY - 5, DAY).includes(' '), true)
  assert.deepEqual(groupLedger([], 1), [])
})

test('the week summary covers today and the six days before it', () => {
  const ledger = [
    { at: at(DAY), amount: 500, reason: 'a', balance: 1 },
    { at: at(DAY - 6), amount: -200, reason: 'b', balance: 1 },
    { at: at(DAY - 7), amount: 9999, reason: 'too old', balance: 1 },
  ]
  assert.deepEqual(weekFlow(ledger, at(DAY)), { in: 500, out: 200, net: 300 })
})

test('percentOf stays inside 0 to 100', () => {
  assert.equal(percentOf(50, 200), 25)
  assert.equal(percentOf(300, 200), 100)
  assert.equal(percentOf(-5, 200), 0)
  assert.equal(percentOf(5, 0), 0)
})
