/**
 * OWNER: models
 * THE ROUTER ON A HOST: routerOf(ctx) builds the one router of a host from its environment (keys), clock, outside fetch, storage and
 * admin settings, and linkModels(ctx) puts it on the operator page. See docs/MODELS-ROUTER.md.
 *
 * Environment (secrets; absent means the provider is skipped): AI_GATEWAY_API_KEY (and AI_GATEWAY_BASE_URL), OPENROUTER_API_KEY.
 * STORAGE: the collection `modelRouter` (the ledger), written lazily (`durable: false`); nothing a person said is ever stored in it.
 * ADMIN SETTINGS (server/admin/settings.ts, edited on the World page, no release needed):
 *   modelsCompanion · modelsAgentTalk · modelsResident · modelsSafety   the model list of each purpose (text, see catalog.ts)
 *   modelBudgetCents       the day's cap in US cents across everything (at most 200 = US$2.00; it can only be lowered)
 *   modelPlayerRequests    one person's requests a day · modelPlayerCents one person's paid spend a day in US cents
 *   openrouterFreePerMinute / openrouterFreePerDay · gatewayFreePerMinute   a free provider's room (the gateway has no daily cap of ours)
 *                          (OpenRouter's free models: 20 a minute, 1,000 a day: the account bought credit on 14 October 2026)
 *   modelSafetyCheck       ask the free safety model about model-written replies too (off: it adds a request to each reply)
 */
import { registerAdminSetting } from '../admin/settings.ts';
import { registerAdminStat } from '../admin/tools.ts';
import { COMPANION_FALLBACK, COMPANION_PRIMARY, DEFAULT_GATEWAY_URL, DEFAULT_LISTS, formatList, LIST_SETTING, PURPOSES, PRICES, type Entry, type Price, type Provider, type Purpose } from './catalog.ts';
import { createRouter, HARD_CAP_MICRO, type Router, type Stored } from './router.ts';
import { reportLines } from './report.ts';
import { weeklyReport } from './weekly.ts';
import type { RouteContext } from '../types.ts';

const whole = (raw: string, fallback: number, least: number, most: number): number => { const n = /^\d{1,9}$/.test(raw.trim()) ? Number(raw.trim()) : NaN; return Number.isFinite(n) && n >= least && n <= most ? n : fallback; };
const num = (value: unknown, fallback: number): number => (typeof value === 'number' && Number.isFinite(value) ? value : fallback);

/** The companion's list as the environment sets it (COMPANION_MODEL / COMPANION_FALLBACK_MODEL), else the one in code. */
function companionList(env: (name: string) => string): Entry[] {
  const id = (name: string, fallback: string): string => { const given = env(name).trim(); return /^[A-Za-z0-9][A-Za-z0-9._-]{0,40}\/[A-Za-z0-9][A-Za-z0-9._:-]{0,60}$/.test(given) ? given : fallback; };
  const first = id('COMPANION_MODEL', COMPANION_PRIMARY), second = id('COMPANION_FALLBACK_MODEL', COMPANION_FALLBACK);
  return first === second ? [{ provider: 'gateway', id: first }] : [{ provider: 'gateway', id: first }, { provider: 'gateway', id: second }];
}
function gatewayBase(env: (name: string) => string): string {
  try { const url = new URL(env('AI_GATEWAY_BASE_URL').trim() || DEFAULT_GATEWAY_URL); if (url.protocol === 'https:' && !url.username && !url.search && !url.hash) return url.href.replace(/\/+$/, ''); } catch { /* the default */ }
  return DEFAULT_GATEWAY_URL;
}

const routers = new WeakMap<RouteContext, Router>();
export function routerOf(ctx: RouteContext): Router {
  const found = routers.get(ctx);
  if (found) return found;
  const env = (name: string): string => (typeof ctx.env === 'function' ? ctx.env(name) : '');
  const setting = (key: string): boolean | number | string | undefined => ctx.checks?.setting?.(key) ?? ctx.checks?.text?.(key);
  // The companion's price estimate can still be set by the old environment names, for its first model.
  const prices: Record<string, Price> = { ...PRICES };
  const priceIn = Number(env('COMPANION_PRICE_IN_PER_M')), priceOut = Number(env('COMPANION_PRICE_OUT_PER_M'));
  if (env('COMPANION_PRICE_IN_PER_M') && Number.isFinite(priceIn) && priceIn >= 0) prices[companionList(env)[0]!.id] = { input: priceIn, output: Number.isFinite(priceOut) && priceOut >= 0 ? priceOut : prices[companionList(env)[0]!.id]?.output ?? 0.5 };
  const router = createRouter({
    now: () => ctx.now(),
    fetch: (url, init) => ctx.fetch(url, init),
    provider: (name: Provider) => {
      const key = env(name === 'gateway' ? 'AI_GATEWAY_API_KEY' : 'OPENROUTER_API_KEY').trim();
      return key && !/\s/.test(key) ? { key, baseUrl: name === 'gateway' ? gatewayBase(env) : '' } : null;
    },
    setting,
    defaults: (purpose) => (purpose === 'companion' ? companionList(env) : undefined),
    prices,
    limits: () => ({
      dailyCapMicro: Math.min(HARD_CAP_MICRO, num(setting('modelBudgetCents'), 200) * 10000),
      playerRequests: num(setting('modelPlayerRequests'), whole(env('COMPANION_PLAYER_DAILY'), 200, 1, 100000)),
      playerMicro: num(setting('modelPlayerCents'), 5) * 10000,
      freePerMinute: { openrouter: num(setting('openrouterFreePerMinute'), 20), gateway: num(setting('gatewayFreePerMinute'), 60) },
      // The gateway has no daily cap of ours (docs/MODELS-ROUTER.md): its 429 and `retry-after` tell the router when a model needs rest.
      freePerDay: { openrouter: num(setting('openrouterFreePerDay'), 1000) },
    }),
    load: () => ctx.store.read((db) => { const col = (db as Record<string, unknown>)['modelRouter']; return col && typeof col === 'object' ? structuredClone(col) as Stored : undefined; }),
    save: (stored) => ctx.store.transact((db) => { Object.assign(ctx.collection(db, 'modelRouter', { days: {} }), structuredClone(stored)); }, { durable: false }),
  });
  routers.set(ctx, router);
  return router;
}

const usd = (micro: number): string => `US$${(micro / 1e6).toFixed(4)}`;

/** Settings, operator numbers and the weekly job. Called once per host with the other admin links (server/admin/links.ts). */
export function linkModels(ctx: RouteContext): void {
  const env = (name: string): string => (typeof ctx.env === 'function' ? ctx.env(name) : '');
  const router = routerOf(ctx);
  const number = (key: string, label: string, help: string, fallback: number, min: number, max: number): void => registerAdminSetting(ctx, { key, label, help, kind: 'number', min, max, default: () => fallback });
  for (const purpose of PURPOSES) {
    const names: Record<Purpose, string> = { 'companion': 'the guide talking to a player', 'agent-talk': 'house agents talking to a person', 'resident': 'residents among themselves', 'safety': 'the safety check', 'moderation': 'the feed reviewer (reports and public photos)' };
    registerAdminSetting(ctx, { key: LIST_SETTING[purpose], label: `Models: ${names[purpose]}`, kind: 'text', max: 1500,
      help: 'Free models first, then paid, as provider:model-id separated by commas (gateway or openrouter). Empty list: the default. A request with a person’s words only ever uses the paid ones.',
      default: () => formatList(purpose === 'companion' ? companionList(env) : DEFAULT_LISTS[purpose]) });
  }
  number('modelBudgetCents', 'Models: spend cap for the day (US cents)', 'Across every purpose; at US$2.00 (200) paid models stop until the next UTC day. It can only be lowered.', 200, 0, 200);
  number('modelPlayerRequests', 'Models: requests per person per day', 'Model requests one person may cause in a UTC day.', whole(env('COMPANION_PLAYER_DAILY'), 200, 1, 100000), 1, 100000);
  number('modelPlayerCents', 'Models: paid spend per person per day (US cents)', 'One person’s paid model use in a UTC day.', 5, 0, 200);
  number('openrouterFreePerMinute', 'OpenRouter free models per minute', 'Their free limit is 20.', 20, 1, 1000);
  number('openrouterFreePerDay', 'OpenRouter free models per day', '1,000 since the account bought US$15 of credit (14 October 2026); it would be 50 without credit.', 1000, 1, 100000);
  number('gatewayFreePerMinute', 'Gateway free models per minute', 'A generous safety limit of ours; the gateway publishes no number and answers 429 itself.', 60, 1, 1000);
  registerAdminSetting(ctx, { key: 'modelSafetyCheck', label: 'Free safety model on model-written replies', help: 'After the word rules, ask the free safety model about each reply a model wrote. Adds a request and some time to every reply; a failure never blocks a reply.', kind: 'boolean', default: () => false });

  const stat = (id: string, label: string, read: () => number | string): void => registerAdminStat(ctx, { id: `models-${id}`, group: 'Models today (UTC day)', label, cost: 'memory', read });
  const view = () => { void router.ready(); return router.today(); };
  stat('spend', 'Budget usage / cap', () => { const t = view(); return `${usd(t.ledger.micro)} of ${usd(t.capMicro)} (unresolved estimates ${usd(t.ledger.estimatedMicro ?? 0)}; in flight ${usd(t.reservedMicro)}; not an invoice)`; });
  stat('requests', 'Answered requests', () => view().ledger.requests);
  stat('by-model', 'By model', () => Object.entries(view().ledger.byModel).map(([name, m]) => `${name}: ${m.n} answered, ${m.failed} failed, ${usd(m.micro)}`).join(' · ') || 'none yet');
  stat('by-purpose', 'By purpose', () => Object.entries(view().ledger.byPurpose).map(([name, m]) => `${name}: ${m.n}, ${usd(m.micro)}`).join(' · ') || 'none yet');
  stat('free', 'Free requests sent', () => Object.entries(view().ledger.free).map(([name, n]) => `${name} ${n}`).join(' · ') || 'none yet');
  stat('refused', 'Refused', () => Object.entries(view().ledger.refused).map(([name, n]) => `${name} ${n}`).join(' · ') || 'none');
  stat('keys', 'Providers with a key', () => [router.hasKey('gateway') ? 'gateway' : '', router.hasKey('openrouter') ? 'openrouter' : ''].filter(Boolean).join(' · ') || 'none');
  stat('resting', 'Resting after a failure', () => router.resting().join(' · ') || 'none');
  stat('report', 'Free models this week (read weekly)', () => { void router.ready(); return reportLines(router.stored().report).join(' | '); });

  // The weekly job, only on a host that may reach the outside (the Node host and the Worker; a test opts in with a fake fetch).
  if (ctx.worldFeed) ctx.on('heartbeat', () => { void weeklyReport(router, (url, init) => ctx.fetch(url, init), () => ctx.now()).catch(() => {}); });
}
