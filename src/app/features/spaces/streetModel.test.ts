import test from 'node:test'
import assert from 'node:assert/strict'
import { neighbourPlots, neighboursFrom, pagesFor } from './streetModel.ts'

test('the neighbours of a plot, the pages that hold them, and their houses', () => {
  assert.deepEqual(neighbourPlots(9), [8, 10])
  assert.deepEqual(neighbourPlots(0), [1])
  assert.deepEqual(neighbourPlots(195), [194])
  assert.deepEqual(pagesFor([97, 99]), [0, 1])
  assert.deepEqual(pagesFor([8, 10]), [0])
  const unpack = (bits: number) => ({ tier: bits === 3 ? 'duplex' : 'starter', style: { wall: bits } })
  assert.deepEqual(neighboursFrom([{ p: 8, s: 3 }, { p: 12, s: 1 }], 9, unpack), [{ side: -1, tier: 'duplex', style: { wall: 3 } }], 'an empty plot next door has no house')
})
