import test from 'node:test'
import assert from 'node:assert/strict'
import { MusicDirector } from './director.ts'
import { FakeContext, FakeGain } from '../fakeAudio.ts'
import { SOUND_DEFAULTS } from '../settings.ts'
function rig() {
  const ctx = new FakeContext(), settings = { ...SOUND_DEFAULTS }
  let tick = () => undefined
  let stopped = 0, speaking = false
  const director = new MusicDirector(ctx as unknown as AudioContext, {
    settings: () => settings, speaking: () => speaking,
    every: run => { tick = () => { run(); return undefined }; return () => { stopped++ } },
  })
  return { ctx, settings, director, tick: () => tick(), stops: () => stopped, speak: (on: boolean) => { speaking = on } }
}
test('music starts only while running and allowed, and releases its timer when hidden/off', () => {
  const r = rig()
  r.ctx.state = 'suspended'; r.director.refresh()
  assert.equal(r.ctx.sources.length, 0)
  r.ctx.state = 'running'; r.director.refresh()
  assert.ok(r.ctx.sources.length > 0)
  r.director.setHidden(true)
  assert.equal(r.stops(), 1)
  const count = r.ctx.sources.length; r.tick()
  assert.equal(r.ctx.sources.length, count)
  r.settings.musicOn = false; r.director.setHidden(false)
  assert.equal(r.ctx.sources.length, count)
  r.director.dispose()
  assert.equal(r.ctx.gains[0]?.disconnected, true)
})
test('music ducks for interfaces, voices, games and calls, then recovers', () => {
  const r = rig(); r.director.refresh()
  const bus = r.ctx.gains[0]
  assert.ok(bus instanceof FakeGain)
  const normal = bus.gain.value
  r.director.duck(2); assert.ok(bus.gain.value < normal)
  r.ctx.currentTime = 3; r.tick(); assert.equal(bus.gain.value, normal)
  r.director.setCall(true); assert.ok(bus.gain.value <= normal * .13)
  r.director.setCall(false); assert.equal(bus.gain.value, normal)
  r.director.game(); assert.ok(bus.gain.value < normal)
  r.ctx.currentTime = 12; r.tick(); assert.equal(bus.gain.value, normal)
  r.speak(true); r.ctx.currentTime = 40; r.tick(); assert.ok(bus.gain.value < normal)
  r.speak(false); r.tick(); assert.equal(bus.gain.value, normal)
  r.director.dispose()
})
test('context transitions schedule the outgoing fade on its bar boundary, venue audio yields', () => {
  const r = rig(); r.director.refresh(); r.ctx.currentTime = .3
  r.director.setContext('venue')
  const initial = r.ctx.sources.length
  r.tick(); assert.equal(r.ctx.sources.length, initial)
  for (let t = .4; t < 5; t += .05) { r.ctx.currentTime = t; r.tick() }
  const fades = r.ctx.gains.flatMap(gain => gain.gain.calls).filter(call => call[0] === 'lin' && call[1] === 0)
  assert.ok(fades.length > 0)
  const quietCount = r.ctx.sources.length
  r.ctx.currentTime = 8; r.tick(); assert.equal(r.ctx.sources.length, quietCount)
  r.director.dispose()
})


test('music-off fades scheduled notes before releasing them and rapid toggles leave one scheduler', async () => {
  const r = rig(); r.director.refresh()
  const scheduled = r.ctx.sources.length
  r.settings.musicOn = false; r.director.refresh()
  assert.equal(r.stops(), 1)
  assert.ok(r.ctx.gains.some(gain => gain.gain.calls.some(call => call[0] === 'lin' && call[1] === 0 && call[2] === .035)))
  r.ctx.currentTime = 1; r.tick(); assert.equal(r.ctx.sources.length, scheduled)
  await new Promise(resolve => setTimeout(resolve, 60))
  assert.ok(r.ctx.gains.some(gain => gain.disconnected))
  r.settings.musicOn = true; r.director.refresh(); r.director.refresh()
  r.director.setHidden(true); assert.equal(r.stops(), 2)
  r.director.dispose()
})
