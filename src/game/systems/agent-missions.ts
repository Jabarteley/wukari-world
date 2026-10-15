/**
 * OWNER: growth
 * AGENT MISSIONS: tasks a house agent gives a life in person (server/house/desk.ts, docs/AGENT-MISSIONS.md). The life's half lives here: what is
 * stored, what is shown, and the server-only action 'missions.server' the server runs after it has checked the real world (who stands where, who
 * is a friend, what was agreed). Nothing here asks a model anything and nothing here trusts a number: a reward is clamped to MISSION_REWARDS
 * whatever is asked, a price is held to the least a house agent may sell for, and every text is cleaned.
 *
 * STATE — state.missions.agent (absent on a life saved before; at most AGENT_MISSIONS.kept, an `AgentMission` each) and state.missions.deal.
 *
 * OPERATIONS of 'missions.server' { op, … }
 *   give   { entry }                      a task, from a template the server filled. Refused when the life is a guest of the quick start, when
 *                                         AGENT_MISSIONS.open are open already, when AGENT_MISSIONS.perDay were given today, when the id exists,
 *                                         or when the reward is above the limit (it is never trimmed: a server that asks for too much is a bug).
 *   talk   { agent }                      a person spoke to this agent in its venue: counts for an open 'talk' task that names it
 *   hand   { agent }                      hand over what a 'hand' task from this agent asks: the items leave the kitchen, the task is done
 *   bring  { agent, friend }              a friend of this life stands with it at this agent's venue: counts once per friend
 *   sale   { shop, product, label, price, list, ref, kind, effects?, mood?, need? }
 *                                         pay a house agent the price agreed (a held quote) and get the item: goods go in the bag, food is eaten
 * Tasks of 'table' kind are counted by the 'table.played' event (agentTable), a game against another person.
 * THE MONEY. A reward is credited when the task is collected ('missions.claim', claimAgent), under the daily or weekly figure. A sale is a plain
 * debit: a house agent has no wallet and no owner, so what is paid leaves the game's money exactly as groceries and the boutique do.
 */
import { emit } from '../registry.ts';
import { cleanText, fail, finite, isId, isRecord, naira, ok, safeCount } from '../util.ts';
import { lagosTime, lagosDayStart } from '../clock.ts';
import { addMoodlet, canAfford, canCredit, changeNeeds, credit, debit, NEEDS, removeItems, countItem } from '../api.ts';
import { AGENT_MISSIONS, MISSION_REWARDS } from '../content/missions.ts';
import { BAG_LIMIT, BUSINESS_BUYING } from '../content/business-limits.ts';
import type { AgentMission, AgentMissionKind, LifeContext, LifeState, NeedMap } from '../../types/life.ts';

type Payload = Record<string, unknown>;
const KINDS: readonly unknown[] = ['talk', 'hand', 'bring', 'table'];
const DAY_MS = 86400000;
const nowOf = (state: LifeState, ctx: LifeContext | undefined): number => (finite(ctx?.now) && ctx.now > 0 ? ctx.now : state.t);
const limitOf = (big: boolean | undefined): number => MISSION_REWARDS[big ? 'weekly' : 'daily'].cash;
const refOf = (value: unknown): AgentMission['with'] => (isRecord(value) && typeof value.id === 'string' && value.id
  ? { id: cleanText(value.id, 40), name: cleanText(value.name, 24, 'Someone'), city: cleanText(value.city, 40), venue: cleanText(value.venue, 40) } : undefined);

// ---- stored and shown (these run in the browser too, so they stay short) -----------------------------------------------------------

/** The saved list made safe: known kinds, bounded numbers, short texts, a reward never above its limit. Undefined when there is nothing. */
export function sanitizeAgent(value: unknown): AgentMission[] | undefined {
  const out: AgentMission[] = [];
  for (const e of Array.isArray(value) ? value.slice(0, AGENT_MISSIONS.kept) : []) {
    const by = isRecord(e) ? refOf(e.by) : undefined;
    if (!isRecord(e) || !by || !isId(e.id) || !KINDS.includes(e.kind) || out.some((item) => item.id === e.id)) continue;
    const count = safeCount(e.count) && e.count >= 1 ? Math.min(e.count, Math.max(AGENT_MISSIONS.maxCount, AGENT_MISSIONS.maxUnits)) : 1, big = e.big === true;
    const entry: AgentMission = {
      id: e.id, kind: e.kind as AgentMissionKind, label: cleanText(e.label, 70, 'A task'), brief: cleanText(e.brief, 240), n: safeCount(e.n) ? Math.min(e.n, count) : 0, count,
      cash: safeCount(e.cash) ? Math.min(e.cash, limitOf(big)) : 0, by: { ...by, hours: cleanText(isRecord(e.by) ? e.by.hours : '', 24) },
      at: safeCount(e.at) ? e.at : 0, until: safeCount(e.until) ? e.until : 0,
      marks: (Array.isArray(e.marks) ? e.marks : []).filter((mark): mark is string => typeof mark === 'string').slice(0, 6).map((mark) => cleanText(mark, 40)), claimed: e.claimed === true,
    };
    if (big) entry.big = true;
    const who = refOf(e.with);
    if (who) entry.with = who;
    if (e.kind === 'hand' && isId(e.item)) { entry.item = e.item; entry.units = safeCount(e.units) && e.units >= 1 ? Math.min(e.units, AGENT_MISSIONS.maxUnits) : 1; }
    out.push(entry);
  }
  return out.length ? out : undefined;
}

/** A task is still on offer to the player: not claimed, and not lapsed unfinished. */
const live = (e: AgentMission, now: number): boolean => !e.claimed && (e.n >= e.count || e.until > now);
/** A collected task stays on the shelf for the rest of its period (a day; a week for a weekly-sized one), so the limits can count it. */
const recent = (e: AgentMission, now: number): boolean => e.claimed && e.at > now - (e.big ? AGENT_MISSIONS.bigDays : 1) * DAY_MS;
// ---- play only from here (the browser's build never reaches these) ---------------------------------------------------------------

const roster = (state: LifeState): AgentMission[] => state.missions.agent ?? [];
// Progress only moves the count: the events of daily and weekly missions ('mission.completed' and its reward receipts) carry reward ids of their own and are not raised for these.
const progress = (state: LifeState, ctx: LifeContext, e: AgentMission, by = 1): void => { e.n = Math.min(e.count, e.n + by); };
const open = (state: LifeState): boolean => !(state.onboarding?.stage === 'guest' && state.onboarding.done !== true);
const mine = (state: LifeState, now: number, kind: AgentMissionKind): AgentMission[] => roster(state).filter((e) => e.kind === kind && !e.claimed && e.n < e.count && e.until > now);

function give(state: LifeState, payload: Payload, ctx: LifeContext) {
  const raw = payload.entry, now = nowOf(state, ctx), day = lagosTime(now).day;
  if (!open(state)) return fail(state, 'missions_locked', 'Missions open once you have settled in.');
  if (!isRecord(raw)) return fail(state, 'invalid_operation', 'That task is not complete.');
  const big = raw.big === true;
  if (safeCount(raw.cash) && raw.cash > limitOf(big)) return fail(state, 'too_big', `A task cannot pay more than ${naira(limitOf(big))}.`);
  // Lapsed tasks and old collected ones are put away, so they never fill the shelf.
  const kept = roster(state).filter((e) => live(e, now) || recent(e, now));
  const entry = sanitizeAgent([{ ...raw, n: 0, claimed: false, marks: [], at: now, until: big ? now + AGENT_MISSIONS.bigDays * DAY_MS : lagosDayStart(day + 1) }])?.[0];
  if (!entry || entry.cash <= 0 || (entry.kind === 'hand' && !entry.item) || (entry.kind === 'talk' && !entry.with)) return fail(state, 'invalid_operation', 'That task is not complete.');
  if (kept.some((e) => e.id === entry.id)) return fail(state, 'already_given', 'You already have that task.');
  if (kept.filter((e) => !e.claimed && e.n < e.count).length >= AGENT_MISSIONS.open) return fail(state, 'too_many', `You have ${AGENT_MISSIONS.open} tasks from agents already. Finish one first.`);
  if (entry.big && kept.filter((e) => e.big && lagosTime(e.at).week === lagosTime(now).week).length >= AGENT_MISSIONS.bigPerWeek) return fail(state, 'too_many', 'Come back next week: agents have given you a big task this week already.');
  if (kept.filter((e) => lagosTime(e.at).day === day).length >= AGENT_MISSIONS.perDay) return fail(state, 'too_many', 'Come back tomorrow: agents have given you enough for today.');
  state.missions.agent = [...kept, entry];
  state.message = `${entry.by.name} gave you a task: ${entry.label}.`;
  return ok(state, 'given');
}

function talk(state: LifeState, payload: Payload, ctx: LifeContext) {
  const agent = cleanText(payload.agent, 40), now = nowOf(state, ctx);
  const found = mine(state, now, 'talk').filter((e) => e.with?.id === agent && !e.marks.includes(agent));
  if (!found.length) return fail(state, 'nothing_to_do', 'No task asks for that.');
  for (const e of found) { e.marks.push(agent); progress(state, ctx, e); }
  return ok(state, 'greeted');
}

function hand(state: LifeState, payload: Payload, ctx: LifeContext) {
  const agent = cleanText(payload.agent, 40), e = mine(state, nowOf(state, ctx), 'hand').find((item) => item.by.id === agent);
  if (!e || !e.item) return fail(state, 'nothing_to_do', 'No task from this agent asks for that.');
  const units = e.units ?? 1;
  if (countItem(state, e.item) < units) return fail(state, 'item_short', `You need ${units} of that in your kitchen first.`);
  removeItems(state, { [e.item]: units });
  progress(state, ctx, e, e.count);
  state.message = `You handed ${e.by.name} what was asked.`;
  return ok(state, 'handed');
}

function bring(state: LifeState, payload: Payload, ctx: LifeContext) {
  const agent = cleanText(payload.agent, 40), friend = cleanText(payload.friend, 60), rel = Object.hasOwn(state.social.rel, friend) ? state.social.rel[friend] : undefined;
  if (!rel || rel.npc || rel.friend !== true) return fail(state, 'not_a_friend', 'That person is not on your friends list.');
  const found = mine(state, nowOf(state, ctx), 'bring').filter((e) => e.by.id === agent && !e.marks.includes(friend));
  if (!found.length) return fail(state, 'nothing_to_do', 'No task from this agent asks for that.');
  for (const e of found) { e.marks.push(friend); progress(state, ctx, e); }
  return ok(state, 'brought');
}

/** The needs a product changes, bounded as business.ts does for a purchase. */
function effectsOf(value: unknown): NeedMap {
  const effects: NeedMap = {};
  if (isRecord(value)) for (const need of NEEDS) { const amount = value[need]; if (typeof amount === 'number' && Number.isSafeInteger(amount) && amount !== 0) effects[need] = Math.max(-BUSINESS_BUYING.maxEffect, Math.min(BUSINESS_BUYING.maxEffect, amount)); }
  return effects;
}
const up = (value: number): number => Math.ceil(value / AGENT_MISSIONS.step - 1e-9) * AGENT_MISSIONS.step;

/** Pay a house agent a price the server held, and receive what was bought. The price must lie between the least an agent sells for and the list price. */
function sale(state: LifeState, payload: Payload, ctx: LifeContext) {
  const { price, list, product } = payload, shop = cleanText(payload.shop, 24, 'a stall'), label = cleanText(payload.label, 32, 'something'), ref = cleanText(payload.ref, 80);
  if (!isId(product) || !safeCount(list) || list < 1 || !ref) return fail(state, 'unknown_product', 'That is not something this agent sells.');
  if (!safeCount(price) || price < up(list * AGENT_MISSIONS.floorShare) || price > up(list)) return fail(state, 'bad_price', 'That price is not one the agent can take.');
  if (state.missions.deal === ref) return fail(state, 'already_done', 'That purchase is already made.');
  const goods = payload.kind === 'goods', bag = state.business.bag, carried = Object.values(bag).reduce((sum, units) => sum + units, 0);
  if (goods && carried >= BAG_LIMIT) return fail(state, 'bag_full', `You cannot carry more than ${BAG_LIMIT} things. Use some first.`);
  const need = NEEDS.find((id) => id === payload.need);
  if (!goods && need && state.needs[need] >= BUSINESS_BUYING.fullNeed) return fail(state, 'not_needed', need === 'hunger' ? 'You are full. Come back when you are hungry.' : `Your ${need} is already full. Come back when you need it.`);
  if (!canAfford(state, price)) return fail(state, 'insufficient_funds', `You need ${naira(price)}; you have ${naira(state.cash)}.`);
  debit(state, price, `Bought at ${shop}: 1 × ${label}`, ctx);
  state.missions.deal = ref;
  if (goods) bag[product] = (bag[product] ?? 0) + 1;
  else {
    changeNeeds(state, effectsOf(payload.effects));
    const mood = isRecord(payload.mood) && isId(payload.mood.id) ? payload.mood : null;
    if (mood) addMoodlet(state, { id: `shop-${String(mood.id)}`, label: cleanText(mood.label, 40, 'Something new'), value: finite(mood.value) ? Math.max(1, Math.min(BUSINESS_BUYING.maxMood, Math.round(mood.value))) : 1,
      duration: finite(mood.hours) ? Math.max(60, Math.min(BUSINESS_BUYING.maxMoodSeconds, Math.round(mood.hours * 3600))) : 3600 }, ctx);
  }
  state.message = `${label} from ${shop}: −${naira(price)}${goods ? ', in your bag' : ''}.`;
  return ok(state, 'bought');
}

const ops = { give, talk, hand, bring, sale };
/** The body of 'missions.server' (exported for tests). */
export const agentOp = (state: LifeState, payload: Payload, ctx: LifeContext) => (isRecord(payload) && typeof payload.op === 'string' && Object.hasOwn(ops, payload.op)
  ? ops[payload.op as keyof typeof ops](state, payload, ctx) : fail(state, 'invalid_operation', 'That agent step does not exist.'));

/** A game against another person was counted: every open 'table' task moves on. */
export function agentTable(state: LifeState, data: unknown, ctx: LifeContext): void {
  if (!isRecord(data) || data.human !== true) return;
  for (const e of mine(state, nowOf(state, ctx), 'table')) progress(state, ctx, e);
}

/** Collect a finished agent task (the same action as the daily and weekly ones). Null when `id` is not one of these. */
export function claimAgent(state: LifeState, id: unknown, ctx: LifeContext) {
  const e = roster(state).find((item) => item.id === id);
  if (!e) return null;
  if (e.claimed) return fail(state, 'already_claimed', 'You already collected that task.');
  if (e.n < e.count) return fail(state, 'not_done', `${e.label}: ${e.n} of ${e.count} so far.`);
  const cash = Math.min(e.cash, limitOf(e.big));
  if (!canCredit(state, cash)) return fail(state, 'balance_limit', 'Your saved balance has reached its supported limit.');
  e.claimed = true;
  credit(state, cash, `Mission: ${e.label}`, ctx);
  state.missions.claimed = Math.min(Number.MAX_SAFE_INTEGER, state.missions.claimed + 1);
  state.message = `Task done for ${e.by.name} · +${naira(cash)}`;
  emit(state, 'mission.claimed', { id: e.id, scope: e.big ? 'weekly' : 'daily', cash }, ctx);
  return ok(state, 'claimed');
}
