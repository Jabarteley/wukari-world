/**
 * OWNER: world
 * THE WORLD LEDGER: a small append-only list of PUBLIC things that happened in each city, one short plain line each
 * ("Ada opened a food stall in Yaba Market", "Tunde was elected governor of Lagos"). The phone's Gist app, the Square's radio-style
 * line, the share cards and the agents' `check_gist` tool all read this one list. Design and privacy rules: docs/GIST.md.
 *
 * STORED   ctx.collection(db, 'gist') = { v: 1, seq, cursor, cities: { [cityId | 'world']: GistItem[] } }, oldest first.
 *          One item = { n, at, city, kind, text, refs? }. `n` counts up for the whole world and is never reused; it is the number a
 *          share card and `since=` use. `world` holds what belongs to every city (the Square, the nation, an announcement for all).
 * LIMITS   at most CITY_MAX items per city and TOTAL_MAX in all, none older than KEEP_MS; pruned on every write. A write is
 *          { durable: false } unless the caller says otherwise: losing the last second of gossip costs nothing.
 * PRIVACY  an item is made only from facts that are already public, and `add` is the one door:
 *          - a person is named only when their id is an ADULT (ctx.checks.adult); a minor or an unknown age is "a resident"
 *            (or the whole item is dropped when the caller says `minors: 'skip'`);
 *          - a person who hid themselves from the directory (civic prefs) is never in an item at all: it is dropped whole;
 *          - text with a money sign or "naira" is dropped unless the caller says the amount is already public (`publicAmount`);
 *          - no ids are stored, only the words, so nothing here can be turned back into a person;
 *          - messages, reports, blocks and moderation never reach this file: their code does not call it.
 * SOURCES  the heartbeat reads three that are already stored (new entries of the public record, a busy city or Square, a calendar event
 *          that has begun); business, justice and announcements call `add` where they happen.
 * Portable: no Node imports.
 */
import { cityRules } from '../../src/game/cities/index.ts';
import { lagosTime } from '../../src/game/clock.ts';
import { eventsBetween } from '../../src/game/calendar.ts';
import { SQUARE_ROOM } from '../../src/places/model.ts';
import { peekRecords, keyOf } from '../records/store.ts';
import { pulseOf } from '../pulse.ts';
import type { ChainEntry } from '../../src/records/chain.ts';
import type { Db, RouteContext } from '../types.ts';

export const WORLD = 'world';
export const CITY_MAX = 200, TOTAL_MAX = 2500, KEEP_MS = 14 * 86400000, TEXT_MAX = 120;
/** People in a city (or in the Square) for it to be news. */
export const BUSY_MIN = 8, SQUARE_MIN = 6;
/** What the heartbeat compares with; a test lowers them. */
export const THRESHOLDS = { busy: BUSY_MIN, square: SQUARE_MIN };
/** The same busy line is not repeated for a city sooner than this. */
export const BUSY_EVERY_MS = 6 * 3600000;
const RECORDS_PER_BEAT = 40;
/** The heartbeat looks at most this often. */
export const TICK_MS = 20000;

export type GistKind = 'election' | 'law' | 'party' | 'removal' | 'business' | 'jail' | 'busy' | 'event' | 'notice' | 'owner' | 'other';
export const GIST_KINDS: readonly GistKind[] = ['election', 'law', 'party', 'removal', 'business', 'jail', 'busy', 'event', 'notice', 'owner', 'other'];
export type GistRefs = Record<string, string | number>;
export interface GistItem { n: number; at: number; city: string; kind: GistKind; text: string; refs?: GistRefs }
export interface GistCursor { records: number; busy: Record<string, number>; square: number; events: Record<string, number> }
export interface GistCollection { v: 1; seq: number; cursor: GistCursor; cities: Record<string, GistItem[]> }
export interface GistPerson { id: string; name: string }
export interface NewGist {
  /** A city id, or WORLD. */
  city: string
  kind: GistKind
  /** The line. `{0}`, `{1}` stand for `people[0]`, `people[1]`. */
  text: string
  people?: readonly GistPerson[]
  /** What to do with a minor or a player whose age is not known: say "a resident" (default) or leave the item out. */
  minors?: 'anon' | 'skip'
  /** Only small keys of text or numbers (a record number, a de-duplication `key`): never a player id. */
  refs?: GistRefs
  /** The money in `text` is already shown to everyone (a law of the public record). */
  publicAmount?: boolean
  /** Leaves the item out when the same `refs.key` is already in the city's list. Set by `add` callers that may be called twice. */
}

const record = (value: unknown): value is Record<string, unknown> => value !== null && typeof value === 'object' && !Array.isArray(value);
const whole = (value: unknown): value is number => typeof value === 'number' && Number.isSafeInteger(value) && value >= 0;
const MONEY = /[₦$€£]|\bnaira\b|\bkobo\b/i;
const clean = (text: string, max: number): string => text.replace(/[\u0000-\u001f\u007f]/g, ' ').replace(/\s+/g, ' ').trim().slice(0, max);
const upFirst = (text: string): string => (text ? text[0]!.toUpperCase() + text.slice(1) : text);
const cityName = (id: string): string => (id === WORLD ? 'Allworld' : cityRules(id)?.name ?? id);

/** Whether a stored character is one an AI agent plays (the agents' own list). */
export const isAiCharacter = (db: Db, id: string): boolean => {
  const agents = (db as unknown as Record<string, unknown>).agents, chars = record(agents) ? agents.chars : null;
  return record(chars) && record(chars[id]);
};

const emptyCursor = (): GistCursor => ({ records: -1, busy: {}, square: 0, events: {} });
export const emptyGist = (): GistCollection => ({ v: 1, seq: 0, cursor: emptyCursor(), cities: {} });

/** The collection, made or repaired in place so damaged data cannot crash a route. */
export function gistOf(ctx: Pick<RouteContext, 'collection'>, db: Db): GistCollection {
  const found = ctx.collection(db, 'gist', emptyGist()) as Partial<GistCollection>;
  if (!whole(found.seq)) found.seq = 0;
  if (!record(found.cities)) found.cities = {};
  if (!record(found.cursor)) found.cursor = emptyCursor();
  const cursor = found.cursor as Partial<GistCursor>;
  if (typeof cursor.records !== 'number') cursor.records = -1;
  if (!record(cursor.busy)) cursor.busy = {};
  if (!whole(cursor.square)) cursor.square = 0;
  if (!record(cursor.events)) cursor.events = {};
  found.v = 1;
  return found as GistCollection;
}
/** What a read sees: nothing is created. */
export function peekGist(db: Db): GistCollection {
  const found = (db as unknown as Record<string, unknown>).gist;
  return record(found) && record(found.cities) && whole(found.seq) ? found as unknown as GistCollection : emptyGist();
}

/** Every item of a city that a reader of that city may see (its own and the world's), newest first. */
export function recent(gist: GistCollection, city: string, { since = 0, limit = 30, now = Infinity }: { since?: number; limit?: number; now?: number } = {}): GistItem[] {
  const rows: GistItem[] = [];
  for (const id of city === WORLD ? [WORLD] : [city, WORLD]) {
    const list = gist.cities[id];
    if (Array.isArray(list)) for (const item of list) if (item.n > since && item.at > now - KEEP_MS) rows.push(item);
  }
  return rows.sort((a, b) => b.n - a.n).slice(0, Math.max(1, Math.min(limit, CITY_MAX)));
}
const words = (text: string): string[] => text.toLowerCase().normalize('NFKD').replace(/[^\p{L}\p{N}\s]/gu, ' ').split(/\s+/).filter((word) => word.length > 1);
/** Items whose words contain every word asked (any order), newest first: "did Tunde win?" finds "Tunde was elected governor of Lagos". */
export function search(gist: GistCollection, city: string, query: string, { max = 5, now = Infinity }: { max?: number; now?: number } = {}): GistItem[] {
  const STOP = new Set(['did', 'does', 'the', 'was', 'were', 'is', 'are', 'who', 'what', 'when', 'where', 'has', 'have', 'had', 'win', 'won', 'in', 'of', 'to', 'it', 'and', 'a', 'an', 'on', 'at']);
  const wanted = words(query).filter((word) => !STOP.has(word));
  if (!wanted.length) return [];
  return recent(gist, city, { limit: CITY_MAX, now }).filter((item) => { const have = words(item.text).join(' '); return wanted.every((word) => have.includes(word)); }).slice(0, Math.max(1, Math.min(max, 5)));
}
/** One item by number, whichever city it is in (the share card reads it). */
export function itemByNumber(gist: GistCollection, n: unknown): GistItem | null {
  if (!whole(n) || n < 1) return null;
  for (const list of Object.values(gist.cities)) if (Array.isArray(list)) { const found = list.find((item) => item.n === n); if (found) return found; }
  return null;
}

/** Drop what is too old, then the oldest of a city over its cap, then the oldest of all over the total cap. */
export function prune(gist: GistCollection, now: number): void {
  let total = 0;
  for (const [id, list] of Object.entries(gist.cities)) {
    const kept = Array.isArray(list) ? list.filter((item) => item.at > now - KEEP_MS).slice(-CITY_MAX) : [];
    if (kept.length) { gist.cities[id] = kept; total += kept.length; } else delete gist.cities[id];
  }
  while (total > TOTAL_MAX) {
    let oldest: string | null = null;
    for (const [id, list] of Object.entries(gist.cities)) if (list[0] && (oldest === null || list[0].at < gist.cities[oldest]![0]!.at)) oldest = id;
    if (oldest === null) break;
    gist.cities[oldest]!.shift(); total -= 1;
    if (!gist.cities[oldest]!.length) delete gist.cities[oldest];
  }
  const cursor = gist.cursor;
  for (const map of [cursor.busy, cursor.events]) for (const [key, at] of Object.entries(map)) if (!(at > now - KEEP_MS)) delete map[key];
}

export type GistService = ReturnType<typeof buildService>;
const services = new WeakMap<RouteContext, GistService>();
export function gistService(ctx: RouteContext): GistService {
  let found = services.get(ctx);
  if (!found) services.set(ctx, found = buildService(ctx));
  return found;
}

function buildService(ctx: RouteContext) {
  const known = (city: string): boolean => city === WORLD || ctx.cityIds.some((id) => id === city);
  const hidden = (db: Db, id: string): boolean => record(db.civic) && record(db.civic.prefs) && record((db.civic.prefs as Record<string, unknown>)[id]) && ((db.civic.prefs as Record<string, Record<string, unknown>>)[id]!).directory === true;

  /**
   * THE one door. Inside a transaction: add one public line, or nothing (a private fact, a hidden player, a minor with `minors: 'skip'`, a money sign,
   * an unknown city, the same `refs.key` again). Returns the item, or null.
   */
  function add(db: Db, entry: NewGist): GistItem | null {
    if (!known(entry.city) || !GIST_KINDS.includes(entry.kind)) return null;
    const people = entry.people ?? [];
    let text = entry.text;
    for (const [index, person] of people.entries()) {
      if (typeof person?.id !== 'string' || hidden(db, person.id)) return null;
      const adult = ctx.checks?.adult?.(db, person.id) === true;
      if (!adult && entry.minors === 'skip') return null;
      const name = adult ? clean(String(person.name ?? ''), 24) : '';
      text = text.split(`{${index}}`).join(name || 'a resident');
    }
    text = upFirst(clean(text, TEXT_MAX));
    if (!text || /\{\d\}/.test(text) || (!entry.publicAmount && MONEY.test(text))) return null;
    const refs: GistRefs = {};
    for (const [key, value] of Object.entries(entry.refs ?? {}).slice(0, 4)) if (typeof value === 'number' || typeof value === 'string') refs[clean(key, 12)] = typeof value === 'string' ? clean(value, 60) : value;
    // An AI character in the line keeps its AI mark where the line is retold (the weekly episode): a small flag, never an id.
    if (people.some((person) => isAiCharacter(db, person.id))) refs.ai = 1;
    const gist = gistOf(ctx, db), now = ctx.now();
    const list = gist.cities[entry.city] ?? (gist.cities[entry.city] = []);
    if (refs.key !== undefined && list.some((item) => item.refs?.key === refs.key)) return null;
    const item: GistItem = { n: ++gist.seq, at: now, city: entry.city, kind: entry.kind, text, ...(Object.keys(refs).length ? { refs } : {}) };
    list.push(item);
    prune(gist, now);
    return item;
  }

  // ---- what the heartbeat reads ---------------------------------------------------------------------------------------------------

  /** The line for one entry of the public record, or null (a ruling, an operator's act, an election that did not count). Names are asked for through `people`. */
  function fromRecord(entry: ChainEntry): NewGist | null {
    const f = entry.facts, where = entry.scope.startsWith('city:') ? entry.scope.slice(5) : WORLD, key = `record:${entry.n}`, refs = { key, record: entry.n };
    if (entry.kind === 'term' && f.void === false && typeof f.winnerId === 'string' && typeof f.winner === 'string') {
      const office = entry.title.split(` ${f.winner}`)[0] ?? '';
      return { city: where, kind: 'election', text: /^[A-Za-z ]{3,24}$/.test(office) ? `{0} was elected ${office.toLowerCase()} of ${entry.scopeName}` : `{0} was elected to lead ${entry.scopeName}`, people: [{ id: f.winnerId, name: f.winner }], minors: 'skip', refs };
    }
    if (entry.kind === 'law') return { city: where, kind: 'law', text: entry.title.replace(/\s*\(.*$/, ''), publicAmount: true, refs };
    if (entry.kind === 'party' && typeof f.founderId === 'string' && typeof f.founder === 'string' && typeof f.party === 'string') return { city: where, kind: 'party', text: `{0} founded the ${clean(f.party, 40)}`, people: [{ id: f.founderId, name: f.founder }], minors: 'skip', refs };
    if (entry.kind === 'impeachment' && typeof f.removedId === 'string' && typeof f.removed === 'string') return { city: where, kind: 'removal', text: `{0} was removed from office in ${entry.scopeName} by petition`, people: [{ id: f.removedId, name: f.removed }], minors: 'skip', refs };
    return null;
  }

  /** Everything the heartbeat would add now, and the cursor to move to. Reads only. */
  function collect(db: Db, now: number): { items: NewGist[]; cursor: GistCursor } {
    const stored: Partial<GistCursor> = peekGist(db).cursor ?? {};
    const cursor: GistCursor = { records: typeof stored.records === 'number' ? stored.records : -1, busy: { ...(record(stored.busy) ? stored.busy : {}) }, square: whole(stored.square) ? stored.square : 0, events: { ...(record(stored.events) ? stored.events : {}) } };
    const items: NewGist[] = [];
    // The public record: entries written since the last look. A first look reads the recent ones only.
    const records = peekRecords(db);
    if (cursor.records < 0) cursor.records = Math.max(0, records.seq - RECORDS_PER_BEAT);
    for (let n = cursor.records + 1, read = 0; n <= records.seq && read < RECORDS_PER_BEAT; n++, read++) {
      cursor.records = n;
      const entry = records.entries[keyOf(n)];
      if (!entry || entry.at < now - KEEP_MS) continue;
      const made = fromRecord(entry);
      if (made) items.push(made);
    }
    // A busy city, a packed Square.
    try {
      for (const [city, people] of Object.entries(pulseOf(ctx).pulse(null).cities)) {
        if (people >= THRESHOLDS.busy && now - (cursor.busy[city] ?? -Infinity) >= BUSY_EVERY_MS) { cursor.busy[city] = now; items.push({ city, kind: 'busy', text: `${cityName(city)} is buzzing: ${people} ${people === 1 ? 'person' : 'people'} out right now`, refs: { key: `busy:${city}:${Math.floor(now / BUSY_EVERY_MS)}` } }); }
      }
      const square = ctx.checks?.venueCounts?.(SQUARE_ROOM)?.total ?? 0;
      if (square >= THRESHOLDS.square && (cursor.square === 0 || now - cursor.square >= BUSY_EVERY_MS)) { cursor.square = now; items.push({ city: WORLD, kind: 'busy', text: 'The Square is packed right now', refs: { key: `square:${Math.floor(now / BUSY_EVERY_MS)}` } }); }
    } catch { /* the counts are not ready: nothing is busy */ }
    // A calendar event that has begun in a city someone is in.
    try {
      for (const [city, people] of Object.entries(pulseOf(ctx).pulse(null).cities)) {
        if (people < 1 || !known(city)) continue;
        for (const event of eventsBetween(now, now + 1, city)) {
          const key = `event:${city}:${event.id}:${event.start}`;
          if (event.live && !(key in cursor.events)) { cursor.events[key] = now; items.push({ city, kind: 'event', text: `${event.title} has started at ${event.venueLabel}`, refs: { key } }); }
        }
      }
    } catch { /* the city's content is not loaded: no events */ }
    return { items, cursor };
  }

  let busy = false, lastTick = -Infinity;
  return {
    add,
    gistOf: (db: Db) => peekGist(db),
    recent: (db: Db, city: string, options?: { since?: number; limit?: number }) => recent(peekGist(db), city, { ...options, now: ctx.now() }),
    search: (db: Db, city: string, query: string, max = 5) => search(peekGist(db), city, query, { max, now: ctx.now() }),
    find: (db: Db, n: unknown) => { const found = itemByNumber(peekGist(db), n); return found && found.at > ctx.now() - KEEP_MS ? found : null; },
    fromRecord,
    /** The heartbeat: read what is new in the public record, the counts and the calendar, and write it. One at a time; never throws. */
    async tick(): Promise<number> {
      const now = ctx.now();
      if (busy || now - lastTick < TICK_MS) return 0;
      busy = true; lastTick = now;
      try {
        const due = await ctx.store.read((db) => {
          const { items, cursor } = collect(db, now);
          const stored = peekGist(db).cursor?.records;
          const baseline = typeof stored === 'number' ? Math.max(0, stored) : 0;
          return items.length > 0 || cursor.records !== baseline;
        });
        if (!due) return 0;
        return await ctx.store.transact((db) => {
          const { items, cursor } = collect(db, now);
          const gist = gistOf(ctx, db);
          gist.cursor = cursor;
          let added = 0;
          for (const item of items) if (add(db, item)) added += 1;
          return added;
        }, { durable: false });
      } catch { return 0; } finally { busy = false; }
    },
  };
}
