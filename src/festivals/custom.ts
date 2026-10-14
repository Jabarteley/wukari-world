/**
 * OWNER: growth
 * A FESTIVAL AN ADMIN ADDS OR REPLACES (server/admin/festivals.ts): the checks on its fields, pure so the admin route and the
 * tests share them. It is stored as plain dates ({ kind: 'dates' }), runs at least MIN_DAYS days (so every time zone sees it) and
 * at most MAX_DAYS, and a festival with the id of a built-in one replaces it (the way to fix a moon-sighting date).
 */
import { dayOfIso } from './calendar.ts';
import type { FestivalDef } from './calendar.ts';

export const CUSTOM_LIMITS = Object.freeze({ keep: 60, hidden: 40, minDays: 3, maxDays: 60, name: 40, blurb: 140 });
const ID = /^[a-z0-9][a-z0-9-]{2,39}$/, COLOUR = /^#[0-9a-f]{6}$/i, CONTROL = /[\u0000-\u001f\u007f<>]/;
const plain = (value: unknown, max: number, min = 1): string | null => {
  const text = typeof value === 'string' ? value.replace(/\s+/g, ' ').trim() : '';
  return text.length >= min && text.length <= max && !CONTROL.test(text) && !/https?:|www\./i.test(text) ? text : null;
};
const hour = (value: unknown): number | null => typeof value === 'number' && Number.isInteger(value) && value >= 0 && value <= 24 ? value : null;

export function cleanFestival(input: unknown): { ok: true; festival: FestivalDef } | { ok: false; reason: string } {
  const body = (input !== null && typeof input === 'object' ? input : {}) as Record<string, unknown>;
  const id = typeof body.id === 'string' ? body.id.trim().toLowerCase() : '';
  if (!ID.test(id)) return { ok: false, reason: 'The id is 3 to 40 letters, numbers or dashes.' };
  const name = plain(body.name, CUSTOM_LIMITS.name, 3), blurb = plain(body.blurb, CUSTOM_LIMITS.blurb, 3);
  if (!name) return { ok: false, reason: `The name is 3 to ${CUSTOM_LIMITS.name} plain characters.` };
  if (!blurb) return { ok: false, reason: `The line under it is 3 to ${CUSTOM_LIMITS.blurb} plain characters, with no links.` };
  const list = body.countries === undefined ? ['*'] : body.countries;
  if (!Array.isArray(list) || !list.length || list.length > 8 || list.some((item) => typeof item !== 'string' || (item !== '*' && !/^[a-z]{2}$/.test(item.toLowerCase())))) return { ok: false, reason: 'Countries are two-letter codes, or * for every country.' };
  const countries = [...new Set((list as string[]).map((item) => item.toLowerCase()))];
  const start = dayOfIso(body.start), end = dayOfIso(body.end), focal = dayOfIso(body.focal ?? body.start);
  if (start === null || end === null || focal === null) return { ok: false, reason: 'Dates are written YYYY-MM-DD.' };
  const days = end - start + 1;
  if (days < CUSTOM_LIMITS.minDays || days > CUSTOM_LIMITS.maxDays) return { ok: false, reason: `A festival runs ${CUSTOM_LIMITS.minDays} to ${CUSTOM_LIMITS.maxDays} days.` };
  if (focal < start || focal > end) return { ok: false, reason: 'The main day must be inside the run.' };
  const colours = body.colours;
  if (!Array.isArray(colours) || colours.length !== 2 || colours.some((item) => typeof item !== 'string' || !COLOUR.test(item))) return { ok: false, reason: 'Two colours, written #rrggbb.' };
  const main = (body.main !== null && typeof body.main === 'object' ? body.main : {}) as Record<string, unknown>;
  const from = hour(main.from), to = hour(main.to);
  if (from === null || to === null || to <= from) return { ok: false, reason: 'The main event runs between two local hours (0 to 24), the second later than the first.' };
  const iso = (day: number): string => new Date(day * 86400000).toISOString().slice(0, 10);
  const festival: FestivalDef = { id, name, blurb, countries, rule: { kind: 'dates', start: iso(start), end: iso(end), focal: iso(focal) }, colours: [colours[0] as string, colours[1] as string].map((item) => item.toLowerCase()) as [string, string],
    main: { from, to, ...(main.daily === true ? { daily: true } : {}), what: 'at the Square', host: null } };
  return { ok: true, festival };
}
/** The stored list, repaired: well-formed festivals only. */
export function festivalListOf(value: unknown): FestivalDef[] {
  if (!Array.isArray(value)) return [];
  const out: FestivalDef[] = [];
  for (const item of value) {
    const rule = (item as { rule?: { start?: string; end?: string; focal?: string } } | null)?.rule;
    const done = cleanFestival({ ...(item as object), start: rule?.start, end: rule?.end, focal: rule?.focal, main: (item as { main?: unknown })?.main });
    if (done.ok && !out.some((x) => x.id === done.festival.id)) out.push(done.festival);
  }
  return out.slice(0, CUSTOM_LIMITS.keep);
}
