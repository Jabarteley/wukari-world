/**
 * OWNER: market
 * The life's side of the Allworld Market: a life's naira going into a city's market account and coming back. The account,
 * the orders and every rule are on the server (server/market/service.ts, rules in src/game/market-model.ts); this system
 * only moves the life's cash for them. It keeps no state of its own. Design: docs/MARKET.md.
 *
 * ACTION — SERVER ONLY (registry.ts): 'market.server' { op, amount }, run by server/market/service.ts through ctx.act inside
 * the store transaction that changes the account, so both are saved together and a player can never call it.
 *   deposit   { amount }   debit the life's cash (the wallet ledger says "Market deposit"); refused if it cannot pay
 *   withdraw  { amount }   credit the life's cash ("Market withdrawal")
 *
 * D5 (docs/crypto-token-research-2026-10-13/PHASES.md): market gains are NOT earned from work. A withdrawal is a plain
 * credit: it never raises social.earned, never feeds the gift or shop allowance (systems/business.ts allowance) and never
 * repays debt from "earnings". What the allowance counts is unchanged by a deposit or a withdrawal.
 */
import { LEFT_OUT, PLAYS } from '../profile.ts';
import { fail, isRecord, naira, ok, safeCount } from '../util.ts';
import { canAfford, canCredit, credit, debit } from '../api.ts';
import type { LifeContext, LifeState } from '../../types/life.ts';
import type { ServerOnlyAction, SystemDefinition, TypedActionHandler } from '../../types/registry.ts';

type Payload = Record<string, unknown>;
const noAmount = (state: LifeState) => fail(state, 'invalid_amount', 'That amount is not a whole number of naira.');

const ops = {
  deposit(state: LifeState, payload: Payload, ctx: LifeContext) {
    const amount = payload.amount;
    if (!safeCount(amount) || amount < 1) return noAmount(state);
    if (!canAfford(state, amount)) return fail(state, 'insufficient_funds', `You need ${naira(amount)}; you have ${naira(state.cash)}.`);
    if (!debit(state, amount, 'Market deposit', ctx)) return fail(state, 'insufficient_funds', `You need ${naira(amount)}; you have ${naira(state.cash)}.`);
    state.message = `${naira(amount)} moved into your market account.`;
    return ok(state, 'deposited');
  },
  withdraw(state: LifeState, payload: Payload, ctx: LifeContext) {
    const amount = payload.amount;
    if (!safeCount(amount) || amount < 1) return noAmount(state);
    if (!canCredit(state, amount)) return fail(state, 'balance_limit', 'Your saved balance has reached its supported limit.');
    credit(state, amount, 'Market withdrawal', ctx);
    state.message = `${naira(amount)} came back from your market account.`;
    return ok(state, 'withdrawn');
  },
} satisfies Record<string, (state: LifeState, payload: Payload, ctx: LifeContext) => ReturnType<TypedActionHandler<'market.server'>>>;

const isOp = (op: unknown): op is keyof typeof ops => typeof op === 'string' && Object.hasOwn(ops, op);
/** The body of 'market.server' (exported for tests). */
export const marketOp: TypedActionHandler<'market.server'> = (state, payload, ctx) => (isRecord(payload) && isOp(payload.op)
  ? ops[payload.op](state, payload, ctx)
  : fail(state, 'invalid_operation', 'That market operation does not exist.'));

/** What only a host that plays the game runs; the browser build leaves it out (PLAYS: src/game/profile.ts). */
const play = PLAYS ? {
  actions: {
    'market.server': { serverOnly: true, run: marketOp, refusal: 'This is completed by the server when your market account changes. Nothing was changed.' } satisfies ServerOnlyAction<'market.server'>,
  },
} satisfies Pick<SystemDefinition<'market'>, 'actions'> : LEFT_OUT;

export default {
  id: 'market',
  stateKeys: [],
  sanitize(_input: Record<string, unknown>, _state: LifeState): void {},
  ...play,
} satisfies SystemDefinition<'market'>;
