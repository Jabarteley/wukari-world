import assert from 'node:assert/strict'
import test from 'node:test'
import { Scape, type ScapeSpec } from './scape.ts'
import { Synth } from './synth.ts'
import { FakeContext, FakeGain, FakeParam, asContext } from './fakeAudio.ts'
import { SCAPES } from './data.ts'
import { bedReport } from './bedModel.ts'

const rig = (): { ctx: FakeContext; synth: Synth; dest: FakeGain } => { const ctx = new FakeContext(); return { ctx, synth: new Synth(asContext(ctx), { tick: { l: [{ w: 'sine', f: 400, d: 0.05, g: 0.1 }] } }), dest: new FakeGain(ctx) } }

test('a slow level swing never takes a bed below zero (a negative gain flips the phase and crackles)', () => {
  const { ctx, synth, dest } = rig()
  const spec: ScapeSpec = { beds: [{ hum: 100, fl: ['lowpass', 300], g: 1, lfo: [0.1, 1] }, { c: 'brown', fl: ['lowpass', 300], g: 1, lfo: [0.1, 0.8] }] }
  new Scape(synth, spec, dest as unknown as AudioNode, false)
  let checked = 0
  for (const depth of ctx.gains) for (const to of depth.out) {
    if (!(to instanceof FakeParam)) continue
    const target = ctx.gains.find(g => g.gain === to)
    assert.ok(target, 'the swing drives a gain')
    assert.ok(target.gain.value - depth.gain.value >= -1e-12, `lowest level ${target.gain.value - depth.gain.value}`)
    checked++
  }
  assert.equal(checked, 2)
})

test('every bed of every soundscape keeps its swing inside its own level', () => {
  for (const [name, spec] of Object.entries(SCAPES)) for (const bed of spec.beds ?? []) if (bed.lfo) assert.ok(bed.lfo[1] <= 1 && bed.lfo[0] <= 6, `${name}: no fast or over-deep swing`)
})

test('the noise loops have no step where they wrap round', () => {
  const { synth } = rig()
  for (const colour of ['white', 'pink', 'brown'] as const) {
    const data = synth.noiseBuffer(colour).getChannelData(0)
    let typical = 0
    for (let i = 1; i < 4000; i++) typical = Math.max(typical, Math.abs((data[i] as number) - (data[i - 1] as number)))
    const wrap = Math.abs((data[0] as number) - (data[data.length - 1] as number))
    assert.ok(wrap <= typical * 1.5 + 1e-6, `${colour}: wrap step ${wrap} against ${typical}`)
    assert.ok(data.length >= 22050 * 4, 'long enough not to be heard as a repeat')
  }
})

test('shots that fell due while the context slept are dropped, not played in one burst', () => {
  const { ctx, synth, dest } = rig()
  const scape = new Scape(synth, { shots: [['tick', 0.5, 0.5, 1]] }, dest as unknown as AudioNode, false)
  ctx.currentTime = 0
  scape.fill(1)
  const before = synth.played
  ctx.currentTime = 600
  scape.fill(602)
  assert.ok(synth.played - before <= 5, `played ${synth.played - before} after waking`)
})

test('no continuous bed is bright or flat: the static targets hold for every soundscape, day and night', () => {
  for (const [name, spec] of Object.entries(SCAPES)) for (const night of [false, true]) {
    if (!spec.beds?.length) continue
    const r = bedReport(spec, night)
    assert.ok(r.flatness < 0.25, `${name}${night ? ' (night)' : ''}: flatness ${r.flatness.toFixed(3)}`)
    assert.ok(r.over4k < 0.1, `${name}${night ? ' (night)' : ''}: ${(r.over4k * 100).toFixed(1)}% above 4 kHz`)
  }
})

test('no noise bed is white, a high-pass, or reaches above 1.5 kHz', () => {
  for (const [name, spec] of Object.entries(SCAPES)) for (const bed of spec.beds ?? []) {
    if (!bed.c) continue
    assert.notEqual(bed.c, 'white', `${name}: white noise bed`)
    assert.notEqual(bed.fl[0], 'highpass', `${name}: high-passed noise bed`)
    assert.ok(bed.fl[1] <= 1500, `${name}: noise bed filter at ${bed.fl[1]} Hz`)
  }
})

test('the bed model sees static when there is some', () => {
  const hiss: ScapeSpec = { beds: [{ c: 'white', fl: ['highpass', 4000, 0.5], g: 1 }] }
  const r = bedReport(hiss, false)
  assert.ok(r.over4k > 0.5, 'bright noise is counted as bright')
})
