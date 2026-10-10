/**
 * OWNER: character
 * The mood a figure's face shows, read from the life state the way the HUD reads it (needs → Happy, Okay, Uneasy, Miserable).
 * characters.ts moodExpression turns the word into a face.
 */
import { moodOf } from '../game/systems/needs.ts';
import type { LifeState } from '../types/life.ts';

/** The player's mood word, or '' when the state has none (a partial state, a test). */
export function moodWordOf(state: unknown): string {
  try { return state && typeof state === 'object' ? moodOf(state as Pick<LifeState, 'needs' | 'moodlets'>).label : ''; } catch { return ''; }
}
