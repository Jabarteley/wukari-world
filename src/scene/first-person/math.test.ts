import test from 'node:test'
import assert from 'node:assert/strict'
import { clampPitch, eyePose, selectTarget, targetOccluded, wrapYaw } from './math.ts'

const close = (actual: number, expected: number, tolerance = 1e-9): void => assert.ok(Math.abs(actual - expected) <= tolerance, `${actual} ≠ ${expected}`)

test('wrapYaw stays bounded and handles large or invalid turns', () => {
  close(wrapYaw(0), 0)
  close(wrapYaw(Math.PI), -Math.PI)
  close(wrapYaw(-Math.PI), -Math.PI)
  close(wrapYaw(16 * Math.PI + 0.25), 0.25)
  close(wrapYaw(Number.NaN), 0)
  assert.ok(wrapYaw(Number.POSITIVE_INFINITY) >= -Math.PI && wrapYaw(Number.POSITIVE_INFINITY) <= Math.PI)
})

test('clampPitch uses a comfortable ±80 degree range and safe invalid input', () => {
  close(clampPitch(Math.PI), (80 * Math.PI) / 180)
  close(clampPitch(-Math.PI), -(80 * Math.PI) / 180)
  close(clampPitch(Number.NaN), 0)
})

test('eyePose supports standing, seated, sleeping, raised floors and bobbing', () => {
  const standing = eyePose({ x: 1, y: 2, z: 3, yaw: 0, pitch: 0 })
  close(standing.y, 4.3)
  close(standing.lookZ, 4.0)
  const seated = eyePose({ x: 1, y: 2, z: 3, yaw: 0, pitch: 0, pose: 'sit', seat: 0.6 })
  close(seated.y, 3.75)
  const defaultSeat = eyePose({ x: 0, y: 1, z: 0, yaw: 0, pitch: 0, pose: 'sit', scale: 2 })
  close(defaultSeat.y, 1 + 0.96 + 2.3)
  const sleeping = eyePose({ x: 0, y: 0.8, z: 0, yaw: 0, pitch: 0, pose: 'lie', seat: 0.5, scale: 2 })
  close(sleeping.y, 1.86)
  close(eyePose({ x: 0, y: 0.8, z: 0, yaw: 0, pitch: 0, pose: 'soak', seat: 0.1, scale: 2 }).y, 3.2)
  const bob = eyePose({ x: 0, y: 0, z: 0, yaw: 0, pitch: 0, phase: Math.PI / 2, moving: true, bob: true })
  close(bob.y, 2.325)
  close(eyePose({ x: 0, y: 0, z: 0, yaw: 0, pitch: 0, phase: Math.PI / 2, moving: false, bob: true }).y, 2.3)
  close(eyePose({ x: 0, y: 0, z: 0, yaw: 0, pitch: 0, phase: Math.PI / 2, moving: true, bob: true, reducedMotion: true }).y, 2.3)
})

test('selectTarget requires strict 3D reach, forward cone and no blocked target', () => {
  const eye = { x: 0, y: 0, z: 0 }
  const direction = { x: 0, y: 0, z: 1 }
  const targets = [
    { id: 'near', x: 0, y: 0, z: 1 },
    { id: 'far', x: 0, y: 0, z: 2 },
    { id: 'behind', x: 0, y: 0, z: -0.2 },
    { id: 'side', x: 0.5, y: 0, z: 1 },
    { id: 'high', x: 0, y: 0.5, z: 1 },
    { id: 'out', x: 0, y: 0, z: 3 },
  ]
  assert.equal(selectTarget(eye, direction, targets, 2)?.id, 'near')
  assert.equal(selectTarget(eye, direction, targets, 2, (target) => target.id === 'near')?.id, 'far')
  assert.equal(selectTarget(eye, direction, [{ id: 'behind', x: 0, y: 0, z: -1 }], 2), null)
  assert.equal(selectTarget(eye, direction, [{ id: 'side', x: 0.5, y: 0, z: 1 }], 2), null)
  assert.equal(selectTarget(eye, direction, [{ id: 'high', x: 0, y: 0.5, z: 1 }], 2), null)
  assert.equal(selectTarget(eye, direction, [{ id: 'edge', x: 0, y: 0, z: 2.01 }], 2), null)
  assert.equal(selectTarget(eye, direction, [{ id: 'bad', x: Number.NaN, y: 0, z: 1 }], 2), null)
})

test('targetOccluded detects a wall before the target, respecting height and contained endpoints', () => {
  const eye = { x: 0, y: 1, z: 0 }, target = { x: 0, y: 1, z: 4 }
  assert.equal(targetOccluded(eye, target, [[-1, 0, 1, 1, 2, 2]]), true)
  assert.equal(targetOccluded(eye, target, [[-1, 0, 5, 1, 2, 6]]), false)
  assert.equal(targetOccluded(eye, target, [[-1, 2, 1, 1, 3, 2]]), false)
  assert.equal(targetOccluded(eye, { x: 0, y: 1, z: 1.5 }, [[-1, 0, 1, 1, 2, 2]]), false)
  assert.equal(targetOccluded({ x: 0, y: 1.5, z: 1.5 }, target, [[-1, 0, 1, 1, 2, 2]]), false)
})
