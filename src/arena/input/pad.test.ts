// OWNER: games (real-time) — game controllers with fake pads: the standard mapping, dead zones, the d-pad, remapping, settings.
import test from 'node:test'
import assert from 'node:assert/strict'
import { DEFAULT_DEAD_ZONE, FIGHT_PAD, FOOTBALL_PAD, PADS, RACE_PAD, bindingOf, buttonName, changes, cleanPadSettings, deadZone, defaultPadSettings, firstButtonDown, padName, readPad, remap, resetBinding } from './pad.ts'
import type { PadLike } from './pad.ts'

function pad(down: number[] = [], axes: number[] = [0, 0, 0, 0], values: Record<number, number> = {}): PadLike {
  return { id: 'Test Pad (STANDARD GAMEPAD Vendor: 0001)', index: 0, mapping: 'standard', connected: true, axes, buttons: Array.from({ length: 17 }, (_, n) => ({ pressed: down.includes(n), value: values[n] ?? (down.includes(n) ? 1 : 0) })) }
}
const fight = bindingOf(FIGHT_PAD)

test('the standard mapping: face buttons and shoulders do the game actions', () => {
  assert.deepEqual(readPad(pad([2]), FIGHT_PAD, fight).held, { punch: true, kick: false, jump: false, block: false })
  assert.equal(readPad(pad([0]), FIGHT_PAD, fight).held.jump, true)
  assert.equal(readPad(pad([4]), FIGHT_PAD, fight).held.block, true)
  assert.equal(readPad(pad([7]), RACE_PAD, bindingOf(RACE_PAD)).held.gas, true)
  assert.equal(readPad(pad([], [0, 0, 0, 0], { 6: 0.6 }), RACE_PAD, bindingOf(RACE_PAD)).held.brake, true, 'an analogue trigger past its threshold')
  assert.equal(readPad(pad([], [0, 0, 0, 0], { 6: 0.2 }), RACE_PAD, bindingOf(RACE_PAD)).held.brake, false)
  assert.equal(buttonName(0), 'A'); assert.equal(buttonName(9), 'Start'); assert.equal(buttonName(20), 'Button 21')
  assert.deepEqual(Object.keys(PADS).sort(), ['fight', 'football', 'race'])
})

test('a radial dead zone: a resting stick is still, a full push reaches one, nothing jumps at the edge', () => {
  assert.deepEqual(deadZone(0.1, -0.15), [0, 0])
  const [x, y] = deadZone(1, 0); assert.ok(Math.abs(x - 1) < 1e-9 && y === 0)
  const [nx] = deadZone(DEFAULT_DEAD_ZONE + 0.01, 0); assert.ok(nx > 0 && nx < 0.05)
  const [dx, dy] = deadZone(0.7, 0.7); assert.ok(Math.hypot(dx, dy) <= 1 + 1e-9)
  assert.deepEqual(deadZone(Number.NaN, 0), [0, 0])
})

test('the d-pad moves when the stick rests; the stick wins when pushed', () => {
  assert.deepEqual(readPad(pad([14]), FIGHT_PAD, fight).stick, [-1, 0])
  const diag = readPad(pad([12, 15]), FOOTBALL_PAD, bindingOf(FOOTBALL_PAD)).stick
  assert.ok(Math.abs(diag[0] - Math.SQRT1_2) < 1e-9 && Math.abs(diag[1] + Math.SQRT1_2) < 1e-9)
  assert.ok(readPad(pad([14], [0.9, 0, 0, 0]), FIGHT_PAD, fight).stick[0] > 0.8)
})

test('changes: a press and a release are reported once each', () => {
  const a = readPad(pad([2]), FIGHT_PAD, fight), b = readPad(pad([2, 0]), FIGHT_PAD, fight), c = readPad(pad([0]), FIGHT_PAD, fight)
  assert.deepEqual(changes(null, a), { pressed: ['punch'], released: [] })
  assert.deepEqual(changes(a, b), { pressed: ['jump'], released: [] })
  assert.deepEqual(changes(b, c), { pressed: [], released: ['punch'] })
  assert.deepEqual(changes(c, c), { pressed: [], released: [] })
})

test('remapping: one button, one action; reset goes back to the game default; bad settings are repaired', () => {
  let s = remap(defaultPadSettings(), FIGHT_PAD, 'punch', 0)
  const b = bindingOf(FIGHT_PAD, s.bind.fight)
  assert.deepEqual(b.punch, [0]); assert.deepEqual(b.jump, [], 'the jump lost A')
  assert.equal(readPad(pad([0]), FIGHT_PAD, b).held.punch, true)
  s = resetBinding(s, 'fight'); assert.deepEqual(bindingOf(FIGHT_PAD, s.bind.fight), fight)
  const cleaned = cleanPadSettings({ v: 1, zone: 9, rumble: 'yes', bind: { fight: { punch: [3], kick: ['x'], 'BAD': [1] }, 'Bad Game': {} } })
  assert.equal(cleaned.zone, DEFAULT_DEAD_ZONE); assert.equal(cleaned.rumble, true)
  assert.deepEqual(cleaned.bind, { fight: { punch: [3] } })
  assert.deepEqual(cleanPadSettings('garbage'), defaultPadSettings())
  assert.deepEqual(bindingOf(FIGHT_PAD, { punch: [3] }).kick, FIGHT_PAD.actions[1]!.buttons, 'an action left out keeps its default')
})

test('the remap screen hears the first face or shoulder button, never Start or the d-pad; names are short', () => {
  assert.equal(firstButtonDown(pad([9, 13])), -1)
  assert.equal(firstButtonDown(pad([9, 5])), 5)
  assert.equal(padName('Xbox Wireless Controller (STANDARD GAMEPAD Vendor: 045e)'), 'Xbox Wireless Controller')
  assert.equal(padName(''), 'Controller')
})

test('a stick held near the edge does not flicker between left and still', async () => {
  const { axisDir } = await import('./usePad.ts')
  assert.equal(axisDir(0.5, 0), 1); assert.equal(axisDir(0.35, 1), 1, 'held: stays until it drops below the lower line')
  assert.equal(axisDir(0.2, 1), 0); assert.equal(axisDir(0.4, 0), 0, 'not yet')
  assert.equal(axisDir(-0.9, 1), -1)
})
