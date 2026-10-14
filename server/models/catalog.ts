/**
 * OWNER: models
 * THE MODEL CATALOG: which providers exist, which models each purpose may use, and what a model costs. Portable and pure (no Node
 * imports): the Node host and the Worker run it. docs/MODELS-ROUTER.md is the guide; this file is the list.
 *
 * PROVIDERS (each optional: no key means it is skipped)
 *   gateway     the Vercel AI Gateway, secret AI_GATEWAY_API_KEY (base AI_GATEWAY_BASE_URL, default https://ai-gateway.vercel.sh)
 *   openrouter  OpenRouter, secret OPENROUTER_API_KEY (base https://openrouter.ai/api/v1; the address is not a setting)
 *
 * A MODEL LIST is text: entries separated by commas or new lines, each `provider:model-id` (a bare id means the gateway), FREE ONES
 * FIRST and paid after. Example: `openrouter:google/gemma-4-31b-it:free, gateway:openai/gpt-5.6-luna`. The defaults below are
 * in code; an admin setting per purpose (modelsCompanion, modelsAgentTalk, modelsResident, modelsSafety) replaces a list without a
 * release, and an empty setting means the default again.
 *
 * FREE OR PAID. A model is free when its id ends in `:free` or `-free`, or the price table says 0. Free models may be used for
 * training by their provider, so a request that carries a player's words never goes to one (router.ts). Every other model is
 * treated as paid, and a paid model that is not in the price table is priced high (UNKNOWN_PRICE) so the budget errs safe.
 *
 * Model ids and free lists are as of 14 Oct 2026 (docs/agent-plans/world-alive/DESIGN.md Part 7). They change; that is why they are settings.
 */

export const PROVIDERS = ['gateway', 'openrouter'] as const;
export type Provider = typeof PROVIDERS[number];
export const PURPOSES = ['companion', 'agent-talk', 'resident', 'safety'] as const;
export type Purpose = typeof PURPOSES[number];

/** Secrets and settings the router reads from the environment (added to the host's allowlist in server/host-context.ts). */
export const MODELS_ENV = Object.freeze(['OPENROUTER_API_KEY']);

export const DEFAULT_GATEWAY_URL = 'https://ai-gateway.vercel.sh';
export const OPENROUTER_URL = 'https://openrouter.ai/api/v1';
/** The public model lists the weekly job reads. */
export const MODEL_LIST_URLS: Readonly<Record<Provider, string>> = Object.freeze({ gateway: 'https://ai-gateway.vercel.sh/v1/models', openrouter: 'https://openrouter.ai/api/v1/models' });

export interface Entry { provider: Provider; id: string }
export const entryKey = (entry: Entry): string => `${entry.provider}:${entry.id}`;

const MODEL_ID = /^[A-Za-z0-9][A-Za-z0-9._-]{0,60}\/[A-Za-z0-9][A-Za-z0-9._:-]{0,80}$/;
/** One entry of a list, or null when it is not one. */
export function parseEntry(raw: string): Entry | null {
  const text = raw.trim();
  const named = /^(gateway|openrouter):(.+)$/.exec(text);
  const provider: Provider = named ? (named[1] as Provider) : 'gateway', id = named ? named[2]! : text;
  return MODEL_ID.test(id) ? { provider, id } : null;
}
/** A list from its text: bad entries are dropped, repeats are kept once, at most 24. */
export function parseList(text: string): Entry[] {
  const seen = new Set<string>(), out: Entry[] = [];
  for (const part of text.split(/[,\n;]+/)) {
    const entry = parseEntry(part);
    if (entry && !seen.has(entryKey(entry)) && out.length < 24) { seen.add(entryKey(entry)); out.push(entry); }
  }
  return out;
}
export const formatList = (entries: readonly Entry[]): string => entries.map(entryKey).join(', ');

export interface Price { input: number; output: number }
/** US$ per million tokens. Free models are 0. */
export const PRICES: Readonly<Record<string, Price>> = Object.freeze({
  'openai/gpt-5.6-luna': { input: 0.10, output: 0.50 },
  'xai/grok-4.1-fast-non-reasoning': { input: 0.20, output: 0.50 },
  'nvidia/nemotron-3.5-lightning-free': { input: 0, output: 0 },
  'poolside/laguna-s-2.1-free': { input: 0, output: 0 },
  'stealth/glyph-cluster': { input: 0, output: 0 },
  'convaiinnovations/laya-free': { input: 0, output: 0 },
});
/** What a paid model missing from the table is assumed to cost. */
export const UNKNOWN_PRICE: Price = Object.freeze({ input: 1, output: 4 });
export const isFree = (id: string, prices: Readonly<Record<string, Price>> = PRICES): boolean => /(:free|-free)$/.test(id) || (prices[id] !== undefined && prices[id].input === 0 && prices[id].output === 0);
export const priceOf = (id: string, prices: Readonly<Record<string, Price>> = PRICES): Price => (isFree(id, prices) ? { input: 0, output: 0 } : prices[id] ?? UNKNOWN_PRICE);

export const SAFETY_MODEL = 'nvidia/nemotron-3.5-content-safety:free';
export const COMPANION_PRIMARY = 'openai/gpt-5.6-luna';
export const COMPANION_FALLBACK = 'xai/grok-4.1-fast-non-reasoning';

const gw = (id: string): Entry => ({ provider: 'gateway', id });
const or = (id: string): Entry => ({ provider: 'openrouter', id });
const FREE: readonly Entry[] = [
  gw('nvidia/nemotron-3.5-lightning-free'), gw('poolside/laguna-s-2.1-free'), gw('stealth/glyph-cluster'), gw('convaiinnovations/laya-free'),
  or('google/gemma-4-31b-it:free'), or('google/gemma-4-26b-a4b-it:free'), or('nvidia/nemotron-3-super-120b-a12b:free'), or('thinkingmachines/inkling:free'), or('nvidia/nemotron-3-ultra-550b-a55b:free'),
];
const PAID: readonly Entry[] = [gw(COMPANION_PRIMARY), gw(COMPANION_FALLBACK)];

/** The lists in code: free first, then paid. companion and agent-talk carry people's words, so they hold paid models only. */
export const DEFAULT_LISTS: Readonly<Record<Purpose, readonly Entry[]>> = Object.freeze({
  'companion': PAID,
  'agent-talk': PAID,
  'resident': [...FREE, gw(COMPANION_PRIMARY)],
  'safety': [or(SAFETY_MODEL)],
});

/** The setting key for a purpose's list. */
export const LIST_SETTING: Readonly<Record<Purpose, string>> = Object.freeze({ 'companion': 'modelsCompanion', 'agent-talk': 'modelsAgentTalk', 'resident': 'modelsResident', 'safety': 'modelsSafety' });
