/**
 * OWNER: world events (docs/WORLD-EVENTS.md "Election night", docs/POLITICS.md "Election night")
 * ELECTION NIGHT ON THE SERVER. Every number is read from the stored ballots (server/civic/elections.ts tally, the quorum of the seat):
 * nothing here counts a vote, decides a winner or changes a ballot.
 *
 *   board     GET /api/world/election-night?city=   the viewer's seats (city, state, nation), the people's and the agents' (labelled AI)
 *   debate    on Friday the beat picks up to DEBATE_SLOTS races (pickDebates) once, writes "Debate tonight" gist lines, and opens a stage in
 *             the Square for each half hour: its candidates are invited to take their seats (the agents' candidates for the seat too,
 *             labelled AI); the game moderates (the queue moves by itself) unless an admin names a moderator.
 *   speech    the winner sends one short speech (screened like chat) from the close to the end of Sunday: it goes to everyone in the Square
 *             at once (`world-live` kind 'moment'), a gist line says it happened, and a stage opens in the Square for them while it is free.
 *   card      "Ada wins Lagos with 61%": a gist line written once per seat (the debated ones by the beat, any other when someone shares it),
 *             shared as a gist card (server/growth/share.ts kind 'gist'). An AI winner is marked "(AI)".
 */
import { DEBATE_MINUTES, SPEECH_MAX, SPEECH_STAGE_MINUTES, boardSeat, debateLine, debateSlot, nightPhase, nightTimes, pickDebates, resultLine, speechLine } from '../../src/world-events/election-night.ts';
import type { BoardSeat, Race, Tier } from '../../src/world-events/election-night.ts';
import { lagosTime } from '../../src/game/clock.ts';
import { SQUARE_ROOM } from '../../src/places/model.ts';
import { QUORUM, SEAT_TITLES } from '../../src/game/content/politics.ts';
import { civicTitle } from '../../src/game/cities/terminology.ts';
import { tally } from '../civic/elections.ts';
import { AGENT_SUFFIX, govOfId, peekPolitics, seatsOf } from '../politics/data.ts';
import type { Seat } from '../politics/data.ts';
import { gistService, isAiCharacter, WORLD } from '../gist/ledger.ts';
import { screenText } from '../moderation/text.ts';
import { screenFee } from '../../src/game/trust/fees.ts';
import { NIGHTS_KEPT, peekWorldEvents, worldEventsOf } from './data.ts';
import type { Night } from './data.ts';
import { placeName } from './service.ts';
import { stagesService } from './stages.ts';
import type { ElectionNightView, WorldLiveFrame } from '../../src/types/world-events.ts';
import type { ServerFrame } from '../../src/types/protocol.ts';
import type { Db, RouteContext, SessionRecord } from '../types.ts';

const TICK_MS = 20000, HOUR = 3600000;
type Refused = { ok: false; code: string; reason: string };
const no = (code: string, reason: string): Refused => ({ ok: false, code, reason });
const SCOPE = /^(city|state|nation):[a-z0-9-]{1,60}(@ai)?$/;

const services = new WeakMap<RouteContext, ReturnType<typeof build>>();
export function nightService(ctx: RouteContext) {
  let found = services.get(ctx);
  if (!found) services.set(ctx, found = build(ctx));
  return found;
}

function build(ctx: RouteContext) {
  const stages = stagesService(ctx);
  const titleOf = (tier: Tier, cityId: string): string => (tier === 'city' ? civicTitle(cityId) : SEAT_TITLES[tier]);
  /** One seat's race as stored: the candidates best first, each marked AI when the agents' ballot or an AI character. */
  function raceOf(db: Db, seat: Seat, cityId: string, week: number): Race {
    const election = govOfId(db, seat.id).gov.elections[week], parties = peekPolitics(db).parties;
    return {
      scope: seat.id, tier: seat.tier, side: seat.side, place: seat.name, title: titleOf(seat.tier, cityId), quorum: QUORUM[seat.tier],
      candidates: tally(election).map((item) => ({ id: item.id, name: item.name, votes: item.votes, party: item.party ? parties[item.party]?.name ?? null : null, ai: seat.side === 'agents' || isAiCharacter(db, item.id) })),
    };
  }
  /** The seats a resident of `cityId` votes for, the people's then the agents'. */
  const seatsFor = (cityId: string): Seat[] => [...seatsOf(cityId, placeName(cityId), 'humans'), ...seatsOf(cityId, placeName(cityId), 'agents')];
  const nightOf = (db: Db, week: number): Night | null => { const found = peekWorldEvents(db).nights[String(week)]; return found && typeof found === 'object' ? found : null; };
  function nightFor(db: Db, week: number): Night {
    const col = worldEventsOf(ctx, db), key = String(week);
    if (!col.nights[key]) {
      col.nights[key] = { week, debates: [], chosen: false, names: {}, speeches: {}, cards: {} };
      for (const old of Object.keys(col.nights)) if (Number(old) <= week - NIGHTS_KEPT) delete col.nights[old];
    }
    const night = col.nights[key]!;
    for (const field of ['names', 'speeches', 'cards'] as const) if (!night[field] || typeof night[field] !== 'object') (night as unknown as Record<string, unknown>)[field] = {};
    if (!Array.isArray(night.debates)) night.debates = [];
    return night;
  }

  function view(db: Db, cityId: string, now: number, viewer: string | null): ElectionNightView {
    const week = lagosTime(now).week, times = nightTimes(week), closed = now >= times.closesAt;
    const seats: BoardSeat[] = seatsFor(cityId).map((seat) => raceOf(db, seat, cityId, week)).filter((race) => race.candidates.length > 0).map((race) => boardSeat(race, closed));
    const night = nightOf(db, week);
    void viewer;
    return {
      now, week, phase: nightPhase(times, now), debateAt: times.debateAt, liveAt: times.liveAt, closesAt: times.closesAt, resultsEnd: times.resultsEnd, seats,
      debates: (night?.debates ?? []).map((scope, at) => ({ scope, place: night?.names?.[scope]?.place ?? scope, title: night?.names?.[scope]?.title ?? '', at: times.debateAt + at * DEBATE_MINUTES * 60000 })),
      speeches: Object.entries(night?.speeches ?? {}).map(([scope, item]) => ({ scope, name: `${item.name}${item.ai ? ' (AI)' : ''}`, text: item.text, at: item.at })).sort((a, b) => b.at - a.at).slice(0, 10),
    };
  }

  /** Every race of the week with candidates, across the world (the Friday choice; once a week). */
  function allRaces(db: Db, week: number): (Race & { cityId: string })[] {
    const out: (Race & { cityId: string })[] = [];
    const civic = (db as unknown as { civic?: { cities?: Record<string, unknown> } }).civic?.cities ?? {};
    for (const cityId of Object.keys(civic)) {
      if (!ctx.cityIds.some((id) => id === cityId)) continue;
      const seat = seatsOf(cityId, placeName(cityId), 'humans')[0];
      if (seat) { const race = raceOf(db, seat, cityId, week); if (race.candidates.length) out.push({ ...race, cityId }); }
    }
    const scopes = Object.keys(peekPolitics(db).scopes).filter((scope) => (scope.startsWith('state:') || scope.startsWith('nation:')) && !scope.endsWith(AGENT_SUFFIX));
    for (const scope of scopes) {
      // A state or national seat is named through any of its cities: the first open city whose seats include it.
      const cityId = ctx.cityIds.find((id) => seatsOf(id, placeName(id), 'humans').some((seat) => seat.id === scope));
      const seat = cityId ? seatsOf(cityId, placeName(cityId), 'humans').find((item) => item.id === scope) : undefined;
      if (cityId && seat) { const race = raceOf(db, seat, cityId, week); if (race.candidates.length) out.push({ ...race, cityId }); }
    }
    return out;
  }
  /** The candidates a debate invites: the seat's people, then the agents' ballot's candidates for the same seat (labelled AI). */
  function invitedFor(db: Db, scope: string, cityId: string, week: number) {
    const seat = seatsFor(cityId).find((item) => item.id === scope), ai = seatsFor(cityId).find((item) => item.id === `${scope}${AGENT_SUFFIX}`);
    const people = seat ? raceOf(db, seat, cityId, week).candidates.map((item) => ({ id: item.id, name: item.name, ...(item.ai ? { ai: true as const } : {}) })) : [];
    const agents = ai ? raceOf(db, ai, cityId, week).candidates.slice(0, 2).map((item) => ({ id: item.id, name: item.name, ai: true as const })) : [];
    return [...people, ...agents].slice(0, 12);
  }
  /** Write the result line of one seat once (inside a transaction). Null when it has no winner yet. */
  function card(db: Db, cityId: string, scope: string, now: number): { n: number; text: string } | null {
    const week = lagosTime(now).week, times = nightTimes(week);
    if (now < times.closesAt) return null;
    const seat = seatsFor(cityId).find((item) => item.id === scope);
    if (!seat) return null;
    const board = boardSeat(raceOf(db, seat, cityId, week), true), winner = board.winner;
    if (!winner) return null;
    const night = nightFor(db, week), text = resultLine(winner.name, board.place, winner.percent, winner.ai);
    if (night.cards[scope]) return { n: night.cards[scope]!, text };
    const city = seat.tier === 'city' ? cityId : WORLD;
    // An AI winner is a character the game shows by name (no age question); a person is named only as an adult (the gist's rule).
    const item = winner.ai
      ? gistService(ctx).add(db, { city, kind: 'election', text, refs: { key: `night:${week}:${scope}`, ai: 1 } })
      : gistService(ctx).add(db, { city, kind: 'election', text: resultLine('{0}', board.place, winner.percent, false), people: [{ id: winner.id, name: winner.name }], minors: 'skip', refs: { key: `night:${week}:${scope}` } });
    if (!item) return null;
    night.cards[scope] = item.n;
    return { n: item.n, text: item.text };
  }

  /** The winner's speech (inside a transaction). Returns what to broadcast after the commit. */
  function speech(db: Db, session: SessionRecord, cityId: string, scope: string, raw: unknown, now: number): { ok: true; frame: WorldLiveFrame; stage: boolean } | Refused {
    const week = lagosTime(now).week, times = nightTimes(week);
    if (now < times.closesAt || now >= times.resultsEnd) return no('not_results', 'The victory speech is for results day, Sunday, after the polls close.');
    const seat = seatsFor(cityId).find((item) => item.id === scope);
    if (!seat) return no('unknown_seat', 'That is not one of your seats.');
    const board = boardSeat(raceOf(db, seat, cityId, week), true);
    if (board.winner?.id !== session.publicId) return no('not_winner', 'Only the winner gives the victory speech.');
    const id = session.publicId, ai = isAiCharacter(db, id);
    if (!ai && ctx.checks?.adult?.(db, id) !== true) return no('adults_only', 'Only adults can speak to the Square.');
    const night = nightFor(db, week);
    if (night.speeches[scope]) return no('spoken', 'You gave your speech already.');
    const muted = ctx.checks?.muted?.(id);
    if (muted) return no('muted', muted.reason);
    const text = typeof raw === 'string' ? raw.replace(/\s+/g, ' ').trim() : '';
    if (text.length < 3 || text.length > SPEECH_MAX) return no('invalid_speech', `A speech is 3 to ${SPEECH_MAX} characters.`);
    const verdict = screenFee(text, { what: 'Your speech' }) ?? screenText(text, { contact: true, what: 'Your speech' });
    if (verdict) return no(verdict.code, verdict.reason);
    night.speeches[scope] = { id, name: session.name, text, at: now, title: board.title, place: board.place, ...(ai ? { ai: true as const } : {}) };
    gistService(ctx).add(db, { city: seat.tier === 'city' ? cityId : WORLD, kind: 'election', text: speechLine('{0}', board.title, board.place), people: [{ id, name: session.name }], minors: 'skip', refs: { key: `speech:${week}:${scope}` } });
    // A stage of their own in the Square while it is free: they are invited and seated at once.
    let staged = false;
    if (!stages.live(SQUARE_ROOM)) {
      const stage = stages.open(db, SQUARE_ROOM, { kind: 'speech', title: `${board.title} ${session.name} of ${board.place}`, minutes: SPEECH_STAGE_MINUTES, moderator: id, invited: [{ id, name: session.name, ...(ai ? { ai: true as const } : {}) }] });
      stage.speakers.push({ id, name: session.name, ...(ai ? { ai: true as const } : {}) });
      staged = true;
    }
    return { ok: true, stage: staged, frame: { type: 'world-live', kind: 'moment', title: `${board.title} of ${board.place}`, name: session.name, text, ...(ai ? { ai: true as const } : {}) } };
  }
  function broadcast(frame: WorldLiveFrame): void { for (const id of ctx.checks?.roomMembers?.(SQUARE_ROOM) ?? []) ctx.push(id, frame as unknown as ServerFrame); }

  // ---- the beat: choose the debates, run their stages, write the debated races' result lines ---------------------------------
  function due(db: Db, now: number): boolean {
    const week = lagosTime(now).week, times = nightTimes(week), night = nightOf(db, week);
    if (now >= times.debateAt - HOUR && now < times.debateEnds && !night?.chosen) return true;
    const slot = debateSlot(times, now), scope = slot >= 0 ? night?.debates[slot] : undefined;
    if (scope && stages.live(SQUARE_ROOM)?.seat !== scope && (!stages.live(SQUARE_ROOM) || stages.live(SQUARE_ROOM)?.kind === 'debate')) return true;
    return now >= times.closesAt && now < times.resultsEnd && Boolean(night?.debates.some((item) => !night.cards?.[item]));
  }
  function advance(db: Db, now: number): { room: string; changed: boolean } {
    const week = lagosTime(now).week, times = nightTimes(week), night = nightFor(db, week);
    let changed = false;
    if (now >= times.debateAt - HOUR && now < times.debateEnds && !night.chosen) {
      const races = allRaces(db, week);
      night.debates = pickDebates(races); night.chosen = true;
      for (const scope of night.debates) {
        const race = races.find((item) => item.scope === scope)!;
        night.names[scope] = { place: race.place, title: race.title };
        gistService(ctx).add(db, { city: race.tier === 'city' ? race.cityId : WORLD, kind: 'election', text: debateLine(race.place, race.title), refs: { key: `debate:${week}:${scope}` } });
      }
    }
    const slot = debateSlot(times, now), scope = slot >= 0 ? night.debates[slot] : undefined, current = stages.live(SQUARE_ROOM);
    if (scope && current?.seat !== scope && (!current || current.kind === 'debate')) {
      const race = allRaces(db, week).find((item) => item.scope === scope);
      if (race) {
        const ends = times.debateAt + (slot + 1) * DEBATE_MINUTES * 60000;
        stages.open(db, SQUARE_ROOM, { kind: 'debate', title: `Debate: ${race.title} of ${race.place}`, minutes: Math.max(5, Math.ceil((ends - now) / 60000)), moderator: null, invited: invitedFor(db, scope, race.cityId, week), seat: scope });
        changed = true;
      }
    }
    if (now >= times.closesAt && now < times.resultsEnd) for (const item of night.debates) {
      if (night.cards[item]) continue;
      const race = allRaces(db, week).find((row) => row.scope === item);
      if (race) card(db, race.cityId, item, now);
    }
    return { room: SQUARE_ROOM, changed };
  }
  let lastTick = 0, running: Promise<void> | null = null;
  /** One beat's work, at most every TICK_MS (`force`: now, after any beat that is running; the tests use it). */
  async function tick(now: number, force = false): Promise<void> {
    if (running) { if (!force) return; await running.catch(() => {}); }
    if (!force && now - lastTick < TICK_MS) return;
    lastTick = now;
    running = (async () => {
      if (!(await ctx.store.read((db) => due(db, now)))) return;
      const done = await ctx.store.transact((db) => { const out = advance(db, now); return { ...out, stage: JSON.parse(JSON.stringify(worldEventsOf(ctx, db).stages[SQUARE_ROOM] ?? null)) }; }, { durable: false });
      if (done.changed) stages.committed(done.room, done.stage);
    })().catch(() => { /* the next beat tries again */ }).finally(() => { running = null; });
    await running;
  }
  ctx.on?.('heartbeat', ({ now }) => { void tick(now); });

  const validScope = (value: unknown): value is string => typeof value === 'string' && SCOPE.test(value);
  return { view, card, speech, broadcast, tick, advance, validScope };
}
