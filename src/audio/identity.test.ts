import test from 'node:test'
import assert from 'node:assert/strict'
import { SCAPES } from './data.ts'

test('ordinary places have no endless pitched chord, including when Music is off', () => {
  for (const name of ['home', 'city', 'calm', 'park', 'market', 'water', 'campus', 'worship', 'transit', 'harbour', 'harmattan']) {
    assert.deepEqual(SCAPES[name]?.beds?.filter(bed => !bed.c), [], `${name} must keep environmental detail without a continuous musical oscillator`)
  }
})

test('background music cannot layer fixed-key ambient phrases over its changing harmony', () => {
  for (const name of ['home', 'city', 'market', 'park']) {
    assert.deepEqual(SCAPES[name]?.shots?.filter(shot => shot[5]) ?? [], [], name)
  }
})
