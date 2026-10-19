/**
 * OWNER: minigames (docs/MINI-GAMES.md)
 * THE MARKET HAGGLE, the server half. A person stands in a city's main market (Lagos: Balogun Market and the Computer Village corner), opens a talk with an
 * AI-played trader about one thing for sale, and makes offers. Everything that matters is decided here:
 *
 *   PRICE   the trader's floor is the house floor of server/house/haggle.ts (`priceList`, `decide`: a seller never goes below it and takes a fair offer at once),
 *           moved a few percent either way by the Lagos day so tomorrow's floor is not today's. The floor never leaves the server; a deal is a quote held for
 *           HAGGLE.quoteMs; the browser sends an offer and nothing else, so there is no price to trust.
 *   MEMORY  the trader remembers the person across sessions (TraderRow): a first visit, a return the same day ("You again? Last price." - two offers only), a
 *           return on another day, a regular (three purchases: one more offer and an opening ask a little lower). The floor does not move for anyone.
 *   BUYING  a deal is turned into a real purchase through the life's own sale step ('missions.server' op 'sale', src/game/systems/agent-missions.ts): the life checks the
 *           price against 70% of the list, the purse and the bag; the money is a sink, as at the boutique; the item goes into the bag of trade goods. At most
 *           BUYS_PER_DAY a game day. Nothing is earned here: the prize of a good haggle is the price.
 *   WORDS   most lines are written (haggle-lines.ts, Pidgin or plain English, warm or tough); a model may rephrase a verdict line within a small daily cap
 *           (REPHRASE_PLAYER_DAY a person, REPHRASE_SERVER_DAY the server) and its answer is thrown away unless it carries only the numbers the line had.
 *   BEST    the best bought haggle (the most naira saved) is kept for the card and clip.
 */
import { castOf, venueFor } from '../house/cast.ts';
import { HAGGLE, decide, priceList } from '../house/haggle.ts';
import type { ItemInput, PricedItem } from '../house/haggle.ts';
import { hash } from '../house/lines.ts';
import { agentWords } from '../moderation/agent-words.ts';
import { routerOf } from '../models/service.ts';
import type { AskInput, AskResult } from '../models/router.ts';
import { sha256Hex } from '../../src/game/util.ts';
import { cachedCityContent, cityRules } from '../../src/game/cities/index.ts';
import { BUSINESS_PRODUCTS } from '../../src/game/content/business.ts';
import type { HaggleBest, HaggleGrade, HaggleItemView, HaggleLine, HaggleMemory, HaggleStalls, HaggleTalkView, HaggleTraderView } from '../../src/types/minigames.ts';
import type { Db, RouteContext, SessionRecord } from '../types.ts';
import type { CityId } from '../../src/types/protocol.ts';
import { dayOf, idOf, no, whole, workerOf } from './common.ts';
import type { Refused, Small } from './common.ts';
import { LINES_KEPT, TALKS_KEPT, TRADERS_KEPT, minigamesOf, peekMinigames } from './store.ts';
import type { HaggleRow, MiniGamesCollection, StoredLine, TalkRow, TraderRow } from './store.ts';
import { greeting, say, youSay, youTake } from './haggle-lines.ts';
import type { LineKind, Mood, Voice } from './haggle-lines.ts';

export const BUYS_PER_DAY = 3, REPHRASE_PLAYER_DAY = 3, REPHRASE_SERVER_DAY = 60;
/** The most a trader will give away in this game: the house's cap is 30; the floor of an item sits between 75% and 95% of its list price, moved a little each day. */
export const MARKET_DISCOUNT = 25;
export const REGULAR_AFTER = 3;
const MODEL_WORDS = 160;

export interface RephrasePlan { name: string; voice: Voice; mood: Mood; written: string; me: string; kind: string }
export interface TraderSpec { key: string; name: string; stall: string; blurb: string; voice: Voice; mood: Mood; items: readonly ItemInput[] }
const GOODS = new Set(['fabric', 'crafts']);
const LAGOS: readonly TraderSpec[] = Object.freeze([
  { key: 'sade', name: 'Alhaja Sade', stall: 'Balogun Market', voice: 'pidgin', mood: 'warm', blurb: 'Cloth by the yard on Lagos Island: ankara, adire and aso-oke. Sharp with a price, kind to a regular.',
    items: [{ id: 'ankara', label: 'Ankara wax print', base: 2000, floorShare: 0.82 }, { id: 'adire', label: 'Adire cloth', base: 2400, floorShare: 0.82 }, { id: 'aso-oke', label: 'Aso-oke strip cloth', base: 3000, floorShare: 0.88 }, { id: 'indigo', label: 'Indigo-dyed cloth', base: 2200, floorShare: 0.86 }] },
  { key: 'emeka', name: 'Mr Emeka', stall: 'Computer Village corner', voice: 'pidgin', mood: 'tough', blurb: 'Caps, sandals and baskets from the busy corner traders. He counts every naira twice and never forgets a face.',
    items: [{ id: 'cap', label: 'Embroidered cap', base: 1800, floorShare: 0.85 }, { id: 'leather-sandals', label: 'Leather sandals', base: 2500, floorShare: 0.85 }, { id: 'basket', label: 'Woven basket', base: 1000, floorShare: 0.82 }] },
]);

/** The product ids of this game's own table at their own base price: a trader sells only what exists in the game, at the game's list price. */
function goodsOf(items: readonly ItemInput[]): ItemInput[] {
  return items.flatMap((item) => { const product = BUSINESS_PRODUCTS.get(item.id); return product && GOODS.has(product.type) ? [{ id: product.id, label: product.label, base: product.base, ...(item.floorShare !== undefined ? { floorShare: item.floorShare } : {}) }] : []; });
}

/** The city's main market, as a venue: Lagos's is `market` (named Balogun Market here); another city's is its first market venue. Null when it has none. */
export function marketOf(cityId: string): { venue: string; name: string } | null {
  if (!cityRules(cityId)) return null;
  const venue = venueFor(cityId, ['market', 'main-market'], 'seller');
  if (!venue) return null;
  const name = cityId === 'lagos' ? 'Balogun Market' : cachedCityContent(cityId)?.venues.find((entry) => entry.id === venue)?.name ?? 'the market';
  return { venue, name };
}

/** The traders of a city's market: Lagos has two of its own, every other city has the market seller of its country's cast. */
export function tradersOf(cityId: string): TraderSpec[] {
  const market = marketOf(cityId);
  if (!market) return [];
  if (cityId === 'lagos') return LAGOS.map((spec) => ({ ...spec, items: goodsOf(spec.items) }));
  const seller = castOf(cityId).find((spec) => spec.role === 'seller');
  if (!seller) return [];
  const items = goodsOf((seller.items ?? []).map((entry) => ({ id: entry.id, label: entry.id, base: 0, ...(entry.floorShare !== undefined ? { floorShare: entry.floorShare } : {}) })));
  return items.length ? [{ key: seller.key, name: seller.name, stall: market.name, voice: seller.voice, mood: 'warm' as Mood, blurb: `${seller.name} keeps a stall at ${market.name}. Fair with a price, fair with a regular.`, items }] : [];
}

/** Today's price of an item at a trader: the house floor moved a few percent by the day. */
export function pricedToday(trader: TraderSpec, itemId: string, day: number): PricedItem | null {
  const items = trader.items.map((item) => {
    const shift = ((hash(`${trader.key}|${item.id}|${day}`) % 9) - 4) / 100;
    return { ...item, floorShare: Math.max(0.77, Math.min(0.95, (item.floorShare ?? 0.85) + shift)) };
  });
  return priceList(items, MARKET_DISCOUNT).find((entry) => entry.id === itemId) ?? null;
}
const up = (value: number): number => Math.ceil(value / HAGGLE.step - 1e-9) * HAGGLE.step;

/** How well a price did against what was possible: coarse, so a card never says where the floor was. */
export function gradeOf(item: PricedItem, price: number): HaggleGrade {
  const room = Math.max(1, item.list - item.floor), share = (item.list - price) / room;
  return share >= 0.95 ? 'floor' : share >= 0.65 ? 'sharp' : share >= 0.3 ? 'good' : 'fair';
}
export const GRADE_WORDS: Readonly<Record<HaggleGrade, string>> = Object.freeze({ fair: 'A fair price', good: 'A good haggle', sharp: 'A sharp haggle', floor: 'The trader\'s lowest' });

export function memoryOf(row: Pick<TraderRow, 'deals' | 'dealDay' | 'dealsToday'>, day: number): HaggleMemory {
  if (row.dealDay === day && row.dealsToday > 0) return 'again';
  if (row.deals >= REGULAR_AFTER) return 'regular';
  return row.deals > 0 ? 'returning' : 'new';
}
const openKind = (memory: HaggleMemory): LineKind => (memory === 'again' ? 'again' : memory === 'regular' ? 'regular' : memory === 'returning' ? 'returning' : 'open');

/** The words that make sure a model's rephrase carries nothing new: the same amounts, no percent, no promise of free. Null when the rephrase cannot be said. */
export function cleanRephrase(written: string, reply: string, kind?: string): string | null {
  const text = reply.replace(/[\r\n]+/g, ' ').replace(/^["'“”‘’\s]+|["'“”‘’\s]+$/g, '').replace(/\s+/g, ' ');
  if (text.length < 8 || text.length > MODEL_WORDS || text === written) return null;
  if (/%|\bfree\b|\bdiscount\b|\bhttps?\b|www\.|@/i.test(text)) return null;
  // The verdict is the server's: a line that agrees to a price it refused, or refuses one it agreed to, is thrown away.
  if (kind === 'accept' && /\b(no|not|never|nope|cannot|can't|insult|too low)\b/i.test(text)) return null;
  if (kind !== undefined && kind !== 'accept' && /\b(deal|agreed|sold|it is yours|na yours|i accept)\b/i.test(text)) return null;
  const amounts = (value: string): string[] => (value.match(/\d[\d,]*/g) ?? []).map((digits) => digits.replace(/,/g, ''));
  const allowed = new Set(amounts(written)), found = amounts(text);
  if (found.some((digits) => !allowed.has(digits)) || amounts(written).some((digits) => !found.includes(digits))) return null;
  return agentWords(text, { toMinor: true }).ok ? text : null;
}

export function haggleService(ctx: RouteContext, deps: { ask?: (input: AskInput) => Promise<AskResult> } = {}) {
  const worker = workerOf(ctx);
  const ask = deps.ask ?? ((input: AskInput): Promise<AskResult> => routerOf(ctx).ask(input));
  const open = (): boolean => ctx.checks?.setting?.('haggleOpen') !== false;
  const modelOn = (): boolean => ctx.checks?.setting?.('haggleModel') !== false;

  function holder(db: Db, me: string): HaggleRow {
    const c = minigamesOf(ctx, db);
    const row = c.haggle[me] ??= { traders: {}, best: null };
    if (!row.traders || typeof row.traders !== 'object') row.traders = {};
    return row;
  }
  function traderRow(row: HaggleRow, key: string, day: number): TraderRow {
    const found = row.traders[key] ??= { visits: 0, deals: 0, dealDay: 0, dealsToday: 0, seen: day, talks: {} };
    if (!found.talks || typeof found.talks !== 'object') found.talks = {};
    found.seen = day;
    const keys = Object.keys(row.traders);
    if (keys.length > TRADERS_KEPT) for (const old of keys.filter((k) => k !== key).sort((a, b) => row.traders[a]!.seen - row.traders[b]!.seen).slice(0, keys.length - TRADERS_KEPT)) delete row.traders[old];
    return found;
  }
  function dayRow(c: MiniGamesCollection, me: string, day: number) {
    const row = c.days[me];
    return row && row.day === day ? row : (c.days[me] = { day, buys: 0, rephrased: 0, earned: 0 });
  }
  const buysToday = (c: MiniGamesCollection | null, me: string, day: number): number => { const row = c?.days[me]; return row && row.day === day ? row.buys : 0; };

  function viewTalk(item: PricedItem | null, talk: TalkRow, now: number): HaggleTalkView {
    const live = talk.deal !== null && !talk.bought && now - talk.dealAt <= HAGGLE.quoteMs;
    const state = talk.bought ? 'bought' as const : live ? 'deal' as const : talk.rounds >= HAGGLE.rounds ? 'final' as const : 'open' as const;
    const list = item?.list ?? 0, deal = talk.bought || live ? talk.deal : null;
    return { item: item?.id ?? '', label: item?.label ?? '', list, ask: Math.max(item?.floor ?? 0, Math.min(list, talk.ask)), roundsLeft: Math.max(0, HAGGLE.rounds - talk.rounds), state,
      deal, dealUntil: live ? talk.dealAt + HAGGLE.quoteMs : null, lines: talk.lines.map(shown), saved: deal !== null ? Math.max(0, list - deal) : 0, grade: deal !== null ? talk.grade ?? null : null };
  }
  function viewTrader(spec: TraderSpec, row: TraderRow | undefined, day: number, now: number, name = ''): HaggleTraderView {
    const memory: HaggleMemory = row ? memoryOf(row, day) : 'new';
    const talks = Object.entries(row?.talks ?? {}).filter(([, talk]) => talk.day === day).map(([id, talk]) => viewTalk(pricedToday(spec, id, day), talk, now));
    const items: HaggleItemView[] = spec.items.map((item) => { const product = BUSINESS_PRODUCTS.get(item.id); return { id: item.id, label: product?.label ?? item.label, icon: product?.icon ?? '🧺', list: pricedToday(spec, item.id, day)?.list ?? item.base }; });
    return { key: spec.key, name: spec.name, stall: spec.stall, blurb: spec.blurb, ai: true, items, memory, greeting: greeting(spec.voice, spec.mood, memory, name), talks };
  }
  function bestView(row: HaggleRow | undefined): HaggleBest | null {
    const b = row?.best;
    return b ? { trader: b.trader, stall: b.stall, city: b.city, item: b.item, list: b.list, price: b.price, saved: b.saved, grade: b.grade, at: b.at, lines: b.lines.map(shown) } : null;
  }
  const shown = (line: StoredLine): HaggleLine => ({ who: line.who, text: line.text });
  function push(talk: TalkRow, line: StoredLine): void { talk.lines.push(line); if (talk.lines.length > LINES_KEPT) talk.lines.splice(0, talk.lines.length - LINES_KEPT); }

  /** Everything a request names, checked: the switch, the city's market, the trader and the item, the life and that it stands in the market. */
  function resolve(session: SessionRecord, body: Record<string, unknown>, now: number) {
    if (!open()) return no('haggle_closed', 'The market is closed for now. Try again later.');
    const cityId = typeof body.cityId === 'string' ? body.cityId : '', market = marketOf(cityId), traderKey = idOf(body.trader), itemId = idOf(body.item);
    const trader = market ? tradersOf(cityId).find((spec) => spec.key === traderKey) : undefined;
    if (!market || !trader) return no('unknown_trader', 'There is no such trader in this market.');
    if (!itemId || !trader.items.some((item) => item.id === itemId)) return no('unknown_item', 'This trader does not sell that.');
    const life = worker(session, cityId);
    if (life.activeAction !== null) return no('busy', 'Finish what you are doing first.');
    if (life.location !== market.venue) return no('not_at_market', `Go to ${market.name} first: a haggle needs you at the stall.`);
    const day = dayOf(now), item = pricedToday(trader, itemId, day);
    if (!item) return no('unknown_item', 'This trader does not sell that.');
    return { ok: true as const, cityId, market, trader, item, life, day };
  }

  /** The talk of today for this item, begun if there is none, if it was bought, or if a held deal lapsed. Pushes the trader's opening line when it begins. */
  function beginTalk(row: TraderRow, spec: TraderSpec, item: PricedItem, day: number, now: number, name: string): { talk: TalkRow; fresh: boolean } {
    const found = row.talks[item.id];
    const lapsed = found && found.deal !== null && !found.bought && now - found.dealAt > HAGGLE.quoteMs;
    if (found && found.day === day && !found.bought && !lapsed) return { talk: found, fresh: false };
    const memory = memoryOf(row, day);
    const talk: TalkRow = { day, ask: item.list, rounds: memory === 'again' || lapsed ? 2 : memory === 'regular' ? -1 : 0, deal: null, dealAt: 0, bought: false, lines: [] };
    if (memory === 'regular') talk.ask = Math.max(item.floor, Math.min(item.list, up(item.list - (item.list - item.floor) * 0.2)));
    const keys = Object.keys(row.talks);
    if (keys.length >= TALKS_KEPT) for (const old of keys.filter((k) => k !== item.id).sort((a, b) => row.talks[a]!.day - row.talks[b]!.day).slice(0, keys.length - TALKS_KEPT + 1)) delete row.talks[old];
    row.talks[item.id] = talk; row.visits += 1;
    if (lapsed) push(talk, { who: 'trader', text: say(spec.voice, spec.mood, 'expired', { item: item.label }, `${spec.key}|${item.id}|${now}`) });
    const kind = openKind(memory);
    push(talk, { who: 'trader', text: say(spec.voice, spec.mood, kind, { item: item.label, price: talk.ask, name }, `${spec.key}|${item.id}|${day}|${row.visits}`) });
    return { talk, fresh: true };
  }
  const lastTrader = (talk: TalkRow): string => [...talk.lines].reverse().find((line) => line.who === 'trader')?.text ?? '';

  /** The name a trader uses for a regular: the person's own name, as the game shows it. */
  const playerName = (session: SessionRecord): string => ctx.publicSession(session).name;

  return {
    marketOf, tradersOf,

    /** A read: the city's market, its traders with what they remember of the caller, the day's buys and the best haggle. */
    stalls(db: Db, session: SessionRecord, cityId: string, now: number): { ok: true; stalls: HaggleStalls } | Refused {
      const market = marketOf(cityId);
      if (!market) return no('no_market', 'This city has no market to haggle in yet.');
      const me = session.publicId, day = dayOf(now), c = peekMinigames(db), mine = c?.haggle[me];
      const here = session.cities?.[cityId]?.state?.location === market.venue;
      return { ok: true, stalls: { open: open(), city: cityId, marketName: market.name, marketVenue: market.venue, here,
        traders: tradersOf(cityId).map((spec) => viewTrader(spec, mine?.traders[spec.key], day, now, playerName(session))), today: { bought: buysToday(c, me, day), cap: BUYS_PER_DAY }, best: bestView(mine) } };
    },

    /** Starts (or resumes) today's talk about an item. */
    open(db: Db, session: SessionRecord, body: Record<string, unknown>, now: number): { ok: true; trader: HaggleTraderView; said: string } | Refused {
      const r = resolve(session, body, now);
      if (!r.ok) return r;
      const me = session.publicId, c = minigamesOf(ctx, db), h = holder(db, me), row = traderRow(h, r.trader.key, r.day);
      if (buysToday(c, me, r.day) >= BUYS_PER_DAY) return no('day_limit', `That is ${BUYS_PER_DAY} haggled buys today. Come back tomorrow.`);
      const { talk } = beginTalk(row, r.trader, r.item, r.day, now, playerName(session));
      return { ok: true, trader: viewTrader(r.trader, row, r.day, now, playerName(session)), said: lastTrader(talk) };
    },

    /** Inside ctx.once: one offer. The server decides the verdict from the floor it never shows. */
    offer(db: Db, session: SessionRecord, body: Record<string, unknown>, now: number): Small | Refused {
      const r = resolve(session, body, now);
      if (!r.ok) return r;
      const offered = whole(body.offer, 1_000_000);
      if (offered < HAGGLE.step) return no('invalid_offer', 'Make an offer in naira.');
      const me = session.publicId, h = holder(db, me), row = traderRow(h, r.trader.key, r.day);
      const talk = row.talks[r.item.id];
      if (!talk || talk.day !== r.day) return no('open_first', 'Start the talk first.');
      if (talk.bought) return no('already_bought', 'You bought that already today.');
      if (talk.deal !== null && now - talk.dealAt > HAGGLE.quoteMs) { beginTalk(row, r.trader, r.item, r.day, now, playerName(session)); return { ok: true, said: lastTrader(row.talks[r.item.id]!) }; }
      // A price already agreed stays agreed; nothing said afterwards lowers it.
      if (talk.deal !== null) return { ok: true, said: lastTrader(talk) };
      const verdict = decide(r.item, talk, offered);
      push(talk, { who: 'you', text: youSay(offered) });
      const text = say(r.trader.voice, r.trader.mood, verdict.kind, { item: r.item.label, price: verdict.price }, `${r.trader.key}|${r.item.id}|${talk.rounds}|${offered}|${talk.lines.length}`);
      push(talk, { who: 'trader', text, k: verdict.kind });
      if (verdict.kind === 'accept') { talk.dealAt = now; talk.grade = gradeOf(r.item, verdict.price); }
      return { ok: true, said: text };
    },

    /** What a rephrase of the trader's latest line needs (a read), or null: the switch is off, the person's or the server's daily cap is used, or there is no line. */
    rephrasePlan(db: Db, session: SessionRecord, body: Record<string, unknown>, now: number): RephrasePlan | null {
      if (!modelOn()) return null;
      const trader = tradersOf(typeof body.cityId === 'string' ? body.cityId : '').find((spec) => spec.key === body.trader), itemId = idOf(body.item);
      if (!trader || !itemId) return null;
      const day = dayOf(now), me = session.publicId, c = peekMinigames(db);
      const talk = c?.haggle[me]?.traders[trader.key]?.talks[itemId];
      const last = talk?.lines.at(-1), written = last?.who === 'trader' ? last.text : '';
      // Only a verdict line (accept, counter, refuse, final) is rephrased: an opening or a closing line stays as written.
      if (!talk || !last || !written || !last.k || talk.day !== day) return null;
      const mine = c?.days[me], used = mine && mine.day === day ? mine.rephrased : 0;
      if (used >= REPHRASE_PLAYER_DAY || (c?.model.day === day ? c.model.used : 0) >= REPHRASE_SERVER_DAY) return null;
      return { name: trader.name, voice: trader.voice, mood: trader.mood, written, me, kind: last.k };
    },
    /** Asks the model to say the line another way. Null when it cannot, or when its answer carries anything the written line did not. Never inside a transaction. */
    async rephraseAsk(plan: RephrasePlan): Promise<{ text: string; written: string } | null> {
      const messages = [
        { role: 'system' as const, content: `You are ${plan.name}, an AI-played market trader in a game, speaking ${plan.voice === 'pidgin' ? 'Nigerian Pidgin' : 'plain English'} in a ${plan.mood} manner. Rephrase the line you are given in your own words, in one short sentence. Keep every amount exactly as it is. Add no new numbers, no discounts and no promises. Reply with the sentence only.` },
        { role: 'user' as const, content: plan.written },
      ];
      try {
        const answer = await ask({ purpose: 'agent-talk', messages, maxTokens: 80, playerId: `p_${sha256Hex(`allworld-minigames-v1|${plan.me}`).slice(0, 32)}`, carriesPlayerWords: false, timeoutMs: 5000 });
        const clean = answer.ok ? cleanRephrase(plan.written, answer.text, plan.kind) : null;
        return clean ? { text: clean, written: plan.written } : null;
      } catch { return null; }
    },
    /** Puts a clean rephrase in place of the written line it was made from (when that line is still the trader's latest), and counts it. */
    useRephrase(db: Db, session: SessionRecord, body: Record<string, unknown>, now: number, made: { text: string; written: string }): boolean {
      const trader = tradersOf(typeof body.cityId === 'string' ? body.cityId : '').find((spec) => spec.key === body.trader), itemId = idOf(body.item);
      if (!trader || !itemId) return false;
      const me = session.publicId, talk = holder(db, me).traders[trader.key]?.talks[itemId];
      if (!talk || talk.lines.at(-1)?.text !== made.written) return false;
      // The rephrase takes the line's place but not its kind: it is said once and never rephrased again.
      talk.lines[talk.lines.length - 1] = { who: 'trader', text: made.text };
      const c = minigamesOf(ctx, db), day = dayOf(now);
      dayRow(c, me, day).rephrased += 1;
      if (c.model.day !== day) c.model = { day, used: 0 };
      c.model.used += 1;
      return true;
    },

    /** Inside ctx.once: turns the held deal into a real purchase. */
    buy(db: Db, session: SessionRecord, body: Record<string, unknown>, now: number): Small | Refused {
      const r = resolve(session, body, now);
      if (!r.ok) return r;
      const me = session.publicId, c = minigamesOf(ctx, db), h = holder(db, me), row = traderRow(h, r.trader.key, r.day), talk = row.talks[r.item.id];
      if (!talk || talk.day !== r.day || talk.deal === null) return no('no_deal', 'Agree a price with the trader first.');
      if (talk.bought) return { ok: true, said: lastTrader(talk), paid: talk.deal };
      if (now - talk.dealAt > HAGGLE.quoteMs) { beginTalk(row, r.trader, r.item, r.day, now, playerName(session)); return no('deal_lapsed', 'That price was held for ten minutes and the time is up. Start again.'); }
      const today = dayRow(c, me, r.day);
      if (today.buys >= BUYS_PER_DAY) return no('day_limit', `That is ${BUYS_PER_DAY} haggled buys today. Come back tomorrow.`);
      const price = talk.deal;
      const acted = ctx.act(r.life, { type: 'missions.server', cityId: r.cityId as CityId, payload: { op: 'sale', shop: `${r.trader.name}, ${r.trader.stall}`.slice(0, 24), product: r.item.id, label: r.item.label.slice(0, 32), price, list: r.item.list, ref: `haggle|${r.trader.key}|${r.item.id}|${talk.dealAt}`, kind: 'goods' },
        stateGuard: 'The talk row is marked bought in the same transaction and the purchase reference is kept in the life, so a repeat is refused.' });
      if (!acted.ok) {
        const reason = 'reason' in acted && typeof acted.reason === 'string' ? acted.reason : 'The purchase did not go through.';
        return no(acted.code === 'insufficient_funds' ? 'short' : acted.code === 'bag_full' ? 'bag_full' : 'sale_failed', reason);
      }
      talk.bought = true; today.buys += 1;
      row.dealsToday = row.dealDay === r.day ? row.dealsToday + 1 : 1; row.deals += 1; row.dealDay = r.day; row.last = { item: r.item.id, price, at: now };
      const text = say(r.trader.voice, r.trader.mood, 'bought', { item: r.item.label, price }, `${r.trader.key}|${r.item.id}|${now}`);
      push(talk, { who: 'you', text: youTake(price) }); push(talk, { who: 'trader', text });
      const saved = r.item.list - price, grade = talk.grade ?? gradeOf(r.item, price);
      if (!h.best || saved > h.best.saved) h.best = { trader: r.trader.name, stall: r.trader.stall, city: r.cityId, item: r.item.label, list: r.item.list, price, saved, grade, at: now, lines: talk.lines.slice(-6).map((line) => ({ ...line })) };
      return { ok: true, said: text, paid: price };
    },

    /** The trader as the caller sees them now (read after a write). */
    traderView(db: Db, session: SessionRecord, cityId: string, traderKey: unknown, now: number): HaggleTraderView | null {
      const spec = tradersOf(cityId).find((entry) => entry.key === traderKey);
      return spec ? viewTrader(spec, peekMinigames(db)?.haggle[session.publicId]?.traders[spec.key], dayOf(now), now) : null;
    },
    bestOf(db: Db, session: SessionRecord): HaggleBest | null { return bestView(peekMinigames(db)?.haggle[session.publicId]); },
  };
}
export type HaggleService = ReturnType<typeof haggleService>;
