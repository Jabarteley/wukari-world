/**
 * OWNER: models
 * THE MODEL ROUTER: the one place every language-model call goes through. Portable (no Node imports); the Node host and the Worker
 * run the same code. server/models/service.ts wires it to a host (keys, clock, fetch, storage, admin settings); the tests wire it to
 * plain objects and a fake fetch, so no test ever reaches a provider.
 *
 *   ask({ purpose, messages, maxTokens, playerId?, carriesPlayerWords }) → { ok: true, text, model, ... } | { ok: false, why }
 *
 * WHAT IT DECIDES, in this order, for each model of the purpose's list (free first, then paid):
 *   1. A provider with no key is skipped. A model that failed lately (5xx, 429, timeout, 404 "gone", a bad answer) is skipped for a few
 *      minutes (a gone model for half an hour); a provider that refused its key is skipped for ten. If every model is resting, they are tried anyway.
 *   2. THE NO-TRAINING RULE: with carriesPlayerWords true only the PAID models are tried, and an OpenRouter request also asks for
 *      providers that keep no data (`provider.data_collection: deny`). A free model only ever sees lines with no player data.
 *   3. A free model of a provider is tried only while that provider's free requests per minute and per day have room (settings).
 *   4. THE BUDGET: a paid model is tried only when today's spend, plus what requests in flight may still cost, plus this request's worst
 *      case (every prompt token and every allowed output token) stays under the day's cap (US$2.00). The check and the reservation
 *      happen in one synchronous step, so a burst of parallel requests cannot all pass the same check. A cost is added from the answer's
 *      `usage`, or from the characters when the provider gave none. A request that fails costs nothing.
 *   5. A player's day: at most so many requests and so many US cents of paid model (settings). A refusal here is 'player-cap'.
 * The refusal reasons are 'off' (no provider has a key), 'no-model' (nothing in the list can be used for this request), 'budget',
 * 'player-cap', 'rate' (free room used up and nothing paid to fall to) and 'failed' (every model tried failed). Callers have a
 * fallback of their own for all of them (the companion answers from its own words).
 *
 * THE DAY is the UTC day, as the providers' own free limits and invoices are. The ledger (spend, requests, tokens by model and purpose,
 * the players' counts, the weekly model report) is one stored collection, `modelRouter`, written lazily; it is loaded before the first call.
 */
import { once, type ChatMessage, type GatewayFailure, type Target } from '../companion/gateway.ts';
import { DEFAULT_GATEWAY_URL, DEFAULT_LISTS, entryKey, isFree, LIST_SETTING, OPENROUTER_URL, parseList, priceOf, PROVIDERS, type Entry, type Price, type Provider, type Purpose } from './catalog.ts';

export const DAY_MS = 86400000;
/** US$ 2.00 in millionths of a dollar. The cap setting can only lower it. */
export const HARD_CAP_MICRO = 2000000;
export const DEFAULT_REST_MS = 5 * 60000, GONE_REST_MS = 30 * 60000, AUTH_REST_MS = 10 * 60000;
export const PLAYERS_KEPT = 5000, DAYS_KEPT = 14;
const PRIMARY_SHARE = 0.6;

export interface Tally { n: number; micro: number }
export interface ModelTally extends Tally { input: number; output: number; failed: number }
export interface DayLedger {
  /** Millionths of a US dollar spent. */
  micro: number
  requests: number
  byModel: Record<string, ModelTally>
  byPurpose: Record<string, Tally>
  /** Per player (a one-way id): requests and paid micro-dollars. */
  players: Record<string, Tally>
  /** Free requests sent, per provider. */
  free: Record<string, number>
  /** Refusals by reason. */
  refused: Record<string, number>
}
export interface ModelReport { at: number; openrouter: ProviderReport; gateway: ProviderReport; /** Configured models that neither provider lists any more. */ missing: string[] }
export interface ProviderReport { ok: boolean; free: number; appeared: string[]; left: string[]; /** True when there was no earlier list to compare with. */ first: boolean }
export interface Stored { days: Record<string, DayLedger>; report?: ModelReport; /** Free model ids last seen, per provider. */ freeSeen?: Partial<Record<Provider, string[]>>; reportTriedAt?: number }

export interface Limits { dailyCapMicro: number; playerRequests: number; playerMicro: number; freePerMinute: Record<Provider, number>; freePerDay: Record<Provider, number> }
export interface Deps {
  now(): number
  fetch(url: string, init?: object): Promise<unknown>
  /** A provider's key and base address, or null when it has none. */
  provider(name: Provider): { key: string; baseUrl: string } | null
  /** The admin setting in force for a key (a model list as text, a number), or undefined. */
  setting(key: string): boolean | number | string | undefined
  limits(): Limits
  /** The list a purpose uses when no setting overrides it. */
  defaults?(purpose: Purpose): readonly Entry[] | undefined
  prices?: Readonly<Record<string, Price>>
  load(): Promise<Stored | undefined>
  /** Store the ledger (lazily; it may be called often). */
  save(stored: Stored): Promise<void>
}

export interface AskInput {
  purpose: Purpose
  messages: readonly ChatMessage[]
  maxTokens: number
  /** A one-way id of the person, for their daily cap and the provider's user field. */
  playerId?: string
  /** True when anything of what a person wrote is in the messages: only paid models may then be used. */
  carriesPlayerWords: boolean
  /** All the time the request may take (default 8 s). */
  timeoutMs?: number
}
export type Refusal = 'off' | 'no-model' | 'budget' | 'player-cap' | 'rate' | 'failed';
export interface Attempt { model: string; provider: Provider; ok: boolean; why?: GatewayFailure }
export type AskResult =
  | { ok: true; text: string; model: string; provider: Provider; free: boolean; usage: { input: number; output: number } | null; costMicro: number; attempts: Attempt[] }
  | { ok: false; why: Refusal; attempts: Attempt[] };

const blankDay = (): DayLedger => ({ micro: 0, requests: 0, byModel: {}, byPurpose: {}, players: {}, free: {}, refused: {} });
const own = (table: object, key: string): boolean => Object.hasOwn(table, key);
const tally = <T extends Tally>(table: Record<string, T>, key: string, fresh: () => T): T => { if (!own(table, key)) table[key] = fresh(); return table[key]!; };
const charsOf = (messages: readonly ChatMessage[]): number => messages.reduce((sum, item) => sum + item.content.length, 0);

export function createRouter(deps: Deps) {
  let stored: Stored = { days: {} };
  // A ledger that cannot be read starts empty (the day's spend is then counted from this start); it is never a reason to stop answering.
  let loading: Promise<void> | null = null;
  const ready = (): Promise<void> => (loading ??= deps.load().then((found) => { if (found && typeof found.days === 'object' && found.days !== null) stored = { ...found, days: { ...found.days } }; }, () => {}));
  /** Micro-dollars promised to requests in flight. */
  let reserved = 0;
  const resting = new Map<string, number>(), minute: Record<string, number[]> = {};
  let saving = false, dirty = false;

  const dayNumber = (): number => Math.floor(deps.now() / DAY_MS);
  function today(): DayLedger {
    const key = String(dayNumber());
    if (!own(stored.days, key)) {
      stored.days[key] = blankDay();
      for (const old of Object.keys(stored.days).map(Number).sort((a, b) => a - b).slice(0, -DAYS_KEPT)) delete stored.days[String(old)];
    }
    const found = stored.days[key]!;
    for (const [name, fresh] of Object.entries(blankDay())) if (!(name in found)) (found as unknown as Record<string, unknown>)[name] = fresh;
    return found;
  }
  function persist(): void {
    dirty = true;
    if (saving) return;
    saving = true;
    void (async () => {
      try { while (dirty) { dirty = false; await deps.save(stored); } } catch { /* the next change tries again */ } finally { saving = false; }
    })();
  }
  const hasKey = (provider: Provider): boolean => deps.provider(provider) !== null;
  const prices = deps.prices;
  /** The list for a purpose: the admin setting when it has any good entry, else the host's default, else the one in code. */
  function listFor(purpose: Purpose): Entry[] {
    const given = deps.setting(LIST_SETTING[purpose]);
    const set = typeof given === 'string' ? parseList(given) : [];
    return set.length ? set : [...(deps.defaults?.(purpose) ?? DEFAULT_LISTS[purpose])];
  }
  const refuse = (why: Refusal, attempts: Attempt[], bump = true): AskResult => { if (bump) { const day = today(); day.refused[why] = (day.refused[why] ?? 0) + 1; persist(); } return { ok: false, why, attempts }; };

  /** Would this provider take one more free request now? (Does not count it.) */
  function freeRoom(provider: Provider, day: DayLedger): boolean {
    const limits = deps.limits(), now = deps.now();
    const recent = (minute[provider] = (minute[provider] ?? []).filter((at) => now - at < 60000));
    return recent.length < limits.freePerMinute[provider] && (day.free[provider] ?? 0) < limits.freePerDay[provider];
  }

  async function ask(input: AskInput): Promise<AskResult> {
    await ready();
    const attempts: Attempt[] = [];
    if (!PROVIDERS.some(hasKey)) return refuse('off', attempts, false);
    const day = today(), limits = deps.limits(), started = deps.now();
    const all = listFor(input.purpose).filter((entry) => hasKey(entry.provider));
    const usable = all.filter((entry) => !input.carriesPlayerWords || !isFree(entry.id, prices));
    if (!usable.length) return refuse('no-model', attempts);
    // A person's day: requests, and cents of paid model.
    let player: Tally | null = null;
    if (input.playerId) {
      if (!own(day.players, input.playerId) && Object.keys(day.players).length >= PLAYERS_KEPT) return refuse('player-cap', attempts);
      player = tally(day.players, input.playerId, () => ({ n: 0, micro: 0 }));
      if (player.n >= limits.playerRequests) return refuse('player-cap', attempts);
    }

    const now = deps.now();
    for (const [key, until] of resting) if (until <= now) resting.delete(key);
    const fresh = usable.filter((entry) => !resting.has(entryKey(entry)) && !resting.has(`provider:${entry.provider}`));
    // Everything resting: try them anyway rather than answer nothing.
    const order = fresh.length ? fresh : usable.filter((entry) => !resting.has(`provider:${entry.provider}`));
    const totalMs = input.timeoutMs ?? 8000;
    let blocked: Refusal | null = null;
    for (let index = 0; index < order.length; index++) {
      const entry = order[index]!;
      const left = totalMs - (deps.now() - started);
      if (left < 100) break;
      if (resting.has(`provider:${entry.provider}`)) continue;
      const free = isFree(entry.id, prices), price = priceOf(entry.id, prices);
      // ---- one synchronous step: check, then reserve ----
      let reserve = 0;
      if (free) {
        if (!freeRoom(entry.provider, day)) { blocked = blocked ?? 'rate'; continue; }
        (minute[entry.provider] ??= []).push(deps.now());
        day.free[entry.provider] = (day.free[entry.provider] ?? 0) + 1;
      } else {
        const worst = Math.ceil(charsOf(input.messages) / 3) + 8 * input.messages.length;
        reserve = Math.ceil(worst * price.input + input.maxTokens * price.output);
        if (day.micro + reserved + reserve > limits.dailyCapMicro) { blocked = 'budget'; continue; }
        if (player && player.micro + reserve > limits.playerMicro) { blocked = blocked === 'budget' ? blocked : 'player-cap'; continue; }
        reserved += reserve;
      }
      const target = targetOf(entry.provider, input);
      const more = index < order.length - 1;
      const answer = await once((url, init) => deps.fetch(url, init), target.target, entry.id, index === 0 ? 'primary' : 'fallback', input.messages, input.playerId ?? 'anonymous', Math.floor(more ? left * PRIMARY_SHARE : left));
      reserved = Math.max(0, reserved - reserve);
      if (answer.ok) {
        const sentTokens = Math.ceil(charsOf(input.messages) / 4), gotTokens = Math.ceil(answer.text.length / 4);
        const usage = answer.usage, inTok = usage?.input ?? sentTokens, outTok = usage?.output ?? gotTokens;
        const micro = free ? 0 : Math.round(inTok * price.input + outTok * price.output);
        day.micro += micro; day.requests++;
        const m = tally(day.byModel, entryKey(entry), () => ({ n: 0, micro: 0, input: 0, output: 0, failed: 0 }));
        m.n++; m.micro += micro; m.input += inTok; m.output += outTok;
        const p = tally(day.byPurpose, input.purpose, () => ({ n: 0, micro: 0 })); p.n++; p.micro += micro;
        if (player) { player.n++; player.micro += micro; }
        attempts.push({ model: entry.id, provider: entry.provider, ok: true });
        persist();
        return { ok: true, text: answer.text, model: entry.id, provider: entry.provider, free, usage, costMicro: micro, attempts };
      }
      attempts.push({ model: entry.id, provider: entry.provider, ok: false, why: answer.why });
      tally(day.byModel, entryKey(entry), () => ({ n: 0, micro: 0, input: 0, output: 0, failed: 0 })).failed++;
      if (player) player.n++;
      persist();
      const rest = answer.why === 'model' ? GONE_REST_MS : DEFAULT_REST_MS;
      if (answer.why === 'auth') resting.set(`provider:${entry.provider}`, deps.now() + AUTH_REST_MS);
      else resting.set(entryKey(entry), deps.now() + rest);
    }
    return refuse(attempts.length ? 'failed' : blocked ?? 'no-model', attempts);
  }

  function targetOf(provider: Provider, input: AskInput): { target: Target } {
    const found = deps.provider(provider)!;
    const base = provider === 'openrouter' ? OPENROUTER_URL : found.baseUrl || DEFAULT_GATEWAY_URL;
    return { target: { key: found.key, baseUrl: base, maxOutputTokens: input.maxTokens, kind: provider, feature: input.purpose, private: input.carriesPlayerWords } };
  }

  return {
    ready,
    ask,
    /** Today's ledger (a copy), the cap and the money in flight. */
    today(): { day: number; ledger: DayLedger; capMicro: number; reservedMicro: number } { return { day: dayNumber(), ledger: structuredClone(today()), capMicro: deps.limits().dailyCapMicro, reservedMicro: reserved }; },
    stored: (): Stored => stored,
    /** Models and providers resting now, for the admin page. */
    resting: (): string[] => { const now = deps.now(); return [...resting].filter(([, until]) => until > now).map(([name]) => name); },
    hasKey,
    persist,
    listFor,
  };
}
export type Router = ReturnType<typeof createRouter>;
