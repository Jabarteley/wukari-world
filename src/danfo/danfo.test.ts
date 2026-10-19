// OWNER: danfo — the pure parts of Drive a danfo (docs/DANFO.md): the lines, the people at the stops, what a run earns, the road, the
// conductor's lines and the weekly board.
import test from 'node:test'
import assert from 'node:assert/strict'
import { DANFO_CITIES, DANFO_ROUTES, DWELL_MS, MAX_SPEED, legMetres, minRunMs, routeById, routeMetres, routesFor, stopMetres, targetMs, fareFor, FARE } from './routes.ts'
import { DAY_CAP, PENALTY, RUN_CAP, RUNS_PER_DAY, bestCase, capForDay, conductorShare, manifest, seeded, tally, trafficFrom } from './run.ts'
import type { StopCall } from './run.ts'
import { STEP_MS, startDrive, stepDrive } from './drive.ts'
import type { DriveInput, DriveState } from './drive.ts'
import { bankFor, conductorLine, glossFor, seededLine } from './conductor.ts'
import { BOARD_MAX, boardKey, enter, placeOf, weekOf } from './board.ts'
import type { BoardRow } from './board.ts'
import { registeredCityIds } from '../game/cities/registry.ts'
import { DANFO_DAY_CAP } from '../game/systems/living-world.ts'

const lagos = routeById('lagos-ikorodu-road')!
const served = (n: number): StopCall[] => Array.from({ length: n }, () => 'served' as const)

test('every line is a real city, ids are unique, stops run forward and the game road fits a short run', () => {
  const ids = new Set<string>(), cities = new Set(registeredCityIds())
  for (const line of DANFO_ROUTES) {
    assert.ok(!ids.has(line.id), line.id); ids.add(line.id)
    assert.ok(cities.has(line.city as never), `${line.id}: ${line.city} is a city`)
    assert.ok(line.stops.length >= 5 && line.stops.length <= 9, `${line.id}: 5 to 9 stops`)
    assert.equal(line.stops[0]!.km, 0)
    for (let i = 1; i < line.stops.length; i++) assert.ok(line.stops[i]!.km > line.stops[i - 1]!.km, `${line.id}: ${line.stops[i]!.name} is further on`)
    assert.equal(new Set(line.stops.map((stop) => stop.name)).size, line.stops.length, `${line.id}: stop names are distinct`)
    // Between about three quarters of a minute and four minutes of driving at the top speed.
    const seconds = routeMetres(line) / MAX_SPEED
    assert.ok(seconds > 45 && seconds < 260, `${line.id}: ${seconds}s at top speed`)
    assert.ok(targetMs(line) > minRunMs(line, line.stops.length - 1, line.stops.length - 1), `${line.id}: the target can be beaten honestly`)
  }
  assert.deepEqual(routesFor('lagos').map((line) => line.id), ['lagos-ikorodu-road', 'lagos-oshodi-mile2', 'lagos-cms-ajah'])
  assert.ok(DANFO_CITIES.includes('accra') && DANFO_CITIES.includes('nairobi'))
  assert.equal(routeById('nowhere'), undefined)
  assert.equal(routeById(42), undefined)
})

test('the game road: legs, stop positions and the least time to reach a stop', () => {
  const at = stopMetres(lagos)
  assert.equal(at.length, lagos.stops.length)
  assert.equal(at[1], legMetres(lagos, 1))
  assert.equal(legMetres(lagos, 1), Math.round(180 + 2.5 * 60))
  assert.equal(routeMetres(lagos), at.at(-1))
  // Later stops need more time; every stop served before adds its dwell.
  assert.ok(minRunMs(lagos, 3, 0) > minRunMs(lagos, 2, 0))
  assert.equal(minRunMs(lagos, 3, 2) - minRunMs(lagos, 3, 0), 2 * DWELL_MS)
  assert.equal(fareFor(0, 1), FARE.base + FARE.perStop)
  assert.equal(fareFor(0, 50), FARE.max)
})

test('people at the stops come from the seed: the same seed, the same people', () => {
  const a = manifest('seed-1', lagos, 0.5), b = manifest('seed-1', lagos, 0.5), c = manifest('seed-2', lagos, 0.5)
  assert.deepEqual(a, b)
  assert.notDeepEqual(a, c)
  assert.equal(a.waiting.length, lagos.stops.length)
  assert.equal(a.waiting.at(-1)!.length, 0, 'nobody waits at the end of the line')
  for (const [i, people] of a.waiting.entries()) for (const person of people) assert.ok(person.to > i && person.to < lagos.stops.length)
  assert.ok(a.waiting[0]!.length >= 8, 'the park fills the bus')
  assert.equal(seeded('x')(), seeded('x')())
})

test('traffic comes from people out in the city and the hour', () => {
  assert.ok(trafficFrom(0, 3) < trafficFrom(0, 12))
  assert.ok(trafficFrom(0, 12) < trafficFrom(0, 8), 'rush hour is heavier')
  assert.ok(trafficFrom(40, 12) > trafficFrom(0, 12), 'a busy city is a busy road')
  for (const people of [-5, 0, 10, 1000]) for (const hour of [0, 8, 13, 18, 23]) { const t = trafficFrom(people, hour); assert.ok(t >= 0.1 && t <= 1) }
})

test('a run earns its fares: serving every stop beats passing them, and penalties take money away', () => {
  const people = manifest('fare-seed', lagos, 0.6), last = lagos.stops.length - 1
  const all = tally(lagos, people, { calls: served(last), hardBrakes: 0, crashes: 0, ms: targetMs(lagos) + 1, riders: 0, conductor: false })
  assert.ok(all.fares > 0 && all.drops > 0)
  assert.equal(all.earned, all.fares, 'no bonus over the target time')
  const passing: StopCall[] = [...served(last - 1).map((_, i) => (i % 2 ? 'served' : 'passed') as StopCall), 'served']
  const lazy = tally(lagos, people, { calls: passing, hardBrakes: 0, crashes: 0, ms: targetMs(lagos) + 1, riders: 0, conductor: false })
  assert.ok(lazy.fares < all.fares, 'people left on the roadside pay nothing')
  assert.ok(lazy.passedBusy > 0)
  assert.equal(lazy.earned, Math.max(0, lazy.fares - lazy.passedBusy * PENALTY.passed))
  const rough = tally(lagos, people, { calls: served(last), hardBrakes: 3, crashes: 1, ms: targetMs(lagos) + 1, riders: 0, conductor: false })
  assert.equal(rough.earned, all.fares - 3 * PENALTY.hardBrake - PENALTY.crash)
  const quick = tally(lagos, people, { calls: served(last), hardBrakes: 0, crashes: 0, ms: targetMs(lagos), riders: 2, conductor: true })
  assert.equal(quick.timeBonus, Math.round(all.fares * 0.1))
  assert.equal(quick.crewBonus, 2 * 150 + Math.round(all.fares * 0.1))
  // Lies about faults only ever lower the pay; absurd counts are cut.
  const silly = tally(lagos, people, { calls: served(last), hardBrakes: -10, crashes: Number.NaN, ms: targetMs(lagos) + 1, riders: 99, conductor: false })
  assert.ok(silly.earned <= all.fares + 4 * 150)
  // An unfinished run (the last stop not served) earns nothing.
  assert.equal(tally(lagos, people, { calls: served(last - 1), hardBrakes: 0, crashes: 0, ms: 1, riders: 0, conductor: false }).earned, 0)
})

test('no line can pay more than the run cap, and the caps fit the wallet action', () => {
  for (const line of DANFO_ROUTES) for (let n = 0; n < 40; n++) {
    const most = bestCase(line, manifest(`cap-${n}`, line, 1))
    assert.ok(most <= RUN_CAP, `${line.id}: best case ${most} within ${RUN_CAP}`)
  }
  assert.equal(DANFO_DAY_CAP, DAY_CAP, 'the wallet action allows exactly the day cap')
  assert.equal(capForDay(5000, 0, 0), 5000)
  assert.equal(capForDay(5000, DAY_CAP - 1200, 3), 1200)
  assert.equal(capForDay(5000, DAY_CAP, 3), 0)
  assert.equal(capForDay(5000, 0, RUNS_PER_DAY), 0)
  assert.equal(conductorShare(10000), 1500)
  assert.equal(conductorShare(-5), 0)
})

/** A careful driver: keeps to the kerb lane, slows for traffic, stops at every stop. */
function careful(state: DriveState): DriveInput {
  const stopAt = state.stops[state.next] ?? state.end
  const toStop = stopAt - state.d
  let want = toStop < 4 ? 0 : Math.min(18, Math.sqrt(2 * 3 * Math.max(0, toStop - 4)))
  for (const car of state.cars) if (car.d > state.d && car.d - state.d < 30 && Math.abs(car.lane - state.lane) < 0.8) want = Math.min(want, Math.max(0, car.speed - 1))
  return { throttle: state.speed < want ? 1 : 0, brake: state.speed > want + 0.5 ? 0.7 : 0, steer: state.lane > 0.05 ? -1 : 0 }
}

test('the road can be driven: a careful driver serves every stop, no faster than the server allows', () => {
  for (const line of DANFO_ROUTES) {
    const state = startDrive(line, `drive-${line.id}`, 0.6)
    const served: number[] = []
    for (let step = 0; step < 20 * 60 * 20 && !state.done; step++) {
      for (const event of stepDrive(state, careful(state))) {
        if (event.kind === 'served') {
          served.push(event.stop)
          assert.ok(state.t >= minRunMs(line, event.stop, served.length - 1), `${line.id}: stop ${event.stop} at ${state.t}ms is possible`)
        }
      }
    }
    assert.ok(state.done, `${line.id}: reached the end`)
    assert.deepEqual(state.calls, served.map(() => 'served'), `${line.id}: every stop served`)
    assert.equal(served.length, line.stops.length - 1)
    assert.equal(state.hardBrakes, 0, `${line.id}: a careful driver never brakes hard`)
  }
})

test('the road: flooring it past a stop passes it, slamming the brake at speed is a hard brake, the road ends at the last stop', () => {
  const state = startDrive(lagos, 'reckless', 0)
  state.cars = []
  const floor: DriveInput = { throttle: 1, brake: 0, steer: 1 }
  const events: string[] = []
  while (state.next === 1) for (const event of stepDrive(state, floor)) events.push(event.kind)
  assert.deepEqual(state.calls, ['passed'])
  assert.ok(events.includes('approach'))
  assert.ok(state.speed > 10)
  const kinds = stepDrive(state, { throttle: 0, brake: 1, steer: 0 }).map((event) => event.kind)
  assert.deepEqual(kinds, ['hard-brake'])
  assert.equal(state.hardBrakes, 1)
  stepDrive(state, { throttle: 0, brake: 1, steer: 0 })
  assert.equal(state.hardBrakes, 1, 'one hard brake per press')
  // Run to the end in the fast lane: every stop is passed except the last, where the road ends.
  for (let step = 0; step < 20000 && state.d < state.end; step++) stepDrive(state, floor)
  assert.equal(state.d, state.end)
  assert.equal(state.speed, 0)
  assert.equal(state.next, lagos.stops.length - 1, 'the last stop cannot be passed')
  assert.ok(state.crashes >= 1, 'hitting the barrier at speed is a crash')
  // Pull over to the kerb and stand: the run is done.
  for (let step = 0; step < 400 && !state.done; step++) stepDrive(state, { throttle: 0, brake: 0, steer: -1 })
  assert.ok(state.done)
  assert.equal(state.calls.at(-1), 'served')
  assert.equal(STEP_MS, 50)
})

test('the road: running into the back of a car is a crash; traffic behind the bus waits for it', () => {
  const state = startDrive(lagos, 'crash', 0)
  state.cars = [{ id: 1, kind: 'saloon', d: 60, lane: 0, base: 0, speed: 0, laneTo: 0, cutAt: -1 }, { id: 2, kind: 'danfo', d: -20, lane: 0, base: 10, speed: 10, laneTo: 0, cutAt: -1 }]
  let crashed = false
  for (let step = 0; step < 400 && !crashed; step++) crashed = stepDrive(state, { throttle: 1, brake: 0, steer: 0 }).some((event) => event.kind === 'crash')
  assert.ok(crashed)
  assert.equal(state.crashes, 1)
  assert.ok(state.d <= 60, 'the bus stops behind the car')
  const behind = state.cars.find((car) => car.id === 2)!
  assert.ok(behind.d + 6 <= state.d - 6 + 0.5, 'the danfo behind never drives into the bus')
})

test('the conductor: a bank per city, stop names filled in, the same line on every device of a crew', () => {
  assert.equal(conductorLine('lagos', 'call', 'Oshodi', 'Obalende', 0), 'Oshodi! Oshodi! Enter with your change!')
  assert.match(conductorLine('accra', 'done', 'x', 'Madina', 0), /Madina/)
  assert.equal(bankFor('tokyo').voice, 'plain', 'a city with no bank of its own gets plain words')
  assert.equal(seededLine('nairobi', 'approach', 'KNH', 'Karen', 'run', 2), seededLine('nairobi', 'approach', 'KNH', 'Karen', 'run', 2))
  assert.ok(glossFor('lagos', 'Wole! Wole! Enter quick quick!').some((line) => line.startsWith('wole')))
  for (const city of DANFO_CITIES) for (const lines of Object.values(bankFor(city).lines)) {
    assert.ok(lines.length > 0)
    for (const line of lines) assert.ok(line.length <= 80, line)
  }
})

test('the weekly board: one best row per driver, the most earned first, then the faster', () => {
  const row = (id: string, earned: number, ms: number, at = 1): BoardRow => ({ id, name: id, earned, ms, at })
  let rows: BoardRow[] = []
  ;({ rows } = enter(rows, row('ada', 5000, 200000)))
  const tunde = enter(rows, row('tunde', 6000, 210000))
  assert.equal(tunde.place, 1); rows = tunde.rows
  assert.equal(enter(rows, row('ada', 4000, 100000)).place, 0, 'a worse run does not replace a best')
  const faster = enter(rows, row('ada', 6000, 150000))
  assert.equal(faster.place, 1, 'the same money in less time ranks higher'); rows = faster.rows
  assert.deepEqual(rows.map((item) => item.id), ['ada', 'tunde'])
  assert.equal(placeOf(rows, 'tunde'), 2)
  assert.equal(placeOf(rows, 'nobody'), 0)
  for (let n = 0; n < BOARD_MAX + 5; n++) rows = enter(rows, row(`p${n}`, 100 + n, 1000)).rows
  assert.equal(rows.length, BOARD_MAX)
  assert.equal(boardKey('lagos-ikorodu-road', 12), 'lagos-ikorodu-road@12')
  assert.equal(weekOf(Date.UTC(2026, 9, 19, 12)), weekOf(Date.UTC(2026, 9, 25, 12)), 'Monday to Sunday is one week')
  assert.notEqual(weekOf(Date.UTC(2026, 9, 19, 12)), weekOf(Date.UTC(2026, 9, 26, 12)))
})
