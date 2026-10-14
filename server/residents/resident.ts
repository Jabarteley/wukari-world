/**
 * OWNER: agents (residents, docs/RESIDENTS.md)
 * THE RESIDENT RUNNER: an agent that really lives. Portable (no Node imports): the Node host and the Worker run it on the heartbeat.
 * Phase 13a: ONE resident (life.ts), in SHADOW: it acts, but nobody sees it.
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
 * SHADOW (admin settings residentOn, off by default; residentShadow, on by default). In shadow it is NOT placed in agentRoom (so not in the
 * people list and not in the pulse `ai` number), its lines are NOT sent to anyone, it reads no person's words and it changes no player's state.
 * Its "world" is its own sandbox record (where it stands, what it does, the lines it WOULD have said). With residentShadow off it stands in its
 * venue with the AI-played mark and says its lines through agentRoom.say (the same word rules as every agent): that is for the next phase.
 *
 * STORED (optional, lazily, never durable): the collection `residents` = { v: 1, residents: { [id]: { born, model, days, memory } } }, 7 days, at most
 * MAX_ENTRIES choices a day. The admin page reads it from memory (group "Resident (shadow)").
 */
import { lagosTime } from '../../src/game/clock.ts';
import { cityRules } from '../../src/game/cities/index.ts';
import { agentWords } from '../moderation/agent-words.ts';
import { gistService } from '../gist/ledger.ts';
import { initialVenuePosition, venueRoomKey } from '../protocol.ts';
import { registerAdminSetting } from '../admin/settings.ts';
import { registerAdminStat } from '../admin/tools.ts';
import { routerOf } from '../models/service.ts';
import type { AskInput, AskResult } from '../models/router.ts';
import { entryKey } from '../models/catalog.ts';
import type { RouteContext } from '../types.ts';
import { ACTIONS, planAt } from '../house/actions.ts';
import type { ActionId } from '../house/actions.ts';
import { HOUSE_LOOKS, venueFor } from '../house/cast.ts';
import { RESIDENTS, residentId } from './life.ts';
import type { Resident } from './life.ts';

/** What a thought may choose: five of the house actions, or "keep to the routine". Anything else is thrown away. */
export const CHOICES = ['keep_routine', 'open_shop', 'go_market', 'eat', 'go_home'] as const;
export type Choice = typeof CHOICES[number];
const CHOICE_HELP: Readonly<Record<Choice, string>> = Object.freeze({
  keep_routine: 'carry on with what the day plan says', open_shop: 'stand at your stall and keep it', go_market: 'go to the market for stock',
  eat: 'go and eat something', go_home: 'go home and be on your own',
});
export type Wake = 'morning' | 'routine-end' | 'arrival' | 'spoken-to' | 'alone';

/** Thoughts and records are bounded: nothing here grows. */
export const ALONE_MS = [15 * 60000, 30 * 60000] as const, EVENT_GAP_MS = 3 * 60000;
export const MAX_THOUGHTS = 64, MAX_ENTRIES = 120, DAYS_KEPT = 7, SUMMARY_MAX = 600, LINE_MAX = 140, MODEL_TOKENS = 160, SUMMARY_TOKENS = 240;
const CENSUS_MS = 30000, PRESENCE_MS = 12 * 60000, RENEW_MS = 6 * 60000, CHOICE_MS = 60 * 60000;
export const DEFAULTS = Object.freeze({ on: false, shadow: true });

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
export interface DayRecord {
  day: number; wokeAt: number | null; sleptAt: number | null; sleptEarly: boolean
  thoughts: number; retries: number; slips: number; invalid: number; fallbacks: number; costMicro: number
  entries: Entry[]; summary: string | null; summaryCostMicro: number
}
export interface Life { born: number; model: string | null; days: Record<string, DayRecord>; memory: string[] }
export interface Stored { v: 1; residents: Record<string, Life> }

const blankDay = (day: number): DayRecord => ({ day, wokeAt: null, sleptAt: null, sleptEarly: false, thoughts: 0, retries: 0, slips: 0, invalid: 0, fallbacks: 0, costMicro: 0, entries: [], summary: null, summaryCostMicro: 0 });

export type Verdict = { ok: true; next: Choice; say: string | null } | { ok: false; slip: 'character' | 'words' | 'invalid' };
/** The whole check of a reply: in character, the right JSON, a choice from the list, a short line that passes the agent word rules. */
export function judge(raw: string): Verdict {
  const text = String(raw ?? '');
  if (OUT_OF_CHARACTER.test(text)) return { ok: false, slip: 'character' };
  const from = text.indexOf('{'), to = text.lastIndexOf('}');
  if (from < 0 || to <= from) return { ok: false, slip: 'invalid' };
  let parsed: unknown;
  try { parsed = JSON.parse(text.slice(from, to + 1)); } catch { return { ok: false, slip: 'invalid' }; }
  if (typeof parsed !== 'object' || parsed === null || Array.isArray(parsed)) return { ok: false, slip: 'invalid' };
  const { next, say } = parsed as Record<string, unknown>;
  if (typeof next !== 'string' || !(CHOICES as readonly string[]).includes(next)) return { ok: false, slip: 'invalid' };
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
  const settings = () => ({ on: setting('residentOn') === true, shadow: setting('residentShadow') !== false });
  const room = () => ctx.checks?.agentRoom;
  let stored: Stored = { v: 1, residents: {} };
  let loaded: Promise<void> | null = null;
  const load = deps.load ?? ((): Promise<Stored | undefined> => ctx.store.read((db) => { const col = (db as Record<string, unknown>)['residents']; return col && typeof col === 'object' ? structuredClone(col) as Stored : undefined; }));
  const save = deps.save ?? ((value: Stored): Promise<void> => ctx.store.transact((db) => { Object.assign(ctx.collection(db, 'residents', { v: 1, residents: {} }), structuredClone(value)); }, { durable: false }));
  let isReady = false;
  const ready = (): Promise<void> => (loaded ??= load().then((found) => { if (found && typeof found.residents === 'object' && found.residents !== null) stored = { v: 1, residents: { ...found.residents } }; }, () => {}).then(() => { isReady = true; }));
  let saving = false, dirty = false;
  function persist(): void {
    dirty = true;
    if (saving) return;
    saving = true;
    void (async () => { try { while (dirty) { dirty = false; await save(stored); } } catch { /* the next change tries again */ } finally { saving = false; } })();
  }

  /** Everything that lives only in memory, per resident. */
  interface Live {
    who: Resident; id: string; asleep: boolean | null; busy: boolean
    nextAlone: number; lastThought: number; lastRoutine: ActionId | null; lastPeople: number
    doing: { action: ActionId; until: number } | null
    pending: Wake | null; budgetDay: number; postRoom: string | null
    lines: number; presentAt: { room: string; until: number } | null; mark: number
    summarising: boolean
  }
  const live = new Map<string, Live>();
  let census: { at: number; rooms: Map<string, number> } = { at: -Infinity, rooms: new Map() };

  function liveOf(who: Resident): Live {
    const id = residentId(who);
    let found = live.get(id);
    if (!found) {
      const post = venueFor(who.city, who.work.post, who.work.role);
      found = { who, id, asleep: null, busy: false, nextAlone: 0, lastThought: -Infinity, lastRoutine: null, lastPeople: 0, doing: null, pending: null, budgetDay: -1, postRoom: post ? venueRoomKey(who.city, post, '') : null, lines: 0, presentAt: null, mark: 0, summarising: false };
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
      const list = modelList();
      if (list.length) { found.model = list[hash(id) % list.length]!; persist(); }
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
    }
    return life.days[key]!;
  }

  // ---- the routine: the house action library, no model ---------------------------------------------------------------------------------
  const routineOf = (who: Resident, t: number) => planAt(who.work, t);
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
  const actionOf = (choice: Choice, routine: ActionId): ActionId => (choice === 'keep_routine' ? routine : choice);

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
  function system(who: Resident): string {
    return `${who.story}\n\nYou are ${who.name}, speaking and thinking as yourself. Answer only with a small JSON object and nothing else.`;
  }
  async function thoughtMessages(state: Live, life: Life, day: DayRecord, t: number, reason: Wake, routine: ActionId): Promise<{ role: 'system' | 'user'; content: string }[]> {
    const { who } = state, local = localMinute(who, t), city = cityRules(who.city)?.name ?? who.city;
    const clock = `${String(Math.floor(local / 60)).padStart(2, '0')}:${String(local % 60).padStart(2, '0')}`;
    const weekday = WEEKDAYS[lagosTime(t + (who.utcOffsetMin - 60) * 60000).weekday]!;
    const news = await newsOf(who.city);
    const recent = day.entries.slice(-3).map((e) => `${e.action === 'keep_routine' ? ACTIONS[e.routine].doing : ACTIONS[actionOf(e.action, e.routine)].doing}${e.line ? `, saying "${e.line}"` : ''}`);
    const lines = [
      `It is ${clock} on ${weekday} in ${city}. ${REASON[reason]}`,
      `Your day plan says: ${ACTIONS[routine].doing.toLowerCase()}.`,
      state.doing && t < state.doing.until ? `Right now you are ${ACTIONS[state.doing.action].doing.toLowerCase()}.` : '',
      recent.length ? `Earlier today: ${recent.join('; ')}.` : '',
      life.memory.length ? `How your last days felt: ${life.memory.slice(-2).map((m) => m.slice(0, 300)).join(' ')}` : '',
      news.length ? `What people are talking about in town: ${news.join('; ')}.` : '',
      '',
      'What do you do next? Choose "next" from:',
      ...CHOICES.map((choice) => `- ${choice}: ${CHOICE_HELP[choice]}`),
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
      try { answer = await ask({ purpose: 'resident', messages: attempt === 0 ? messages : [...messages, { role: 'user', content: RETRY }], maxTokens: MODEL_TOKENS, carriesPlayerWords: false, timeoutMs: 8000, ...(life.model ? { prefer: life.model } : {}) }); }
      catch { entry.why = 'failed'; break; }
      if (!answer.ok) {
        entry.why = answer.why;
        // The day's budget is spent: go to bed early, for the rest of the UTC day.
        if (answer.why === 'budget') { state.budgetDay = utcDay(ctx.now()); }
        break;
      }
      entry.model = answer.model; entry.free = answer.free; entry.costMicro += answer.costMicro;
      const checked = judge(answer.text);
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
    const action = actionOf(entry.action, entry.routine);
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
    const did = [...new Set(day.entries.map((e) => ACTIONS[actionOf(e.action, e.routine)].doing.toLowerCase()))].slice(0, 4);
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
      if (state.budgetDay !== utcDay(t) && day.entries.length) {
        const doings = day.entries.slice(-30).map((e) => {
          const local = localMinute(who, e.at);
          return `${String(Math.floor(local / 60)).padStart(2, '0')}:${String(local % 60).padStart(2, '0')} ${ACTIONS[actionOf(e.action, e.routine)].doing.toLowerCase()}${e.line ? `, saying "${e.line}"` : ''}`;
        });
        const messages = [{ role: 'system' as const, content: system(who) }, { role: 'user' as const, content: `Your day is over and you are going to bed. This is how it went:\n${doings.join('\n')}\n\nIn two to four sentences, in the first person and plain words, write what you will remember about today and what you hope for tomorrow. Plain text only.` }];
        for (let attempt = 0; attempt < 2 && text === null; attempt++) {
          let answer: AskResult;
          try { answer = await ask({ purpose: 'resident', messages: attempt === 0 ? messages : [...messages, { role: 'user', content: 'Please write it again in your own words, as yourself. Plain text only.' }], maxTokens: SUMMARY_TOKENS, carriesPlayerWords: false, timeoutMs: 8000, ...(life.model ? { prefer: life.model } : {}) }); }
          catch { break; }
          if (!answer.ok) { if (answer.why === 'budget') state.budgetDay = utcDay(ctx.now()); break; }
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
    door.present({ id: state.id, name: state.who.name, mark: { agent: true }, room: target, position, doing: ACTIONS[action].doing, look: HOUSE_LOOKS.sis, until: t + PRESENCE_MS });
    state.presentAt = { room: target, until: t + PRESENCE_MS };
  }
  const jitter = (state: Live, t: number): number => t + ALONE_MS[0] + (hash(`${state.id}|${Math.floor(t / 60000)}`) % (ALONE_MS[1] - ALONE_MS[0]));

  function beat(state: Live, t: number, on: boolean, shadow: boolean): void {
    if (!on) { if (state.asleep !== null) { leave(state); state.asleep = null; } return; }
    const slept = asleepAt(state.who, t) || state.budgetDay === utcDay(t);
    if (slept) {
      if (state.asleep === false) {
        // Going to bed: one summary call (not when it is the budget that sent it).
        const day = dayOf(state.who, t - 3600000);
        if (state.budgetDay === utcDay(t)) day.sleptEarly = true;
        day.sleptAt = t; persist();
        leave(state); state.doing = null;
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
    const reason = state.pending;
    if (reason && !state.busy) {
      const event = reason !== 'morning' && reason !== 'alone';
      if (!event || t - state.lastThought >= EVENT_GAP_MS) {
        state.pending = null; state.busy = true; state.nextAlone = jitter(state, t);
        void think(state, reason, t).catch(() => {}).finally(() => { state.busy = false; });
      } else state.pending = null; // too soon after the last thought: this event is let go
    }
    // Where it stands. In shadow: only in its own record.
    const at = state.doing && t < state.doing.until ? state.doing.action : routine.action;
    if (shadow) { if (state.presentAt) leave(state); } else stand(state, at, t);
  }

  function tick(): void {
    try {
      const s = settings();
      if (!s.on && !isReady) return;
      void ready();
      if (!isReady) return;
      const t = ctx.now();
      for (const who of roster) beat(liveOf(who), t, s.on, s.shadow);
    } catch { /* a bad beat must never stop the host's heartbeat */ }
  }
  /** Someone nearby said the resident's name: a wake, never the words. */
  function onLine(event: { room: string; body: string; from: { agent?: boolean } }): void {
    try {
      if (event.from.agent === true || !settings().on) return;
      const lower = String(event.body).toLowerCase();
      for (const state of live.values()) if (state.asleep === false && state.postRoom === event.room && lower.includes(state.who.name.toLowerCase()) && !state.pending) state.pending = 'spoken-to';
    } catch { /* ignored */ }
  }
  ctx.on?.('heartbeat', tick);
  ctx.on?.('venue-line', onLine);

  return {
    tick, ready, settings, line: onLine,
    /** For tests and the admin page. */
    state(id?: string) {
      const who = roster.find((r) => residentId(r) === id) ?? roster[0]; if (!who) return null;
      const state = liveOf(who), life = Object.hasOwn(stored.residents, state.id) ? stored.residents[state.id]! : null, t = ctx.now();
      const day = life ? Object.values(life.days).sort((a, b) => b.day - a.day)[0] ?? null : null;
      return { id: state.id, name: who.name, asleep: state.asleep, budgetStopped: state.budgetDay === utcDay(t), doing: state.doing?.action ?? null, model: life?.model ?? null, lines: state.lines, present: state.presentAt !== null, day, memory: life?.memory ?? [], busy: state.busy };
    },
    stored: (): Stored => stored,
    /** The newest day record of the first resident, or null. */
    day: (): DayRecord | null => { const who = roster[0]; if (!who || !Object.hasOwn(stored.residents, residentId(who))) return null; return Object.values(stored.residents[residentId(who)]!.days).sort((a, b) => b.day - a.day)[0] ?? null; },
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

/** Settings and the admin page group "Resident (shadow)". Called once per host with the other admin links (server/admin/links.ts). */
export function linkResidents(ctx: RouteContext): void {
  registerAdminSetting(ctx, { key: 'residentOn', label: 'Resident: on', help: 'One resident (a Lagos bookseller) lives her day, asleep at night, thinking with a free model. Off by default. In shadow nobody sees her. Costs only what the model router allows.', kind: 'boolean', default: () => DEFAULTS.on });
  registerAdminSetting(ctx, { key: 'residentShadow', label: 'Resident: shadow (nobody sees her)', help: 'On: she acts only in her own record, is not in any room or in the online count, and says nothing to anyone. Off: she stands in her venue with the AI-played mark and speaks. Leave on until the owner has read her day.', kind: 'boolean', default: () => DEFAULTS.shadow });
  const runner = residentService(ctx), who = RESIDENTS[0]!;
  const stat = (id: string, label: string, read: () => number | string): void => registerAdminStat(ctx, { id: `resident-${id}`, group: 'Resident (shadow)', label, cost: 'memory', read });
  const view = () => runner.state(), day = () => runner.day();
  stat('state', 'State', () => { const s = view(), set = runner.settings(); return !s || !set.on ? 'off' : `${s.name}: ${s.budgetStopped ? 'asleep early (budget spent)' : s.asleep ? 'asleep' : s.asleep === false ? `awake, ${s.doing ?? 'following the plan'}` : 'starting'} · ${set.shadow ? 'shadow (nobody sees her)' : 'visible'}`; });
  stat('model', 'Model assigned at birth', () => view()?.model ?? 'not yet');
  stat('thoughts', 'Thoughts today', () => day()?.thoughts ?? 0);
  stat('retries', 'Retries (a reply thrown away and asked again)', () => day()?.retries ?? 0);
  stat('slips', 'Slips (stepped out of character or broke the word rules)', () => day()?.slips ?? 0);
  stat('invalid', 'Replies that were not the right JSON', () => day()?.invalid ?? 0);
  stat('fallbacks', 'Fell back to the routine', () => day()?.fallbacks ?? 0);
  stat('cost', 'Cost of her day', () => usd(day()?.costMicro ?? 0));
  stat('purpose', 'Residents today, by the router ledger', () => { const p = routerOf(ctx).today().ledger.byPurpose['resident']; return p ? `${p.n} requests, ${usd(p.micro)}` : 'none yet'; });
  stat('sleep', 'Slept / woke', () => { const d = day(); return d ? `woke ${d.wokeAt ? new Date(d.wokeAt).toISOString().slice(11, 16) : '-'} UTC · bed ${d.sleptAt ? new Date(d.sleptAt).toISOString().slice(11, 16) + ' UTC' : 'not yet'}${d.sleptEarly ? ' (early: budget spent)' : ''}` : 'no day yet'; });
  stat('log', 'Her choices today (newest last, local time)', () => day()?.entries.slice(-14).map((e) => entryLine(who, e)).join('\n') || 'none yet');
  stat('summary', 'Her summary of the last night', () => day()?.summary ?? runner.state()?.memory.at(-1) ?? 'none yet');
}
