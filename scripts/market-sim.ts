/**
 * The Allworld Market in the economy simulation: scripted traders on the virtual clock, with real lives (every naira that goes
 * into or out of a market account moves through 'market.server' on a real life) and the real market rules (src/game/market-model.ts,
 * the same `submit` the server calls). The steps a trader takes here are the ones server/market/service.ts takes, in its order.
 *
 *   node --experimental-strip-types scripts/market-sim.ts [--days 30]      (also printed by `npm run economy`)
 *
 * WHO PLAYS, each for `days` Lagos days in Lagos, trading every hour from 08:00 to 20:00:
 *   trader        buys when a commodity is cheap against its usual price (base × the city's factor — public in the rules) and sells
 *                 when it is dear, with the market maker or other players; the most it may do under the daily limits.
 *   oracle (code) the same limits, but it runs the open-source price model to read tomorrow's prices. The server keys the walk and the
 *                 events with a secret salt (db.market.salt), so without it the model's tomorrow is not the market's: it sees what
 *                 anyone sees, and it pays for its mistakes.
 *   oracle (leak) the same with the real salt, as if it had leaked: the ceiling of what trading could pay.
 *   colluding pair  a giver who sells to a partner far below the market (band edge) every day, as much as the pair cap allows,
 *                 so as to move naira from one account to the other; the partner then sells the goods to the maker.
 *   wash bot      two accounts of one player (the strongest version: different devices) trading with each other all day to make
 *                 volume. Fills against itself are not possible with one account: that bot shows nothing happens.
 *
 * WHAT IT CHECKS: for every trader, cash = seed + Σ ledger (the life); in the world, naira in accounts and orders changes only by
 * the fees and the fills with the maker. The assertions are in src/game/market-economy.test.ts.
 */
import { cachedCityContent, loadCityContent } from '../src/game/cities/registry.ts';
await Promise.all(['lagos'].map(loadCityContent));
import { fileURLToPath } from 'node:url';
import { resolve } from 'node:path';
import { lagosTime } from '../src/game/clock.ts';
import { COMMODITY_IDS, MARKET_LIMITS } from '../src/game/content/market.ts';
import { cityFactor, commodityOf, depositRefusal, emptyAccount, expireBook, feeOf, quoteOf, refPrice, reservedCash, submit, todayOf, unitsLeft, withdrawRefusal } from '../src/game/market-model.ts';
import type { SubmitResult } from '../src/game/market-model.ts';
import { OWN, Player, SIM_START, simulate } from './economy-sim.ts';
import type { CommodityId, MarketAccountRecord, MarketFillRecord, MarketOrderRecord, MarketSide } from '../src/types/market.ts';

const DAY = 86400000, HOUR = 3600000, BPS = 10000;
const LOTTERY = 'ajebutter', CITY = 'lagos';
/** The server's secret salt, as the simulation's market keeps it. A player does not know it: only the traders marked 'leaked' below do. */
const SALT = 'c0ffee'.repeat(10) + 'beef';
const must = <T>(value: T | null | undefined, what = 'value'): T => { if (value === null || value === undefined) throw new TypeError(`${what} is missing`); return value; };
const at = (day: number, hour: number): number => SIM_START + day * DAY + hour * HOUR;

/** One city's market as the server keeps it, in memory: the accounts, the books and the tape, and what the fees and the maker took. */
export class Desk {
  accounts: Record<string, MarketAccountRecord> = {};
  books: Record<CommodityId, MarketOrderRecord[]> = { rice: [], garri: [], beans: [], 'palm-oil': [], cement: [], petrol: [] };
  tape: MarketFillRecord[] = [];
  seq = 0;
  /** Naira destroyed by fees, and the net naira the maker paid out (positive) or took in (negative). */
  fees = 0;
  makerNet = 0;
  /** Naira of fills between players. */
  volume = 0;
  barred = new Set<string>();
  /** Total fills with another player, per pair "a|b". */
  pairs = new Map<string, number>();
  traders: Record<string, Trader> = {};
  expire(now: number): void { for (const book of Object.values(this.books)) expireBook(this.accounts, book, now); }
  quote(commodity: CommodityId, now: number) { return quoteOf(CITY, commodity, now, this.books[commodity], this.tape, SALT); }
  /** Naira held anywhere in the market: free, and in buy orders. */
  naira(): number { return Object.values(this.accounts).reduce((sum, account) => sum + account.cash, 0) + Object.values(this.books).reduce((sum, book) => sum + reservedCash(book), 0); }
  /** What went in, less what came out, plus what the maker paid out and less the fees, is what the market holds: nothing else creates or destroys naira. */
  balanced(): boolean {
    const traders = Object.values(this.traders);
    return this.naira() === traders.reduce((sum, trader) => sum + trader.deposited - trader.withdrawn, 0) + this.makerNet - this.fees;
  }
}

/** A player with a market account: a real life for the wallet, a place at the desk for the rest. */
export class Trader {
  readonly player: Player;
  readonly desk: Desk;
  readonly id: string;
  deposited = 0;
  withdrawn = 0;
  /** What the goods on hand (held or in sell orders) cost, with the fees, and how many units that covers: the book value used to count them. */
  basis: Partial<Record<CommodityId, { cost: number; units: number }>> = {};
  constructor(desk: Desk, id: string, player: Player = new Player({ lottery: LOTTERY, house: OWN })) {
    this.desk = desk; this.id = id; this.player = player;
    desk.accounts[id] = emptyAccount(id, lagosTime(player.now).day);
    desk.traders[id] = this;
  }
  get account(): MarketAccountRecord { return must(this.desk.accounts[this.id], 'account'); }
  at(now: number): void { this.player.awayUntil(now); this.player.now = Math.max(this.player.now, now); this.desk.expire(now); }
  /** Move naira from the wallet into the account, as far as the rules and the wallet allow. */
  deposit(amount: number): number {
    const account = this.account, now = this.player.now, today = todayOf(account, lagosTime(now).day);
    const room = Math.min(amount, MARKET_LIMITS.depositPerDay - today.deposited, MARKET_LIMITS.accountMax - account.cash - this.held(), this.player.state.cash);
    if (room < 1 || depositRefusal({ amount: room, cash: account.cash, reserved: this.held(), deposited: today.deposited, frozen: false })) return 0;
    if (!this.player.server('market.server', { op: 'deposit', amount: room }).ok) return 0;
    this.rolled(); account.cash += room; account.deposited += room; this.deposited += room;
    return room;
  }
  withdraw(amount: number): number {
    const take = Math.min(amount, this.account.cash);
    if (take < 1 || withdrawRefusal({ amount: take, cash: this.account.cash })) return 0;
    if (!this.player.server('market.server', { op: 'withdraw', amount: take }).ok) return 0;
    this.account.cash -= take; this.withdrawn += take;
    return take;
  }
  private rolled(): void { const day = lagosTime(this.player.now).day; if (this.account.day !== day) { this.account.day = day; this.account.deposited = 0; this.account.traded = 0; this.account.makerUnits = {}; this.account.pairs = {}; } }
  held(): number { return Object.values(this.desk.books).reduce((sum, book) => sum + reservedCash(book.filter((order) => order.by === this.id)), 0); }
  units(commodity: CommodityId): number { return this.account.holdings[commodity] ?? 0; }
  /** The order the server would take: the same rules, the same order of steps. */
  order(commodity: CommodityId, side: MarketSide, price: number, units: number, now = false): SubmitResult {
    const desk = this.desk, at = this.player.now;
    desk.expire(at);
    const book = desk.books[commodity];
    const openOrders = Object.values(desk.books).reduce((sum, list) => sum + list.filter((order) => order.by === this.id).length, 0);
    const result = submit({ accounts: desk.accounts, book, tape: desk.tape }, { id: this.id, name: this.id }, { commodity, side, price, units, ...(now ? { now: true } : {}) }, {
      now: at, quote: desk.quote(commodity, at), frozen: () => false, openOrders, nextId: () => String(++desk.seq),
      barred: (a, b) => desk.barred.has(`${a}|${b}`) || desk.barred.has(`${b}|${a}`),
    });
    if (!result.ok) return result;
    for (const fill of result.fills) {
      const value = fill.price * fill.units, fee = feeOf(value);
      if (fill.buyerId && fill.sellerId) {
        desk.fees += 2 * fee; desk.volume += value;
        const key = [fill.buyerId, fill.sellerId].sort().join('|');
        desk.pairs.set(key, (desk.pairs.get(key) ?? 0) + value);
      } else {
        desk.fees += fee;
        desk.makerNet += fill.buyerId === '' ? value : -value;
      }
      desk.traders[fill.buyerId]?.bought(commodity, fill.units, value + fee);
      desk.traders[fill.sellerId]?.sold(commodity, fill.units);
    }
    return result;
  }
  bought(commodity: CommodityId, units: number, cost: number): void { const line = this.basis[commodity] ?? (this.basis[commodity] = { cost: 0, units: 0 }); line.cost += cost; line.units += units; }
  sold(commodity: CommodityId, units: number): void { const line = this.basis[commodity]; if (!line || line.units <= 0) return; const part = Math.min(units, line.units); line.cost -= line.cost * part / line.units; line.units -= part; }
  cancelAll(): void {
    for (const book of Object.values(this.desk.books)) for (let index = book.length - 1; index >= 0; index--) {
      const order = book[index];
      if (order && order.by === this.id) {
        const account = this.account;
        if (order.side === 'buy') account.cash += order.held ?? 0; else account.holdings[order.commodity] = (account.holdings[order.commodity] ?? 0) + unitsLeft(order);
        book.splice(index, 1);
      }
    }
  }
  /** What the account is worth: its naira, and its goods at what they cost or what the maker would pay for them, whichever is less (a gain on goods not yet sold is not counted). */
  worth(now: number): number {
    let total = this.account.cash + this.held();
    for (const id of COMMODITY_IDS) {
      const units = this.units(id) + this.desk.books[id].filter((order) => order.by === this.id && order.side === 'sell').reduce((sum, order) => sum + unitsLeft(order), 0);
      total += Math.min(this.basis[id]?.cost ?? 0, units * this.desk.quote(id, now).bid);
    }
    return total;
  }
  /** What the market made (or cost) this trader: its worth now and what came out of it, less what went in. */
  made(now: number): number { return this.worth(now) + this.withdrawn - this.deposited; }
  /** The life's books balance: cash = what it started with and every ledger line. */
  conserved(): boolean {
    this.player.settle();
    return this.player.seed + this.player.lines.reduce((sum, line) => sum + line.amount, 0) === this.player.state.cash;
  }
}

/** What the pair's run shows: volume between the two accounts, what the prices moved, the caps, and what moving it cost. */
export interface PairDetail { between: number; gain: number; cap: number; band: number; spread: number; fees: number }

export interface MarketRow {
  label: string
  days: number
  /** What the market made this trader, or the group together (see `note`). */
  made: number
  perDay: number
  /** Naira of fills with other players, and fees paid. */
  volume: number
  fees: number
  /** Naira of fills with the market maker. */
  maker: number
  conserved: boolean
  note: string
  /** For the pair: the most one account passed to the other, volume between them, and what the partner gained over fair prices. */
  detail?: PairDetail
}

/** Fair price of a commodity here: its base times the city's factor. Public in content/market.ts and market-model.ts. */
const fairOf = (id: CommodityId): number => commodityOf(id).base * cityFactor(CITY, id);
/** Naira the maker's spread took from fills with it: how far each fill was from the reference price. */
const spreadPaid = (desk: Desk): number => desk.tape.reduce((sum, fill) => sum + (fill.buyerId === '' || fill.sellerId === '' ? Math.abs(fill.price - refPrice(CITY, fill.commodity, fill.at, SALT)) * fill.units : 0), 0);
const makerVolume = (desk: Desk): number => desk.tape.reduce((sum, fill) => sum + (fill.buyerId === '' || fill.sellerId === '' ? fill.price * fill.units : 0), 0);

/** The trader's hours: look at every commodity, buy the cheap, sell the dear, within what the day allows. */
type Foresight = 'none' | 'code' | 'leak';
function dayOfTrader(trader: Trader, day: number, foresight: Foresight): void {
  for (let hour = 8; hour < 20; hour++) {
    trader.at(at(day, hour));
    if (trader.account.cash < 15000) trader.deposit(MARKET_LIMITS.depositPerDay);
    for (const id of COMMODITY_IDS) {
      const now = trader.player.now, quote = trader.desk.quote(id, now);
      let cheap: boolean, dear: boolean;
      if (foresight !== 'none') {
        // Read the next day and a half of prices off the model: sell at the top of that window, buy at the bottom when the top is far enough above.
        // Someone who has only the code runs it with no salt ('code'): the prices it gives are not the market's. Only a leaked salt ('leak') gives the real ones.
        const ahead = Array.from({ length: 36 }, (_, step) => refPrice(CITY, id, now + step * HOUR, foresight === 'leak' ? SALT : ''));
        const low = Math.min(...ahead), high = Math.max(...ahead), line = trader.basis[id], unit = line && line.units > 0 ? line.cost / line.units : 0;
        cheap = quote.ref <= low * 1.005 && high >= quote.ref * 1.06; dear = quote.ref >= high * 0.995 && quote.bid > unit;
      } else { cheap = quote.ref <= fairOf(id) * 0.94; dear = quote.ref >= fairOf(id) * 1.06; }
      if (dear && trader.units(id) > 0) trader.order(id, 'sell', Math.max(quote.band.min, Math.min(quote.band.max, quote.bid)), trader.units(id), true);
      else if (cheap) {
        const afford = Math.floor(trader.account.cash / (quote.ask + feeOf(quote.ask)));
        const units = Math.min(afford, MARKET_LIMITS.makerUnitsPerDay - (todayOf(trader.account, lagosTime(now).day).makerUnits[id] ?? 0), MARKET_LIMITS.maxUnitsPerOrder);
        if (units > 0) trader.order(id, 'buy', Math.min(quote.band.max, quote.ask), units, true);
      }
    }
  }
}
function runTrader(label: string, days: number, foresight: Foresight, note: string): { row: MarketRow; trader: Trader } {
  const desk = new Desk(), trader = new Trader(desk, 'trader');
  trader.at(at(0, 8));
  for (let day = 0; day < days; day++) dayOfTrader(trader, day, foresight);
  trader.at(at(days, 0));
  const end = at(days, 0), made = trader.made(end);
  return {
    row: { label, days, made, perDay: Math.round(made / days), volume: desk.volume, fees: desk.fees, maker: makerVolume(desk), conserved: trader.conserved() && desk.balanced(), note },
    trader,
  };
}

/**
 * A colluding pair: the partner waits with a bid at the TOP of the band and the seller (whose goods came from the maker at its ask)
 * sells into it, every day, as much as the rules allow, to move naira from the partner's account to the seller's; the partner then
 * takes the goods to the maker. The trade is at the resting bid, ten per cent over the reference: the most any single fill can be
 * off the market. The pair cap is what stops it passing more than ₦5,000 a day.
 */
function runPair(days: number): MarketRow[] {
  const desk = new Desk(), seller = new Trader(desk, 'seller'), partner = new Trader(desk, 'partner');
  const id: CommodityId = 'garri';
  let gain = 0;
  for (let day = 0; day < days; day++) {
    seller.at(at(day, 9)); partner.at(at(day, 9));
    if (seller.account.cash < 12000) seller.deposit(MARKET_LIMITS.depositPerDay);
    if (partner.account.cash < 18000) partner.deposit(MARKET_LIMITS.depositPerDay);
    let quote = desk.quote(id, partner.player.now);
    // A bid above the maker's ask would simply be filled by the maker. To rest one at the top of the band the partner first uses up its
    // units with the maker (yesterday's goods go back to the maker at its bid; on the first day it buys a lot), which costs it the spread.
    if (partner.units(id) >= 20) partner.order(id, 'sell', quote.bid, Math.min(MARKET_LIMITS.maxUnitsPerOrder, partner.units(id)), true);
    else partner.order(id, 'buy', quote.ask, Math.min(MARKET_LIMITS.makerUnitsPerDay, Math.floor((partner.account.cash - 6000) / (quote.ask + feeOf(quote.ask)))), true);
    quote = desk.quote(id, partner.player.now);
    const high = quote.band.max, units = Math.floor(MARKET_LIMITS.pairPerDay / high) + 1;
    seller.order(id, 'buy', quote.ask, Math.max(0, units - seller.units(id)), true);
    partner.order(id, 'buy', high, units);
    const sold = seller.units(id) > 0 ? seller.order(id, 'sell', quote.band.min, Math.min(units, seller.units(id)), true) : null;
    if (sold?.ok) for (const fill of sold.fills) if (fill.buyerId === 'partner') gain += (fill.price - quote.ref) * fill.units;
    partner.cancelAll();
  }
  const end = at(days, 0);
  seller.at(end); partner.at(end);
  const between = desk.pairs.get('partner|seller') ?? 0, together = seller.made(end) + partner.made(end);
  const common = { days, volume: desk.volume, fees: desk.fees, maker: makerVolume(desk) };
  const naira = (value: number): string => `₦${Math.round(value).toLocaleString('en-NG')}`;
  const detail: PairDetail = { between, gain: Math.round(gain), cap: MARKET_LIMITS.pairPerDay * days, band: Math.round(MARKET_LIMITS.pairPerDay * days * MARKET_LIMITS.bandBps / BPS), spread: Math.round(spreadPaid(desk)), fees: desk.fees };
  return [
    { label: 'colluding pair: the seller', ...common, made: seller.made(end), perDay: Math.round(seller.made(end) / days), conserved: seller.conserved(), note: `${naira(between)} passed between the two accounts in ${days} days (the cap is ${naira(detail.cap)}); the bids were ten per cent over the reference, ${naira(gain)} over it in all`, detail },
    { label: 'colluding pair: the partner', ...common, made: partner.made(end), perDay: Math.round(partner.made(end) / days), conserved: partner.conserved(), note: 'paid the seller’s price, then took the goods to the maker at its bid' },
    { label: 'colluding pair: together', ...common, made: together, perDay: Math.round(together / days), conserved: desk.balanced(), note: `moving it cost ${naira(detail.spread + detail.fees)} in the maker’s spread and fees, more than the ${naira(gain)} the prices moved; what is left is the luck of the prices over the days the goods were held`, detail },
  ];
}

/** One player, two accounts, trading with itself all day: the strongest wash bot. And one account alone: it can only meet itself. */
function runWash(days: number): MarketRow[] {
  const desk = new Desk(), a = new Trader(desk, 'wash-a'), b = new Trader(desk, 'wash-b', a.player), alone = new Desk(), single = new Trader(alone, 'wash-single');
  const id: CommodityId = 'garri';
  a.at(at(0, 8));
  for (let day = 0; day < days; day++) {
    a.at(at(day, 8)); b.at(at(day, 8)); single.at(at(day, 8));
    for (const bot of [a, b, single]) bot.deposit(MARKET_LIMITS.depositPerDay);
    // Goods to start with from the maker; after that they only change hands.
    for (const bot of [a, b, single]) { const quote = bot.desk.quote(id, bot.player.now); if (bot.units(id) < 6) bot.order(id, 'buy', quote.ask, 6, true); }
    for (let hour = 8; hour < 20; hour++) {
      a.at(at(day, hour)); b.at(at(day, hour)); single.at(at(day, hour));
      for (const [seller, buyer] of [[a, b], [b, a]] as const) {
        const quote = desk.quote(id, seller.player.now), price = Math.min(quote.ask - 1, quote.bid + 1);
        if (seller.units(id) > 0) { seller.order(id, 'sell', price, 1); buyer.order(id, 'buy', price, 1, true); }
        buyer.cancelAll(); seller.cancelAll();
      }
      // The single account posts both sides, and neither meets the other.
      const quote = alone.quote(id, single.player.now), price = Math.min(quote.ask - 1, quote.bid + 1);
      if (single.units(id) > 0) { single.order(id, 'sell', price, 1); single.order(id, 'buy', price, 1, true); }
      single.cancelAll();
    }
  }
  const end = at(days, 0);
  a.at(end); b.at(end);
  const together = a.made(end) + b.made(end);
  const common = { days };
  return [
    { label: 'wash bot: two accounts', ...common, made: together, perDay: Math.round(together / days), volume: desk.volume, fees: desk.fees, maker: makerVolume(desk), conserved: a.conserved() && desk.balanced(),
      note: `₦${desk.volume.toLocaleString('en-NG')} of volume between its own accounts, and each fill costs both sides ${MARKET_LIMITS.feeBps / 100}%; the pair cap stops it at ₦${MARKET_LIMITS.pairPerDay.toLocaleString('en-NG')} a day` },
    { label: 'wash bot: one account', ...common, made: single.made(end), perDay: Math.round(single.made(end) / days), volume: alone.volume, fees: alone.fees, maker: makerVolume(alone), conserved: single.conserved() && alone.balanced(),
      note: 'it never meets its own orders: no volume' },
  ];
}

/** A career for comparison: the main table's tech career. */
function careerRow(days: number): MarketRow {
  const career = simulate({ lottery: LOTTERY, house: OWN, strategy: 'career', days });
  const net = must(career.final).cash - career.startCash;
  return { label: 'career (tech), for comparison', days, made: net, perDay: Math.round(net / days), volume: 0, fees: 0, maker: 0, conserved: career.conserved === true, note: `wages ₦${Math.round(must(career.flows).wages ?? 0).toLocaleString('en-NG')}` };
}

export function runMarket({ days = 30 }: { days?: number } = {}): MarketRow[] {
  return [
    careerRow(days),
    runTrader('trader (usual price)', days, 'none', 'sees only the current hour: buys 6% under the usual price, sells 6% over it').row,
    runTrader('oracle (has the code, not the salt)', days, 'code', 'runs the open-source price model without the server’s salt: its tomorrow is not the market’s').row,
    runTrader('oracle (salt leaked)', days, 'leak', 'knows tomorrow’s prices: the ceiling if the salt ever leaked').row,
    ...runPair(days),
    ...runWash(days),
  ];
}

const short = (value: number): string => (Math.abs(value) >= 1000 ? `${(value / 1000).toFixed(1)}k` : String(Math.round(value)));
export function formatMarket(rows: MarketRow[]): string {
  const head = ['who', 'made', 'a day', 'vs players', 'fees', 'vs maker', 'ok'];
  const lines = rows.map((row) => [row.label, short(row.made), short(row.perDay), short(row.volume), short(row.fees), short(row.maker), row.conserved ? 'yes' : 'NO']);
  const widths = head.map((title, column) => Math.max(title.length, ...lines.map((line) => (line[column] ?? '').length)));
  const format = (cells: string[]): string => cells.map((cell, column) => (column < 1 ? cell.padEnd(widths[column] ?? 0) : cell.padStart(widths[column] ?? 0))).join('  ');
  return [format(head), widths.map((width) => '-'.repeat(width)).join('  '), ...lines.map(format), ...rows.filter((row) => row.note).map((row) => `  ${row.label}: ${row.note}`)].join('\n');
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const args = process.argv.slice(2), index = args.indexOf('--days'), days = index >= 0 ? Number(args[index + 1]) : 30;
  if (!cachedCityContent('lagos')) throw new Error('Lagos content did not load');
  console.log(`Market · ${days} Lagos days from Monday 5 January 2026 · "made" = the account's worth (goods at cost or the maker's bid, whichever is less) + what came out − what went in`);
  console.log(formatMarket(runMarket({ days })));
}
