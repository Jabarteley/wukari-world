/**
 * OWNER: market
 * The Allworld Market: what is traded, the numbers of every rule and the scripted shocks. Plain data only. The rules are
 * in src/game/market-model.ts, the servers' side in server/market/, the design in docs/MARKET.md.
 *
 * RED LINES (docs/REAL-VALUE.md): market naira is game naira. No real money buys it and none comes out; nothing here
 * pays for "earning", "investing" or "profit". Every figure is an original beta value, sized by scripts/economy-sim.ts.
 */
import type { Commodity, CommodityId, MarketLimits } from '../../types/market.ts';

export const COMMODITIES: readonly Commodity[] = Object.freeze([
  { id: 'rice', label: 'Rice', unit: '10 kg bag', icon: '🍚', base: 1800, swing: 0.2 },
  { id: 'garri', label: 'Garri', unit: 'paint bucket', icon: '🥣', base: 600, swing: 0.25 },
  { id: 'beans', label: 'Beans', unit: '5 kg bag', icon: '🫘', base: 900, swing: 0.25 },
  { id: 'palm-oil', label: 'Palm oil', unit: '5 L keg', icon: '🧴', base: 1200, swing: 0.2 },
  { id: 'cement', label: 'Cement', unit: '50 kg bag', icon: '🧱', base: 1500, swing: 0.15 },
  { id: 'petrol', label: 'Petrol', unit: '10 litres', icon: '⛽', base: 1000, swing: 0.35 },
] satisfies Commodity[]);

export const COMMODITY_IDS: readonly CommodityId[] = Object.freeze(COMMODITIES.map((item) => item.id));

export const MARKET_LIMITS: MarketLimits = Object.freeze({
  feeBps: 50,
  spreadBps: 200,
  bandBps: 1000,
  maxUnitsPerOrder: 50,
  maxOpenOrders: 10,
  depositPerDay: 20000,
  accountMax: 50000,
  tradedPerDay: 60000,
  makerUnitsPerDay: 40,
  maxPosition: 200,
  pairPerDay: 5000,
  orderHours: 24,
});

/** Fills kept per city (the newest), fills shown, and resting orders kept per commodity per city. */
export const MARKET_TAPE = 100;
export const MARKET_TAPE_VIEW = 30;
export const MARKET_BOOK_MAX = 300;

/** What the tape and an order's label say for a trader who chose not to be named, and for the market maker. */
export const ANONYMOUS_TRADER = 'Anonymous trader';
export const MARKET_MAKER = 'Market maker';

/**
 * Shocks a week may bring, per commodity: the first is the commodity's usual headline, the second the other way.
 * `shock` multiplies the reference price while the event lasts. The calendar week picks which, if any (market-model eventsAt).
 */
export const MARKET_EVENT_TEMPLATES: Readonly<Record<CommodityId, readonly { headline: string; shock: number }[]>> = Object.freeze({
  petrol: [{ headline: 'Queues at filling stations: petrol is scarce', shock: 1.3 }, { headline: 'Fuel trucks are rolling again: petrol eases', shock: 0.88 }],
  rice: [{ headline: 'Border rumours push up rice', shock: 1.2 }, { headline: 'New stock at the port: rice softens', shock: 0.9 }],
  cement: [{ headline: 'Building boom lifts cement', shock: 1.15 }, { headline: 'Rains slow the sites: cement is cheaper', shock: 0.9 }],
  garri: [{ headline: 'Harvest glut: garri is cheap', shock: 0.8 }, { headline: 'Cassava is late: garri is dear', shock: 1.2 }],
  beans: [{ headline: 'Rains delay beans from the north', shock: 1.2 }, { headline: 'Trucks from Kano arrive full: beans drop', shock: 0.88 }],
  'palm-oil': [{ headline: 'Festive cooking lifts palm oil', shock: 1.15 }, { headline: 'Mills are busy: palm oil is plentiful', shock: 0.9 }],
});
