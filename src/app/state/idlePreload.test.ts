import assert from 'node:assert/strict'
import test from 'node:test'
import { holdsBack, preloadNext } from './idlePreload.ts'

const turns = async (count = 3): Promise<void> => {
  while (count-- > 0) await Promise.resolve()
}

test('idle work is held for light mode, save-data and 2G connections', () => {
  assert.equal(holdsBack({}, false), false)
  assert.equal(holdsBack({}, true), true)
  assert.equal(holdsBack({ saveData: true }, false), true)
  assert.equal(holdsBack({ effectiveType: 'slow-2g' }, false), true)
  assert.equal(holdsBack({ effectiveType: '2g' }, false), true)
  assert.equal(holdsBack({ effectiveType: '3g' }, false), false)
})

test('preloadNext keeps the injectable one-loader-per-idle sequence and skips failures', async () => {
  const idle: (() => void)[] = [], calls: string[] = []
  preloadNext(Promise.resolve(), [
    async () => { calls.push('first') },
    async () => { calls.push('failed'); throw new Error('expected') },
    async () => { calls.push('last') },
  ], run => { idle.push(run) }, () => false)
  await turns()
  assert.deepEqual(calls, [])
  assert.equal(idle.length, 1)
  idle.shift()!(); await turns()
  assert.deepEqual(calls, ['first'])
  assert.equal(idle.length, 1)
  idle.shift()!(); await turns()
  assert.deepEqual(calls, ['first', 'failed'])
  assert.equal(idle.length, 1)
  idle.shift()!(); await turns()
  assert.deepEqual(calls, ['first', 'failed', 'last'])
})

test('preloadNext rechecks the hold before every queued loader', async () => {
  let held = false
  const idle: (() => void)[] = [], calls: string[] = []
  preloadNext(Promise.resolve(), [
    async () => { calls.push('first'); held = true },
    async () => { calls.push('second') },
  ], run => { idle.push(run) }, () => held)
  await turns()
  idle.shift()!(); await turns()
  assert.deepEqual(calls, ['first'])
  assert.equal(idle.length, 1)
  idle.shift()!(); await turns()
  assert.deepEqual(calls, ['first'])
})
