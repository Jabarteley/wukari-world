/**
 * OWNER: world
 * The city map's free camera, the parts that are plain arithmetic: turning and tipping the view from the keyboard (eased, held
 * keys keep turning), telling a two-finger tilt from a pinch, and what the compass says. No DOM, no THREE, so it runs under
 * `node --test`. The host is src/map3d/map3d.ts; the camera itself (and its pitch limits) is ./camera.ts.
 *
 * KEYS. [ and ] turn the city, PgUp and PgDn tip it (the shell's 'look-left' | 'look-right' | 'look-up' | 'look-down').
 * A tap is one step, eased; a key held keeps turning at a steady rate until it is let go; the view eases to a stop. With
 * reduced motion a step lands at once. The tilt never asks for more than the camera allows (the limits are passed in), so a
 * key held against a limit does not wind up a turn that has to unwind before the other key works.
 *
 * TWO FINGERS. A pinch zooms, twists and moves as before. Two fingers side by side that slide up or down together tip the
 * view (as in other map apps): the gesture is told apart within its first few pixels and keeps its kind until a finger lifts.
 */

export type LookAction = 'look-left' | 'look-right' | 'look-up' | 'look-down';
/** One step of a tapped key (radians), and how fast a held key turns (radians a second). */
export const KEY_YAW_STEP = 0.16, KEY_PITCH_STEP = 0.1, KEY_YAW_RATE = 1.5, KEY_PITCH_RATE = 0.8;
/** How quickly the view catches up with a key's turn (per second, exponential, like src/scene/camera-controls.ts). */
export const KEY_EASE = 14;
/** Radians of tilt for each pixel two fingers slide together (down tips towards straight down, up towards the horizon). */
export const TILT_PER_PX = 0.0045;

const clamp = (value: number, low: number, high: number) => Math.max(low, Math.min(high, value));
const DIRECTIONS: Record<LookAction, { yaw: number; pitch: number }> = { 'look-left': { yaw: -1, pitch: 0 }, 'look-right': { yaw: 1, pitch: 0 }, 'look-up': { yaw: 0, pitch: 1 }, 'look-down': { yaw: 0, pitch: -1 } };
export const isLook = (action: unknown): action is LookAction => typeof action === 'string' && Object.hasOwn(DIRECTIONS, action);

export interface KeyTurn {
  /** A look key went down (a repeat of a key already held does nothing). */
  press(action: LookAction): void
  /** A look key came up. */
  release(action: LookAction): void
  /** Every key let go, and what was still to turn dropped (the window lost focus, the map was hidden, the player took over). */
  stop(): void
  /** The turn to apply this frame. `pitch` is the view's tilt now and [min, max] what it may be; `instant` lands it at once (reduced motion). */
  step(dt: number, pitch: number, min: number, max: number, instant?: boolean): { yaw: number; pitch: number }
  /** A key is held, or a turn is still easing out. */
  readonly active: boolean
}

export function createKeyTurn(): KeyTurn {
  const held = new Set<LookAction>();
  // What is still to turn: the steps asked for plus what the held keys have added, eased out a share each frame.
  let owedYaw = 0, owedPitch = 0;
  const direction = () => { let yaw = 0, pitch = 0; for (const action of held) { yaw += DIRECTIONS[action].yaw; pitch += DIRECTIONS[action].pitch; } return { yaw, pitch }; };
  return {
    press(action) {
      if (held.has(action)) return;
      held.add(action);
      owedYaw += DIRECTIONS[action].yaw * KEY_YAW_STEP; owedPitch += DIRECTIONS[action].pitch * KEY_PITCH_STEP;
    },
    release(action) { held.delete(action); },
    stop() { held.clear(); owedYaw = 0; owedPitch = 0; },
    step(dt, pitch, min, max, instant = false) {
      const way = direction();
      owedYaw += way.yaw * KEY_YAW_RATE * dt; owedPitch += way.pitch * KEY_PITCH_RATE * dt;
      // The tilt still owed never reaches past the limits: what the camera cannot take is dropped, not saved up.
      owedPitch = clamp(pitch + owedPitch, min, max) - pitch;
      const share = instant ? 1 : 1 - Math.exp(-KEY_EASE * dt);
      let yaw = owedYaw * share, tilt = owedPitch * share;
      if (Math.abs(owedYaw - yaw) < 0.0008) yaw = owedYaw;
      if (Math.abs(owedPitch - tilt) < 0.0008) tilt = owedPitch;
      owedYaw -= yaw; owedPitch -= tilt;
      return { yaw, pitch: tilt };
    },
    get active() { return held.size > 0 || owedYaw !== 0 || owedPitch !== 0; },
  };
}

type Pt = { x: number; y: number };
export type TwoFingerKind = 'pending' | 'tilt' | 'pinch';
/** How far (CSS pixels) both fingers must slide together before it is a tilt; a pinch is told after this much of any movement. */
export const TILT_START = 8, PINCH_START = 6;
/**
 * What two fingers are doing, from where they went down (a0, b0) to where they are (a1, b1):
 *   'tilt'     both slide up or down together, side by side, without spreading or twisting
 *   'pinch'    anything else that has moved (spread, twist, or travel)
 *   'pending'  not enough movement yet to tell
 */
export function classifyTwoFinger(a0: Pt, b0: Pt, a1: Pt, b1: Pt): TwoFingerKind {
  const ax = a1.x - a0.x, ay = a1.y - a0.y, bx = b1.x - b0.x, by = b1.y - b0.y;
  const d0 = Math.hypot(b0.x - a0.x, b0.y - a0.y) || 1, d1 = Math.hypot(b1.x - a1.x, b1.y - a1.y);
  const spread = Math.abs(d1 - d0), turned = Math.abs(Math.atan2(b1.y - a1.y, b1.x - a1.x) - Math.atan2(b0.y - a0.y, b0.x - a0.x));
  const twist = Math.min(turned, Math.PI * 2 - turned);
  const moved = Math.max(Math.hypot(ax, ay), Math.hypot(bx, by));
  // Fingers side by side: the line between them is nearer flat than upright.
  const sideBySide = Math.abs(b0.x - a0.x) >= Math.abs(b0.y - a0.y);
  const together = Math.sign(ay) === Math.sign(by) && ay !== 0;
  const upright = (dx: number, dy: number) => Math.abs(dy) > Math.abs(dx) * 2;
  // A spread or a twist past a small allowance is a pinch at once, so zooming starts as quickly as before.
  if (spread > Math.max(PINCH_START, d0 * 0.06) || twist > 0.07) return 'pinch';
  if (sideBySide && together && upright(ax, ay) && upright(bx, by)) return Math.min(Math.abs(ay), Math.abs(by)) >= TILT_START ? 'tilt' : 'pending';
  return moved >= PINCH_START ? 'pinch' : 'pending';
}
/** The tilt of a two-finger slide: the middle of the two fingers moved `dy` pixels (down is positive, and tips towards straight down). */
export const tiltOf = (dy: number): number => dy * TILT_PER_PX;

const POINTS = ['north', 'north-east', 'east', 'south-east', 'south', 'south-west', 'west', 'north-west'] as const;
/**
 * What the compass shows. The camera looks along (−sin yaw, −cos yaw) on the ground, and north is −z (east +x), so the
 * view faces the bearing −yaw; on screen, north sits `needle` degrees clockwise from straight up. `tilt` is how far the view
 * is tipped from straight down, in degrees.
 */
export function compassOf(yaw: number, pitch: number): { bearing: number; needle: number; tilt: number; facing: string; label: string } {
  const degrees = (yaw * 180) / Math.PI;
  const bearing = ((Math.round(-degrees) % 360) + 360) % 360, needle = Math.round(degrees);
  const tilt = Math.round(90 - (pitch * 180) / Math.PI), facing = POINTS[Math.round(bearing / 45) % 8]!;
  return { bearing, needle, tilt, facing, label: `Facing ${facing}, tipped ${tilt}°. Turn the map back to north up` };
}
