import { loadCityContent as preloadCityContent } from './cities/registry.ts';
await preloadCityContent('lagos');
// OWNER: growth — the rules of table stakes (table-stakes.ts) and the life's side of them ('tables.server', systems/growth.ts):
// the limits and their sentences, how a game settles, and — through the engine — that a stake comes out of the same allowance as a
// gift or a shop purchase, that a lost stake keeps counting against it, and that a win is never "worked for", so it cannot be given
// onward. The server's half (the pot, the sockets, restarts) is server/table-stakes.test.ts.
import test from 'node:test';
import assert from 'node:assert/strict';
import { createLife, dispatch, viewLife } from '../life.ts';
import { makeContext } from './util.ts';
import { lagosDayStart, lagosTime } from './clock.ts';
import { allowance, buyBlock, buyingLeft } from './systems/business.ts';
import { passedOn } from './systems/growth.ts';
import { TABLE_STAKES } from './content/growth.ts';
import { FORBIDDEN_WORDS, PLAY_MONEY, STAKE_CHOICES, STAKE_MAX, isStake, pairKey, potOf, settlement, stakeBlock, stakeChip, stakeLabel, stakeLine, stakeable, theyCannot, workAllowance } from './table-stakes.ts';
import type { StakeFacts } from './table-stakes.ts';
import type { ActionBody, ActionResult, ActionType } from '../types/actions.ts';
import type { LifeContextInit, LifeState } from '../types/life.ts';

const NOW = lagosDayStart(lagosTime(Date.UTC(2026, 0, 5, 9)).day) + 9 * 3600000;
let seq = 0;
const ctxAt = (extra: LifeContextInit = {}) => { const actionId = `s-${++seq}`; return makeContext({ now: NOW, cityId: 'lagos', seed: actionId, actionId, ...extra }); };
function life(saved: Record<string, unknown> = {}): LifeState {
  const state = createLife({ cash: 30000, location: 'market', needs: { hunger: 40, energy: 60, fun: 40, social: 40, hygiene: 40, bladder: 60 }, social: { earned: 7000 }, ...saved }, ctxAt());
  state.t = NOW;
  return state;
}
const act = <T extends ActionType>(state: LifeState, type: T, payload?: unknown, extra?: LifeContextInit): ActionResult<T> => dispatch(state, { type, payload } as unknown as ActionBody<T>, ctxAt(extra));
const table = (state: LifeState, payload: unknown): ActionResult<'tables.server'> => act(state, 'tables.server', payload, { internal: true });
const stake = (state: LifeState, amount: number, label = 'Whot with Ada') => table(state, { op: 'stake', amount, label });
const BOLA = '11111111-2222-4333-8444-555555555555';
const gift = (state: LifeState, amount: number) => act(state, 'social.server', { op: 'transfer-out', to: BOLA, name: 'Bola', amount }, { internal: true });
const facts = (extra: Partial<StakeFacts> = {}): StakeFacts => ({ earned: 7000, passed: 0, cash: 30000, adult: true, playerToday: 0, pairToday: 0, ...extra });

test('the owner’s numbers: ₦0, 100, 500, 1,000 and 2,000; ₦5,000 a pair and ₦10,000 a player a day; skill games only', () => {
  assert.deepEqual([...STAKE_CHOICES], [0, 100, 500, 1000, 2000]);
  assert.deepEqual([STAKE_MAX, TABLE_STAKES.pairPerDay, TABLE_STAKES.playerPerDay], [2000, 5000, 10000]);
  assert.deepEqual([...TABLE_STAKES.games].sort(), ['ayo', 'chess', 'penalty', 'weave', 'whot']);
  for (const game of ['slots', 'roulette', 'dice', 'lottery', 'oro', 'cards']) assert.equal(stakeable(game), false, game);
  for (const game of TABLE_STAKES.games) assert.equal(stakeable(game), true, game);
  for (const value of [0, 100, 500, 1000, 2000]) assert.equal(isStake(value), true);
  for (const value of [-100, 50, 150, 2001, 3000, '500', null, undefined, Number.NaN, 1e9]) assert.equal(isStake(value), false, String(value));
  assert.deepEqual([potOf(500), pairKey('b', 'a'), pairKey('a', 'b')], [1000, 'a|b', 'a|b']);
});

test('stakeBlock: age, then work, then the allowance, then cash, then the day’s limits; each with a sentence', () => {
  const code = (extra: Partial<StakeFacts>, amount = 500) => stakeBlock(facts(extra), amount)?.code ?? null;
  assert.equal(code({}), null);
  for (const amount of [0, 50, 3000, Number.NaN]) assert.equal(code({}, amount), 'invalid_stake', String(amount));
  assert.equal(code({ adult: false }), 'adults_only');
  assert.equal(code({ adult: null }), 'adults_only', 'not knowing is not being an adult');
  assert.equal(code({ adult: undefined }), null, 'a life does not know and does not ask: the server does');
  assert.equal(code({ earned: 999 }), 'work_first');
  assert.equal(code({ earned: 1000 }), null);
  assert.equal(code({ earned: 1500, passed: 1000 }, 500), null);
  assert.equal(code({ earned: 1500, passed: 1000 }, 1000), 'stake_exceeds_work');
  assert.equal(code({ earned: 1500, passed: 1500 }, 100), 'stake_exceeds_work');
  assert.equal(code({ cash: 499 }), 'insufficient_funds');
  assert.equal(code({ playerToday: 9500 }, 500), null);
  assert.equal(code({ playerToday: 9600 }, 500), 'player_day_cap');
  assert.equal(code({ pairToday: 4500 }, 500), null);
  assert.equal(code({ pairToday: 4600 }, 500), 'pair_day_cap');
  assert.equal(code({ adult: false, earned: 0, cash: 0, playerToday: 99999 }), 'adults_only', 'the first thing to fix comes first');
  assert.equal(workAllowance({ earned: 100, passed: 400 }), 0);
  assert.match(stakeBlock(facts({ earned: 1500, passed: 1000 }), 1000)?.reason ?? '', /You can still stake ₦500/);
  assert.match(stakeBlock(facts({ earned: 500 }), 100)?.reason ?? '', /worked for ₦1,000 \(you have worked for ₦500\)/);
});

test('a game settles by one rule: a draw, a game nobody moved in, or no single winner refunds; otherwise the winner takes the pot', () => {
  assert.deepEqual(settlement({ winners: [1], draw: false }, 4), { kind: 'win', seat: 1 });
  assert.deepEqual(settlement({ winners: [0], draw: false }, 1), { kind: 'win', seat: 0 }, 'a player who leaves after play began has lost');
  assert.deepEqual(settlement({ winners: [], draw: true }, 30), { kind: 'refund' });
  assert.deepEqual(settlement({ winners: [0], draw: false }, 0), { kind: 'refund' }, 'cancelled before a move');
  assert.deepEqual(settlement({ winners: [], draw: false }, 5), { kind: 'refund' });
  assert.deepEqual(settlement({ winners: [0, 1], draw: false }, 5), { kind: 'refund' });
});

test('player copy says stake, play for, pot and winner takes the pot — and none of a betting site’s words', () => {
  assert.equal(stakeLine(500), 'Play for ₦500 each — winner takes ₦1,000');
  assert.equal(stakeLine(0), 'Free game');
  assert.deepEqual([stakeChip(0), stakeChip(2000)], ['Free', '₦2,000 each']);
  assert.equal(PLAY_MONEY, 'Play money only — game naira, never real money.');
  assert.equal(stakeLabel('Whot', 'Ada'), 'Whot with Ada');
  const sentences = [PLAY_MONEY, theyCannot('Bola'), ...STAKE_CHOICES.map(stakeLine), ...STAKE_CHOICES.map(stakeChip),
    ...[{ adult: false }, { earned: 10 }, { earned: 1500, passed: 1200 }, { earned: 1500, passed: 1500 }, { cash: 10 }, { playerToday: 9900 }, { pairToday: 4900 }].map((extra) => stakeBlock(facts(extra), 500)?.reason ?? ''),
    stakeBlock(facts(), 3000)?.reason ?? ''];
  assert.ok(sentences.every(Boolean));
  for (const text of sentences) assert.equal(FORBIDDEN_WORDS.test(text), false, text);
  // The check itself catches what it must.
  for (const word of ['bet', 'You can bet', 'gamble', 'earn it', 'earned', 'invest', 'profit', 'Profits']) assert.equal(FORBIDDEN_WORDS.test(word), true, word);
  // The life’s own lines pass the same check.
  const state = life();
  assert.equal(stake(state, 500).code, 'staked');
  assert.equal(FORBIDDEN_WORDS.test(state.message), false, state.message);
  for (const line of state.ledger) assert.equal(FORBIDDEN_WORDS.test(line.reason), false, line.reason);
});

test('tables.server is the server’s: a player cannot run it, and bad operations, amounts and stakes change nothing', () => {
  const state = life(), before = JSON.stringify({ ...state, message: '' });
  for (const payload of [{ op: 'pot', amount: 99999 }, { op: 'refund', amount: 5000 }, { op: 'stake', amount: 100 }]) assert.equal(act(state, 'tables.server', payload).code, 'server_only');
  assert.equal(JSON.stringify({ ...state, message: '' }), before);
  for (const payload of [{}, { op: 'mint', amount: 5 }, { op: 'constructor' }, { op: 'toString' }, null, 5, 'stake']) assert.equal(table(state, payload).code, 'invalid_operation', JSON.stringify(payload));
  for (const op of ['stake', 'pot', 'refund']) for (const amount of [0, -1, 1.5, '100', Number.NaN, 2 ** 60, null, undefined, Infinity]) assert.equal(table(state, { op, amount }).code, 'invalid_amount', `${op} ${String(amount)}`);
  for (const amount of [1, 50, 150, 3000, 2001]) assert.equal(stake(state, amount).code, 'invalid_stake', `a stake of ${amount} is not one of the choices`);
  assert.equal(JSON.stringify({ ...state, message: '' }), before);
});

test('a stake is a debit with the wallet’s words; a refund and a pot are credits; the allowance follows them', () => {
  const state = life(); // worked for ₦7,000
  assert.equal(allowance(state), 7000);
  assert.equal(stake(state, 1000).code, 'staked');
  assert.deepEqual([state.cash, state.growth.tables.staked, allowance(state), passedOn(state)], [29000, 1000, 6000, 1000], 'a stake on a table is out of the allowance while it is there');
  assert.equal(table(state, { op: 'refund', amount: 1000, label: 'Whot with Ada' }).code, 'refunded');
  assert.deepEqual([state.cash, state.growth.tables.staked, allowance(state)], [30000, 0, 7000], 'a stake that came back counts for nothing');
  assert.equal(stake(state, 500).code, 'staked');
  // The winner: both stakes (₦1,000 pot of two ₦500), their own ₦500 leaves the count, and the work total is untouched.
  assert.equal(table(state, { op: 'pot', amount: 1000, stake: 500, label: 'Whot with Ada' }).code, 'won');
  assert.deepEqual([state.cash, state.growth.tables.staked, state.social.earned, allowance(state)], [30500, 0, 7000, 7000]);
  assert.deepEqual(state.ledger.map((line) => [line.reason, line.amount]), [['Table stake: Whot with Ada', -1000], ['Table stake returned: Whot with Ada', 1000], ['Table stake: Whot with Ada', -500], ['Won the pot: Whot with Ada', 1000]]);
  assert.deepEqual(state.ledgerDays.at(-1)?.by['Won the pot'], [1000, 1]);
  assert.deepEqual(state.ledgerDays.at(-1)?.by['Table stake'], [-1500, 2]);
  // A reload keeps the count, and a damaged one is read as nothing.
  assert.equal(createLife(JSON.parse(JSON.stringify(state)), ctxAt()).growth.tables.staked, 0);
  const held = life(); stake(held, 500);
  assert.equal(createLife(JSON.parse(JSON.stringify(held)), ctxAt()).growth.tables.staked, 500);
  for (const bad of [-5, 1.5, 'x', null, 2 ** 60]) assert.equal(createLife({ ...JSON.parse(JSON.stringify(held)), growth: { ...held.growth, tables: { ...held.growth.tables, staked: bad } } }, ctxAt()).growth.tables.staked, 0, String(bad));
  // The pot never returns more of "own stake" than was held: a refund of more than is counted does not go below zero.
  const empty = life();
  assert.equal(table(empty, { op: 'refund', amount: 300, label: 'x' }).code, 'refunded');
  assert.equal(empty.growth.tables.staked, 0);
});

test('the gift rule: a stake must be within what was worked for, less gifts, shop purchases and stakes already lost or on a table', () => {
  const state = life({ social: { earned: 1500 } });
  assert.equal(stake(life({ social: { earned: 999 } }), 100).code, 'work_first');
  assert.equal(stake(state, 2000).code, 'stake_exceeds_work');
  assert.equal(stake(state, 1000).code, 'staked');
  // ₦500 of work is left: ₦1,000 more is not allowed, ₦500 is, and then nothing.
  assert.equal(stake(state, 1000).code, 'stake_exceeds_work');
  assert.match(state.message, /You can still stake ₦500/);
  assert.equal(stake(state, 500).code, 'staked');
  assert.equal(stake(state, 100).code, 'stake_exceeds_work');
  assert.match(state.message, /Work a shift/);
  // Gifts and shop spending came out of the same allowance, in both directions.
  const given = life({ social: { earned: 7000 } });
  assert.equal(gift(given, 5000).code, 'sent');
  assert.equal(stake(given, 2000).code, 'staked');
  assert.equal(stake(given, 100).code, 'stake_exceeds_work', '₦5,000 given and ₦2,000 staked is all the ₦7,000');
  const shopper = life({ social: { earned: 7000 }, business: { spent: 5500 } });
  assert.equal(stake(shopper, 2000).code, 'stake_exceeds_work', 'what was spent at players’ shops is not available to stake');
  assert.equal(stake(shopper, 1000).code, 'staked');
  // …and a stake is spent from the allowance for gifts and shop purchases too, while it is on the table and for good if lost.
  const lost = life({ social: { earned: 7000 } });
  assert.equal(stake(lost, 2000).code, 'staked');
  assert.equal(stake(lost, 2000).code, 'staked');
  assert.equal(gift(lost, 3001).code, 'gift_exceeds_earned');
  assert.match(lost.message, /You can still give ₦3,000/);
  assert.equal(viewLife(lost, ctxAt()).social.transfer.leftToday, 3000, 'the Gifts screen says the same');
  assert.equal(act(lost, 'social.server', { op: 'transfer-check', to: BOLA, amount: 3001 }, { internal: true }).code, 'gift_exceeds_earned');
  assert.equal(buyingLeft(lost, ctxAt()), 3000);
  const buy = (amount: number) => buyBlock(lost, { amount, units: 1, label: 'jollof', shop: 'Ada' }, ctxAt());
  assert.equal(buy(3000), null);
  assert.equal(buy(3001)?.code, 'spend_exceeds_earned');
  // The stakes are lost (nothing comes back: the server pays only the winner): they stay counted. Gifts remain limited to what is left.
  assert.deepEqual([lost.growth.tables.staked, allowance(lost)], [4000, 3000]);
  assert.equal(gift(lost, 3000).code, 'sent');
  assert.equal(gift(lost, 100).code, 'gift_exceeds_earned');
});

test('a win is not "worked for": the pot can be spent and played with, but never given onward beyond what was worked for', () => {
  // Ada worked for ₦7,000, staked ₦2,000 and won the pot: she holds ₦34,000 but the work total is still ₦7,000.
  const state = life({ social: { earned: 7000 } });
  assert.equal(stake(state, 2000).code, 'staked');
  assert.equal(table(state, { op: 'pot', amount: 4000, stake: 2000, label: 'Chess with Bola' }).code, 'won');
  assert.deepEqual([state.cash, state.social.earned, allowance(state)], [32000, 7000, 7000]);
  // Winnings never raise what may be given: it is the work, not the cash.
  assert.equal(gift(state, 5000).code, 'sent');
  assert.equal(gift(state, 2001).code, 'gift_exceeds_earned');
  assert.equal(gift(state, 2000).code, 'sent');
  assert.equal(gift(state, 100).code, 'gift_exceeds_earned', 'the ₦2,000 won opened no new road for giving');
  assert.equal(state.cash, 32000 - 7000);
  // A life that has only ever won and never worked cannot give or stake anything at all.
  const lucky = life({ social: { earned: 1200 }, cash: 50 });
  assert.equal(stake(lucky, 100).code, 'insufficient_funds');
  assert.equal(table(lucky, { op: 'pot', amount: 40000, stake: 0, label: 'Chess with Bola' }).code, 'won');
  assert.equal(lucky.social.earned, 1200);
  assert.equal(gift(lucky, 1300).code, 'gift_exceeds_earned');
  assert.equal(stake(lucky, 2000).code, 'stake_exceeds_work');
  // Nor does a win repay a loan "from earnings" (that is for work).
  const owing = life({ economy: { loan: { owed: 5000, principal: 5000, since: NOW, fees: 0 } } });
  const debt = JSON.stringify(owing.economy);
  assert.equal(table(owing, { op: 'pot', amount: 1000, stake: 500, label: 'Chess with Bola' }).code, 'won');
  assert.equal(JSON.stringify(owing.economy), debt);
});
