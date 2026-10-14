/**
 * OWNER: models
 * THE WEEKLY MODEL REPORT: which free models appeared and which left, on each provider, since the last look. Pure and portable; the
 * fetching is in service.ts. The admin page shows the report; nothing changes by itself (the lists are settings an admin edits).
 *
 * A provider's list (`GET /v1/models`) is { data: [{ id, pricing }] }. A model is free there when its id ends in `:free` or `-free`,
 * or when every price it states is zero. A list that does not parse is a failure for that provider: its earlier list is kept.
 */
import { entryKey, isFree, type Entry, type Provider } from './catalog.ts';
import type { ModelReport, ProviderReport } from './router.ts';

export const REPORT_EVERY_MS = 7 * 86400000, RETRY_AFTER_MS = 6 * 3600000, KEEP_IDS = 300, SHOW_IDS = 40;

const priceNumbers = (pricing: unknown): number[] => (typeof pricing === 'object' && pricing !== null ? Object.values(pricing).map((value) => (typeof value === 'string' || typeof value === 'number' ? Number(value) : NaN)).filter((n) => Number.isFinite(n)) : []);

/** Every model id a provider lists, and which of them are free; null when the answer is not a model list. */
export function readModelList(raw: unknown): { ids: string[]; free: string[] } | null {
  const data = typeof raw === 'object' && raw !== null ? Reflect.get(raw, 'data') : undefined;
  if (!Array.isArray(data)) return null;
  const ids: string[] = [], free: string[] = [];
  for (const item of data.slice(0, 5000)) {
    const id = typeof item === 'object' && item !== null ? Reflect.get(item, 'id') : undefined;
    if (typeof id !== 'string' || id.length > 120) continue;
    ids.push(id);
    const prices = priceNumbers(typeof item === 'object' && item !== null ? Reflect.get(item, 'pricing') : undefined);
    if (isFree(id) || (prices.length > 0 && prices.every((n) => n === 0))) free.push(id);
  }
  return { ids, free };
}

/** The report for one provider against the free list seen last time (undefined: never seen). */
export function compare(before: readonly string[] | undefined, now: readonly string[]): ProviderReport {
  const had = new Set(before ?? []), has = new Set(now);
  return { ok: true, free: now.length, first: before === undefined, appeared: before === undefined ? [] : now.filter((id) => !had.has(id)).slice(0, SHOW_IDS), left: (before ?? []).filter((id) => !has.has(id)).slice(0, SHOW_IDS) };
}
export const failedReport = (): ProviderReport => ({ ok: false, free: 0, appeared: [], left: [], first: false });

/** The configured models that a provider's list no longer shows (only for providers whose list was read). */
export function missingModels(configured: readonly Entry[], listed: Partial<Record<Provider, ReadonlySet<string>>>): string[] {
  const out: string[] = [];
  for (const entry of configured) { const ids = listed[entry.provider]; if (ids && !ids.has(entry.id) && !out.includes(entryKey(entry))) out.push(entryKey(entry)); }
  return out.slice(0, SHOW_IDS);
}

export const reportLines = (report: ModelReport | undefined): string[] => {
  if (!report) return ['No report yet (the first one is made soon after the server starts).'];
  const one = (name: string, r: ProviderReport): string => (r.ok ? `${name}: ${r.free} free${r.first ? ' (first look)' : ''}${r.appeared.length ? `; new: ${r.appeared.join(', ')}` : ''}${r.left.length ? `; gone: ${r.left.join(', ')}` : ''}` : `${name}: could not read the list`);
  return [one('OpenRouter', report.openrouter), one('Vercel gateway', report.gateway), report.missing.length ? `In use but not listed any more: ${report.missing.join(', ')}` : 'Every model in use is still listed.'];
};
