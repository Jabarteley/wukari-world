import assert from 'node:assert/strict'
import { test } from 'node:test'
import { mayWarm, whenIdle } from './preload.ts'

test('warming is allowed on a normal or unknown connection', () => {
  assert.equal(mayWarm(undefined), true)
  assert.equal(mayWarm({}), true)
  assert.equal(mayWarm({ effectiveType: '4g' }), true)
  assert.equal(mayWarm({ effectiveType: '3g', saveData: false }), true)
})
test('warming never runs on Save-Data or a 2G connection', () => {
  assert.equal(mayWarm({ saveData: true }), false)
  assert.equal(mayWarm({ saveData: true, effectiveType: '4g' }), false)
  assert.equal(mayWarm({ effectiveType: '2g' }), false)
  assert.equal(mayWarm({ effectiveType: 'slow-2g' }), false)
})
test('idle work uses requestIdleCallback when there is one, a timeout when there is not', () => {
  const log: string[] = []
  whenIdle(() => {}, (_run, o) => { log.push(`idle ${o?.timeout}`) }, () => { log.push('wait') })
  whenIdle(() => {}, undefined, (_run, ms) => { log.push(`wait ${ms}`) })
  assert.deepEqual(log, ['idle 4000', 'wait 1500'])
})
