// Where a voice is: how loud, how dull and how far to one side, from the speaker's distance and screen position. Pure.

/** Within this many scene units a voice is at full level. */
export const NEAR = 2.5
/** Beyond this it is a murmur at the floor level. */
export const FAR = 24
/** The quietest a voice gets (a far murmur), as a share of full. */
export const FLOOR_GAIN = 0.14

/** Level 0..1 for a distance: full when near, falling smoothly to a quiet murmur far off. */
export function gainAt(distance: number): number {
  if (!(distance > NEAR)) return 1
  const t = Math.min(1, (distance - NEAR) / (FAR - NEAR))
  return FLOOR_GAIN + (1 - FLOOR_GAIN) * Math.pow(1 - t, 2)
}
/** Lowpass cutoff in Hz: a far voice loses its edges. */
export function cutoffAt(distance: number): number {
  const t = Math.min(1, Math.max(0, (distance - NEAR) / (FAR - NEAR)))
  return 7000 - t * 5200
}
/** Stereo pan from the screen position (-1 left .. 1 right), kept off the extremes so a voice never sits in one ear. */
export const panOf = (screenX: number): number => Math.max(-0.8, Math.min(0.8, screenX * 0.8))
/** Pan from where a speaker stands relative to the listener, when no screen position is known (scene units, +x is right). */
export const panFromOffset = (dx: number): number => panOf(dx / 9)
/** Distance between two points on the floor. */
export const distanceOf = (a: { x: number; z: number }, b: { x: number; z: number }): number => Math.hypot(a.x - b.x, a.z - b.z)
