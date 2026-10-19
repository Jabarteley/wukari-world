/**
 * OWNER: agents (house agents, docs/HOUSE-AGENTS.md)
 * THE HOUSE-AGENT RUNNER: the game's own always-alive cast, driven by the server's heartbeat. Portable (no Node imports): the Node host and the
 * Worker run it, because both raise the in-process 'heartbeat' event.
 *
 * WHAT A HOUSE AGENT IS. A virtual member of a venue room (ctx.checks.agentRoom, server/ws/rooms.ts), exactly like a character an AI agent plays
 * through the tools: seated in the venue's groups, listed in presence, counted in the pulse `ai` number, ALWAYS with the AI-played mark
 * (`mark: { agent: true }`, no expiry), and everything it says goes through agentRoom.say (the same filters as a person's line plus
 * moderation/agent-words.ts). It has no wallet, no life and no stored record: nothing here writes to the store, except the memory of a person who wrote to it (below).
 *
 * THE BRAIN, CHEAPEST FIRST (DESIGN.md Part 3, rules 2 and 3):
 *   1. Routine: actions.ts decides where the agent is and what it is doing, by the clock and by rules. Each beat looks at a bounded number of
 *      agents (MAX_PER_BEAT) and says at most MAX_SAY_PER_BEAT lines. A tick calls a model only to summarise a finished conversation (below).
 *   2. Written lines: lines.ts. Greetings, prices, hours, directions, tonight's event, the quiz: free.
 *   3. The model: ONLY when a person writes in the venue where the agent stands (the 'venue-line' event of rooms.ts), and only for a line a
 *      written answer cannot give (an offer to phrase, directions, tonight, chat). router.ask({ purpose: 'agent-talk', carriesPlayerWords: true, maxTokens: 220 })
 *      so only paid models see a person's words, under the router's US$2 day stop and per-person caps. No key, no budget, a failed or an unsafe
 *      reply: the written line is said instead. The price is never the model's: haggle.ts decides it and talk.ts `cleanReply` throws a reply
 *      away that carries any other number. A private chat or a phone call (`answerCall`) also asks the model for greetings, goodbyes and
 *      hours, in a texting voice with the chat's last lines, so the agent talks like a person rather than a desk.
 *
 * MEMORY AND CLOSENESS (Phase 12, memory.ts, docs/AGENT-MEMORY.md). The one place this runner writes to the store, and only about a person who wrote to an agent:
 *   - each line a person writes to an agent may add closeness (one small lazy write, bounded by the wake limits above) and reads what the agent remembers;
 *   - the person's lines are kept in memory (6 at most, 160 characters each) ONLY while remembering is on for them, and only until the conversation ends (a goodbye,
 *     six lines, or four idle minutes); then ONE cheap request (rules when there is no model or no budget) turns them into at most three short facts, clean of contact
 *     details and money (memory.ts cleanFact), and the lines are thrown away. A beat starts at most MAX_SUMMARIES_PER_BEAT of those requests.
 *   - nothing here can be read by an agent tool, another person or a page: only the person's own routes (memory-routes.ts) see the stored facts.
 *   - HOOKS for later phases: deps.missions(personId, agent) gives a person's open missions for the prompt (Phase 11); house.missionDone(personId, agentId) raises closeness
 *     when one is completed; HOUSE_DM is false: a house agent has no stored character, so it cannot receive a direct message, and none is invented here. When agents get a
 *     record, a DM handler goes beside onLine and reuses reply() unchanged.
 *
 * SETTINGS (admin page, no release): houseAgentsOn (switch), houseAgentsBusy (agents in each busy city, 0 to 6), houseAgentsQuiet (agents in each other
 * city while a person is in it, 0 to 2), houseMaxDiscountPct (the most a seller gives away, never above haggle.ts HAGGLE.discountCap), houseTalkModel (switch:
 * off means written lines only),
 * houseMemoryOn (switch: off means nothing is remembered and no closeness is recorded), houseMemoryModel (switch: off means facts come from rules only),
 * houseMemoryCalls (the most summarising requests a UTC day, 0 to 5000).
 */
import { isOpen, openingInfo, formatHour } from '../../src/game/clock.ts';
import { cachedCityContent, cityRules } from '../../src/game/cities/index.ts';
import { sha256Hex } from '../../src/game/util.ts';
import { agentWords } from '../moderation/agent-words.ts';
import { gistService } from '../gist/ledger.ts';
import { initialVenuePosition, venueRoomKey } from '../protocol.ts';
import { registerAdminSetting } from '../admin/settings.ts';
import { registerAdminStat } from '../admin/tools.ts';
import { routerOf } from '../models/service.ts';
import type { AskInput, AskResult } from '../models/router.ts';
import type { Db, RouteContext } from '../types.ts';
import { ACTIONS, planAt } from './actions.ts';
import type { ActionId } from './actions.ts';
import { AUTHORED_CITIES, HOUSE_LOOKS, castOf, itemsOf, venueFor } from './cast.ts';
import type { Spec } from './cast.ts';
import { HAGGLE, decide, freshTalk, priceList, readOffer } from './haggle.ts';
import type { PricedItem, Talk, Verdict } from './haggle.ts';
import * as say from './lines.ts';
import * as memory from './memory.ts';
import { QUIZ, allowedNumbers, cleanReply, handsOver, intentOf, isRight, matchItem, matchVenue, promptFor, takesIt } from './talk.ts';
import { deskOf } from './desk.ts';
import type { Desk } from './desk.ts';
import type { AgentRef } from './errands.ts';
import type { Intent, Question } from './talk.ts';

/** Agents looked at in one beat, and lines they may say in one beat: the runner's whole work per beat. */
export const MAX_PER_BEAT = 8, MAX_SAY_PER_BEAT = 3;
/** All house agents at once (a ceiling above any setting). */
export const MAX_AGENTS = 48;
/** How long a presence lasts, and when it is renewed. Renewing announces the agent to the venue again, so it is rare. */
export const PRESENCE_MS = 12 * 60000, RENEW_MS = 6 * 60000;
const CENSUS_MS = 30000, LINGER_MS = 10 * 60000, AMBIENT_MS = [7 * 60000, 11 * 60000] as const, TONIGHT_MS = 12 * 60000;
const QUIZ_OPEN_MS = 90000, QUIZ_EVERY_MS = 8 * 60000;
const PEOPLE_KEPT = 200;
export const MODEL_TOKENS = 220;
export const ID_PREFIX = 'house.';
export const DEFAULTS = Object.freeze({ on: true, busy: 2, quiet: 0, discount: HAGGLE.discountDefault, model: true, memory: true, memoryModel: true, memoryCalls: 300 });
/** House agents cannot receive direct messages: a DM needs a stored character. The hook for when they have one is described in the header. */
export const HOUSE_DM = false;
/** A conversation is summarised when it ends: a goodbye, this many lines, or this long without one. */
export const CONVO_LINES = 6, CONVO_IDLE_MS = 4 * 60000, MAX_SUMMARIES_PER_BEAT = 2, CONVOS_KEPT = 500;

export interface HouseDeps {
  /** The model door; the router's by default. Tests pass one that sits on a fake fetch. */
  ask?: (input: AskInput) => Promise<AskResult>
  /** The desk that gives tasks and completes hand-overs (desk.ts); built from the context by default. Tests pass one on a fake world. */
  desk?: Desk
  /** A person's open missions from this agent, as short phrases for the prompt. Defaults to the desk's open agent tasks (the life's own list). */
  missions?: (personId: string, agent: { id: string; role: Spec['role']; city: string }) => readonly string[] | Promise<readonly string[]>
}
interface Convo { agent: string; person: string; name: string; lines: string[]; at: number; busy: boolean }
interface Person { item: string | null; talks: Map<string, Talk & { at: number }> }
interface Presence { room: string; action: ActionId; until: number }
interface Agent {
  id: string; city: string; spec: Spec
  /** Venues by place: the post, the market and the eatery. */
  rooms: { post: string; market: string; eatery: string | null }
  items: PricedItem[]
  discount: number
  at: Presence | null
  nextAmbient: number; nextTonight: number; nextQuiz: number
  quiz: { question: Question; until: number } | null
  people: Map<string, Person>
  busy: boolean
}
export interface Counters { wakes: number; model: number; written: number; blocked: number; said: number; refusedLow: number; facts: number; summaryModel: number; summaryRules: number; summarySkipped: number }
const blank = (): Counters => ({ wakes: 0, model: 0, written: 0, blocked: 0, said: 0, refusedLow: 0, facts: 0, summaryModel: 0, summaryRules: 0, summarySkipped: 0 });

const clampInt = (value: unknown, least: number, most: number, fallback: number): number => (typeof value === 'number' && Number.isFinite(value) ? Math.max(least, Math.min(most, Math.round(value))) : fallback);

export function houseOf(ctx: RouteContext, deps: HouseDeps = {}) {
  const agents = new Map<string, Agent>();
  let counters = blank(), counterDay = -1;
  const last = { stepped: 0, said: 0 };
  /** Conversations in progress with people who allow remembering: their last lines, in memory only, until the conversation ends. */
  const convos = new Map<string, Convo>();
  let summaryDay = -1, summaryCalls = 0, sweptDay = -1;
  let census: { at: number; cities: Map<string, number>; rooms: Map<string, number> } = { at: -Infinity, cities: new Map(), rooms: new Map() };
  const seen = new Map<string, number>(); // city → last time a person was there (for the quiet cast)
  const ask = deps.ask ?? ((input: AskInput): Promise<AskResult> => routerOf(ctx).ask(input));
  const setting = (key: string): boolean | number | string | undefined => ctx.checks?.setting?.(key) ?? ctx.checks?.text?.(key);
  const room = () => ctx.checks?.agentRoom;
  const desk = deps.desk ?? deskOf(ctx, deps.ask ? { ask: deps.ask } : {});

  const day = (): number => Math.floor(ctx.now() / 86400000);
  function count(): Counters { if (counterDay !== day()) { counterDay = day(); counters = blank(); } return counters; }

  const settings = () => ({
    on: setting('houseAgentsOn') !== false,
    busy: clampInt(setting('houseAgentsBusy'), 0, 6, DEFAULTS.busy),
    quiet: clampInt(setting('houseAgentsQuiet'), 0, 2, DEFAULTS.quiet),
    discount: clampInt(setting('houseMaxDiscountPct'), 0, HAGGLE.discountCap, DEFAULTS.discount),
    model: setting('houseTalkModel') !== false,
    memory: setting('houseMemoryOn') !== false,
    memoryModel: setting('houseMemoryModel') !== false,
    memoryCalls: clampInt(setting('houseMemoryCalls'), 0, 5000, DEFAULTS.memoryCalls),
  });

  // ---- who is where: people by city and room, counted at most every CENSUS_MS -------------------------------------------------------
  function takeCensus(t: number): typeof census {
    if (t - census.at < CENSUS_MS && t >= census.at) return census;
    const cities = new Map<string, number>(), rooms = new Map<string, number>();
    for (const ws of ctx.core?.sockets?.() ?? []) {
      const where = ws.room;
      if (!where || ws.session?.agent === true) continue;
      rooms.set(where, (rooms.get(where) ?? 0) + 1);
      const city = where.split(':')[0] ?? '';
      if (city && city !== 'world') { cities.set(city, (cities.get(city) ?? 0) + 1); seen.set(city, t); }
    }
    census = { at: t, cities, rooms };
    for (const [city, at] of seen) if (t - at > LINGER_MS) seen.delete(city);
    return census;
  }
  const peopleIn = (where: string): number => census.rooms.get(where) ?? 0;

  // ---- the roster: which agents stand where -------------------------------------------------------------------------------------------
  function build(city: string, spec: Spec, discount: number): Agent | null {
    const post = venueFor(city, spec.post, spec.role);
    if (!post) return null;
    const market = (spec.market && venueFor(city, spec.market, 'seller')) || post;
    const eatery = spec.eatery ? venueFor(city, spec.eatery, 'guide') : null;
    return {
      id: `${ID_PREFIX}${city}.${spec.key}`, city, spec,
      rooms: { post: venueRoomKey(city, post, ''), market: venueRoomKey(city, market, ''), eatery: eatery ? venueRoomKey(city, eatery, '') : null },
      items: priceList(itemsOf(spec), discount), discount, at: null,
      nextAmbient: 0, nextTonight: 0, nextQuiz: 0, quiz: null, people: new Map(), busy: false,
    };
  }
  function wanted(t: number, s: ReturnType<typeof settings>): { city: string; spec: Spec }[] {
    const out: { city: string; spec: Spec }[] = [];
    if (!s.on) return out;
    const cities = new Set<string>();
    for (const city of AUTHORED_CITIES) if (ctx.cityIds.includes(city)) { cities.add(city); for (const spec of castOf(city).slice(0, s.busy)) out.push({ city, spec }); }
    if (s.quiet > 0) {
      const populated = [...takeCensus(t).cities.keys(), ...seen.keys()];
      for (const city of new Set(populated)) {
        if (cities.has(city) || !ctx.cityIds.includes(city)) continue;
        cities.add(city);
        for (const spec of castOf(city).slice(0, s.quiet)) out.push({ city, spec });
        if (out.length >= MAX_AGENTS) break;
      }
    }
    return out.slice(0, MAX_AGENTS);
  }
  function drop(agent: Agent): void {
    if (agent.at) room()?.absent(agent.id);
    agent.at = null; agent.quiz = null;
    agents.delete(agent.id);
  }
  function reconcile(t: number): ReturnType<typeof settings> {
    const s = settings();
    const list = wanted(t, s), keep = new Set<string>();
    for (const { city, spec } of list) {
      const id = `${ID_PREFIX}${city}.${spec.key}`;
      keep.add(id);
      const found = agents.get(id);
      if (found && found.discount !== s.discount) { found.items = priceList(itemsOf(spec), s.discount); found.discount = s.discount; found.people.clear(); }
      if (!found) { const made = build(city, spec, s.discount); if (made) agents.set(id, made); }
    }
    for (const agent of [...agents.values()]) if (!keep.has(agent.id)) drop(agent);
    return s;
  }

  // ---- saying a line ------------------------------------------------------------------------------------------------------------------
  /** One line into the venue the agent stands in, through the same door as a person's (agentRoom.say) after our own word check. */
  async function speak(agent: Agent, text: string, replyTo?: number): Promise<boolean> {
    const where = agent.at?.room, door = room();
    if (!where || !door) return false;
    let checked = agentWords(text, { toMinor: true });
    // A reply to a person who is this agent's partner (or said it may flirt): romance words get past OUR check only; every other rule is read again without the romance
    // rule, and the room's own check (rooms.ts → ctx.checks.publicRomance) decides, for the people the line is addressed to, whether a romance line is said at all.
    if (!checked.ok && checked.code === 'agent_words_romance' && replyTo !== undefined && agentWords(text, { toMinor: false }).ok) checked = { ok: true };
    if (!checked.ok) { count().blocked += 1; return false; }
    const done = await door.say({ id: agent.id, name: agent.spec.name, mark: { agent: true } }, where, text, null, replyTo);
    if (!done.ok) { if (done.code.startsWith('agent_words_')) count().blocked += 1; return false; }
    count().said += 1;
    return true;
  }

  // ---- the routine: one agent, one beat -------------------------------------------------------------------------------------------------
  const jitter = (agent: Agent, t: number, [least, most]: readonly [number, number]): number => t + least + (say.hash(`${agent.id}|${Math.floor(t / 60000)}`) % (most - least));
  function placeFor(agent: Agent, action: ActionId): string | null {
    const place = ACTIONS[action].place;
    return place === 'post' ? agent.rooms.post : place === 'market' ? agent.rooms.market : place === 'eatery' ? agent.rooms.eatery : null;
  }
  function step(agent: Agent, t: number, saysLeft: { n: number }): void {
    const slot = planAt(agent.spec, t);
    const target = placeFor(agent, slot.action);
    const door = room();
    if (!door) return;
    if (!target) { if (agent.at) { door.absent(agent.id); agent.at = null; agent.quiz = null; } return; }
    const cur = agent.at;
    if (!cur || cur.room !== target || cur.action !== slot.action || cur.until - t < PRESENCE_MS - RENEW_MS) {
      let h = 2166136261;
      for (const char of `${agent.id}|${target}`) { h ^= char.charCodeAt(0); h = Math.imul(h, 16777619); }
      const base = initialVenuePosition(target.split(':')[1] ?? '');
      const position = { x: Math.max(-18, Math.min(18, base.x + ((h >>> 0) % 9 - 4) * 0.9)), z: Math.max(-18, Math.min(18, base.z + (((h >>> 8) >>> 0) % 9 - 4) * 0.9)) };
      door.present({ id: agent.id, name: agent.spec.name, mark: { agent: true }, room: target, position, doing: ACTIONS[slot.action].doing, look: HOUSE_LOOKS[agent.spec.look], until: t + PRESENCE_MS });
      agent.at = { room: target, action: slot.action, until: t + PRESENCE_MS };
      if (cur?.room !== target) agent.quiz = null;
    }
    if (ACTIONS[slot.action].place !== 'post' || saysLeft.n <= 0 || agent.busy || peopleIn(target) === 0) return;
    // Unprompted lines, written and rare. A quiz round, a "tonight" call, or a line about the shop.
    if (slot.action === 'host_quiz') {
      if (agent.quiz && t >= agent.quiz.until) { const finished = agent.quiz.question; agent.quiz = null; agent.nextQuiz = t + QUIZ_EVERY_MS; saysLeft.n -= 1; void speak(agent, say.quizEnd(finished.a)); return; }
      if (!agent.quiz && t >= agent.nextQuiz) { const question = QUIZ[say.hash(`${agent.id}|${Math.floor(t / QUIZ_EVERY_MS)}`) % QUIZ.length]!; agent.quiz = { question, until: t + QUIZ_OPEN_MS }; saysLeft.n -= 1; void speak(agent, say.quizAsk(question.q)); return; }
      if (agent.quiz) return;
    }
    if (slot.action === 'announce' && t >= agent.nextTonight) {
      agent.nextTonight = t + TONIGHT_MS; saysLeft.n -= 1; agent.busy = true;
      void gistLines(agent.city, '', true).then((events) => speak(agent, say.tonight(agent.spec, events, `${agent.id}|${Math.floor(t / TONIGHT_MS)}`))).catch(() => {}).finally(() => { agent.busy = false; });
      return;
    }
    if (t >= agent.nextAmbient) {
      agent.nextAmbient = jitter(agent, t, AMBIENT_MS);
      saysLeft.n -= 1;
      void speak(agent, say.ambient(agent.spec, `${agent.id}|${Math.floor(t / 60000)}`));
    }
  }

  /** One heartbeat. Bounded: at most MAX_PER_BEAT agents looked at, MAX_SAY_PER_BEAT lines said, no model, no store write. */
  let cursor = 0;
  function tick(): void {
    try {
      const t = ctx.now();
      takeCensus(t);
      reconcile(t);
      const list = [...agents.values()];
      const says = { n: MAX_SAY_PER_BEAT };
      let stepped = 0;
      for (let n = 0; n < Math.min(MAX_PER_BEAT, list.length); n++) { step(list[(cursor + n) % list.length]!, t, says); stepped += 1; }
      cursor = list.length ? (cursor + MAX_PER_BEAT) % list.length : 0;
      last.stepped = stepped; last.said = MAX_SAY_PER_BEAT - says.n;
      // Conversations that went quiet are summarised, a few per beat.
      let started = 0;
      for (const [key, convo] of convos) { if (started >= MAX_SUMMARIES_PER_BEAT) break; if (!convo.busy && t - convo.at >= CONVO_IDLE_MS) { started += 1; void finish(key).catch(() => {}); } }
      const lagos = memory.lagosDayOf(t);
      if (sweptDay !== lagos) {
        sweptDay = lagos;
        void Promise.resolve().then(async () => {
          const hasPeople = await ctx.store.read((db) => Object.keys(memory.peekMemory(db)?.people ?? {}).length > 0);
          if (hasPeople) await ctx.store.transact((db) => memory.sweep(db, t), { durable: false });
        }).catch(() => {});
      }
    } catch { /* a bad beat must never stop the host's heartbeat */ }
  }

  // ---- the gist (the check_gist tool's source) -------------------------------------------------------------------------------------
  async function gistLines(city: string, query: string, tonight = false): Promise<string[]> {
    try {
      const gist = gistService(ctx);
      const items = await ctx.store.read((db) => (query ? gist.search(db, city, query, 3) : gist.recent(db, city, { limit: tonight ? 12 : 5 })));
      const rows = tonight ? items.filter((item) => item.kind === 'event' || item.kind === 'busy' || item.kind === 'notice') : items;
      return rows.slice(0, 3).map((item) => item.text.replace(/[.!?]+$/, ''));
    } catch { return []; }
  }

  // ---- memory and closeness (memory.ts) -----------------------------------------------------------------------------------------------
  const adultOf = (db: Db, id: string): boolean => ctx.checks?.adult?.(db, id) === true;
  const personKey = (id: string): string => `p_${sha256Hex(`allworld-house-v1|${id}`).slice(0, 32)}`;
  /** Add closeness for a line and read what the agent knows of this person: one small lazy write; null when memory is off or the store cannot. */
  async function bondTouch(agent: Agent, personId: string, points: number, t: number): Promise<memory.View | null> {
    try {
      if (points > 0) return await ctx.store.transact((db) => memory.touch(ctx, db, personId, agent.id, points, t, adultOf(db, personId)), { durable: false });
      return await ctx.store.read((db) => memory.read(db, personId, agent.id, t, adultOf(db, personId)));
    } catch { return null; }
  }
  function noteLine(agent: Agent, from: { id: string; name: string }, body: string, t: number): { key: string; convo: Convo } {
    const key = `${agent.id}|${from.id}`;
    let convo = convos.get(key);
    if (!convo) {
      if (convos.size >= CONVOS_KEPT) { const oldest = convos.keys().next(); if (!oldest.done) convos.delete(oldest.value); }
      convo = { agent: agent.id, person: from.id, name: from.name, lines: [], at: t, busy: false };
      convos.set(key, convo);
    }
    convo.lines.push(body.replace(/\s+/g, ' ').trim().slice(0, 160));
    if (convo.lines.length > CONVO_LINES) convo.lines.shift();
    convo.at = t;
    return { key, convo };
  }
  /** A conversation is over: turn its lines into at most three clean facts (a model when there is budget, rules always as the fallback), store them, throw the lines away. */
  async function finish(key: string): Promise<void> {
    const convo = convos.get(key);
    if (!convo || convo.busy) return;
    convo.busy = true; convos.delete(key);
    const s = settings(), t = ctx.now();
    if (!s.memory || !convo.lines.length) return;
    let facts: string[] = [];
    let viaModel = false;
    if (s.model && s.memoryModel && convo.lines.length >= 2) {
      if (summaryDay !== day()) { summaryDay = day(); summaryCalls = 0; }
      if (summaryCalls < s.memoryCalls) {
        summaryCalls += 1;
        try {
          const answer = await ask({ purpose: 'agent-talk', messages: memory.summaryPrompt(convo.lines), maxTokens: 100, playerId: personKey(convo.person), carriesPlayerWords: true, timeoutMs: 6000 });
          if (answer.ok) { facts = memory.parseFacts(answer.text); viaModel = true; }
        } catch { /* rules below */ }
      } else count().summarySkipped += 1;
    }
    for (const fact of memory.extractFacts(convo.lines)) if (facts.length < 3 && !facts.some((have) => have.toLowerCase() === fact.toLowerCase())) facts.push(fact);
    if (viaModel) count().summaryModel += 1; else count().summaryRules += 1;
    if (!facts.length) return;
    try { count().facts += await ctx.store.transact((db) => memory.remember(ctx, db, convo.person, convo.agent, facts, t), { durable: false }); } catch { /* nothing is remembered; nothing is lost */ }
  }
  /** A task from this agent was completed by this person: closeness rises. The desk calls it when a step finishes a task. */
  const missionDone = async (personId: string, agentId: string): Promise<void> => { if (!settings().memory) return; const t = ctx.now(); await ctx.store.transact((db) => { memory.missionDone(ctx, db, personId, agentId, t, adultOf(db, personId)); }, { durable: false }); };
  const openMissions = async (agent: Agent, personId: string): Promise<string[]> => {
    try {
      const given = deps.missions ? await deps.missions(personId, { id: agent.id, role: agent.spec.role, city: agent.city }) : await desk.phrases?.(personId, { id: agent.id, city: agent.city });
      return (given ?? []).map((item) => String(item).replace(/\s+/g, ' ').trim().slice(0, 80)).filter((item) => item.length > 2 && agentWords(item, { toMinor: true }).ok).slice(0, 3);
    } catch { return []; }
  };

  // ---- wake on event: a person writes in the venue -------------------------------------------------------------------------------------
  const FIRST_WORDS = new Set(['mama', 'aunty', 'auntie', 'bro', 'baba', 'sis', 'oga', 'madam', 'mr', 'mrs']);
  const callNames = (agent: Agent): string[] => agent.spec.name.toLowerCase().split(/\s+/).filter((word) => word.length >= 3 && !FIRST_WORDS.has(word));
  const ROLE_FOR: Partial<Record<Intent, Spec['role']>> = { offer: 'seller', prices: 'seller', pressure: 'seller', hours: 'seller', directions: 'guide', tonight: 'marketer', mission: 'mission' };

  function chooseAgent(there: Agent[], body: string, intent: Intent, dealer: Agent | null = null): Agent | null {
    if (!there.length) return null;
    const said = new Set(body.toLowerCase().replace(/[^a-z0-9\s]/g, ' ').split(/\s+/));
    const named = there.find((agent) => callNames(agent).some((name) => said.has(name)));
    if (named) return named;
    const quiz = there.find((agent) => agent.quiz);
    if (quiz) return quiz;
    if (dealer && takesIt(body)) return dealer;
    const role = ROLE_FOR[intent];
    const byRole = role ? there.find((agent) => agent.spec.role === role) ?? (intent === 'mission' ? there.find((agent) => agent.spec.role === 'seller') : undefined) : undefined;
    if (byRole) return byRole;
    if (intent === 'greet') return there[0]!;
    return there.length === 1 ? there[0]! : null;
  }

  function personOf(agent: Agent, id: string): Person {
    let found = agent.people.get(id);
    if (!found) {
      found = { item: null, talks: new Map() };
      agent.people.set(id, found);
      if (agent.people.size > PEOPLE_KEPT) { const oldest = agent.people.keys().next(); if (!oldest.done) agent.people.delete(oldest.value); }
    }
    return found;
  }

  /** The agent as the desk needs it: where it stands, when, and how it talks. */
  function refOf(agent: Agent): AgentRef {
    const venue = agent.rooms.post.split(':')[1] ?? '';
    const place = cachedCityContent(agent.city)?.venues.find((entry) => entry.id === venue)?.name ?? venue;
    const { spec } = agent;
    return { id: agent.id, key: spec.key, name: spec.name, role: spec.role, voice: spec.voice, card: spec.card, city: agent.city, venue, place, hours: `${formatHour(spec.hours.open)} to ${formatHour(spec.hours.close)}` };
  }
  /** The other agents standing in this agent's city now: whom a task may send a person to. */
  const peersOf = (agent: Agent): AgentRef[] => [...agents.values()].filter((other) => other.city === agent.city && other.id !== agent.id && other.at !== null).map(refOf);
  /** The agreed price this person still holds with this agent (haggle.ts), or null: the quote is kept for HAGGLE.quoteMs. */
  function heldQuote(agent: Agent, personId: string, t: number): { item: PricedItem; talk: Talk & { at: number } } | null {
    const person = agent.people.get(personId);
    if (!person) return null;
    const ids = person.item ? [person.item, ...person.talks.keys()] : [...person.talks.keys()];
    for (const id of ids) {
      const talk = person.talks.get(id), item = agent.items.find((entry) => entry.id === id);
      if (talk && item && talk.deal !== null && t - talk.at <= HAGGLE.quoteMs) return { item, talk };
    }
    return null;
  }

  interface Plan { intent: Intent; written: string; verdict: { item: PricedItem; verdict: Verdict } | null; prices: number[]; useModel: boolean; claimsQuery: string | null }

  /** What a line means and the written answer to it. The haggle (price and verdict) is settled HERE, before any model is asked. */
  function plan(agent: Agent, from: { id: string; name: string }, body: string, t: number): Plan {
    const { spec } = agent;
    const seed = `${agent.id}|${from.id}|${Math.floor(t / 60000)}|${body.length}`;
    const item = matchItem(body, agent.items);
    const offer = spec.role === 'seller' ? readOffer(body, (item ?? agent.items[0])?.list ?? 0, item !== null) : null;
    const intent = intentOf(body, spec.role, offer !== null && agent.items.length > 0);
    const open = isOpen(spec.hours, t);
    const base: Plan = { intent, written: say.fallback(spec, seed), verdict: null, prices: agent.items.map((entry) => entry.list), useModel: false, claimsQuery: null };
    if (intent === 'greet') return { ...base, written: say.greet(spec, from.name, seed) };
    if (intent === 'bye') return { ...base, written: say.bye(spec, seed) };
    if (intent === 'mission') return { ...base, written: say.taskNone(spec, seed) };
    if (intent === 'hours') return { ...base, written: say.hoursLine(spec, open) };
    if (spec.role !== 'seller' && (intent === 'prices' || intent === 'offer' || intent === 'pressure')) return { ...base, written: say.notSeller(spec, seed) };
    if (spec.role === 'seller' && (intent === 'prices' || intent === 'offer' || intent === 'pressure')) {
      if (!open) return { ...base, written: say.hoursLine(spec, false) };
      const person = personOf(agent, from.id);
      const chosen = item ?? agent.items.find((entry) => entry.id === person.item) ?? (agent.items.length === 1 ? agent.items[0]! : null);
      if (intent === 'prices') return { ...base, written: chosen ? say.priceLine(spec, chosen.label, chosen.list) : say.pricesLine(spec, agent.items) };
      if (!chosen) return { ...base, written: say.which(spec, agent.items.map((entry) => entry.label), seed) };
      person.item = chosen.id;
      const talk = freshOrHeld(person, chosen, t);
      if (intent === 'pressure' || offer === null) return { ...base, written: say.pressure(spec, seed) };
      const verdict = decide(chosen, talk, readOffer(body, chosen.list, true) ?? offer);
      if (verdict.kind === 'accept') talk.at = t;
      if (verdict.kind === 'refuse') count().refusedLow += 1;
      return { ...base, written: say.verdictLine(spec, chosen.label, verdict, seed), verdict: { item: chosen, verdict }, prices: [chosen.list, verdict.price], useModel: true };
    }
    if (intent === 'directions') return { ...base, written: '', useModel: true, claimsQuery: null };
    if (intent === 'tonight') return { ...base, written: '', useModel: true, claimsQuery: '' };
    return { ...base, useModel: true, claimsQuery: body.slice(0, 80) };
  }

  function freshOrHeld(person: Person, item: PricedItem, t: number): Talk & { at: number } {
    const held = person.talks.get(item.id);
    if (held && (held.deal === null || t - held.at <= HAGGLE.quoteMs)) return held;
    const next = { ...freshTalk(item), at: t };
    // A person whose quote ran out starts again, but a person who used up the rounds does not get fresh ones by waiting for nothing.
    if (held && held.deal === null) next.rounds = held.rounds;
    person.talks.set(item.id, next);
    return next;
  }

  /** The venue facts a guide may give, from the city's own content: names, districts and whether each is open. */
  function places(city: string, t: number): { id: string; name: string; district: string; status: string }[] {
    const venues = cachedCityContent(city)?.venues ?? [];
    return venues.filter((venue) => venue.id !== 'home' && venue.id !== 'neighbourhood').slice(0, 40).map((venue) => ({ id: venue.id, name: venue.name, district: venue.district, status: openingInfo(venue.hours, t).status }));
  }

  async function reply(agent: Agent, from: { id: string; name: string }, body: string, replySeq?: number): Promise<void> {
    const t = ctx.now();
    const { spec } = agent;
    const s = settings();
    count().wakes += 1;
    // A running quiz takes the line first: the first right answer wins the round.
    if (agent.quiz && t < agent.quiz.until && isRight(agent.quiz.question, body)) {
      const won = agent.quiz.question; agent.quiz = null; agent.nextQuiz = t + QUIZ_EVERY_MS;
      await speak(agent, say.quizWin(from.name.slice(0, 24), won.a));
      return;
    }
    // While a round is running, chat that is not an answer is left alone (unless it names the host), so the host does not talk over the quiz.
    if (agent.quiz && t < agent.quiz.until && intentOf(body, spec.role, false) === 'other' && !callNames(agent).some((name) => body.toLowerCase().includes(name))) return;
    // Tasks and the hand-over are rules, not talk: they come before any answer, and when one happens its line is the whole answer.
    const quote = heldQuote(agent, from.id, t), taking = quote !== null && takesIt(body);
    const where = agent.at?.room ?? '';
    const humans = (ctx.checks?.groupPeers?.(from.id, where) ?? []).filter((id) => !id.startsWith(ID_PREFIX));
    const noticed = await desk.notice({ agent: refOf(agent), spec, who: from, peers: humans, handWords: handsOver(body) && !taking, onDone: (giverId) => missionDone(from.id, giverId) });
    if (noticed) { await speak(agent, noticed); return; }
    if (taking && quote) {
      const price = Math.max(quote.item.floor, quote.talk.deal!), seed = `${agent.id}|${from.id}|${t}`;
      const done = await desk.sell({ agent: refOf(agent), who: from, item: { id: quote.item.id, label: quote.item.label, list: quote.item.list }, price, quoteAt: quote.talk.at });
      if (done.ok) agent.people.get(from.id)?.talks.delete(quote.item.id);
      await speak(agent, say.sale(spec, done.ok ? { ok: true, label: quote.item.label, price } : { ok: false, code: done.code, label: quote.item.label, price }, seed));
      return;
    }
    if (intentOf(body, spec.role, false) === 'mission') {
      const given = await desk.offer({ giver: refOf(agent), spec, peers: peersOf(agent), who: from });
      await speak(agent, given.say);
      return;
    }
    const worked = plan(agent, from, body, t);
    // What this agent remembers of this person, and closeness from the line (friendly talk raises it). Remembering off: nothing is kept of the lines.
    const mem = s.memory ? await bondTouch(agent, from.id, memory.gainFor(body, worked.intent), t) : null;
    if (mem?.remembering) { const noted = noteLine(agent, from, body, t); if (worked.intent === 'bye' || noted.convo.lines.length >= CONVO_LINES) void finish(noted.key).catch(() => {}); }
    if (mem && !worked.useModel && worked.intent === 'greet' && (mem.facts.length > 0 || mem.partner)) worked.useModel = true;
    const missions = s.model && worked.useModel ? await openMissions(agent, from.id) : [];
    const cityName = cityRules(agent.city)?.name ?? agent.city;
    const around = places(agent.city, t);
    const seed = `${agent.id}|${from.id}|${t}`;
    // The public gist first (the check_gist tool's source): what the agent may say happened, and tonight's events.
    const claims = worked.claimsQuery === null ? [] : await gistLines(agent.city, worked.claimsQuery, worked.claimsQuery === '');
    let text = worked.written;
    if (!text && worked.intent === 'directions') { const venue = matchVenue(body, around); text = say.directionsLine(spec, venue, around.slice(0, 4).map((place) => place.name)); }
    if (!text && worked.intent === 'tonight') text = say.tonight(spec, claims, seed);
    let viaModel = false;
    if (worked.useModel && s.model) {
      const hoursWords = `${formatHour(spec.hours.open)} to ${formatHour(spec.hours.close)}`;
      const messages = promptFor({ spec, cityName, list: agent.items, verdict: worked.verdict, gist: claims, hours: hoursWords, intent: worked.intent,
        places: worked.intent === 'directions' ? around.slice(0, 12).map((place) => `${place.name} in ${place.district} (${place.status})`) : [],
        ...(mem && mem.facts.length ? { remembered: mem.facts } : {}), ...(mem && (mem.standing.points > 0 || mem.partner) ? { closeness: mem.standing.label } : {}), ...(mem?.partner ? { partner: true } : {}), ...(mem?.flirt ? { flirt: true } : {}), ...(missions.length ? { missions } : {}) }, from.name.slice(0, 24), body);
      try {
        const answer = await ask({ purpose: 'agent-talk', messages, maxTokens: MODEL_TOKENS, playerId: `p_${sha256Hex(`allworld-house-v1|${from.id}`).slice(0, 32)}`, carriesPlayerWords: true, timeoutMs: 8000 });
        if (answer.ok) {
          const allowed = allowedNumbers(worked.prices, spec);
          for (const place of around) for (const digits of place.status.match(/\d+/g) ?? []) allowed.add(digits);
          for (const line of claims) for (const digits of line.match(/\d+/g) ?? []) allowed.add(digits);
          const clean = cleanReply(answer.text, { allowed, verdict: worked.verdict?.verdict.kind ?? null, role: spec.role });
          if (clean !== null && agentWords(clean, { toMinor: mem?.flirt !== true }).ok) { text = clean; viaModel = true; }
        }
      } catch { /* the written line stands */ }
    }
    if (!text) text = say.fallback(spec, seed);
    const toThem = mem?.flirt === true ? replySeq : undefined;
    const spoken = await speak(agent, text, toThem);
    if (spoken) { if (viaModel) count().model += 1; else count().written += 1; }
    else if (viaModel) { const safe = worked.written || say.fallback(spec, seed); if (await speak(agent, safe)) count().written += 1; }
  }

  /**
   * A line said to this agent ON A CALL OR IN A PRIVATE CHAT (call-routes.ts, agents/contact.ts): the same brain as a line in the venue, answered as text to the caller instead of into the room (the agent need not be
   * standing anywhere). Rules first, then a paid model for what a written line cannot give, then the same safety as a venue reply: cleanReply and agentWords (always as to a person
   * who may be a minor: no flirting on a call). Haggling and tasks stay in the venue: on the phone an offer is answered with the list price and an invitation to the shop. Null for an id
   * that is not a house agent. The model phrases anything but prices, offers and tasks, in a texting voice, with the chat's or the call's last
   * lines (`history`, `me` true = said by the agent); the written line is said when there is no model, budget or clean reply.
   */
  async function answerCall(agentId: string, from: { id: string; name: string }, body: string, history: readonly { me: boolean; text: string }[] = []): Promise<{ text: string; viaModel: boolean; name: string; city: string } | null> {
    const info = agentInfo(agentId), spec = info ? castOf(info.city).find((entry) => `${ID_PREFIX}${info.city}.${entry.key}` === agentId) : undefined;
    if (!info || !spec) return null;
    const agent = agents.get(agentId) ?? build(info.city, spec, settings().discount);
    if (!agent) return null;
    const t = ctx.now(), s = settings(), seed = `${agentId}|${from.id}|${t}`;
    const said = body.slice(0, 200);
    const intent = intentOf(said, spec.role, false);
    count().wakes += 1;
    let written = say.fallback(spec, seed), useModel = true, claimsQuery: string | null = null;
    const item = matchItem(said, agent.items);
    if (intent === 'greet') written = say.greet(spec, from.name.slice(0, 24), seed);
    else if (intent === 'bye') written = say.bye(spec, seed);
    else if (intent === 'mission') written = say.taskNone(spec, seed);
    else if (intent === 'hours') written = say.hoursLine(spec, isOpen(spec.hours, t));
    else if (intent === 'prices' || intent === 'offer' || intent === 'pressure') {
      written = spec.role !== 'seller' ? say.notSeller(spec, seed) : item ? say.priceLine(spec, item.label, item.list) : say.pricesLine(spec, agent.items);
      useModel = false;
    } else if (intent === 'directions') written = '';
    else if (intent === 'tonight') { written = ''; claimsQuery = ''; }
    else claimsQuery = said.slice(0, 80);
    // A task is given in person, so its line stays written; greetings, goodbyes and hours are the model's to phrase, like any chat.
    if (intent === 'mission') useModel = false;
    const mem = s.memory ? await bondTouch(agent, from.id, memory.gainFor(said, intent), t) : null;
    const cityName = cityRules(agent.city)?.name ?? agent.city;
    const around = places(agent.city, t);
    const claims = claimsQuery === null ? [] : await gistLines(agent.city, claimsQuery, claimsQuery === '');
    let text = written;
    if (!text && intent === 'directions') text = say.directionsLine(spec, matchVenue(said, around), around.slice(0, 4).map((place) => place.name));
    if (!text && intent === 'tonight') text = say.tonight(spec, claims, seed);
    let viaModel = false;
    if (useModel && s.model) {
      const hoursWords = `${formatHour(spec.hours.open)} to ${formatHour(spec.hours.close)}`;
      const messages = promptFor({ spec, cityName, list: agent.items, verdict: null, gist: claims, hours: hoursWords, intent,
        places: intent === 'directions' ? around.slice(0, 12).map((place) => `${place.name} in ${place.district} (${place.status})`) : [],
        ...(mem && mem.facts.length ? { remembered: mem.facts } : {}), ...(mem && (mem.standing.points > 0 || mem.partner) ? { closeness: mem.standing.label } : {}), ...(mem?.partner ? { partner: true } : {}),
        direct: { history } }, from.name.slice(0, 24), said);
      try {
        const answer = await ask({ purpose: 'agent-talk', messages, maxTokens: MODEL_TOKENS, playerId: personKey(from.id), carriesPlayerWords: true, timeoutMs: 8000 });
        if (answer.ok) {
          const allowed = allowedNumbers(agent.items.map((entry) => entry.list), spec);
          for (const place of around) for (const digits of place.status.match(/\d+/g) ?? []) allowed.add(digits);
          for (const line of claims) for (const digits of line.match(/\d+/g) ?? []) allowed.add(digits);
          const clean = cleanReply(answer.text, { allowed, verdict: null, role: spec.role });
          if (clean !== null && agentWords(clean, { toMinor: true }).ok) { text = clean; viaModel = true; }
        }
      } catch { /* the written line stands */ }
    }
    if (!text) text = written || say.fallback(spec, seed);
    if (!agentWords(text, { toMinor: true }).ok) { count().blocked += 1; text = say.fallback(spec, seed); }
    if (viaModel) count().model += 1; else count().written += 1;
    return { text, viaModel, name: spec.name, city: info.city };
  }

  function onLine(event: { room: string; group: string | null; from: { id: string; name: string; agent?: boolean }; body: string; seq?: number }): void {
    try {
      if (!agents.size || event.from.agent === true || event.from.id.startsWith(ID_PREFIX)) return;
      const door = room();
      if (!door) return;
      const here = new Set(door.members(event.room).filter((member) => (member.group ?? null) === event.group).map((member) => member.id));
      const there = [...agents.values()].filter((agent) => agent.at?.room === event.room && here.has(agent.id));
      if (!there.length) return;
      const body = event.body.slice(0, 300);
      const items = there.find((entry) => entry.spec.role === 'seller')?.items ?? [];
      const dealer = there.find((entry) => heldQuote(entry, event.from.id, ctx.now()) !== null) ?? null;
      const agent = chooseAgent(there, body, intentOf(body, 'seller', items.length > 0 && readOffer(body, items[0]!.list, matchItem(body, items) !== null) !== null), dealer);
      if (!agent || agent.busy) return;
      // Nothing wakes without room: a person may wake one agent a few times a minute, and the whole cast has a ceiling.
      if (!ctx.allow(`house:wake:${agent.id}:${event.from.id}`, 8, 60000) || !ctx.allow('house:wake:all', 120, 60000)) return;
      agent.busy = true;
      void reply(agent, event.from, body, event.seq).catch(() => {}).finally(() => { agent.busy = false; });
    } catch { /* a bad line must never reach the room */ }
  }

  ctx.on?.('heartbeat', tick);
  ctx.on?.('venue-line', onLine);

  return {
    tick,
    /** For tests and the admin page. */
    agents: (): { id: string; name: string; role: Spec['role']; city: string; room: string | null; action: ActionId | null }[] => [...agents.values()].map((agent) => ({ id: agent.id, name: agent.spec.name, role: agent.spec.role, city: agent.city, room: agent.at?.room ?? null, action: agent.at?.action ?? null })),
    counters: (): Counters => ({ ...count() }),
    lastBeat: () => ({ ...last }),
    priceList: (id: string): PricedItem[] => agents.get(id)?.items ?? [],
    settings,
    desk,
    /** A mission from this agent was completed by this person: closeness rises (Phase 11 calls this). */
    missionDone,
    /** Finish every conversation now (a test, or a shutdown). */
    flush: async (): Promise<void> => { await Promise.all([...convos.keys()].map((key) => finish(key))); },
    conversations: (): number => convos.size,
    /** Is this the id of an agent of the cast? (the routes of memory-routes.ts ask) */
    knows: (id: string): boolean => agentInfo(id) !== null,
    /** A line said to an agent on a call: its answer as text (call-routes.ts). */
    answerCall,
    /** Test hook: the same call the 'venue-line' event makes. */
    line: onLine,
    present: (): number => [...agents.values()].filter((agent) => agent.at !== null).length,
  };
}
export type House = ReturnType<typeof houseOf>;

/** Who `house.<city>.<key>` is, from the cast (not from who is standing now), or null. */
export function agentInfo(id: string): { id: string; name: string; role: Spec['role']; city: string } | null {
  const parts = id.split('.');
  if (parts.length !== 3 || parts[0] !== 'house') return null;
  const spec = castOf(parts[1]!).find((entry) => entry.key === parts[2]);
  return spec ? { id, name: spec.name, role: spec.role, city: parts[1]! } : null;
}

const houses = new WeakMap<object, House>();
/** The one runner of a host. Built on first use; the heartbeat and the venue lines drive it from then on. */
export function houseService(ctx: RouteContext): House {
  let found = houses.get(ctx);
  if (!found) houses.set(ctx, found = houseOf(ctx));
  return found;
}

/** Settings and dashboard numbers, and the runner itself. Called once per host with the other admin links (server/admin/links.ts). */
export function linkHouse(ctx: RouteContext): void {
  registerAdminSetting(ctx, { key: 'houseAgentsOn', label: 'House agents: on', help: 'The game\'s own AI-played cast (a seller, a guide, a marketer, a quiz host). Off removes them from every venue at once.', kind: 'boolean', default: () => DEFAULTS.on });
  registerAdminSetting(ctx, { key: 'houseAgentsBusy', label: 'House agents in each busy city', help: 'Lagos has its own cast of six, best first: seller, guide, marketer, food seller, quiz host, mission giver. 0 to 6.', kind: 'number', min: 0, max: 6, default: () => DEFAULTS.busy });
  registerAdminSetting(ctx, { key: 'houseAgentsQuiet', label: 'House agents in each other city', help: 'A seller and a guide stand in any other open city while a person is in it (and for ten minutes after). 0 to 2; 0 is off.', kind: 'number', min: 0, max: 2, default: () => DEFAULTS.quiet });
  registerAdminSetting(ctx, { key: 'houseMaxDiscountPct', label: 'House sellers: most they give away (%)', help: 'Their lowest price is the list price less this share, rounded up; never more than 30. Enforced in code, not by any model.', kind: 'number', min: 0, max: HAGGLE.discountCap, default: () => DEFAULTS.discount });
  registerAdminSetting(ctx, { key: 'houseTalkModel', label: 'House agents: use a model to talk', help: 'On: when a person writes to one, a paid model may phrase the answer (within the model budget). Off: written lines only.', kind: 'boolean', default: () => DEFAULTS.model });
  registerAdminSetting(ctx, { key: 'houseMemoryOn', label: 'House agents: remember people', help: 'On: an agent remembers up to five short facts about each person it talks to and how close they are; people can see, delete or switch it off (docs/AGENT-MEMORY.md). Off: nothing is remembered or recorded from now on.', kind: 'boolean', default: () => DEFAULTS.memory });
  registerAdminSetting(ctx, { key: 'houseMemoryModel', label: 'House agents: summarise with a model', help: 'On: when a conversation ends, one small paid request writes the facts (within the model budget). Off, or no budget: plain rules write them.', kind: 'boolean', default: () => DEFAULTS.memoryModel });
  registerAdminSetting(ctx, { key: 'houseMemoryCalls', label: 'House agents: summaries a day', help: 'The most summarising requests in a UTC day, apart from the model budget. 0 to 5000.', kind: 'number', min: 0, max: 5000, default: () => DEFAULTS.memoryCalls });
  const house = houseService(ctx);
  const stat = (id: string, label: string, read: () => number | string): void => registerAdminStat(ctx, { id: `house-${id}`, group: 'House agents', label, cost: 'memory', read });
  stat('present', 'Standing in a venue now', () => house.present());
  stat('wakes', 'Lines answered today', () => house.counters().wakes);
  stat('model', 'Answered with a model today', () => house.counters().model);
  stat('written', 'Answered from written lines today', () => house.counters().written);
  stat('low', 'Offers refused below the floor today', () => house.counters().refusedLow);
  stat('facts', 'Facts remembered today', () => house.counters().facts);
  stat('sum-model', 'Conversations summarised by a model today', () => house.counters().summaryModel);
  stat('sum-rules', 'Conversations summarised by rules today', () => house.counters().summaryRules);
  stat('sum-skipped', 'Summaries left to rules (daily limit) today', () => house.counters().summarySkipped);
  stat('blocked', 'Lines held back by the word rules today', () => house.counters().blocked);
  const task = (id: string, label: string, read: () => number): void => stat(`task-${id}`, label, read);
  task('given', 'Tasks given in person today', () => house.desk.counters().given);
  task('model', 'Task briefs phrased by a model today', () => house.desk.counters().model);
  task('cached', 'Task briefs from the phrasing cache today', () => house.desk.counters().cached);
  task('written', 'Task briefs from the written brief today', () => house.desk.counters().written);
  task('done', 'Greetings, hand-overs and friends brought today', () => { const c = house.desk.counters(); return c.greeted + c.handed + c.brought; });
  task('sold', 'Held quotes paid and handed over today', () => house.desk.counters().sold);
}
