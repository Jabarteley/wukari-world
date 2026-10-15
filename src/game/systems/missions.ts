import { cityReference, readCityReference } from '../cities/references.ts';
/**
 * OWNER: growth
 * Missions: three daily and three weekly tasks dealt from content/missions.ts, the weekly stamp
 * card and the count of days lived actively. Everything is driven by registry events; nothing here
 * is punished for absence — an unfinished mission simply lapses, and no count ever goes down.
 *
 * NOT IN THE FIRST MINUTES. A guest of the quick start (systems/onboarding.ts) is following the starter goals — one
 * line of guidance at a time — so missions are not dealt, counted or shown to it: `view.locked` says when they open.
 * They are dealt the moment the life settles in ('life.started'), and what it does from then on counts.
 *
 * STATE — state.missions
 *   seed      integer — fixes which missions this life is dealt each day
 *   day       Lagos day the daily set belongs to;  daily   [{ id, n, marks, claimed }]
 *   week      Lagos week the weekly set belongs to; weekly  [{ id, n, marks, claimed }]
 *               n = progress, marks = city-qualified visit ids already counted (Lagos keeps raw venue ids)
 *   rerolls   daily swaps used on `day`
 *   sets      { day, week } — the Lagos day / week whose set bonus was already granted (0 = none)
 *   active    { days, last } — Lagos days with any counted activity (only ever goes up), and the last one
 *   stamps    { week, days, paid } — this week's stamp card
 *   visited   { week, list } — city-qualified places reached this Lagos week (for "somewhere new")
 *   paidDay   last Lagos day a paid activity was counted as a day worked
 *   pending   completed mission cash rewards not yet granted (one per mission id)
 *   grants    latest granted reward receipt per mission id; pendingSets one blocked set bonus per scope
 *   titles    [titleId] earned;  claimed  lifetime missions claimed
 *
 * ACTIONS
 *   'missions.claim'   { id, rewardId? }   collect a finished mission's naira, once (a ledger line "Mission: …")
 *   'missions.reroll'  { id }   swap one unfinished DAILY mission (MISSION_REWARDS.rerollsPerDay a day)
 *   'missions.refresh' {}       deal today's set if the day turned; changes nothing else
 *
 * LISTENS TO  activity.completed, travel.arrived, and every event a mission in the content names
 *   (shift.completed, gem.found, wish.granted, npc.greeted, friend.made, table.played, event.attended).
 * EMITS  'mission.completed' / 'mission.reward.earned' when progress reaches its count
 *        'mission.reward.granted' and legacy 'mission.claimed' after the wallet grant
 *        'mission.set.completed' / 'mission.set.reward.granted' for set stars
 *        'stars.granted'     { amount, reason }  set bonuses and the stamp card (systems/goals.ts adds them)
 *        'work.day'          {}                  first paid activity of a Lagos day (feeds a weekly mission)
 *        'notice.posted'     { kind: 'mission', text }   a finished weekly set, a new title
 */
import type { LagosTime } from '../clock.ts';
import type { LifeContext, LifeState, MissionDefinition, MissionEntry, MissionGrantReceipt, MissionRewardEntitlement, MissionRow, MissionSet, MissionSetRewardEntitlement, MissionTitleId, SystemDefinition, VenueId } from '../../types/index.ts';
import type { ExecutionOrigin } from '../../types/progression.ts';
import { LEFT_OUT, PLAYS } from '../profile.ts';
import { emit } from '../registry.ts';
import { fail, finite, isRecord, makeRng, naira, ok, safeCount } from '../util.ts';
import { lagosTime, lagosDayStart } from '../clock.ts';
import { canCredit, credit } from '../api.ts';
import { DAILY_MISSIONS, DAY_TITLES, MISSION_KINDS, MISSION_REWARDS, STAMP_CARD, WEEKLY_MISSIONS, WEEK_TITLE } from '../content/missions.ts';
import { hasEventToday } from '../calendar.ts';
import { venueFor, regularFor, regularsFor } from '../cities/runtime.ts';
import { isCityId, cachedCityContent } from '../cities/registry.ts';
import { canGrantStars } from './goals.ts';

type Scope = 'daily' | 'weekly';
const POOLS: Record<Scope, MissionDefinition[]> = { daily: [...DAILY_MISSIONS], weekly: [...WEEKLY_MISSIONS] };
const BY_ID = new Map<string, MissionDefinition>([...DAILY_MISSIONS, ...WEEKLY_MISSIONS].map((def) => [def.id, def]));
/** The lazy content pack installs published rows without pulling its catalogue into startup. */
export const missionCatalogues = { pools: POOLS, byId: BY_ID };
export const missionDefinition = (id: string): MissionDefinition | undefined => BY_ID.get(id);
/** Every dealt or saved id is in the pools; the original read a property of undefined (a TypeError) otherwise. */
const defOf = (id: string): MissionDefinition => {
  const def = BY_ID.get(id);
  if (!def) throw new TypeError(`Unknown mission ${id}`);
  return def;
};
const TITLE_IDS: readonly unknown[] = [...DAY_TITLES.map((title) => title.id), WEEK_TITLE.id];
const MAX_DAYS = 100000, MARKS = 12, DAY_MS = 86400000;
const ORIGINS: readonly ExecutionOrigin[] = ['human', 'delegated-agent', 'agent-character', 'system', 'unknown'];
/** Frozen amounts belonging to the v1 reward ids. Future tuning must mint a new reward-id version. */
const V1_REWARDS = Object.freeze({
  daily: Object.freeze({ cash: 250, setStars: 2 }),
  weekly: Object.freeze({ cash: 1000, setStars: 5 }),
});
const nowOf = (state: LifeState, ctx: LifeContext | undefined): number => (finite(ctx?.now) && ctx.now > 0 ? ctx.now : state.t);
const need = (def: MissionDefinition): number => def.count ?? 1;
const done = (entry: MissionEntry): boolean => entry.n >= need(defOf(entry.id));
const scopeOf = (state: LifeState, id: string): Scope | null => (state.missions.daily.some((entry) => entry.id === id) ? 'daily' : state.missions.weekly.some((entry) => entry.id === id) ? 'weekly' : null);
const periodOf = (state: LifeState, scope: Scope): number => (scope === 'daily' ? state.missions.day : state.missions.week);
const setKey = (scope: Scope): 'day' | 'week' => (scope === 'daily' ? 'day' : 'week');
const missionRewardId = (cityId: string, scope: Scope, period: number, id: string): string => `mission:v1:${cityId}:${scope}:${period}:${id}`;
const setRewardId = (cityId: string, scope: Scope, period: number): string => `mission-set:v1:${cityId}:${scope}:${period}`;
const pendingFor = (state: LifeState, id: string): MissionRewardEntitlement | undefined => state.missions.pending.find((reward) => reward.id === id);
const sameOccurrence = (reward: Pick<MissionRewardEntitlement, 'id' | 'scope' | 'period'>, id: string, scope: Scope, period: number): boolean => reward.id === id && reward.scope === scope && reward.period === period;
const pendingForOccurrence = (state: LifeState, id: string, scope: Scope, period: number): MissionRewardEntitlement | undefined => state.missions.pending.find((reward) => sameOccurrence(reward, id, scope, period));
const originOf = (ctx: LifeContext): ExecutionOrigin => ctx.executionOrigin && ORIGINS.includes(ctx.executionOrigin) ? ctx.executionOrigin : 'unknown';
const periodStart = (scope: Scope, period: number): number => lagosDayStart(scope === 'daily' ? period : period * 7 - 3);
const periodEnd = (scope: Scope, period: number): number => periodStart(scope, period) + (scope === 'daily' ? DAY_MS : 7 * DAY_MS) - 1;
const inPeriod = (scope: Scope, period: number, at: number): boolean => at >= periodStart(scope, period) && at <= periodEnd(scope, period);
const legacyEarnedAt = (scope: Scope, period: number, savedAt: number): number => Math.max(periodStart(scope, period), Math.min(savedAt, periodEnd(scope, period)));
export const visitIdentity = cityReference;
const cleanVisitIdentity = (value: unknown, currentCity: string): string | null => {
  const reference = readCityReference(value, currentCity, (city, id) => Boolean(venueFor(city, id)));
  return reference ? cityReference(reference.cityId, reference.id) : null;
};

const cleanNpcIdentity = (value: unknown, currentCity: string): string | null => {
  if (typeof value !== 'string' || !value.startsWith('npc:')) return null;
  const reference = readCityReference(value.slice(4), currentCity, (city, id) => Boolean(regularFor(city, id)));
  return reference ? `npc:${cityReference(reference.cityId, reference.id)}` : null;
};

/** Can this mission be done at all by this life today? A mission that cannot is never dealt. */
function doable(def: MissionDefinition, state: LifeState, ctx: LifeContext | undefined): boolean {
  if (def.cityId && def.cityId !== state.estate.city) return false;
  if (def.on === 'event' && def.event === 'event.attended' && !cachedCityContent(state.estate.city)?.events.length) return false;
  if (def.on === 'event' && def.distinct === 'npc' && regularsFor(state.estate.city).length < need(def)) return false;
  if (def.needs === 'job' && !state.job) return false;
  if (def.needs === 'event' && !hasEventToday(nowOf(state, ctx), state.estate.city)) return false;
  if ((def.needs === 'stall' || def.needs === 'no-stall') && (def.needs === 'stall') !== ((state.business?.opened ?? 0) > 0)) return false;
  if (Array.isArray(def.go) && !venueFor(state.estate.city, def.go[0])) return false;
  return true;
}

/**
 * The set for one period: one mission of each kind, in kind order. Deterministic for (seed, city,
 * scope, period) and for what is doable at the moment of dealing.
 */
export function dealMissions(state: LifeState, scope: Scope, period: number, ctx: LifeContext | undefined, exclude: readonly string[] = []): MissionEntry[] {
  if (state.missions.pendingSets.some((reward) => reward.scope === scope)) return [];
  const rng = makeRng(`missions|${state.estate.city}|${scope}|${period}|${state.missions.seed}`);
  const picked: MissionEntry[] = [];
  const blocked = new Set([...exclude, ...state.missions.pending.map((reward) => reward.id)]);
  for (const kind of MISSION_KINDS) {
    const options = POOLS[scope].filter((def) => def.kind === kind && doable(def, state, ctx) && !blocked.has(def.id));
    if (!options.length) continue;
    const local = kind === 'discovery' ? options.filter(def => def.cityId === state.estate.city) : [];
    const choices = local.length ? local : options;
    const choice = choices[Math.floor(rng() * choices.length)];
    if (!choice) continue; // rng() is in [0, 1), so the index is always in range
    picked.push({ id: choice.id, n: 0, marks: [], claimed: false });
  }
  return picked.slice(0, MISSION_REWARDS[scope].slots);
}

/** Missions open when the life has settled in; a life that never was a guest has them from the start. */
const open = (state: LifeState): boolean => !(state.onboarding?.stage === 'guest' && state.onboarding.done !== true);
const LOCKED = 'Missions open once you have settled in.';

/** Grant any retained set bonus that now fits. A blocked one stays intact and blocks a replacement set. */
function settlePendingSets(state: LifeState, ctx: LifeContext): Scope[] {
  const granted: Scope[] = [];
  for (const reward of [...state.missions.pendingSets]) {
    if (!canGrantStars(state, reward.stars)) continue;
    emit(state, 'stars.granted', { amount: reward.stars, reason: reward.scope === 'daily' ? 'Daily missions' : 'Weekly missions' }, ctx);
    state.missions.sets[setKey(reward.scope)] = reward.period;
    state.missions.pendingSets = state.missions.pendingSets.filter((item) => item.rewardId !== reward.rewardId);
    const grantedAt = nowOf(state, ctx);
    emit(state, 'mission.set.reward.granted', { ...reward, grantedAt }, ctx);
    if (reward.scope === 'weekly') {
      grantTitle(state, WEEK_TITLE, ctx);
      emit(state, 'notice.posted', { kind: 'mission', text: `All weekly missions done. +${reward.stars} stars.` }, ctx);
    }
    granted.push(reward.scope);
  }
  return granted;
}

/** Bring the sets, the stamp card and the visited list to today. Earned rewards never lapse. */
function roll(state: LifeState, ctx: LifeContext | undefined): LagosTime {
  const book = state.missions, time = lagosTime(nowOf(state, ctx));
  if (!open(state)) return time;
  if (ctx) settlePendingSets(state, ctx);
  if (book.week !== time.week) {
    book.week = time.week;
    book.weekly = [];
  }
  if (book.day !== time.day) {
    book.day = time.day; book.rerolls = 0;
    book.daily = [];
  }
  // A blocked set bonus deliberately leaves this scope empty. Once it settles, refill even when
  // the period did not change between the blocking claim/settlement and this call.
  if (!book.weekly.length && !book.pendingSets.some((reward) => reward.scope === 'weekly')) book.weekly = dealMissions(state, 'weekly', time.week, ctx);
  if (!book.daily.length && !book.pendingSets.some((reward) => reward.scope === 'daily')) book.daily = dealMissions(state, 'daily', time.day, ctx);
  if (book.stamps.week !== time.week) book.stamps = { week: time.week, days: 0, paid: false };
  if (book.visited.week !== time.week) book.visited = { week: time.week, list: [] };
  return time;
}

function grantTitle(state: LifeState, title: { id: MissionTitleId; label: string }, ctx: LifeContext): void {
  if (state.missions.titles.includes(title.id)) return;
  state.missions.titles.push(title.id);
  emit(state, 'notice.posted', { kind: 'mission', text: `New title: ${title.label}.` }, ctx);
}

/** Something counted today: one stamp and one active day, each once per Lagos day. */
function markActive(state: LifeState, time: LagosTime, ctx: LifeContext): void {
  const book = state.missions;
  if (book.active.last === time.day) return;
  book.active = { days: Math.min(MAX_DAYS, book.active.days + 1), last: time.day };
  for (const title of DAY_TITLES) if (book.active.days >= title.days) grantTitle(state, title, ctx);
  book.stamps.days = Math.min(7, book.stamps.days + 1);
  if (!book.stamps.paid && book.stamps.days >= STAMP_CARD.need) {
    book.stamps.paid = true;
    emit(state, 'stars.granted', { amount: STAMP_CARD.stars, reason: 'Weekly stamp card' }, ctx);
    emit(state, 'notice.posted', { kind: 'mission', text: `Stamp card complete: ${STAMP_CARD.need} days this week. +${STAMP_CARD.stars} stars.` }, ctx);
  }
}

/** Persist the cash entitlement in the same mutation that records criterion completion. */
function earnMissionReward(state: LifeState, entry: MissionEntry, scope: Scope, ctx: LifeContext): MissionRewardEntitlement | null {
  const period = periodOf(state, scope), cityId = state.estate.city, earnedAt = nowOf(state, ctx), earnedOrigin = originOf(ctx);
  const rewardId = missionRewardId(cityId, scope, period, entry.id);
  if (state.missions.pending.some((reward) => reward.rewardId === rewardId) || state.missions.grants.some((reward) => reward.rewardId === rewardId)) return null;
  // A valid state never has two outstanding occurrences of one definition. Refuse to create an
  // ambiguous second one if a damaged or future save violates that bounded-storage invariant.
  if (pendingFor(state, entry.id)) return null;
  const reward: MissionRewardEntitlement = { rewardId, id: entry.id, scope, period, cityId, earnedAt, earnedOrigin, cash: V1_REWARDS[scope].cash };
  state.missions.pending.push(reward);
  emit(state, 'mission.completed', { rewardId, id: entry.id, scope, period, cityId, earnedOrigin, completedAt: earnedAt }, ctx);
  emit(state, 'mission.reward.earned', reward, ctx);
  return reward;
}

/** Persist a set entitlement once all criteria are complete, then grant it if the star balance has room. */
function earnSetReward(state: LifeState, scope: Scope, ctx: LifeContext): boolean {
  const book = state.missions, list = book[scope], period = periodOf(state, scope), key = setKey(scope);
  if (list.length < MISSION_REWARDS[scope].slots || !list.every(done) || book.sets[key] === period || book.pendingSets.some((reward) => reward.scope === scope)) return false;
  const cityId = state.estate.city, earnedAt = nowOf(state, ctx), earnedOrigin = originOf(ctx), stars = V1_REWARDS[scope].setStars;
  const reward: MissionSetRewardEntitlement = { rewardId: setRewardId(cityId, scope, period), scope, period, cityId, earnedAt, earnedOrigin, stars };
  book.pendingSets.push(reward);
  emit(state, 'mission.set.completed', { ...reward, completedAt: earnedAt }, ctx);
  return settlePendingSets(state, ctx).includes(scope);
}

/** Add progress to every unfinished mission the trigger matches. */
function progress(state: LifeState, ctx: LifeContext, matches: (def: MissionDefinition) => boolean, mark: VenueId | null = null): void {
  if (!open(state)) return;
  const time = roll(state, ctx);
  markActive(state, time, ctx);
  for (const scope of ['daily', 'weekly'] as const) {
    for (const entry of state.missions[scope]) {
      const def = defOf(entry.id);
      if (done(entry) || (def.cityId && def.cityId !== ctx.cityId) || !matches(def)) continue;
      if (mark !== null) { if (entry.marks.includes(mark) || entry.marks.length >= MARKS) continue; entry.marks.push(mark); }
      entry.n = Math.min(need(def), entry.n + 1);
      if (done(entry)) {
        earnMissionReward(state, entry, scope, ctx);
        earnSetReward(state, scope, ctx);
      }
    }
  }
}

export function claimMission(state: LifeState, payload: Record<string, unknown>, ctx: LifeContext) {
  if (!open(state)) return fail(state, 'missions_locked', LOCKED);
  roll(state, ctx);
  const id = payload?.id, askedRewardId = payload?.rewardId;
  if (typeof id !== 'string' || !BY_ID.has(id) || (askedRewardId !== undefined && typeof askedRewardId !== 'string')) {
    return fail(state, 'unknown_mission', 'That mission reward is not available.');
  }
  const reward = state.missions.pending.find((item) => item.id === id && (askedRewardId === undefined || item.rewardId === askedRewardId));
  if (!reward) {
    const scope = scopeOf(state, id), entry = scope ? state.missions[scope].find((item) => item.id === id) : undefined, def = defOf(id);
    if (askedRewardId !== undefined && state.missions.grants.some((item) => item.rewardId === askedRewardId)) {
      return fail(state, 'already_claimed', 'You already collected that mission.');
    }
    if (entry && !done(entry)) return fail(state, 'not_done', `${def.label}: ${entry.n} of ${need(def)} so far.`);
    if (entry?.claimed || (askedRewardId === undefined && state.missions.grants.some((item) => item.id === id))) {
      return fail(state, 'already_claimed', 'You already collected that mission.');
    }
    return fail(state, 'unknown_mission', 'That mission reward is not available.');
  }
  if (!canCredit(state, reward.cash)) return fail(state, 'balance_limit', 'Your saved balance has reached its supported limit.');
  const def = defOf(id), grantedAt = nowOf(state, ctx);
  if (!credit(state, reward.cash, `Mission: ${def.label}`, { ...ctx, earnedAt: reward.earnedAt })) return fail(state, 'balance_limit', 'Your saved balance has reached its supported limit.');
  state.missions.pending = state.missions.pending.filter((item) => item.rewardId !== reward.rewardId);
  state.missions.grants = state.missions.grants.filter((item) => item.id !== id);
  const receipt: MissionGrantReceipt = { ...reward, grantedAt };
  state.missions.grants.push(receipt);
  const currentScope = scopeOf(state, id), current = currentScope ? state.missions[currentScope].find((item) => item.id === id) : undefined;
  if (current && currentScope === reward.scope && periodOf(state, currentScope) === reward.period && done(current)) current.claimed = true;
  state.missions.claimed = Math.min(Number.MAX_SAFE_INTEGER, state.missions.claimed + 1);
  state.message = `Mission done: ${def.label} · +${naira(reward.cash)}`;
  emit(state, 'mission.reward.granted', receipt, ctx);
  emit(state, 'mission.claimed', { id, scope: reward.scope, cash: reward.cash, rewardId: reward.rewardId, period: reward.period }, ctx);
  return ok(state, 'claimed');
}

export function rerollMission(state: LifeState, payload: Record<string, unknown>, ctx: LifeContext) {
  if (!open(state)) return fail(state, 'missions_locked', LOCKED);
  roll(state, ctx);
  const book = state.missions, index = book.daily.findIndex((entry) => entry.id === payload?.id);
  if (index < 0) return fail(state, 'unknown_mission', 'Only one of today’s missions can be swapped.');
  const current = book.daily[index];
  if (!current) return fail(state, 'unknown_mission', 'Only one of today’s missions can be swapped.'); // index >= 0 and in range
  if (done(current)) return fail(state, 'already_done', 'That mission is finished. Collect it instead.');
  if (book.rerolls >= MISSION_REWARDS.rerollsPerDay) return fail(state, 'no_rerolls', 'You have used today’s swap. Missions change at midnight, Nigerian time.');
  const old = defOf(current.id);
  const options = DAILY_MISSIONS.filter((def) => def.kind === old.kind && doable(def, state, ctx) && !book.daily.some((entry) => entry.id === def.id) && !pendingFor(state, def.id));
  if (!options.length) return fail(state, 'nothing_else', 'There is no other mission of that kind today.');
  book.rerolls += 1;
  const swapped = options[Math.floor(ctx.rng() * options.length)];
  if (!swapped) return fail(state, 'nothing_else', 'There is no other mission of that kind today.'); // rng() is in [0, 1), so the index is in range
  book.daily[index] = { id: swapped.id, n: 0, marks: [], claimed: false };
  state.message = `Swapped for: ${defOf(swapped.id).label}.`;
  return ok(state, 'rerolled');
}

function sanitizeList(value: unknown, scope: Scope, cityId: string): MissionEntry[] {
  const out: MissionEntry[] = [];
  const saved: unknown[] = Array.isArray(value) ? value.slice(0, MISSION_REWARDS[scope].slots) : [];
  for (const entry of saved) {
    const def = isRecord(entry) && typeof entry.id === 'string' ? BY_ID.get(entry.id) : null;
    if (!isRecord(entry) || !def || !POOLS[scope].includes(def) || out.some((item) => item.id === def.id)) continue;
    const n = safeCount(entry.n) ? Math.min(entry.n, need(def)) : 0;
    const marks = [...new Set((Array.isArray(entry.marks) ? entry.marks : []).flatMap((mark) => { const clean = def.on === 'event' && def.distinct === 'npc' ? cleanNpcIdentity(mark, cityId) : cleanVisitIdentity(mark, cityId); return clean ? [clean] : []; }))].slice(0, MARKS);
    out.push({ id: def.id, n, marks, claimed: entry.claimed === true && n >= need(def) });
  }
  return out;
}

const validScope = (value: unknown): value is Scope => value === 'daily' || value === 'weekly';
function sanitizeReward(value: unknown): MissionRewardEntitlement | null {
  if (!isRecord(value) || typeof value.id !== 'string' || !validScope(value.scope) || !safeCount(value.period)
    || !isCityId(value.cityId) || !finite(value.earnedAt) || !inPeriod(value.scope, value.period, value.earnedAt)
    || !ORIGINS.includes(value.earnedOrigin as ExecutionOrigin)) return null;
  const def = BY_ID.get(value.id), cash = V1_REWARDS[value.scope].cash;
  if (!def || !POOLS[value.scope].includes(def) || value.cash !== cash) return null;
  const rewardId = missionRewardId(value.cityId, value.scope, value.period, value.id);
  return value.rewardId === rewardId ? { rewardId, id: def.id, scope: value.scope, period: value.period, cityId: value.cityId, earnedAt: value.earnedAt, earnedOrigin: value.earnedOrigin as ExecutionOrigin, cash } : null;
}
function sanitizePending(value: unknown): MissionRewardEntitlement[] {
  const out: MissionRewardEntitlement[] = [];
  for (const raw of Array.isArray(value) ? value.slice(0, BY_ID.size) : []) {
    const reward = sanitizeReward(raw);
    if (reward && !out.some((item) => item.id === reward.id || item.rewardId === reward.rewardId)) out.push(reward);
  }
  return out;
}
function sanitizeGrants(value: unknown): MissionGrantReceipt[] {
  const out: MissionGrantReceipt[] = [];
  for (const raw of Array.isArray(value) ? value.slice(-BY_ID.size) : []) {
    const reward = sanitizeReward(raw), grantedAt = isRecord(raw) && finite(raw.grantedAt) ? raw.grantedAt : null;
    if (!reward || grantedAt === null || grantedAt < reward.earnedAt) continue;
    const receipt = { ...reward, grantedAt };
    const prior = out.findIndex((item) => item.id === reward.id);
    if (prior >= 0 && out[prior]!.grantedAt >= grantedAt) continue;
    if (prior >= 0) out.splice(prior, 1);
    out.push(receipt);
  }
  return out;
}
function sanitizePendingSets(value: unknown, sets: LifeState['missions']['sets']): MissionSetRewardEntitlement[] {
  const out: MissionSetRewardEntitlement[] = [];
  for (const raw of Array.isArray(value) ? value.slice(0, 2) : []) {
    if (!isRecord(raw) || !validScope(raw.scope) || !safeCount(raw.period) || !isCityId(raw.cityId)
      || !finite(raw.earnedAt) || !inPeriod(raw.scope, raw.period, raw.earnedAt) || !ORIGINS.includes(raw.earnedOrigin as ExecutionOrigin)
      || raw.stars !== V1_REWARDS[raw.scope].setStars) continue;
    const rewardId = setRewardId(raw.cityId, raw.scope, raw.period);
    if (raw.rewardId !== rewardId || sets[setKey(raw.scope)] === raw.period || out.some((item) => item.scope === raw.scope)) continue;
    out.push({ rewardId, scope: raw.scope, period: raw.period, cityId: raw.cityId, earnedAt: raw.earnedAt, earnedOrigin: raw.earnedOrigin as ExecutionOrigin, stars: V1_REWARDS[raw.scope].setStars });
  }
  return out;
}

// Construct host listeners only in playing builds; their closures retain the full reward mutation graph.
const eventNames = PLAYS ? [...new Set([...DAILY_MISSIONS, ...WEEKLY_MISSIONS].filter((def): def is Extract<MissionDefinition, { on: 'event' }> => def.on === 'event').map((def) => def.event))] : [];
const listeners = PLAYS ? Object.fromEntries(eventNames.map((name) => [name, (state: LifeState, data: unknown, ctx: LifeContext) => {
  const payload = isRecord(data) ? data : {};
  const matches = (def: MissionDefinition): boolean => def.on === 'event' && def.event === name && (def.where === undefined || payload[def.where] === true);
  progress(state, ctx, def => matches(def) && def.on === 'event' && !def.distinct);
  if (typeof payload.npc === 'string' && regularFor(ctx.cityId, payload.npc)) {
    progress(state, ctx, def => matches(def) && def.on === 'event' && def.distinct === 'npc', `npc:${cityReference(ctx.cityId, payload.npc)}`);
  }
}])) : LEFT_OUT;

/** One row of the Missions app. */
function row(state: LifeState, entry: MissionEntry, scope: Scope): MissionRow {
  const def = defOf(entry.id), count = need(def);
  const reward = pendingForOccurrence(state, entry.id, scope, periodOf(state, scope));
  const elsewhere = Boolean(def.cityId && def.cityId !== state.estate.city);
  return { id: def.id, kind: def.kind, label: def.label, hint: elsewhere ? `Return to ${def.cityLabel ?? def.cityId} to continue. ${def.hint}` : def.hint, n: entry.n, count, done: entry.n >= count, claimed: entry.claimed,
    rewardId: reward?.rewardId ?? null, rewardScope: reward?.scope ?? null, rewardPeriod: reward?.period ?? null, rewardCityId: reward?.cityId ?? null,
    cash: reward?.cash ?? MISSION_REWARDS[scope].cash,
    open: elsewhere ? 'map' : def.open ?? null, go: elsewhere ? null : def.go ?? null };
}

/**
 * What only a host that plays the game runs: player actions, settling time and event listeners. The browser reads lives, it never plays them,
 * so its build leaves this out (PLAYS is false there: src/game/profile.ts).
 */
const play = PLAYS ? {
  actions: {
    'missions.claim': claimMission,
    'missions.reroll': rerollMission,
    'missions.refresh'(state, payload, ctx) { roll(state, ctx); return ok(state, 'refreshed'); },
  },
  on: {
    ...listeners,
    /** Settled in: today's missions are dealt now, so they are there when the Phone is next opened. */
    'life.started'(state, data, ctx) { roll(state, ctx); },
    'activity.completed'(state, data, ctx) {
      progress(state, ctx, def => def.on === 'activity' && def.activityId === data.id && def.venueId === state.location && def.spotId === state.spot);
      const tags = Array.isArray(data?.tags) ? data.tags : [];
      progress(state, ctx, (def) => def.on === 'tag' && def.tags.some((tag) => tags.includes(tag)));
      if (!((data?.def?.reward ?? 0) > 0) || !open(state)) return;
      progress(state, ctx, (def) => def.on === 'paid');
      const day = lagosTime(nowOf(state, ctx)).day;
      if (state.missions.paidDay !== day) { state.missions.paidDay = day; emit(state, 'work.day', {}, ctx); }
    },
    'travel.arrived'(state, data, ctx) {
      const venue = data?.venue;
      if (typeof venue !== 'string' || venue === 'home' || !venueFor(ctx.cityId, venue) || !open(state)) return;
      roll(state, ctx);
      const visited = state.missions.visited, identity = visitIdentity(ctx.cityId, venue), fresh = !visited.list.includes(identity);
      progress(state, ctx, (def) => def.on === 'venue' && (!def.venueId || def.venueId === venue) && (!def.fresh || fresh), identity);
      if (fresh && visited.list.length < 64) visited.list.push(identity);
    },
  },
  advance(state, dt, ctx) { roll(state, ctx); },
} satisfies Pick<SystemDefinition<'missions'>, 'actions' | 'on' | 'advance'> : LEFT_OUT;

export default {
  id: 'missions',
  stateKeys: ['missions'],
  sanitize(input, state, ctx) {
    const saved: Record<string, unknown> = isRecord(input.missions) ? input.missions : {};
    const count = (value: unknown, max = Number.MAX_SAFE_INTEGER) => (safeCount(value) && value <= max ? value : 0);
    const active = isRecord(saved.active) && safeCount(saved.active.days) && saved.active.days <= MAX_DAYS && (saved.active.last === null || safeCount(saved.active.last))
      && (saved.active.days === 0) === (saved.active.last === null) ? { days: saved.active.days, last: saved.active.last } : { days: 0, last: null };
    const day = count(saved.day), week = count(saved.week), daily = sanitizeList(saved.daily, 'daily', state.estate.city), weekly = sanitizeList(saved.weekly, 'weekly', state.estate.city);
    const sets = { day: count(isRecord(saved.sets) ? saved.sets.day : undefined), week: count(isRecord(saved.sets) ? saved.sets.week : undefined) };
    const grants = sanitizeGrants(saved.grants), pending = sanitizePending(saved.pending).filter((reward) => !grants.some((receipt) => sameOccurrence(receipt, reward.id, reward.scope, reward.period)));
    // Old saves prove an entitlement only through a completed, unclaimed row in their saved set.
    for (const [scope, period, list] of [['daily', day, daily], ['weekly', week, weekly]] as const) {
      for (const entry of list) {
        const occurrencePending = pending.find((reward) => sameOccurrence(reward, entry.id, scope, period));
        const occurrenceGrant = grants.find((receipt) => sameOccurrence(receipt, entry.id, scope, period));
        const rewardId = missionRewardId(state.estate.city, scope, period, entry.id);
        if (entry.claimed) {
          const found = pending.findIndex((reward) => sameOccurrence(reward, entry.id, scope, period));
          if (found >= 0) pending.splice(found, 1);
        } else if (done(entry) && occurrenceGrant) {
          entry.claimed = true;
        } else if (done(entry) && !occurrencePending && !occurrenceGrant && !pending.some((reward) => reward.id === entry.id)) {
          pending.push({ rewardId, id: entry.id, scope, period, cityId: state.estate.city, earnedAt: legacyEarnedAt(scope, period, state.t), earnedOrigin: 'unknown', cash: V1_REWARDS[scope].cash });
        }
      }
    }
    const pendingSets = sanitizePendingSets(saved.pendingSets, sets);
    // A legacy all-complete set is evidence for its bonus even though the old build waited for collection.
    for (const [scope, period, list] of [['daily', day, daily], ['weekly', week, weekly]] as const) {
      if (list.length === MISSION_REWARDS[scope].slots && list.every(done) && sets[setKey(scope)] !== period && !pendingSets.some((reward) => reward.scope === scope)) {
        pendingSets.push({ rewardId: setRewardId(state.estate.city, scope, period), scope, period, cityId: state.estate.city, earnedAt: legacyEarnedAt(scope, period, state.t), earnedOrigin: 'unknown', stars: V1_REWARDS[scope].setStars });
      }
    }
    state.missions = {
      seed: typeof saved.seed === 'number' && Number.isInteger(saved.seed) && saved.seed >= 0 && saved.seed < 4294967296 ? saved.seed
        : Math.floor(makeRng(`missions-seed|${state.t}|${state.name}|${state.estate.city}`)() * 4294967296),
      day, daily, week, weekly,
      rerolls: count(saved.rerolls, MISSION_REWARDS.rerollsPerDay),
      sets, pending, grants, pendingSets,
      active,
      stamps: isRecord(saved.stamps) && safeCount(saved.stamps.week) && safeCount(saved.stamps.days) && saved.stamps.days <= 7
        ? { week: saved.stamps.week, days: saved.stamps.days, paid: saved.stamps.paid === true && saved.stamps.days >= STAMP_CARD.need } : { week: 0, days: 0, paid: false },
      visited: isRecord(saved.visited) && safeCount(saved.visited.week)
        ? { week: saved.visited.week, list: [...new Set((Array.isArray(saved.visited.list) ? saved.visited.list : []).flatMap((id) => { const clean = cleanVisitIdentity(id, state.estate.city); return clean ? [clean] : []; }))].slice(0, 64) } : { week: 0, list: [] },
      paidDay: count(saved.paidDay),
      titles: [...new Set((Array.isArray(saved.titles) ? saved.titles : []).filter((id): id is MissionTitleId => TITLE_IDS.includes(id)))],
      claimed: count(saved.claimed),
    };
  },
  view(state, ctx) {
    const book = state.missions, now = nowOf(state, ctx), time = lagosTime(now);
    // What is shown is today's set: a saved set from an earlier day is about to be replaced and is not offered.
    const daily = book.day === time.day ? book.daily : [], weekly = book.week === time.week ? book.weekly : [];
    const stamps = book.stamps.week === time.week ? book.stamps : { days: 0, paid: false };
    const set = (list: MissionEntry[], scope: Scope, granted: boolean): MissionSet => ({ done: list.filter((entry) => done(entry)).length, claimed: list.filter((entry) => entry.claimed).length, total: list.length,
      stars: MISSION_REWARDS[scope].setStars, granted });
    const weekStart = lagosDayStart(time.day - ((time.weekday + 6) % 7));
    const titles = book.titles.map((id) => DAY_TITLES.find((title) => title.id === id) ?? WEEK_TITLE);
    const currentRewardIds = new Set([
      ...daily.flatMap((entry) => { const reward = pendingForOccurrence(state, entry.id, 'daily', book.day); return reward ? [reward.rewardId] : []; }),
      ...weekly.flatMap((entry) => { const reward = pendingForOccurrence(state, entry.id, 'weekly', book.week); return reward ? [reward.rewardId] : []; }),
    ]);
    const pendingRewards = book.pending.filter((reward) => !currentRewardIds.has(reward.rewardId)).map((reward) => {
      const def = defOf(reward.id);
      return { ...reward, kind: def.kind, label: def.label };
    });
    return {
      locked: open(state) ? null : LOCKED,
      day: time.day, week: time.week,
      daily: daily.map((entry) => row(state, entry, 'daily')), weekly: weekly.map((entry) => row(state, entry, 'weekly')),
      dailySet: set(daily, 'daily', book.sets.day === time.day), weeklySet: set(weekly, 'weekly', book.sets.week === time.week),
      rerollsLeft: book.day === time.day ? Math.max(0, MISSION_REWARDS.rerollsPerDay - book.rerolls) : MISSION_REWARDS.rerollsPerDay,
      claimable: book.pending.length, pendingRewards, pendingSetRewards: book.pendingSets.map((reward) => ({ ...reward })),
      stamps: { days: stamps.days, need: STAMP_CARD.need, stars: STAMP_CARD.stars, paid: stamps.paid },
      activeDays: book.active.days, title: titles.at(-1)?.label ?? null, titles: titles.map((title) => title.label),
      nextTitle: DAY_TITLES.find((title) => title.days > book.active.days) ?? null,
      resetAt: lagosDayStart(time.day + 1), weekResetAt: weekStart + 7 * 86400000, claimed: book.claimed,
    };
  },
  ...play,
} satisfies SystemDefinition<'missions'>;
