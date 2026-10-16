// OWNER: games (real-time) — the pure parts of Football's 3D view: units, the camera's framing, which clip a player shows. No WebGL here.
import assert from 'node:assert/strict'
import { test } from 'node:test'
import { H, PHASE, W, GOAL_Y1, GOAL_Y2 } from './football.ts'
import type { FootballerSnap } from './football.ts'
import {
  ELEVATION, FOOTBALL_ASSETS, GOAL_DEEP, GOAL_WIDTH, PITCH_L, PITCH_W, REPLAY_AFTER, REPLAY_BACK, REPLAY_FOR, UX, UZ,
  acrossFor, behindGoal, celebration, clipFor, diveRoll, focusPoint, fovFor, framing, modeFor, nearestPlayer, openPlay, penaltyCam, penaltyFov, runScale, toWorld, turnTo, yawFor,
} from './football-3d.ts'
import { penaltyRotation, stickRotation, viewRotation } from './football-draw.ts'
import type { Insets } from './football-3d.ts'

const PORTRAIT = { w: 390, h: 844, inset: { top: 100, bottom: 214, left: 0, right: 0 } as Insets }
const LANDSCAPE = { w: 844, h: 390, inset: { top: 58, bottom: 8, left: 0, right: 0 } as Insets }
/** Where a point (metres on the pitch, `up` metres above it) lands on a screen of `w` x `h`, for a camera target and a framing: a plain perspective projection. */
function project(cam: { pos: number[]; look: number[] }, fr: { fov: number; shift: number }, w: number, h: number, p: [number, number, number]): { x: number; y: number; depth: number } {
  const sub = (a: number[], b: number[]): number[] => [(a[0] as number) - (b[0] as number), (a[1] as number) - (b[1] as number), (a[2] as number) - (b[2] as number)]
  const dot = (a: number[], b: number[]): number => (a[0] as number) * (b[0] as number) + (a[1] as number) * (b[1] as number) + (a[2] as number) * (b[2] as number)
  const cross = (a: number[], b: number[]): number[] => [(a[1] as number) * (b[2] as number) - (a[2] as number) * (b[1] as number), (a[2] as number) * (b[0] as number) - (a[0] as number) * (b[2] as number), (a[0] as number) * (b[1] as number) - (a[1] as number) * (b[0] as number)]
  const norm = (a: number[]): number[] => { const l = Math.hypot(a[0] as number, a[1] as number, a[2] as number) || 1; return a.map((v) => v / l) }
  const fwd = norm(sub(cam.look, cam.pos)), right = norm(cross(fwd, [0, 1, 0])), up = cross(right, fwd)
  const d = sub(p, cam.pos), depth = dot(d, fwd), k = h / (2 * Math.tan((fr.fov * Math.PI) / 360) * depth)
  return { x: w / 2 + dot(d, right) * k, y: h / 2 - dot(d, up) * k + fr.shift, depth }
}

test('units: the rules\' field is the model\'s 40 x 20 m pitch, and the goal mouth is a goal', () => {
  assert.deepEqual([toWorld(0, 0).x, toWorld(W, H).x], [-PITCH_L / 2, PITCH_L / 2])
  assert.deepEqual([toWorld(0, 0).z, toWorld(W, H).z], [-PITCH_W / 2, PITCH_W / 2])
  assert.ok(Math.abs(UX - 40 / 900) < 1e-9 && Math.abs(UZ - 20 / 540) < 1e-9)
  assert.ok(Math.abs(GOAL_WIDTH - (GOAL_Y2 - GOAL_Y1) * UZ) < 1e-9 && GOAL_WIDTH > 4.5 && GOAL_WIDTH < 6, 'a five-a-side goal: ' + GOAL_WIDTH)
  assert.ok(GOAL_DEEP > 1 && GOAL_DEEP < 2.2)
  assert.deepEqual(toWorld(W / 2, H / 2), { x: 0, z: 0 })
})

test('every model URL is versioned', () => {
  for (const url of [FOOTBALL_ASSETS.pitch, FOOTBALL_ASSETS.goal, FOOTBALL_ASSETS.ball, ...FOOTBALL_ASSETS.players]) assert.match(url, /\.glb\?v=[0-9a-f]{10}$/)
})

test('clips follow the snapshot: slide and stun fall, a kick kicks, a goal cheers, speed picks walk or run', () => {
  const f = (status: number): FootballerSnap => [100, 100, 0, status]
  const none = { kicking: false, cheer: false, sad: false }
  assert.equal(clipFor(f(0), 0, none), 'idle')
  assert.equal(clipFor(f(0), 1.4, none), 'walk')
  assert.equal(clipFor(f(0), 4.6, none), 'run')
  assert.equal(clipFor(f(1), 4.6, none), 'down', 'a slide')
  assert.equal(clipFor(f(2), 0, none), 'down', 'stunned after a tackle')
  assert.equal(clipFor(f(0), 4, { ...none, kicking: true }), 'kick')
  assert.equal(clipFor(f(0), 0, { ...none, cheer: true }), 'celebrate')
  assert.equal(clipFor(f(0), 0, { ...none, sad: true }), 'dejected')
  assert.equal(clipFor(f(1), 0, { ...none, cheer: true }), 'down', 'being tackled comes first')
  assert.equal(clipFor(f(32), 0, none), 'idle', 'a tackle cooling down shows nothing')
  assert.ok(runScale(0) === 0.6 && runScale(4.6) === 1 && runScale(40) === 1.7)
})

test('facing: heading 0 is +x, 6 is +z (down the screen), and a turn takes the short way', () => {
  const dir = (d: number): [number, number] => [Math.sin(yawFor(d)), Math.cos(yawFor(d))] // a glTF model faces +z; yaw turns it about the vertical
  const close = (a: [number, number], b: [number, number]): boolean => Math.hypot(a[0] - b[0], a[1] - b[1]) < 1e-9
  assert.ok(close(dir(0), [1, 0])); assert.ok(close(dir(6), [0, 1])); assert.ok(close(dir(12), [-1, 0])); assert.ok(close(dir(18), [0, -1]))
  assert.ok(Math.abs(turnTo(0.1, 2 * Math.PI - 0.1, 1) - -0.1) < 1e-9, 'across the zero, not round the long way')
  assert.ok(Math.abs(turnTo(0, 1, 0.5) - 0.5) < 1e-9)
})

test('the nearest player to an event, within reach', () => {
  const players: FootballerSnap[] = [[100, 100, 0, 0], [300, 100, 0, 0]]
  assert.equal(nearestPlayer(players, 120, 100), 0); assert.equal(nearestPlayer(players, 280, 90), 1)
  assert.equal(nearestPlayer(players, 500, 500), -1)
})

test('the camera: from the side on a wide screen, end-on on a tall one', () => {
  assert.equal(modeFor(844, 390), 'side'); assert.equal(modeFor(390, 844), 'end'); assert.equal(modeFor(500, 500), 'end')
  assert.ok(fovFor(0.46) > fovFor(2.1))
})

test('framing: the pitch is shown close enough to read, and nearer the goal it closes in', () => {
  for (const mode of ['side', 'end'] as const) {
    const s = mode === 'side' ? LANDSCAPE : PORTRAIT
    const mid = framing(acrossFor(mode, 0), s.w, s.h, s.inset), near = framing(acrossFor(mode, 18), s.w, s.h, s.inset)
    assert.ok(near.dist < mid.dist, mode + ': closer near the goal')
    assert.ok(mid.dist > 8 && mid.dist < 45, `${mode}: ${mid.dist}`)
  }
  assert.ok(framing(10, 390, 844, PORTRAIT.inset).shift < 0, 'the picture slides up when the thumb pad is taller than the bars')
  assert.equal(framing(10, 844, 390, { top: 0, bottom: 0, left: 100, right: 0 }).shiftX, 50)
})

test('portrait: you attack up the screen from behind your own goal, and the ball stays in the free band', () => {
  const insets = PORTRAIT.inset, fr = framing(acrossFor('end', 0), PORTRAIT.w, PORTRAIT.h, insets)
  for (const team of [0, 1]) {
    const sg = team === 0 ? 1 : -1
    for (const ball of [{ x: 0, z: 0 }, { x: -14 * sg, z: 6 }, { x: 15 * sg, z: -7 }, { x: 0, z: 9 }]) {
      const cam = openPlay('end', team, ball, { x: 0, z: 0 }, fr.dist, 6)
      assert.ok((cam.look[0] - cam.pos[0]) * sg > 0, `team ${team} looks along its attack`)
      const near = project(cam, fr, PORTRAIT.w, PORTRAIT.h, [ball.x, 0.2, ball.z]), far = project(cam, fr, PORTRAIT.w, PORTRAIT.h, [ball.x + 10 * sg, 0.2, ball.z])
      assert.ok(far.y < near.y, `team ${team}: further up the pitch is higher on the screen`)
      assert.ok(near.x > 0 && near.x < PORTRAIT.w, `ball x on screen: ${near.x}`)
      assert.ok(near.y > insets.top && near.y < PORTRAIT.h - insets.bottom, `ball y in the free band: ${near.y} for team ${team} at ${JSON.stringify(ball)}`)
    }
  }
})

test('landscape: your side attacks to the right, the ball is on screen and clear of the top bar', () => {
  const insets = LANDSCAPE.inset, fr = framing(acrossFor('side', 0), LANDSCAPE.w, LANDSCAPE.h, insets)
  for (const team of [0, 1]) {
    const sg = team === 0 ? 1 : -1
    for (const ball of [{ x: 0, z: 0 }, { x: -14 * sg, z: 6 }, { x: 15 * sg, z: -7 }]) {
      const cam = openPlay('side', team, ball, { x: 0, z: 0 }, fr.dist, 12)
      const here = project(cam, fr, LANDSCAPE.w, LANDSCAPE.h, [ball.x, 0.2, ball.z]), ahead = project(cam, fr, LANDSCAPE.w, LANDSCAPE.h, [ball.x + 5 * sg, 0.2, ball.z])
      assert.ok(ahead.x > here.x, `team ${team}: its attack goes to the right of the screen`)
      assert.ok(here.x > 60 && here.x < LANDSCAPE.w - 60 && here.y > insets.top && here.y < LANDSCAPE.h, `ball at ${here.x},${here.y}`)
    }
  }
})

test('the camera follows you as well as the ball while the ball stays in view', () => {
  const ext = { x: 8, z: 5 }
  assert.deepEqual(focusPoint({ x: 3, z: 1 }, null, ext), { x: 3, z: 1 })
  const f = focusPoint({ x: 0, z: 0 }, { x: 6, z: 2 }, ext)
  assert.ok(f.x > 0 && f.x < 6, 'between you and the ball')
  const far = focusPoint({ x: 0, z: 0 }, { x: 30, z: 0 }, ext)
  assert.ok(Math.abs(far.x) <= ext.x * 0.85 + 1e-9, 'the ball is never left behind by a runner far away: ' + far.x)
})

test('the shoot-out camera is behind the shooter, looks at the goal and fits it across the screen', () => {
  for (const team of [0, 1]) {
    const sg = team === 0 ? 1 : -1
    for (const s of [PORTRAIT, LANDSCAPE]) {
      const aspect = s.w / s.h, fov = penaltyFov(aspect), cam = penaltyCam(team, GOAL_WIDTH + 2.4, aspect, fov)
      assert.ok((cam.look[0] - cam.pos[0]) * sg > 0, 'looks towards the goal it shoots at')
      assert.ok(Math.abs(cam.pos[0]) < PITCH_L / 2 - 6 * (1 + 0.5) + 4, 'on the pitch')
      // The camera is further from the goal than the spot is, and the shooter stands between.
      assert.ok(Math.abs(cam.look[0] - cam.pos[0]) > 6 + 8, 'well behind the spot: ' + Math.abs(cam.look[0] - cam.pos[0]))
      const fr = { fov, shift: framing(1, s.w, s.h, s.inset).shift }
      const left = project(cam, fr, s.w, s.h, [cam.look[0], 0.5, -GOAL_WIDTH / 2 * sg]), right = project(cam, fr, s.w, s.h, [cam.look[0], 0.5, GOAL_WIDTH / 2 * sg])
      assert.ok(Math.min(left.x, right.x) > 0 && Math.max(left.x, right.x) < s.w, `the goal fits across: ${left.x}..${right.x}`)
      assert.ok(left.y > s.inset.top && left.y < s.h - s.inset.bottom, 'and sits in the free band: ' + left.y)
    }
  }
  assert.ok(penaltyFov(0.46) > penaltyFov(2.1))
})

test('the goal camera is low, behind the goal line; the scorer is seen from the front', () => {
  for (const team of [0, 1]) {
    const sg = team === 0 ? 1 : -1, cam = behindGoal(team, { x: 0, z: 0 })
    assert.ok(cam.pos[0] * sg > PITCH_L / 2, 'behind the goal line it scored in')
    assert.ok(cam.pos[1] < 2, 'low')
    assert.ok((cam.look[0] - cam.pos[0]) * sg < 0, 'looking back up the pitch')
    const c = celebration({ x: 10 * sg, z: 0 }, team)
    assert.ok(c.pos[1] > 1.5 && c.pos[1] < 3.5)
  }
})

test('the replay: shown after the ball is in, of a second or so, slowed, and over before the phase is', () => {
  assert.ok(REPLAY_AFTER > 0.2 && REPLAY_BACK >= 1 && REPLAY_FOR > 1 && REPLAY_FOR < 3)
  assert.ok(REPLAY_AFTER + REPLAY_FOR < 70 / 20 - 1, 'a second of celebration is left in the 3.5 s goal phase')
  assert.equal(PHASE.goal, 2)
})

test('stick turns: the way a thumb points is the way the camera sees', () => {
  assert.equal(stickRotation(0, true, null), viewRotation(0, true)); assert.equal(stickRotation(1, false, null), viewRotation(1, false))
  const snap = { p: PHASE.pens, o: { t: 1 } } as never
  assert.equal(stickRotation(0, false, snap), penaltyRotation(1), 'in a shoot-out the view is from behind the shooter, for everyone')
  assert.equal(penaltyRotation(0), viewRotation(0, true), 'team 0 shooting is team 0\'s portrait view')
  assert.equal(penaltyRotation(1), viewRotation(1, true))
})

test('a dive rolls the keeper to the side he named, no further than lying down', () => {
  assert.ok(diveRoll(1, 1) < 0 && diveRoll(-1, 1) > 0 && diveRoll(0, 1) === 0)
  assert.ok(Math.abs(diveRoll(1, 5)) <= 1.2 && Math.abs(diveRoll(1, 5)) > 1)
  assert.ok(ELEVATION.end > ELEVATION.side)
})
