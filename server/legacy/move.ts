/**
 * OWNER: world
 * LEGACY, THE MOVE (design: docs/LEGACY.md). Passing property from one character's life to another's. Pure over the two lives and
 * the shop collection: no I/O, no clock, no Node imports, so the route can run it inside ONE ctx.store.transact and a throw anywhere
 * leaves both lives, the shops and the offers exactly as they were (the store discards a transaction that rejects).
 *
 * THREE STEPS, each a function, the second and third used by every caller
 *   offerOf    from the GIVER alone: what could be passed, given the kinds the player ticked → a Manifest (the contract of a hand-over)
 *   partition  the manifest cut down to what the RECEIVER can take now, and what stays with the giver and why (read only)
 *   verify     a manifest checked strictly against both lives as they are now: held by the giver, takeable by the receiver (read only)
 *   apply      verify, then move. Items are MOVED, never copied: each leaves the giver in the step it reaches the receiver.
 *
 * WHAT MOVES: houses (the size and look of the house, not the plot: the shards follow by themselves, docs/LEGACY.md section 2), cars,
 * the shop record, furniture, belongings and trade goods, and (bounded) goodwill with NPCs and titles. NEVER: cash, debts, rented homes,
 * land parcels, friendships, offices (docs/LEGACY.md section 3 c).
 */
import { BAG_LIMIT } from '../../src/game/content/business-limits.ts';
import { CARS } from '../../src/game/content/cars.ts';
import { FURNITURE } from '../../src/game/content/furniture.ts';
import { MAX_RELATIONSHIPS } from '../../src/game/content/npcs.ts';
import { DEFAULT_STYLE, HOUSE_TIERS, TIER_ORDER, cleanStyle, packStyle } from '../../src/game/content/world.ts';
import { MAX_STORED_PER_ITEM } from '../../src/game/home-layout.ts';
import { MAX_KINDS, MAX_STACK } from '../../src/game/systems/inventory.ts';
import { cityName } from '../../src/game/cities/registry.ts';
import { isId } from '../../src/game/util.ts';
import { characterCity } from '../character.ts';
import type { BusinessCollection, ShopRecord } from '../../src/types/business.ts';
import type { CarId, HouseTierId, LifeState, MissionTitleId, Residence } from '../../src/types/life.ts';
import type { CityId } from '../../src/types/protocol.ts';
import type { SessionRecord } from '../types.ts';

/** Every number this feature enforces. */
export const LEGACY = Object.freeze({
  offerMs: 7 * 86400000,           // an unanswered offer is removed after this
  gapMs: 14 * 86400000,            // one hand-over to a different character per giver, and one received per receiver, in this time
  minAgeMs: 3 * 86400000,          // the giver has played this long before giving to a different character
  incomingMax: 3,                  // offers one player may have waiting
  offersMax: 500,                  // offers on the whole server
  doneMax: 200,                    // finished hand-overs kept (a short record, no contents)
  peopleMax: 2000,                 // players whose last hand-over is remembered
  beliefsMax: 100,                 // belongings (units) in a hand-over to a different character
  goodwill: { count: 5, min: 20, heir: { share: 0.5, cap: 40 }, other: { share: 0.25, cap: 20 } },
  titlesHeir: 2,                   // titles an heir may take
  perMinute: 10,
});

export type Kind = 'heir' | 'other';
/** What a player may tick. An absent kind is not passed. */
export interface Include { houses?: boolean; cars?: boolean; shop?: boolean; furniture?: boolean; belongings?: boolean; goodwill?: boolean; titles?: boolean }
export const INCLUDE_KEYS: readonly (keyof Include)[] = Object.freeze(['houses', 'cars', 'shop', 'furniture', 'belongings', 'goodwill', 'titles']);
/** The contract of one hand-over: exactly what moves. Small, plain JSON (it is stored in an offer). */
export interface Manifest {
  houses: { city: string; tier: HouseTierId; style: number }[]
  cars: CarId[]
  /** `openedAt` of the giver's shop (identifies this shop), or null. */
  shop: number | null
  furniture: Record<string, number>
  belongings: Record<string, number>
  bag: Record<string, number>
  goodwill: string[]
  titles: MissionTitleId[]
}
/** A character's lives as a hand-over reads them: a session record or an archived (set aside) life. */
export interface Holder { publicId: string; name: string; cities: SessionRecord['cities']; character?: SessionRecord['character'] }
/** One side of a hand-over: the life in the character's own city. */
export interface Side { id: string; name: string; city: CityId; state: LifeState; shop?: ShopRecord | null; active: boolean }
/** What stays with the giver, and the plain reason. */
export interface Stays { what: string; why: string }
export type Verdict = { ok: true } | { ok: false; code: string; reason: string };

export const emptyManifest = (): Manifest => ({ houses: [], cars: [], shop: null, furniture: {}, belongings: {}, bag: {}, goodwill: [], titles: [] });
export const isEmpty = (m: Manifest): boolean => !m.houses.length && !m.cars.length && m.shop === null && !Object.keys(m.furniture).length && !Object.keys(m.belongings).length && !Object.keys(m.bag).length && !m.goodwill.length && !m.titles.length;
const no = (code: string, reason: string): Verdict => ({ ok: false, code, reason });
const yes: Verdict = { ok: true };
const record = (value: unknown): value is Record<string, unknown> => value !== null && typeof value === 'object' && !Array.isArray(value);
const rank = (tier: unknown): number => TIER_ORDER.indexOf(tier as HouseTierId);
const sum = (counts: Record<string, number>): number => Object.values(counts).reduce((a, b) => a + b, 0);
const label = (id: string): string => FURNITURE[id]?.label ?? id;

/** The side of a holder: its life in the city its character is in. Null when it has none. */
export function sideOf(holder: Holder, shop: ShopRecord | null | undefined, active: boolean): Side | null {
  const city = characterCity(holder as unknown as SessionRecord);
  const state = city ? holder.cities[city]?.state : undefined;
  return city && state ? { id: holder.publicId, name: holder.name, city, state, shop: shop ?? null, active } : null;
}

/** The residence a life holds in a city: the main one or an away home. */
export function residenceOf(state: LifeState, city: string): Residence | null {
  if (state.estate.city === city) return state.estate;
  const away = state.estate.away as Record<string, Residence | undefined> | undefined;
  return away && Object.hasOwn(away, city) ? away[city] ?? null : null;
}
const homeCities = (state: LifeState): string[] => [state.estate.city, ...Object.keys(state.estate.away ?? {})];
/** A house bigger than the free starter that can be passed now: not building, no ground rent owed. */
const passable = (r: Residence | null): r is Residence => r !== null && rank(r.tier) > 0 && r.upgrade === null && (r.ground?.arrears ?? 0) === 0;

/** Pieces of furniture the life owns, by kind: placed, in storage and displaced. */
export function furnitureOf(state: LifeState): Record<string, number> {
  const out: Record<string, number> = {};
  const add = (id: string, n: number): void => { if (n > 0 && Object.hasOwn(FURNITURE, id)) out[id] = (out[id] ?? 0) + n; };
  for (const item of state.home.items) add(item.itemId, 1);
  for (const [id, n] of Object.entries(state.home.storage ?? {})) add(id, n);
  for (const [id, n] of Object.entries(state.home.overflow ?? {})) add(id, n);
  return out;
}
const npcClose = (state: LifeState, min: number): [string, number][] =>
  Object.entries(state.social.rel).filter(([, rel]) => rel.npc && rel.p >= min).sort((a, b) => b[1].p - a[1].p || (a[0] < b[0] ? -1 : 1)).map(([id, rel]) => [id, rel.p]);

/** Can this side's life be handed over right now (a trip in progress or a build in the way)? */
export function busyReason(side: Side): string | null {
  const kind = side.state.activeAction?.kind;
  return side.active && (kind === 'travel' || kind === 'commute' || kind === 'intercity' || kind === 'homeward') ? 'A trip is in progress. Finish it first.' : null;
}

/**
 * What the GIVER could pass given the kinds ticked, and why some things cannot (a build in progress, rent owed, a cash box to empty).
 * Nothing about the receiver is known here.
 */
export function offerOf(giver: Side, include: Include): { manifest: Manifest; stays: Stays[] } {
  const m = emptyManifest(), stays: Stays[] = [], s = giver.state;
  if (include.houses) {
    for (const city of homeCities(s)) {
      const r = residenceOf(s, city);
      if (!r || rank(r.tier) <= 0) continue;
      const name = `${HOUSE_TIERS[r.tier].label} in ${cityName(city) ?? city}`;
      if (r.upgrade !== null) stays.push({ what: name, why: 'It is being built. Wait until it is finished.' });
      else if ((r.ground?.arrears ?? 0) > 0) stays.push({ what: name, why: 'Ground rent is owed on it. Pay it first.' });
      else m.houses.push({ city, tier: r.tier, style: packStyle(r.style, r.tier) });
    }
  }
  if (include.cars) m.cars = [...s.property.cars];
  if (include.shop && giver.shop && giver.shop.status !== 'closed') {
    if (giver.shop.till > 0) stays.push({ what: giver.shop.name, why: 'Its cash box is not empty. Collect the takings first.' });
    else if (giver.shop.owed > 0) stays.push({ what: giver.shop.name, why: 'Rent is overdue on it. Pay it first.' });
    else m.shop = giver.shop.openedAt;
  }
  if (include.furniture) m.furniture = furnitureOf(s);
  if (include.belongings) {
    for (const [id, n] of Object.entries(s.inventory)) if (n > 0) m.belongings[id] = n;
    for (const [id, n] of Object.entries(s.business?.bag ?? {})) if (n > 0) m.bag[id] = n;
  }
  if (include.goodwill) m.goodwill = npcClose(s, LEGACY.goodwill.min).slice(0, LEGACY.goodwill.count).map(([id]) => id);
  if (include.titles) m.titles = [...s.missions.titles];
  return { manifest: m, stays };
}

/** Naira worth of what is offered (list prices): counted against the giver's earned-from-work allowance for a different character. */
export function worthOf(m: Manifest, shop: ShopRecord | null | undefined): number {
  let total = 0;
  for (const h of m.houses) total += HOUSE_TIERS[h.tier]?.cost ?? 0;
  for (const id of m.cars) total += CARS[id]?.price ?? 0;
  if (m.shop !== null) total += shop?.paid ?? 0;
  for (const [id, n] of Object.entries(m.furniture)) total += (FURNITURE[id]?.price ?? 0) * n;
  return total;
}

/** The titles of the giver an heir lacks, at most LEGACY.titlesHeir, for a manifest that names them. */
const takeableTitles = (receiver: LifeState, titles: readonly MissionTitleId[]): MissionTitleId[] =>
  titles.filter((id) => id !== 'week-finisher' && !receiver.missions.titles.includes(id)).slice(0, LEGACY.titlesHeir);

/** Would these items fit in a life's inventory? (Checked on counts, nothing is changed.) */
function inventoryFits(state: LifeState, items: Record<string, number>): boolean {
  const kinds = new Set(Object.keys(state.inventory));
  for (const [id, n] of Object.entries(items)) {
    if (!Number.isSafeInteger(n) || n <= 0 || (state.inventory[id] ?? 0) + n > MAX_STACK) return false;
    kinds.add(id);
  }
  return kinds.size <= MAX_KINDS;
}
const bagFits = (state: LifeState, items: Record<string, number>): boolean => sum(state.business?.bag ?? {}) + sum(items) <= BAG_LIMIT;

/** Why the receiver cannot take one house, or null. */
function houseBlock(receiver: Side, house: { city: string; tier: HouseTierId }): string | null {
  const r = residenceOf(receiver.state, house.city);
  if (!r) return `You have no home in ${cityName(house.city) ?? house.city} to put it on.`;
  if (r.upgrade !== null) return 'A house is being built on that plot. Wait until it is finished.';
  if (rank(r.tier) >= rank(house.tier)) return 'That home is already as big or bigger.';
  return null;
}
const shopBlock = (receiver: Side): string | null => (receiver.shop && receiver.shop.status !== 'closed' ? 'They already run a shop (one each).' : null);

/** Carried goodwill of one NPC relationship. */
export const carried = (p: number, kind: Kind): number => { const rule = LEGACY.goodwill[kind]; return Math.round(Math.min(rule.cap, Math.floor(p * rule.share * 10) / 10) * 10) / 10; };

/** The manifest cut down to what the receiver can take now, plus what stays with the giver and why. Reads only. */
export function partition(giver: Side, receiver: Side, wanted: Manifest, kind: Kind): { manifest: Manifest; stays: Stays[] } {
  const m = emptyManifest(), stays: Stays[] = [], rs = receiver.state;
  for (const h of wanted.houses) {
    const why = houseBlock(receiver, h), name = `${HOUSE_TIERS[h.tier].label} in ${cityName(h.city) ?? h.city}`;
    if (why) stays.push({ what: name, why }); else m.houses.push(h);
  }
  for (const id of wanted.cars) {
    if (rs.property.cars.includes(id)) stays.push({ what: CARS[id]?.label ?? id, why: 'They already own one.' }); else m.cars.push(id);
  }
  if (wanted.shop !== null) {
    const why = shopBlock(receiver);
    if (why) stays.push({ what: giver.shop?.name ?? 'the shop', why }); else m.shop = wanted.shop;
  }
  const held = rs.home.storage ?? {};
  for (const [id, n] of Object.entries(wanted.furniture)) {
    if ((held[id] ?? 0) + n > MAX_STORED_PER_ITEM) stays.push({ what: `${n} ${label(id)}`, why: `Their storage holds at most ${MAX_STORED_PER_ITEM} of one kind.` }); else m.furniture[id] = n;
  }
  const cap = kind === 'other' ? LEGACY.beliefsMax : Infinity;
  if (Object.keys(wanted.belongings).length || Object.keys(wanted.bag).length) {
    if (sum(wanted.belongings) > cap) stays.push({ what: 'belongings', why: `At most ${LEGACY.beliefsMax} units go to another player.` });
    else if (!inventoryFits(rs, wanted.belongings)) stays.push({ what: 'belongings', why: 'They have no room for them.' });
    else m.belongings = { ...wanted.belongings };
    if (Object.keys(wanted.bag).length) {
      if (!bagFits(rs, wanted.bag) || kind === 'other' && sum(wanted.bag) > cap) stays.push({ what: 'trade goods', why: 'Their bag is full.' }); else m.bag = { ...wanted.bag };
    }
  }
  // Goodwill needs the same city (the NPCs are the city's); titles are for an heir only.
  if (wanted.goodwill.length) {
    if (giver.city !== receiver.city) stays.push({ what: 'goodwill', why: 'It belongs to the city, and they are in another.' });
    // Only the people it would change something for: a share no larger than what they already have is not a hand-over.
    else m.goodwill = wanted.goodwill.filter((id) => {
      const rel = giver.state.social.rel[id], mine = rs.social.rel[id], p = rel?.npc ? carried(rel.p, kind) : 0;
      return p > 0 && (mine ? p > mine.p : Object.keys(rs.social.rel).length < MAX_RELATIONSHIPS);
    });
  }
  if (kind === 'heir') m.titles = takeableTitles(rs, wanted.titles);
  return { manifest: m, stays };
}

/** The manifest checked STRICTLY against both lives as they are now. Reads only. */
export function verify(giver: Side, receiver: Side, m: Manifest, kind: Kind, business: BusinessCollection | undefined): Verdict {
  const gs = giver.state, rs = receiver.state;
  const changed = (what: string): Verdict => no('changed', `${what} changed since it was offered.`);
  for (const h of m.houses) {
    const g = residenceOf(gs, h.city);
    if (!passable(g) || g.tier !== h.tier || packStyle(g.style, g.tier) !== h.style) return changed('A house');
    const why = houseBlock(receiver, h);
    if (why) return no('receiver_blocked', why);
  }
  for (const id of m.cars) {
    if (!gs.property.cars.includes(id)) return changed('A car');
    if (rs.property.cars.includes(id)) return no('receiver_blocked', 'You already own one of the cars.');
  }
  if (m.shop !== null) {
    const shop = business?.shops[giver.id];
    if (!shop || shop.status === 'closed' || shop.openedAt !== m.shop || shop.till > 0 || shop.owed > 0) return changed('The shop');
    const other = business?.shops[receiver.id];
    if (other && other.status !== 'closed') return no('receiver_blocked', 'You already run a shop (one each).');
  }
  const have = furnitureOf(gs);
  for (const [id, n] of Object.entries(m.furniture)) {
    if ((have[id] ?? 0) < n) return changed('The furniture');
    if (((rs.home.storage ?? {})[id] ?? 0) + n > MAX_STORED_PER_ITEM) return no('receiver_blocked', `Your storage holds at most ${MAX_STORED_PER_ITEM} of one kind.`);
  }
  for (const [id, n] of Object.entries(m.belongings)) if ((gs.inventory[id] ?? 0) < n) return changed('The belongings');
  for (const [id, n] of Object.entries(m.bag)) if ((gs.business?.bag?.[id] ?? 0) < n) return changed('The trade goods');
  if (!inventoryFits(rs, m.belongings)) return no('receiver_blocked', 'You have no room for the belongings.');
  if (!bagFits(rs, m.bag)) return no('receiver_blocked', 'Your bag is full.');
  if (kind === 'other' && sum(m.belongings) + sum(m.bag) > LEGACY.beliefsMax) return no('too_much', `At most ${LEGACY.beliefsMax} units go to another player.`);
  for (const id of m.titles) if (!gs.missions.titles.includes(id)) return changed('A title');
  if (kind === 'other' && m.titles.length) return no('not_allowed', 'Titles go to your own next character only.');
  if (m.goodwill.length && giver.city !== receiver.city) return no('receiver_blocked', 'Goodwill belongs to a city you are not in.');
  return yes;
}

/** Counts a player sees afterwards: what actually moved. */
export interface Moved { houses: number; cars: number; shop: boolean; furniture: number; belongings: number; goodwill: number; titles: number }

/** Set to throw at a named step; tests only (a hand-over interrupted in the middle must leave both lives as they were). */
let fault: ((step: string) => void) | null = null;
export const useFaultForTests = (fn: ((step: string) => void) | null): void => { fault = fn; };
const step = (name: string): void => { if (fault) fault(name); };

function takeFurniture(state: LifeState, id: string, count: number): void {
  let left = count;
  const home = state.home;
  const fromStore = Math.min(left, home.storage[id] ?? 0);
  if (fromStore) { home.storage[id] = (home.storage[id] ?? 0) - fromStore; if ((home.storage[id] ?? 0) <= 0) delete home.storage[id]; left -= fromStore; }
  if (left && home.overflow) {
    const fromOver = Math.min(left, home.overflow[id] ?? 0);
    if (fromOver) { home.overflow[id] = (home.overflow[id] ?? 0) - fromOver; if ((home.overflow[id] ?? 0) <= 0) delete home.overflow[id]; left -= fromOver; }
  }
  if (left) {
    const keep: typeof home.items = [];
    for (const item of [...home.items].reverse()) { if (left && item.itemId === id) left -= 1; else keep.unshift(item); }
    home.items = keep;
  }
  if (left) throw new Error(`legacy: furniture ${id} was short by ${left}`);
}


/**
 * Verify, then move. The shop collection is changed too (re-keyed to the receiver). Throws on a rule the callers should have checked;
 * the caller's transaction then discards everything. Returns what moved.
 */
export function apply(giver: Side, receiver: Side, m: Manifest, kind: Kind, business: BusinessCollection | undefined): Moved {
  const verdict = verify(giver, receiver, m, kind, business);
  if (!verdict.ok) throw Object.assign(new Error(`legacy: ${verdict.code}`), { verdict });
  const gs = giver.state, rs = receiver.state, moved: Moved = { houses: 0, cars: 0, shop: false, furniture: 0, belongings: 0, goodwill: 0, titles: 0 };
  for (const h of m.houses) {
    const g = residenceOf(gs, h.city)!, r = residenceOf(rs, h.city)!;
    r.tier = g.tier; r.style = cleanStyle(g.style);
    g.tier = 'starter'; g.style = { ...DEFAULT_STYLE };
    moved.houses += 1;
  }
  step('houses');
  for (const id of m.cars) {
    gs.property.cars = gs.property.cars.filter((car) => car !== id);
    if (gs.property.car === id) gs.property.car = gs.property.cars.at(-1) ?? null;
    rs.property.cars.push(id);
    moved.cars += 1;
  }
  step('cars');
  if (m.shop !== null && business) {
    const shop = business.shops[giver.id]!;
    delete business.shops[giver.id];
    business.shops[receiver.id] = { ...shop, by: { id: receiver.id, name: receiver.name }, raters: shop.raters.filter((id) => id !== receiver.id), buyers: Object.fromEntries(Object.entries(shop.buyers).filter(([id]) => id !== receiver.id)) };
    for (const report of business.reports) if (report.shop === giver.id) report.shop = receiver.id;
    moved.shop = true;
  }
  step('shop');
  for (const [id, n] of Object.entries(m.furniture)) {
    takeFurniture(gs, id, n);
    rs.home.storage[id] = (rs.home.storage[id] ?? 0) + n;
    moved.furniture += n;
  }
  step('furniture');
  for (const [id, n] of Object.entries(m.belongings)) {
    const left = (gs.inventory[id] ?? 0) - n;
    if (left > 0) gs.inventory[id] = left; else delete gs.inventory[id];
    rs.inventory[id] = (rs.inventory[id] ?? 0) + n;
    moved.belongings += n;
  }
  if (Object.keys(m.bag).length) {
    const from = gs.business.bag, to = (rs.business.bag ||= {});
    for (const [id, n] of Object.entries(m.bag)) { const left = (from[id] ?? 0) - n; if (left > 0) from[id] = left; else delete from[id]; to[id] = (to[id] ?? 0) + n; moved.belongings += n; }
  }
  step('belongings');
  for (const id of m.goodwill) {
    const rel = gs.social.rel[id];
    if (!rel || !rel.npc) continue;
    const p = carried(rel.p, kind), mine = rs.social.rel[id];
    if (mine) { if (p > mine.p) { mine.p = p; moved.goodwill += 1; } }
    else if (p > 0 && Object.keys(rs.social.rel).length < MAX_RELATIONSHIPS) {
      rs.social.rel[id] = { p, d: rel.d, n: 0, npc: true, at: rs.t, ...(rel.npcSnapshot ? { npcSnapshot: { ...rel.npcSnapshot } } : {}) };
      moved.goodwill += 1;
    }
  }
  step('goodwill');
  if (kind === 'heir') for (const id of takeableTitles(rs, m.titles)) { rs.missions.titles.push(id); moved.titles += 1; }
  step('titles');
  return moved;
}

/** Plain lines for the confirm screen and the notices: what the manifest holds. */
export function describe(m: Manifest): string[] {
  const lines: string[] = [];
  for (const h of m.houses) lines.push(`${HOUSE_TIERS[h.tier]?.label ?? 'A house'} in ${cityName(h.city) ?? h.city}`);
  if (m.cars.length) lines.push(m.cars.length === 1 ? (CARS[m.cars[0]!]?.label ?? 'A car') : `${m.cars.length} cars`);
  if (m.shop !== null) lines.push('A shop with its stock');
  const pieces = sum(m.furniture);
  if (pieces) lines.push(`${pieces} ${pieces === 1 ? 'piece' : 'pieces'} of furniture`);
  const things = sum(m.belongings) + sum(m.bag);
  if (things) lines.push(`${things} ${things === 1 ? 'belonging' : 'belongings'}`);
  if (m.goodwill.length) lines.push(`Goodwill with ${m.goodwill.length} ${m.goodwill.length === 1 ? 'person' : 'people'} in the city`);
  if (m.titles.length) lines.push(`${m.titles.length} ${m.titles.length === 1 ? 'title' : 'titles'}`);
  return lines;
}

/** A manifest read back from storage or from a request: only the known shapes, bounded. */
export function readManifest(value: unknown): Manifest {
  const m = emptyManifest();
  if (!record(value)) return m;
  if (Array.isArray(value.houses)) for (const h of value.houses.slice(0, 20)) if (record(h) && typeof h.city === 'string' && h.city.length < 40 && typeof h.tier === 'string' && rank(h.tier) > 0 && Number.isSafeInteger(h.style)) m.houses.push({ city: h.city, tier: h.tier as HouseTierId, style: h.style as number });
  if (Array.isArray(value.cars)) m.cars = [...new Set(value.cars.filter((id): id is CarId => typeof id === 'string' && Object.hasOwn(CARS, id)))].slice(0, 20);
  if (Number.isSafeInteger(value.shop)) m.shop = value.shop as number;
  const counts = (input: unknown, limit: number, ok: (id: string) => boolean): Record<string, number> => {
    const out: Record<string, number> = {};
    if (record(input)) for (const [id, n] of Object.entries(input).slice(0, limit)) if (ok(id) && Number.isSafeInteger(n) && (n as number) > 0 && (n as number) <= MAX_STACK) out[id] = n as number;
    return out;
  };
  m.furniture = counts(value.furniture, 200, (id) => Object.hasOwn(FURNITURE, id));
  m.belongings = counts(value.belongings, MAX_KINDS, isId);
  m.bag = counts(value.bag, 40, isId);
  if (Array.isArray(value.goodwill)) m.goodwill = value.goodwill.filter((id): id is string => typeof id === 'string' && id.length < 64).slice(0, LEGACY.goodwill.count);
  if (Array.isArray(value.titles)) m.titles = value.titles.filter((id): id is MissionTitleId => typeof id === 'string' && id.length < 40).slice(0, 4);
  return m;
}
