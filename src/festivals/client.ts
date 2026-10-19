/**
 * OWNER: growth
 * THE PAGE'S COPY OF THE FESTIVAL FEED: one small fetch per city (GET /api/world/festivals, server/routes/festivals.ts), kept for
 * FEED_MS, read by the venue scene (the Square's dressing), the Events app (the notice line, the main events, match nights) and the
 * background crowd (the match-night lift). Loaded on demand, never part of the first download: every importer reaches it with a
 * dynamic import(). A failed fetch leaves the last feed (or none): nothing here ever blocks a scene or throws.
 */
import { dressingFor } from './calendar.ts';
import type { Dressing, FestivalExtras } from './calendar.ts';
import { crowdLift } from './matches.ts';
import type { Fixture } from './matches.ts';

export interface Feed { cityId: string; country: string; extras: FestivalExtras; fixtures: Fixture[]; at: number }
export const FEED_MS = 5 * 60000;
const feeds = new Map<string, Feed>(), pending = new Map<string, Promise<Feed | null>>();
// The weekly world event (docs/WORLD-EVENTS.md): a city that reached its goal is dressed in the event's colours for a week, when no festival is.
let changes: typeof import('../world-events/client.ts') | null = null, changesAsked = false;

/** The feed held for a city, or null before the first answer. */
export const feedFor = (cityId: string): Feed | null => feeds.get(cityId) ?? null;
/** Fetch (at most every FEED_MS) the feed of a city. */
export function loadFeed(cityId: string, fetchJson: (path: string) => Promise<unknown> = (path) => fetch(path).then((answer) => answer.ok ? answer.json() : null)): Promise<Feed | null> {
  if (!changesAsked) { changesAsked = true; void import('../world-events/client.ts').then(async (lib) => { await lib.loadChanges(); changes = lib; }).catch(() => { /* no change */ }); }
  else void changes?.loadChanges();
  const held = feeds.get(cityId);
  if (held && Date.now() - held.at < FEED_MS) return Promise.resolve(held);
  const running = pending.get(cityId);
  if (running) return running;
  const started = (async (): Promise<Feed | null> => {
    try {
      const body = await fetchJson(`/api/world/festivals?city=${encodeURIComponent(cityId)}`) as { country?: unknown; extras?: FestivalExtras; fixtures?: Fixture[] } | null;
      if (!body || typeof body.country !== 'string') return held ?? null;
      const feed: Feed = { cityId, country: body.country, extras: body.extras && typeof body.extras === 'object' ? body.extras : {}, fixtures: Array.isArray(body.fixtures) ? body.fixtures : [], at: Date.now() };
      feeds.set(cityId, feed);
      return feed;
    } catch { return held ?? null; } finally { pending.delete(cityId); }
  })();
  pending.set(cityId, started);
  return started;
}

/** The Square's dressing for a city at server time `now`, or null (no feed yet, or no festival). */
export function dressingNow(cityId: string, now: number): Dressing | null {
  const feed = feeds.get(cityId);
  return (feed ? dressingFor(now, feed.country, feed.extras) : null) ?? changes?.changeDressing(cityId, now) ?? null;
}
/** The match-night lift for a city at `now` (0 when none or no feed). */
export function liftNow(cityId: string, now: number): number {
  const feed = feeds.get(cityId);
  return feed ? crowdLift(now, feed.country, feed.fixtures) : 0;
}

const channel = (hex: string, at: number): number => parseInt(hex.slice(1 + at * 2, 3 + at * 2), 16);
const mix = (a: string, b: string, amount: number): string => {
  if (!/^#[0-9a-f]{6}$/i.test(a) || !/^#[0-9a-f]{6}$/i.test(b)) return a;
  let out = '#';
  for (let at = 0; at < 3; at++) out += Math.round(channel(a, at) + (channel(b, at) - channel(a, at)) * amount).toString(16).padStart(2, '0');
  return out;
};
/** How far a venue's light moves toward the festival's colours: enough to read as dressing, not enough to hide the place. */
export const FESTIVE_AMOUNT = 0.22;
/**
 * `base` lit in a festival's colours: the sky, the fill light and the rim lean toward the two colours and the lamps and window glow
 * come up a little. A new object; `base` is never changed. No geometry is added (the dressing costs nothing to draw).
 */
export function festiveLighting<L extends { sky: [string, string]; hemi: [string, string, number]; rim: [string, number]; glow: number; lamps: number }>(base: L, dressing: Pick<Dressing, 'colour' | 'second'>): L {
  return { ...base, sky: [mix(base.sky[0], dressing.colour, FESTIVE_AMOUNT), mix(base.sky[1], dressing.second, FESTIVE_AMOUNT)], hemi: [mix(base.hemi[0], dressing.colour, FESTIVE_AMOUNT), mix(base.hemi[1], dressing.second, FESTIVE_AMOUNT), base.hemi[2]],
    rim: [mix(base.rim[0], dressing.second, FESTIVE_AMOUNT * 1.5), base.rim[1]], glow: base.glow * 1.15, lamps: base.lamps * 1.15 };
}
