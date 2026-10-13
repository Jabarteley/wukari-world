// OWNER: games (real-time) — the race's rules, stepped tick by tick: physics, checkpoints and laps, anti-shortcut, finish order, bots.
import test from 'node:test'
import assert from 'node:assert/strict'
import { makeRng } from '../game/util.ts'
import race, { COUNTDOWN_TICKS, drive, FLAG, INPUT, lapOf, newCar, PHASE, sectorOf, standings, trackOf } from './race.ts'
import type { RaceState } from './race.ts'
import { buildTrack, pointAt, project, ROAD_HALF, TRACK_IDS, WALL_HALF } from './race-track.ts'
import { ArenaInputError } from './rules.ts'
import { ARENA_GAMES, arenaGame } from './registry.ts'

const begin = (seats = 2, options: Record<string, number> = {}): RaceState => race.start(seats, makeRng('r'), { laps: 3, track: 0, ...options } as never)
const GO = INPUT.gas
function toRace(s: RaceState): RaceState { for (let i = 0; i < COUNTDOWN_TICKS; i++) race.step(s, s.cars.map(() => GO | INPUT.left), makeRng(1)); assert.equal(s.phase, PHASE.race); return s }
const tick = (s: RaceState, inputs: number[], n = 1): void => { for (let i = 0; i < n; i++) race.step(s, inputs, makeRng(1)) }

test('registry exposes race', () => {
  assert.equal(arenaGame('race'), race)
  assert.ok(Object.keys(ARENA_GAMES).includes('race'))
  assert.deepEqual(race.seats, { min: 2, max: 4 })
})

test('tracks are sane: long enough, wide apart, gentle bends, inside the world', () => {
  for (const id of TRACK_IDS) {
    const t = buildTrack(id)
    assert.ok(t.length > 4000 && t.length < 7000, id + ' length ' + t.length)
    assert.ok(t.minRadius > 170, id + ' tightest bend ' + t.minRadius)
    for (let i = 0; i < t.n; i++) {
      for (let j = i + 1; j < t.n; j++) {
        if (Math.min(j - i, t.n - (j - i)) * t.step < 700) continue
        assert.ok(Math.hypot((t.x[i] as number) - (t.x[j] as number), (t.y[i] as number) - (t.y[j] as number)) > 2 * WALL_HALF + 100, `${id}: parts of the road ${i} and ${j} are too close, so a car could cut across`)
      }
      assert.ok((t.x[i] as number) > WALL_HALF && (t.y[i] as number) > WALL_HALF)
    }
  }
})

test('input parsing is strict', () => {
  assert.equal(race.parseInput(5), 5)
  for (const bad of [-1, 16, 1.5, '3', null, undefined, {}, NaN]) assert.throws(() => race.parseInput(bad), ArenaInputError)
})

test('countdown locks the cars, then GO; the snapshot counts 3, 2, 1', () => {
  const s = begin()
  assert.equal(race.snapshot(s).c, 3)
  const x0 = s.cars[0]!.x
  tick(s, [GO, GO], 19)
  assert.equal(s.cars[0]!.x, x0, 'cars do not move in the countdown')
  assert.equal(race.snapshot(s).c, 3)
  tick(s, [GO, GO])
  assert.equal(race.snapshot(s).c, 2)
  tick(s, [GO, GO], 20)
  assert.equal(race.snapshot(s).c, 1)
  tick(s, [GO, GO], 20)
  assert.equal(s.phase, PHASE.race)
  assert.equal(race.snapshot(s).c, 0)
  tick(s, [GO, GO], 10)
  assert.ok(Math.hypot(s.cars[0]!.vx, s.cars[0]!.vy) > 1, 'moving after GO')
  assert.ok(s.cars[0]!.best > -100, 'moved up the grid')
})

test('physics is deterministic: the same inputs give the same race, tick for tick', () => {
  const script = (n: number, seat: number): number => (n % 40 < 25 ? GO : 0) | (n % 70 < 20 ? INPUT.right : n % 90 < 30 ? INPUT.left : 0) | (seat && n % 55 < 5 ? INPUT.brake : 0)
  const run = (): string[] => { const s = begin(3); const out: string[] = []; for (let n = 0; n < 500; n++) { race.step(s, [0, 1, 2].map((i) => script(n, i)), makeRng(9)); out.push(JSON.stringify(race.snapshot(s))) } return out }
  assert.deepEqual(run(), run())
})

test('a car accelerates to a top speed, brakes, reverses, slows on the grass', () => {
  const t = buildTrack('mainland')
  const c = newCar(t, 0)
  let speed = 0
  for (let i = 0; i < 70; i++) { drive(c, GO, t); speed = Math.max(speed, Math.hypot(c.vx, c.vy)) }
  assert.ok(speed > 6 && speed < 11, 'top speed ' + speed)
  const before = speed
  for (let i = 0; i < 6; i++) drive(c, INPUT.brake, t)
  assert.ok(Math.hypot(c.vx, c.vy) < before * 0.6, 'brakes bite')
  // On the grass the same engine gives much less.
  const road = newCar(t, 0), grass = newCar(t, 0)
  const p = pointAt(t, 600, 130); Object.assign(grass, { x: p.x, y: p.y, h: p.a, cur: 600, best: 600, i: Math.floor(600 / t.step) })
  const q = pointAt(t, 600, 0); Object.assign(road, { x: q.x, y: q.y, h: q.a, cur: 600, best: 600, i: Math.floor(600 / t.step) })
  for (let i = 0; i < 60; i++) { drive(grass, GO, t); drive(road, GO, t) }
  assert.ok(grass.off, 'off the road')
  assert.ok(Math.hypot(grass.vx, grass.vy) < Math.hypot(road.vx, road.vy) * 0.7, 'grass slows the car')
  // Reverse once stopped.
  const r = newCar(t, 1)
  for (let i = 0; i < 20; i++) drive(r, INPUT.brake, t)
  assert.ok(r.vx * Math.cos(r.h) + r.vy * Math.sin(r.h) < -1, 'reversing')
})

test('steering turns the car, and braking while steering hard slides it (drift)', () => {
  const t = buildTrack('mainland')
  const a = newCar(t, 0), b = newCar(t, 0)
  for (let i = 0; i < 50; i++) { drive(a, GO, t); drive(b, GO, t) }
  const h0 = a.h
  for (let i = 0; i < 6; i++) { drive(a, GO | INPUT.right, t); drive(b, INPUT.brake | INPUT.right, t) }
  assert.ok(a.h !== h0)
  const side = (c: typeof a): number => Math.abs(-c.vx * Math.sin(c.h) + c.vy * Math.cos(c.h))
  assert.ok(side(b) >= side(a) * 0.9, 'the braking car carries sideways speed')
})

test('the wall keeps cars on the road band: you cannot leave it or cut across', () => {
  const t = buildTrack('lekki')
  const c = newCar(t, 0)
  for (let i = 0; i < 400; i++) { drive(c, GO | INPUT.right, t); assert.ok(c.dist <= WALL_HALF + 1, 'dist ' + c.dist) }
  assert.ok(c.hit > 0 || c.dist > ROAD_HALF, 'it scraped')
})

test('cars bump: they do not overlap and both feel it', () => {
  const s = toRace(begin(2))
  const [a, b] = s.cars as [typeof s.cars[0], typeof s.cars[0]]
  Object.assign(b, { x: a.x + 12, y: a.y })
  a.vx = 5; a.vy = 0
  tick(s, [0, 0])
  assert.ok(Math.hypot(a.x - b.x, a.y - b.y) >= 24.5)
  assert.ok(race.snapshot(s).r.every((c) => c[6] & FLAG.hit))
})

test('checkpoints and laps: progress is continuous along the road, laps come from distance', () => {
  const t = buildTrack('lekki')
  assert.equal(lapOf(-100, t.length), 0)
  assert.equal(lapOf(t.length, t.length), 1)
  assert.equal(sectorOf(t.length / 8, t.length), 1)
  assert.equal(sectorOf(t.length * 2.99, t.length), 23)
  const s = toRace(begin(2, { laps: 1 }))
  const c = s.cars[0]!
  let last = c.best
  for (let i = 0; i < 80; i++) { tick(s, [GO | INPUT.right, 0]); assert.ok(c.best >= last); last = c.best }
  // Place it on the centre line every tick (teleporting in small steps = driving): progress follows.
  for (let arc = 100; arc < t.length * 0.96; arc += 30) {
    const p = pointAt(t, arc)
    Object.assign(c, { x: p.x, y: p.y, vx: 0, vy: 0, h: p.a }); drive(c, 0, t)
  }
  assert.ok(c.best > t.length * 0.9, 'followed the road')
  assert.equal(c.fin, 0)
})

test('anti-shortcut: jumping across the infield or driving backwards earns nothing', () => {
  const t = buildTrack('lekki')
  const s = toRace(begin(2, { laps: 1 }))
  const c = s.cars[0]!
  const before = c.best
  // Teleport to the far side of the loop (a shortcut): the search window stays where the car was.
  const far = pointAt(t, t.length * 0.5)
  Object.assign(c, { x: far.x, y: far.y, vx: 0, vy: 0 })
  tick(s, [0, 0], 3)
  assert.ok(c.best < before + 400, 'no jump in progress: ' + (c.best - before))
  assert.equal(c.fin, 0)
  // Straight across: from just before the line to just past it while the lap is 90% undone never finishes.
  const s2 = toRace(begin(2, { laps: 1 }))
  const d = s2.cars[0]!
  const nearEnd = pointAt(t, t.length - 60)
  Object.assign(d, { x: nearEnd.x, y: nearEnd.y, vx: 0, vy: 0, h: nearEnd.a })
  tick(s2, [GO, 0], 40)
  assert.equal(d.fin, 0, 'the line is not crossed unless the lap was driven')
  // Reverse over the line: the car "is" behind but its best does not drop.
  const s3 = toRace(begin(2))
  const e = s3.cars[0]!
  tick(s3, [GO, 0], 40)
  const best = e.best
  tick(s3, [INPUT.brake, 0], 90)
  assert.ok(e.best >= best)
})

test('driving a whole lap by the book finishes the race, in order, with a result', () => {
  const s = toRace(begin(2, { laps: 1 }))
  const t = trackOf(s.options)
  // Seat 0 is driven by the bot; seat 1 stands still: the race ends 15 s after seat 0 finishes.
  const rng = makeRng('b')
  let n = 0
  while (!race.outcome(s) && n < 4000) { race.step(s, [race.bot(s, 0, rng), 0], rng); n++ }
  assert.equal(s.phase, PHASE.over)
  assert.ok(s.cars[0]!.fin > 0 && s.cars[1]!.fin === 0)
  assert.ok(s.cars[0]!.best >= t.length)
  const out = race.outcome(s)!
  assert.deepEqual(out.winners, [0, 1])
  assert.deepEqual(out.scores, [1, 2])
  assert.match(out.text, /^\{0\} wins the race! Then \{1\}\.$/)
  assert.equal(out.draw, false)
})

test('standings: finished by tick, then distance; ties by seat; leavers last', () => {
  assert.deepEqual(standings([100, 300, 200], [0, 0, 0], [false, false, false]), [1, 2, 0])
  assert.deepEqual(standings([5000, 4000, 4500], [900, 800, 0], [false, false, false]), [1, 0, 2])
  assert.deepEqual(standings([5000, 5000], [900, 900], [false, false]), [0, 1])
  assert.deepEqual(standings([9000, 100, 300], [0, 0, 0], [true, false, false]), [2, 1, 0])
  // A photo finish on the same tick goes to whoever got further.
  assert.deepEqual(standings([5101, 5120], [900, 900], [false, false]), [1, 0])
})

test('bots can finish a full 3-lap race on both tracks, with 2 and 4 cars', () => {
  for (const track of [0, 1]) for (const seats of [2, 4]) {
    const rng = makeRng('bots' + track + seats)
    const s = begin(seats, { track })
    let n = 0
    while (!race.outcome(s) && n < 6000) { race.step(s, s.cars.map((_, i) => race.bot(s, i, rng)), rng); n++ }
    const out = race.outcome(s)!
    assert.ok(out, 'a result')
    assert.equal(out.reason, 'finish')
    assert.ok(s.cars.filter((c) => c.fin).length >= 2, `track ${track} seats ${seats}: the leaders finished`)
    assert.equal(out.winners.length, seats)
    assert.ok(n < MAX_TICKS, 'inside the time cap: ' + n)
  }
})
const MAX_TICKS = 4800 + 60

test('forfeit: the leaver is ranked last and the race goes on; everyone gone ends it', () => {
  const s = toRace(begin(3))
  race.forfeit(s, 0)
  assert.equal(race.outcome(s), null)
  tick(s, [GO, GO, 0], 5)
  assert.equal(s.cars[0]!.out, true)
  assert.ok(race.snapshot(s).r[0]![6] & FLAG.out)
  s.cars[1]!.best = 100; s.cars[2]!.best = 200
  const order = standings(s.cars.map((c) => c.best), s.cars.map((c) => c.fin), s.cars.map((c) => c.out))
  assert.equal(order[2], 0)
  race.forfeit(s, 1); race.forfeit(s, 2)
  assert.ok(race.outcome(s))
})

test('snapshot is compact and the wire is whole numbers', () => {
  const s = toRace(begin(4))
  tick(s, [GO, GO, GO, GO], 30)
  const text = JSON.stringify(race.snapshot(s))
  assert.ok(text.length < 220, 'snapshot ' + text.length + ' bytes')
  for (const c of race.snapshot(s).r) for (const v of c) assert.ok(Number.isInteger(v))
})

test('road projection: signed offset and window', () => {
  const t = buildTrack('mainland')
  const p = pointAt(t, 1000, 40)
  const pr = project(t, p.x, p.y, Math.floor(1000 / t.step))
  assert.ok(Math.abs(pr.dist - 40) < 2 && pr.off > 0, 'right of the line is positive')
  assert.ok(Math.abs(pr.arc - 1000) < 2)
})
