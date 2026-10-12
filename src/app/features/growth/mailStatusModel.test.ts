import assert from 'node:assert/strict'
import test from 'node:test'
import { mailRowKind, mailStatus, sentDate } from './mailStatusModel.ts'
import { TOUCH_OFFER_KEY, offerDue, owe, owed, settle } from './touchOfferModel.ts'
import type { OfferFacts } from './touchOfferModel.ts'

const comeback = { source: null, on: false, pausedUntil: 0, types: { needs: false, friends: false, milestones: false, events: false, away: false, week: false }, nudged: {}, lastSent: 0 }

test('the mail rows: on or off, the address state, and the date only; nothing until the server has answered', () => {
  assert.equal(mailStatus(null), null)
  assert.deepEqual(mailStatus({ email: null, comeback }), { character: 'Off', address: 'None yet', last: 'none yet' })
  assert.deepEqual(mailStatus({ email: { address: 'a***@x.com', confirmed: false, preview: null }, comeback: { ...comeback, on: true } }), { character: 'On', address: 'Waiting for confirmation', last: 'none yet' })
  assert.equal(mailStatus({ email: { address: 'a***@x.com', confirmed: true, preview: null }, comeback })?.address, 'Confirmed')
  assert.equal(sentDate(Date.UTC(2026, 9, 12, 8, 30)), '12 Oct 2026')
  assert.equal(sentDate(0), 'none yet'); assert.equal(sentDate(Number.NaN), 'none yet')
})

test('the rows are for a signed-in player; a guest on a server with accounts gets one line; accounts off, nothing', () => {
  assert.equal(mailRowKind({ loaded: true, enabled: true, account: {} }), 'row')
  assert.equal(mailRowKind({ loaded: true, enabled: false, account: {} }), 'row', 'a sign-in that outlives the switch is still shown its mail')
  assert.equal(mailRowKind({ loaded: true, enabled: true, account: null }), 'guest')
  assert.equal(mailRowKind({ loaded: true, enabled: false, account: null }), 'none')
  assert.equal(mailRowKind({ loaded: false, enabled: false, account: null }), 'none')
})

const ready: OfferFacts = { owed: true, signedIn: true, connected: true, creating: false, tour: false, busy: false, venue: true }
test('the Stay in touch offer: owed once after sign-up, only to a signed-in player with nothing in front, and gone once answered', () => {
  assert.equal(offerDue(ready), true)
  for (const over of [{ owed: false }, { signedIn: false }, { connected: false }, { creating: true }, { tour: true }, { busy: true }, { venue: false }]) assert.equal(offerDue({ ...ready, ...over }), false, JSON.stringify(over))
  const kept = new Map<string, string>()
  const storage = { getItem: (key: string) => kept.get(key) ?? null, setItem: (key: string, value: string) => { kept.set(key, value) }, removeItem: (key: string) => { kept.delete(key) } }
  assert.equal(owed(storage), false)
  owe(storage); assert.equal(kept.get(TOUCH_OFFER_KEY), 'owed'); assert.equal(owed(storage), true)
  settle(storage); assert.equal(owed(storage), false)
  const broken = { getItem: () => { throw new Error('no') }, setItem: () => { throw new Error('no') }, removeItem: () => { throw new Error('no') } }
  owe(broken); settle(broken); assert.equal(owed(broken), false); assert.equal(owed(null), false)
})
