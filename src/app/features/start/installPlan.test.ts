// The install bar's decision (installPlan.ts) and the held browser offer (installEvent.ts): pure, no browser.
import test from 'node:test'
import assert from 'node:assert/strict'
import { installPlan, isIos } from './installPlan.ts'
import { heldInstallOffer, holdInstallOffer } from './installEvent.ts'

const base = { standalone: false, ios: false, hasOffer: false, asked: false }

test('the bar is offered once, where the device can install, and never inside the installed app', () => {
  assert.equal(installPlan({ ...base, hasOffer: true }), 'prompt')
  assert.equal(installPlan({ ...base, ios: true }), 'ios')
  assert.equal(installPlan({ ...base, ios: true, hasOffer: true }), 'prompt', 'a browser that gave an offer uses it')
  assert.equal(installPlan(base), null, 'no offer and not an iPhone: nothing to offer')
  for (const blocked of [{ standalone: true }, { asked: true }]) { assert.equal(installPlan({ ...base, hasOffer: true, ...blocked }), null); assert.equal(installPlan({ ...base, ios: true, ...blocked }), null) }
})

test('iPhones and iPads in a real browser are iOS; a browser inside another app is not', () => {
  const safari = 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.5 Mobile/15E148 Safari/604.1'
  const instagram = 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Mobile/15E148 Instagram 330.0'
  const ipadDesktop = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.5 Safari/605.1.15'
  const android = 'Mozilla/5.0 (Linux; Android 14; Pixel 7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0 Mobile Safari/537.36'
  assert.deepEqual([isIos(safari, 5), isIos(instagram, 5), isIos(ipadDesktop, 5), isIos(ipadDesktop, 0), isIos(android, 5)], [true, false, true, false, false])
})

test('the offer is kept from the page start, and the browser\'s own bar is held back', () => {
  const listeners = new Map<string, (event: Event) => void>()
  holdInstallOffer({ addEventListener: (type: string, listener: unknown) => { listeners.set(type, listener as (event: Event) => void) } })
  assert.deepEqual([[...listeners.keys()], heldInstallOffer()], [['beforeinstallprompt'], null])
  let prevented = 0
  const offer = { preventDefault: () => { prevented += 1 } } as unknown as Event
  listeners.get('beforeinstallprompt')?.(offer)
  assert.deepEqual([prevented, heldInstallOffer() === (offer as unknown)], [1, true])
})
