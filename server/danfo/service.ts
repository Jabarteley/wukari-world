/**
 * OWNER: danfo
 * DRIVE A DANFO (docs/DANFO.md): the server half. The browser plays the road; this file decides what a run is worth.
 *
 * STORED   ctx.collection(db, 'danfo') = { v: 1, runs: { [runId]: RunRow }, active: { [publicId]: runId } (a driver's live run),
 *          riding: { [publicId]: runId } (a crew member's run), days: { [publicId]: { day, earned, runs } },
 *          boards: { [routeId@week]: BoardRow[] }, live: { [city]: runId[] }, order: [runId, startedAt][] }.
 *          A run is kept for KEEP_MS after it starts (its card, a conductor's share), then pruned with its pointers.
 * TRUST    the server draws the seed and the traffic, stamps the time of every stop report itself, refuses a stop reached sooner than
 *          the top speed allows (the run is void: nothing is paid), and settles from the stops it recorded with the same arithmetic the
 *          browser shows (src/danfo/run.ts tally). The browser sends only "served" or "passed" for the next stop, and its count of hard
 *          brakes and crashes, which can only take money away. A run pays at most RUN_CAP; a player's runs at most DAY_CAP and
 *          RUNS_PER_DAY paid runs a game day; a conductor's share counts toward the conductor's own day. Game naira only, through the
 *          living-world server action (never real money).
 * CREW     players in the same city may ride along (passengers: the driver earns RIDER_BONUS each) or take the conductor's role (one;
 *          +10% fares for the driver, and the conductor collects CONDUCTOR_SHARE of the fares). A conductor's shout picks a line from the
 *          city's conductor bank; no player text is stored.
 * PUBLIC   the board, the "leaving now" list and the gist line name a driver only when an adult who is not hidden from the directory;
 *          otherwise "A driver". The gist line is written when a run takes first place on its line for the week.
 */
import { characterCity } from '../character.ts'
import { gistService } from '../gist/ledger.ts'
import { pulseOf } from '../pulse.ts'
import { settingsOf } from '../admin/settings.ts'
import { lagosTime } from '../../src/game/clock.ts'
import { naira } from '../../src/game/money.ts'
import { cityRules } from '../../src/game/cities/index.ts'
import { DANFO_CITIES, RUN_MAX_MS, minRunMs, routeById, routesFor } from '../../src/danfo/routes.ts'
import type { DanfoRoute } from '../../src/danfo/routes.ts'
import { DAY_CAP, MAX_COUNT, MAX_RIDERS, RUN_CAP, RUNS_PER_DAY, capForDay, conductorShare, manifest, tally, trafficFrom } from '../../src/danfo/run.ts'
import type { StopCall } from '../../src/danfo/run.ts'
import { boardKey, dayOf, enter, placeOf, weekOf } from '../../src/danfo/board.ts'
import type { BoardRow } from '../../src/danfo/board.ts'
import { conductorLine } from '../../src/danfo/conductor.ts'
import type { DanfoCrewView, DanfoLeaving, DanfoLineView, DanfoPark, DanfoResult, DanfoRole, DanfoRunStatus, DanfoRunView, DanfoShout } from '../../src/types/danfo.ts'
import type { Db, RouteContext, SessionRecord } from '../types.ts'
import type { CityId } from '../../src/types/protocol.ts'
import type { LifeState } from '../../src/types/life.ts'

export const KEEP_MS = 24 * 3600_000
const ORDER_MAX = 4000, SHOUTS_KEPT = 6, SHOUT_EVERY_MS = 2500, LEAVING_MAX = 10, LIVE_PER_CITY = 200

interface CrewRow { id: string; name: string; role: DanfoRole; at: number; paid: number | null }
interface ShoutRow extends DanfoShout { id: string }
export interface RunRow {
  id: string; driver: string; name: string; city: string; routeId: string; version: number; seed: string; traffic: number
  startedAt: number; status: DanfoRunStatus; next: number; calls: StopCall[]; times: number[]
  crew: CrewRow[]; shouts: ShoutRow[]; result: DanfoResult | null; reason?: string; endedAt?: number
}
interface DayRow { day: number; earned: number; runs: number }
export interface DanfoCollection {
  v: 1
  runs: Record<string, RunRow>
  active: Record<string, string>
  riding: Record<string, string>
  days: Record<string, DayRow>
  boards: Record<string, BoardRow[]>
  live: Record<string, string[]>
  order: [string, number][]
}

const record = (value: unknown): value is Record<string, unknown> => value !== null && typeof value === 'object' && !Array.isArray(value)
const empty = (): DanfoCollection => ({ v: 1, runs: {}, active: {}, riding: {}, days: {}, boards: {}, live: {}, order: [] })
/** The collection, repaired in place so damaged data cannot crash a route. */
export function danfoOf(ctx: Pick<RouteContext, 'collection'>, db: Db): DanfoCollection {
  const found = ctx.collection(db, 'danfo', empty()) as Partial<DanfoCollection>
  for (const key of ['runs', 'active', 'riding', 'days', 'boards', 'live'] as const) if (!record(found[key])) (found as Record<string, unknown>)[key] = {}
  if (!Array.isArray(found.order)) found.order = []
  found.v = 1
  return found as DanfoCollection
}
/** What a read sees: nothing is created. */
export function peekDanfo(db: Db): DanfoCollection | null {
  const found = (db as unknown as Record<string, unknown>).danfo
  return record(found) && record(found.runs) ? found as unknown as DanfoCollection : null
}

/** Permanent erasure (server/admin/erasure-data.ts): a player's runs as driver, their crew places, shouts, days and board rows. */
export function forgetDanfoPlayers(db: Db, ids: ReadonlySet<string>): void {
  const c = peekDanfo(db)
  if (!c) return
  for (const [runId, run] of Object.entries(c.runs)) {
    if (ids.has(run.driver)) { delete c.runs[runId]; continue }
    if (run.crew.some((member) => ids.has(member.id)) || run.shouts.some((shout) => ids.has(shout.id))) {
      run.crew = run.crew.filter((member) => !ids.has(member.id)); run.shouts = run.shouts.filter((shout) => !ids.has(shout.id))
    }
  }
  for (const id of ids) { delete c.active[id]; delete c.riding[id]; delete c.days[id] }
  for (const [key, rows] of Object.entries(c.boards)) if (Array.isArray(rows) && rows.some((row) => ids.has(row.id))) c.boards[key] = rows.filter((row) => !ids.has(row.id))
  for (const [key, runId] of Object.entries(c.riding)) if (!c.runs[runId]) delete c.riding[key]
  for (const [key, runId] of Object.entries(c.active)) if (!c.runs[runId]) delete c.active[key]
  for (const [city, list] of Object.entries(c.live)) c.live[city] = list.filter((runId) => c.runs[runId])
  c.order = c.order.filter(([runId]) => c.runs[runId])
}

type Refused = { ok: false; code: string; reason: string }
/** What a once-only write keeps as its receipt (small: a receipt holds at most 2 KB); the route reads the run after it. */
export type Small = { ok: true; runId: string; paid?: number }
const no = (code: string, reason: string): Refused => ({ ok: false, code, reason })
const id = (value: unknown): value is string => typeof value === 'string' && /^[A-Za-z0-9_-]{6,64}$/.test(value)
const whole = (value: unknown, max: number): number => (typeof value === 'number' && Number.isFinite(value) ? Math.min(max, Math.max(0, Math.floor(value))) : 0)

export function danfoService(ctx: RouteContext) {
  const settings = (): ReturnType<typeof settingsOf> | null => { try { return settingsOf(ctx) } catch { return null } }
  const open = (): boolean => settings()?.get('danfoOpen') !== false
  const view3d = (): boolean => settings()?.get('danfo3d') !== false

  /** A name for a public list: an adult not hidden from the directory, else "A driver". */
  function shown(db: Db, playerId: string, name: string): string {
    const prefs = record(db.civic) && record((db.civic as Record<string, unknown>).prefs) ? ((db.civic as Record<string, unknown>).prefs as Record<string, unknown>)[playerId] : null
    const hidden = record(prefs) && prefs.directory === true
    return !hidden && ctx.checks?.adult?.(db, playerId) === true ? name.slice(0, 24) : 'A driver'
  }
  function trafficNow(city: string, now: number): number {
    let people = 0
    try { people = pulseOf(ctx).pulse(null).cities[city] ?? 0 } catch { /* no counts yet: a quiet road */ }
    return trafficFrom(people, lagosTime(now).hour)
  }
  const lineOf = (run: RunRow): DanfoRoute | undefined => { const line = routeById(run.routeId); return line && line.version === run.version ? line : undefined }

  /** A live run past its time is closed; a run whose line changed under it is closed. Returns whether it changed. */
  function expire(c: DanfoCollection, run: RunRow, now: number): boolean {
    if (run.status !== 'live') return false
    if (now - run.startedAt <= RUN_MAX_MS && lineOf(run)) return false
    run.status = 'closed'; run.reason = 'expired'; run.endedAt = now
    if (c.active[run.driver] === run.id) delete c.active[run.driver]
    unlist(c, run)
    return true
  }
  function unlist(c: DanfoCollection, run: RunRow): void {
    const list = c.live[run.city]
    if (list) { c.live[run.city] = list.filter((item) => item !== run.id); if (!c.live[run.city]!.length) delete c.live[run.city] }
  }
  /** Old runs go, with every pointer to them. Runs on writes that start a run. */
  function prune(c: DanfoCollection, now: number): void {
    while (c.order.length && (c.order.length > ORDER_MAX || now - c.order[0]![1] > KEEP_MS)) {
      const [runId] = c.order.shift()!
      const run = c.runs[runId]
      if (!run) continue
      if (c.active[run.driver] === runId) delete c.active[run.driver]
      for (const member of run.crew) if (c.riding[member.id] === runId) delete c.riding[member.id]
      unlist(c, run)
      delete c.runs[runId]
    }
    // Weeks before last are no longer shown.
    const week = weekOf(now)
    for (const key of Object.keys(c.boards)) { const at = Number(key.split('@')[1]); if (!(at >= week - 1)) delete c.boards[key] }
  }

  function view(db: Db, run: RunRow, me: string): DanfoRunView {
    const crew: DanfoCrewView[] = run.crew.map((member) => ({ name: shown(db, member.id, member.name), role: member.role, you: member.id === me }))
    const you = run.driver === me ? 'driver' as const : run.crew.find((member) => member.id === me)?.role ?? null
    const mine = run.crew.find((member) => member.id === me)
    return {
      id: run.id, routeId: run.routeId, city: run.city, seed: run.seed, traffic: run.traffic, startedAt: run.startedAt, status: run.status,
      next: run.next, calls: [...run.calls], driver: run.driver === me ? run.name : shown(db, run.driver, run.name), you, crew,
      shouts: run.shouts.map(({ at, line, by }) => ({ at, line, by })), result: run.result,
      ...(run.reason ? { reason: run.reason } : {}),
      ...(mine?.role === 'conductor' ? { share: mine.paid } : {}),
    }
  }
  function today(c: DanfoCollection, playerId: string, now: number): DayRow {
    const day = dayOf(now), row = c.days[playerId]
    return row && row.day === day ? row : { day, earned: 0, runs: 0 }
  }
  function lines(db: Db, city: string, now: number): DanfoLineView[] {
    const c = peekDanfo(db), week = weekOf(now)
    return routesFor(city).map((line) => {
      const first = c?.boards[boardKey(line.id, week)]?.[0]
      return { id: line.id, name: line.name, road: line.road, vehicle: line.vehicle, stops: line.stops.map((stop) => stop.name), km: line.stops.at(-1)?.km ?? 0,
        best: first ? { name: shown(db, first.id, first.name), earned: first.earned, ms: first.ms } : null }
    })
  }
  /** The caller's character, in the city of the request, able to work. */
  function worker(session: SessionRecord, cityId: string): LifeState {
    ctx.checks?.cityGate?.(session, cityId)
    if (characterCity(session) !== cityId) throw Object.assign(ctx.fail(409, 'city_moved'), { reason: 'Your character lives in another city now.' })
    const life = ctx.settle(session, cityId as CityId)
    if (life.onboarding.required) throw Object.assign(ctx.fail(403, 'onboarding_required'), { reason: 'Finish setting up your character first.' })
    return life
  }
  /** Pays game naira into the caller's life in `city`, inside the transaction that settles the run. 0 when the wallet is full. */
  function pay(life: LifeState, city: string, amount: number, role: 'driver' | 'conductor'): number {
    if (amount <= 0) return 0
    const acted = ctx.act(life, { type: 'living-world.server', cityId: city as CityId, payload: { op: 'danfo-fare', amount, role },
      stateGuard: 'The danfo run row is marked settled or collected in the same transaction, so a repeat finds it paid.' })
    return acted.ok ? amount : 0
  }

  function leave(db: Db, session: SessionRecord, body: Record<string, unknown>): { ok: true; run: DanfoRunView } | Refused {
    const c = danfoOf(ctx, db), run = id(body.runId) ? c.runs[body.runId] : undefined, me = session.publicId
    if (!run) { delete c.riding[me]; return no('unknown_run', 'That run has ended.') }
    // A conductor who still has a share to collect keeps the place on a settled run.
    if (run.status === 'live') run.crew = run.crew.filter((member) => member.id !== me)
    if (c.riding[me] === run.id) delete c.riding[me]
    return { ok: true, run: view(db, run, me) }
  }

  return {
    open, view3d,
    park(db: Db, session: SessionRecord, city: string, now: number): DanfoPark & { ok: true } {
      const c = peekDanfo(db), me = session.publicId
      const own = c?.active[me] ? c.runs[c.active[me]!] : undefined, ride = c?.riding[me] ? c.runs[c.riding[me]!] : undefined
      const leaving: DanfoLeaving[] = []
      for (const runId of c?.live[city] ?? []) {
        const run = c!.runs[runId]
        if (!run || run.status !== 'live' || run.driver === me || now - run.startedAt > RUN_MAX_MS || ctx.checks?.blocked?.(me, run.driver)) continue
        leaving.push({ id: run.id, routeId: run.routeId, driver: shown(db, run.driver, run.name), next: run.next, crew: run.crew.length, conductor: run.crew.some((member) => member.role === 'conductor') })
        if (leaving.length >= LEAVING_MAX) break
      }
      const day = c ? today(c, me, now) : { earned: 0, runs: 0 }
      return {
        ok: true, open: open() && DANFO_CITIES.includes(city), city, hub: cityRules(city)?.hub?.road ?? 'the motor park', lines: lines(db, city, now),
        today: { earned: day.earned, runs: day.runs }, caps: { run: RUN_CAP, day: DAY_CAP, runs: RUNS_PER_DAY },
        mine: own ? view(db, own, me) : null, riding: ride ? view(db, ride, me) : null, leaving, view3d: view3d(), traffic: trafficNow(city, now),
      }
    },

    /** Inside ctx.once: a new run for the caller. */
    start(db: Db, session: SessionRecord, body: Record<string, unknown>): Small | Refused {
      const cityId = String(body.cityId ?? ''), line = routeById(body.routeId), now = ctx.now(), me = session.publicId
      if (!open()) return no('danfo_closed', 'The motor park is closed for now. Try again later.')
      if (!line || line.city !== cityId) return no('unknown_route', 'That line does not run from this motor park.')
      const life = worker(session, cityId)
      if (life.activeAction !== null) return no('busy', 'Finish what you are doing first.')
      const c = danfoOf(ctx, db)
      prune(c, now)
      const current = c.active[me] ? c.runs[c.active[me]!] : undefined
      if (current && !expire(c, current, now) && current.status === 'live') return no('run_live', 'You are already driving a run. Finish it or leave it first.')
      const riding = c.riding[me] ? c.runs[c.riding[me]!] : undefined
      if (riding && !expire(c, riding, now) && riding.status === 'live') return no('riding', 'You are riding in someone else\'s bus. Get down first.')
      if ((c.live[cityId]?.length ?? 0) >= LIVE_PER_CITY) return no('park_full', 'Too many buses are out right now. Try again in a minute.')
      const run: RunRow = { id: ctx.randomId().replace(/-/g, '').slice(0, 20), driver: me, name: ctx.publicSession(session).name, city: cityId, routeId: line.id, version: line.version,
        seed: ctx.randomId(), traffic: trafficNow(cityId, now), startedAt: now, status: 'live', next: 1, calls: [], times: [], crew: [], shouts: [], result: null }
      c.runs[run.id] = run; c.active[me] = run.id; c.order.push([run.id, now])
      ;(c.live[cityId] ??= []).push(run.id)
      return { ok: true, runId: run.id }
    },

    /** A stop served or passed. The server's own clock decides whether it was possible. */
    stop(db: Db, session: SessionRecord, body: Record<string, unknown>): { ok: true; run: DanfoRunView } | Refused {
      const c = danfoOf(ctx, db), run = id(body.runId) ? c.runs[body.runId] : undefined, now = ctx.now(), me = session.publicId
      if (!run || run.driver !== me) return no('unknown_run', 'That run is not yours.')
      expire(c, run, now)
      const line = lineOf(run)
      const stop = whole(body.stop, 99), call = body.call
      if (call !== 'served' && call !== 'passed') return no('invalid_request', 'Say whether the stop was served or passed.')
      // A repeat of a report already taken (the answer was lost) is answered with the run as it is.
      if (stop >= 1 && stop < run.next && run.calls[stop - 1] === call) return { ok: true, run: view(db, run, me) }
      if (run.status !== 'live' || !line) return no('run_over', run.status === 'void' ? 'This run was voided.' : 'This run is over.')
      const last = line.stops.length - 1
      if (stop !== run.next || stop > last) return no('out_of_order', 'That is not the next stop.')
      if (stop === last && call !== 'served') return no('invalid_request', 'The last stop is where the run ends: stop there.')
      const elapsed = now - run.startedAt, served = run.calls.filter((item) => item === 'served').length
      if (elapsed < minRunMs(line, stop, served)) {
        run.status = 'void'; run.reason = 'too_fast'; run.endedAt = now
        delete c.active[me]; unlist(c, run)
        return no('too_fast', 'The bus reached that stop faster than a danfo can. This run does not count.')
      }
      run.calls.push(call); run.times.push(elapsed); run.next = stop + 1
      return { ok: true, run: view(db, run, me) }
    },

    /** Inside ctx.once: the end of the line. Tallies from the recorded stops, caps, pays, ranks and tells the gist. */
    finish(db: Db, session: SessionRecord, body: Record<string, unknown>): Small | Refused {
      const c = danfoOf(ctx, db), run = id(body.runId) ? c.runs[body.runId] : undefined, now = ctx.now(), me = session.publicId
      if (!run || run.driver !== me) return no('unknown_run', 'That run is not yours.')
      if (run.status === 'settled') return { ok: true, runId: run.id }
      expire(c, run, now)
      const line = lineOf(run)
      if (run.status !== 'live' || !line) return no('run_over', run.status === 'void' ? 'This run was voided.' : 'This run is over.')
      const last = line.stops.length - 1
      if (run.next !== last + 1 || run.calls.at(-1) !== 'served') return no('not_finished', 'Drive to the last stop first.')
      const life = worker(session, run.city)
      const hardBrakes = whole(body.hardBrakes, MAX_COUNT), crashes = whole(body.crashes, MAX_COUNT), ms = run.times.at(-1) ?? 0
      const riders = run.crew.filter((member) => member.role === 'passenger').length, conductor = run.crew.some((member) => member.role === 'conductor')
      const sum = tally(line, manifest(run.seed, line, run.traffic), { calls: run.calls, hardBrakes, crashes, ms, riders: Math.min(MAX_RIDERS, riders), conductor })
      const day = today(c, me, now)
      const allowed = capForDay(sum.earned, day.earned, day.runs)
      const paid = pay(life, run.city, allowed, 'driver')
      c.days[me] = { day: day.day, earned: day.earned + paid, runs: day.runs + (sum.earned > 0 ? 1 : 0) }
      let place = 0
      if (sum.earned > 0) {
        const key = boardKey(line.id, weekOf(now)), before = c.boards[key] ?? []
        const entered = enter(before, { id: me, name: run.name, earned: sum.earned, ms, at: now })
        c.boards[key] = entered.rows; place = entered.place
        if (place === 1 && before[0]?.id !== me) {
          // The new first place on the line this week: one line in the city's gist (an adult's name, or "a resident").
          gistService(ctx).add(db, { city: run.city, kind: 'other', text: `{0} made ${naira(sum.earned)} on the ${line.road} run`, people: [{ id: me, name: run.name }],
            publicAmount: true, refs: { key: `danfo:${run.id}` } })
        }
      }
      run.result = { earned: sum.earned, paid, fares: sum.fares, drops: sum.drops, timeBonus: sum.timeBonus, crewBonus: sum.crewBonus, penalties: sum.penalties,
        hardBrakes, crashes, passed: sum.passedBusy, ms, place, capped: paid < sum.earned }
      run.status = 'settled'; run.endedAt = now
      delete c.active[me]; unlist(c, run)
      return { ok: true, runId: run.id, paid }
    },

    /** The driver leaves the run (nothing is paid), or a crew member gets down. */
    abandon(db: Db, session: SessionRecord, body: Record<string, unknown>): { ok: true; run: DanfoRunView } | Refused {
      const c = danfoOf(ctx, db), run = id(body.runId) ? c.runs[body.runId] : undefined, now = ctx.now(), me = session.publicId
      if (!run) return no('unknown_run', 'That run has ended.')
      if (run.driver !== me) return leave(db, session, body)
      if (run.status === 'live') { run.status = 'closed'; run.reason = 'left'; run.endedAt = now; unlist(c, run) }
      if (c.active[me] === run.id) delete c.active[me]
      return { ok: true, run: view(db, run, me) }
    },

    run(db: Db, session: SessionRecord, runId: unknown): { ok: true; run: DanfoRunView } | Refused {
      const run = id(runId) ? peekDanfo(db)?.runs[runId] : undefined, me = session.publicId
      if (!run || (run.driver !== me && !run.crew.some((member) => member.id === me) && (run.status !== 'live' || run.city !== characterCity(session)))) return no('unknown_run', 'That run has ended.')
      return { ok: true, run: view(db, run, me) }
    },

    join(db: Db, session: SessionRecord, body: Record<string, unknown>): { ok: true; run: DanfoRunView } | Refused {
      const c = danfoOf(ctx, db), run = id(body.runId) ? c.runs[body.runId] : undefined, now = ctx.now(), me = session.publicId
      const role = body.role === 'conductor' ? 'conductor' : body.role === 'passenger' ? 'passenger' : null
      if (!role) return no('invalid_request', 'Ride as a passenger or as the conductor.')
      if (!run) return no('unknown_run', 'That bus has gone.')
      expire(c, run, now)
      if (run.status !== 'live') return no('run_over', 'That bus has gone.')
      if (run.driver === me) return no('own_run', 'You are the driver.')
      worker(session, run.city)
      if (ctx.checks?.blocked?.(me, run.driver)) return no('unknown_run', 'That bus has gone.')
      const already = run.crew.find((member) => member.id === me)
      if (already?.role === role) return { ok: true, run: view(db, run, me) }
      if (c.active[me] && c.runs[c.active[me]!]?.status === 'live') return no('run_live', 'You are driving your own run.')
      const elsewhere = c.riding[me] ? c.runs[c.riding[me]!] : undefined
      if (elsewhere && elsewhere.id !== run.id && elsewhere.status === 'live') return no('riding', 'You are riding in another bus. Get down first.')
      if (role === 'conductor' && run.crew.some((member) => member.role === 'conductor' && member.id !== me)) return no('conductor_taken', 'This bus already has a conductor.')
      if (!already && run.crew.length >= MAX_RIDERS + 1) return no('bus_full', 'This bus is full.')
      if (already) already.role = role
      else run.crew.push({ id: me, name: ctx.publicSession(session).name, role, at: now, paid: null })
      c.riding[me] = run.id
      return { ok: true, run: view(db, run, me) }
    },

    leave,

    /** The player conductor calls out: a line from the city's bank for the next stop. */
    shout(db: Db, session: SessionRecord, body: Record<string, unknown>): { ok: true; run: DanfoRunView } | Refused {
      const c = danfoOf(ctx, db), run = id(body.runId) ? c.runs[body.runId] : undefined, now = ctx.now(), me = session.publicId
      const member = run?.crew.find((item) => item.id === me)
      if (!run || member?.role !== 'conductor') return no('not_conductor', 'Only the conductor calls the stops.')
      const line = lineOf(run)
      if (run.status !== 'live' || !line) return no('run_over', 'This run is over.')
      if (now - (run.shouts.at(-1)?.at ?? 0) < SHOUT_EVERY_MS) return no('too_soon', 'Catch your breath first.')
      const stop = line.stops[Math.min(run.next, line.stops.length - 1)]?.name ?? '', end = line.stops.at(-1)?.name ?? ''
      const text = conductorLine(run.city, run.shouts.length % 3 === 2 ? 'approach' : 'call', stop, end, run.shouts.length)
      run.shouts = [...run.shouts, { at: now, line: text, by: member.name, id: me }].slice(-SHOUTS_KEPT)
      return { ok: true, run: view(db, run, me) }
    },

    /** Inside ctx.once: the conductor's share of a settled run. */
    collect(db: Db, session: SessionRecord, body: Record<string, unknown>): Small | Refused {
      const c = danfoOf(ctx, db), run = id(body.runId) ? c.runs[body.runId] : undefined, now = ctx.now(), me = session.publicId
      const member = run?.crew.find((item) => item.id === me)
      if (!run || member?.role !== 'conductor') return no('not_conductor', 'Only the conductor has a share.')
      if (run.status !== 'settled' || !run.result) return no('not_finished', 'The run is not over yet.')
      if (member.paid !== null) return { ok: true, runId: run.id, paid: member.paid }
      const life = worker(session, run.city)
      const day = today(c, me, now)
      const paid = pay(life, run.city, capForDay(conductorShare(run.result.fares), day.earned, 0), 'conductor')
      member.paid = paid
      c.days[me] = { day: day.day, earned: day.earned + paid, runs: day.runs }
      if (c.riding[me] === run.id) delete c.riding[me]
      return { ok: true, runId: run.id, paid }
    },

    board(db: Db, session: SessionRecord, routeId: unknown, now: number) {
      const line = routeById(routeId)
      if (!line) return no('unknown_route', 'There is no such line.')
      const week = weekOf(now), rows = peekDanfo(db)?.boards[boardKey(line.id, week)] ?? []
      return { ok: true as const, route: line.id, week, rows: rows.map((row) => ({ name: row.id === session.publicId ? row.name : shown(db, row.id, row.name), earned: row.earned, ms: row.ms, at: row.at })), you: placeOf(rows, session.publicId) }
    },
  }
}
export type DanfoService = ReturnType<typeof danfoService>
