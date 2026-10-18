import test from 'node:test'
import assert from 'node:assert/strict'
import { resourceSlot } from './lifetime.ts'

test('stale asynchronous scene releases itself and never replaces the new scene', async () => {
  const slot = resourceSlot(), released: string[] = []
  let finish!: () => void
  const slow = slot.replace(async current => { await new Promise<void>(resolve => { finish = resolve }); assert.equal(current(), false); return { dispose: () => released.push('slow') } })
  const fast = await slot.replace(async () => ({ dispose: () => released.push('fast') }))
  assert.ok(fast); finish(); assert.equal(await slow, null); assert.deepEqual(released, ['slow'])
  slot.clear(); assert.deepEqual(released, ['slow', 'fast'])
  slot.dispose(); assert.deepEqual(released, ['slow', 'fast'])
})

test('a failed scene can retry and disposal cancels in-flight ownership', async () => {
  const slot = resourceSlot()
  await assert.rejects(slot.replace(async () => { throw new Error('temporary asset failure') }), /temporary/)
  let releases = 0
  assert.ok(await slot.replace(async () => ({ dispose: () => { releases++ } })))
  let finish!: () => void
  const pending = slot.replace(async () => { await new Promise<void>(resolve => { finish = resolve }); return { dispose: () => { releases++ } } })
  assert.equal(releases, 1)
  slot.dispose(); finish(); assert.equal(await pending, null); assert.equal(releases, 2)
  assert.equal(await slot.replace(async () => { throw new Error('must not run') }), null)
})
