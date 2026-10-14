import assert from 'node:assert/strict'
import { test } from 'node:test'
import { FRAME_SLACK_MS, frameAction, gatedCancel, gatedRequest, isCovered, sceneCovered, setCovered } from './frame-gate.ts'
import { forgetLight, setLight } from '../lightControl.ts'
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

/** A browser frame callback the test fires by hand (installed on globalThis for the gated functions). */
function browser() {
  const frames = new Map<number, (time: number) => void>(); let next = 0
  const g = globalThis as unknown as Record<string, unknown>
  const saved = [g.requestAnimationFrame, g.cancelAnimationFrame]
  g.requestAnimationFrame = (run: (time: number) => void) => { frames.set(++next, run); return next }
  g.cancelAnimationFrame = (id: number) => { frames.delete(id) }
  return { pending: () => frames.size, fire: (time: number) => { const all = [...frames.values()]; frames.clear(); for (const run of all) run(time) }, restore: () => { g.requestAnimationFrame = saved[0]; g.cancelAnimationFrame = saved[1] } }
}

test('the gated frame request holds a callback while covered and gives it a frame when the cover goes', () => {
  const b = browser(); const ran: number[] = []
  try {
    setCovered(true)
    gatedRequest((time) => ran.push(time))
    b.fire(100)
    assert.equal(ran.length, 0, 'covered: nothing runs')
    assert.equal(b.pending(), 0, 'and no frames are asked for meanwhile')
    assert.equal(isCovered(), true)
    setCovered(true)
    setCovered(false)
    assert.equal(b.pending(), 1)
    b.fire(200)
    assert.deepEqual(ran, [200])
  } finally { setCovered(false); b.restore() }
})

test('cancelling a gated request works, whether it is waiting for a frame or parked', () => {
  const b = browser(); const ran: number[] = []
  try {
    const id = gatedRequest((time) => ran.push(time))
    gatedCancel(id)
    b.fire(10)
    assert.equal(ran.length, 0)
    setCovered(true)
    const parked = gatedRequest((time) => ran.push(time))
    b.fire(20); gatedCancel(parked)
    setCovered(false)
    assert.equal(b.pending(), 0)
    b.fire(30)
    assert.equal(ran.length, 0)
  } finally { setCovered(false); b.restore() }
})

test('the gated frame request skips early frames under the light-mode cap', () => {
  const b = browser(); const ran: number[] = []
  try {
    setLight(true)
    let run = () => {}
    const again = (time: number) => { ran.push(time); run() }
    run = () => { gatedRequest(again) }
    run()
    for (let i = 0; i < 6; i++) b.fire(10000 + i * (1000 / 60))
    assert.equal(ran.length, 3, 'six frames at 60 fps, three at 30')
    setLight(false)
  } finally { forgetLight(); b.restore() }
})

test('the motion loop runs on the gated request when the browser has frames, and has none when it does not', () => {
  assert.equal(createMotionLoop(() => false, { doc: null }).available, false, 'no requestAnimationFrame in node')
  const b = browser(); let steps = 0
  try {
    const loop = createMotionLoop(() => { steps += 1; return true }, { doc: null, clock: () => 0 })
    assert.equal(loop.available, true)
    loop.wake(); b.fire(16); assert.equal(steps, 1)
    setCovered(true); b.fire(40); b.fire(50)
    assert.equal(steps, 1, 'parked while covered')
    setCovered(false); b.fire(60)
    assert.equal(steps, 2)
    loop.stop(); assert.equal(b.pending(), 0, 'stop cancels the gated frame')
  } finally { setCovered(false); b.restore() }
})
