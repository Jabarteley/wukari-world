/**
 * OWNER: world events (docs/WORLD-EVENTS.md)
 * THE WEEKLY WORLD EVENT ENGINE. The rules are src/world-events/model.ts; this keeps the counter and decides every step.
 *
 * NO NUMBER FROM THE PAGE. The bar moves only for something the server saw for itself:
 *   gather    'room-changed' (server/ws/rooms.ts) for a person who is now in a venue room of the event's city: the room module admits a
 *             person only where their stored life stands. Counted once per person and venue.
 *   deliver   POST /api/world/event/step { op: 'pickup' } while the caller is in the first venue's room, then { op: 'drop' } while in the
 *             second's, DELIVER_MIN_MS to DELIVER_MAX_MS later. ctx.checks.inRoom is asked each time.
 *   answer    { op: 'answer', question, answer } from someone connected: the accepted answers never leave the server; one try a question.
 *   grab      { op: 'grab' } a warm-up drop, while standing in the Square and the drop is open; DROP_CAPACITY people each.
 * One person adds at most PER_PERSON_MAX steps. A person's first step gives them the event's badge, once (badges[publicId]).
 *
 * THE HEARTBEAT (at most every TICK_MS) writes the gist lines (announced, warm-up, live, result), lets the city's AI residents add their
 * share (aiDue: a setting, worldEventAiShare, default 35% of the target, spread over the hour; they are named and labelled AI, never
 * enough alone), ends a city's change a week after its event and drops old runs. Gist lines go to the world list (every city reads it).
 * The people in the Square and at the event's venues are sent `world-live` frames when the bar moves (at most every PUSH_MS).
 */
import { AI_SHARE_DEFAULT, AI_SHARE_MAX, CHANGE_MS, DELIVER_MAX_MS, DELIVER_MIN_MS, DROP_CAPACITY, LIMITS, PER_PERSON_MAX, aiDue, currentOccurrence, dropsOf, eventList, lineAnnounced, lineLive, lineResult, lineWarmup, normalAnswer, openDrop, percentOf, scheduleOf } from '../../src/world-events/model.ts';
import type { Occurrence, Phase, WorldEventExtras } from '../../src/world-events/model.ts';
import { SQUARE_ROOM } from '../../src/places/model.ts';
import { cityRules, cityCatalogueEntry } from '../../src/game/cities/registry.ts';
import { venueFor } from '../../src/game/cities/runtime.ts';
import { gistService, isAiCharacter, WORLD } from '../gist/ledger.ts';
import { residentsInCity } from '../residents/world.ts';
import { registerAdminSetting } from '../admin/settings.ts';
import { BADGES_KEPT, RUNS_KEPT, peekWorldEvents, repairRun, worldEventsOf } from './data.ts';
import type { Run, WorldEventsCollection } from './data.ts';
import type { CityChangeView, EventHelper, EventStepOp, WorldEventMine, WorldEventPublic, WorldEventView, WorldLiveFrame } from '../../src/types/world-events.ts';
import type { ServerFrame } from '../../src/types/protocol.ts';
import type { Db, RouteContext, SessionRecord } from '../types.ts';

export const TICK_MS = 15000, PUSH_MS = 4000;
const HELPERS_PER_CITY = 3;

/** A city's name: its rules when loaded, else the catalogue's, else the id. */
export function placeName(id: string): string {
  try { return cityRules(id)?.name ?? cityCatalogueEntry(id)?.name ?? id; } catch { return id; }
}
/** A venue's name when the city's content is loaded, else a tidy form of its id. */
export function venueName(city: string, id: string): string {
  try { const found = venueFor(city, id)?.label; if (found) return found; } catch { /* not loaded */ }
  return id.replace(/-/g, ' ').replace(/^./, (c) => c.toUpperCase());
}
type Refused = { ok: false; code: string; reason: string };
const no = (code: string, reason: string): Refused => ({ ok: false, code, reason });

const services = new WeakMap<RouteContext, ReturnType<typeof build>>();
export function worldEventsService(ctx: RouteContext) {
  let found = services.get(ctx);
  if (!found) services.set(ctx, found = build(ctx));
  return found;
}

function build(ctx: RouteContext) {
  let extras: WorldEventExtras = {};
  registerAdminSetting(ctx, { key: 'worldEventAiShare', label: 'World event: the AI residents\' share of the bar (%)', help: 'How much of the weekly event\'s goal the city\'s AI residents fill, spread evenly over the event (0 to 60, default 35). They are named and marked AI; people always finish the goal.', kind: 'number', min: 0, max: AI_SHARE_MAX, default: () => AI_SHARE_DEFAULT });
  const share = (): number => { const value = ctx.checks?.setting?.('worldEventAiShare'); return typeof value === 'number' ? value : AI_SHARE_DEFAULT; };
  const sync = (admin: WorldEventsCollection['admin']): void => {
    extras = { schedule: admin.schedule ?? null, events: eventList(admin.events, ctx.cityIds), hidden: (Array.isArray(admin.hidden) ? admin.hidden : []).filter((id): id is string => typeof id === 'string').slice(0, LIMITS.hidden) };
  };
  const occurrence = (now: number) => currentOccurrence(now, extras);
  const inRoom = (id: string, room: string): boolean => ctx.checks?.inRoom?.(id, room) === true;

  function runFor(col: WorldEventsCollection, o: Occurrence): Run {
    const key = String(o.week);
    if (!col.runs[key]) {
      col.runs[key] = { week: o.week, def: JSON.parse(JSON.stringify(o.def)) as Run['def'], count: 0, ai: 0, by: {}, agents: {}, aiBy: {}, keys: {}, carrying: {}, grabbed: {}, drops: [], doneAt: 0, lines: {} };
      for (const old of Object.keys(col.runs)) if (Number(old) <= o.week - RUNS_KEPT) delete col.runs[old];
    }
    const run = repairRun(col.runs[key]!);
    // An admin's edit reaches the week's event until its first step; from then the run keeps what people worked on.
    if (run.count === 0 && !Object.keys(run.by).length && JSON.stringify(run.def) !== JSON.stringify(o.def)) run.def = JSON.parse(JSON.stringify(o.def)) as Run['def'];
    return run;
  }
  const peekRun = (db: Db, week: number): Run | null => { const run = peekWorldEvents(db).runs[String(week)]; return run && typeof run === 'object' ? run : null; };

  /** The city changes for a week once the goal is reached. */
  function reached(col: WorldEventsCollection, run: Run, o: Occurrence, now: number): void {
    if (run.doneAt || run.count < run.def.target) return;
    run.doneAt = now;
    col.changes[run.def.city] = { city: run.def.city, label: run.def.change.label, colours: [...run.def.change.colours], until: o.endsAt + CHANGE_MS, week: run.week };
  }
  /** One step by one contributor, once per key. The first step gives the badge. */
  function credit(db: Db, col: WorldEventsCollection, run: Run, o: Occurrence, id: string, key: string, now: number): 'counted' | 'already' | 'enough' {
    if (run.keys[key]) return 'already';
    const mine = run.by[id] ?? 0;
    if (mine >= PER_PERSON_MAX) return 'enough';
    run.keys[key] = 1; run.by[id] = mine + 1; run.count += 1;
    if (isAiCharacter(db, id)) { run.agents[id] = 1; run.ai += 1; }
    if (mine === 0) {
      const list = Array.isArray(col.badges[id]) ? col.badges[id]! : [];
      if (!list.some((badge) => badge.week === run.week)) col.badges[id] = [...list, { week: run.week, title: run.def.title, city: run.def.city, at: now }].slice(-BADGES_KEPT);
    }
    reached(col, run, o, now);
    pushSoon();
    return 'counted';
  }

  // ---- what the page reads ----------------------------------------------------------------------------------------------------
  function helpersOf(run: Run | null): EventHelper[] {
    if (!run) return [];
    const out: EventHelper[] = Object.entries(run.aiBy ?? {}).map(([name, steps]) => ({ name, steps, ai: true as const }));
    const agentSteps = Object.keys(run.agents ?? {}).reduce((sum, id) => sum + (run.by?.[id] ?? 0), 0);
    if (agentSteps) out.push({ name: 'AI-played characters', steps: agentSteps, ai: true });
    return out.sort((a, b) => b.steps - a.steps).slice(0, 8);
  }
  function publicOf(db: Db, o: Occurrence & { phase: Phase }, now: number): WorldEventPublic {
    const run = peekRun(db, o.week), def = run && (run.count > 0 || Object.keys(run.by ?? {}).length) ? run.def : o.def, count = run?.count ?? 0;
    const peopleCount = run ? Object.keys(run.by ?? {}).length - Object.keys(run.agents ?? {}).length : 0;
    const drop = run && (o.phase === 'warmup' || o.phase === 'live') ? openDrop([...dropsOf(o), ...(run.drops ?? [])], now) : o.phase === 'warmup' ? openDrop(dropsOf(o), now) : null;
    const result = run?.lines?.result ? { n: run.lines.result, text: lineResultOf(run) } : null;
    return {
      week: o.week, id: def.id, title: def.title, blurb: def.blurb, city: def.city, cityName: placeName(def.city), goal: def.goal, target: def.target, venues: [...def.venues],
      questions: def.questions.map((item) => ({ id: item.id, q: item.q })), change: { label: def.change.label, colours: [...def.change.colours] },
      announcedAt: o.announcedAt, warmupAt: o.warmupAt, startsAt: o.startsAt, endsAt: o.endsAt, phase: o.phase,
      count, percent: percentOf(count, def.target), people: Math.max(0, peopleCount), aiSteps: run?.ai ?? 0, helpers: helpersOf(run), done: Boolean(run?.doneAt), doneAt: run?.doneAt ?? 0,
      drop: drop ? { id: drop.id, closesAt: drop.closesAt, left: Math.max(0, DROP_CAPACITY - (run?.grabbed?.[drop.id]?.length ?? 0)) } : null,
      resultLine: result,
    };
  }
  function lineResultOf(run: Run): string {
    const helpers = helpersOf(run).filter((item) => item.name !== 'AI-played characters').length + Object.keys(run.agents ?? {}).length;
    return lineResult(run.def, placeName(run.def.city), { people: Math.max(0, Object.keys(run.by ?? {}).length - Object.keys(run.agents ?? {}).length), ai: helpers, count: run.count, target: run.def.target, done: Boolean(run.doneAt) });
  }
  function changesOf(db: Db, now: number): CityChangeView[] {
    return Object.values(peekWorldEvents(db).changes).filter((item) => item && typeof item === 'object' && item.until > now).map((item) => ({ city: item.city, label: item.label, colours: [item.colours[0], item.colours[1]] as [string, string], until: item.until, week: item.week }));
  }
  function view(db: Db, now: number): WorldEventView {
    const o = occurrence(now);
    return { now, schedule: scheduleOf(extras), event: o ? publicOf(db, o, now) : null, changes: changesOf(db, now) };
  }
  function mine(db: Db, id: string, now: number): WorldEventMine {
    const o = occurrence(now), run = o ? peekRun(db, o.week) : null, badges = peekWorldEvents(db).badges[id];
    const keys = run ? Object.keys(run.keys ?? {}) : [];
    return {
      steps: run?.by?.[id] ?? 0, badge: Boolean(run && (run.by?.[id] ?? 0) > 0), carrying: run?.carrying?.[id] ?? null,
      answered: keys.filter((key) => key.startsWith(`a:${id}:`)).map((key) => key.split(':')[2] ?? ''),
      grabbed: Object.entries(run?.grabbed ?? {}).filter(([, list]) => Array.isArray(list) && list.includes(id)).map(([drop]) => drop),
      badges: Array.isArray(badges) ? badges.map((item) => ({ ...item })).reverse() : [],
    };
  }

  // ---- a step a person takes (inside a transaction) ---------------------------------------------------------------------------
  function step(db: Db, session: SessionRecord, op: EventStepOp, body: Record<string, unknown>, now: number): { ok: true; code: string; count: number } | Refused {
    const o = occurrence(now);
    if (!o) return no('no_event', 'There is no world event this week.');
    const col = worldEventsOf(ctx, db), id = session.publicId;
    if (op === 'grab') {
      if (o.phase !== 'warmup' && o.phase !== 'live') return no('no_drop', 'No drop is open right now. They land in the Square in the hour before the event.');
      const run = runFor(col, o), drop = openDrop([...dropsOf(o), ...run.drops], now);
      if (!drop) return no('no_drop', 'No drop is open right now. Another lands soon.');
      if (!inRoom(id, SQUARE_ROOM)) return no('not_in_square', 'Drops land in the Square. Step into the Square to grab one.');
      const list = Array.isArray(run.grabbed[drop.id]) ? run.grabbed[drop.id]! : [];
      if (list.includes(id)) return no('already_grabbed', 'You already have one from this drop.');
      if (list.length >= DROP_CAPACITY) return no('drop_gone', 'This drop is all gone. Another lands soon.');
      run.grabbed[drop.id] = [...list, id];
      credit(db, col, run, o, id, `x:${id}:${drop.id}`, now);
      return { ok: true, code: 'grabbed', count: run.count };
    }
    if (o.phase !== 'live') return no('not_live', o.phase === 'done' ? 'This week’s event is over. The next one is announced on Monday.' : 'The event has not started yet.');
    const run = runFor(col, o), def = run.def, city = placeName(def.city);
    if ((op === 'pickup' || op === 'drop') && def.goal !== 'deliver') return no('wrong_goal', 'This week’s event is not a delivery.');
    if (op === 'answer' && def.goal !== 'answer') return no('wrong_goal', 'This week’s event has no questions.');
    if (op === 'pickup') {
      const from = def.venues[0] ?? '';
      if (!inRoom(id, `${def.city}:${from}`)) return no('not_there', `Walk to ${venueName(def.city, from)} in ${city} to pick up a load.`);
      if (run.carrying[id]) return no('carrying', 'You are already carrying a load.');
      if ((run.by[id] ?? 0) >= PER_PERSON_MAX) return no('enough', 'You have done your share. Thank you! Bring a friend to help.');
      run.carrying[id] = now;
      return { ok: true, code: 'picked_up', count: run.count };
    }
    if (op === 'drop') {
      const since = run.carrying[id], to = def.venues[1] ?? '';
      if (!since) return no('not_carrying', `Pick up a load at ${venueName(def.city, def.venues[0] ?? '')} first.`);
      if (now - since > DELIVER_MAX_MS) { delete run.carrying[id]; return no('too_late', 'The load slipped: it took too long. Pick up another.'); }
      if (!inRoom(id, `${def.city}:${to}`)) return no('not_there', `Carry it to ${venueName(def.city, to)} in ${city}.`);
      if (now - since < DELIVER_MIN_MS) return no('too_fast', 'Easy: walk it over properly.');
      delete run.carrying[id];
      const done = credit(db, col, run, o, id, `d:${id}:${run.by[id] ?? 0}`, now);
      return done === 'enough' ? no('enough', 'You have done your share. Thank you!') : { ok: true, code: 'delivered', count: run.count };
    }
    if (op === 'answer') {
      if (!ctx.online(id)) return no('offline', 'Connect to the game to answer.');
      const question = def.questions.find((item) => item.id === body.question);
      if (!question) return no('unknown_question', 'That is not one of this week’s questions.');
      const key = `a:${id}:${question.id}`;
      if (run.keys[key]) return no('answered', 'You already answered that one.');
      if ((run.by[id] ?? 0) >= PER_PERSON_MAX) return no('enough', 'You have done your share. Thank you!');
      if (!question.answers.includes(normalAnswer(body.answer))) { run.keys[key] = 1; return no('wrong_answer', 'Not quite. That one is closed for you now: try the next.'); }
      credit(db, col, run, o, id, key, now);
      return { ok: true, code: 'right', count: run.count };
    }
    return no('invalid_op', 'That is not a step of the event.');
  }

  // ---- gather: arrivals the room module saw -----------------------------------------------------------------------------------
  const seen = new Set<string>();
  let seenWeek = -1;
  ctx.on?.('room-changed', ({ room, cityId, venueId, cause }) => {
    if (!cause) return;
    const now = ctx.now(), o = occurrence(now);
    if (!o || o.phase !== 'live' || o.def.goal !== 'gather' || cityId !== o.def.city) return;
    if (!venueId || venueId === 'home' || venueId === 'neighbourhood' || venueId === 'city-street' || (o.def.venues.length && !o.def.venues.includes(venueId))) return;
    if (!inRoom(cause, room)) return; // somebody left
    if (seenWeek !== o.week) { seen.clear(); seenWeek = o.week; }
    const key = `g:${cause}:${venueId}`;
    if (seen.has(key)) return;
    seen.add(key);
    void ctx.store.transact((db) => { const col = worldEventsOf(ctx, db); credit(db, col, runFor(col, o), o, cause, key, ctx.now()); }).catch(() => { seen.delete(key); });
  });

  // ---- the heartbeat ----------------------------------------------------------------------------------------------------------
  /** Is there anything for the beat to write? Cheap, read-only. */
  function due(db: Db, now: number): boolean {
    const o = occurrence(now), col = peekWorldEvents(db);
    if (Object.values(col.changes).some((item) => !item || item.until <= now)) return true;
    if (!o) return false;
    const run = col.runs[String(o.week)];
    if (!run) return true;
    const lines = run.lines ?? {};
    if (lines.announce === undefined) return true;
    if (o.phase !== 'announced' && lines.warmup === undefined && o.warmupAt < o.startsAt) return true;
    if ((o.phase === 'live' || o.phase === 'done') && lines.live === undefined) return true;
    if (o.phase === 'done' && lines.result === undefined) return true;
    const residents = Object.values(run.aiBy ?? {}).reduce((sum, n) => sum + n, 0);
    return (o.phase === 'live' || (o.phase === 'done' && lines.result === undefined)) && residents < aiDue(run.def ? { ...o, def: run.def } : o, Math.min(now, o.endsAt), share());
  }
  function advance(db: Db, now: number): boolean {
    const col = worldEventsOf(ctx, db), gist = gistService(ctx);
    for (const [city, item] of Object.entries(col.changes)) if (!item || item.until <= now) delete col.changes[city];
    const o = occurrence(now);
    if (!o) return false;
    const run = runFor(col, o), def = run.def, city = placeName(def.city);
    const line = (key: string, text: string): void => { if (run.lines[key] === undefined) run.lines[key] = gist.add(db, { city: WORLD, kind: 'event', text, refs: { key: `we:${o.week}:${key}` } })?.n ?? 0; };
    line('announce', lineAnnounced(def, city, o.startsAt));
    if (o.phase !== 'announced' && o.warmupAt < o.startsAt) line('warmup', lineWarmup(def, city));
    let moved = false;
    if (o.phase === 'live' || o.phase === 'done') {
      line('live', lineLive(def, city));
      // The AI residents: their share by now, spread over the residents of the city, named and labelled.
      const names = residentsInCity(def.city, HELPERS_PER_CITY).map((who) => who.name);
      const helpers = names.length ? names : ['Allworld helpers'];
      const done = Object.values(run.aiBy).reduce((sum, n) => sum + n, 0), wanted = aiDue({ ...o, def }, Math.min(now, o.endsAt), share());
      for (let k = done; k < wanted; k++) { const name = helpers[k % helpers.length]!; run.aiBy[name] = (run.aiBy[name] ?? 0) + 1; run.count += 1; run.ai += 1; moved = true; }
      reached(col, run, o, now);
    }
    if (o.phase === 'done') line('result', lineResultOf(run));
    return moved;
  }
  let lastTick = 0, running: Promise<void> | null = null;
  /** One beat's work, at most every TICK_MS (`force`: now, after any beat that is running; the tests use it). */
  async function tick(now: number, force = false): Promise<void> {
    if (running) { if (!force) return; await running.catch(() => {}); }
    if (!force && now - lastTick < TICK_MS) return;
    lastTick = now;
    running = (async () => {
      if (!(await ctx.store.read((db) => due(db, now)))) return;
      const moved = await ctx.store.transact((db) => advance(db, now), { durable: false });
      if (moved) pushSoon();
    })().catch(() => { /* the next beat tries again */ }).finally(() => { running = null; });
    await running;
  }
  ctx.on?.('heartbeat', ({ now }) => { void tick(now); });

  // ---- frames to the people watching ------------------------------------------------------------------------------------------
  let pushTimer: ReturnType<typeof setTimeout> | null = null, lastPush = 0;
  function audience(o: Occurrence): string[] {
    const ids = new Set(ctx.checks?.roomMembers?.(SQUARE_ROOM) ?? []);
    for (const venue of o.def.venues) for (const id of ctx.checks?.roomMembers?.(`${o.def.city}:${venue}`) ?? []) ids.add(id);
    return [...ids];
  }
  async function pushNow(): Promise<void> {
    pushTimer = null; lastPush = ctx.now();
    const now = ctx.now(), o = occurrence(now);
    if (!o) return;
    const run = await ctx.store.read((db) => peekRun(db, o.week)).catch(() => null);
    if (!run) return;
    const frame: WorldLiveFrame = { type: 'world-live', kind: 'event', week: o.week, count: run.count, percent: percentOf(run.count, run.def.target), phase: o.phase };
    for (const id of audience(o)) ctx.push(id, frame as unknown as ServerFrame);
  }
  function pushSoon(): void {
    if (pushTimer) return;
    const wait = Math.max(0, PUSH_MS - (ctx.now() - lastPush));
    pushTimer = setTimeout(() => { void pushNow(); }, Math.min(wait, PUSH_MS));
    (pushTimer as { unref?: () => void }).unref?.();
  }

  return {
    load: (): Promise<void> => ctx.store.read((db) => JSON.parse(JSON.stringify(peekWorldEvents(db).admin)) as WorldEventsCollection['admin']).then(sync),
    sync, extras: (): WorldEventExtras => extras, occurrence, view, mine, step, tick, advance, runFor,
  };
}
