import assert from 'node:assert/strict'
import { test } from 'node:test'
import { LIGHT_FPS, LIGHT_KEY, lightFps, lightOn, readLight } from './lightMode.ts'
import { forgetLight, lightChosen, onLightChange, setLight } from './lightControl.ts'
import { HIGH_TIER, LIGHT_TIER, PHONE_TIER, renderTier } from './scene/look.ts'
import { readSound, SOUND_DEFAULTS } from './audio/settings.ts'

const saved = (value: string | null) => ({ getItem: (key: string) => (key === LIGHT_KEY ? value : null) })

test('light mode starts on only when the browser asks to save data', () => {
  assert.equal(readLight(null, { saveData: true }), true)
  assert.equal(readLight(saved(null), { saveData: true }), true)
  assert.equal(readLight(saved(null), { saveData: false }), false)
  assert.equal(readLight(saved(null), {}), false)
  assert.equal(readLight(saved(null), null), false)
  assert.equal(readLight(saved(null), undefined), false)
})

test("the player's own choice wins over the default, either way", () => {
  assert.equal(readLight(saved('0'), { saveData: true }), false)
  assert.equal(readLight(saved('1'), { saveData: false }), true)
  assert.equal(readLight(saved('garbage'), { saveData: true }), true, 'a damaged value is no choice')
  assert.equal(lightChosen(saved('1')), true)
  assert.equal(lightChosen(saved('0')), true)
  assert.equal(lightChosen(saved(null)), false)
  assert.equal(readLight({ getItem: () => { throw new Error('blocked') } }, { saveData: true }), true, 'blocked storage falls back to the default')
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

test('light mode starts the music off on a device that has not chosen, and a saved choice still wins', () => {
  assert.equal(readSound(null, true).musicOn, false)
  assert.equal(readSound(null, false).musicOn, SOUND_DEFAULTS.musicOn)
  assert.equal(readSound({ getItem: () => JSON.stringify({ musicOn: true }) }, true).musicOn, true)
})
