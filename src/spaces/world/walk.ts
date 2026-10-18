/**
 * OWNER: spaces
 * WALKING THROUGH A SPACE (docs/SPACES-3D.md, phase 2): where a step takes the walker. Pure, so it is tested without a screen.
 *
 * The walker is a circle on the floor plan. Walls and stair rails are the game's own (src/game/home-plan.ts bumpsOf, in metres),
 * furniture and fixed models are rectangles. A step slides along whatever it meets. On a flight of stairs the height follows the
 * steps, and the floor the walker is on is the one that height is nearest.
 */
import type { PlanStairs, PlanWall } from '../../game/home-plan.ts'
import { WORLD } from '../layout.ts'

export const WALKER = Object.freeze({ radius: 0.28, walk: 1.6, run: 3.4, eye: 1.62, turn: 2.6 })

export interface Walker { x: number; z: number; y: number; floor: number; yaw: number; pitch: number }
export interface Ground {
  walls(floor: number): readonly PlanWall[]
  blocks(floor: number): readonly (readonly [number, number, number, number])[]
  stairs: readonly PlanStairs[]
  /** The yard: how far the walker may go, in metres, round the plot. */
  bounds: readonly [number, number, number, number]
  floors: number
}

/** The height of the floor under (x, z) when the walker was on `floor`: on a flight, the step under them. */
export function heightAt(ground: Ground, floor: number, x: number, z: number): number {
  const T = WORLD.tile, H = WORLD.storey
  for (const flight of ground.stairs) {
    if (flight.floor !== floor && flight.floor !== floor - 1) continue
    const x0 = flight.x * T, x1 = (flight.x + flight.w) * T, z0 = flight.y * T, z1 = (flight.y + flight.h) * T
    if (x < x0 || x > x1 || z < z0 || z > z1) continue
    const t = flight.dir === 1 ? (x - x0) / (x1 - x0) : (x1 - x) / (x1 - x0)
    return flight.floor * H + Math.max(0, Math.min(1, t)) * H
  }
  return floor * H
}

/** Push a circle out of a segment it overlaps. */
function pushOutOfSegment(p: { x: number; z: number }, wall: PlanWall, r: number): void {
  const ax = wall.x0, az = wall.y0, bx = wall.x1, bz = wall.y1
  const dx = bx - ax, dz = bz - az, len2 = dx * dx + dz * dz || 1
  const t = Math.max(0, Math.min(1, ((p.x - ax) * dx + (p.z - az) * dz) / len2))
  const cx = ax + t * dx, cz = az + t * dz, ox = p.x - cx, oz = p.z - cz, dist = Math.hypot(ox, oz)
  if (dist >= r) return
  if (dist < 1e-6) { p.x += (dz / Math.sqrt(len2)) * r; p.z -= (dx / Math.sqrt(len2)) * r; return }
  p.x = cx + (ox / dist) * r; p.z = cz + (oz / dist) * r
}
function pushOutOfRect(p: { x: number; z: number }, [x0, z0, x1, z1]: readonly [number, number, number, number], r: number): void {
  const cx = Math.max(x0, Math.min(x1, p.x)), cz = Math.max(z0, Math.min(z1, p.z))
  const ox = p.x - cx, oz = p.z - cz, dist = Math.hypot(ox, oz)
  if (dist >= r) return
  if (dist > 1e-6) { p.x = cx + (ox / dist) * r; p.z = cz + (oz / dist) * r; return }
  // Inside: out by the nearest side.
  const sides = [[p.x - x0 + r, -1, 0], [x1 - p.x + r, 1, 0], [p.z - z0 + r, 0, -1], [z1 - p.z + r, 0, 1]] as const
  const [depth, sx, sz] = [...sides].sort((a, b) => a[0] - b[0])[0]!
  p.x += sx * depth; p.z += sz * depth
}

/** One step: move by (dx, dz) metres from `at`, sliding along what is in the way. */
export function step(ground: Ground, at: Walker, dx: number, dz: number): Walker {
  const r = WALKER.radius
  // Long moves go in short slices, so nothing is jumped through.
  const slices = Math.max(1, Math.ceil(Math.hypot(dx, dz) / (r * 0.5)))
  let p = { ...at }
  for (let i = 0; i < slices; i++) {
    const next = { x: p.x + dx / slices, z: p.z + dz / slices }
    for (let pass = 0; pass < 3; pass++) {
      for (const wall of ground.walls(p.floor)) pushOutOfSegment(next, wall, r)
      for (const block of ground.blocks(p.floor)) pushOutOfRect(next, block, r * 0.8)
    }
    const [bx0, bz0, bx1, bz1] = ground.bounds
    next.x = Math.max(bx0, Math.min(bx1, next.x)); next.z = Math.max(bz0, Math.min(bz1, next.z))
    const y = heightAt(ground, p.floor, next.x, next.z)
    const floor = Math.max(0, Math.min(ground.floors - 1, Math.round(y / WORLD.storey)))
    p = { ...p, x: next.x, z: next.z, y, floor }
  }
  return p
}

/** Where a joystick or keys move the walker: forward along the yaw, strafe across it, metres per second times seconds. */
export function moveOf(yaw: number, forward: number, right: number, speed: number, dt: number): { dx: number; dz: number } {
  const len = Math.hypot(forward, right)
  if (len < 0.05) return { dx: 0, dz: 0 }
  const f = forward / Math.max(1, len), s = right / Math.max(1, len)
  return { dx: (-Math.sin(yaw) * f + Math.cos(yaw) * s) * speed * dt, dz: (-Math.cos(yaw) * f - Math.sin(yaw) * s) * speed * dt }
}
