/**
 * OWNER: companion
 * THE GATEWAY CLIENT: one OpenAI-compatible chat request over fetch, nothing else. Portable (no Node imports), so the Node host
 * and the Worker run the same code. The fetch function is the host's ctx.fetch (https only, no redirect).
 *
 * THE KEY IS NEVER IN ANYTHING THIS MODULE RETURNS OR THROWS. A failure is answered as a short fixed reason ('timeout', 'status', 'model', 'network', 'body', 'auth'), never with the runtime's own message, and the key is only ever placed in the request header.
 *
 * Settings (all optional; no key means the feature is off — see config()):
 *   AI_GATEWAY_API_KEY (secret) · AI_GATEWAY_BASE_URL · COMPANION_MODEL · COMPANION_FALLBACK_MODEL · COMPANION_AI · COMPANION_AI_REPHRASE
 *   COMPANION_DAILY_REQUESTS · COMPANION_PLAYER_DAILY · COMPANION_PLAYER_BURST · COMPANION_MAX_OUTPUT_TOKENS · COMPANION_TIMEOUT_MS
 *   COMPANION_PRICE_IN_PER_M · COMPANION_PRICE_OUT_PER_M  (US$ per million tokens; only for the operator's cost estimate)
 */

import { MODELS_ENV } from '../models/catalog.ts';
export const COMPANION_ENV = Object.freeze(['AI_GATEWAY_API_KEY', 'AI_GATEWAY_BASE_URL', 'COMPANION_MODEL', 'COMPANION_FALLBACK_MODEL', 'COMPANION_AI', 'COMPANION_AI_REPHRASE', 'COMPANION_DAILY_REQUESTS', 'COMPANION_PLAYER_DAILY', 'COMPANION_PLAYER_BURST', 'COMPANION_MAX_OUTPUT_TOKENS', 'COMPANION_TIMEOUT_MS', 'COMPANION_PRICE_IN_PER_M', 'COMPANION_PRICE_OUT_PER_M', ...MODELS_ENV]);
export const DEFAULT_BASE_URL = 'https://ai-gateway.vercel.sh';
export const DEFAULT_MODEL = 'openai/gpt-6-luna';
export const DEFAULT_FALLBACK_MODEL = 'xai/grok-4.1-fast-non-reasoning';
/** US$ per million tokens of the default model at the time of writing. Used ONLY for the operator's estimated cost. */
export const DEFAULT_PRICE_PER_M = Object.freeze({ input: 0.10, output: 0.50 });
export const TEMPERATURE = 0.6;
/** The share of the total time the first model may use; the fallback gets what is left. */
const PRIMARY_SHARE = 0.6;

export interface CompanionConfig {
  key: string
  baseUrl: string
  model: string
  fallbackModel: string
  enabled: boolean
  rephrase: boolean
  dailyRequests: number
  playerDaily: number
  playerBurst: number
  maxOutputTokens: number
  timeoutMs: number
  priceInPerM: number
  priceOutPerM: number
}

const MODEL_ID = /^[a-z0-9][a-z0-9._-]{0,40}\/[A-Za-z0-9][A-Za-z0-9._:-]{0,60}$/;
const whole = (raw: string, fallback: number, least: number, most: number): number => {
  if (!/^\d{1,9}$/.test(raw.trim())) return fallback;
  const value = Number(raw.trim());
  return value >= least && value <= most ? value : fallback;
};
const price = (raw: string, fallback: number): number => {
  const value = /^\d{1,4}(\.\d{1,6})?$/.test(raw.trim()) ? Number(raw.trim()) : NaN;
  return Number.isFinite(value) ? value : fallback;
};

/**
 * The settings, or null when the feature is off: no key, or COMPANION_AI=off. A malformed value falls back to its default.
 * `anotherProvider`: the model router has some other provider's key (server/models/), so a missing gateway key is not "off".
 */
export function companionConfig(env: (name: string) => string, anotherProvider = false): CompanionConfig | null {
  const key = env('AI_GATEWAY_API_KEY').trim();
  if ((!key && !anotherProvider) || /\s/.test(key) || env('COMPANION_AI').trim().toLowerCase() === 'off') return null;
  let baseUrl = DEFAULT_BASE_URL;
  try { const url = new URL(env('AI_GATEWAY_BASE_URL').trim() || DEFAULT_BASE_URL); if (url.protocol === 'https:' && !url.username && !url.search && !url.hash) baseUrl = url.href.replace(/\/+$/, ''); } catch { /* the default */ }
  const model = (name: string, fallback: string): string => { const given = env(name).trim(); return MODEL_ID.test(given) ? given : fallback; };
  return {
    key, baseUrl, model: model('COMPANION_MODEL', DEFAULT_MODEL), fallbackModel: model('COMPANION_FALLBACK_MODEL', DEFAULT_FALLBACK_MODEL), enabled: true,
    rephrase: env('COMPANION_AI_REPHRASE').trim().toLowerCase() === 'on',
    dailyRequests: whole(env('COMPANION_DAILY_REQUESTS'), 25000, 1, 10000000), playerDaily: whole(env('COMPANION_PLAYER_DAILY'), 200, 1, 100000), playerBurst: whole(env('COMPANION_PLAYER_BURST'), 8, 1, 1000),
    maxOutputTokens: whole(env('COMPANION_MAX_OUTPUT_TOKENS'), 220, 16, 2000), timeoutMs: whole(env('COMPANION_TIMEOUT_MS'), 8000, 200, 30000),
    priceInPerM: price(env('COMPANION_PRICE_IN_PER_M'), DEFAULT_PRICE_PER_M.input), priceOutPerM: price(env('COMPANION_PRICE_OUT_PER_M'), DEFAULT_PRICE_PER_M.output),
  };
}

export interface ChatMessage { role: 'system' | 'user' | 'assistant'; content: string }
export interface Usage { input: number; output: number }
export type GatewayFailure = 'timeout' | 'status' | 'network' | 'body' | 'auth' | 'model' | 'rate';
export type Billing = { kind: 'unbilled' } | { kind: 'unknown' } | { kind: 'observed'; usage: Usage | null; providerCostMicro: number | null };
export type GatewayAnswer = ({ ok: true; text: string; model: string; usage: Usage | null } | { ok: false; why: GatewayFailure; /** A 429's `retry-after` header as the provider wrote it (seconds, or an HTTP date); the model router reads it (server/models/router.ts retryAfterMs). */ retryAfter?: string }) & { /** Accounting evidence survives a rejected/empty visible answer. */ billing?: Billing };
export type GatewayAttempt = GatewayAnswer & { role: 'primary' | 'fallback' };
type Fetcher = (url: string, init?: object) => Promise<unknown>;

/** Where one request goes. `kind` picks the dialect: the Vercel gateway's own fields, or OpenRouter's. `feature` is the spend tag (server/models/ names the purpose). */
export interface Target { key: string; baseUrl: string; maxOutputTokens: number; kind?: 'gateway' | 'openrouter'; feature?: string; /** The request carries a person's words: ask the provider not to keep or train on it. */ private?: boolean }

export interface RequestBody { model: string; messages: readonly ChatMessage[]; max_tokens?: number; temperature?: number; max_completion_tokens?: number; stream: boolean; providerOptions?: { gateway: { user: string; tags: string[] } }; user?: string; provider?: { data_collection: string } }
/** The exact JSON body of a request. `providerOptions.gateway` carries the spend tags and the end-user id (the gateway's own fields). */
export function requestBody(config: Pick<Target, 'maxOutputTokens'> & Partial<Target>, model: string, role: 'primary' | 'fallback', messages: readonly ChatMessage[], user: string, plain = false): RequestBody {
  // `plain`: the second try after a 400 that named these fields (some models take no temperature and want max_completion_tokens).
  const base = { model, messages, ...(plain ? { max_completion_tokens: config.maxOutputTokens } : { max_tokens: config.maxOutputTokens, temperature: TEMPERATURE }), stream: false };
  // OpenRouter: the end-user id is a plain field, and a request with a person's words may only go to providers that do not keep or train on it.
  if (config.kind === 'openrouter') return { ...base, user, ...(config.private ? { provider: { data_collection: 'deny' } } : {}) };
  return { ...base, providerOptions: { gateway: { user, tags: ['product:allworld', `feature:${config.feature ?? 'companion'}`, `role:${role}`, `model:${model}`] } } };
}

const isResponse = (value: unknown): value is Response => typeof value === 'object' && value !== null && typeof Reflect.get(value, 'status') === 'number' && typeof Reflect.get(value, 'text') === 'function';
const tokens = (value: unknown): value is number => typeof value === 'number' && Number.isSafeInteger(value) && value >= 0;
function readUsage(raw: unknown): Usage | null {
  if (typeof raw !== 'object' || raw === null) return null;
  const used: unknown = Reflect.get(raw, 'usage');
  if (typeof used !== 'object' || used === null) return null;
  const input: unknown = Reflect.get(used, 'prompt_tokens'), output: unknown = Reflect.get(used, 'completion_tokens');
  return tokens(input) && tokens(output) && input + output > 0 ? { input, output } : null;
}
/** OpenRouter's usage.cost is a reported total USD charge, not independently reconciled invoice evidence. */
function readBilling(raw: unknown, kind: Target['kind']): Billing {
  const usage = readUsage(raw);
  const used: unknown = typeof raw === 'object' && raw !== null ? Reflect.get(raw, 'usage') : null;
  const cost: unknown = kind === 'openrouter' && typeof used === 'object' && used !== null ? Reflect.get(used, 'cost') : null;
  const micro = typeof cost === 'number' && Number.isFinite(cost) && cost >= 0 ? cost * 1e6 : null;
  const providerCostMicro = micro !== null && Number.isFinite(micro) && micro <= Number.MAX_SAFE_INTEGER ? micro : null;
  return usage || providerCostMicro !== null ? { kind: 'observed', usage, providerCostMicro } : { kind: 'unknown' };
}

/** Read the gateway's answer: the text of the first choice and, when given, the tokens it counted. */
export function readAnswer(raw: unknown): { text: string; usage: Usage | null } | null {
  if (typeof raw !== 'object' || raw === null) return null;
  const choice = Array.isArray(Reflect.get(raw, 'choices')) ? Reflect.get(raw, 'choices')[0] : undefined;
  const message: unknown = typeof choice === 'object' && choice !== null ? Reflect.get(choice, 'message') : undefined;
  const content: unknown = typeof message === 'object' && message !== null ? Reflect.get(message, 'content') : undefined;
  const text = typeof content === 'string' ? content : Array.isArray(content) ? content.map((part) => (typeof part === 'object' && part !== null && typeof Reflect.get(part, 'text') === 'string' ? Reflect.get(part, 'text') : '')).join('') : '';
  if (!text.trim()) return null;
  return { text: text.slice(0, 8000), usage: readUsage(raw) };
}

/** One request to one model. Answers a short fixed reason on a failure. */
export async function once(fetcher: Fetcher, config: Target, model: string, role: 'primary' | 'fallback', messages: readonly ChatMessage[], user: string, budgetMs: number, plain = false): Promise<GatewayAnswer> {
  const control = new AbortController();
  const timer = setTimeout(() => control.abort(), Math.max(1, budgetMs));
  try {
    const sent = fetcher(config.kind === 'openrouter' ? `${config.baseUrl}/chat/completions` : `${config.baseUrl}/v1/chat/completions`, {
      method: 'POST', signal: control.signal, redirect: 'manual',
      headers: { 'Authorization': `Bearer ${config.key}`, 'Content-Type': 'application/json', 'Accept': 'application/json' },
      body: JSON.stringify(requestBody(config, model, role, messages, user, plain)),
    });
    // The timer must win even when a fetch ignores the abort signal.
    const response = await Promise.race([sent, new Promise<never>((_, reject) => { control.signal.addEventListener('abort', () => reject(new Error('timeout'))); })]);
    if (!isResponse(response)) return { ok: false, why: 'network', billing: { kind: 'unknown' } };
    if (response.status === 401 || response.status === 403) return { ok: false, why: 'auth', billing: { kind: 'unbilled' } };
    if (response.status === 404) return { ok: false, why: 'model', billing: { kind: 'unbilled' } };
    if (response.status === 429) { const wait = response.headers?.get?.('retry-after'); return { ok: false, why: 'rate', billing: { kind: 'unbilled' }, ...(typeof wait === 'string' && wait ? { retryAfter: wait.slice(0, 80) } : {}) }; }
    if (response.status === 400 && !plain) {
      const said = await Promise.race([response.text(), new Promise<string>((resolve) => { control.signal.addEventListener('abort', () => resolve('')); })]).catch(() => '');
      if (/temperature|max_tokens|max_completion_tokens/i.test(said.slice(0, 2000))) { clearTimeout(timer); return once(fetcher, config, model, role, messages, user, budgetMs, true); }
      return { ok: false, why: 'status', billing: { kind: 'unbilled' } };
    }
    if (response.status < 200 || response.status >= 300) return { ok: false, why: 'status', billing: { kind: response.status === 400 || response.status === 402 ? 'unbilled' : 'unknown' } };
    const body = await Promise.race([response.text(), new Promise<never>((_, reject) => { control.signal.addEventListener('abort', () => reject(new Error('timeout'))); })]);
    let parsed: unknown;
    try { parsed = JSON.parse(body.slice(0, 200000)); } catch { return { ok: false, why: 'body', billing: { kind: 'unknown' } }; }
    const billing = readBilling(parsed, config.kind);
    const answer = readAnswer(parsed);
    return answer ? { ok: true, text: answer.text, model, usage: answer.usage, billing } : { ok: false, why: 'body', billing };
  } catch {
    return { ok: false, why: control.signal.aborted ? 'timeout' : 'network', billing: { kind: 'unknown' } };
  } finally { clearTimeout(timer); }
}

/**
 * Ask the primary model; on a failure ask the fallback once. Never longer than config.timeoutMs in all. An answer that does not
 * parse as a chat answer counts as a failure here; whether its TEXT is fit to show is for checks.ts. A rejected key (401/403) is
 * not retried: the fallback uses the same key. `attempts` lists what was tried, for the counters.
 */
export async function ask(fetcher: Fetcher, config: CompanionConfig, messages: readonly ChatMessage[], user: string): Promise<{ answer: GatewayAnswer; role: 'primary' | 'fallback'; attempts: GatewayAttempt[] }> {
  const started = performance.now();
  const first = await once(fetcher, config, config.model, 'primary', messages, user, Math.floor(config.timeoutMs * PRIMARY_SHARE));
  const attempts: GatewayAttempt[] = [{ ...first, role: 'primary' }];
  if (first.ok || (!first.ok && first.why === 'auth') || config.fallbackModel === config.model) return { answer: first, role: 'primary', attempts };
  const left = config.timeoutMs - (performance.now() - started);
  if (left < 100) return { answer: first, role: 'primary', attempts };
  const second = await once(fetcher, config, config.fallbackModel, 'fallback', messages, user, left);
  attempts.push({ ...second, role: 'fallback' });
  return { answer: second, role: 'fallback', attempts };
}
