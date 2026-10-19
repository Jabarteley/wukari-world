/**
 * OWNER: agents (AI residents, docs/AI-RESIDENTS.md "Never taken away quietly")
 * AI CHARACTERS ARE NEVER TAKEN AWAY QUIETLY: the runtime of the rule in continuity-data.ts. Portable (no Node imports); driven by the heartbeat.
 *
 * A NOTICE starts from either source:
 *   - an entry of CHANGES (continuity-data.ts) whose `notice` day has come: a change released in code, at least NOTICE_DAYS ahead;
 *   - a resident key the owner put in the setting `residentFarewell` (server/residents/bonds.ts). The farewell no longer happens at once: `farewells()` (the gate bonds-link.ts
 *     calls) lets a key through only when none of its residents is followed or anyone's partner, or when its notice has run for NOTICE_DAYS. Until the people it could
 *     hurt are known (the first look at the store), nothing is let through.
 * WHILE IT RUNS: every follower (feed follows) and every partner (memory.ts `w`) of an affected character gets one line in their feed inbox, from the character, with the day
 * and the reason, and is told that what it remembers about them stays downloadable from its card (GET /api/agents/memory/export). The character stays exactly as it is.
 * ON THE LAST DAY: a goodbye post from the character in the feed, and one more inbox line ("today is the last day"). AFTER: the notice is closed; the person's memory
 * of the character, its card and the export stay (cast-ids.ts `leftMember` keeps the name of one that left).
 * A farewell the owner takes back during the notice is cancelled, and the people told hear that the character is staying.
 *
 * STORED: ctx.collection(db, 'aiContinuity') = { v: 1, notices: { [key]: Notice } }: a notice keeps the ids it covers and the public ids told (at most CONTINUITY.told).
 */
import { lagosTime } from '../../src/game/clock.ts';
import { cityName } from '../../src/game/cities/index.ts';
import { agentWords } from '../moderation/agent-words.ts';
import { peekFeed } from '../feed/data.ts';
import { feedService } from '../feed/service.ts';
import { residentService } from '../residents/resident.ts';
import type { Db, RouteContext } from '../types.ts';
import { RESIDENTS, residentId } from '../residents/life.ts';
import { PER_CITY_MAX, residentsInCity } from '../residents/world.ts';
import { cityCatalogue } from '../../src/game/cities/index.ts';
import { castOf } from './cast.ts';
import { castMember } from './cast-ids.ts';
import { CHANGES, NOTICE_DAYS, covers, lagosDate, noticeDays, print } from './continuity-data.ts';
import type { Change } from './continuity-data.ts';
import { peekMemory } from './memory.ts';

export const CONTINUITY = Object.freeze({ tickMs: 5 * 60000, told: 5000, perRun: 400, ids: 50 });
const DAY_MS = 86400000;

export interface Notice { key: string; ids: string[]; name: string; what: 'leave' | 'change'; reason: string; at: number; until: number; told: string[]; bye?: number; done?: number; cancelled?: number }
export interface ContinuityCollection { v: 1; notices: Record<string, Notice> }
const record = (value: unknown): value is Record<string, unknown> => value !== null && typeof value === 'object' && !Array.isArray(value);
function continuityOf(ctx: Pick<RouteContext, 'collection'>, db: Db): ContinuityCollection {
  const found = ctx.collection(db, 'aiContinuity', { v: 1, notices: {} }) as Partial<ContinuityCollection>;
  if (!record(found.notices)) found.notices = {};
  found.v = 1;
  return found as ContinuityCollection;
}
export const peekContinuity = (db: Db): ContinuityCollection | null => { const found = (db as unknown as Record<string, unknown>)['aiContinuity']; return record(found) && record(found.notices) ? found as unknown as ContinuityCollection : null; };

/**
 * The fingerprints of the cast as the code has it now (continuity-data.ts CAST_PRINTS is the released copy): every authored house-agent spec (name, role, voice, card), every
 * authored resident (name and city), and one digest of every generated resident of every catalogue city (its id and name). Needs the city catalogue loaded.
 */
/** One open city for each authored house cast: Lagos's own, and a city of each country's fallback cast (`castOf` gives the cast of the city's country). */
export const CAST_GROUP_CITIES: Readonly<Record<string, string>> = Object.freeze({ lagos: 'lagos', ng: 'abuja', gh: 'accra', ke: 'nairobi', za: 'cape-town', world: 'london' });
export function currentPrints(): Record<string, string> {
  const out: Record<string, string> = {};
  // The rules of these cities must be loaded (castOf gives nothing for a city whose rules are not): the test loads them.
  for (const [group, city] of Object.entries(CAST_GROUP_CITIES)) for (const spec of castOf(city)) out[`house:${group}:${spec.key}`] = print(`${spec.name}|${spec.role}|${spec.voice}|${spec.card}`);
  for (const who of RESIDENTS) out[`resident:${residentId(who)}`] = print(`${who.name}|${who.city}`);
  const generated = cityCatalogue().map((city) => city.id).sort().flatMap((id) => residentsInCity(id, PER_CITY_MAX).filter((who) => who.generated).map((who) => `${residentId(who)}|${who.name}`));
  out['generated'] = print(generated.join('\n'));
  return out;
}

/**
 * THE CHECK continuity.test.ts runs on every change to the cast: what is wrong with the released fingerprints against the code now, and with the change entries.
 * Empty when the rule holds. Pure.
 */
export function registryProblems(released: Readonly<Record<string, string>>, current: Readonly<Record<string, string>>, changes: readonly Change[], now: number): string[] {
  const problems: string[] = [];
  for (const change of changes) {
    if (!Number.isFinite(lagosDate(change.notice)) || !Number.isFinite(lagosDate(change.effective))) problems.push(`${change.id}: notice and effective must be YYYY-MM-DD`);
    else if (noticeDays(change) < NOTICE_DAYS) problems.push(`${change.id}: ${noticeDays(change)} days of notice; the rule is at least ${NOTICE_DAYS}`);
    if (!change.reason.trim() || !change.name.trim()) problems.push(`${change.id}: a change needs a name and a reason`);
  }
  // A key of the released cast (house:<group>:<key>, resident:<id>, generated) as the ids a change entry names.
  const idsOf = (key: string): string[] => key === 'generated' ? ['resident.*'] : key.startsWith('house:') ? [`house.*.${key.split(':')[2]}`, ...(key.split(':')[1] === 'lagos' ? [`house.lagos.${key.split(':')[2]}`] : [])] : [key.slice('resident:'.length)];
  for (const [key, before] of Object.entries(released)) {
    if (current[key] === before) continue;
    const covered = changes.some((change) => idsOf(key).includes(change.id) && Number.isFinite(lagosDate(change.effective)) && lagosDate(change.effective) <= now && noticeDays(change) >= NOTICE_DAYS);
    if (!covered) problems.push(`${key} ${current[key] === undefined ? 'was removed' : 'changed'} without ${NOTICE_DAYS} days' notice: add a CHANGES entry and keep the character as it was until its effective day${current[key] ? ` (its print is now '${current[key]}')` : ''}`);
  }
  for (const [key, value] of Object.entries(current)) if (!Object.hasOwn(released, key)) problems.push(`${key} is new: add it to CAST_PRINTS as '${value}'`);
  return problems;
}

/** Who would be hurt by a change: the followers (feed) and partners (memory) of each character of the game's own cast. Reads only. */
export function audienceOf(db: Db): Map<string, Set<string>> {
  const out = new Map<string, Set<string>>();
  const add = (character: string, person: string): void => { let set = out.get(character); if (!set) out.set(character, set = new Set()); set.add(person); };
  for (const [person, author] of Object.entries(peekFeed(db)?.authors ?? {})) for (const target of Object.keys(author.follows ?? {})) if (target.startsWith('house.') || target.startsWith('resident.')) add(target, person);
  for (const [person, kept] of Object.entries(peekMemory(db)?.people ?? {})) for (const [agent, bond] of Object.entries(record(kept?.a) ? kept.a : {})) if (record(bond) && bond.w) add(agent, person);
  return out;
}

const dateWords = (t: number): string => new Date(t + 3600000).toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long', timeZone: 'UTC' });
const placeOf = (city: string): string => { try { return cityName(city) ?? city; } catch { return city; } };
/** The inbox line of a notice. Pure. */
export function noticeLine(notice: Pick<Notice, 'name' | 'what' | 'reason' | 'until'>): string {
  const when = dateWords(notice.until);
  return notice.what === 'leave'
    ? `${notice.name} is leaving on ${when}. ${notice.reason} You can still talk to them until then, and what they remember about you stays downloadable from their card in Settings.`.slice(0, 280)
    : `${notice.name} will change on ${when}. ${notice.reason} What they remember about you stays downloadable from their card in Settings.`.slice(0, 280);
}
export const byeLine = (name: string): string => `Today is ${name}'s last day as you know them. Say goodbye if you can. What they remember about you stays downloadable from their card in Settings.`;
export const goodbyePost = (city: string): string => `This is my last day here in ${placeOf(city)}. Thank you for following me and for every chat. Take good care of yourselves.`;
export const stayLine = (name: string): string => `Good news: ${name} is staying after all.`;

export interface ContinuityDeps {
  /** The residents who live now, by key (the farewell setting names keys). Defaults to the resident runner's roster. */
  roster?: () => readonly { id: string; key: string; name: string; city: string }[]
  /** The changes in code; continuity-data.ts CHANGES by default. Tests give their own. */
  changes?: readonly Change[]
}

export function continuityService(ctx: RouteContext, deps: ContinuityDeps = {}) {
  const changes = deps.changes ?? CHANGES;
  const roster = deps.roster ?? ((): { id: string; key: string; name: string; city: string }[] => { try { return residentService(ctx).roster.map((who) => ({ id: `resident.${who.city}.${who.key}`, key: who.key, name: who.name, city: who.city })); } catch { return []; } });
  let audience: Map<string, Set<string>> | null = null, notices: Record<string, Notice> = {}, wanted: string[] = [];
  let busy = false, lastTick = -Infinity;

  /**
   * THE GATE for the owner's farewell setting (bonds-link.ts): which of these keys may leave now. A key whose residents nobody follows or partners passes at once; one that
   * somebody would miss passes only when its notice has run. Never before the first look at who would be hurt. Remembers what was asked, so the next run starts the notice.
   */
  function farewells(keys: readonly string[]): string[] {
    wanted = [...new Set(keys.map((key) => key.trim().toLowerCase()).filter(Boolean))].slice(0, 20);
    if (!audience) return [];
    const t = ctx.now();
    return wanted.filter((key) => {
      const notice = notices[`farewell:${key}`];
      if (notice) return notice.cancelled === undefined && t >= notice.until;
      return !roster().some((who) => who.key === key && (audience!.get(who.id)?.size ?? 0) > 0);
    });
  }

  /** One run: read who would be hurt, start, tell, say goodbye and close notices. Bounded: CONTINUITY.perRun inbox lines a run. */
  async function run(): Promise<{ told: number; goodbyes: number }> {
    const t = ctx.now();
    const read = await ctx.store.read((db) => ({ audience: audienceOf(db), notices: structuredClone(peekContinuity(db)?.notices ?? {}) }));
    audience = read.audience; notices = read.notices;
    const due = changes.filter((change) => lagosDate(change.notice) <= t && t < lagosDate(change.effective) + DAY_MS && Number.isFinite(lagosDate(change.effective)));
    const farewellKeys = wanted.filter((key) => (!notices[`farewell:${key}`] || notices[`farewell:${key}`]!.cancelled !== undefined) && roster().some((who) => who.key === key && (read.audience.get(who.id)?.size ?? 0) > 0));
    const open = Object.values(notices).filter((notice) => notice.done === undefined && notice.cancelled === undefined);
    const dropped = open.filter((notice) => notice.key.startsWith('farewell:') && !wanted.includes(notice.key.slice(9)));
    if (!due.some((change) => !notices[`change:${change.id}`]) && !farewellKeys.length && !open.length) return { told: 0, goodbyes: 0 };
    const result = await ctx.store.transact((db) => {
      const stored = continuityOf(ctx, db), feed = feedService(ctx), people = audienceOf(db);
      let told = 0, goodbyes = 0;
      const idsOf = (match: (id: string) => boolean): string[] => [...people.keys()].filter(match).slice(0, CONTINUITY.ids);
      for (const change of due) {
        const key = `change:${change.id}`;
        if (stored.notices[key]) continue;
        stored.notices[key] = { key, ids: idsOf((id) => covers(change, id)), name: change.name, what: change.what, reason: change.reason, at: t, until: lagosDate(change.effective), told: [] };
      }
      for (const key of farewellKeys) {
        const nkey = `farewell:${key}`;
        if (stored.notices[nkey] && stored.notices[nkey]!.cancelled === undefined) continue; // a farewell asked again after it was taken back starts a new notice
        const who = roster().filter((entry) => entry.key === key);
        if (!who.length) continue;
        stored.notices[nkey] = { key: nkey, ids: who.map((entry) => entry.id).slice(0, CONTINUITY.ids), name: who[0]!.name, what: 'leave', reason: `${who[0]!.name} is leaving ${placeOf(who[0]!.city)} for good.`, at: t, until: t + NOTICE_DAYS * DAY_MS, told: [] };
      }
      for (const notice of dropped) {
        const live = stored.notices[notice.key];
        if (!live || live.cancelled !== undefined || live.done !== undefined) continue;
        live.cancelled = t;
        const from = live.ids[0];
        if (from) for (const person of live.told.slice(0, CONTINUITY.perRun)) if (feed.aiNote(db, person, from, stayLine(live.name))) told += 1;
      }
      for (const notice of Object.values(stored.notices)) {
        if (notice.done !== undefined || notice.cancelled !== undefined) continue;
        const from = notice.ids.find((id) => castMember(id)) ?? notice.ids[0];
        if (!from) { notice.done = t; continue; }
        // Followers and partners who have not been told yet (somebody may have started following during the notice).
        const told = new Set(notice.told);
        for (const id of notice.ids) for (const person of people.get(id) ?? []) {
          if (told.has(person) || told.size >= CONTINUITY.told || told.size - notice.told.length >= CONTINUITY.perRun) continue;
          if (feed.aiNote(db, person, from, noticeLine(notice))) told.add(person);
        }
        told.forEach((person) => { if (!notice.told.includes(person)) notice.told.push(person); });
        // The last day: a goodbye post from each character, and one more line to everyone told.
        if (notice.bye === undefined && t >= notice.until - DAY_MS) {
          notice.bye = t;
          for (const id of notice.ids.slice(0, 10)) { const who = castMember(id); if (who && agentWords(goodbyePost(who.city), { toMinor: true }).ok && feed.aiPost(db, id, { kind: 'moment', body: goodbyePost(who.city), city: who.city, vis: 'public' })) goodbyes += 1; }
          for (const person of notice.told.slice(0, CONTINUITY.told)) feed.aiNote(db, person, from, byeLine(notice.name));
        }
        if (t >= notice.until) notice.done = t;
      }
      // Closed notices are kept 60 days (the record of who was told), then dropped.
      for (const [key, notice] of Object.entries(stored.notices)) if ((notice.done ?? notice.cancelled ?? Infinity) < t - 60 * DAY_MS) delete stored.notices[key];
      notices = structuredClone(stored.notices);
      return { told, goodbyes };
    }, { durable: false });
    return result;
  }
  function tick(): void {
    const t = ctx.now();
    if (busy || t - lastTick < CONTINUITY.tickMs) return;
    busy = true; lastTick = t;
    void run().catch(() => undefined).finally(() => { busy = false; });
  }
  ctx.on?.('heartbeat', tick);
  return {
    run, tick, farewells,
    /** For a character's card: the notice running for it, if any (`until` is when it leaves or changes). */
    noticeFor: (id: string): { until: number; what: 'leave' | 'change'; reason: string } | null => {
      const notice = Object.values(notices).find((entry) => entry.done === undefined && entry.cancelled === undefined && entry.ids.includes(id));
      return notice ? { until: notice.until, what: notice.what, reason: notice.reason } : null;
    },
    ready: (): boolean => audience !== null,
  };
}
export type Continuity = ReturnType<typeof continuityService>;
const services = new WeakMap<object, Continuity>();
export function continuityFor(ctx: RouteContext): Continuity { let found = services.get(ctx); if (!found) services.set(ctx, found = continuityService(ctx)); return found; }
/** Erasure: a person leaves no trace in the record of who was told. */
export function eraseContinuity(db: Db, publicId: string): void { for (const notice of Object.values(peekContinuity(db)?.notices ?? {})) notice.told = notice.told.filter((id) => id !== publicId); }
