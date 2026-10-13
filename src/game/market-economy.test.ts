// OWNER: market — the Allworld Market in the economy simulation (scripts/market-sim.ts): a trader, a colluding pair and a wash-trading
// bot over 30 Lagos days, played through the real rules and real lives. If a content change breaks one of these, the change is the
// thing to question, not the assertion. The design is docs/MARKET.md ("Abuse controls").
import test from 'node:test';
import assert from 'node:assert/strict';
import { MARKET_LIMITS } from './content/market.ts';
import { formatMarket, runMarket } from '../../scripts/market-sim.ts';
import type { MarketRow } from '../../scripts/market-sim.ts';

const DAYS = 30;
const rows = runMarket({ days: DAYS });
const row = (label: string): MarketRow => { const found = rows.find((item) => item.label.startsWith(label)); assert.ok(found, label); return found; };

test('every simulated life balances its books and the market creates naira only through the maker', () => {
  assert.equal(rows.length, 9);
  for (const item of rows) assert.equal(item.conserved, true, item.label);
  assert.match(formatMarket(rows), /colluding pair/);
});

test('a trader who cannot see tomorrow’s prices makes a good deal less than a career; the secret salt is what keeps it so', () => {
  const career = row('career');
  assert.ok(career.made > 50000);
  // The server keys the price walk with a salt nobody outside has: reading the open-source model gives a tomorrow that is not the market's.
  for (const trader of [row('trader'), row('oracle (has the code')]) {
    assert.ok(trader.made < career.made * 0.5, `${trader.label}: ₦${trader.made} against a career's ₦${career.made}`);
    assert.ok(trader.perDay < MARKET_LIMITS.depositPerDay / 4, `${trader.label}: ₦${trader.perDay} a day`);
    assert.ok(trader.fees > 0);
  }
  // With the salt leaked the same trader would do several times better: that is the ceiling the salt guards against.
  const leaked = row('oracle (salt leaked)'), blind = row('oracle (has the code');
  assert.ok(leaked.made > blind.made * 2, `a leaked salt is worth ₦${leaked.made} against ₦${blind.made}`);
});

test('a colluding pair cannot pass more than the pair cap between them, and what it moves costs it more than it moves', () => {
  const [seller, partner, together] = [row('colluding pair: the seller'), row('colluding pair: the partner'), row('colluding pair: together')];
  const detail = seller.detail;
  assert.ok(detail);
  assert.equal(detail.cap, MARKET_LIMITS.pairPerDay * DAYS);
  // The most they could pass between them is pairPerDay × days; the run gets most of the way (the attack works as well as the rules let it).
  assert.ok(detail.between <= MARKET_LIMITS.pairPerDay * DAYS, `₦${detail.between} between them`);
  assert.ok(detail.between > MARKET_LIMITS.pairPerDay * DAYS / 3, 'and the attack did run');
  // Priced at the top of the band, the most a fill can be off the market is bandBps: so the value moved is a tenth of the volume at most.
  assert.ok(detail.gain > 0 && detail.gain <= detail.band, `₦${detail.gain} over the reference, at most ₦${detail.band}`);
  // The cost of doing it: the maker's spread (to get goods in and out) and the fees on every fill.
  const cost = (together.detail?.spread ?? 0) + (together.detail?.fees ?? 0);
  assert.ok(cost > detail.gain, `the spread and fees (₦${cost}) are more than the ₦${detail.gain} that moved`);
  assert.equal(together.fees, partner.fees);
  assert.ok(together.volume === seller.volume && together.volume <= MARKET_LIMITS.pairPerDay * DAYS);
});

test('a wash-trading bot loses to fees: its volume is capped by the pair cap, and one account cannot trade with itself', () => {
  const two = row('wash bot: two accounts'), one = row('wash bot: one account');
  assert.ok(two.volume > 0 && two.volume <= MARKET_LIMITS.pairPerDay * DAYS, `₦${two.volume} of volume`);
  // Both sides pay the fee on every fill: at least feeBps ×2 of the volume, and so the bot ends poorer.
  assert.ok(two.fees >= two.volume * 2 * MARKET_LIMITS.feeBps / 10000, `fees ₦${two.fees} on ₦${two.volume}`);
  assert.ok(two.made < 0, `the bot made ₦${two.made}`);
  assert.ok(two.made <= -two.fees / 2, 'and lost at least half of what the fees cost, goods counted at cost');
  assert.equal(one.volume, 0, 'one account never fills against its own orders');
  assert.ok(one.made <= 0);
});
