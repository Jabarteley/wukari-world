import { test } from 'node:test'
import assert from 'node:assert/strict'
import { cleanNativeLook, defaultNativeLook, nativeFightersAllowed, packNativeLook, unpackNativeLook } from './native-look.ts'
import { nativeRecipeForLook } from '../character/native-migration.ts'
import { boneTrackName } from './fight-native.ts'

test('a native look packs short and unpacks to the same appearance', () => {
  const a = nativeRecipeForLook({ skin: 'skin-4', hair: 'braids', outfit: 'office' }, 'someone').appearance
  const packed = packNativeLook(a)
  assert.ok(JSON.stringify(packed).length < 600)
  const back = unpackNativeLook(packed)
  assert.ok(back)
  assert.equal(back.body, a.body); assert.equal(back.hair, a.hair); assert.deepEqual(back.garments, a.garments); assert.equal(back.colors.skin, a.colors.skin)
  assert.deepEqual(cleanNativeLook(packed), packed)
})
test('an untrusted look is refused, not repaired', () => {
  const good = packNativeLook(defaultNativeLook('Bot 1', 1))
  assert.ok(cleanNativeLook(good))
  for (const bad of [null, 5, [], { ...good, b: 'robot' }, { ...good, h: 'mohawk' }, { ...good, g: 'cape' }, { ...good, t: 3 }, { ...good, k: ['zz', '1', '2', '3', '4'] }, { ...good, k: good.k.slice(1) }, { ...good, f: { 'nose-width': 9 } }, { ...good, f: { nonsense: 0.1 } }, { ...good, pad: 'x'.repeat(1000) }]) {
    assert.equal(cleanNativeLook(bad), undefined, JSON.stringify(bad).slice(0, 60))
  }
})
test('a seat without a look gets a varied default, the same one every time', () => {
  assert.deepEqual(defaultNativeLook('Bot 1', 1), defaultNativeLook('Bot 1', 1))
  const looks = new Set(['Bot 1', 'Bot 2', 'Ada', 'Bola', 'Chidi', 'Dayo'].map((n, i) => JSON.stringify(packNativeLook(defaultNativeLook(n, i % 2)))))
  assert.ok(looks.size >= 4)
  assert.ok(unpackNativeLook(packNativeLook(defaultNativeLook('x', 0))))
  // Only the world's crowd pieces: a default never needs a file the phone has not already got.
  for (const name of ['a', 'b', 'c', 'd', 'e']) {
    const look = defaultNativeLook(name, 1, 'male')
    assert.deepEqual([look.body, look.hair, look.garments, look.shoes], ['male', 'short01', ['female-casual-01'], 'shoes01'])
  }
})
test('the real fighters need memory, cores and WebGL 2', () => {
  assert.equal(nativeFightersAllowed({ webgl2: true }), true)
  assert.equal(nativeFightersAllowed({ webgl2: true, deviceMemory: 4, hardwareConcurrency: 8 }), true)
  assert.equal(nativeFightersAllowed({ webgl2: false, deviceMemory: 8, hardwareConcurrency: 8 }), false)
  assert.equal(nativeFightersAllowed({ webgl2: true, deviceMemory: 2 }), false)
  assert.equal(nativeFightersAllowed({ webgl2: true, hardwareConcurrency: 2 }), false)
})
test('a bone the loader renamed is put back, a real bone is left alone', () => {
  const bones = new Set(['pelvis', 'spine_03', 'thigh_l'])
  assert.equal(boneTrackName('pelvis_1.quaternion', bones), 'pelvis.quaternion')
  assert.equal(boneTrackName('spine_03_1.position', bones), 'spine_03.position')
  assert.equal(boneTrackName('spine_03.quaternion', bones), 'spine_03.quaternion')
  assert.equal(boneTrackName('thigh_l.quaternion', bones), 'thigh_l.quaternion')
})
