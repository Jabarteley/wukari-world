// When to offer settling in: the rule, the cap and the quiet time. Pure. Fetched with the goal chip (src/app/features/life/GoalChip.vue);
// the memory the rule reads (nudgeMemory, NudgeMemory) stays in ./model.ts with the first download's storage code.
import type { NudgeMemory } from './model.ts';

/** The most times the "Make this life yours" sheet opens by itself for one life. Tapping Home, Buy or the goal is not counted. */
export const NUDGE_CAP = 3;
/** How long an offer that was set aside (Not now, or closed) stays quiet, however the player left it: through the rest of the session, a reload and the next visit that day. */
export const NUDGE_QUIET_MS = 12 * 3600000;
/**
 * Should the settle-in sheet be offered now, and why? Never while something is running, never
 * past the cap, each reason once:
 *   'first-reward'    the first activity has just paid
 *   'third-activity'  three activities done and still a guest
 *   'next-day'        a later Lagos day than the last offer
 * An offer that was shown is then quiet for NUDGE_QUIET_MS (the memory is kept on the device, so a reload does not bring it
 * back). `at` is server time. A remembered `until` further away than one quiet period is not believed (a clock that moved).
 * Tapping Home, Buy or the goal opens the sheet directly and never asks this.
 */
export function nextNudge(facts: { guest: boolean; activities: number; firstAt: number | null; busy: boolean; day: number; at: number }, memory: NudgeMemory): string | null {
  if (!facts.guest || facts.busy || memory.count >= NUDGE_CAP) return null;
  if (memory.until !== null && facts.at < memory.until && memory.until - facts.at <= NUDGE_QUIET_MS) return null;
  const fresh = (reason: string): boolean => !memory.reasons.includes(reason);
  if (facts.firstAt !== null && fresh('first-reward')) return 'first-reward';
  if (facts.activities >= 3 && fresh('third-activity')) return 'third-activity';
  if (memory.day !== null && facts.day > memory.day && fresh(`day-${facts.day}`) && memory.reasons.includes('first-reward')) return 'next-day';
  return null;
}
/** The memory after an offer was shown. */
export const nudged = (memory: NudgeMemory, reason: string, day: number | null, at: number): NudgeMemory => ({ count: memory.count + 1, reasons: [...memory.reasons, reason === 'next-day' ? `day-${day}` : reason].slice(-12), day, until: at + NUDGE_QUIET_MS });
