import { loadCityContent as preloadCityContent } from './cities/registry.ts';
await preloadCityContent('lagos');
// OWNER: market — the life's side of the market (systems/market.ts): deposits and withdrawals through 'market.server', and the
// rule that market money is never "earned from work" (D5). The rules are in market-model.test.ts, the server in server/market.test.ts.
import test from 'node:test';
import assert from 'node:assert/strict';
import { createLife, dispatch, viewLife } from '../life.ts';
import { makeContext } from './util.ts';
import { lagosDayStart, lagosTime } from './clock.ts';
import { allowance, buyingLeft } from './systems/business.ts';
import { freeOf } from './systems/wallet.ts';
import type { ActionBody, ActionResult, ActionType } from '../types/actions.ts';
import type { LifeContextInit, LifeState } from '../types/life.ts';

const NOW = lagosDayStart(lagosTime(Date.UTC(2026, 0, 5, 9)).day) + 9 * 3600000;
let seq = 0;
const ctxAt = (extra: LifeContextInit = {}) => { const actionId = `m-${++seq}`; return makeContext({ now: NOW, cityId: 'lagos', seed: actionId, actionId, ...extra }); };
function life(saved: Record<string, unknown> = {}): LifeState {
  const state = createLife({ cash: 30000, location: 'market', needs: { hunger: 40, energy: 60, fun: 40, social: 40, hygiene: 40, bladder: 60 }, social: { earned: 7000 }, ...saved }, ctxAt());
  state.t = NOW;
  return state;
}
const act = <T extends ActionType>(state: LifeState, type: T, payload?: unknown, extra?: LifeContextInit): ActionResult<T> => dispatch(state, { type, payload } as unknown as ActionBody<T>, ctxAt(extra));
const server = (state: LifeState, payload: unknown): ActionResult<'market.server'> => act(state, 'market.server', payload, { internal: true });

test('market.server is the server’s: a player cannot run it, and bad operations and amounts change nothing', () => {
  const state = life(), before = JSON.stringify({ ...state, message: '' });
  assert.equal(act(state, 'market.server', { op: 'withdraw', amount: 99999 }).code, 'server_only');
  assert.equal(JSON.stringify({ ...state, message: '' }), before);
  for (const payload of [{}, { op: 'mint', amount: 5 }, { op: 'constructor' }, { op: 'toString' }, null, 5, 'deposit']) assert.equal(server(state, payload).code, 'invalid_operation', JSON.stringify(payload));
  for (const op of ['deposit', 'withdraw']) for (const amount of [0, -1, 1.5, '100', Number.NaN, 2 ** 60, null, undefined, Infinity]) assert.equal(server(state, { op, amount }).code, 'invalid_amount', `${op} ${String(amount)}`);
  assert.equal(state.cash, 30000);
  assert.equal(state.ledger.length, 0);
});

test('a deposit is a debit and refuses what the life cannot pay; a withdrawal is a credit; each has its own ledger line', () => {
  const state = life();
  assert.equal(server(state, { op: 'deposit', amount: 12000 }).code, 'deposited');
  assert.equal(state.cash, 18000);
  const broke = server(state, { op: 'deposit', amount: 18001 });
  assert.equal(broke.ok, false);
  assert.equal(broke.code, 'insufficient_funds');
  assert.match(state.message, /₦18,001/);
  assert.equal(state.cash, 18000);
  assert.equal(server(state, { op: 'withdraw', amount: 4500 }).code, 'withdrawn');
  assert.equal(state.cash, 22500);
  assert.deepEqual(state.ledger.map((line) => [line.reason, line.amount]), [['Market deposit', -12000], ['Market withdrawal', 4500]]);
  assert.deepEqual(state.ledgerDays.at(-1)?.by, { 'Market deposit': [-12000, 1], 'Market withdrawal': [4500, 1] });
  // The life is exactly what a reload makes of it.
  assert.deepEqual(createLife(JSON.parse(JSON.stringify(state)), ctxAt()).ledger, state.ledger);
  // A balance at the supported limit cannot take a withdrawal.
  const rich = life({ cash: Number.MAX_SAFE_INTEGER - 5 });
  assert.equal(server(rich, { op: 'withdraw', amount: 10 }).code, 'balance_limit');
  assert.equal(rich.cash, Number.MAX_SAFE_INTEGER - 5);
});

test('D5: a withdrawal is not earned from work: it changes neither social.earned nor the gift and shop allowance, nor the unrestricted funds, nor debts', () => {
  // A life that earned ₦7,000 from work and holds ₦30,000.
  const state = life({ social: { earned: 7000 } });
  const view = () => ({ earned: state.social.earned, allowance: allowance(state), canSpend: buyingLeft(state, ctxAt()), free: freeOf(state), spent: state.business.spent, given: state.social.transfer.total, left: viewLife(state, ctxAt()).social.transfer.leftToday });
  const before = view();
  assert.equal(before.allowance, 7000);
  // Put ₦20,000 in, take ₦25,000 out (gains from trading): the earned figure and every allowance are exactly as before.
  assert.equal(server(state, { op: 'deposit', amount: 20000 }).code, 'deposited');
  assert.equal(server(state, { op: 'withdraw', amount: 45000 }).code, 'withdrawn');
  assert.equal(state.cash, 55000);
  assert.deepEqual(view(), before);
  assert.equal(state.social.earned, 7000);
  // …so only the ₦7,000 earned from work can ever be given away or spent at players' shops, however much the market paid out.
  const gift = (amount: number) => act(state, 'social.server', { op: 'transfer-out', to: '11111111-2222-4333-8444-555555555555', name: 'Bola', amount }, { internal: true });
  assert.equal(gift(5000).code, 'sent');
  assert.equal(gift(2001).code, 'gift_exceeds_earned');
  assert.equal(gift(2000).code, 'sent');
  assert.equal(allowance(state), 0);
  assert.equal(gift(100).code, 'gift_exceeds_earned', 'the market’s payout opened no new road for giving');
  // A life that owes money does not repay it from a withdrawal either (that is for earnings from work).
  const owing = life({ economy: { loan: { owed: 5000, principal: 5000, since: NOW, fees: 0 } } });
  const debt = JSON.stringify(owing.economy);
  assert.equal(server(owing, { op: 'withdraw', amount: 3000 }).code, 'withdrawn');
  assert.equal(JSON.stringify(owing.economy), debt);
  assert.equal(owing.cash, 33000);
});
