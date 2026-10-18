import assert from 'node:assert/strict'
import test from 'node:test'
import { naira, offerFromInput, verdictText } from './signatureModel.ts'

test('practice offers accept whole game-currency amounts only', () => {
  assert.equal(offerFromInput('1,850'), 1850)
  assert.equal(offerFromInput('0'), 0)
  for (const value of ['', '-10', '18.5', '₦1,850', '1000000001']) assert.equal(offerFromInput(value), null)
})

test('bargain copy distinguishes counters, refusals, agreements and final asks', () => {
  const item = { label: 'Practice basket', list: 2000, ask: 1850, rounds: 1, deal: null }
  assert.equal(naira(1850), '₦1,850')
  assert.match(verdictText({ item, verdict: { kind: 'counter', price: 1850 } }), /Counteroffer/)
  assert.match(verdictText({ item, verdict: { kind: 'refuse', price: 2000 } }), /refused/)
  assert.match(verdictText({ item: { ...item, deal: 1850 }, verdict: { kind: 'accept', price: 1850 } }), /practice quote only/)
  assert.match(verdictText({ item, verdict: { kind: 'final', price: 1900 } }), /Final practice price/)
})
