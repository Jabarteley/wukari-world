/**
 * OWNER: world
 * CITY WORKS: one shared goal at a time per city (a clinic, a market roof, a football pitch) that residents fund with game money.
 * A finished work changes the city in a cheap, visible way: a line on the Gist app's works card and a label in the list, and a line in the
 * gist. No new 3D assets. The elected head of the city (docs/POLITICS.md) chooses the ORDER the works are done in.
 *
 * STORED   ctx.collection(db, 'works') = { v: 1, cities: { [cityId]: { order?: WorkId[], by?: string (a name, at the time), at?: ms,
 *          paid: { [WorkId]: { sum, gifts, done?: ms } } } } }. A new top-level collection, created on first use; nothing existing changes.
 * MONEY    game money (naira, the game's own unit) only. A gift goes through the life's `civic.treasury` pay operation like a fee does, so the
 *          wallet ledger shows it. Only the active work takes gifts; the gift that would pass the price is cut to what is left.
 * LIMITS   GIVE_MIN..GIVE_MAX per gift and DAILY_MAX per player per Lagos day (a per-day counter in the city's record, keyed by a hash of
 *          the player so that no id is stored).
 * Portable: no Node imports.
 */
export type WorkId = 'clinic' | 'market-roof' | 'pitch';
export interface WorkDefinition { id: WorkId; label: string; cost: number; /** The line on the place card once it stands. */ done: string; /** The line while it is being funded. */ doing: string }
export const WORKS: readonly WorkDefinition[] = Object.freeze([
  { id: 'clinic', label: 'Clinic', cost: 300000, done: 'A clinic stands here: people here recover faster.', doing: 'A clinic is being built.' },
  { id: 'market-roof', label: 'Market roof', cost: 200000, done: 'The market has a roof now: rain no longer stops trading.', doing: 'A roof for the market is being paid for.' },
  { id: 'pitch', label: 'Football pitch', cost: 150000, done: 'There is a proper football pitch here.', doing: 'A football pitch is being paid for.' },
]);
export const WORK_IDS: readonly WorkId[] = WORKS.map((work) => work.id);
export const GIVE_MIN = 100, GIVE_MAX = 5000, DAILY_MAX = 10000;
export const workOf = (id: unknown): WorkDefinition | undefined => WORKS.find((work) => work.id === id);

export interface WorkProgress { sum: number; gifts: number; done?: number }
export interface CityWorks { order?: WorkId[]; by?: string; at?: number; paid: Record<string, WorkProgress>; day?: { n: number; by: Record<string, number> } }
export interface WorksCollection { v: 1; cities: Record<string, CityWorks> }

const record = (value: unknown): value is Record<string, unknown> => value !== null && typeof value === 'object' && !Array.isArray(value);
const whole = (value: unknown): value is number => typeof value === 'number' && Number.isSafeInteger(value) && value >= 0;

/** The city's record, made or repaired in place (a write only). */
export function cityWorks(works: WorksCollection, city: string): CityWorks {
  if (!record(works.cities)) works.cities = {};
  const found = (record(works.cities[city]) ? works.cities[city] : (works.cities[city] = { paid: {} })) as CityWorks;
  if (!record(found.paid)) found.paid = {};
  if (found.order !== undefined && !Array.isArray(found.order)) delete found.order;
  return found;
}
/** What a read sees: nothing is created. */
export function peekWorks(db: unknown, city: string): CityWorks {
  const all = record(db) && record(db.works) && record((db.works as Record<string, unknown>).cities) ? (db.works as unknown as WorksCollection).cities : {};
  const found = all[city];
  return record(found) && record(found.paid) ? found as CityWorks : { paid: {} };
}
/** The order in force: the officials' choice, then the rest in the catalogue's order. Unknown and repeated ids are left out. */
export function orderOf(city: CityWorks): WorkId[] {
  const seen = new Set<WorkId>(), out: WorkId[] = [];
  for (const id of [...(Array.isArray(city.order) ? city.order : []), ...WORK_IDS]) if (workOf(id) && !seen.has(id as WorkId)) { seen.add(id as WorkId); out.push(id as WorkId); }
  return out;
}
export const sumOf = (city: CityWorks, id: WorkId): number => { const paid = city.paid[id]; return whole(paid?.sum) ? paid.sum : 0; };
export const doneAt = (city: CityWorks, id: WorkId): number | null => { const at = city.paid[id]?.done; return whole(at) && at > 0 ? at : null; };
/** The work that takes gifts now: the first of the order that is not finished. null when all stand. */
export function activeOf(city: CityWorks): WorkDefinition | null {
  for (const id of orderOf(city)) if (doneAt(city, id) === null) return workOf(id) ?? null;
  return null;
}

export interface WorksView {
  city: string
  active: { id: WorkId; label: string; line: string; paid: number; cost: number; gifts: number } | null
  /** Finished works, oldest first, with the line the place card shows. */
  done: { id: WorkId; label: string; line: string; at: number }[]
  /** The order in force, finished ones included. */
  order: WorkId[]
  /** The works still to be funded after the active one, in order. */
  later: { id: WorkId; label: string }[]
  limits: { min: number; max: number; daily: number }
}
export function viewOf(city: string, works: CityWorks): WorksView {
  const active = activeOf(works);
  return {
    city,
    active: active ? { id: active.id, label: active.label, line: active.doing, paid: Math.min(active.cost, sumOf(works, active.id)), cost: active.cost, gifts: works.paid[active.id]?.gifts ?? 0 } : null,
    done: orderOf(works).flatMap((id) => { const at = doneAt(works, id), work = workOf(id); return at !== null && work ? [{ id, label: work.label, line: work.done, at }] : []; }).sort((a, b) => a.at - b.at),
    order: orderOf(works),
    later: orderOf(works).filter((id) => id !== active?.id && doneAt(works, id) === null).map((id) => ({ id, label: workOf(id)!.label })),
    limits: { min: GIVE_MIN, max: GIVE_MAX, daily: DAILY_MAX },
  };
}

export interface Refusal { code: string; reason: string }
/** Why this gift cannot be made (the amount only; the wallet is checked when it is paid). */
export function giveBlock(works: CityWorks, amount: unknown, given: number): Refusal | null {
  if (typeof amount !== 'number' || !Number.isSafeInteger(amount)) return { code: 'invalid_amount', reason: 'Give a whole amount.' };
  if (amount < GIVE_MIN) return { code: 'amount_too_small', reason: `The smallest gift is ${GIVE_MIN}.` };
  if (amount > GIVE_MAX) return { code: 'amount_too_large', reason: `The most for one gift is ${GIVE_MAX}.` };
  if (!activeOf(works)) return { code: 'all_done', reason: 'Every work here is finished.' };
  if (given + amount > DAILY_MAX) return { code: 'daily_limit', reason: `You can give up to ${DAILY_MAX} a day. Try again tomorrow.` };
  return null;
}
/** The part of a gift the active work still needs (a gift never overpays). */
export function room(works: CityWorks, work: WorkDefinition): number { return Math.max(0, work.cost - sumOf(works, work.id)); }
/** Count a gift of `amount`. Returns true when this gift finished the work. */
export function countGift(works: CityWorks, work: WorkDefinition, amount: number, now: number): boolean {
  const paid = (works.paid[work.id] ||= { sum: 0, gifts: 0 });
  paid.sum = Math.min(work.cost, sumOf(works, work.id) + amount); paid.gifts = Math.min(1e9, (whole(paid.gifts) ? paid.gifts : 0) + 1);
  if (paid.sum >= work.cost && !paid.done) { paid.done = now; return true; }
  return false;
}
/** What a player has already given on this Lagos day, and a way to add to it. The key is a hash, never an id. */
export function givenToday(works: CityWorks, day: number, key: string): number { return works.day && works.day.n === day && whole(works.day.by?.[key]) ? works.day.by[key]! : 0; }
export function addToday(works: CityWorks, day: number, key: string, amount: number): void {
  if (!works.day || works.day.n !== day) works.day = { n: day, by: {} };
  if (Object.keys(works.day.by).length < 2000 || key in works.day.by) works.day.by[key] = (works.day.by[key] ?? 0) + amount;
}
/** A proposed order: every id known and none repeated (the rest follow in catalogue order). */
export function orderBlock(order: unknown): Refusal | null {
  if (!Array.isArray(order) || order.length < 1 || order.length > WORKS.length) return { code: 'invalid_order', reason: 'Choose the works in the order you want them.' };
  const seen = new Set<unknown>();
  for (const id of order) { if (!workOf(id) || seen.has(id)) return { code: 'invalid_order', reason: 'Choose each work once.' }; seen.add(id); }
  return null;
}
