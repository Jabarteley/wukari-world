import assert from 'node:assert/strict'
import { test } from 'node:test'
import { LIGHT_FPS, LIGHT_KEY, LIGHT_TIER, lightFps, lightOn, readLight } from './lightMode.ts'
import { forgetLight, lightChosen, onLightChange, setLight } from './lightControl.ts'
import { HIGH_TIER, PHONE_TIER, renderTier } from './scene/look.ts'

const saved = (value: string | null) => ({ getItem: (key: string) => (key === LIGHT_KEY ? value : null) })
/** A window with a saved choice (or none) and the browser's save-data ask. */
const win = (value: string | null, saveData?: boolean) => ({ localStorage: saved(value), navigator: { connection: { saveData } } })

test('light mode starts on only when the browser asks to save data', () => {
  assert.equal(readLight({ navigator: { connection: { saveData: true } } }), true, 'no storage at all')
  assert.equal(readLight(win(null, true)), true)
  assert.equal(readLight(win(null, false)), false)
  assert.equal(readLight(win(null)), false)
  assert.equal(readLight({ navigator: {} }), false)
  assert.equal(readLight({}), false)
})

test("the player's own choice wins over the default, either way", () => {
  assert.equal(readLight(win('0', true)), false)
  assert.equal(readLight(win('1', false)), true)
  assert.equal(readLight(win('garbage', true)), true, 'a damaged value is no choice')
  assert.equal(lightChosen(saved('1')), true)
  assert.equal(lightChosen(saved('0')), true)
  assert.equal(lightChosen(saved(null)), false)
  const blocked = { localStorage: { getItem: () => { throw new Error('blocked') } }, navigator: { connection: { saveData: true } } }
  assert.equal(readLight(blocked), true, 'blocked storage falls back to the default')
})

test('the frame cap is 30 with light mode on and none otherwise', () => {
  assert.equal(LIGHT_FPS, 30)
  setLight(true); assert.equal(lightFps(), 30)
  setLight(false); assert.equal(lightFps(), 0)
  forgetLight()
})

test('setLight is remembered for this tab, tells listeners, and says when it could not be saved', () => {
  forgetLight()
  assert.equal(lightOn(), false, 'no storage, no save-data ask: off')
  let told = 0
  const stop = onLightChange(() => { told += 1 })
  assert.equal(setLight(true), false, 'there is no storage in this test, so it cannot be kept')
  assert.equal(lightOn(), true)
  assert.equal(lightFps(), LIGHT_FPS)
  assert.equal(told, 1)
  stop()
  setLight(false)
  assert.equal(told, 1)
  assert.equal(lightFps(), 0)
  forgetLight()
})

test('light mode picks the lowest render tier, on any device', () => {
  const desktop = { matchMedia: () => ({ matches: false }) as MediaQueryList, innerWidth: 1400, innerHeight: 900, devicePixelRatio: 2 }
  assert.equal(renderTier(desktop), HIGH_TIER)
  assert.equal(renderTier({ ...desktop, localStorage: { getItem: () => '1' } as unknown as Storage }), LIGHT_TIER)
  assert.equal(renderTier({ ...desktop, localStorage: { getItem: () => '0' } as unknown as Storage }), HIGH_TIER)
  const phone = { matchMedia: () => ({ matches: true }) as MediaQueryList, innerWidth: 390, innerHeight: 844, devicePixelRatio: 3 }
  assert.equal(renderTier(phone), PHONE_TIER)
  assert.equal(renderTier({ ...phone, navigator: { connection: { saveData: true } } } as never), LIGHT_TIER, 'save-data turns it on without a saved choice')
  assert.equal(renderTier({ ...phone, navigator: { connection: { saveData: true } }, localStorage: { getItem: () => '0' } } as never), PHONE_TIER, 'and a saved Off wins')
  assert.ok(LIGHT_TIER.pixelRatio < PHONE_TIER.pixelRatio && LIGHT_TIER.shadowMap < PHONE_TIER.shadowMap)
  assert.equal(renderTier({ ...desktop, location: { search: '?quality=high' }, localStorage: { getItem: () => '1' } } as never), HIGH_TIER, '?quality= still forces a tier')
})
