/**
 * OWNER: minigames (docs/MINI-GAMES.md)
 * What the three mini-games' services share: refusals, ids, the day, and the caller's settled life in the city of the request.
 */
import { characterCity } from '../character.ts';
import { lagosTime } from '../../src/game/clock.ts';
import type { Db, RouteContext, SessionRecord } from '../types.ts';
import type { CityId } from '../../src/types/protocol.ts';
import type { LifeState } from '../../src/types/life.ts';

export type Refused = { ok: false; code: string; reason: string };
export const no = (code: string, reason: string): Refused => ({ ok: false, code, reason });
/** What a once-only write keeps as its receipt (a receipt holds at most 2 KB): the route reads the state after it. */
export type Small = { ok: true; said?: string; paid?: number; viaModel?: boolean };
/** The most any mini-game season pays one person in a game day (NYSC's passing out is the biggest single payment). */
export const SEASON_DAY_CAP = 12_000;
export const dayOf = (at: number): number => lagosTime(at).day;
export const whole = (value: unknown, max: number): number => (typeof value === 'number' && Number.isFinite(value) ? Math.min(max, Math.max(0, Math.floor(value))) : 0);
export const idOf = (value: unknown, pattern = /^[a-z0-9][a-z0-9-]{0,39}$/): string | null => (typeof value === 'string' && pattern.test(value) ? value : null);

/** The caller's character in the city of the request, settled and able to play. Throws the host's refusal when the character lives elsewhere or has not finished setting up. */
export function workerOf(ctx: RouteContext) {
  return (session: SessionRecord, cityId: string): LifeState => {
    ctx.checks?.cityGate?.(session, cityId);
    if (characterCity(session) !== cityId) throw Object.assign(ctx.fail(409, 'city_moved'), { reason: 'Your character lives in another city now.' });
    const life = ctx.settle(session, cityId as CityId);
    if (life.onboarding.required) throw Object.assign(ctx.fail(403, 'onboarding_required'), { reason: 'Finish setting up your character first.' });
    return life;
  };
}
export type Worker = ReturnType<typeof workerOf>;

/** Game naira into the life through the one server-only action (src/game/systems/living-world.ts `minigame-reward`); 0 when the wallet is full. */
export function reward(ctx: RouteContext, life: LifeState, city: string, amount: number, kind: 'nysc' | 'jamb'): number {
  if (!(amount > 0)) return 0;
  const acted = ctx.act(life, { type: 'living-world.server', cityId: city as CityId, payload: { op: 'minigame-reward', amount, kind },
    stateGuard: 'The season row is marked paid in the same transaction, so a repeat finds it done.' });
  return acted.ok ? amount : 0;
}
export type { Db };
