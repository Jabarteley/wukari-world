import { test } from 'node:test'
import assert from 'node:assert/strict'
import * as THREE from 'three'
import { ActionMix, CLIP_LIST, KIT, STRIDE, TIMES, cadence, clipsFor, clusterIndex, kitLook, locoWeights, withinBudget } from './football-native.ts'
import { defaultNativeLook } from './native-look.ts'
import { clearShift, GOAL_CLEAR_MAX } from './football-3d.ts'

test('the locomotion weights sum to 1 and follow the speed', () => {
  for (const carrying of [false, true]) for (let s = 0; s <= 7; s += 0.25) {
    const w = locoWeights(s, carrying), sum = Object.values(w).reduce((a, b) => a + b, 0)
    assert.ok(Math.abs(sum - 1) < 1e-9, `${s}: ${sum}`)
  }
  assert.equal(locoWeights(0, false).idle, 1)
  assert.equal(locoWeights(1.3, false).walk, 1)
  assert.equal(locoWeights(2.8, false).jog, 1)
  assert.equal(locoWeights(5.3, false).sprint, 1)
  const mid = locoWeights(4, false)
  assert.ok(mid.jog > 0 && mid.sprint > 0 && mid.idle === 0 && mid.walk === 0)
})
test('with the ball at his feet a player dribbles instead of jogging or sprinting, and stands or walks as before', () => {
  const w = locoWeights(4.5, true)
  assert.equal(w.jog, 0); assert.equal(w.sprint, 0); assert.ok(w.dribble > 0.99)
  assert.equal(locoWeights(0, true).idle, 1)
})
test('the cycle rate keeps the feet on the ground: one cycle moves the player one stride', () => {
  assert.equal(cadence(0, locoWeights(0, false)), 0)
  for (const [clip, speed] of [['walk', 1.3], ['jog', 2.8], ['sprint', 5.0]] as const) assert.ok(Math.abs(cadence(speed, locoWeights(speed, false)) * STRIDE[clip] - speed) < 1e-9)
  assert.ok(cadence(5, locoWeights(5, false)) > cadence(2.8, locoWeights(2.8, false)))
})
test('a team wears its shirt and keeps its own face, hair and shoes; the keeper wears his own colour', () => {
  const look = defaultNativeLook('Ada', 1)
  const a = kitLook(look, 0), b = kitLook(look, 1), k = kitLook(look, 0, true)
  assert.equal(a.colors.upper, KIT.team[0]); assert.equal(b.colors.upper, KIT.team[1]); assert.equal(k.colors.upper, KIT.keeper)
  assert.notEqual(a.colors.upper, b.colors.upper)
  for (const x of [a, b, k]) { assert.equal(x.colors.skin, look.colors.skin); assert.equal(x.colors.hair, look.colors.hair); assert.equal(x.hair, look.hair); assert.equal(x.body, look.body) }
  assert.equal(look.colors.upper === a.colors.upper, false, 'the input look is not changed')
})
test('the clips of one body come out under their own names, with a second skeleton\'s bones put back', () => {
  const track = (name: string): THREE.KeyframeTrack => new THREE.VectorKeyframeTrack(name, [0, 1], [0, 0, 0, 0, 0, 0])
  const clips = [new THREE.AnimationClip('jog.male', 1, [track('pelvis_1.position')]), new THREE.AnimationClip('jog.female', 1, [track('pelvis.position')]), new THREE.AnimationClip('nonsense.male', 1, [])]
  const out = clipsFor(clips, 'male', new Set(['pelvis']))
  assert.deepEqual(out.map((c) => c.name), ['jog'])
  assert.equal(out[0]?.tracks[0]?.name, 'pelvis.position')
  assert.ok((CLIP_LIST as readonly string[]).includes('keeper-dive-left') && CLIP_LIST.includes('kick'))
})
test('the wind-up comes before the strike in both kicks', () => {
  assert.ok(TIMES.kickWind < TIMES.kickHit && TIMES.passWind < TIMES.passHit && TIMES.kickHit - TIMES.kickWind < 0.15)
})
test('the budget: one full actor with five light ones fits, six full ones do not', () => {
  assert.ok(withinBudget(30_000, 8_000, 1, 5)); assert.ok(withinBudget(30_000, 8_000, 2, 0))
  assert.ok(!withinBudget(30_000, 30_000, 1, 5)); assert.ok(!withinBudget(30_000, 8_000, 3, 3))
})
test('the action mix keeps its weights summing to 1 and plays a state clip over the locomotion', () => {
  const root = new THREE.Object3D(); root.name = 'root'
  const make = (name: string, v: number): THREE.AnimationClip => new THREE.AnimationClip(name, 1, [new THREE.VectorKeyframeTrack('root.position', [0, 1], [v, 0, 0, v, 0, 0])])
  const mix = new ActionMix(new THREE.AnimationMixer(root), ['idle', 'walk', 'jog', 'sprint', 'dribble', 'kick'].map((n, i) => make(n, i)))
  for (let i = 0; i < 120; i++) mix.update(1 / 60, 2.8, false)
  assert.ok(Math.abs(root.position.x - 2) < 0.05, `the jog is drawn: ${root.position.x}`)
  mix.start({ clip: 'kick', loop: false, rate: 1 }, 0)
  for (let i = 0; i < 60; i++) mix.update(1 / 60, 2.8, false)
  assert.ok(Math.abs(root.position.x - 5) < 0.05, `the kick is drawn: ${root.position.x}`)
  assert.ok(mix.finished())
  mix.start(null)
  for (let i = 0; i < 120; i++) mix.update(1 / 60, 0, false)
  assert.ok(Math.abs(root.position.x) < 0.05, `back to standing: ${root.position.x}`)
})
test('the camera slides back only as far as it needs to, and no further than its limit', () => {
  const y = (d: number): number => 900 - d * 50
  assert.equal(clearShift(y, 1000), 0)
  assert.ok(Math.abs(clearShift(y, 800) - 2) < 0.01)
  assert.equal(clearShift(y, 100), GOAL_CLEAR_MAX)
})
test('clustering keeps about the asked share of the triangles, over the same vertices', () => {
  const n = 30, positions: number[] = [], index: number[] = []
  for (let y = 0; y <= n; y++) for (let x = 0; x <= n; x++) positions.push(x / n, Math.sin(x / 5) * 0.1, y / n)
  for (let y = 0; y < n; y++) for (let x = 0; x < n; x++) { const a = y * (n + 1) + x; index.push(a, a + 1, a + n + 1, a + 1, a + n + 2, a + n + 1) }
  const { rep } = clusterIndex(positions, index, 0.25)
  let kept = 0
  for (let i = 0; i < index.length; i += 3) { const a = rep[index[i] as number], b = rep[index[i + 1] as number], c = rep[index[i + 2] as number]; if (a !== b && b !== c && a !== c) kept += 1 }
  const share = kept / (index.length / 3)
  assert.ok(share > 0.1 && share < 0.45, `kept ${share}`)
  for (const r of rep) assert.ok(r < positions.length / 3)
})
