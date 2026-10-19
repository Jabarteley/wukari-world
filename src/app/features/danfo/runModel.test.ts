// Drive a danfo in the browser (docs/DANFO.md): which view a device gets, controls, the conductor's moments, the clip frames, the card.
import test from 'node:test'
import assert from 'node:assert/strict'
import { CLIP_FPS, CLIP_SECONDS, KEEP_LEFT, NO_KEYS, PAINT, cardWords, chooseView, conductorSays, controlsFrom, keepFrame, parkCall, voidWords } from './runModel.ts'
import type { RoadSnapshot } from './runModel.ts'
import { DANFO_ROUTES, VEHICLE_WORDS, routeById } from '../../../danfo/routes.ts'
import { startDrive, stepDrive } from '../../../danfo/drive.ts'
import type { DanfoResult } from '../../../types/danfo.ts'

const lagos = routeById('lagos-ikorodu-road')!

test('the view: 3D where the device and the admin allow it, the 2D lanes on weak devices, without WebGL or when switched off', () => {
  assert.equal(chooseView({ tier: 'full', webgl: true, setting: true, stored: null }), '3d')
  assert.equal(chooseView({ tier: 'lite', webgl: true, setting: true, stored: null }), '3d')
  assert.equal(chooseView({ tier: 'cut', webgl: true, setting: true, stored: null }), 'lanes', 'a weak device drives the lanes')
  assert.equal(chooseView({ tier: 'full', webgl: false, setting: true, stored: '3d' }), 'lanes', '3D needs WebGL')
  assert.equal(chooseView({ tier: 'full', webgl: true, setting: false, stored: '3d' }), 'lanes', 'the admin can switch 3D off')
  assert.equal(chooseView({ tier: 'full', webgl: true, setting: true, stored: 'lanes' }), 'lanes', 'a person\'s own choice wins')
  assert.equal(chooseView({ tier: 'cut', webgl: true, setting: true, stored: '3d' }), '3d')
})

test('controls: steering by screen side, the brake builds up while held', () => {
  assert.deepEqual(controlsFrom(NO_KEYS, 0), { throttle: 0, brake: 0, steer: 0 })
  assert.equal(controlsFrom({ ...NO_KEYS, gas: true }, 0).throttle, 1)
  assert.equal(controlsFrom({ ...NO_KEYS, gas: true, brake: true }, 0).throttle, 0, 'braking cuts the throttle')
  assert.equal(controlsFrom({ ...NO_KEYS, right: true }, 0).steer, 1)
  assert.equal(controlsFrom({ ...NO_KEYS, right: true }, 0, true).steer, -1, 'keeping right, the kerb is on the right')
  const tap = controlsFrom({ ...NO_KEYS, brake: true }, 0).brake, held = controlsFrom({ ...NO_KEYS, brake: true }, 700).brake
  assert.ok(tap < 0.9, 'a tap is not a hard brake')
  assert.equal(held, 1)
  assert.ok(KEEP_LEFT.has('nairobi') && !KEEP_LEFT.has('lagos'))
  for (const line of DANFO_ROUTES) assert.ok(PAINT[line.vehicle] && VEHICLE_WORDS[line.vehicle])
})

test('the game\'s conductor: a line for the moments of the run, the same on every device', () => {
  assert.match(parkCall('lagos', lagos, 'seed'), /Maryland|Obalende/)
  const served = conductorSays('lagos', lagos, { kind: 'served', stop: 1 }, 'seed', 3)
  assert.ok(served && served.length > 0)
  assert.equal(conductorSays('lagos', lagos, { kind: 'served', stop: 1 }, 'seed', 3), served)
  assert.match(conductorSays('lagos', lagos, { kind: 'passed', stop: 2 }, 'seed', 1)!, /Anthony|owa|Driver/i)
  assert.match(conductorSays('lagos', lagos, { kind: 'done' }, 'seed', 1)!, /Obalende/)
})

test('clip frames: only the last seconds are kept, and only what is near the bus', () => {
  const state = startDrive(lagos, 'clip', 0.8), frames: RoadSnapshot[] = []
  for (let step = 0; step < 400; step++) { stepDrive(state, { throttle: 1, brake: 0, steer: 0 }); keepFrame(frames, state) }
  assert.equal(frames.length, CLIP_SECONDS * CLIP_FPS)
  const last = frames.at(-1)!
  assert.equal(last.d, state.d)
  assert.ok(last.cars.every((car) => car.d > state.d - 30 && car.d < state.d + 90))
  assert.ok(last.cars.length < state.cars.length)
})

test('the run-end card: the line, the time, the brag for first place, the sums', () => {
  const result: DanfoResult = { earned: 12400, paid: 12400, fares: 11000, drops: 23, timeBonus: 1100, crewBonus: 600, penalties: 300, hardBrakes: 2, crashes: 1, passed: 0, ms: 201_000, place: 1, capped: false }
  const card = cardWords(result, lagos, 'danfo', (n) => `₦${n}`)
  assert.equal(card.title, 'Ojota – Obalende')
  assert.equal(card.sub, 'Danfo run · 3:21')
  assert.equal(card.brag, 'Best driver on the Ikorodu Road this week')
  assert.deepEqual(card.rows, [['Passengers dropped', '23'], ['Fares', '₦11000'], ['Time bonus', '+₦1100'], ['Crew bonus', '+₦600'], ['Penalties', '-₦300']])
  assert.equal(cardWords({ ...result, place: 4 }, lagos, 'danfo').brag, 'Number 4 on the Ikorodu Road this week')
  assert.equal(cardWords({ ...result, place: 0 }, lagos, 'danfo').brag, null)
  assert.match(voidWords('too_fast'), /faster than a danfo/)
})
