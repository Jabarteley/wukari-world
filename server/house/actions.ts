/**
 * OWNER: agents (house agents, docs/HOUSE-AGENTS.md)
 * THE ACTION LIBRARY: a whole routine as ONE choice. "Open the shop" is not forty small steps decided by a model; it is one entry that runs by
 * rules, with no model, until its slot ends, and then the next entry is chosen from the day plan. Portable and pure: the clock is passed in.
 *
 *   open_shop   stand at the post and keep the counter        go_market  go to the market for stock before opening
 *   work_shift  stand at the post and help visitors           eat        away for lunch (at the eatery when the cast has one)
 *   announce    stand at the post and tell people about tonight   host_quiz  run the short quiz at the post
 *   give_tasks  stand at the post and hand out tasks (a stub until missions exist)
 *   go_home     away: not in any place, not counted
 *
 * planAt(spec, now) → { action, until }: which entry is running at `now` and when its slot ends. A day is the spec's working hours (Lagos time):
 * the hour before opening a seller is at the market; the middle hour of a long shift is lunch; before and after the hours the agent is at home.
 */
import { lagosTime } from '../../src/game/clock.ts';
import type { Role, Spec } from './cast.ts';

export const ACTION_IDS = ['open_shop', 'work_shift', 'go_market', 'eat', 'go_home', 'announce', 'host_quiz', 'give_tasks'] as const;
export type ActionId = typeof ACTION_IDS[number];
/** Where an action puts the agent: its post, the market, the eatery, or nowhere. */
export type Place = 'post' | 'market' | 'eatery' | 'nowhere';

export interface ActionDef { id: ActionId; label: string; /** What the people list shows beside the name. */ doing: string; place: Place }
export const ACTIONS: Readonly<Record<ActionId, ActionDef>> = Object.freeze({
  open_shop: { id: 'open_shop', label: 'Open the shop', doing: 'Minding the stall', place: 'post' },
  work_shift: { id: 'work_shift', label: 'Work a shift', doing: 'Helping visitors', place: 'post' },
  go_market: { id: 'go_market', label: 'Go to the market', doing: 'Buying stock', place: 'market' },
  eat: { id: 'eat', label: 'Eat', doing: 'Having lunch', place: 'eatery' },
  go_home: { id: 'go_home', label: 'Go home', doing: 'At home', place: 'nowhere' },
  announce: { id: 'announce', label: 'Tell people about tonight', doing: 'Spreading the word', place: 'post' },
  host_quiz: { id: 'host_quiz', label: 'Host the quiz', doing: 'Hosting a quiz', place: 'post' },
  give_tasks: { id: 'give_tasks', label: 'Hand out tasks', doing: 'Looking for helpers', place: 'post' },
});

const MAIN: Readonly<Record<Role, ActionId>> = Object.freeze({ seller: 'open_shop', guide: 'work_shift', marketer: 'announce', quiz: 'host_quiz', mission: 'give_tasks' });
const HOUR = 3600000;

export interface Slot { action: ActionId; /** Server ms at which this choice ends and the next is made. */ until: number }

/** The choice running at `now` (server ms) and when it ends. */
export function planAt(spec: Pick<Spec, 'role' | 'hours' | 'market' | 'eatery'>, now: number): Slot {
  const { open, close } = spec.hours;
  const span = ((close - open) % 24 + 24) % 24 || 24;
  const time = lagosTime(now);
  const at = time.minuteOfDay / 60;
  const rel = ((at - open) % 24 + 24) % 24; // hours since opening, 0 ≤ rel < 24
  const market = spec.role === 'seller' && spec.market !== undefined && span < 24;
  // The segments of one day in hours since opening: [from, to, action]. The first starts the hour before opening (a seller's trip to the market).
  const lunch = span >= 6 ? [span / 2 - 0.5, span / 2 + 0.5] as const : null;
  const segments: [number, number, ActionId][] = [];
  const main = MAIN[spec.role];
  if (lunch) segments.push([0, lunch[0], main], [lunch[0], lunch[1], 'eat'], [lunch[1], span, main]);
  else segments.push([0, span, main]);
  if (span < 24) segments.push(market ? [span, 24 - 1, 'go_home'] : [span, 24, 'go_home']);
  if (span < 24 && market) segments.push([23, 24, 'go_market']);
  for (const [from, to, action] of segments) {
    if (rel >= from && rel < to) return { action, until: now + Math.max(1, Math.round((to - rel) * 60)) * 60000 };
  }
  return { action: 'go_home', until: now + HOUR };
}

/** The eight actions as a list, for the admin page and the docs. */
export const actionList = (): ActionDef[] => ACTION_IDS.map((id) => ACTIONS[id]);
