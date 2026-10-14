/**
 * OWNER: models
 * THE WEEKLY JOB: at most once a week, read both providers' public model lists and store a short report of the free models that
 * appeared or left (report.ts). It runs from the host's heartbeat, only on a host that may call the outside world (`ctx.worldFeed`; a
 * test turns that on with a fake fetch). The lists need no key. A provider that fails leaves its earlier list in place, and the whole job is tried
 * again after six hours. Nothing is changed by the report: an admin reads it and edits the model lists (settings) if they wish.
 */
import { MODEL_LIST_URLS, PROVIDERS, type Provider } from './catalog.ts';
import { compare, failedReport, KEEP_IDS, missingModels, readModelList, REPORT_EVERY_MS, RETRY_AFTER_MS } from './report.ts';
import { PURPOSES } from './catalog.ts';
import type { ModelReport, ProviderReport, Router } from './router.ts';

const isResponse = (value: unknown): value is Response => typeof value === 'object' && value !== null && typeof Reflect.get(value, 'status') === 'number' && typeof Reflect.get(value, 'text') === 'function';

async function read(fetcher: (url: string, init?: object) => Promise<unknown>, provider: Provider): Promise<{ ids: string[]; free: string[] } | null> {
  try {
    const response = await fetcher(MODEL_LIST_URLS[provider], { method: 'GET', redirect: 'manual', headers: { 'Accept': 'application/json' } });
    if (!isResponse(response) || response.status < 200 || response.status >= 300) return null;
    return readModelList(JSON.parse((await response.text()).slice(0, 4000000)));
  } catch { return null; }
}

const running = new WeakSet<Router>();
/** Is a report due? (Never when the last good one is under a week old, or the last try under six hours.) */
export function reportDue(router: Router, now: number): boolean {
  const { report, reportTriedAt } = router.stored();
  return (!report || now - report.at >= REPORT_EVERY_MS) && (!reportTriedAt || now - reportTriedAt >= RETRY_AFTER_MS);
}

/** Make the report if one is due (or `force`). Resolves to the report, or null when none was due or both lists failed. */
export async function weeklyReport(router: Router, fetcher: (url: string, init?: object) => Promise<unknown>, now: () => number, force = false): Promise<ModelReport | null> {
  if (running.has(router)) return null;
  await router.ready();
  if (!force && !reportDue(router, now())) return null;
  running.add(router);
  try {
    const stored = router.stored();
    stored.reportTriedAt = now();
    const lists = await Promise.all(PROVIDERS.map(async (provider) => [provider, await read(fetcher, provider)] as const));
    const seen = (stored.freeSeen ??= {});
    const parts: Partial<Record<Provider, ProviderReport>> = {}, listed: Partial<Record<Provider, ReadonlySet<string>>> = {};
    for (const [provider, found] of lists) {
      if (!found) { parts[provider] = failedReport(); continue; }
      parts[provider] = compare(seen[provider], found.free);
      seen[provider] = found.free.slice(0, KEEP_IDS);
      listed[provider] = new Set(found.ids);
    }
    const configured = PURPOSES.flatMap((purpose) => router.listFor(purpose));
    const report: ModelReport = { at: now(), openrouter: parts.openrouter ?? failedReport(), gateway: parts.gateway ?? failedReport(), missing: missingModels(configured, listed) };
    router.persist();
    if (!report.openrouter.ok && !report.gateway.ok) return null;
    stored.report = report;
    router.persist();
    return report;
  } finally { running.delete(router); }
}
