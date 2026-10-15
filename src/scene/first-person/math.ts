const PI = Math.PI
const MAX_PITCH = (80 * PI) / 180
const CONE_COS = Math.cos((20 * PI) / 180)

export interface EyePoseInput {
  x: number
  y: number
  z: number
  yaw: number
  pitch: number
  scale?: number
  pose?: 'stand' | 'sit' | 'lie' | 'soak' | (string & {})
  seat?: number
  phase?: number
  moving?: boolean
  bob?: boolean
  reducedMotion?: boolean
}

export interface EyePose {
  x: number
  y: number
  z: number
  lookX: number
  lookY: number
  lookZ: number
}

export interface Point3 {
  x: number
  y: number
  z: number
}

/** Whether a solid axis-aligned box blocks the segment before it reaches its target. */
export function targetOccluded(eye: Point3, target: Point3, boxes: readonly number[][]): boolean {
  if (![eye.x, eye.y, eye.z, target.x, target.y, target.z].every(Number.isFinite)) return false
  const direction = { x: target.x - eye.x, y: target.y - eye.y, z: target.z - eye.z }
  for (const box of boxes) {
    if (box.length < 6 || !box.slice(0, 6).every(Number.isFinite)) continue
    const min = [Math.min(box[0]!, box[3]!), Math.min(box[1]!, box[4]!), Math.min(box[2]!, box[5]!)]
    const max = [Math.max(box[0]!, box[3]!), Math.max(box[1]!, box[4]!), Math.max(box[2]!, box[5]!)]
    const inside = (point: Point3): boolean => point.x >= min[0]! && point.x <= max[0]!
      && point.y >= min[1]! && point.y <= max[1]! && point.z >= min[2]! && point.z <= max[2]!
    if (inside(target) || inside(eye)) continue
    let enter = 0, exit = 1, separated = false
    const origin = [eye.x, eye.y, eye.z], delta = [direction.x, direction.y, direction.z]
    for (let axis = 0; axis < 3; axis++) {
      const d = delta[axis]!, o = origin[axis]!
      if (d === 0) { if (o < min[axis]! || o > max[axis]!) separated = true; continue }
      let near = (min[axis]! - o) / d, far = (max[axis]! - o) / d
      if (near > far) [near, far] = [far, near]
      enter = Math.max(enter, near); exit = Math.min(exit, far)
      if (enter >= exit) { separated = true; break }
    }
    if (!separated && enter >= 0 && enter < 1) return true
  }
  return false
}

const finiteOr = (value: number | undefined, fallback = 0): number => typeof value === 'number' && Number.isFinite(value) ? value : fallback

/** Wrap an angle to the bounded interval [-π, π]. Non-finite input becomes zero. */
export function wrapYaw(yaw: number): number {
  const value = finiteOr(yaw)
  let wrapped = ((value + PI) % (2 * PI) + 2 * PI) % (2 * PI) - PI
  // Keep the positive endpoint available only through the negative equivalent.
  if (wrapped === PI) wrapped = -PI
  return wrapped
}

/** Clamp look pitch to a comfortable ±80° range. Non-finite input becomes level. */
export function clampPitch(pitch: number): number {
  return Math.max(-MAX_PITCH, Math.min(MAX_PITCH, finiteOr(pitch)))
}

/**
 * Calculate an eye position and a one-unit look point using the scene's avatar convention:
 * forward is (+sin(yaw), +cos(yaw)). `y` is the floor/support height.
 */
export function eyePose(input: EyePoseInput): EyePose {
  const scale = Math.max(0, finiteOr(input.scale, 1))
  const x = finiteOr(input.x), y = finiteOr(input.y), z = finiteOr(input.z)
  const yaw = wrapYaw(input.yaw), pitch = clampPitch(input.pitch)
  const pose = input.pose ?? 'stand'
  const seatHeight = Math.max(0, finiteOr(input.seat, 0.48 * scale))
  const eyeY = pose === 'lie' || pose === 'sleep'
    ? y + seatHeight + 0.28 * scale
    : pose === 'sit' || pose === 'soak'
      ? y + seatHeight + 1.15 * scale
      : y + 2.3 * scale
  const bob = Boolean(input.bob && input.moving && !input.reducedMotion)
    ? Math.sin(finiteOr(input.phase)) * 0.025 * scale
    : 0
  const eye = eyeY + bob
  const forward = Math.cos(pitch)
  return {
    x,
    y: eye,
    z,
    lookX: x + Math.sin(yaw) * forward,
    lookY: eye + Math.sin(pitch),
    lookZ: z + Math.cos(yaw) * forward,
  }
}

/** Select the nearest unobstructed target inside a strict 3D reach and 20° forward cone. */
export function selectTarget<T extends Point3 & { id: string }>(
  eye: Point3,
  direction: Point3,
  targets: readonly T[],
  reach: number,
  blocked: (target: T) => boolean = () => false,
): T | null {
  const ex = finiteOr(eye.x), ey = finiteOr(eye.y), ez = finiteOr(eye.z)
  const dx = finiteOr(direction.x), dy = finiteOr(direction.y), dz = finiteOr(direction.z)
  const directionLength = Math.hypot(dx, dy, dz)
  const maxReach = finiteOr(reach)
  if (!(directionLength > 0) || !(maxReach > 0)) return null
  const nx = dx / directionLength, ny = dy / directionLength, nz = dz / directionLength
  let selected: T | null = null, selectedDot = -Infinity, selectedDistance = Infinity
  for (const target of targets) {
    if (blocked(target)) continue
    if (![target.x, target.y, target.z].every(Number.isFinite)) continue
    const tx = target.x, ty = target.y, tz = target.z
    const vx = tx - ex, vy = ty - ey, vz = tz - ez
    const distance = Math.hypot(vx, vy, vz)
    if (!(distance > 0) || distance > maxReach) continue
    const dot = (vx * nx + vy * ny + vz * nz) / distance
    if (dot < CONE_COS) continue
    if (dot > selectedDot + 1e-9 || (Math.abs(dot - selectedDot) <= 1e-9 && distance < selectedDistance)) {
      selected = target
      selectedDot = dot
      selectedDistance = distance
    }
  }
  return selected
}
