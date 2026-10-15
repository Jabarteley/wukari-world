/**
 * OWNER: agents (residents, docs/RESIDENTS.md)
 * THE RESIDENT RUNNER: an agent that really lives. Portable (no Node imports): the Node host and the Worker run it on the heartbeat.
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
import { RESIDENTS, residentId } from './life.ts';
import type { Resident } from './life.ts';

/** What a thought may choose: five of the house actions, or "keep to the routine". Anything else is thrown away. A resident who is not a seller is not offered the market trip. */
export const CHOICES = ['keep_routine', 'open_shop', 'go_market', 'eat', 'go_home'] as const;
export type Choice = typeof CHOICES[number];
const CHOICE_HELP: Readonly<Record<Choice, string>> = Object.freeze({
  keep_routine: 'carry on with what the day plan says', open_shop: 'go to your usual place of work and get on with it', go_market: 'go to the market for stock',
  eat: 'go and eat something', go_home: 'go home and be on your own',
});
export type Wake = 'morning' | 'routine-end' | 'arrival' | 'spoken-to' | 'alone';

/** Thoughts and records are bounded: nothing here grows. */
export const ALONE_MS = [15 * 60000, 30 * 60000] as const, EVENT_GAP_MS = 3 * 60000;
export const MAX_THOUGHTS = 64, MAX_ENTRIES = 120, MAX_INFLIGHT = 4, DAYS_KEPT = 7, SUMMARY_MAX = 600, LINE_MAX = 140, MODEL_TOKENS = 160, SUMMARY_TOKENS = 240;
/** Agent-to-agent talk: at most 4 lines, one per beat at least TALK_STEP_MS apart; a pair at most once per PAIR_GAP_MS; a resident MAX_TALKS times a day. */
export const TALK_TURNS = 4, TALK_STEP_MS = 20000, PAIR_GAP_MS = 2 * 3600000, TALK_GAP_MS = 20 * 60000, MAX_TALKS = 5, TALKS_KEPT = 12, TALK_TOKENS = 120, REPEAT_AT = 0.7;
/** Replies to people (shadow off): tokens, how many people are remembered by key, and the most replies a resident gives a day. */
export const REPLY_TOKENS = 140, TALKERS_KEPT = 400, MAX_REPLIES = 120;
export const SAVE_MS = 30000, ENTRY_DAYS = 2;
export const COUNT_MAX = 30, CENTS_DEFAULT = 100, CENTS_MAX = 190;
const CENSUS_MS = 30000, PRESENCE_MS = 12 * 60000, RENEW_MS = 6 * 60000, CHOICE_MS = 60 * 60000;
/** `on`: whether she lives when the owner has not chosen; on the real hosts (the ones that ask the outside world, ctx.worldFeed) she does, in shadow. */
export const DEFAULTS = Object.freeze({ on: false, shadow: true, count: 1, cents: CENTS_DEFAULT });

/** Words a character never says about what it is made of or lives in. */
export const OUT_OF_CHARACTER = /\b(?:a\.?i\.?|artificial|intelligence|language model|llm|chat ?bots?|bots?|models?|games?|gaming|gamers?|players?|assistants?|prompts?|openai|anthropic|claude|gpt|simulat\w*|npcs?|as an? (?:ai|assistant)|programmed|virtual)\b/i;

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
  thoughts: number; retries: number; slips: number; invalid: number; fallbacks: number; costMicro: number
  entries: Entry[]; summary: string | null; summaryCostMicro: number
  /** 13b, all optional so a saved 13a day still loads. Talk with other residents: exchanges joined, lines said, retries, slips, cost, the exchanges themselves (newest last). */
  talks?: number; talkLines?: number; talkRetries?: number; talkSlips?: number; talkCostMicro?: number; talkLog?: TalkRecord[]
  /** 13b: replies to people (shadow off): how many, retries, slips, cost. */
  replies?: number; replyRetries?: number; replySlips?: number; replyCostMicro?: number
}
export interface Life {
  born: number; model: string | null; days: Record<string, DayRecord>; memory: string[]
  /** 13b: one-way keys of people who spoke to this resident and the life days of their first and latest word: { [key]: [first, last] }. At most TALKERS_KEPT. */
  talkers?: Record<string, [number, number]>
}
export interface Stored { v: 1; residents: Record<string, Life> }

const blankDay = (day: number): DayRecord => ({ day, wokeAt: null, sleptAt: null, sleptEarly: false, thoughts: 0, retries: 0, slips: 0, invalid: 0, fallbacks: 0, costMicro: 0, entries: [], summary: null, summaryCostMicro: 0 });

export type Verdict = { ok: true; next: Choice; say: string | null } | { ok: false; slip: 'character' | 'words' | 'invalid' };
/** The choices a resident is offered: everything, but the market trip only for a seller. */
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
  const { next, say } = parsed as Record<string, unknown>;
  if (typeof next !== 'string' || !(allowed as readonly string[]).includes(next)) return { ok: false, slip: 'invalid' };
  if (say !== undefined && say !== null && typeof say !== 'string') return { ok: false, slip: 'invalid' };
  const line = typeof say === 'string' ? say.replace(/\s+/g, ' ').trim() : '';
  if (line.length > LINE_MAX) return { ok: false, slip: 'invalid' };
  if (line && !agentWords(line, { toMinor: true }).ok) return { ok: false, slip: 'words' };
  return { ok: true, next: next as Choice, say: line || null };
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

export interface ResidentDeps {
  ask?: (input: AskInput) => Promise<AskResult>
  /** The models of the 'resident' list in order, for the assignment at birth. */
  models?: () => string[]
  load?: () => Promise<Stored | undefined>
  save?: (stored: Stored) => Promise<void>
  residents?: readonly Resident[]
}

export function residentsOf(ctx: RouteContext, deps: ResidentDeps = {}) {
  const roster = deps.residents ?? RESIDENTS;
  const ask = deps.ask ?? ((input: AskInput): Promise<AskResult> => routerOf(ctx).ask(input));
  const modelList = deps.models ?? ((): string[] => { try { return routerOf(ctx).listFor('resident').map(entryKey); } catch { return []; } });
  const setting = (key: string): boolean | number | string | undefined => ctx.checks?.setting?.(key) ?? ctx.checks?.text?.(key);
  const num = (key: string, least: number, most: number, fallback: number): number => { const value = setting(key); return typeof value === 'number' && Number.isFinite(value) ? Math.max(least, Math.min(most, Math.round(value))) : fallback; };
  const settings = () => ({ on: setting('residentOn') === true, shadow: setting('residentShadow') !== false, count: num('residentCount', 1, COUNT_MAX, DEFAULTS.count), cents: num('residentDailyCents', 0, CENTS_MAX, DEFAULTS.cents) });
  const room = () => ctx.checks?.agentRoom;
  let stored: Stored = { v: 1, residents: {} };
  let loaded: Promise<void> | null = null;
  const load = deps.load ?? ((): Promise<Stored | undefined> => ctx.store.read((db) => { const col = (db as Record<string, unknown>)['residents']; return col && typeof col === 'object' ? structuredClone(col) as Stored : undefined; }));
  const save = deps.save ?? ((value: Stored): Promise<void> => ctx.store.transact((db) => { Object.assign(ctx.collection(db, 'residents', { v: 1, residents: {} }), structuredClone(value)); }, { durable: false }));
  let isReady = false;
  const ready = (): Promise<void> => (loaded ??= load().then((found) => { if (found && typeof found.residents === 'object' && found.residents !== null) stored = { v: 1, residents: { ...found.residents } }; }, () => {}).then(() => { isReady = true; }));
  // Thirty residents change their records all day: they are written at most once in SAVE_MS, by the heartbeat.
  let saving = false, dirty = false, lastSave = -Infinity;
  function persist(): void { dirty = true; }
  function saveIfDue(t: number): void {
    if (!dirty || saving || (t - lastSave < SAVE_MS && t >= lastSave)) return;
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
  }
  const live = new Map<string, Live>();
  let census: { at: number; rooms: Map<string, number> } = { at: -Infinity, rooms: new Map() };

  function liveOf(who: Resident): Live {
    const id = residentId(who);
    let found = live.get(id);
    if (!found) {
      const post = venueFor(who.city, who.work.post, who.work.role);
      found = { who, id, asleep: null, busy: false, nextAlone: 0, lastThought: -Infinity, lastRoutine: null, lastPeople: 0, doing: null, pending: null, postRoom: post ? venueRoomKey(who.city, post, '') : null, lines: 0, presentAt: null, mark: 0, summarising: false, where: null, talking: false, lastTalk: -Infinity, recent: [], replying: false };
      live.set(id, found);
    }
    return found;
  }
  function lifeOf(who: Resident, t: number): Life {
    const id = residentId(who);
    let found = Object.hasOwn(stored.residents, id) ? stored.residents[id]! : undefined;
    if (!found) { found = { born: t, model: null, days: {}, memory: [] }; stored.residents[id] = found; }
    if (found.model === null) {
      // THE MODEL ASSIGNED AT BIRTH: one of the router's 'resident' list, chosen by the resident's own id so the mix is spread, and kept for life.
      // Spread: the model the fewest residents hold so far, ties broken by the resident's own id, so thirty residents use every model about equally.
      const list = modelList();
      if (list.length) {
        const held = (key: string): number => Object.values(stored.residents).filter((other) => other.model === key).length;
        const start = hash(id) % list.length;
        found.model = [...list.slice(start), ...list.slice(0, start)].reduce((best, key) => (held(key) < held(best) ? key : best));
        persist();
      }
    }
    return found;
  }

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
      for (const old of Object.keys(life.days).map(Number).sort((a, b) => a - b).slice(0, -DAYS_KEPT)) delete life.days[String(old)];
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
  function placeFor(state: Live, action: ActionId): string | null {
    const place = ACTIONS[action].place, { work, city } = state.who;
    if (place === 'post') return state.postRoom;
    if (place === 'market') { const v = venueFor(city, work.market ?? work.post, 'seller'); return v ? venueRoomKey(city, v, '') : state.postRoom; }
    if (place === 'eatery') { const v = work.eatery ? venueFor(city, work.eatery, 'guide') : null; return v ? venueRoomKey(city, v, '') : null; }
    return null;
  }
  /** What a choice means for this resident: "open_shop" is its own work (a shift, for one who has no stall). */
  const actionOf = (choice: Choice, routine: ActionId, who?: Resident): ActionId => (choice === 'keep_routine' ? routine : choice === 'open_shop' && who && who.work.role !== 'seller' ? 'work_shift' : choice);

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
    const recent = day.entries.slice(-3).map((e) => `${ACTIONS[actionOf(e.action, e.routine, who)].doing}${e.line ? `, saying "${e.line}"` : ''}`);
    const lines = [
      `It is ${clock} on ${weekday} in ${city}. ${REASON[reason]}`,
      `Your day plan says: ${ACTIONS[routine].doing.toLowerCase()}.`,
      state.doing && t < state.doing.until ? `Right now you are ${ACTIONS[state.doing.action].doing.toLowerCase()}.` : '',
      recent.length ? `Earlier today: ${recent.join('; ')}.` : '',
      life.memory.length ? `How your last days felt: ${life.memory.slice(-2).map((m) => m.slice(0, 300)).join(' ')}` : '',
      news.length ? `What people are talking about in town: ${news.join('; ')}.` : '',
      '',
      'What do you do next? Choose "next" from:',
      ...choicesFor(who).map((choice) => `- ${choice}: ${CHOICE_HELP[choice]}`),
      'You may also say one short thing aloud ("say", under 140 characters, or an empty string if you say nothing). You can choose anything on the list, including carrying on as planned.',
      'Reply as {"next":"...","say":"..."}.',
    ];
    return [{ role: 'system', content: system(who) }, { role: 'user', content: lines.filter((line, at) => line !== '' || at > 0).join('\n') }];
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
      try { answer = await callModel({ purpose: 'resident', messages: attempt === 0 ? messages : [...messages, { role: 'user', content: RETRY }], maxTokens: MODEL_TOKENS, carriesPlayerWords: false, timeoutMs: 8000, ...(life.model ? { prefer: life.model } : {}) }); }
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
      let text: string | null = null;
      if (!stopped(t) && day.entries.length) {
        const doings = day.entries.slice(-30).map((e) => {
          const local = localMinute(who, e.at);
          return `${String(Math.floor(local / 60)).padStart(2, '0')}:${String(local % 60).padStart(2, '0')} ${ACTIONS[actionOf(e.action, e.routine, who)].doing.toLowerCase()}${e.line ? `, saying "${e.line}"` : ''}`;
        });
        const messages = [{ role: 'system' as const, content: system(who) }, { role: 'user' as const, content: `Your day is over and you are going to bed. This is how it went:\n${doings.join('\n')}\n\nIn two to four sentences, in the first person and plain words, write what you will remember about today and what you hope for tomorrow. Plain text only.` }];
        for (let attempt = 0; attempt < 2 && text === null; attempt++) {
          let answer: AskResult;
          try { answer = await callModel({ purpose: 'resident', messages: attempt === 0 ? messages : [...messages, { role: 'user', content: 'Please write it again in your own words, as yourself. Plain text only.' }], maxTokens: SUMMARY_TOKENS, carriesPlayerWords: false, timeoutMs: 8000, ...(life.model ? { prefer: life.model } : {}) }); }
          catch { break; }
          if (!answer.ok) break;
          day.summaryCostMicro += answer.costMicro; day.costMicro += answer.costMicro;
          const checked = judgeSummary(answer.text);
          if (checked.ok) text = checked.text; else if (checked.slip === 'invalid') day.invalid += 1; else day.slips += 1;
          if (!checked.ok && attempt === 0) day.retries += 1;
        }
      }
      day.summary = text ?? writtenSummary(state, day);
      life.memory.push(day.summary);
      if (life.memory.length > DAYS_KEPT) life.memory.splice(0, life.memory.length - DAYS_KEPT);
      persist();
    } finally { state.summarising = false; }
  }

  // ---- the beat ----------------------------------------------------------------------------------------------------------------------------
  function leave(state: Live): void {
    if (state.presentAt) { room()?.absent(state.id); state.presentAt = null; }
  }
  function stand(state: Live, action: ActionId, t: number): void {
    const door = room(), target = placeFor(state, action);
    if (!door) return;
    if (!target) { leave(state); return; }
    const cur = state.presentAt;
    if (cur && cur.room === target && cur.until - t >= PRESENCE_MS - RENEW_MS) return;
    const base = initialVenuePosition(target.split(':')[1] ?? ''), h = hash(`${state.id}|${target}`);
    const position = { x: Math.max(-18, Math.min(18, base.x + (h % 9 - 4) * 0.9)), z: Math.max(-18, Math.min(18, base.z + ((h >>> 8) % 9 - 4) * 0.9)) };
    door.present({ id: state.id, name: state.who.name, mark: { agent: true }, room: target, position, doing: (action === 'open_shop' || action === 'work_shift') && state.who.doing ? state.who.doing : ACTIONS[action].doing, look: HOUSE_LOOKS[state.who.look ?? 'sis'], until: t + PRESENCE_MS });
    state.presentAt = { room: target, until: t + PRESENCE_MS };
  }
  const jitter = (state: Live, t: number): number => t + ALONE_MS[0] + (hash(`${state.id}|${Math.floor(t / 60000)}`) % (ALONE_MS[1] - ALONE_MS[0]));

  function beat(state: Live, t: number, on: boolean, shadow: boolean): void {
    if (!on) { if (state.asleep !== null) { leave(state); state.asleep = null; state.where = null; } return; }
    const slept = asleepAt(state.who, t) || stopped(t);
    if (slept) {
      if (state.asleep === false) {
        // Going to bed: one summary call (not when it is the budget that sent it).
        const day = dayOf(state.who, t - 3600000);
        if (stopped(t)) day.sleptEarly = true;
        day.sleptAt = t; persist();
        leave(state); state.doing = null; state.where = null;
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
    const target = placeFor(state, state.doing && t < state.doing.until ? state.doing.action : routine.action);
    const rooms = takeCensus(t).rooms, people = target ? rooms.get(target) ?? 0 : 0;
    if (!state.pending) {
      if (routine.action !== state.lastRoutine) state.pending = 'routine-end';
      else if (people > 0 && state.lastPeople === 0) state.pending = 'arrival';
      else if (t >= state.nextAlone) state.pending = 'alone';
    }
    state.lastRoutine = routine.action; state.lastPeople = people;
    state.where = target;
    const reason = state.pending;
    if (reason && !state.busy && inflight < MAX_INFLIGHT) {
      const event = reason !== 'morning' && reason !== 'alone';
      if (!event || t - state.lastThought >= EVENT_GAP_MS) {
        state.pending = null; state.busy = true; state.nextAlone = jitter(state, t);
        inflight += 1;
        void think(state, reason, t).catch(() => {}).finally(() => { state.busy = false; inflight -= 1; });
      } else state.pending = null; // too soon after the last thought: this event is let go
    }
    // Where it stands. In shadow: only in its own record.
    const at = state.doing && t < state.doing.until ? state.doing.action : routine.action;
    if (shadow) { if (state.presentAt) leave(state); } else stand(state, at, t);
  }

  // ---- talk between residents: two awake residents who stand in the same venue, at most TALK_TURNS lines, grounded in one real ledger line --------
  interface Exchange { a: Live; b: Live; room: string; ground: GistItem | null; groundUsed: boolean; lines: TalkRecord['lines']; nextAt: number; busy: boolean; record: TalkRecord | null }
  const exchanges = new Set<Exchange>();
  const pairLast = new Map<string, number>();
  const pairKey = (x: Live, y: Live): string => (x.id < y.id ? `${x.id}|${y.id}` : `${y.id}|${x.id}`);
  const talksOn = (state: Live, t: number): number => dayOf(state.who, t).talks ?? 0;
  const clockOf = (who: Resident, t: number): string => { const local = localMinute(who, t); return `${String(Math.floor(local / 60)).padStart(2, '0')}:${String(local % 60).padStart(2, '0')}`; };

  /** Who is together now: awake residents with the same place, at most one new pair per place per beat, within every bound above. */
  function meet(t: number): void {
    if (stopped(t) || exchanges.size >= MAX_INFLIGHT) return;
    const byRoom = new Map<string, Live[]>();
    for (const state of live.values()) {
      if (state.asleep !== false || !state.where || state.talking || t - state.lastTalk < TALK_GAP_MS || talksOn(state, t) >= MAX_TALKS) continue;
      const list = byRoom.get(state.where); if (list) list.push(state); else byRoom.set(state.where, [state]);
    }
    for (const [room, here] of byRoom) {
      for (let i = 0; i < here.length - 1; i++) {
        const other = here.slice(i + 1).find((candidate) => t - (pairLast.get(pairKey(here[i]!, candidate)) ?? -Infinity) >= PAIR_GAP_MS);
        if (!other) continue;
        begin(here[i]!, other, room, t);
        break;
      }
    }
  }
  function begin(a: Live, b: Live, room: string, t: number): void {
    const ex: Exchange = { a, b, room, ground: null, groundUsed: false, lines: [], nextAt: t, busy: true, record: null };
    a.talking = b.talking = true; exchanges.add(ex); pairLast.set(pairKey(a, b), t);
    void (async () => {
      try {
        const items = await ctx.store.read((db) => gistService(ctx).recent(db, a.who.city, { limit: 8 }));
        // Grounded or not at all: with nothing in the ledger there is nothing to talk about, and nothing is said.
        if (!items.length) { release(ex); return; }
        ex.ground = items[hash(`${pairKey(a, b)}|${utc(t)}`) % items.length]!;
        ex.record = { at: t, between: [a.id, b.id], room, ground: ex.ground.n, groundText: ex.ground.text, lines: ex.lines, ended: 'turns' };
        for (const state of [a, b]) { const day = dayOf(state.who, t); day.talks = (day.talks ?? 0) + 1; (day.talkLog ??= []).push(ex.record); if (day.talkLog.length > TALKS_KEPT) day.talkLog.splice(0, day.talkLog.length - TALKS_KEPT); }
        persist();
        ex.busy = false;
      } catch { release(ex); }
    })();
  }
  function release(ex: Exchange): void { exchanges.delete(ex); ex.a.talking = ex.b.talking = false; ex.a.lastTalk = ex.b.lastTalk = ctx.now(); }
  function finish(ex: Exchange, why: TalkRecord['ended']): void { if (ex.record) ex.record.ended = why; release(ex); persist(); }
  function advance(t: number): void {
    for (const ex of [...exchanges]) {
      if (ex.busy || t < ex.nextAt) continue;
      if (stopped(t)) { finish(ex, 'budget'); continue; }
      if (ex.a.asleep !== false || ex.b.asleep !== false || ex.a.where !== ex.room || ex.b.where !== ex.room) { finish(ex, 'left'); continue; }
      if (inflight >= MAX_INFLIGHT) continue;
      ex.busy = true; inflight += 1;
      void turn(ex, t).catch(() => finish(ex, 'failed')).finally(() => { ex.busy = false; inflight -= 1; });
    }
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
      try { answer = await callModel({ purpose: 'resident', messages: attempt === 0 ? messages : [...messages, { role: 'user', content: RETRY_TALK }], maxTokens: TALK_TOKENS, carriesPlayerWords: false, timeoutMs: 8000, ...(life.model ? { prefer: life.model } : {}) }); }
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
    if (ex.lines.length >= TALK_TURNS) finish(ex, 'turns'); else ex.nextAt = ctx.now() + TALK_STEP_MS;
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
  const isNamed = (who: Resident, body: string): boolean => { const lower = body.toLowerCase(), words = new Set(lower.split(/[^\p{L}\p{N}]+/u)); return lower.includes(who.name.toLowerCase()) || callsOf(who).some((word) => words.has(word)); };
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
        try { answer = await callModel({ purpose: 'resident', messages: attempt === 0 ? messages : [...messages, { role: 'user', content: RETRY_TALK }], maxTokens: REPLY_TOKENS, playerId: `p_${sha256Hex(`allworld-house-v1|${from.id}`).slice(0, 32)}`, carriesPlayerWords: true, timeoutMs: 8000, ...(life.model ? { prefer: life.model } : {}) }); }
        catch { break; }
        if (!answer.ok) break;
        day.replyCostMicro = (day.replyCostMicro ?? 0) + answer.costMicro;
        const checked = judgeTalk(answer.text);
        if (checked.ok) text = checked.text;
        else { day.replySlips = (day.replySlips ?? 0) + 1; if (attempt === 0) day.replyRetries = (day.replyRetries ?? 0) + 1; }
      }
    }
    await speak(state, text ?? WRITTEN[seed % WRITTEN.length]!);
    persist();
  }

  function tick(): void {
    try {
      const s = settings();
      if (!s.on && !isReady) return;
      void ready();
      if (!isReady) return;
      const t = ctx.now();
      const count = Math.min(s.count, roster.length);
      for (const [index, who] of roster.entries()) beat(liveOf(who), t, s.on && index < count, s.shadow);
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
      for (const state of live.values()) if (state.asleep === false && state.postRoom === event.room && isNamed(state.who, body) && !state.pending) state.pending = 'spoken-to';
      const id = event.from.id;
      if (s.shadow || stopped(ctx.now()) || typeof id !== 'string' || !id || id.startsWith('house.') || id.startsWith('resident.')) return;
      const here = [...live.values()].filter((state) => state.asleep === false && state.presentAt?.room === event.room && !state.replying);
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
    tick, ready, settings, line: onLine, report,
    /** For tests and the admin page. */
    state(id?: string) {
      const who = roster.find((r) => residentId(r) === id) ?? roster[0]; if (!who) return null;
      const state = liveOf(who), life = Object.hasOwn(stored.residents, state.id) ? stored.residents[state.id]! : null, t = ctx.now();
      const day = life ? Object.values(life.days).sort((a, b) => b.day - a.day)[0] ?? null : null;
      return { id: state.id, name: who.name, asleep: state.asleep, budgetStopped: stopped(t), doing: state.doing?.action ?? null, model: life?.model ?? null, lines: state.lines, present: state.presentAt !== null, day, memory: life?.memory ?? [], busy: state.busy, where: state.where, talking: state.talking };
    },
    /** Who is switched on, awake or asleep, in roster order. */
    census() {
      const count = Math.min(settings().count, roster.length), t = ctx.now();
      let awake = 0, asleep = 0, present = 0;
      for (const [index, who] of roster.entries()) { if (index >= count) break; const state = liveOf(who); if (state.asleep === false) awake += 1; else if (state.asleep === true) asleep += 1; if (state.presentAt) present += 1; }
      return { count, awake, asleep, present, exchanges: exchanges.size, stopped: stopped(t), spentMicro: spentToday(), limitMicro: settings().cents * 10000 };
    },
    stored: (): Stored => stored,
    /** The newest day record of the first resident (or of the one asked for), or null. */
    day: (id?: string): DayRecord | null => { const who = roster.find((r) => residentId(r) === id) ?? roster[0]; if (!who || !Object.hasOwn(stored.residents, residentId(who))) return null; return Object.values(stored.residents[residentId(who)]!.days).sort((a, b) => b.day - a.day)[0] ?? null; },
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
  registerAdminSetting(ctx, { key: 'residentShadow', label: 'Residents: shadow (nobody sees them)', help: 'On: they act only in their own records, are not in any room or in the online count, talk to each other only on paper and say nothing to anyone. Off: they stand in their venues with the AI-played mark, speak, and answer a person who names them. Leave on until the owner has read their days.', kind: 'boolean', default: () => DEFAULTS.shadow });
  registerAdminSetting(ctx, { key: 'residentCount', label: 'Residents: how many', help: 'How many of the thirty authored residents run, in order (Remi first, then Lagos, Abuja, Ibadan, Accra, Nairobi, Cape Town, London, New York). 1 runs only Remi. Raise it only after reading her day on this page.', kind: 'number', min: 1, max: COUNT_MAX, default: () => DEFAULTS.count });
  registerAdminSetting(ctx, { key: 'residentDailyCents', label: 'Residents: most spent a day (US cents)', help: 'When the residents have spent this much in a UTC day (thoughts, talk and answers together) they all go to sleep early, so the other model purposes still answer. 100 = US$1. Never above 190, under the router\'s US$2 hard stop.', kind: 'number', min: 0, max: CENTS_MAX, default: () => DEFAULTS.cents });
  const runner = residentService(ctx), who = RESIDENTS[0]!;
  const stat = (id: string, label: string, read: (db: Db) => number | string): void => registerAdminStat(ctx, { id: `resident-${id}`, group: 'Residents', label, cost: 'memory', read });
  const view = () => runner.state(), day = () => runner.day();
  stat('roster', 'Switched on (residentCount)', () => { const c = runner.census(), set = runner.settings(); return !set.on ? 'off' : `${c.count} of ${RESIDENTS.length}: ${c.awake} awake, ${c.asleep} asleep, ${c.present} standing in venues, ${c.exchanges} talking · ${set.shadow ? 'shadow (nobody sees them)' : 'visible'}${c.stopped ? ' · ALL ASLEEP EARLY (budget spent)' : ''}`; });
  stat('budget', 'Spent today against the residents\' limit', () => { const c = runner.census(); return `${usd(c.spentMicro)} of ${usd(c.limitMicro)}`; });
  stat('state', 'Remi: state', () => { const s = view(), set = runner.settings(); return !s || !set.on ? 'off' : `${s.name}: ${s.budgetStopped ? 'asleep early (budget spent)' : s.asleep ? 'asleep' : s.asleep === false ? `awake, ${s.doing ?? 'following the plan'}` : 'starting'} · ${set.shadow ? 'shadow (nobody sees her)' : 'visible'}`; });
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
  // ---- 13b: the comparison of models, the talk between residents, and the experiment's measures ---------------------------------------------
  stat('models', 'Models compared (last 7 days, by the model given at birth): residents · thoughts · talk between residents (exchanges/lines) · answers to people · retries · slips · invalid · fallbacks · cost', () => {
    const rows = Object.entries(runner.report().models).sort((a, b) => b[1].residents - a[1].residents);
    return rows.map(([model, r]) => `${model}: ${r.residents} residents · ${r.thoughts} thoughts · ${r.talks} talks/${r.talkLines} lines · ${r.replies} answers to people · ${r.retries} retries (asked again) · ${r.slips} slips (out of character or rule breaks) · ${r.invalid} invalid · ${r.fallbacks} fell back · ${usd(r.costMicro)}`).join('\n') || 'none yet';
  });
  stat('talk', 'Talk between residents (newest last; kept on paper in shadow)', () => entriesOfTalk(runner.stored(), RESIDENTS).slice(-8).join('\n') || 'none yet');
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
export function entriesOfTalk(stored: Stored, roster: readonly Resident[]): string[] {
  const names = new Map(roster.map((who) => [residentId(who), who.name]));
  const seen = new Set<string>(), found: TalkRecord[] = [];
  for (const life of Object.values(stored.residents)) {
    const newest = Object.values(life.days).sort((a, b) => b.day - a.day)[0];
    for (const talk of newest?.talkLog ?? []) { const key = `${talk.at}|${talk.between.join('|')}`; if (!seen.has(key)) { seen.add(key); found.push(talk); } }
  }
  return found.sort((a, b) => a.at - b.at).map((talk) => `${new Date(talk.at).toISOString().slice(11, 16)} UTC ${names.get(talk.between[0]) ?? talk.between[0]} and ${names.get(talk.between[1]) ?? talk.between[1]}, about ledger line ${talk.ground ?? '-'} "${talk.groundText ?? ''}": ${talk.lines.map((line) => `${names.get(line.by) ?? line.by}: "${line.text}"`).join(' / ') || 'nothing said'} [${talk.ended}]`);
}
