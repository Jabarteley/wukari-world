import assert from 'node:assert/strict'
import { test } from 'node:test'
import { FRAME_SLACK_MS, frameAction, isCovered, onCoveredChange, sceneCovered, setCovered } from './frame-gate.ts'
import { createMotionLoop } from './motion-loop.ts'

const base = { hidden: false, covered: false, now: 1000, last: 990, capFps: 0 }

test('a hidden page or a covered scene draws nothing; otherwise the cap decides', () => {
  assert.equal(frameAction({ ...base, hidden: true }), 'stop')
  assert.equal(frameAction({ ...base, covered: true }), 'stop')
  assert.equal(frameAction({ ...base, hidden: true, covered: true, capFps: 30 }), 'stop')
  assert.equal(frameAction(base), 'draw', 'no cap: every frame')
  assert.equal(frameAction({ ...base, last: -Infinity, capFps: 30 }), 'draw', 'the first frame is always drawn')
})

test('with a 30 fps cap a 60 fps display draws every other frame, and a late frame is never lost', () => {
  const gap = 1000 / 30
  assert.equal(frameAction({ ...base, now: 1000, last: 1000 - 16.7, capFps: 30 }), 'wait')
  assert.equal(frameAction({ ...base, now: 1000, last: 1000 - 33.4, capFps: 30 }), 'draw')
  assert.equal(frameAction({ ...base, now: 1000, last: 1000 - (gap - FRAME_SLACK_MS + 0.1), capFps: 30 }), 'draw', 'a frame a hair early counts as on time')
  assert.equal(frameAction({ ...base, now: 1000, last: 1000 - 100, capFps: 30 }), 'draw')
  // A whole second of 60 fps frames comes out at 30.
  let last = -Infinity, drawn = 0
  for (let i = 0; i < 60; i++) { const now = i * (1000 / 60); if (frameAction({ ...base, now, last, capFps: 30 }) === 'draw') { drawn += 1; last = now } }
  assert.equal(drawn, 30)
})

test('a sheet covers the scene when it is full-screen, or when the screen is a phone', () => {
  assert.equal(sceneCovered({ sheetOpen: false, fullscreen: false, narrow: true }), false)
  assert.equal(sceneCovered({ sheetOpen: true, fullscreen: true, narrow: false }), true)
  assert.equal(sceneCovered({ sheetOpen: true, fullscreen: false, narrow: true }), true)
  assert.equal(sceneCovered({ sheetOpen: true, fullscreen: false, narrow: false }), false, 'on a wide screen the scene stays visible beside a sheet')
})

test('the cover switch tells listeners only when it changes', () => {
  const told: boolean[] = []
  const stop = onCoveredChange((covered) => told.push(covered))
  setCovered(false); setCovered(true); setCovered(true); setCovered(false)
  stop(); setCovered(true); setCovered(false)
  assert.deepEqual(told, [true, false])
  assert.equal(isCovered(), false)
})

/** A frame callback the test fires by hand. */
function manual() {
  let callback: ((time: number) => void) | null = null
  return { request: (run: (time: number) => void) => { callback = run; return 1 }, cancel: () => { callback = null }, fire: (time: number) => { const run = callback; callback = null; run?.(time) }, pending: () => callback !== null }
}

test('the motion loop skips frames above the cap and still asks for the next one', () => {
  const frames = manual(); let steps = 0
  const loop = createMotionLoop(() => { steps += 1; return true }, { request: frames.request, cancel: frames.cancel, doc: null, clock: () => 0, capFps: () => 30, covered: () => false })
  loop.wake()
  for (let i = 0; i < 6; i++) frames.fire(i * (1000 / 60) + 16)
  assert.equal(steps, 3, 'six frames at 60 fps, three at 30')
  assert.equal(loop.frames, 3)
  assert.equal(loop.running, true)
  assert.equal(frames.pending(), true, 'a skipped frame still asks for the next')
  loop.dispose()
})

test('the motion loop draws every frame with no cap (the default)', () => {
  const frames = manual(); let steps = 0
  const loop = createMotionLoop(() => { steps += 1; return true }, { request: frames.request, cancel: frames.cancel, doc: null, clock: () => 0, capFps: () => 0, covered: () => false })
  loop.wake()
  for (let i = 0; i < 6; i++) frames.fire(i * 16.7 + 16)
  assert.equal(steps, 6)
  loop.dispose()
})

test('a full-screen panel stops the loop, and closing it resumes cleanly through onVisible', () => {
  const frames = manual(); const events: string[] = []; let steps = 0
  let over = false
  const loop = createMotionLoop(() => { steps += 1; return true }, { request: frames.request, cancel: frames.cancel, doc: null, clock: () => 0, covered: () => over, onHidden: () => events.push('hidden'), onVisible: () => { events.push('visible'); loop.wake() } })
  loop.wake()
  frames.fire(16)
  assert.equal(steps, 1)
  over = true; setCovered(true)
  assert.equal(loop.running, false)
  assert.equal(frames.pending(), false, 'the pending frame was cancelled')
  assert.equal(loop.wake(), false, 'nothing starts it while covered')
  assert.equal(steps, 1)
  over = false; setCovered(false)
  assert.deepEqual(events, ['hidden', 'visible'])
  assert.equal(loop.running, true)
  frames.fire(500)
  assert.equal(steps, 2)
  loop.dispose()
  setCovered(true); setCovered(false)
  assert.deepEqual(events, ['hidden', 'visible'], 'a disposed loop hears nothing')
})

test('a frame that arrives after the page was hidden is not drawn', () => {
  const frames = manual(); let steps = 0; const doc = { visibilityState: 'visible' }
  const loop = createMotionLoop(() => { steps += 1; return true }, { request: frames.request, cancel: frames.cancel, doc, clock: () => 0, covered: () => false })
  loop.wake()
  doc.visibilityState = 'hidden'
  frames.fire(16)
  assert.equal(steps, 0)
  assert.equal(loop.running, false)
})
