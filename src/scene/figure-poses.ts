/**
 * OWNER: character
 * Which pose of the drawn figure (src/scene/characters.ts POSES) shows each pose the game uses. No imports beyond types, so
 * tests and the scenes read it without the figure code.
 *
 * The game names its poses by what the body is doing (BodyPose, src/scene/body/poses.ts); the figure's joints are set per
 * pose in characters.ts. Every BodyPose has a figure pose of its own, so the drawn figure does what the activity says
 * (eats, cooks, washes, lies down) rather than standing by while the screen text does it.
 */
import type { BodyPose } from './body/poses.ts';
import type { Pose } from './characters.ts';

export const FIGURE_FOR_BODY_POSE: Readonly<Record<BodyPose, Pose>> = Object.freeze({
  idle: 'stand', walk: 'walk', jog: 'jog', sit: 'sit', interact: 'interact', dance: 'dance', lie: 'lie', soak: 'soak', wash: 'wash',
  bucket: 'bucket', cook: 'cook', cookLow: 'cookLow', eat: 'eat', drink: 'drink', homeDoor: 'door',
});

/** The body pose that matches a figure pose (the reverse of the table above; poses with no match of their own stand or interact). */
export const BODY_FOR_FIGURE: Readonly<Record<Pose, BodyPose>> = Object.freeze({
  stand: 'idle', relax: 'idle', talk: 'idle', sit: 'sit', walk: 'walk', jog: 'jog', wave: 'interact', work: 'interact', interact: 'interact',
  dance: 'dance', lie: 'lie', soak: 'soak', wash: 'wash', bucket: 'bucket', cook: 'cook', cookLow: 'cookLow', eat: 'eat', drink: 'drink', door: 'homeDoor',
});
