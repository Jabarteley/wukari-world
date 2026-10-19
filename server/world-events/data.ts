/**
 * OWNER: world events (docs/WORLD-EVENTS.md)
 * WHAT IS STORED, in one collection of its own:
 *
 *   ctx.collection(db, 'worldEvents') = {
 *     v: 1,
 *     admin:   { seq, schedule, events, hidden }       what an admin changed (no release needed; src/world-events/model.ts checks it)
 *     runs:    { [week]: Run }                          the counter of each week's event; the last RUNS_KEPT weeks
 *     badges:  { [publicId]: EventBadge[] }             one per event a player helped with; the newest BADGES_KEPT
 *     changes: { [cityId]: CityChangeView }             a city that looks different until `until` (a week after its event)
 *     stages:  { [roomKey]: Stage }                     the stage open in a room (src/world-events/stage.ts)
 *     nights:  { [week]: Night }                        election night: the debates chosen, the speeches, the result lines written
 *   }
 *
 * Keyed (server/keyed.ts): `badges`, and each run's `by` and `keys`, so one step rewrites one small entry, not the whole collection.
 * Public ids only, never a session secret. Erasure: forgetWorldEventPlayers (server/admin/erasure-data.ts).
 */
import type { Drop, Schedule, WorldEventDef } from '../../src/world-events/model.ts';
import type { Stage } from '../../src/world-events/stage.ts';
import type { CityChangeView, EventBadge } from '../../src/types/world-events.ts';
import type { Db, RouteContext } from '../types.ts';

export const RUNS_KEPT = 4, BADGES_KEPT = 26, NIGHTS_KEPT = 3;

export interface Run {
  week: number
  /** The event as it was when the run began (an admin's later edit does not change a running event). */
  def: WorldEventDef
  count: number
  /** Steps added by AI: the game's residents and AI-played characters. */
  ai: number
  /** Steps by each contributor (a person, or a character an AI plays). */
  by: Record<string, number>
  /** Contributors who are AI-played characters (labelled AI). */
  agents: Record<string, 1>
  /** Steps by each AI resident, by name. */
  aiBy: Record<string, number>
  /** What was already counted (`g:<id>:<venue>`, `d:<id>:<n>`, `a:<id>:<question>`, `x:<id>:<drop>`). */
  keys: Record<string, 1>
  /** Who holds a load, since when. */
  carrying: Record<string, number>
  /** Drop id → who took one. */
  grabbed: Record<string, string[]>
  /** Drops an admin sent ("the admins are in town"). */
  drops: Drop[]
  doneAt: number
  /** Gist lines written: 'announce' | 'warmup' | 'live' | 'result' → the line's number (0: the gist left it out). */
  lines: Record<string, number>
}
export interface Night {
  week: number
  /** Scopes chosen for the Friday debate, in slot order (empty: none). */
  debates: string[]
  /** Set once the debates were chosen, so the choice is made once. */
  chosen: boolean
  /** The words of each debated race: place and title. */
  names: Record<string, { place: string; title: string }>
  /** One speech per seat, by its winner. */
  speeches: Record<string, { id: string; name: string; text: string; at: number; title: string; place: string; ai?: true }>
  /** Result lines written, by scope: the gist number. */
  cards: Record<string, number>
}
export interface WorldEventsCollection {
  v: 1
  admin: { seq: number; schedule: Partial<Schedule> | null; events: WorldEventDef[]; hidden: string[] }
  runs: Record<string, Run>
  badges: Record<string, EventBadge[]>
  changes: Record<string, CityChangeView>
  stages: Record<string, Stage>
  nights: Record<string, Night>
}

const record = (value: unknown): value is Record<string, unknown> => value !== null && typeof value === 'object' && !Array.isArray(value);
export const emptyWorldEvents = (): WorldEventsCollection => ({ v: 1, admin: { seq: 0, schedule: null, events: [], hidden: [] }, runs: {}, badges: {}, changes: {}, stages: {}, nights: {} });

/** The collection, made or repaired in place so damaged data cannot crash a route. Inside a transaction. */
export function worldEventsOf(ctx: Pick<RouteContext, 'collection'>, db: Db): WorldEventsCollection {
  const found = ctx.collection(db, 'worldEvents', emptyWorldEvents()) as Partial<WorldEventsCollection>;
  if (!record(found.admin)) found.admin = { seq: 0, schedule: null, events: [], hidden: [] };
  const admin = found.admin as Partial<WorldEventsCollection['admin']>;
  if (typeof admin.seq !== 'number') admin.seq = 0;
  if (!Array.isArray(admin.events)) admin.events = [];
  if (!Array.isArray(admin.hidden)) admin.hidden = [];
  if (!record(admin.schedule)) admin.schedule = null;
  for (const key of ['runs', 'badges', 'changes', 'stages', 'nights'] as const) if (!record(found[key])) found[key] = {};
  found.v = 1;
  return found as WorldEventsCollection;
}
/** What a read sees: nothing is created. */
export function peekWorldEvents(db: Db): WorldEventsCollection {
  const found = (db as unknown as Record<string, unknown>).worldEvents;
  if (!record(found)) return emptyWorldEvents();
  const empty = emptyWorldEvents();
  return { v: 1, admin: record(found.admin) ? found.admin as WorldEventsCollection['admin'] : empty.admin, runs: record(found.runs) ? found.runs as WorldEventsCollection['runs'] : {}, badges: record(found.badges) ? found.badges as WorldEventsCollection['badges'] : {},
    changes: record(found.changes) ? found.changes as WorldEventsCollection['changes'] : {}, stages: record(found.stages) ? found.stages as WorldEventsCollection['stages'] : {}, nights: record(found.nights) ? found.nights as WorldEventsCollection['nights'] : {} };
}
/** A run, repaired in place (inside a transaction). */
export function repairRun(run: Run): Run {
  for (const key of ['by', 'agents', 'aiBy', 'keys', 'carrying', 'grabbed', 'lines'] as const) if (!record(run[key])) (run as unknown as Record<string, unknown>)[key] = {};
  if (!Array.isArray(run.drops)) run.drops = [];
  for (const key of ['count', 'ai', 'doneAt'] as const) if (typeof run[key] !== 'number' || !Number.isFinite(run[key])) run[key] = 0;
  return run;
}

/**
 * ERASURE (server/admin/erasure-data.ts): a player who is erased leaves no trace here. Their badges and the record of what they did go; the
 * counts they added stay, as numbers with no name (a bar does not go backwards because someone left the game).
 */
export function forgetWorldEventPlayers(db: Db, ids: readonly string[]): void {
  const found = (db as unknown as Record<string, unknown>).worldEvents;
  if (!record(found) || !ids.length) return;
  const gone = new Set(ids), col = found as unknown as WorldEventsCollection;
  if (record(col.badges)) for (const id of ids) delete col.badges[id];
  if (record(col.runs)) for (const run of Object.values(col.runs)) {
    if (!record(run)) continue;
    for (const id of ids) { if (record(run.by)) delete run.by[id]; if (record(run.agents)) delete run.agents[id]; if (record(run.carrying)) delete run.carrying[id]; }
    if (record(run.keys)) for (const key of Object.keys(run.keys)) if (gone.has(key.split(':')[1] ?? '')) delete run.keys[key];
    if (record(run.grabbed)) for (const [drop, list] of Object.entries(run.grabbed)) if (Array.isArray(list)) run.grabbed[drop] = list.filter((id) => !gone.has(id));
  }
  if (record(col.stages)) for (const stage of Object.values(col.stages)) {
    if (!record(stage)) continue;
    if (stage.moderator && gone.has(stage.moderator)) stage.moderator = null;
    stage.speakers = (stage.speakers ?? []).filter((item) => !gone.has(item.id));
    stage.invited = (stage.invited ?? []).filter((item) => !gone.has(item.id));
    stage.hands = (stage.hands ?? []).filter((item) => !gone.has(item.id));
    stage.questions = (stage.questions ?? []).filter((item) => !gone.has(item.by)).map((item) => ({ ...item, votes: (item.votes ?? []).filter((id) => !gone.has(id)) }));
  }
  if (record(col.nights)) for (const night of Object.values(col.nights)) if (record(night) && record(night.speeches)) for (const [scope, speech] of Object.entries(night.speeches)) if (gone.has(speech.id)) delete night.speeches[scope];
}
