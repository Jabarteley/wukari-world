/**
 * OWNER: agents (residents, docs/RESIDENTS.md)
 * THE RESIDENT RUNNER: an agent that really lives. Portable (no Node imports): the Node host and the Worker run it on the heartbeat.
 * RESIDENTS EVERYWHERE (15 October 2026, docs/RESIDENTS.md): `residentsPerCity` (default 3) residents live in EVERY open city of the host: the authored ones first, then
 * generated ones (generate.ts, the same every restart). They are visible by default (`residentShadow` off) and live BY RULES: the routine, outings chosen by character
 * (persona.ts), written lines, written talk, prayers by devotion. The model is a small share: answers to people who speak to a resident (paid list), deep thoughts and
 * model talks out of a quota spread over the day (`residentDeepPerDay`), and the night of a resident who met a person. At most STEP_MAX residents are stepped per
 * beat, round-robin. When the budget is spent nobody goes to bed: they carry on by rules. State: 16 small collections, only the changed ones written.
 * (Everything below about thirty residents, shadow and "all go to sleep when the budget is spent" is the older design; the code keeps what it still means.)
 * Phase 13a: ONE resident (life.ts), in SHADOW: it acts, but nobody sees it.
 * Phase 13b: up to THIRTY (life.ts Remi and roster.ts the rest), switched on in order by the setting `residentCount` (default 1: only Remi), each with its
 * own sleep, routine, model (spread over the router's resident list at birth) and life story. New in 13b, all bounded:
 *   - AGENT-TO-AGENT TALK: two awake residents who stand in the same venue may have a short exchange, at most TALK_TURNS (4) lines, one line per beat (so at
 *     least TALK_STEP_MS apart). The first speaker is handed ONE real line of the gist ledger (server/gist/ledger.ts, the check_gist source) of that city
 *     to talk about, chosen by code, and the exchange record keeps its number; a line that carries a number the ledger does not, a link, or anything out of
 *     character or against the agent word rules is thrown away (one retry). A cheap repetition check ends it early: a line whose words overlap the last lines
 *     of the exchange or the resident's own recent lines, or that repeats a ledger line already used. A pair talks at most once per PAIR_GAP_MS, a resident
 *     at most MAX_TALKS times a day. In shadow the lines are only kept in the record.
 *   - STRANGERS (shadow off only): a person who writes in the venue where a visible resident stands, naming her (or when she is the only resident there and
 *     no house agent is), gets ONE short in-character reply: purpose 'resident' with carriesPlayerWords true (so only paid models ever see the person's
 *     words), the same word rules, never a price (a resident does not trade yet), nothing remembered about the person except a one-way key that counts
 *     how many different people spoke to residents, and on how many days (the experiment's measure).
 *   - THE BUDGET: the residents share the router's. They also stop at the setting `residentDailyCents` (default 100 = US$1, never above US$1.90, below the
 *     router's US$2 hard stop): all residents go to sleep early for the rest of the UTC day, so other purposes still answer.
 *
 * THE DAY. It sleeps on a schedule in its city's local time (asleep it costs nothing: no tick work, no call) and wakes in the morning. Awake it
 * follows its routine (the house action library, house/actions.ts `planAt`, no model). A model is asked a "thought" only
 *   - on an event: morning, a routine step ended, someone arrived where it stands, someone nearby said its name (never what they said);
 *   - when it is awake and alone, no more often than every 15 to 30 minutes.
 * Event thoughts are spaced at least 3 minutes apart and the whole day has a ceiling (MAX_THOUGHTS). "Pay for waking, not ticking."
 *
 * A THOUGHT is ONE router call (purpose 'resident', carriesPlayerWords false, the model assigned at birth tried first): the reply is JSON,
 * { "next": <one of CHOICES>, "say": <a short line or ""> }, checked in code (judge). A reply that is not that JSON, or that steps out of
 * character (mentions AI, a model, a game, a player, an assistant, a prompt), or whose line breaks the agent word rules, is THROWN AWAY and
 * asked again once; after the second failure it does what its routine says. Slips are counted. The prompt never contains those words either, and
 * never says which people are agents.
 *
 * AT NIGHT, when it goes to bed, ONE more call writes a short first-person summary of the day (bounded, kept for 7 days, the last two go back into
 * the next day's prompts); a written summary stands in when the call fails or the budget is spent.
 *
 * THE BUDGET is the router's (free models first, the US$2 a day stop, resting models). Nothing here has its own money. When the router says the
 * day's budget is spent the resident goes to sleep for the rest of the UTC day.
 *
 * SHADOW (admin settings residentOn, on by default only on the live hosts (ctx.worldFeed), off in tests; residentShadow, on by default). In shadow it is NOT placed in agentRoom (so not in the
 * people list and not in the pulse `ai` number), its lines are NOT sent to anyone, it reads no person's words and it changes no player's state.
 * Its "world" is its own sandbox record (where it stands, what it does, the lines it WOULD have said). With residentShadow off it stands in its
 * venue with the AI-played mark and says its lines through agentRoom.say (the same word rules as every agent): that is for the next phase.
 *
 * STORED (optional, lazily, never durable): the collection `residents` = { v: 1, residents: { [id]: { born, model, days, memory } } }, 7 days, at most
 * MAX_ENTRIES choices a day. The admin page reads it from memory (group "Resident (shadow)").
 */
import { lagosTime } from '../../src/game/clock.ts';
import { sha256Hex } from '../../src/game/util.ts';
import { cityRules } from '../../src/game/cities/index.ts';
import { venueLabel } from '../../src/game/content/venues.ts';
import { agentWords } from '../moderation/agent-words.ts';
import { gistService } from '../gist/ledger.ts';
import type { GistItem } from '../gist/ledger.ts';
import { initialVenuePosition, venueRoomKey } from '../protocol.ts';
import { registerAdminSetting } from '../admin/settings.ts';
import { registerAdminStat } from '../admin/tools.ts';
import { routerOf } from '../models/service.ts';
import type { AskInput, AskResult } from '../models/router.ts';
import { entryKey } from '../models/catalog.ts';
import type { Db, RouteContext } from '../types.ts';
import { ACTIONS, planAt } from '../house/actions.ts';
import type { ActionId } from '../house/actions.ts';
import { HOUSE_LOOKS, venueFor } from '../house/cast.ts';
import { intentOf } from '../house/talk.ts';
import { OUT_OF_CHARACTER, RESIDENTS, residentId } from './life.ts';
import { PASTIMES, describePersona, hourAt, lunchSkipped, outingOdds, pastimeAt, personaOf, prayersToday, ruleLine, ruleVow, talkLine, talkOdds, talkProfile, weekdayAt } from './persona.ts';
import type { PastimeId } from './persona.ts';
import { residentsOfCities, venueOfKind } from './world.ts';
import { prayersOf } from '../prayers/service.ts';
import { fateIn, prayerText } from '../prayers/model.ts';
import type { Fate } from '../prayers/model.ts';
import type { Resident } from './life.ts';
import { judgeIdea, newsFromFounders, splitNight, voiceService } from './voice.ts';
import type { IdeaIn } from './voice.ts';

/** What a thought may choose: five of the house actions, "keep to the routine", or to pray (Phase 14). Anything else is thrown away. A resident who is not a seller is not offered the market trip. */
export const CHOICES = ['keep_routine', 'open_shop', 'go_market', 'eat', 'go_home', 'pray'] as const;
export type Choice = typeof CHOICES[number];
export { OUT_OF_CHARACTER };
const CHOICE_HELP: Readonly<Record<Choice, string>> = Object.freeze({
  keep_routine: 'carry on with what the day plan says', open_shop: 'go to your usual place of work and get on with it', go_market: 'go to the market for stock',
  eat: 'go and eat something', go_home: 'go home and be on your own',
  pray: 'say a prayer in your own words (write it in "prayer"; once a day at most, when something weighs on you or you are grateful)',
});
export type Wake = 'morning' | 'routine-end' | 'arrival' | 'spoken-to' | 'alone';

/** Thoughts and records are bounded: nothing here grows. */
export const ALONE_MS = [15 * 60000, 30 * 60000] as const, EVENT_GAP_MS = 3 * 60000;
export const MAX_THOUGHTS = 64, MAX_ENTRIES = 120, MAX_INFLIGHT = 4, DAYS_KEPT = 7, SUMMARY_MAX = 600, LINE_MAX = 140, MODEL_TOKENS = 160, SUMMARY_TOKENS = 320;
/** Agent-to-agent talk: at most 4 lines, one per beat at least TALK_STEP_MS apart; a pair at most once per PAIR_GAP_MS; a resident MAX_TALKS times a day. */
export const TALK_TURNS = 4, TALK_STEP_MS = 20000, PAIR_GAP_MS = 2 * 3600000, TALK_GAP_MS = 20 * 60000, MAX_TALKS = 5, TALKS_KEPT = 12, TALK_TOKENS = 120, REPEAT_AT = 0.7;
/** Replies to people (shadow off): tokens, how many people are remembered by key, and the most replies a resident gives a day. */
export const REPLY_TOKENS = 140, TALKERS_KEPT = 400, MAX_REPLIES = 120;
export const SAVE_MS = 30000, ENTRY_DAYS = 2;
export const COUNT_MAX = 30, CENTS_DEFAULT = 100, CENTS_MAX = 190;
/** Residents everywhere: how many are stepped per beat (round-robin), the model's share of the day (deep thoughts), rule prayers for all together, and the most rule-driven talks at once. */
export const STEP_MAX = 48, DEEP_DEFAULT = 240, DEEP_MAX = 2000, DEEP_PER_BEAT = 2, DEEP_BURST = 4, RULE_PRAYERS_PER_DAY = 40, RULE_EXCHANGES = 60, SHARDS = 16, DAYS_KEPT_RULE = 2, RULE_TALKS_KEPT = 60, OUTING_SLOT_MIN = 45;
const CENSUS_MS = 30000, PRESENCE_MS = 12 * 60000, RENEW_MS = 6 * 60000, CHOICE_MS = 60 * 60000;
/** `on`: whether she lives when the owner has not chosen; on the real hosts (the ones that ask the outside world, ctx.worldFeed) she does, in shadow. */
export const DEFAULTS = Object.freeze({ on: false, shadow: false, count: 1, cents: CENTS_DEFAULT, perCity: 3, deep: DEEP_DEFAULT });

export interface Entry {
  at: number; reason: Wake
  /** What it chose ('keep_routine' when it did, or when it fell back) and what its routine said. */
  action: Choice; routine: ActionId
  /** The line it would have said (shadow) or said. */
  line: string | null
  outcome: 'model' | 'routine'; why: string | null
  /** The model that answered (the one assigned at birth, or the fallback that took over), and its cost in millionths of a dollar. */
  model: string | null; free: boolean | null; costMicro: number
  retries: number; slips: number; invalid: number
}
/** One exchange between two residents (13b): who, where, the real ledger line it was about (its number), the lines said, and why it ended. */
export interface TalkRecord {
  at: number; between: [string, string]; room: string; ground: number | null; groundText: string | null
  lines: { by: string; text: string; model: string | null }[]
  ended: 'turns' | 'repeat' | 'slip' | 'budget' | 'failed' | 'left'
}
export interface DayRecord {
  day: number; wokeAt: number | null; sleptAt: number | null; sleptEarly: boolean
  /** Prayers said today (at most one). Optional: older records do not have it. */
  prayed?: number
  thoughts: number; retries: number; slips: number; invalid: number; fallbacks: number; costMicro: number
  entries: Entry[]; summary: string | null; summaryCostMicro: number
  /** 13b, all optional so a saved 13a day still loads. Talk with other residents: exchanges joined, lines said, retries, slips, cost, the exchanges themselves (newest last). */
  talks?: number; talkLines?: number; talkRetries?: number; talkSlips?: number; talkCostMicro?: number; talkLog?: TalkRecord[]
  /** 13b: replies to people (shadow off): how many, retries, slips, cost. */
  replies?: number; replyRetries?: number; replySlips?: number; replyCostMicro?: number
  /** Residents everywhere, all optional: outings, written lines said, rule-driven talks, and whether a person was where it stood (visible only). */
  outings?: number; said?: number; ruleTalks?: number; met?: boolean
}
export interface Life {
  born: number; model: string | null; days: Record<string, DayRecord>; memory: string[]
  /** 13b: one-way keys of people who spoke to this resident and the life days of their first and latest word: { [key]: [first, last] }. At most TALKERS_KEPT. */
  talkers?: Record<string, [number, number]>
}
export interface Stored { v: 1; residents: Record<string, Life> }

const blankDay = (day: number): DayRecord => ({ day, wokeAt: null, sleptAt: null, sleptEarly: false, thoughts: 0, retries: 0, slips: 0, invalid: 0, fallbacks: 0, costMicro: 0, entries: [], summary: null, summaryCostMicro: 0 });

export type Verdict = { ok: true; next: Choice; say: string | null; prayer: string | null } | { ok: false; slip: 'character' | 'words' | 'invalid' };
/** The choices a resident is offered: everything (praying included), but the market trip only for a seller. */
export const choicesFor = (who: Resident): readonly Choice[] => (who.work.role === 'seller' ? CHOICES : CHOICES.filter((choice) => choice !== 'go_market'));
/** The whole check of a reply: in character, the right JSON, a choice from the list, a short line that passes the agent word rules. */
export function judge(raw: string, allowed: readonly Choice[] = CHOICES): Verdict {
  const text = String(raw ?? '');
  if (OUT_OF_CHARACTER.test(text)) return { ok: false, slip: 'character' };
  const from = text.indexOf('{'), to = text.lastIndexOf('}');
  if (from < 0 || to <= from) return { ok: false, slip: 'invalid' };
  let parsed: unknown;
  try { parsed = JSON.parse(text.slice(from, to + 1)); } catch { return { ok: false, slip: 'invalid' }; }
  if (typeof parsed !== 'object' || parsed === null || Array.isArray(parsed)) return { ok: false, slip: 'invalid' };
  const { next, say, prayer } = parsed as Record<string, unknown>;
  if (typeof next !== 'string' || !(allowed as readonly string[]).includes(next)) return { ok: false, slip: 'invalid' };
  if (say !== undefined && say !== null && typeof say !== 'string') return { ok: false, slip: 'invalid' };
  const line = typeof say === 'string' ? say.replace(/\s+/g, ' ').trim() : '';
  if (line.length > LINE_MAX) return { ok: false, slip: 'invalid' };
  if (line && !agentWords(line, { toMinor: true }).ok) return { ok: false, slip: 'words' };
  // A prayer is written only when the choice is to pray: bounded, in character, and passing the same word rules as a spoken line.
  let said: string | null = null;
  if (next === 'pray') {
    const written = prayerText(typeof prayer === 'string' ? prayer : '');
    if (!written.ok) return { ok: false, slip: 'invalid' };
    if (OUT_OF_CHARACTER.test(written.text)) return { ok: false, slip: 'character' };
    if (!agentWords(written.text, { toMinor: true }).ok) return { ok: false, slip: 'words' };
    said = written.text;
  }
  return { ok: true, next: next as Choice, say: line || null, prayer: said };
}
/** A summary is plain text: in character, passing the word rules, cut to SUMMARY_MAX. */
export function judgeSummary(raw: string): { ok: true; text: string } | { ok: false; slip: 'character' | 'words' | 'invalid' } {
  const text = String(raw ?? '').replace(/\s+/g, ' ').trim();
  if (text.length < 20) return { ok: false, slip: 'invalid' };
  if (OUT_OF_CHARACTER.test(text)) return { ok: false, slip: 'character' };
  if (!agentWords(text, { toMinor: true }).ok) return { ok: false, slip: 'words' };
  return { ok: true, text: text.slice(0, SUMMARY_MAX) };
}

// ---- talk: the checks of a line said to another resident or to a person, and the cheap repetition check --------------------------------------
const STOP = new Set(['the', 'and', 'for', 'you', 'are', 'was', 'were', 'that', 'this', 'with', 'have', 'has', 'had', 'but', 'not', 'your', 'our', 'they', 'their', 'there', 'what', 'when', 'will', 'would', 'just', 'about', 'from', 'been', 'its', 'too', 'very', 'yes', 'did', 'does', 'how', 'who', 'all', 'can', 'any']);
const wordsOf = (text: string): string[] => text.toLowerCase().normalize('NFKD').replace(/[^\p{L}\p{N}\s]/gu, ' ').split(/\s+/).filter((word) => word.length > 2 && !STOP.has(word));
/** The share of the words of `a` that `b` also has (0 when `a` has fewer than 3 words that carry meaning). */
export function overlap(a: string, b: string): number {
  const mine = wordsOf(a), theirs = new Set(wordsOf(b));
  return mine.length < 3 ? 0 : mine.filter((word) => theirs.has(word)).length / mine.length;
}
/** Is `line` a repeat of one of `before`: the same words (ignoring case and marks), or high overlap either way round? */
export function repeats(line: string, before: readonly string[]): boolean {
  const flat = (text: string): string => text.toLowerCase().replace(/[^\p{L}\p{N}]+/gu, ' ').trim();
  return before.some((other) => flat(line) === flat(other) || Math.max(overlap(line, other), overlap(other, line)) >= REPEAT_AT);
}
/** A line said aloud (to another resident or to a person): plain text, short, no links or brackets, no number except those in `numbers`, in character, clean under the agent word rules. */
export function judgeTalk(raw: string, numbers: ReadonlySet<string> = new Set()): { ok: true; text: string } | { ok: false; slip: 'character' | 'words' | 'invalid' } {
  const text = String(raw ?? '').replace(/\s+/g, ' ').trim().replace(/^["“'`]+|["”'`]+$/g, '').trim().replace(/^[A-Z][A-Za-z .']{1,24}:\s+/, '');
  if (text.length < 2 || text.length > LINE_MAX) return { ok: false, slip: 'invalid' };
  if (/[<>{}\[\]\\]|https?:|www\.|@/.test(text)) return { ok: false, slip: 'invalid' };
  if (OUT_OF_CHARACTER.test(text)) return { ok: false, slip: 'character' };
  for (const found of text.match(/\d[\d,]*(?:\.\d+)?/g) ?? []) if (!numbers.has(found.replace(/,/g, '').replace(/\.0+$/, ''))) return { ok: false, slip: 'invalid' };
  if (!agentWords(text, { toMinor: true }).ok) return { ok: false, slip: 'words' };
  return { ok: true, text };
}
const digitsOf = (lines: readonly string[]): Set<string> => new Set(lines.flatMap((line) => (line.match(/\d[\d,]*(?:\.\d+)?/g) ?? []).map((found) => found.replace(/,/g, '').replace(/\.0+$/, ''))));
/** What a resident says to a person when no model answers (or none should): short, in character, with no price and no promise. */
export const WRITTEN: readonly string[] = Object.freeze(['Hello, good to see you. How is your day going?', 'Take your time, I am in no hurry today.', 'That is kind of you to say. Tell me more if you like.', 'It is good to stand and talk for a while.']);
export const NOT_TRADING = 'I am not selling anything just now, but I am happy to talk.';
export const GOODBYE = 'Go well, and come by again.';

const hash = (text: string): number => { let h = 2166136261; for (const char of text) { h ^= char.charCodeAt(0); h = Math.imul(h, 16777619); } return h >>> 0; };
const WEEKDAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

/** The few places Phase 20 (bonds.ts) reaches into a resident's day. All optional: with none set a resident behaves exactly as in Phase 13b. */
export interface ResidentHooks {
  profile?: (id: string) => string | null
  talked?: (a: string, b: string, t: number) => void
  hold?: (id: string) => string | null
  retired?: (id: string) => boolean
}
export interface ResidentDeps {
  ask?: (input: AskInput) => Promise<AskResult>
  /** The models of the 'resident' list in order, for the assignment at birth. */
  models?: () => string[]
  load?: () => Promise<Stored | undefined>
  save?: (stored: Stored) => Promise<void>
  residents?: readonly Resident[]
  /** Where a prayer goes (the admin's Prayers page); tests give their own. */
  pray?: (prayer: { id: string; name: string; city: string; text: string; situation: string }) => Promise<void>
  /** What the owner has done to this resident (docs/PRAYERS.md): read into its next turns. */
  fate?: (id: string) => Promise<Fate | null>
  /** Where a night's wish or need goes (13c, the voice to the owner: voice.ts); tests give their own. */
  collect?: (idea: IdeaIn) => Promise<unknown>
  /** What the owner has told the residents lately, as lines for the prompt (13c); tests give their own. */
  founders?: () => Promise<string[]>
}

export function residentsOf(ctx: RouteContext, deps: ResidentDeps = {}) {
  const ask = deps.ask ?? ((input: AskInput): Promise<AskResult> => routerOf(ctx).ask(input));
  const modelList = deps.models ?? ((): string[] => { try { return routerOf(ctx).listFor('resident').map(entryKey); } catch { return []; } });
  const setting = (key: string): boolean | number | string | undefined => ctx.checks?.setting?.(key) ?? ctx.checks?.text?.(key);
  const num = (key: string, least: number, most: number, fallback: number): number => { const value = setting(key); return typeof value === 'number' && Number.isFinite(value) ? Math.max(least, Math.min(most, Math.round(value))) : fallback; };
  /** `residentCount` is retired (old saved values are read and ignored: residents live in every open city); `residentsPerCity` says how many. */
  const settings = () => { const shadow = setting('residentShadow'); return { on: setting('residentOn') === true, shadow: typeof shadow === 'boolean' ? shadow : DEFAULTS.shadow, perCity: num('residentsPerCity', 0, 5, DEFAULTS.perCity), cents: num('residentDailyCents', 0, CENTS_MAX, DEFAULTS.cents), deep: num('residentDeepPerDay', 0, DEEP_MAX, DEFAULTS.deep) }; };
  /** WHO LIVES WHERE. With a roster given (tests) exactly that one; else `perCity` residents in each open city of the host (authored first, then generated), rebuilt when the setting or the city list changes. */
  const fixed = deps.residents;
  let built: readonly Resident[] = fixed ?? [], builtFor = '', byId = new Map<string, Resident>(), cursor = 0;
  function rosterNow(): readonly Resident[] {
    if (fixed) { if (!byId.size && fixed.length) byId = new Map(fixed.map((who) => [residentId(who), who])); return fixed; }
    const cities = ctx.cityIds ?? [], key = `${settings().perCity}|${cities.length}|${cities[0] ?? ''}`;
    if (key !== builtFor) {
      built = residentsOfCities(cities, settings().perCity); builtFor = key; byId = new Map(built.map((who) => [residentId(who), who])); cursor = 0;
      // Whoever no longer lives here (the setting went down) is put away at once.
      for (const state of live.values()) if (!byId.has(state.id) && state.asleep !== null) beat(state, ctx.now(), false, true);
    }
    return built;
  }
  const whoIs = (id: string | undefined): Resident | undefined => { const list = rosterNow(); return id ? byId.get(id) : list[0]; };
  const room = () => ctx.checks?.agentRoom;
  let stored: Stored = { v: 1, residents: {} };
  let loaded: Promise<void> | null = null;
  /** Stored in SHARDS small collections (`residents` is the old single one, read once and emptied), by a hash of the resident's id, and only the shards whose text changed are written. */
  const shardOf = (id: string): number => hash(id) % SHARDS;
  const shardName = (n: number): string => `residentsS${n.toString(16)}`;
  const shardText: string[] = new Array(SHARDS).fill('');
  let legacyLeft = false;
  const load = deps.load ?? ((): Promise<Stored | undefined> => ctx.store.read((db) => {
    const all = db as Record<string, unknown>, merged: Stored = { v: 1, residents: {} };
    const take = (col: unknown): boolean => { if (!col || typeof col !== 'object' || typeof (col as Stored).residents !== 'object' || (col as Stored).residents === null) return false; Object.assign(merged.residents, structuredClone((col as Stored).residents)); return true; };
    legacyLeft = take(all['residents']) && Object.keys((all['residents'] as Stored).residents).length > 0;
    let found = legacyLeft;
    for (let n = 0; n < SHARDS; n++) found = take(all[shardName(n)]) || found;
    return found ? merged : undefined;
  }));
  const save = deps.save ?? (async (value: Stored): Promise<void> => {
    const parts: Stored[] = Array.from({ length: SHARDS }, () => ({ v: 1, residents: {} }));
    for (const [id, life] of Object.entries(value.residents)) parts[shardOf(id)]!.residents[id] = life;
    const texts = parts.map((part) => JSON.stringify(part)), changed = texts.map((text, n) => text !== shardText[n]);
    if (!changed.some(Boolean) && !legacyLeft) return;
    await ctx.store.transact((db) => {
      texts.forEach((text, n) => { if (changed[n]) Object.assign(ctx.collection(db, shardName(n), { v: 1, residents: {} }), structuredClone(parts[n]!)); });
      if (legacyLeft) { const old = (db as Record<string, unknown>)['residents']; if (old && typeof old === 'object') (old as Stored).residents = {}; }
    }, { durable: false });
    texts.forEach((text, n) => { shardText[n] = text; });
    legacyLeft = false;
  });
  const rulesPray = (): boolean => setting('residentRulePrayers') !== false;
  const pray = deps.pray ?? ((prayer: { id: string; name: string; city: string; text: string; situation: string }): Promise<void> => ctx.store.transact((db) => { prayersOf(ctx).residentPrays(db, prayer); }));
  const fateRead = deps.fate ?? ((id: string): Promise<Fate | null> => ctx.store.read((db) => fateIn(db, id)));
  const collect = deps.collect ?? ((idea: IdeaIn): Promise<unknown> => voiceService(ctx).collect(idea));
  const founders = deps.founders ?? ((): Promise<string[]> => ctx.store.read((db) => newsFromFounders(db, ctx.now())));
  let isReady = false;
  const ready = (): Promise<void> => (loaded ??= load().then((found) => { if (found && typeof found.residents === 'object' && found.residents !== null) stored = { v: 1, residents: { ...found.residents } }; }, () => {}).then(() => { isReady = true; }));
  // Residents change their records all day: they are written at most once in SAVE_MS (four times that with a whole world of them), by the heartbeat, and only the shards that changed.
  let saving = false, dirty = false, lastSave = -Infinity;
  function persist(): void { dirty = true; }
  function saveIfDue(t: number): void {
    if (!dirty || saving || (t - lastSave < (rosterNow().length > 100 ? SAVE_MS * 4 : SAVE_MS) && t >= lastSave)) return;
    saving = true; lastSave = t;
    void (async () => { try { while (dirty) { dirty = false; await save(stored); } } catch { /* the next change tries again */ } finally { saving = false; } })();
  }
  /** THE BUDGET. The router's day stop (answers 'budget') or the residents' own (residentDailyCents) puts every resident to bed for the rest of the UTC day. */
  let stopDay = -1;
  const spend = { day: -1, micro: 0 };
  const utc = (t: number): number => Math.floor(t / 86400000);
  const stopped = (t: number): boolean => stopDay === utc(t);
  function spentToday(): number {
    const day = utc(ctx.now());
    if (spend.day !== day) { spend.day = day; spend.micro = 0; }
    let ledger = 0;
    try { ledger = deps.ask ? 0 : routerOf(ctx).today().ledger.byPurpose['resident']?.micro ?? 0; } catch { ledger = 0; }
    return Math.max(spend.micro, ledger);
  }
  const overBudget = (): boolean => { if (stopped(ctx.now())) return true; if (spentToday() >= settings().cents * 10000) { stopDay = utc(ctx.now()); return true; } return false; };
  /** Every model call of a resident goes through here: one budget check, the cost added to the residents' day, a refused 'budget' stops them all. */
  async function callModel(input: AskInput): Promise<AskResult> {
    if (overBudget()) return { ok: false, why: 'budget', attempts: [] };
    const answer = await ask(input);
    if (answer.ok) { spentToday(); spend.micro += answer.costMicro; } else if (answer.why === 'budget') stopDay = utc(ctx.now());
    return answer;
  }
  let inflight = 0;

  /** Everything that lives only in memory, per resident. */
  interface Live {
    who: Resident; id: string; asleep: boolean | null; busy: boolean
    nextAlone: number; lastThought: number; lastRoutine: ActionId | null; lastPeople: number
    doing: { action: ActionId; until: number } | null
    pending: Wake | null; postRoom: string | null
    lines: number; presentAt: { room: string; until: number } | null; mark: number
    summarising: boolean
    /** Where it stands now (a venue room key; in shadow only in its own record), whether it is in an exchange, when the last one ended, its own latest lines. */
    where: string | null; talking: boolean; lastTalk: number; recent: string[]; replying: boolean
    /** An outing it chose by its personality (persona.ts), the slot it last decided in, the rooms of its work resolved in its city's own venues (generated residents), and a line waiting to be said. */
    outing: { room: string; doing: string; until: number; pastime: PastimeId } | null; slot: string
    rooms: { post: string | null; market: string | null; eatery: string | null; tried: number }
    say: string | null; announced: string
  }
  const live = new Map<string, Live>();
  /** Awake residents by the room they stand in (visible or on paper), so a line, a census or a meeting never walks the whole roster. */
  const whereIndex = new Map<string, Set<Live>>();
  function setWhere(state: Live, where: string | null): void {
    if (state.where === where) return;
    if (state.where) { const set = whereIndex.get(state.where); set?.delete(state); if (set && !set.size) whereIndex.delete(state.where); }
    state.where = where;
    if (where) { const set = whereIndex.get(where); if (set) set.add(state); else whereIndex.set(where, new Set([state])); }
  }
  /** Phase 20 (bonds.ts) plugs in here and nowhere else: a short public profile line, a note of each talk, a place to hold a resident (a wedding), a resident who has left. */
  const hooks: ResidentHooks = {};
  let census: { at: number; rooms: Map<string, number> } = { at: -Infinity, rooms: new Map() };

  function liveOf(who: Resident): Live {
    const id = residentId(who);
    let found = live.get(id);
    if (!found) {
      const post = who.kinds ? null : venueFor(who.city, who.work.post, who.work.role);
      found = { who, id, asleep: null, busy: false, nextAlone: 0, lastThought: -Infinity, lastRoutine: null, lastPeople: 0, doing: null, pending: null, postRoom: post ? venueRoomKey(who.city, post, '') : null, lines: 0, presentAt: null, mark: 0, summarising: false, where: null, talking: false, lastTalk: -Infinity, recent: [], replying: false,
        outing: null, slot: '', rooms: { post: null, market: null, eatery: null, tried: -Infinity }, say: null, announced: '' };
      live.set(id, found);
    }
    return found;
  }
  function lifeOf(who: Resident, t: number): Life {
    const id = residentId(who);
    let found = Object.hasOwn(stored.residents, id) ? stored.residents[id]! : undefined;
    if (!found) { found = { born: t, model: null, days: {}, memory: [] }; stored.residents[id] = found; heldFor = -1; }
    return found;
  }
  /** THE MODEL ASSIGNED AT BIRTH (given the first time a model is needed, so a resident who only follows rules holds none): one of the router's 'resident' list, spread by count, ties by the resident's own id, kept for life. */
  const held = new Map<string, number>();
  let heldFor = -1;
  function modelFor(life: Life, id: string): string | null {
    if (life.model !== null) return life.model;
    const list = modelList();
    if (!list.length) return null;
    const count = Object.keys(stored.residents).length;
    if (heldFor !== count) { held.clear(); for (const other of Object.values(stored.residents)) if (other.model) held.set(other.model, (held.get(other.model) ?? 0) + 1); heldFor = count; }
    const start = hash(id) % list.length;
    life.model = [...list.slice(start), ...list.slice(0, start)].reduce((best, key) => ((held.get(key) ?? 0) < (held.get(best) ?? 0) ? key : best));
    held.set(life.model, (held.get(life.model) ?? 0) + 1);
    persist();
    return life.model;
  }
  const preferOf = (life: Life, id: string): { prefer?: string } => { const model = modelFor(life, id); return model ? { prefer: model } : {}; };

  // ---- time: the city's clock, the sleep schedule and the "life day" (wake to wake) -----------------------------------------------------
  const localMinute = (who: Resident, t: number): number => ((Math.floor(t / 60000) + who.utcOffsetMin) % 1440 + 1440) % 1440;
  function asleepAt(who: Resident, t: number): boolean {
    const m = localMinute(who, t), bed = Math.round(who.sleep.bed * 60), wake = Math.round(who.sleep.wake * 60);
    return bed > wake ? m >= bed || m < wake : m >= bed && m < wake;
  }
  /** The number of the life day a moment belongs to: it turns over at the wake-up hour, so one night's sleep stays with the day before it. */
  const lifeDay = (who: Resident, t: number): number => Math.floor((t + who.utcOffsetMin * 60000 - Math.round(who.sleep.wake * 3600000)) / 86400000);
  const utcDay = (t: number): number => Math.floor(t / 86400000);
  function dayOf(who: Resident, t: number): DayRecord {
    const life = lifeOf(who, t), key = String(lifeDay(who, t));
    if (!Object.hasOwn(life.days, key)) {
      life.days[key] = blankDay(lifeDay(who, t));
      for (const old of Object.keys(life.days).map(Number).sort((a, b) => a - b).slice(0, -(who.generated ? DAYS_KEPT_RULE : DAYS_KEPT))) delete life.days[String(old)];
      // The day-by-day choices are kept for the newest ENTRY_DAYS days only: thirty residents' week of them would be large; the counters stay.
      for (const old of Object.keys(life.days).map(Number).sort((a, b) => a - b).slice(0, -ENTRY_DAYS)) { const kept = life.days[String(old)]!; kept.entries = []; if (kept.talkLog) kept.talkLog = kept.talkLog.slice(-3); }
    }
    return life.days[key]!;
  }

  // ---- the routine: the house action library, no model ---------------------------------------------------------------------------------
  /** The action library's day plan keeps Lagos hours; a resident's hours are its own city's, so the clock is shifted by the difference. */
  const routineOf = (who: Resident, t: number) => { const shift = (who.utcOffsetMin - 60) * 60000, slot = planAt(who.work, t + shift); return { action: slot.action, until: slot.until - shift }; };
  function takeCensus(t: number): typeof census {
    if (t - census.at < CENSUS_MS && t >= census.at) return census;
    const rooms = new Map<string, number>();
    for (const ws of ctx.core?.sockets?.() ?? []) { const where = ws.room; if (where && ws.session?.agent !== true) rooms.set(where, (rooms.get(where) ?? 0) + 1); }
    census = { at: t, rooms };
    return census;
  }
  const MAIN_ACTION: Readonly<Record<string, ActionId>> = { seller: 'open_shop', guide: 'work_shift', marketer: 'announce', quiz: 'host_quiz', mission: 'give_tasks' };
  /** The room of a resident's post, market or eatery. Authored residents name venues; generated ones name KINDS of venue, resolved in their city's own loaded content (retried every few minutes while nobody has opened the city). */
  function roomOf(state: Live, which: 'post' | 'market' | 'eatery', t: number): string | null {
    const { who } = state, { work, city } = who;
    if (!who.kinds) {
      if (which === 'post') {
        // An authored resident names venues; a city nobody has opened yet has none loaded, so the post is looked for again every few minutes.
        if (!state.postRoom && !(t >= state.rooms.tried && t - state.rooms.tried < 5 * 60000)) { const v = venueFor(city, work.post, work.role); if (v) state.postRoom = venueRoomKey(city, v, ''); else state.rooms.tried = t; }
        return state.postRoom;
      }
      if (which === 'market') { const v = venueFor(city, work.market ?? work.post, 'seller'); return v ? venueRoomKey(city, v, '') : state.postRoom; }
      const v = work.eatery ? venueFor(city, work.eatery, 'guide') : null;
      return v ? venueRoomKey(city, v, '') : null;
    }
    const cache = state.rooms;
    if (cache[which]) return cache[which];
    if (t >= cache.tried && t - cache.tried < 5 * 60000) return which === 'market' ? roomOf(state, 'post', t) : null;
    const kinds = which === 'market' ? who.kinds.market ?? who.kinds.post : which === 'eatery' ? who.kinds.eatery ?? [] : who.kinds.post;
    let id = kinds.length ? venueOfKind(city, kinds, `${state.id}|${which}`) : null;
    if (!id && which !== 'eatery') id = venueOfKind(city, ['market', 'park', 'office', 'hub', 'walk'], `${state.id}|${which}|fallback`);
    if (id) cache[which] = venueRoomKey(city, id, ''); else cache.tried = t;
    return cache[which] ?? (which === 'market' ? roomOf(state, 'post', t) : null);
  }
  function placeFor(state: Live, action: ActionId, t: number): string | null {
    const held = hooks.hold?.(state.id);
    if (held) return held;
    if (state.outing && t < state.outing.until) return state.outing.room;
    const place = ACTIONS[action].place;
    if (place === 'post') return roomOf(state, 'post', t);
    if (place === 'market') return roomOf(state, 'market', t);
    if (place === 'eatery') return roomOf(state, 'eatery', t);
    return null;
  }
  /** What the resident is doing now: a choice a model made, else the day plan with its personality applied (those who skip lunch eat at their post). */
  function actionNow(state: Live, routine: { action: ActionId }, t: number): ActionId {
    if (state.doing && t < state.doing.until) return state.doing.action;
    if (routine.action === 'eat' && lunchSkipped(personaOf(state.who), `${state.id}|${Math.floor((t + state.who.utcOffsetMin * 60000) / 86400000)}|lunch`)) return MAIN_ACTION[state.who.work.role] ?? 'work_shift';
    return routine.action;
  }
  /** What a choice means for this resident: praying keeps the routine; "open_shop" is its own work (a shift, for one who has no stall). */
  const actionOf = (choice: Choice, routine: ActionId, who?: Resident): ActionId => (choice === 'keep_routine' || choice === 'pray' ? routine : choice === 'open_shop' && who && who.work.role !== 'seller' ? 'work_shift' : choice);

  // ---- the prompt: the life story, then only what the character itself would know -----------------------------------------------------------
  async function newsOf(city: string): Promise<string[]> {
    try {
      const gist = gistService(ctx);
      const items = await ctx.store.read((db) => gist.recent(db, city, { limit: 3 }));
      return items.slice(0, 3).map((item) => item.text.replace(/[.!?]+$/, ''));
    } catch { return []; }
  }
  const REASON: Readonly<Record<Wake, string>> = Object.freeze({
    'morning': 'You have just woken up.', 'routine-end': 'The thing you were doing has come to an end.', 'arrival': 'Someone has just come to where you are.',
    'spoken-to': 'Someone nearby has said your name.', 'alone': 'You are on your own for a while.',
  });
  function system(who: Resident, json = true): string {
    return `${who.story}\n\nYou are ${who.name}, speaking and thinking as yourself. ${json ? 'Answer only with a small JSON object and nothing else.' : 'Answer only with what you would say aloud.'} You never ask anyone for money, for their private details, or to meet you anywhere but where you both already are.`;
  }
  async function thoughtMessages(state: Live, life: Life, day: DayRecord, t: number, reason: Wake, routine: ActionId): Promise<{ role: 'system' | 'user'; content: string }[]> {
    const { who } = state, local = localMinute(who, t), city = cityRules(who.city)?.name ?? who.city;
    const clock = `${String(Math.floor(local / 60)).padStart(2, '0')}:${String(local % 60).padStart(2, '0')}`;
    const weekday = WEEKDAYS[lagosTime(t + (who.utcOffsetMin - 60) * 60000).weekday]!;
    const news = await newsOf(who.city);
    const fate = await fateRead(state.id).catch(() => null);
    const fromFounders = await founders().catch(() => [] as string[]);
    const recent = day.entries.slice(-3).map((e) => `${ACTIONS[actionOf(e.action, e.routine, who)].doing}${e.line ? `, saying "${e.line}"` : ''}`);
    const lines = [
      `It is ${clock} on ${weekday} in ${city}. ${REASON[reason]}`,
      `Your day plan says: ${ACTIONS[routine].doing.toLowerCase()}.`,
      `How you are, by nature: ${describePersona(personaOf(who))}.`,
      state.doing && t < state.doing.until ? `Right now you are ${ACTIONS[state.doing.action].doing.toLowerCase()}.` : '',
      recent.length ? `Earlier today: ${recent.join('; ')}.` : '',
      life.memory.length ? `How your last days felt: ${life.memory.slice(-2).map((m) => m.slice(0, 300)).join(' ')}` : '',
      news.length ? `What people are talking about in town: ${news.join('; ')}.` : '',
      ...fateLines(fate, who, t),
      ...fromFounders.map((line) => `News from the Founders: ${line}`),
      '',
      'What do you do next? Choose "next" from:',
      ...choicesFor(who).map((choice) => `- ${choice}: ${CHOICE_HELP[choice]}`),
      'You may also say one short thing aloud ("say", under 140 characters, or an empty string if you say nothing). You can choose anything on the list, including carrying on as planned.',
      'Reply as {"next":"...","say":"..."}; with "pray", also "prayer":"...".',
    ];
    return [{ role: 'system', content: system(who) }, { role: 'user', content: lines.filter((line, at) => line !== '' || at > 0).join('\n') }];
  }
  /** What happened to the resident that it would take as its own luck, its own dream or its own mood. Never says where it came from. */
  function fateLines(fate: Fate | null, who: Resident, t: number): string[] {
    if (!fate) return [];
    const out: string[] = [];
    if ((fate.sickUntil ?? 0) > t) out.push('You are not feeling well today: a fever.');
    const dream = (fate.dreams ?? []).filter((d) => t - d.at < 86400000).at(-1);
    if (dream) out.push(`A dream stayed with you: ${dream.text}`);
    if (fate.cross && fate.cross.until > t && fate.cross.city === who.city) out.push(`Something keeps pulling you towards ${venueLabel(fate.cross.venue, who.city)} today.`);
    return out;
  }
  const RETRY = 'That was not what I needed. Answer again as yourself, in your own words: only the small JSON object with "next" and "say".';

  // ---- a thought: one call, checked in code, one retry, then the routine --------------------------------------------------------------------
  function record(state: Live, day: DayRecord, entry: Entry): void {
    day.entries.push(entry);
    if (day.entries.length > MAX_ENTRIES) day.entries.splice(0, day.entries.length - MAX_ENTRIES);
    day.thoughts += 1; day.retries += entry.retries; day.slips += entry.slips; day.invalid += entry.invalid; day.costMicro += entry.costMicro;
    if (entry.outcome === 'routine') day.fallbacks += 1;
    persist();
  }
  async function think(state: Live, reason: Wake, t: number): Promise<void> {
    const { who } = state;
    const life = lifeOf(who, t), day = dayOf(who, t), routine = routineOf(who, t);
    const entry: Entry = { at: t, reason, action: 'keep_routine', routine: routine.action, line: null, outcome: 'routine', why: null, model: null, free: null, costMicro: 0, retries: 0, slips: 0, invalid: 0 };
    state.lastThought = t;
    if (day.thoughts >= MAX_THOUGHTS) { entry.why = 'cap'; record(state, day, entry); applyChoice(state, entry, t); return; }
    const messages = await thoughtMessages(state, life, day, t, reason, routine.action);
    let verdict: Verdict | null = null;
    for (let attempt = 0; attempt < 2; attempt++) {
      let answer: AskResult;
      try { answer = await callModel({ purpose: 'resident', messages: attempt === 0 ? messages : [...messages, { role: 'user', content: RETRY }], maxTokens: MODEL_TOKENS, carriesPlayerWords: false, timeoutMs: 8000, ...preferOf(life, state.id) }); }
      catch { entry.why = 'failed'; break; }
      if (!answer.ok) {
        entry.why = answer.why;
        // The day's budget is spent (the router's or the residents' own, callModel): everyone goes to bed early, for the rest of the UTC day.
        break;
      }
      entry.model = answer.model; entry.free = answer.free; entry.costMicro += answer.costMicro;
      const checked = judge(answer.text, choicesFor(who));
      if (checked.ok) { verdict = checked; break; }
      if (checked.slip === 'invalid') entry.invalid += 1; else entry.slips += 1;
      entry.why = checked.slip;
      if (attempt === 0) entry.retries += 1;
    }
    if (verdict) { entry.outcome = 'model'; entry.action = verdict.next; entry.line = verdict.say; entry.why = null; }
    else entry.line = null;
    if (verdict?.next === 'pray') {
      // A prayer goes to the admin's Prayers page and nowhere else: it is not spoken. One a day; a second is let go as a quiet moment.
      entry.line = null;
      if ((day.prayed ?? 0) >= 1 || !verdict.prayer) entry.action = 'keep_routine';
      else {
        day.prayed = (day.prayed ?? 0) + 1;
        const fate = await fateRead(state.id).catch(() => null), local = localMinute(who, t);
        const situation = `${(fate?.sickUntil ?? 0) > t ? 'unwell' : 'well'} · ${ACTIONS[routine.action].doing.toLowerCase()} · ${String(Math.floor(local / 60)).padStart(2, '0')}:${String(local % 60).padStart(2, '0')} local`;
        try { await pray({ id: state.id, name: who.name, city: who.city, text: verdict.prayer, situation }); } catch { /* the prayer is lost; the day goes on */ }
      }
    }
    record(state, day, entry);
    applyChoice(state, entry, ctx.now());
  }
  /** What the choice does to the resident's own world: where it stands and what it does. In shadow that is all (the sandbox); the line is only kept. */
  function applyChoice(state: Live, entry: Entry, t: number): void {
    const action = actionOf(entry.action, entry.routine, state.who);
    state.doing = { action, until: Math.min(routineOf(state.who, t).until, t + CHOICE_MS) };
    if (entry.line) {
      state.lines += 1;
      if (!settings().shadow) void speak(state, entry.line);
    }
  }
  async function speak(state: Live, text: string): Promise<void> {
    const where = state.presentAt?.room, door = room();
    if (!where || !door || !agentWords(text, { toMinor: true }).ok) return;
    try { await door.say({ id: state.id, name: state.who.name, mark: { agent: true } }, where, text, null); } catch { /* a refused line is dropped */ }
  }

  // ---- the night: one call, a short summary of the day ------------------------------------------------------------------------------------
  function writtenSummary(state: Live, day: DayRecord): string {
    const did = [...new Set(day.entries.map((e) => ACTIONS[actionOf(e.action, e.routine, state.who)].doing.toLowerCase()))].slice(0, 4);
    return `${did.length ? `Today I was ${did.join(', then ')}.` : 'A quiet day.'} I made ${day.thoughts} small decisions and kept to my plan where I was unsure. Tomorrow I will do the same, a little better.`.slice(0, SUMMARY_MAX);
  }
  async function summarise(state: Live, t: number): Promise<void> {
    const { who } = state;
    if (state.summarising) return;
    state.summarising = true;
    try {
      const life = lifeOf(who, t), day = dayOf(who, t - 3600000);
      if (day.summary !== null) return;
      let text: string | null = null, night: ReturnType<typeof splitNight> | null = null;
      if (!stopped(t) && (day.met === true || (day.replies ?? 0) > 0)) {
        const doings = day.entries.length === 0 ? ['I went about my usual day and met someone while I was out.'] : day.entries.slice(-30).map((e) => {
          const local = localMinute(who, e.at);
          return `${String(Math.floor(local / 60)).padStart(2, '0')}:${String(local % 60).padStart(2, '0')} ${ACTIONS[actionOf(e.action, e.routine, who)].doing.toLowerCase()}${e.line ? `, saying "${e.line}"` : ''}`;
        });
        const messages = [{ role: 'system' as const, content: system(who) }, { role: 'user' as const, content: `Your day is over and you are going to bed. This is how it went:\n${doings.join('\n')}\n\nIn two to four sentences, in the first person and plain words, write what you will remember about today and what you hope for tomorrow. Then, only if it is true for you, add up to two more lines: \"Wish: \" and one short line (under 100 characters) about something your town lacks that you wish it had, and \"Need: \" and one short line about something you keep failing to get or do. Leave a line out if you have nothing for it. Plain text only.` }];
        for (let attempt = 0; attempt < 2 && text === null; attempt++) {
          let answer: AskResult;
          try { answer = await callModel({ purpose: 'resident', messages: attempt === 0 ? messages : [...messages, { role: 'user', content: 'Please write it again in your own words, as yourself. Plain text only.' }], maxTokens: SUMMARY_TOKENS, carriesPlayerWords: false, timeoutMs: 8000, ...preferOf(life, state.id) }); }
          catch { break; }
          if (!answer.ok) break;
          day.summaryCostMicro += answer.costMicro; day.costMicro += answer.costMicro;
          const parts = splitNight(answer.text), checked = judgeSummary(parts.summary);
          if (checked.ok) { text = checked.text; night = parts; } else if (checked.slip === 'invalid') day.invalid += 1; else day.slips += 1;
          if (!checked.ok && attempt === 0) day.retries += 1;
        }
      }
      day.summary = text ?? writtenSummary(state, day);
      // 13c: the night may also yield ONE wish and ONE need (voice.ts): each checked on its own; a bad one is dropped, never the summary.
      for (const [kind, line] of [['wish', night?.wish], ['need', night?.need]] as const) {
        const idea = line ? judgeIdea(line) : null;
        if (idea?.ok) await Promise.resolve().then(() => collect({ id: state.id, name: who.name, city: who.city, kind, text: idea.text })).catch(() => {});
      }
      // Kept for a week; a generated resident keeps only what a model wrote (one who met a person), so the many who only follow rules cost no space.
      if (text !== null || !who.generated) {
        life.memory.push(day.summary);
        if (life.memory.length > (who.generated ? DAYS_KEPT_RULE : DAYS_KEPT)) life.memory.splice(0, life.memory.length - (who.generated ? DAYS_KEPT_RULE : DAYS_KEPT));
      } else day.summary = null;
      persist();
    } finally { state.summarising = false; }
  }

  // ---- the beat ----------------------------------------------------------------------------------------------------------------------------
  function leave(state: Live): void {
    if (state.presentAt) { room()?.absent(state.id); state.presentAt = null; }
  }
  const withProfile = (id: string, doing: string): string => { const line = hooks.profile?.(id); return line ? `${doing} · ${line}`.slice(0, 80) : doing; };
  function stand(state: Live, action: ActionId, t: number): void {
    const door = room(), target = placeFor(state, action, t);
    if (!door) return;
    if (!target) { leave(state); return; }
    const cur = state.presentAt;
    if (cur && cur.room === target && cur.until - t >= PRESENCE_MS - RENEW_MS) return;
    const base = initialVenuePosition(target.split(':')[1] ?? ''), h = hash(`${state.id}|${target}`);
    const position = { x: Math.max(-18, Math.min(18, base.x + (h % 9 - 4) * 0.9)), z: Math.max(-18, Math.min(18, base.z + ((h >>> 8) % 9 - 4) * 0.9)) };
    const out = state.outing && t < state.outing.until && state.outing.room === target ? state.outing : null;
    door.present({ id: state.id, name: state.who.name, mark: { agent: true }, room: target, position, doing: withProfile(state.id, out ? out.doing : (action === 'open_shop' || action === 'work_shift') && state.who.doing ? state.who.doing : ACTIONS[action].doing), look: HOUSE_LOOKS[state.who.look ?? 'sis'], until: t + PRESENCE_MS });
    state.presentAt = { room: target, until: t + PRESENCE_MS };
  }
  const jitter = (state: Live, t: number): number => t + ALONE_MS[0] + (hash(`${state.id}|${Math.floor(t / 60000)}`) % (ALONE_MS[1] - ALONE_MS[0]));

  // ---- deep thoughts: the model's small share of the day --------------------------------------------------------------------------------------
  /** The day's deep thoughts (and talks) are paid out of a quota spread over the UTC day: at most `residentDeepPerDay` (default 240), and never ahead of the clock by more than a few. */
  const deep = { day: -1, used: 0, beat: 0 };
  function deepRoom(t: number, need: number): boolean {
    const quota = settings().deep;
    if (quota <= 0 || stopped(t)) return false;
    const d = utc(t);
    if (deep.day !== d) { deep.day = d; deep.used = 0; }
    return deep.used + need <= Math.floor(quota * ((t % 86400000) / 86400000)) + DEEP_BURST;
  }
  const deepCap = (): number => Math.max(2, Math.min(MAX_THOUGHTS, Math.ceil(settings().deep * 3 / Math.max(1, rosterNow().length))));

  // ---- what a resident does by its own character, with no model ---------------------------------------------------------------------------------
  const ruleSamples: string[] = [];
  const rulePrayed = { day: -1, n: 0 };
  /** A written line chosen by traits: how often it speaks and how much depends on how talkative it is; the line itself is from its style, tongue, likes and goals. */
  function queueLine(state: Live, day: DayRecord, kind: 'morning' | 'greet' | 'work' | 'outing' | 'remark' | 'evening', t: number, extra: { pastime?: PastimeId } = {}): void {
    const p = personaOf(state.who), prof = talkProfile(p);
    if ((day.said ?? 0) >= prof.lines || state.say) return;
    const odds = kind === 'greet' ? 35 + p.chatty * 0.6 : kind === 'morning' ? 30 + p.chatty * 0.5 : kind === 'outing' ? 20 + p.chatty * 0.5 : 8 + p.chatty * 0.4;
    if (hash(`${state.id}|${kind}|${Math.floor(t / 60000)}|odds`) % 100 >= odds) return;
    const text = ruleLine(p, kind, `${state.id}|${Math.floor(t / 60000)}|${kind}`, { ...extra, owl: state.who.sleep.wake >= 7.5 });
    if (!text || OUT_OF_CHARACTER.test(text) || !agentWords(text, { toMinor: true }).ok) return;
    day.said = (day.said ?? 0) + 1; state.lines += 1; state.say = text;
    ruleSamples.push(`${clockOf(state.who, t)} ${state.who.name}: ${text}`); if (ruleSamples.length > 30) ruleSamples.shift();
  }
  /** What a resident does when it is not at its post, decided once per 45-minute slot by its character: a walk, a bite, the market, a quiet hour at the place of worship. */
  function considerOuting(state: Live, day: DayRecord, routine: { action: ActionId }, t: number): void {
    if (state.outing && t >= state.outing.until) state.outing = null;
    const { who } = state, key = `${lifeDay(who, t)}:${Math.floor(localMinute(who, t) / OUTING_SLOT_MIN)}`;
    if (state.slot === key) return;
    state.slot = key;
    if (state.outing || hooks.hold?.(state.id) || (state.doing && t < state.doing.until)) return;
    const p = personaOf(who), working = routine.action !== 'go_home' && routine.action !== 'eat';
    const pastime = pastimeAt(p, `${state.id}|${key}`, weekdayAt(t, who.utcOffsetMin), hourAt(t, who.utcOffsetMin), working);
    if (!pastime) return;
    const venue = venueOfKind(who.city, PASTIMES[pastime].kinds, `${state.id}|${pastime}|${lifeDay(who, t)}`);
    if (!venue) return;
    const target = venueRoomKey(who.city, venue, '');
    if (target === roomOf(state, 'post', t)) return;
    const [lo, hi] = PASTIMES[pastime].minutes, minutes = lo + hash(`${state.id}|${key}|len`) % (hi - lo + 1);
    state.outing = { room: target, doing: PASTIMES[pastime].doing, until: t + minutes * 60000, pastime };
    day.outings = (day.outings ?? 0) + 1; persist();
    queueLine(state, day, 'outing', t, { pastime });
  }
  /** A prayer by rule: faith and devotion decide whether and how often (persona.ts); a morning one half an hour after waking, a second in the last hours before bed. All together at most RULE_PRAYERS_PER_DAY a UTC day. */
  function rulePray(state: Live, day: DayRecord, t: number): void {
    if (!rulesPray()) return;
    const { who } = state, p = personaOf(who), want = prayersToday(p, `${state.id}|${day.day}`), said = day.prayed ?? 0;
    if (said >= want || t - (day.wokeAt ?? t) < 30 * 60000) return;
    const toBed = (Math.round(who.sleep.bed * 60) - localMinute(who, t) + 1440) % 1440;
    if (said === 1 && toBed > 150) return;
    const d = utc(t);
    if (rulePrayed.day !== d) { rulePrayed.day = d; rulePrayed.n = 0; }
    if (rulePrayed.n >= RULE_PRAYERS_PER_DAY) return;
    const text = ruleVow(p.faith, `${state.id}|${day.day}|${said}`);
    if (OUT_OF_CHARACTER.test(text) || !agentWords(text, { toMinor: true }).ok) return;
    rulePrayed.n += 1; day.prayed = said + 1; persist();
    void pray({ id: state.id, name: who.name, city: who.city, text, situation: `${ACTIONS[routineOf(who, t).action].doing.toLowerCase()} · ${clockOf(who, t)} local` }).catch(() => {});
  }
  /** What a wake-up means when no model is asked: a written line, if its character would say one. */
  function ruleReact(state: Live, day: DayRecord, reason: Wake, routine: { action: ActionId }, t: number): void {
    if (reason === 'morning') queueLine(state, day, 'morning', t);
    else if (reason === 'arrival' || reason === 'spoken-to') queueLine(state, day, 'greet', t);
    else if (reason === 'routine-end') { if (routine.action === 'go_home') queueLine(state, day, 'evening', t); }
    else queueLine(state, day, routine.action === 'go_home' ? 'remark' : 'work', t);
  }

  function beat(state: Live, t: number, on: boolean, shadow: boolean): void {
    if (!on) { if (state.asleep !== null) { leave(state); state.asleep = null; state.outing = null; setWhere(state, null); } return; }
    const slept = asleepAt(state.who, t);
    if (slept) {
      if (state.asleep === false) {
        // Going to bed: one summary (a model writes it only for one who met a person today; not when it is the budget that sent it).
        const day = dayOf(state.who, t - 3600000);
        day.sleptAt = t; persist();
        leave(state); state.doing = null; state.outing = null; setWhere(state, null);
        void summarise(state, t).catch(() => {});
      }
      state.asleep = true;
      return; // asleep costs nothing
    }
    const day = dayOf(state.who, t);
    if (state.asleep !== false) {
      state.asleep = false; day.wokeAt ??= t; state.pending = 'morning'; state.lastRoutine = routineOf(state.who, t).action; state.nextAlone = jitter(state, t); persist();
    }
    const routine = routineOf(state.who, t);
    considerOuting(state, day, routine, t);
    const action = actionNow(state, routine, t), target = placeFor(state, action, t);
    const rooms = takeCensus(t).rooms, people = target ? rooms.get(target) ?? 0 : 0;
    if (!shadow && people > 0 && !day.met) { day.met = true; persist(); }
    if (!state.pending) {
      if (routine.action !== state.lastRoutine) state.pending = 'routine-end';
      else if (people > 0 && state.lastPeople === 0) state.pending = 'arrival';
      else if (t >= state.nextAlone) state.pending = 'alone';
    }
    state.lastRoutine = routine.action; state.lastPeople = people;
    setWhere(state, target);
    const reason = state.pending;
    if (reason && !state.busy) {
      const event = reason !== 'morning' && reason !== 'alone';
      if (event && t - state.lastThought < EVENT_GAP_MS) state.pending = null; // too soon after the last thought: this event is let go
      else if (inflight < MAX_INFLIGHT && deep.beat < DEEP_PER_BEAT) {
        // The model's share is small: a deep thought only while the day's quota and this resident's own share allow it; otherwise it lives by its rules.
        if (day.thoughts < deepCap() && deepRoom(t, 1)) {
          state.pending = null; state.busy = true; state.nextAlone = jitter(state, t);
          deep.used += 1; deep.beat += 1; inflight += 1;
          void think(state, reason, t).catch(() => {}).finally(() => { state.busy = false; inflight -= 1; });
        } else { state.pending = null; state.nextAlone = jitter(state, t); ruleReact(state, day, reason, routine, t); }
      }
    }
    // Where it stands. In shadow: only in its own record.
    if (shadow) { if (state.presentAt) leave(state); } else stand(state, action, t);
    if (state.say) { const text = state.say; state.say = null; if (!shadow) void speak(state, text); }
    rulePray(state, day, t);
  }

  // ---- talk between residents: two awake residents who stand in the same venue --------------------------------------------------------------------
  // By default the talk is WRITTEN BY RULES (persona.ts talkLine: topic, tone and length from the two characters, a real ledger line when one is there and the
  // speaker is curious about the town); only when the day's deep quota has room is it a model's talk (grounded in one real ledger line, as in 13b).
  interface Exchange { a: Live; b: Live; room: string; ground: GistItem | null; groundUsed: boolean; lines: TalkRecord['lines']; nextAt: number; busy: boolean; record: TalkRecord | null; rule: boolean; turns: number; id: number }
  const exchanges = new Set<Exchange>();
  const ruleTalks: TalkRecord[] = [];
  let exSeq = 0;
  const pairLast = new Map<string, number>();
  const pairKey = (x: Live, y: Live): string => (x.id < y.id ? `${x.id}|${y.id}` : `${y.id}|${x.id}`);
  const talksOn = (state: Live, t: number): number => dayOf(state.who, t).talks ?? 0;
  const clockOf = (who: Resident, t: number): string => { const local = localMinute(who, t); return `${String(Math.floor(local / 60)).padStart(2, '0')}:${String(local % 60).padStart(2, '0')}`; };
  const willing = (state: Live, t: number): boolean => { const prof = talkProfile(personaOf(state.who)); return state.asleep === false && !state.talking && t - state.lastTalk >= prof.gapMs && talksOn(state, t) < prof.maxTalks; };

  /** Who is together now: awake residents with the same place; at most one new pair per place per beat; a pair begins to talk by the two characters' chance, never within the pair gap, and within every bound above. */
  function meet(t: number): void {
    if (exchanges.size >= MAX_INFLIGHT + RULE_EXCHANGES) return;
    for (const [where, here] of whereIndex) {
      if (here.size < 2) continue;
      const list = [...here].filter((state) => willing(state, t));
      for (let i = 0; i < list.length - 1; i++) {
        const other = list.slice(i + 1).find((candidate) => t - (pairLast.get(pairKey(list[i]!, candidate)) ?? -Infinity) >= PAIR_GAP_MS
          && hash(`${pairKey(list[i]!, candidate)}|${Math.floor(t / 60000)}`) % 100 < talkOdds(personaOf(list[i]!.who), personaOf(candidate.who)));
        if (!other) continue;
        begin(list[i]!, other, where, t);
        break;
      }
    }
  }
  function begin(a: Live, b: Live, room: string, t: number): void {
    const turns = Math.min(TALK_TURNS, Math.max(talkProfile(personaOf(a.who)).turns, talkProfile(personaOf(b.who)).turns));
    const modelWanted = [...exchanges].filter((other) => !other.rule).length < MAX_INFLIGHT && deepRoom(t, TALK_TURNS);
    if (modelWanted) deep.used += TALK_TURNS;
    const ex: Exchange = { a, b, room, ground: null, groundUsed: false, lines: [], nextAt: t, busy: true, record: null, rule: !modelWanted, turns: modelWanted ? TALK_TURNS : turns, id: ++exSeq };
    a.talking = b.talking = true; exchanges.add(ex); pairLast.set(pairKey(a, b), t);
    void (async () => {
      try {
        const items = await ctx.store.read((db) => gistService(ctx).recent(db, a.who.city, { limit: 8 })).catch(() => [] as GistItem[]);
        // A model's talk is grounded or not at all: with nothing in the ledger there is nothing to talk about, and nothing is said. A rule talk may be about the speakers' own days.
        if (!items.length && !ex.rule) { release(ex); return; }
        ex.ground = items.length ? items[hash(`${pairKey(a, b)}|${utc(t)}`) % items.length]! : null;
        ex.record = { at: t, between: [a.id, b.id], room, ground: ex.ground?.n ?? null, groundText: ex.ground?.text ?? null, lines: ex.lines, ended: 'turns' };
        for (const state of [a, b]) {
          const day = dayOf(state.who, t); day.talks = (day.talks ?? 0) + 1;
          if (ex.rule) day.ruleTalks = (day.ruleTalks ?? 0) + 1; else { (day.talkLog ??= []).push(ex.record); if (day.talkLog.length > TALKS_KEPT) day.talkLog.splice(0, day.talkLog.length - TALKS_KEPT); }
        }
        if (ex.rule) { ruleTalks.push(ex.record); if (ruleTalks.length > RULE_TALKS_KEPT) ruleTalks.shift(); }
        persist();
        try { hooks.talked?.(a.id, b.id, t); } catch { /* a bond note never stops a talk */ }
        ex.busy = false;
      } catch { release(ex); }
    })();
  }
  function release(ex: Exchange): void { exchanges.delete(ex); ex.a.talking = ex.b.talking = false; ex.a.lastTalk = ex.b.lastTalk = ctx.now(); }
  function finish(ex: Exchange, why: TalkRecord['ended']): void { if (ex.record) ex.record.ended = why; release(ex); persist(); }
  function advance(t: number): void {
    for (const ex of [...exchanges]) {
      if (ex.busy || t < ex.nextAt) continue;
      if (stopped(t) && !ex.rule) { finish(ex, 'budget'); continue; }
      if (ex.a.asleep !== false || ex.b.asleep !== false || ex.a.where !== ex.room || ex.b.where !== ex.room) { finish(ex, 'left'); continue; }
      if (ex.rule) { try { ruleTurn(ex, t); } catch { finish(ex, 'failed'); } continue; }
      if (inflight >= MAX_INFLIGHT) continue;
      ex.busy = true; inflight += 1;
      void turn(ex, t).catch(() => finish(ex, 'failed')).finally(() => { ex.busy = false; inflight -= 1; });
    }
  }
  /** One line of a rule talk: from the speaker's character, checked like any line said aloud. */
  function ruleTurn(ex: Exchange, t: number): void {
    const speaker = ex.lines.length % 2 === 0 ? ex.a : ex.b, other = speaker === ex.a ? ex.b : ex.a, day = dayOf(speaker.who, t);
    const numbers = digitsOf(ex.ground ? [ex.ground.text] : []);
    let line: string | null = null;
    for (const gist of ex.ground && !ex.groundUsed ? [ex.ground.text, null] : [null]) {
      const checked = judgeTalk(talkLine(personaOf(speaker.who), other.who.name, ex.lines.length, `${ex.id}|${ex.lines.length}|${speaker.id}`, gist), numbers);
      if (checked.ok) { line = checked.text; break; }
    }
    if (line === null) { finish(ex, 'slip'); return; }
    if (repeats(line, [...ex.lines.map((said) => said.text), ...speaker.recent])) { finish(ex, 'repeat'); return; }
    if (ex.ground && overlap(ex.ground.text, line) >= 0.5) ex.groundUsed = true;
    ex.lines.push({ by: speaker.id, text: line, model: null });
    speaker.recent.push(line); if (speaker.recent.length > 8) speaker.recent.shift();
    day.talkLines = (day.talkLines ?? 0) + 1; speaker.lines += 1; persist();
    if (!settings().shadow) void speak(speaker, line);
    if (ex.lines.length >= ex.turns) finish(ex, 'turns'); else ex.nextAt = ctx.now() + TALK_STEP_MS;
  }
  function talkMessages(speaker: Live, other: Live, ex: Exchange, t: number): { role: 'system' | 'user'; content: string }[] {
    const city = cityRules(speaker.who.city)?.name ?? speaker.who.city;
    const so_far = ex.lines.map((line) => `${line.by === speaker.id ? 'You' : other.who.name}: ${line.text}`);
    const lines = [
      `It is ${clockOf(speaker.who, t)} in ${city}. You have just met ${other.who.name}, someone you know from around here, while you were ${ACTIONS[actionOf('keep_routine', routineOf(speaker.who, t).action, speaker.who)].doing.toLowerCase()}.`,
      `Something people in town are talking about: "${ex.ground!.text}".`,
      so_far.length ? `So far:\n${so_far.join('\n')}` : `You speak first.`,
      `Say ONE short line to ${other.who.name} (under ${LINE_MAX} characters), in plain text only. You may talk about that news or about your own day. Do not give any news that is not listed here, and do not repeat what has been said.`,
    ];
    return [{ role: 'system', content: system(speaker.who, false) }, { role: 'user', content: lines.join('\n') }];
  }
  const RETRY_TALK = 'That was not what I needed. Say it again as yourself, in your own words: one short line, plain text only.';
  async function turn(ex: Exchange, t: number): Promise<void> {
    const speaker = ex.lines.length % 2 === 0 ? ex.a : ex.b, other = speaker === ex.a ? ex.b : ex.a;
    const life = lifeOf(speaker.who, t), day = dayOf(speaker.who, t), numbers = digitsOf([ex.ground!.text]);
    const messages = talkMessages(speaker, other, ex, t);
    let line: string | null = null, model: string | null = null, why: TalkRecord['ended'] = 'failed';
    for (let attempt = 0; attempt < 2; attempt++) {
      let answer: AskResult;
      try { answer = await callModel({ purpose: 'resident', messages: attempt === 0 ? messages : [...messages, { role: 'user', content: RETRY_TALK }], maxTokens: TALK_TOKENS, carriesPlayerWords: false, timeoutMs: 8000, ...preferOf(life, speaker.id) }); }
      catch { why = 'failed'; break; }
      if (!answer.ok) { why = answer.why === 'budget' ? 'budget' : 'failed'; break; }
      day.talkCostMicro = (day.talkCostMicro ?? 0) + answer.costMicro; model = answer.model;
      const checked = judgeTalk(answer.text, numbers);
      if (checked.ok) { line = checked.text; break; }
      day.talkSlips = (day.talkSlips ?? 0) + 1; why = 'slip';
      if (attempt === 0) day.talkRetries = (day.talkRetries ?? 0) + 1;
    }
    if (line === null) { finish(ex, why); return; }
    // The cheap repetition check: the same words as a line just said (here or by this resident earlier), or the news line told a second time.
    const mentions = overlap(ex.ground!.text, line) >= 0.75;
    if (repeats(line, [...ex.lines.map((said) => said.text), ...speaker.recent]) || (mentions && ex.groundUsed)) { finish(ex, 'repeat'); return; }
    if (mentions) ex.groundUsed = true;
    ex.lines.push({ by: speaker.id, text: line, model });
    speaker.recent.push(line); if (speaker.recent.length > 8) speaker.recent.shift();
    day.talkLines = (day.talkLines ?? 0) + 1; persist();
    if (!settings().shadow) void speak(speaker, line);
    if (ex.lines.length >= ex.turns) finish(ex, 'turns'); else ex.nextAt = ctx.now() + TALK_STEP_MS;
  }

  // ---- people speaking to a visible resident (shadow off) ----------------------------------------------------------------------------------
  function noteTalker(life: Life, id: string, lifeDayNo: number): void {
    const key = sha256Hex(`allworld-resident-v1|${id}`).slice(0, 12), book = (life.talkers ??= {});
    const found = book[key];
    if (found) { found[1] = lifeDayNo; return; }
    book[key] = [lifeDayNo, lifeDayNo];
    const keys = Object.keys(book);
    if (keys.length > TALKERS_KEPT) for (const old of keys.sort((x, y) => book[x]![0] - book[y]![0]).slice(0, keys.length - TALKERS_KEPT)) delete book[old];
  }
  const TITLES = new Set(['mama', 'baba', 'hajia', 'auntie', 'aunty', 'bro', 'sis']);
  const callsOf = (who: Resident): string[] => who.name.toLowerCase().split(/\s+/).filter((word) => word.length >= 3 && !TITLES.has(word));
  const isNamed = (who: Resident, body: string): boolean => { const lower = body.toLowerCase(), words = new Set(lower.split(/[^\p{L}\p{N}]+/u)), name = who.name.toLowerCase(); return (name.includes(' ') ? lower.includes(name) : words.has(name)) || callsOf(who).some((word) => words.has(word)); };
  const TRADE = /\d|₦|naira|\b(?:price|prices|cost|pay|buy|sell|sale|discount|cheap|offer|owe|loan|lend|money|cash|send)\b/i;
  async function replyTo(state: Live, from: { id: string; name: string }, body: string): Promise<void> {
    const t = ctx.now(), life = lifeOf(state.who, t), day = dayOf(state.who, t);
    if ((day.replies ?? 0) >= MAX_REPLIES) return;
    noteTalker(life, from.id, lifeDay(state.who, t));
    day.replies = (day.replies ?? 0) + 1; persist();
    const intent = intentOf(body, state.who.work.role, false), seed = hash(`${state.id}|${from.id}|${Math.floor(t / 60000)}`);
    let text: string | null = null;
    // A resident does not trade yet: no price, no offer, no promise. The haggle belongs to the house sellers (server/house/haggle.ts).
    if (TRADE.test(body) || intent === 'prices' || intent === 'offer' || intent === 'pressure') text = NOT_TRADING;
    else if (intent === 'bye') text = GOODBYE;
    else if (!overBudget()) {
      const messages = [{ role: 'system' as const, content: system(state.who, false) }, { role: 'user' as const, content: `${from.name.slice(0, 24)} says to you: "${body.slice(0, 200)}"\nAnswer in one or two short sentences (under ${LINE_MAX} characters), as yourself, in plain text only. Do not mention prices or numbers, and do not ask for money, contact details or to meet anywhere else.` }];
      for (let attempt = 0; attempt < 2 && text === null; attempt++) {
        let answer: AskResult;
        try { answer = await callModel({ purpose: 'resident', messages: attempt === 0 ? messages : [...messages, { role: 'user', content: RETRY_TALK }], maxTokens: REPLY_TOKENS, playerId: `p_${sha256Hex(`allworld-house-v1|${from.id}`).slice(0, 32)}`, carriesPlayerWords: true, timeoutMs: 8000, ...preferOf(life, state.id) }); }
        catch { break; }
        if (!answer.ok) break;
        day.replyCostMicro = (day.replyCostMicro ?? 0) + answer.costMicro;
        const checked = judgeTalk(answer.text);
        if (checked.ok) text = checked.text;
        else { day.replySlips = (day.replySlips ?? 0) + 1; if (attempt === 0) day.replyRetries = (day.replyRetries ?? 0) + 1; }
      }
    }
    await speak(state, text ?? (state.who.generated ? ruleLine(personaOf(state.who), 'greet', `${state.id}|${seed}`) : null) ?? WRITTEN[seed % WRITTEN.length]!);
    persist();
  }

  let stepped = 0;
  function tick(): void {
    try {
      const s = settings();
      if (!s.on && !isReady) return;
      void ready();
      if (!isReady) return;
      const t = ctx.now(), list = rosterNow(), size = list.length;
      // At most STEP_MAX residents are stepped per beat, round-robin, so a thousand residents cost the same heartbeat as fifty.
      deep.beat = 0;
      stepped = Math.min(size, STEP_MAX);
      for (let i = 0; i < stepped; i++) { const who = list[(cursor + i) % size]!; beat(liveOf(who), t, s.on && !hooks.retired?.(residentId(who)), s.shadow); }
      if (size) cursor = (cursor + stepped) % size;
      if (s.on) meet(t);
      advance(t);
      saveIfDue(t);
    } catch { /* a bad beat must never stop the host's heartbeat */ }
  }
  /** Someone nearby said the resident's name: a wake, never the words. With shadow off a person's line may also be answered (replyTo). */
  function onLine(event: { room: string; body: string; from: { id?: string; name?: string; agent?: boolean } }): void {
    try {
      const s = settings();
      if (event.from.agent === true || !s.on) return;
      const body = String(event.body ?? '');
      for (const state of whereIndex.get(event.room) ?? []) if (state.asleep === false && isNamed(state.who, body) && !state.pending) state.pending = 'spoken-to';
      const id = event.from.id;
      if (s.shadow || stopped(ctx.now()) || typeof id !== 'string' || !id || id.startsWith('house.') || id.startsWith('resident.')) return;
      const here = [...(whereIndex.get(event.room) ?? [])].filter((state) => state.asleep === false && state.presentAt?.room === event.room && !state.replying);
      let target = here.find((state) => isNamed(state.who, body)) ?? null;
      // Not named: only a lone resident answers a plain greeting, and only where no house agent already stands.
      if (!target && here.length === 1 && !(room()?.members(event.room) ?? []).some((member) => member.id.startsWith('house.')) && intentOf(body, here[0]!.who.work.role, false) === 'greet') target = here[0]!;
      if (!target || !ctx.allow(`resident:wake:${target.id}:${id}`, 6, 60000) || !ctx.allow('resident:wake:all', 60, 60000)) return;
      const chosen = target;
      chosen.replying = true;
      void replyTo(chosen, { id, name: String(event.from.name ?? 'a visitor') }, body.slice(0, 300)).catch(() => {}).finally(() => { chosen.replying = false; });
    } catch { /* ignored */ }
  }
  ctx.on?.('heartbeat', tick);
  ctx.on?.('venue-line', onLine);

  /** The numbers of one model (or all): what the admin page compares. Counted over the days kept (7), by the model each resident was given at birth. */
  interface Tally { residents: number; thoughts: number; talks: number; talkLines: number; replies: number; retries: number; slips: number; invalid: number; fallbacks: number; costMicro: number }
  const blankTally = (): Tally => ({ residents: 0, thoughts: 0, talks: 0, talkLines: 0, replies: 0, retries: 0, slips: 0, invalid: 0, fallbacks: 0, costMicro: 0 });
  function report() {
    const models: Record<string, Tally> = {}, perDay: Record<string, number> = {};
    let people = 0, returned = 0;
    for (const life of Object.values(stored.residents)) {
      const row = (models[life.model ?? 'unassigned'] ??= blankTally());
      row.residents += 1;
      for (const day of Object.values(life.days)) {
        const cost = day.costMicro + (day.talkCostMicro ?? 0) + (day.replyCostMicro ?? 0);
        row.thoughts += day.thoughts; row.talks += day.talks ?? 0; row.talkLines += day.talkLines ?? 0; row.replies += day.replies ?? 0;
        row.retries += day.retries + (day.talkRetries ?? 0) + (day.replyRetries ?? 0); row.slips += day.slips + (day.talkSlips ?? 0) + (day.replySlips ?? 0);
        row.invalid += day.invalid; row.fallbacks += day.fallbacks; row.costMicro += cost;
        perDay[String(day.day)] = (perDay[String(day.day)] ?? 0) + cost;
      }
      for (const [first, last] of Object.values(life.talkers ?? {})) { people += 1; if (last > first) returned += 1; }
    }
    return { models, perDay, people, returned };
  }

  return {
    tick, ready, settings, line: onLine, report, hooks,
    /** For bonds.ts: who stands where and is awake, the model each was given, and one budgeted model call. */
    presence: (): { id: string; city: string; where: string | null; awake: boolean }[] => rosterNow().map((who) => { const state = liveOf(who); return { id: state.id, city: who.city, where: state.where, awake: state.asleep === false }; }),
    modelOf: (id: string): string | null => { const who = whoIs(id); if (!who) return null; return modelFor(lifeOf(who, ctx.now()), id); },
    askBudgeted: (input: AskInput): Promise<AskResult> => callModel(input),
    /** Everyone who lives here now (the host's open cities times `residentsPerCity`, or the roster a test gave). */
    get roster(): readonly Resident[] { return rosterNow(); },
    /** For tests and the admin page. */
    state(id?: string) {
      const who = whoIs(id); if (!who) return null;
      const state = liveOf(who), life = Object.hasOwn(stored.residents, state.id) ? stored.residents[state.id]! : null, t = ctx.now();
      const day = life ? Object.values(life.days).sort((a, b) => b.day - a.day)[0] ?? null : null;
      return { id: state.id, name: who.name, asleep: state.asleep, budgetStopped: stopped(t), doing: state.doing?.action ?? null, outing: state.outing && t < state.outing.until ? state.outing.pastime : null, model: life?.model ?? null, lines: state.lines, present: state.presentAt !== null, day, memory: life?.memory ?? [], busy: state.busy, where: state.where, talking: state.talking };
    },
    /** Who is awake or asleep now, how many are standing in venues, what the day's quota and rule prayers look like. */
    census() {
      const t = ctx.now(), size = rosterNow().length;
      let awake = 0, asleep = 0, present = 0;
      for (const state of live.values()) { if (state.asleep === false) awake += 1; else if (state.asleep === true) asleep += 1; if (state.presentAt) present += 1; }
      const d = utc(t);
      return { count: size, awake, asleep, present, exchanges: exchanges.size, stopped: stopped(t), spentMicro: spentToday(), limitMicro: settings().cents * 10000, stepped, deepUsed: deep.day === d ? deep.used : 0, deepQuota: settings().deep, rulePrayers: rulePrayed.day === d ? rulePrayed.n : 0, cities: new Set(rosterNow().map((who) => who.city)).size };
    },
    /** How many residents the last heartbeat stepped (never more than STEP_MAX). */
    stepped: (): number => stepped,
    stored: (): Stored => stored,
    /** The last rule-driven talks and written lines, for the admin page (memory only). */
    ruleTalks: (): readonly TalkRecord[] => ruleTalks,
    ruleSamples: (): readonly string[] => ruleSamples,
    /** The newest day record of the first resident (or of the one asked for), or null. */
    day: (id?: string): DayRecord | null => { const who = whoIs(id); if (!who || !Object.hasOwn(stored.residents, residentId(who))) return null; return Object.values(stored.residents[residentId(who)]!.days).sort((a, b) => b.day - a.day)[0] ?? null; },
    /** Test hook: save now, whatever the clock says. */
    flushSave: (): void => { lastSave = -Infinity; saveIfDue(ctx.now()); },
  };
}
export type Residents = ReturnType<typeof residentsOf>;

const runners = new WeakMap<object, Residents>();
export function residentService(ctx: RouteContext): Residents {
  let found = runners.get(ctx);
  if (!found) runners.set(ctx, found = residentsOf(ctx));
  return found;
}

const usd = (micro: number): string => `US$${(micro / 1e6).toFixed(4)}`;
/** One choice as a line for the admin page: time, why it woke, what it chose, the line it would have said, the model, the cost, the slips. */
export function entryLine(who: Resident, e: Entry): string {
  const local = localMinuteOf(who, e.at), clock = `${String(Math.floor(local / 60)).padStart(2, '0')}:${String(local % 60).padStart(2, '0')}`;
  const chose = e.outcome === 'model' ? e.action : `routine (${e.why ?? 'none'})`;
  const extra = [e.retries ? `${e.retries} retry` : '', e.slips ? `${e.slips} slip` : '', e.invalid ? `${e.invalid} invalid` : ''].filter(Boolean).join(', ');
  return `${clock} ${e.reason} → ${chose}${e.line ? ` · would say: "${e.line}"` : ''} · ${e.model ?? 'no model'} ${e.free === false ? usd(e.costMicro) : e.free ? 'free' : ''}${extra ? ` · ${extra}` : ''}`.replace(/\s+/g, ' ');
}
const localMinuteOf = (who: Resident, t: number): number => ((Math.floor(t / 60000) + who.utcOffsetMin) % 1440 + 1440) % 1440;

/** Settings and the admin groups "Residents". Called once per host with the other admin links (server/admin/links.ts). */
export function linkResidents(ctx: RouteContext): void {
  registerAdminSetting(ctx, { key: 'residentOn', label: 'Residents: on', help: 'Residents (AI-played characters with a life story of their own) live their day, asleep at night, thinking with the models of the resident list. On by default on the live hosts, in shadow: nobody sees them. How many run is residentCount. Costs only what the model router allows and residentDailyCents.', kind: 'boolean', default: () => DEFAULTS.on || ctx.worldFeed === true });
  registerAdminSetting(ctx, { key: 'residentShadow', label: 'Residents: shadow (nobody sees them)', help: 'Off (the default): residents stand in their venues with the AI-played mark, count in the online AI number, speak in rooms and answer a person who names them. On: they act only in their own records, are in no room, and say nothing to anyone.', kind: 'boolean', default: () => DEFAULTS.shadow });
  registerAdminSetting(ctx, { key: 'residentCount', label: 'Residents: how many (retired, ignored)', help: 'Retired: it once chose how many of the thirty authored residents ran. Residents now live in every open city; use residentsPerCity. Old saved values are kept and ignored.', kind: 'number', min: 1, max: COUNT_MAX, default: () => DEFAULTS.count });
  registerAdminSetting(ctx, { key: 'residentsPerCity', label: 'Residents: per city', help: 'How many residents live in each open city (0 to 5). The authored ones keep their cities\' first places; the rest are made up from the city, the same every time. 0 turns every resident off. About 284 cities times 3 is about 850 residents; they follow rules and cost nothing unless the deep-thought quota below is used.', kind: 'number', min: 0, max: 5, default: () => DEFAULTS.perCity });
  registerAdminSetting(ctx, { key: 'residentDeepPerDay', label: 'Residents: deep thoughts a day (all residents)', help: 'The model\'s small share of the day: how many model thoughts and model talks all residents together may take in a UTC day, spread over the day (default 240; 0 = none). Answers to people and the night summary of those who met someone are separate. They also stop at residentDailyCents.', kind: 'number', min: 0, max: DEEP_MAX, default: () => DEFAULTS.deep });
  registerAdminSetting(ctx, { key: 'residentRulePrayers', label: 'Residents: prayers by rule', help: 'On (the default): devout residents sometimes say a short written prayer, which goes to the Prayers page (at most 40 a day for all). Off: only a model-chosen prayer is kept.', kind: 'boolean', default: () => true });
  registerAdminSetting(ctx, { key: 'residentDailyCents', label: 'Residents: most spent a day (US cents)', help: 'When the residents have spent this much in a UTC day (thoughts, talk and answers together) they all go to sleep early, so the other model purposes still answer. 100 = US$1. Never above 190, under the router\'s US$2 hard stop.', kind: 'number', min: 0, max: CENTS_MAX, default: () => DEFAULTS.cents });
  const runner = residentService(ctx), who = RESIDENTS[0]!;
  const stat = (id: string, label: string, read: (db: Db) => number | string): void => registerAdminStat(ctx, { id: `resident-${id}`, group: 'Residents', label, cost: 'memory', read });
  const view = () => runner.state(residentId(who)), day = () => runner.day(residentId(who));
  stat('roster', 'Residents living now (residentsPerCity)', () => { const c = runner.census(), set = runner.settings(); return !set.on ? 'off' : `${c.count} in ${c.cities} cities (${set.perCity} each): ${c.awake} awake, ${c.asleep} asleep, ${c.present} standing in venues, ${c.exchanges} talking · ${set.shadow ? 'shadow (nobody sees them)' : 'visible, with the AI-played mark'}${c.stopped ? ' · BUDGET SPENT: living by rules, no model until tomorrow' : ''}`; });
  stat('deep', 'Deep thoughts today (model) against the day\'s quota; residents stepped per beat; rule prayers today', () => { const c = runner.census(); return `${c.deepUsed} of ${c.deepQuota} · ${c.stepped} stepped on the last beat (at most ${STEP_MAX}) · ${c.rulePrayers} prayers by rule (at most ${RULE_PRAYERS_PER_DAY})`; });
  stat('rules', 'Written lines and rule-driven talk lately (newest last)', () => [...runner.ruleSamples().slice(-6), ...entriesOfTalk({ v: 1, residents: {} }, runner.roster, runner.ruleTalks()).slice(-4)].join('\n') || 'none yet');
  stat('size', 'Storage: residents kept, and their size in text', () => { const text = JSON.stringify(runner.stored()); return `${Object.keys(runner.stored().residents).length} kept · ${(text.length / 1024).toFixed(0)} KB in ${SHARDS} small collections`; });
  stat('budget', 'Spent today against the residents\' limit', () => { const c = runner.census(); return `${usd(c.spentMicro)} of ${usd(c.limitMicro)}`; });
  stat('state', 'Remi: state', () => { const s = view(), set = runner.settings(); return !s || !set.on ? 'off' : `${s.name}: ${s.budgetStopped && s.asleep === false ? `awake, living by rules (budget spent)` : s.asleep ? 'asleep' : s.asleep === false ? `awake, ${s.doing ?? 'following the plan'}` : 'starting'} · ${set.shadow ? 'shadow (nobody sees her)' : 'visible'}`; });
  stat('model', 'Remi: model assigned at birth', () => view()?.model ?? 'not yet');
  stat('thoughts', 'Remi: thoughts today', () => day()?.thoughts ?? 0);
  stat('retries', 'Remi: retries (a reply thrown away and asked again)', () => day()?.retries ?? 0);
  stat('slips', 'Remi: slips (stepped out of character or broke the word rules)', () => day()?.slips ?? 0);
  stat('invalid', 'Remi: replies that were not the right JSON', () => day()?.invalid ?? 0);
  stat('fallbacks', 'Remi: fell back to the routine', () => day()?.fallbacks ?? 0);
  stat('cost', 'Remi: cost of her day', () => usd(day()?.costMicro ?? 0));
  stat('purpose', 'Residents today, by the router ledger', () => { const p = routerOf(ctx).today().ledger.byPurpose['resident']; return p ? `${p.n} requests, ${usd(p.micro)}` : 'none yet'; });
  stat('sleep', 'Remi: slept / woke', () => { const d = day(); return d ? `woke ${d.wokeAt ? new Date(d.wokeAt).toISOString().slice(11, 16) : '-'} UTC · bed ${d.sleptAt ? new Date(d.sleptAt).toISOString().slice(11, 16) + ' UTC' : 'not yet'}${d.sleptEarly ? ' (early: budget spent)' : ''}` : 'no day yet'; });
  stat('log', 'Remi: her choices today (newest last, local time)', () => day()?.entries.slice(-14).map((e) => entryLine(who, e)).join('\n') || 'none yet');
  stat('summary', 'Remi: her summary of the last night', () => day()?.summary ?? runner.state()?.memory.at(-1) ?? 'none yet');
  // ---- 13c: the voice to the owner (voice.ts): the asks of the day, the assembly, the president and the Sunday letter ----------------------------------
  const voice = voiceService(ctx), asks = (list: { text: string; count: number }[]): string => list.map((item, at) => `${at + 1}. ${item.text} (${item.count})`).join('\n') || 'none yet';
  stat('wishes', 'Residents\' wishes today (the five most asked for; the Residents page has who and why)', (db) => asks(voice.view(db).today.wishes));
  stat('needs', 'Residents\' needs today (the five most asked for)', (db) => asks(voice.view(db).today.needs));
  stat('president', 'Residents\' president this week', (db) => { const v = voice.view(db); return v.president ? `${v.president.name} (${v.president.city})${v.president.caretaker ? ', caretaker: no election result yet' : ''} · ${v.assembly.phase}, ${v.assembly.votes} votes cast among ${v.assembly.candidates.length} standing` : 'none yet'; });
  stat('letter', 'Latest letter to the Founders', (db) => { const v = voice.view(db), l = v.letters[0]; return l ? `${new Date(l.at).toISOString().slice(0, 10)} from ${l.by.name} (${l.source}): ${l.text.slice(0, 160)}…` : v.sunday && v.on ? 'due today' : 'none yet'; });
  // ---- 13b: the comparison of models, the talk between residents, and the experiment's measures ---------------------------------------------
  stat('models', 'Models compared (last 7 days, by the model given at birth): residents · thoughts · talk between residents (exchanges/lines) · answers to people · retries · slips · invalid · fallbacks · cost', () => {
    const rows = Object.entries(runner.report().models).sort((a, b) => b[1].residents - a[1].residents);
    return rows.map(([model, r]) => `${model}: ${r.residents} residents · ${r.thoughts} thoughts · ${r.talks} talks/${r.talkLines} lines · ${r.replies} answers to people · ${r.retries} retries (asked again) · ${r.slips} slips (out of character or rule breaks) · ${r.invalid} invalid · ${r.fallbacks} fell back · ${usd(r.costMicro)}`).join('\n') || 'none yet';
  });
  stat('talk', 'Talk between residents (newest last; kept on paper in shadow)', () => entriesOfTalk(runner.stored(), runner.roster, runner.ruleTalks()).slice(-8).join('\n') || 'none yet');
  stat('talkers', 'People who spoke to a resident (7 days): how many, and how many came back on a later day', () => { const r = runner.report(); return `${r.people} spoke to one · ${r.returned} spoke again on a later day`; });
  stat('reports', 'Reports about residents', (db) => reportsAbout(db));
  stat('perday', 'Cost per day (all residents; thoughts, talk and answers)', () => Object.entries(runner.report().perDay).sort((a, b) => Number(a[0]) - Number(b[0])).slice(-7).map(([d, micro]) => `day ${d}: ${usd(micro)}`).join('\n') || 'none yet');
  stat('success', 'The experiment\'s success measures', (db) => {
    const r = runner.report(), c = runner.census();
    return [`Spoke to a resident: ${r.people} people; spoke again on a later day: ${r.returned}.`,
      `Reports about residents: ${reportsAbout(db)}.`,
      `Cost today: ${usd(c.spentMicro)} (limit ${usd(c.limitMicro)}; the router's own hard stop is US$2).`,
      'Day-1 and day-7 return of people who spoke to a resident against those who did not: not split yet. The growth metrics (server/growth/metrics.ts) keep return by arrival source and by friend only; a resident split needs a new bit on the life record. Until then compare "spoke again" here with the growth return cells by hand.'].join('\n');
  });
}
const reportsAbout = (db: Db): number => { const list = (db as unknown as { social?: { reports?: { about?: unknown }[] } }).social?.reports; return Array.isArray(list) ? list.filter((report) => typeof report?.about === 'string' && report.about.startsWith('resident.')).length : 0; };
/** The exchanges of every resident's newest day as readable lines, oldest first (each exchange once). */
export function entriesOfTalk(stored: Stored, roster: readonly Resident[], extra: readonly TalkRecord[] = []): string[] {
  const names = new Map(roster.map((who) => [residentId(who), who.name]));
  const seen = new Set<string>(), found: TalkRecord[] = [];
  for (const talk of extra) { const key = `${talk.at}|${talk.between.join('|')}`; if (!seen.has(key)) { seen.add(key); found.push(talk); } }
  for (const life of Object.values(stored.residents)) {
    const newest = Object.values(life.days).sort((a, b) => b.day - a.day)[0];
    for (const talk of newest?.talkLog ?? []) { const key = `${talk.at}|${talk.between.join('|')}`; if (!seen.has(key)) { seen.add(key); found.push(talk); } }
  }
  return found.sort((a, b) => a.at - b.at).map((talk) => `${new Date(talk.at).toISOString().slice(11, 16)} UTC ${names.get(talk.between[0]) ?? talk.between[0]} and ${names.get(talk.between[1]) ?? talk.between[1]}, about ledger line ${talk.ground ?? '-'} "${talk.groundText ?? ''}": ${talk.lines.map((line) => `${names.get(line.by) ?? line.by}: "${line.text}"`).join(' / ') || 'nothing said'} [${talk.ended}]`);
}
