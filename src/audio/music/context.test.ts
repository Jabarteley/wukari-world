import test from 'node:test'
import assert from 'node:assert/strict'
import { musicContext, nextBar } from './context.ts'
import { SOUND_DEFAULTS, readSound, SOUND_KEY } from '../settings.ts'
import { levelFor } from '../levels.ts'
import type { Seen } from '../director.ts'
const seen: Seen = { life: 'one', city: 'lagos', location: 'home', mode: 'venue', act: null, tags: [], raining: false, ledger: [], now: Date.UTC(2026, 9, 12, 11) }
test('contexts respect venue music before rain and night, and cover entry, home, map and shops', () => {
  assert.equal(musicContext(null, '', ''), 'creator')
  assert.equal(musicContext({ ...seen, mode: 'creator' }, 'home', ''), 'creator')
  assert.equal(musicContext(seen, '', ''), 'home')
  assert.equal(musicContext({ ...seen, mode: 'shop' }, 'home', ''), 'shop')
  assert.equal(musicContext({ ...seen, mode: 'shop' }, 'club', ''), 'venue')
  assert.equal(musicContext({ ...seen, raining: true }, 'bar', ''), 'venue')
  assert.equal(musicContext({ ...seen, raining: true }, '', 'church'), 'venue')
  assert.equal(musicContext(seen, 'worship', 'fct-church'), 'venue')
  assert.equal(musicContext({ ...seen, mode: 'map' }, 'club', ''), 'map')
  assert.equal(musicContext({ ...seen, location: 'fashion' }, 'boutique', ''), 'shop')
  assert.equal(musicContext({ ...seen, now: Date.UTC(2026, 9, 12, 22) }, '', ''), 'night')
})
test('transition times align to the outgoing song bar, never before the requested time', () => {
  for (const tempo of [76, 96, 120]) for (const now of [0, 0.13, 1, 7, 19]) {
    const at = nextBar(now, 0, tempo)
    assert.ok(at >= now)
    assert.ok(Math.abs(at / (240 / tempo) - Math.round(at / (240 / tempo))) < 1e-8)
  }
})
test('old saved settings gain music defaults, separate volume persists, quiet and mute lower music', () => {
  const read = (value: unknown) => readSound({ getItem: key => key === SOUND_KEY ? JSON.stringify(value) : null })
  assert.equal(read({ master: 0.5 }).musicOn, true)
  assert.equal(read({ music: 0.2, musicOn: false }).music, 0.2)
  assert.equal(read({ music: -1 }).music, SOUND_DEFAULTS.music)
  assert.equal(levelFor({ ...SOUND_DEFAULTS, musicOn: false }, 'music'), 0)
  assert.equal(levelFor({ ...SOUND_DEFAULTS, on: false }, 'music'), 0)
  assert.ok(levelFor({ ...SOUND_DEFAULTS, quiet: true }, 'music') < levelFor(SOUND_DEFAULTS, 'music'))
})
