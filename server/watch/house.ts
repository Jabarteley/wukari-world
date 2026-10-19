/**
 * OWNER: watch (docs/ALLWORLD-HOUSE.md)
 * ALLWORLD HOUSE on the server: an admin starts a season (or stops one); the housemates are AI residents (server/residents/world.ts), always
 * labelled AI; adults vote once a season week to save one; the heartbeat runs the week (the rules and the times are src/watch/house.ts):
 *
 *   season start         one gist line ("season 1 has begun")
 *   every day from 12:00 one diary-room gist line, of one housemate (written, no model)
 *   Sunday 20:00         eviction night: a stage opens in the house's room (stage mode, server/world-events/stages.ts) when it is free,
 *                        with the housemates on it; the votes close
 *   Sunday 20:30         the reveal: the tally is kept, the votes themselves are dropped; the gist line, which is the share card
 *   last Sunday          the finale: the most votes wins
 *
 * THE HOUSE IN 3D is the room the admin named: a group's room (src/places/model.ts), furnished like any room, which viewers enter by its
 * link. The housemates still in stand in it for everyone who comes in (`ctx.checks.roomCast`, read by server/social/places.ts), named
 * "Ada (AI)". The Square is the default room when none is named: then the stage is the Square's and nobody is drawn.
 */
import { lagosTime } from '../../src/game/clock.ts';
import { HOUSE, decideWeek, diaryGist, diaryLine, evictAt, evictGist, housePhase, isFinale, label, pickHousemates, remaining, revealAt, seasonDay, seasonEnd, seasonStart, stageTitle, stableHash, startGist, startWeekFor, winnerGist } from '../../src/watch/house.ts';
import type { HouseSeason, Housemate } from '../../src/watch/house.ts';
import { SQUARE_ROOM, roomKeyOf } from '../../src/places/model.ts';
import { residentsOfCities } from '../residents/world.ts';
import { residentId } from '../residents/life.ts';
import { gistService, WORLD } from '../gist/ledger.ts';
import { stageRoom, stagesService } from '../world-events/stages.ts';
import { worldEventsOf } from '../world-events/data.ts';
import type { Stage } from '../../src/world-events/stage.ts';
import { STAGE } from '../../src/world-events/stage.ts';
import { peekWatch, watchOf } from './data.ts';
import type { HouseView } from '../../src/types/watch.ts';
import type { Db, RouteContext, SessionRecord } from '../types.ts';

type Refused = { ok: false; code: string; reason: string };
const no = (code: string, reason: string): Refused => ({ ok: false, code, reason });
/** Cities the housemates come from when the admin names none: the open ones of this list, in order. */
export const HOUSE_CITIES = Object.freeze(['lagos', 'abuja', 'port-harcourt', 'ibadan', 'kano', 'enugu', 'accra', 'nairobi', 'johannesburg', 'kumasi']);
const TICK_MS = 30000, DIARY_HOUR = 12;
const voteKey = (season: Pick<HouseSeason, 'id'>, k: number): string => `${season.id}:${k}`;
const copy = <T>(value: T): T => JSON.parse(JSON.stringify(value)) as T;

const services = new WeakMap<RouteContext, ReturnType<typeof build>>();
export function houseService(ctx: RouteContext): ReturnType<typeof build> {
  let found = services.get(ctx);
  if (!found) services.set(ctx, found = build(ctx));
  return found;
}

function build(ctx: RouteContext) {
  const stages = stagesService(ctx);
  /** The season in memory, for the room check (a read on every room view). */
  let live: HouseSeason | null = null;
  const sync = (season: HouseSeason | null): void => { live = season ? copy(season) : null; };
  if (ctx.checks) ctx.checks.roomCast = (roomId: string) => {
    const season = live, now = ctx.now();
    if (!season || season.room !== roomKeyOf(roomId)) return [];
    const { phase } = housePhase(season, now);
    if (phase === 'stopped' || phase === 'done') return [];
    return remaining(season, HOUSE.weeks).map((mate) => ({ id: mate.id, name: label(mate) }));
  };

  /** The housemates the residents offer: two from each city named (the open ones), then chosen by the season's seed. */
  function candidates(cities: readonly string[]): Housemate[] {
    const open = cities.filter((city) => ctx.cityIds.includes(city as never));
    return residentsOfCities(open.length ? open : HOUSE_CITIES.filter((city) => ctx.cityIds.includes(city as never)), 2).map((who) => ({ id: residentId(who), name: who.name, city: who.city }));
  }

  /** An admin starts a season (inside a transaction). */
  function start(db: Db, body: Record<string, unknown>, now: number): { ok: true; summary: string; season: HouseSeason } | Refused {
    const col = watchOf(ctx, db), current = col.house.season;
    if (current) { const { phase } = housePhase(current, now); if (phase !== 'done' && phase !== 'stopped') return no('season_running', 'A season is running. Stop it first.'); }
    const room = body.room === undefined || body.room === '' ? SQUARE_ROOM : stageRoom(body.room);
    if (!room) return no('invalid_room', 'The house is a group room (world:room:g.N) or the Square (world:square).');
    const cities = Array.isArray(body.cities) ? body.cities.filter((item): item is string => typeof item === 'string').slice(0, 12) : [];
    const count = typeof body.mates === 'number' ? body.mates : HOUSE.maxMates;
    const number = col.house.seq + 1, id = `s${number}-${ctx.randomId().replace(/-/g, '').slice(0, 6)}`;
    const mates = pickHousemates(candidates(cities), count, id);
    if (mates.length < HOUSE.minMates) return no('too_few', `Only ${mates.length} AI residents could be found; a season needs ${HOUSE.minMates}.`);
    const startWeek = body.now === true ? lagosTime(now).week : startWeekFor(now);
    if (current) { col.house.past.unshift({ id: current.id, number: current.number, ...winnerOf(current), at: seasonEnd(current) }); col.house.past.splice(HOUSE.seasonsKept); }
    for (const key of Object.keys(col.votes)) if (current && key.startsWith(`${current.id}:`)) delete col.votes[key];
    const season: HouseSeason = { id, number, startWeek, mates, room, weeks: {}, lines: {} };
    col.house.season = season; col.house.seq = number;
    return { ok: true, summary: `Allworld House season ${number} starts ${new Date(seasonStart(season) + 3600000).toISOString().slice(0, 10)} with ${mates.length} housemates in ${room}`, season: copy(season) };
  }
  const winnerOf = (season: HouseSeason): { winner?: string } => {
    const id = season.weeks[String(HOUSE.weeks - 1)]?.winner, mate = season.mates.find((item) => item.id === id);
    return mate ? { winner: label(mate) } : {};
  };
  /** An admin stops the season (inside a transaction): it ends now; nobody is evicted. */
  function stop(db: Db, now: number): { ok: true; summary: string; season: HouseSeason | null } | Refused {
    const col = watchOf(ctx, db), season = col.house.season;
    if (!season) return no('no_season', 'No season is running.');
    const { phase } = housePhase(season, now);
    if (phase === 'done' || phase === 'stopped') return no('no_season', 'The season is already over.');
    season.stopped = now;
    for (const key of Object.keys(col.votes)) if (key.startsWith(`${season.id}:`)) delete col.votes[key];
    return { ok: true, summary: `Allworld House season ${season.number} stopped`, season: copy(season) };
  }

  /** One adult's save vote for the running week (inside a transaction): once a week, for a housemate still in, before 20:00 Sunday. */
  function vote(db: Db, session: SessionRecord, body: Record<string, unknown>, now: number): { ok: true } | Refused {
    const col = watchOf(ctx, db), season = col.house.season;
    if (!season) return no('no_season', 'Allworld House is not on now.');
    const { phase, week } = housePhase(season, now);
    if (phase !== 'voting') return no('votes_closed', phase === 'announced' ? 'Voting opens when the season starts.' : 'Voting is closed for this week.');
    if (ctx.checks?.adult?.(db, session.publicId) !== true) return no('adults_only', 'Only adults vote in Allworld House. Say you are 18 or older in Settings first.');
    const mate = remaining(season, week).find((item) => item.id === body.mate);
    if (!mate) return no('unknown_housemate', 'Choose a housemate who is still in the house.');
    const votes = (col.votes[voteKey(season, week)] ??= {});
    if (votes[session.publicId]) return no('voted', 'You have voted this week. Come back next week.');
    votes[session.publicId] = mate.id;
    return { ok: true };
  }

  /** The season as the caller sees it. Counts are shown only once a week is revealed. */
  function view(db: Db, viewer: string | null, now: number): HouseView {
    const col = peekWatch(db), season = col.house.season;
    const past = col.house.past.map((item) => ({ number: item.number, ...(item.winner ? { winner: item.winner } : {}) }));
    if (!season) return { now, season: null, past };
    // Still in: everyone not evicted in a week already revealed (a reveal on Sunday night counts at once).
    const { phase, week } = housePhase(season, now), inside = remaining(season, HOUSE.weeks);
    const day = seasonDay(season, now), done = (k: number) => season.weeks[String(k)];
    const mine = viewer ? col.votes[voteKey(season, week)]?.[viewer] : undefined;
    const outWeek = (id: string): number | null => { for (let k = 0; k < HOUSE.weeks; k++) if (done(k)?.evicted === id) return k + 1; return null; };
    const winner = done(HOUSE.weeks - 1)?.winner;
    const weeks = Array.from({ length: HOUSE.weeks }, (_, k) => {
      const w = done(k), who = season.mates.find((mate) => mate.id === (w?.evicted ?? w?.winner));
      return { week: k + 1, evictAt: evictAt(season, k), revealAt: revealAt(season, k), finale: isFinale(k), ...(who && w?.tally ? { out: label(who), share: w.tally[who.id] && w.voters ? Math.round((w.tally[who.id]! / w.voters) * 100) : 0, voters: w.voters ?? 0 } : {}), ...(w?.line ? { line: w.line } : {}) };
    });
    return {
      now, past,
      season: {
        number: season.number, phase, week: week + 1, weeks: HOUSE.weeks, startsAt: seasonStart(season), endsAt: seasonEnd(season), room: season.room, day,
        mates: season.mates.map((mate) => ({ id: mate.id, name: mate.name, label: label(mate), city: mate.city, in: inside.some((item) => item.id === mate.id), ...(outWeek(mate.id) ? { outWeek: outWeek(mate.id)! } : {}), ...(winner === mate.id ? { winner: true } : {}),
          ...(day > 0 && inside.some((item) => item.id === mate.id) && phase !== 'stopped' ? { diary: diaryLine(mate, day, inside, season.id) } : {}) })),
        weekList: weeks, voted: mine ?? null, canVote: phase === 'voting',
        ...(season.lines.start ? { line: season.lines.start } : {}),
      },
    };
  }

  // ---- the heartbeat ------------------------------------------------------------------------------------------------------------
  /** Is there anything to do now? Reads only. */
  function due(season: HouseSeason | null, now: number): boolean {
    if (!season) return false;
    const { phase, week } = housePhase(season, now);
    if (phase === 'stopped' || phase === 'announced') return false;
    if (season.lines.start === undefined) return true;
    if (phase === 'done') return !season.weeks[String(HOUSE.weeks - 1)]?.tally;
    const day = seasonDay(season, now);
    if (lagosTime(now).hour >= DIARY_HOUR && season.lines[`diary:${day}`] === undefined) return true;
    const w = season.weeks[String(week)];
    return phase === 'eviction' && (!w?.stage || (now >= revealAt(season, week) && !w.tally));
  }
  /** One beat's work, inside a transaction. Returns the stage to commit, when one was opened. */
  function advance(db: Db, now: number): { season: HouseSeason | null; stage: [string, Stage] | null } {
    const col = watchOf(ctx, db), season = col.house.season;
    if (!season) return { season: null, stage: null };
    const gist = gistService(ctx), { phase, week } = housePhase(season, now);
    const line = (key: string, text: string): number => gist.add(db, { city: WORLD, kind: 'event', text, refs: { key: `house:${season.id}:${key}` } })?.n ?? 0;
    if (season.lines.start === undefined) season.lines.start = line('start', startGist(season));
    let stage: [string, Stage] | null = null;
    // The weeks whose reveal has passed and were not tallied (a beat missed during a restart is caught up in order).
    const last = phase === 'done' ? HOUSE.weeks - 1 : week - (phase === 'eviction' && now >= revealAt(season, week) ? 0 : 1);
    for (let k = 0; k <= last; k++) {
      const w = (season.weeks[String(k)] ??= {});
      if (w.tally) continue;
      const votes = col.votes[voteKey(season, k)] ?? {}, tally: Record<string, number> = {};
      for (const mate of Object.values(votes)) tally[mate] = (tally[mate] ?? 0) + 1;
      const decided = decideWeek(season, k, tally);
      w.tally = tally; w.voters = decided.total;
      const who = season.mates.find((mate) => mate.id === (decided.evicted ?? decided.winner));
      if (decided.evicted) w.evicted = decided.evicted;
      if (decided.winner) w.winner = decided.winner;
      if (who) w.line = line(`week:${k}`, decided.winner ? winnerGist(season, who, decided.share) : evictGist(who, k, decided.share));
      delete col.votes[voteKey(season, k)];
    }
    if (phase === 'eviction') {
      const w = (season.weeks[String(week)] ??= {});
      if (!w.stage) {
        w.stage = 1;
        if (!stages.live(season.room)) {
          const cast = remaining(season, week).map((mate) => ({ id: mate.id, name: label(mate), ai: true as const }));
          const opened = stages.open(db, season.room, { kind: 'talk', title: stageTitle(season, week), minutes: Math.max(5, Math.ceil((evictAt(season, week) + HOUSE.stageMinutes * 60000 - now) / 60000)), moderator: null, invited: cast.slice(0, STAGE.invited) });
          opened.speakers.push(...cast.slice(0, STAGE.speakers));
          stage = [season.room, copy(worldEventsOf(ctx, db).stages[season.room]!)];
        }
      }
    }
    const day = seasonDay(season, now);
    if (phase !== 'done' && day > 0 && lagosTime(now).hour >= DIARY_HOUR && season.lines[`diary:${day}`] === undefined) {
      const inside = remaining(season, week), mate = inside[stableHash(`${season.id}|diary|${day}`) % Math.max(1, inside.length)];
      season.lines[`diary:${day}`] = mate ? line(`diary:${day}`, diaryGist(mate, diaryLine(mate, day, inside, season.id))) : 0;
      for (const key of Object.keys(season.lines)) if (key.startsWith('diary:') && Number(key.slice(6)) < day - 7) delete season.lines[key];
    }
    return { season: copy(season), stage };
  }
  let lastTick = 0, running: Promise<void> | null = null;
  /** One beat, at most every TICK_MS (`force`: now; the tests use it). */
  async function tick(now: number, force = false): Promise<void> {
    if (running) { if (!force) return; await running.catch(() => {}); }
    if (!force && now - lastTick < TICK_MS) return;
    lastTick = now;
    running = (async () => {
      if (!due(live, now)) return;
      const done = await ctx.store.transact((db) => advance(db, now), { durable: false });
      sync(done.season);
      if (done.stage) stages.committed(done.stage[0], done.stage[1]);
    })().catch(() => { /* the next beat tries again */ }).finally(() => { running = null; });
    await running;
  }
  ctx.on?.('heartbeat', ({ now }) => { void tick(now); });

  return {
    load: (): Promise<void> => ctx.store.read((db) => peekWatch(db).house.season).then((season) => sync(season)),
    sync, start, stop, vote, view, tick, advance,
  };
}
