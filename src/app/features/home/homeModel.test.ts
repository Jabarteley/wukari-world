// The one-line summaries on the Houses page's folds, read before a fold is opened.
import assert from 'node:assert/strict'
import { test } from 'node:test'
import { rentLine, upgradeLine } from './homeModel.ts'

const naira = (amount: number): string => `₦${amount.toLocaleString('en')}`

test('the upgrade line names the house now and the next tier with its price, or the top of the ladder', () => {
  const tiers = [{ label: 'Starter', current: false, cost: 0 }, { label: 'Villa', current: true, cost: 900000 }, { label: 'Mansion', current: false, cost: 2400000 }]
  assert.equal(upgradeLine(tiers, naira), 'Villa · next: Mansion for ₦2,400,000')
  assert.equal(upgradeLine(tiers.map((tier) => ({ ...tier, current: tier.label === 'Mansion' })), naira), 'Mansion · top of the ladder')
  assert.equal(upgradeLine([], naira), 'Your house · top of the ladder')
})

test('the rent line: a guest is told to settle in, a saver sees the next step and the percentage, the top is the top', () => {
  assert.equal(rentLine(true, { label: 'Duplex', district: 'Lekki' }, 64), 'Browse homes; settle in to rent one')
  assert.equal(rentLine(false, { label: 'Duplex', district: 'Lekki' }, 64), 'Next step up: Duplex, Lekki · 64% saved')
  assert.equal(rentLine(false, undefined, 100), 'Top of the ladder')
})
