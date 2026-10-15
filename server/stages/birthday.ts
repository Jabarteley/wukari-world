/**
 * OWNER: social
 * BIRTHDAYS (docs/SMALLER-FEATURES.md, FEATURES.md #18): opt-in. A player may give a month and a day (never a year, never checked against the age the
 * game holds for safety, and unrelated to it) and say whether friends may see it. On the day the player gets a greeting and the friends who chose to
 * share are listed for each other. Nothing is public: not in the gist, not on the map, not on a profile card.
 *
 * STORED   ctx.collection(db, 'stages') = { v: 1, birthdays: { [publicId]: { m, d, share } } }. A new top-level collection, created on the first
 *          choice; nothing existing changes.
 * NOT DONE Passing property and reputation to a next character: a house, a stall or land belongs to one session's life and its city record, so a
 *          hand-over would have to move owned things between sessions (and undo their city rules) with no rollback. It is left out; see the doc.
 * Portable: no Node imports.
 */
import { lagosTime } from '../../src/game/clock.ts';

export interface Birthday { m: number; d: number; share: boolean }
export interface StagesCollection { v: 1; birthdays: Record<string, Birthday> }
const record = (value: unknown): value is Record<string, unknown> => value !== null && typeof value === 'object' && !Array.isArray(value);
const DAYS = [31, 29, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];

/** A month (1-12) and day that exist (29 February is allowed). */
export const validDate = (m: unknown, d: unknown): boolean => typeof m === 'number' && typeof d === 'number' && Number.isInteger(m) && Number.isInteger(d) && m >= 1 && m <= 12 && d >= 1 && d <= DAYS[m - 1]!;
/** Today's month and day in Lagos. */
export function todayIn(now: number): { m: number; y: number; d: number } {
  const date = new Date(lagosTime(now).day * 86400000);
  return { y: date.getUTCFullYear(), m: date.getUTCMonth() + 1, d: date.getUTCDate() };
}
const leap = (y: number): boolean => (y % 4 === 0 && y % 100 !== 0) || y % 400 === 0;
/** Is it this birthday today (Lagos)? 29 February is kept on 28 February in a year without one. */
export function isToday(birthday: Pick<Birthday, 'm' | 'd'>, now: number): boolean {
  const t = todayIn(now);
  return birthday.m === t.m && (birthday.d === t.d || (birthday.m === 2 && birthday.d === 29 && t.d === 28 && !leap(t.y)));
}
export function readBirthday(value: unknown): Birthday | null {
  return record(value) && validDate(value.m, value.d) ? { m: value.m as number, d: value.d as number, share: value.share === true } : null;
}
export function peekStages(db: unknown): StagesCollection {
  const found = record(db) ? db.stages : undefined;
  return record(found) && record(found.birthdays) ? found as unknown as StagesCollection : { v: 1, birthdays: {} };
}
export interface BirthdayView { mine: Birthday | null; today: boolean; friends: string[] }
/** What a player sees: their own choice, whether it is their day, and the names of friends who share and are celebrating today. `friends` are the player's friends with their names. */
export function viewOf(stages: StagesCollection, me: string, friends: readonly { id: string; name: string }[], now: number): BirthdayView {
  const mine = readBirthday(stages.birthdays[me]);
  const names = friends.flatMap((friend) => { const b = readBirthday(stages.birthdays[friend.id]); return b?.share && isToday(b, now) ? [friend.name.slice(0, 24)] : []; });
  return { mine, today: mine !== null && isToday(mine, now), friends: names.slice(0, 10) };
}
