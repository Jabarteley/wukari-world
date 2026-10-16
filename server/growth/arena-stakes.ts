/**
 * OWNER: games (real-time)
 * The MONEY of arena stakes (the rules are src/arena/stakes.ts; the room host server/growth/arena.ts calls this). Game naira only,
 * through the same server-only life action as table stakes ('tables.server': stake, pot, refund), so the gift rule, the 18+ rule and
 * the wallet lines are the table games' own, and the day limits (growth.tables.stakes) are SHARED with the tables: a person cannot
 * stake ₦10,000 at a table and another ₦10,000 in the arena on the same day.
 *
 * STORED   ctx.collection(db, 'arenapots') = { v: 1, pots: { [potId]: ArenaPot } }. One pot per match that has money on it: the two
 *          players' stakes (`play`) and/or the backers' (`backs`). The record is the receipt: money goes in in the same transaction
 *          that writes it, and comes out in the one that deletes it, so a pot is paid once.
 * RESTART  a pot whose room is not in memory (`owned`) belongs to no live match: the heartbeat gives every stake in it back.
 * ERASURE  a player with money in an unsettled pot cannot be erased until it is settled (server/admin/erasure-data.ts).
 * Portable: no Node imports.
 */
import { lagosTime } from '../../src/game/clock.ts'
import { pairKey, settlement, stakeBlock, stakeLabel, theyCannot } from '../../src/game/table-stakes.ts'
import type { StakeFacts } from '../../src/game/table-stakes.ts'
import { passedOn } from '../../src/game/systems/growth.ts'
import { MAX_BACKERS, backOutcome, isBackStake, isPlayStake, playOutcome, settleBacks } from '../../src/arena/stakes.ts'
import { characterCity } from '../character.ts'
import { growthOf } from './data.ts'
import { count } from './metrics.ts'
import type { CityId } from '../../src/types/protocol.ts'
import type { LifeState } from '../../src/types/life.ts'
import type { Db, RouteContext } from '../types.ts'

export const POTS = 'arenapots'
export interface PotSeat { id: string; name: string }
export interface PotBack { id: string; name: string; seat: number; amount: number }
export interface ArenaPot {
  game: string
  /** The game's name, for the wallet lines. */
  label: string
  /** Lagos day it was opened (the day limits it counted against). */
  day: number
  at: number
  /** The seat names, for the backers' lines. */
  names: string[]
  play: { stake: number; seats: PotSeat[] } | null
  backs: PotBack[]
}
export interface PotCollection { v: 1; pots: Record<string, ArenaPot> }

const isRecord = (value: unknown): value is Record<string, unknown> => value !== null && typeof value === 'object' && !Array.isArray(value)
const ready = (state: LifeState | null | undefined): state is LifeState => Boolean(state) && !(state?.onboarding?.required === true && state.onboarding.done !== true)

export function potsOf(ctx: Pick<RouteContext, 'collection'>, db: Db): PotCollection {
  const found = ctx.collection(db, POTS, { v: 1, pots: {} }) as Partial<PotCollection>
  if (found.v !== 1) found.v = 1
  if (!isRecord(found.pots)) found.pots = {}
  return found as PotCollection
}
export const peekPots = (db: Db): PotCollection | null => { const found = (db as Record<string, unknown>)[POTS]; return isRecord(found) && isRecord(found.pots) ? found as unknown as PotCollection : null }
/** Every public id with money in an unsettled pot (the erasure preflight refuses them). */
export function idsWithMoney(db: Db): Set<string> {
  const out = new Set<string>()
  for (const pot of Object.values(peekPots(db)?.pots ?? {})) { for (const s of pot?.play?.seats ?? []) out.add(s.id); for (const b of pot?.backs ?? []) out.add(b.id) }
  return out
}

export type StakeAnswer = { ok: true } | { ok: false; code: string; reason: string }
const no = (code: string, reason: string): StakeAnswer => ({ ok: false, code, reason })

export function arenaStakes(ctx: RouteContext) {
  /** Pots whose match is in memory. Any other pot is returned by the sweep. */
  const owned = new Set<string>()
  let sweepDue = true
  const now = (): number => ctx.now()
  const blocked = (a: string, b: string): boolean => ctx.checks?.blocked?.(a, b) === true
  function sharedDevice(db: Db, a: string, b: string): boolean {
    const mine = db.growth?.players?.[a]?.devices, theirs = db.growth?.players?.[b]?.devices
    return Array.isArray(mine) && Array.isArray(theirs) && mine.some((hash) => theirs.includes(hash))
  }
  /** A person's life wherever their character is now (an arena room needs no city). */
  function lifeOf(db: Db, id: string): { life: LifeState; city: CityId } | null {
    const session = ctx.core.sessionByPublicId(db, id)
    const city = session ? characterCity(session) : null
    return session && city && session.cities?.[city] ? { life: ctx.settle(session, city), city } : null
  }
  const lifeAct = (found: { life: LifeState; city: CityId }, payload: Record<string, unknown>) => ctx.act(found.life, { type: 'tables.server', cityId: found.city, payload,
    stateGuard: 'the arena pot record is created or deleted in this same transaction, so a stake or a prize is paid once' })
  function bookOf(db: Db, day: number) {
    const g = growthOf(ctx, db)
    return g.tables.stakes?.day === day ? g.tables.stakes : (g.tables.stakes = { day, players: {}, pairs: {} })
  }
  function factsOf(db: Db, id: string, state: LifeState, other: string | null, day: number): StakeFacts {
    const book = growthOf(ctx, db).tables.stakes, today = book?.day === day ? book : null
    return { earned: state.social?.earned ?? 0, passed: passedOn(state), cash: state.cash, adult: ctx.checks?.adult?.(db, id) === true, playerToday: today?.players[id] ?? 0, pairToday: other ? today?.pairs[pairKey(id, other)] ?? 0 : 0 }
  }
  /** Why `id` may not put `amount` in beside `others`, or null. */
  function why(db: Db, id: string, others: readonly string[], amount: number, day: number, pair: boolean): StakeAnswer | null {
    if (others.some((other) => other !== id && (blocked(id, other) || sharedDevice(db, id, other)))) return no('stake_refused', 'You cannot stake on a match with this player.')
    const found = lifeOf(db, id)
    if (!found || !ready(found.life)) return no('not_ready', 'Finish creating your character first.')
    const refusal = stakeBlock(factsOf(db, id, found.life, pair ? others[0] ?? null : null, day), amount)
    return refusal ? no(refusal.code, refusal.reason) : null
  }

  /** Pay out or return a pot inside the caller's transaction and delete it. Sentences per person. False: no such pot (already settled). */
  function settleIn(db: Db, id: string, result: { winners: readonly number[]; draw: boolean } | null, moved: boolean, out: Map<string, string>): boolean {
    const c = potsOf(ctx, db), pot = c.pots[id]
    if (!pot) return false
    // A stake that comes back gives its room in the day's limits back too (as at the tables); a stake played for stays counted.
    const book = growthOf(ctx, db).tables.stakes, release = (who: string, amount: number): void => {
      if (book && book.day === pot.day) book.players[who] = Math.max(0, (book.players[who] ?? 0) - amount)
    }
    if (pot.play) {
      const plan = result ? settlement(result, moved ? 1 : 0) : { kind: 'refund' as const }
      pot.play.seats.forEach((seat, index) => {
        const found = lifeOf(db, seat.id), other = pot.play?.seats[1 - index]
        if (!found) { ctx.core.log?.(`Arena pot ${id}: a player has no life left to pay`); return }
        const label = stakeLabel(pot.label, other?.name ?? 'a player'), stake = pot.play?.stake ?? 0
        const paid = plan.kind === 'refund' ? lifeAct(found, { op: 'refund', amount: stake, label }) : plan.seat === index ? lifeAct(found, { op: 'pot', amount: stake * 2, stake, label }) : null
        if (paid && !paid.ok) ctx.core.log?.(`Arena pot ${id}: ${paid.code}`)
        out.set(seat.id, playOutcome(stake, plan.kind === 'refund' ? 'refunded' : plan.seat === index ? 'won' : 'lost'))
        if (plan.kind === 'refund') release(seat.id, stake)
      })
      const [a, b] = pot.play.seats
      if (plan.kind === 'refund' && a && b && book && book.day === pot.day) { const key = pairKey(a.id, b.id); book.pairs[key] = Math.max(0, (book.pairs[key] ?? 0) - pot.play.stake) }
    }
    const winner = result && !result.draw && result.winners.length === 1 ? result.winners[0] ?? null : null
    for (const p of settleBacks(pot.backs, moved ? winner : null)) {
      const back = pot.backs.find((b) => b.id === p.id)
      const found = lifeOf(db, p.id)
      if (!back || !found) continue
      const label = `Backing ${pot.names[back.seat] ?? 'a player'} in ${pot.label}`.slice(0, 40)
      const paid = p.refund ? lifeAct(found, { op: 'refund', amount: p.stake, label }) : p.paid > 0 ? lifeAct(found, { op: 'pot', amount: p.paid, stake: p.stake, label }) : null
      if (paid && !paid.ok) ctx.core.log?.(`Arena pot ${id}: ${paid.code}`)
      out.set(p.id, backOutcome(p, pot.names[back.seat] ?? 'The player'))
      if (p.refund) release(p.id, p.stake)
    }
    delete c.pots[id]
    return true
  }

  async function sweep(): Promise<void> {
    const orphans = await ctx.store.read((db) => Object.keys(peekPots(db)?.pots ?? {}).filter((id) => !owned.has(id)))
    for (const id of orphans) {
      try { await ctx.store.transact((db) => { if (!owned.has(id) && settleIn(db, id, null, false, new Map())) ctx.core.log?.(`Arena pot ${id} returned to everyone in it`) }) }
      catch { sweepDue = true }
    }
  }
  ctx.on?.('heartbeat', () => { if (sweepDue) { sweepDue = false; void sweep() } })

  return {
    /** A match with this pot id is in memory (its money must not be swept). */
    own(id: string): void { owned.add(id) },
    /** The match is gone without a result (the room closed): give everything back. */
    async drop(id: string): Promise<void> {
      if (!owned.delete(id)) return
      try { await ctx.store.transact((db) => { settleIn(db, id, null, false, new Map()) }) } catch { sweepDue = true }
    },
    /** Why this person cannot play for `amount` against `other` (the host asks before setting it), or null. */
    async refusal(id: string, others: readonly string[], amount: number): Promise<StakeAnswer | null> {
      if (!isPlayStake(amount) || amount <= 0) return no('invalid_stake', 'Choose one of the stakes, or play for nothing.')
      const day = lagosTime(now()).day
      return ctx.store.read((db) => why(db, id, others, amount, day, others.length === 1))
    },
    /** Take both players' stakes and open the pot, in ONE transaction. A refusal names who cannot (never why: that is theirs). */
    async play(id: string, game: string, label: string, seats: readonly PotSeat[], stake: number, caller: string): Promise<StakeAnswer> {
      if (!isPlayStake(stake) || stake <= 0 || seats.length !== 2) return no('invalid_stake', 'A match for a stake is played by two people.')
      const day = lagosTime(now()).day
      try {
        return await ctx.store.transact((db) => {
          const c = potsOf(ctx, db)
          if (c.pots[id]?.play) return { ok: true } as StakeAnswer
          for (const [index, seat] of seats.entries()) {
            const other = seats[1 - index] as PotSeat
            const refused = why(db, seat.id, [other.id], stake, day, true)
            if (refused) throw Object.assign(new Error('stake_refused'), { answer: seat.id === caller ? refused : no('stake_refused', theyCannot(seat.name)) })
          }
          for (const [index, seat] of seats.entries()) {
            const found = lifeOf(db, seat.id) as { life: LifeState; city: CityId }, other = seats[1 - index] as PotSeat
            const taken = lifeAct(found, { op: 'stake', amount: stake, label: stakeLabel(label, other.name) })
            if (!taken.ok) throw Object.assign(new Error('stake_refused'), { answer: no(taken.code, seat.id === caller ? taken.reason ?? 'That stake was refused.' : theyCannot(seat.name)) })
          }
          const book = bookOf(db, day), [a, b] = seats as [PotSeat, PotSeat]
          for (const seat of seats) book.players[seat.id] = (book.players[seat.id] ?? 0) + stake
          book.pairs[pairKey(a.id, b.id)] = (book.pairs[pairKey(a.id, b.id)] ?? 0) + stake
          const pot = c.pots[id] ?? (c.pots[id] = { game, label, day, at: now(), names: seats.map((s) => s.name), play: null, backs: [] })
          pot.play = { stake, seats: seats.map((s) => ({ id: s.id, name: s.name })) }
          count(growthOf(ctx, db), now(), 'lagos', `arena.staked.${game}`)
          owned.add(id)
          return { ok: true } as StakeAnswer
        })
      } catch (error) {
        const answer = (error as { answer?: StakeAnswer }).answer
        if (answer) return answer
        throw error
      }
    },
    /** A watcher backs `seat` with `amount`: taken now, in the transaction that records it. Once a match, MAX_BACKERS at most. */
    async back(id: string, game: string, label: string, names: readonly string[], seated: readonly string[], who: PotSeat, seat: number, amount: number): Promise<StakeAnswer> {
      if (!isBackStake(amount)) return no('invalid_stake', 'Choose ₦100 or ₦500.')
      if (seated.includes(who.id)) return no('stake_refused', 'You are playing in this match: you cannot back a side.')
      if (!Number.isInteger(seat) || seat < 0 || seat >= names.length) return no('invalid_seat', 'Choose a player to back.')
      const day = lagosTime(now()).day
      return ctx.store.transact((db) => {
        const c = potsOf(ctx, db), pot = c.pots[id]
        if (pot?.backs.some((b) => b.id === who.id)) return no('already_backed', 'You have backed a side in this match already.')
        if ((pot?.backs.length ?? 0) >= MAX_BACKERS) return no('backers_full', 'Enough people have backed this match.')
        const refused = why(db, who.id, seated, amount, day, false)
        if (refused) return refused
        const found = lifeOf(db, who.id) as { life: LifeState; city: CityId }
        const taken = lifeAct(found, { op: 'stake', amount, label: `Backing ${names[seat] ?? 'a player'} in ${label}`.slice(0, 40) })
        if (!taken.ok) return no(taken.code, taken.reason ?? 'That stake was refused.')
        const book = bookOf(db, day)
        book.players[who.id] = (book.players[who.id] ?? 0) + amount
        const open = pot ?? (c.pots[id] = { game, label, day, at: now(), names: [...names], play: null, backs: [] })
        open.names = [...names]
        open.backs.push({ id: who.id, name: who.name, seat, amount })
        count(growthOf(ctx, db), now(), 'lagos', `arena.backed.${game}`)
        owned.add(id)
        return { ok: true } as StakeAnswer
      })
    },
    /** Settle a finished match's pot: what each person in it is told. Empty when there was no money on it. */
    async settle(id: string, result: { winners: readonly number[]; draw: boolean }, moved: boolean): Promise<Map<string, string>> {
      const out = new Map<string, string>()
      if (!owned.has(id)) return out
      try { await ctx.store.transact((db) => { settleIn(db, id, result, moved, out) }); owned.delete(id) }
      catch (error) { sweepDue = true; owned.delete(id); ctx.core.log?.(`Arena pot ${id} not settled yet: ${String((error as Error)?.message ?? error).slice(0, 120)}`) }
      return out
    },
    /** For tests: run the sweep now. */
    sweep,
  }
}
export type ArenaStakes = ReturnType<typeof arenaStakes>
