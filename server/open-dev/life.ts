/**
 * What open mode does to a life, through the rules engine's own server-only actions (nothing is written to a life by hand):
 * a new life finishes onboarding at once (look, traits, dream, birth lottery, a free house) and is topped up with unrestricted money.
 */
import { randomUUID } from 'node:crypto';
import { applyLifeAction } from '../life-service.ts';
import { TRAITS, TRAITS_REQUIRED } from '../../src/game/content/traits.ts';
import { dreamsFor } from '../../src/game/cities/characterContent.ts';
import { lgasOf } from '../../src/game/content/world.ts';
import type { CityId } from '../../src/types/protocol.ts';
import type { LifeState, TraitId } from '../../src/types/life.ts';

const REASON = 'Open dev mode';

function run(state: LifeState, cityId: CityId, now: number, type: Parameters<typeof applyLifeAction>[1]['type'], payload: Record<string, unknown>): boolean {
  const actionId = `${now}:${randomUUID()}`;
  return applyLifeAction(state, { type, cityId, payload, actionId }, { now, cityId, actionId, internal: true }).ok;
}

/** Credit `amount` as unrestricted money (it can be gifted and spent at players' stalls without the gift rules). */
export function fundLife(state: LifeState, cityId: CityId, now: number, amount: number): boolean {
  return Number.isSafeInteger(amount) && amount > 0 && run(state, cityId, now, 'wallet.admin', { op: 'credit', amount, reason: REASON, unrestricted: true });
}

/** Bring cash up to `target` (nothing when it is already there). */
export function topUp(state: LifeState, cityId: CityId, now: number, target: number): boolean {
  return state.cash >= target || fundLife(state, cityId, now, target - state.cash);
}

/**
 * A settled life with a home: the quick start's look, two traits, a dream, the birth lottery and the free starter house,
 * each through the action a player would take. Returns whether the life is settled afterwards.
 */
export function settleLife(state: LifeState, cityId: CityId, now: number): boolean {
  if (state.onboarding.done) return true;
  const unit = lgasOf(cityId)[0], dream = dreamsFor(cityId)[0];
  if (!unit || !dream) return false;
  const traits = (Object.keys(TRAITS) as TraitId[]).slice(0, TRAITS_REQUIRED);
  return run(state, cityId, now, 'onboarding.look', { shuffle: true })
    && run(state, cityId, now, 'onboarding.look', { look: state.onboarding.look })
    && run(state, cityId, now, 'onboarding.traits', { traits })
    && run(state, cityId, now, 'onboarding.dream', { dream: dream.id })
    && run(state, cityId, now, 'onboarding.lottery', {})
    && run(state, cityId, now, 'onboarding.home', { lga: unit.id, stay: true })
    && state.onboarding.done;
}
