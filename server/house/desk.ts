/**
 * OWNER: agents (house agents, docs/AGENT-MISSIONS.md)
 * THE DESK: what happens between a house agent and one person's life, on the server. The runner (runner.ts) hears a person speak in a venue and asks the desk;
 * the desk reads the life, decides by the rules in errands.ts and, when something real happened, runs the server-only action 'missions.server' on the life in
 * one stored transaction (src/game/systems/agent-missions.ts). Portable: no Node imports; the Node host and the Worker run it.
 *
 *   offer(...)   the mission giver (or a seller) gives a task in person. Chosen and filled from templates for this life; the model only rephrases the brief, once
 *                per template and agent (kept in memory and in the store, so a restart does not ask again); with no model, no budget or an unsafe answer the written
 *                brief is used. Every word passes agentWords for a minor. The reward and the numbers are the template's: the model never sees them.
 *   notice(...)  a person spoke to an agent: counts a "talk to an agent" task, a friend brought to the giver, and (when the words say so) a hand-over of items.
 *                Reads first and writes only when a task of this life really asks for it.
 *   sell(...)    the hand-over that completes a held quote (haggle.ts): pays exactly the price held and hands over the item, checked by the life's rules.
 *
 * MONEY. A house agent has no wallet and no owner. What a person pays for an item leaves the game's money exactly as groceries and the boutique do (a debit
 * with no one to receive it); a reward is a credit under the daily or weekly mission figure. Nothing here moves money between players.
 * Nothing in this file throws to its caller: a failure is a plain "no" and the agent says its written line.
 */
import { BUSINESS_PRODUCTS } from '../../src/game/content/business.ts';
import { INGREDIENTS } from '../../src/game/content/food.ts';
import { cityRules } from '../../src/game/cities/index.ts';
import { lagosTime } from '../../src/game/clock.ts';
import { agentWords } from '../moderation/agent-words.ts';
import { routerOf } from '../models/service.ts';
import type { AskInput, AskResult } from '../models/router.ts';
import type { Db, RouteContext } from '../types.ts';
import { TEMPLATES, briefPrompt, cleanBrief, offerFor, profileOf, sayBrief, tokensOf, writtenBrief } from './errands.ts';
import type { AgentRef, Offer, Template } from './errands.ts';
import * as say from './lines.ts';
import type { Spec } from './cast.ts';
import type { CityId } from '../../src/types/protocol.ts';

export interface DeskDeps {
  /** The model door; the router's by default. Tests pass one that sits on a fake fetch. */
  ask?: (input: AskInput) => Promise<AskResult>
}
export interface Who { id: string; name: string }
export interface DeskCounters { given: number; refused: number; greeted: number; handed: number; brought: number; sold: number; model: number; cached: number; written: number; blocked: number }
const blank = (): DeskCounters => ({ given: 0, refused: 0, greeted: 0, handed: 0, brought: 0, sold: 0, model: 0, cached: 0, written: 0, blocked: 0 });
/** Phrasings kept in memory, and how long a failed model request waits before the same template and agent ask again. */
const MEMORY = 300, RETRY_MS = 10 * 60000, BRIEFS = 'houseBriefs';
const BRIEF_STORE_MAX = 400;

export function deskOf(ctx: RouteContext, deps: DeskDeps = {}) {
  const memory = new Map<string, string>(), lastTry = new Map<string, number>();
  let counters = blank(), counterDay = -1;
  const count = (): DeskCounters => { const day = Math.floor(ctx.now() / 86400000); if (day !== counterDay) { counterDay = day; counters = blank(); } return counters; };
  const ask = deps.ask ?? ((input: AskInput): Promise<AskResult> => routerOf(ctx).ask(input));
  const modelOn = (): boolean => ctx.checks?.setting?.('houseTalkModel') !== false;

  /** The stored life of a person in a city, as read (not settled), or null. */
  function lifeOf(db: Db, who: Who, city: string) {
    const session = ctx.core?.sessionByPublicId?.(db, who.id);
    if (!session || !(session.expiresAt > ctx.now()) || session.agent) return null;
    const state = session.cities?.[city]?.state;
    return state && state.onboarding?.required !== true ? { session, state } : null;
  }
  /** Run one server-only step on a settled life inside a transaction. */
  function step(db: Db, who: Who, city: string, payload: Record<string, unknown>, guard: string) {
    const found = lifeOf(db, who, city);
    if (!found) return { ok: false as const, code: 'no_life' };
    const life = ctx.settle(found.session, city as CityId);
    const done = ctx.act(life, { type: 'missions.server', cityId: city as CityId, payload, stateGuard: guard });
    return { ok: done.ok, code: done.code };
  }
  const guarded = async <T>(fallback: T, run: () => Promise<T>): Promise<T> => { try { return await run(); } catch { return fallback; } };

  // ---- the phrasing, cached per template and agent -------------------------------------------------------------------------------------
  async function phrase(template: Template, giver: AgentRef, stored: string | undefined): Promise<{ text: string | null; fresh: boolean }> {
    const key = `${template.id}|${giver.key}|${giver.voice}`;
    const known = memory.get(key) ?? stored;
    if (known !== undefined && tokensOf(known).sort().join() === tokensOf(writtenBrief(template, giver.voice)).sort().join()) { memory.set(key, known); count().cached += 1; return { text: known, fresh: false }; }
    if (!modelOn()) return { text: null, fresh: false };
    const now = ctx.now();
    if (now - (lastTry.get(key) ?? -Infinity) < RETRY_MS) return { text: null, fresh: false };
    lastTry.set(key, now);
    try {
      const answer = await ask({ purpose: 'agent-talk', messages: briefPrompt(template, giver), maxTokens: 120, carriesPlayerWords: false, timeoutMs: 8000 });
      const clean = answer.ok ? cleanBrief(answer.text, template, giver.voice) : null;
      // The tokens are checked with a plain stand-in word: what the model wrote must pass the AI word rules for a minor as it stands.
      if (clean !== null && agentWords(clean.replace(/\{\w+\}/g, 'Ada'), { toMinor: true }).ok) {
        if (memory.size >= MEMORY) memory.clear();
        memory.set(key, clean); count().model += 1;
        return { text: clean, fresh: true };
      }
    } catch { /* the written brief stands */ }
    return { text: null, fresh: false };
  }

  // ---- giving a task in person ---------------------------------------------------------------------------------------------------------
  /** `peers` are the other house agents standing in the city now. Resolves what the agent says; `given` is true when a task was added to the person's life. */
  function offer(input: { giver: AgentRef; spec: Spec; peers: readonly AgentRef[]; who: Who }): Promise<{ say: string; given: boolean }> {
    const { giver, spec, peers, who } = input, seed = `${giver.id}|${who.id}|${ctx.now()}`;
    return guarded({ say: say.taskNone(spec, seed), given: false }, async () => {
      if (!ctx.allow(`house:task:${who.id}`, 6, 60000)) return { say: say.taskNone(spec, seed), given: false };
      const seen = await ctx.store.read((db) => {
        const found = lifeOf(db, who, giver.city);
        if (!found) return null;
        const now = ctx.now(), day = lagosTime(now).day, held = found.state.missions.agent ?? [];
        const stored = (db as unknown as Record<string, Record<string, { text?: unknown }> | undefined>)[BRIEFS] ?? {};
        return { profile: profileOf(found.state, now, cityRules(giver.city)?.name ?? giver.city), today: held.filter((e) => e.by.id === giver.id && lagosTime(e.at).day === day), stored };
      });
      if (!seen) return { say: say.taskNone(spec, seed), given: false };
      if (seen.today.length) return { say: say.taskAgain(spec, seed), given: false };
      const chosen: Offer | null = offerFor(seen.profile, giver, peers, []);
      if (!chosen) { count().refused += 1; return { say: say.taskNone(spec, seed), given: false }; }
      const key = `${chosen.template.id}|${giver.key}|${giver.voice}`, stored = seen.stored[key]?.text;
      const phrased = await phrase(chosen.template, giver, typeof stored === 'string' ? stored : undefined);
      let words = sayBrief(chosen, phrased.text, giver.voice), usedModel = phrased.text !== null;
      // Everything said or shown passes the AI word rules for a minor; a phrasing that does not is replaced by the written brief, and a written one that does not is not given.
      if (!agentWords(words, { toMinor: true }).ok || words.length > 230) { words = sayBrief(chosen, null, giver.voice); usedModel = false; }
      if (!agentWords(words, { toMinor: true }).ok || !agentWords(chosen.label, { toMinor: true }).ok) { count().blocked += 1; return { say: say.taskNone(spec, seed), given: false }; }
      if (!usedModel) count().written += 1;
      const entry = { ...chosen.entry, brief: words };
      const done = await ctx.store.transact((db) => {
        const result = step(db, who, giver.city, { op: 'give', entry }, 'The task id is unique in the life, so a repeat of the same step is refused');
        if (result.ok && phrased.fresh && phrased.text !== null) {
          const book = ctx.collection(db, BRIEFS, {}) as Record<string, { text: string; at: number }>;
          if (Object.keys(book).length < BRIEF_STORE_MAX) book[key] = { text: phrased.text, at: ctx.now() };
        }
        return result;
      });
      if (!done.ok) { count().refused += 1; return { say: done.code === 'too_many' ? say.taskFull(spec, seed) : say.taskNone(spec, seed), given: false }; }
      count().given += 1;
      return { say: say.taskGiven(words), given: true };
    });
  }

  // ---- a person spoke to an agent ------------------------------------------------------------------------------------------------------
  /**
   * `peers` are the public ids of the people in the speaker's group of the venue. `handWords` says the line sounds like handing something over.
   * Resolves one line to say, or null when no task of this life asked for anything.
   */
  function notice(input: { agent: AgentRef; spec: Spec; who: Who; peers: readonly string[]; handWords: boolean; /** Called with the id of the agent who gave a task this step finished (closeness rises: runner.ts missionDone). */ onDone?: (giverId: string) => void | Promise<void> }): Promise<string | null> {
    const { agent, spec, who } = input, seed = `${agent.id}|${who.id}|${ctx.now()}`;
    return guarded(null, async () => {
      const plan = await ctx.store.read((db) => {
        const found = lifeOf(db, who, agent.city);
        if (!found) return null;
        const now = ctx.now(), open = (found.state.missions.agent ?? []).filter((e) => !e.claimed && e.n < e.count && e.until > now);
        const greet = open.filter((e) => e.kind === 'talk' && e.with?.id === agent.id && !e.marks.includes(agent.id));
        const hand = open.filter((e) => e.kind === 'hand' && e.by.id === agent.id);
        const friends = input.peers.filter((id) => id !== who.id && found.state.social.rel[id]?.friend === true && !found.state.social.rel[id]?.npc && !ctx.core?.sessionByPublicId?.(db, id)?.agent);
        const bringing = open.filter((e) => e.kind === 'bring' && e.by.id === agent.id);
        const friend = bringing.length ? friends.find((id) => bringing.some((e) => !e.marks.includes(id))) : undefined;
        return { greet: greet.length > 0, hand: input.handWords ? hand[0] : undefined, friend, ids: [...greet, ...(input.handWords ? hand.slice(0, 1) : []), ...bringing].map((e) => e.id) };
      });
      if (!plan || (!plan.greet && !plan.hand && !plan.friend)) return null;
      const lines: string[] = [], finished: string[] = [];
      await ctx.store.transact((db) => {
        if (plan.greet && step(db, who, agent.city, { op: 'talk', agent: agent.id }, 'The agent is marked on the task, so a repeat counts nothing').ok) { count().greeted += 1; lines.push(say.taskGreeted(spec, seed)); }
        if (plan.friend && step(db, who, agent.city, { op: 'bring', agent: agent.id, friend: plan.friend }, 'The friend is marked on the task, so a repeat counts nothing').ok) { count().brought += 1; lines.push(say.taskBrought(spec, seed)); }
        if (plan.hand) {
          const done = step(db, who, agent.city, { op: 'hand', agent: agent.id }, 'The items leave the kitchen and the task is finished in one step, so a repeat finds nothing to hand over');
          if (done.ok) { count().handed += 1; lines.push(say.taskHanded(spec, seed)); }
          else lines.push(say.taskShort(spec, plan.hand.units ?? 1, INGREDIENTS[plan.hand.item ?? '']?.label.toLowerCase() ?? 'what I asked for', seed));
        }
        for (const e of lifeOf(db, who, agent.city)?.state.missions.agent ?? []) if (plan.ids.includes(e.id) && e.n >= e.count && !e.claimed) finished.push(e.by.id);
      });
      for (const giver of new Set(finished)) { try { await input.onDone?.(giver); } catch { /* closeness is a bonus, never a reason to fail */ } }
      return lines.length ? lines.join(' ') : null;
    });
  }

  // ---- the hand-over that completes a held quote -----------------------------------------------------------------------------------
  /**
   * Pay `price` (exactly what the held quote says) to a house seller and receive the item. The life's rules refuse a price outside the least a house agent may sell
   * for and the list price, a purchase made twice, a full bag, a full stomach, and a short purse. Resolves { ok, code }.
   */
  function sell(input: { agent: AgentRef; who: Who; item: { id: string; label: string; list: number }; price: number; quoteAt: number }): Promise<{ ok: boolean; code: string }> {
    const { agent, who, item } = input;
    return guarded({ ok: false, code: 'unavailable' }, async () => {
      const product = BUSINESS_PRODUCTS.get(item.id);
      if (!product) return { ok: false, code: 'unknown_product' };
      const goods = product.type === 'fabric' || product.type === 'crafts';
      const payload: Record<string, unknown> = { op: 'sale', shop: agent.name, product: item.id, label: item.label, price: input.price, list: item.list, ref: `${agent.id}|${item.id}|${input.quoteAt}`, kind: goods ? 'goods' : 'food',
        ...(!goods ? { effects: product.effects ?? {}, ...(product.need ? { need: product.need } : {}), ...(product.mood ? { mood: product.mood } : {}) } : {}) };
      const done = await ctx.store.transact((db) => step(db, who, agent.city, payload, 'The purchase reference is kept in the life, so a repeat of the same hand-over is refused'));
      if (done.ok) count().sold += 1;
      return { ok: done.ok, code: done.code };
    });
  }

  /** A person's open tasks that involve this agent, as short phrases for the model's prompt (Phase 12 `missions` hook). */
  async function phrases(personId: string, agent: { id: string; city: string }): Promise<string[]> {
    return guarded([], () => ctx.store.read((db) => {
      const found = lifeOf(db, { id: personId, name: '' }, agent.city), now = ctx.now();
      return (found?.state.missions.agent ?? []).filter((e) => !e.claimed && e.n < e.count && e.until > now && (e.by.id === agent.id || e.with?.id === agent.id)).map((e) => `${e.label} (${e.n} of ${e.count})`);
    }));
  }

  return { offer, notice, sell, phrases, counters: (): DeskCounters => ({ ...count() }), phrasings: (): number => memory.size, templates: TEMPLATES.length };
}
export type Desk = ReturnType<typeof deskOf>;
