/**
 * OWNER: character
 * What keeps a drawn figure alive between poses. Pure functions of time, no state and no geometry: a host calls
 * poseAvatar(figure, { pose, time, ... }) (src/scene/characters.ts), which sets the pose and then asks for this on top.
 *
 *   breathing      the chest swells and settles
 *   weight shift   the body leans a little from one side to the other, slowly
 *   head           a small drift and nod, and a turn towards what the figure looks at (lookAvatar)
 *   blink          the eyelid part is shown for a moment, on a period of its own for each figure
 *   speaking       the mouth part opens and closes, a hand lifts and the head nods
 *
 * Every figure has its own phase (from its seed), so a group never moves in unison. The amplitudes are small; a walking or
 * dancing figure keeps its own motion and only blinks.
 */
import type { Pose } from './characters.ts';

/** The nodes of a rigged figure this reads: the parts of buildAvatar(…, { rig: true }). */
interface Node3 {
  rotation: { x: number; y: number; z: number };
  position: { x: number; y: number; z: number };
  scale: { x: number; y: number; z: number; set(x: number, y: number, z: number): unknown };
  visible: boolean;
}
export interface LifeParts { body: Node3; torso: Node3; head: Node3; armL: Node3; armR: Node3; lids?: Node3; mouth?: Node3 }
export interface LifeOptions {
  /** Seconds on any steady clock. */
  time: number;
  /** The figure's own offset (figurePhase), 0 … 1. */
  phase: number;
  pose: Pose;
  /** Mouth moving. */
  speaking?: boolean;
  /** Where the figure looks, radians from straight ahead (set by lookAvatar). */
  gaze?: number;
  /** Force the eyes closed (true) or open (false); left out, the figure blinks on its own period. */
  blink?: boolean;
  /** How much of the ambient movement to show, 0 … 1 (a beat fades in and out, so a figure ends each one exactly at rest). Default 1. */
  amount?: number;
}

const TAU = Math.PI * 2;
/** How much of each ambient movement a pose shows: 1 at ease, less when something else is moving the body. */
const CALM: Partial<Record<Pose, number>> = { stand: 1, relax: 1, talk: 1, wave: 0.6, sit: 0.8, soak: 0.6, interact: 0.5, work: 0.4, cook: 0.4, eat: 0.5, drink: 0.4, lie: 0.5, door: 0.2 };

/** A steady offset from a seed's hash: 0 … 1. */
export function figurePhase(hash: number): number { return (hash % 9973) / 9973; }

/** Whether a figure's eyes are closed at `time`: about every 3 to 5 seconds, for a tenth of a second, and now and then twice. */
export function blinking(time: number, phase: number): boolean {
  const cycle = 3.2 + 1.8 * ((phase * 13.7) % 1), at = (time + phase * 11) % cycle;
  return at < 0.11 || (phase > 0.7 && at > 0.26 && at < 0.36);
}

/** The mouth's opening while speaking, 0 … 1 (a few syllables a second, never the same twice in a row). */
export function mouthOpening(time: number, phase: number): number {
  const syllable = Math.abs(Math.sin(time * 9.2 + phase * 6)) * (0.55 + 0.45 * Math.sin(time * 3.1 + phase * 17));
  return Math.min(1, Math.max(0.12, syllable));
}

/** Put the ambient life on a posed figure. Call it after the pose has been set (it adds to the pose; it never accumulates). */
export function applyLife(parts: LifeParts, { time, phase, pose, speaking = false, gaze = 0, blink, amount = 1 }: LifeOptions): void {
  const calm = (CALM[pose] ?? 0) * Math.max(0, Math.min(1, amount)), t = time + phase * 40, own = 0.85 + phase * 0.3;
  const breath = Math.sin(t * TAU / (3.6 * own));
  if (calm > 0) {
    parts.torso.scale.set(1 + 0.004 * breath * calm, 1 + 0.011 * breath * calm, 1 + 0.008 * breath * calm);
    parts.body.rotation.z = 0.014 * Math.sin(t * 0.5 * own) * calm;
    parts.body.position.x = 0.012 * Math.sin(t * 0.5 * own + 1.3) * calm;
    parts.armR.rotation.x += 0.03 * Math.sin(t * 0.9 + 1) * calm;
    parts.armL.rotation.x += 0.03 * Math.sin(t * 0.8 + 2.4) * calm;
  } else parts.torso.scale.set(1, 1, 1);
  const headYaw = Math.max(-0.95, Math.min(0.95, gaze * 0.65));
  parts.head.rotation.y = headYaw + (calm > 0 ? 0.05 * Math.sin(t * 0.37 * own + 2) * calm : 0);
  parts.head.rotation.x = (calm > 0 ? 0.035 * Math.sin(t * 0.71 * own) * calm : 0) + (speaking ? 0.045 * Math.sin(time * 6.3 + phase * 9) : 0);
  if (speaking && calm > 0) parts.armR.rotation.x += 0.2 * Math.sin(time * 4.6 + phase * 5);
  if (parts.lids) parts.lids.visible = blink ?? blinking(time, phase);
  if (parts.mouth) {
    parts.mouth.visible = speaking;
    if (speaking) parts.mouth.scale.set(1, 0.25 + 0.95 * mouthOpening(time, phase), 1);
  }
}

/** A figure drawn as one piece (a regular, another player): it has no joints, so the whole body breathes and sways a little. */
export interface WholeFigure {
  rotation: { z: number };
  scale: { x: number; y: number; z: number; set(x: number, y: number, z: number): unknown };
  userData: { phase?: number; base?: { x: number; y: number; z: number } | undefined };
}
export function applyIdle(figure: WholeFigure, time: number, amount = 1): void {
  const base = (figure.userData.base ??= { x: figure.scale.x, y: figure.scale.y, z: figure.scale.z });
  const phase = figure.userData.phase ?? 0, t = time + phase * 40, k = Math.max(0, Math.min(1, amount)), breath = Math.sin(t * TAU / (3.6 * (0.85 + phase * 0.3)));
  figure.scale.set(base.x * (1 + 0.004 * breath * k), base.y * (1 + 0.009 * breath * k), base.z * (1 + 0.006 * breath * k));
  figure.rotation.z = 0.016 * Math.sin(t * 0.5 + 1.3) * k;
}
