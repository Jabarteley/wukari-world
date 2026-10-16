// OWNER: games (real-time) — replay logs: the recorder, the runner, and exact reproduction of a recorded fight.
import test from 'node:test'
import assert from 'node:assert/strict'
import { makeRng } from '../game/util.ts'
import { ARENA_GAMES } from './registry.ts'
import fight, { BTN } from './fight.ts'
import { ReplayRecorder, parseReplay, replayMatch } from './replay.ts'
import type { ReplayLog } from './replay.ts'
import { CLIP_SECONDS, FPS, aspectSize, clipWindow, frameCount, pickAt } from './replay-frames.ts'

/** Play a match the way the room host does, recording as it goes; `steer` makes seat 1 bot-steered between two ticks. */
function record(game: string, seed: string, humans: number, script: (tick: number, seat: number) => unknown, steer?: [number, number], extra: Record<string, number> = {}) {
  const rules = ARENA_GAMES[game]!
  const seats = Array.from({ length: Math.max(rules.seats.min, humans) }, (_, i) => ({ name: i < humans ? `P${i}` : `Bot ${i}`, bot: i >= humans }))
  const rng = makeRng(seed), options: Record<string, number> = { ...(game === 'football' ? { seconds: 60, ending: 2 } : game === 'race' ? { laps: 1 } : { rounds: 1, seconds: 30 }), ...extra }
  const state = rules.start(seats.length, rng, options)
  const rec = new ReplayRecorder({ game, rev: 1, hz: rules.hz, seed, options, seats }, JSON.stringify(rules.idle()))
  const snaps: unknown[] = [rules.snapshot(state)]
  let held = seats.map(() => rules.idle() as unknown), tick = 0
  while (!rules.outcome(state) && tick < 6000) {
    const steered = seats.map((s, i) => !s.bot && !!steer && i === 1 && tick >= steer[0] && tick < steer[1])
    const inputs = seats.map((s, i) => {
      if (s.bot || steered[i]) return rules.bot(state, i, rng)
      const wanted = script(tick, i)
      if (wanted !== undefined) held[i] = rules.reduce ? rules.reduce(held[i], wanted) : wanted
      const given = held[i]
      if (rules.settle) held[i] = rules.settle(given)
      return given
    })
    rec.tick(inputs, steered)
    rules.step(state, inputs, rng)
    snaps.push(rules.snapshot(state)); tick += 1
  }
  const log = rec.finish({ ...rules.outcome(state)!, text: '{0} wins' }, rules.snapshot(state), seats.map((s) => s.name))
  return { log, snaps }
}

test('a recorded fight replays to exactly the same snapshots', () => {
  // Two people: one walks and punches, the other blocks now and then.
  const script = (t: number, seat: number): unknown => (seat === 0
    ? { h: t % 40 < 30 ? BTN.right : 0, e: t % 7 === 0 ? BTN.punch : 0 }
    : { h: t % 30 < 10 ? BTN.block : BTN.left, e: t % 13 === 0 ? BTN.kick : 0 })
  const { log, snaps } = record('fight', 'seed-one', 2, script)
  assert.ok(log.ticks > 100)
  const out = replayMatch(fight, log)
  assert.equal(out.verified, true, out.problem)
  assert.equal(out.snaps.length, log.ticks)
  assert.deepEqual([out.start, ...out.snaps], snaps, 'every snapshot, tick for tick')
  assert.ok(JSON.stringify(log).length < 24000, 'a few KB: ' + JSON.stringify(log).length)
  assert.deepEqual(parseReplay(JSON.parse(JSON.stringify(log))), log)
})

test('a person against the computer, and a stretch steered by the bot, replay exactly', () => {
  const script = (t: number): unknown => ({ h: t % 50 < 25 ? BTN.right : BTN.left, e: t % 9 === 0 ? BTN.punch : 0 })
  const solo = record('fight', 'solo', 1, script)
  assert.equal(solo.log.i.every(([, seat]) => seat === 0), true, 'the computer seat is not recorded')
  assert.deepEqual([replayMatch(fight, solo.log).start, ...replayMatch(fight, solo.log).snaps], solo.snaps)
  const steered = record('fight', 'steer', 2, script, [40, 140])
  assert.deepEqual(steered.log.s, [[1, 40, 140]])
  assert.equal(steered.log.i.some(([tick, seat]) => seat === 1 && tick >= 40 && tick < 140), false, 'nothing of the steered seat is recorded while the bot steers')
  const out = replayMatch(fight, steered.log)
  assert.equal(out.verified, true, out.problem)
  assert.deepEqual([out.start, ...out.snaps], steered.snaps)
})

test('race and football (which draw random numbers inside step) replay exactly too', () => {
  for (const game of ['race', 'football']) {
    const rules = ARENA_GAMES[game]!
    const { log, snaps } = record(game, 'g-' + game, 1, (t) => (game === 'race' ? 1 | (t % 30 < 5 ? 4 : 0) : { h: t % 60 < 30 ? 3 : 9, e: t % 25 === 0 ? 16 : 0 }))
    const out = replayMatch(rules, log)
    assert.equal(out.verified, true, `${game}: ${out.problem}`)
    assert.deepEqual([out.start, ...out.snaps], snaps, game)
  }
})

test('a football match that goes to a penalty shoot-out replays exactly too', () => {
  // Two computer-played sides, until one of the seeds ends level and goes to penalties.
  let found = 0
  for (const seed of ['p1', 'p2', 'p3', 'p4', 'p5', 'p6', 'p7', 'p8', 'p9', 'p10', 'p11', 'p12']) {
    const { log, snaps } = record('football', seed, 0, () => undefined, undefined, { ending: 3 })
    if (!snaps.some((s) => (s as { p: number }).p === 4)) continue
    found += 1
    const out = replayMatch(ARENA_GAMES.football!, log)
    assert.equal(out.verified, true, `${seed}: ${out.problem}`)
    assert.deepEqual([out.start, ...out.snaps], snaps, seed)
    assert.ok((snaps[snaps.length - 1] as { o?: { w: number } }).o!.w >= 0, 'the shoot-out was played to its end')
    if (found === 2) break
  }
  assert.ok(found >= 1, 'a seed that goes to penalties')
})

test('a changed rules revision or a tampered log is not verified; garbage is not a log', () => {
  const { log } = record('fight', 'tamper', 1, () => ({ h: BTN.right, e: 0 }))
  assert.equal(replayMatch(fight, log, 2).verified, false)
  assert.match(replayMatch(fight, log, 2).problem, /older rules/)
  const forged: ReplayLog = { ...log, end: { nope: 1 } }
  assert.match(replayMatch(fight, forged).problem, /no longer matches/)
  for (const bad of [null, 5, {}, { ...log, v: 2 }, { ...log, seats: [] }, { ...log, ticks: -1 }, { ...log, i: [[0, 9, 0]] }, { ...log, hz: 99 }]) assert.equal(parseReplay(bad), null)
})

test('a forfeit is part of the log', () => {
  const rules = fight, rng = makeRng('ff'), options = { rounds: 1, seconds: 30 }
  const state = rules.start(2, rng, options)
  const seats = [{ name: 'A', bot: false }, { name: 'B', bot: false }]
  const rec = new ReplayRecorder({ game: 'fight', rev: 1, hz: 20, seed: 'ff', options, seats }, JSON.stringify(rules.idle()))
  for (let t = 0; t < 30; t++) { const inputs = [rules.idle(), rules.idle()]; rec.tick(inputs, [false, false]); rules.step(state, inputs, rng) }
  rules.forfeit(state, 1); rec.forfeit(1)
  const log = rec.finish({ ...rules.outcome(state)!, text: '{0} wins' }, rules.snapshot(state), ['A', 'B'])
  assert.deepEqual(log.f, [[30, 1]])
  const out = replayMatch(rules, log)
  assert.equal(out.verified, true, out.problem)
})

test('frame arithmetic: 60 frames a second of virtual time, the last ten seconds, the right pair of snapshots', () => {
  assert.equal(frameCount(200, 20), 10 * FPS + 90)
  assert.deepEqual(clipWindow(frameCount(1800, 20)), { start: 1800 / 20 * 60 + 90 - 600, count: 600 })
  assert.deepEqual(clipWindow(100), { start: 0, count: 100 })
  const snaps = ['s0', 's1', 's2', 's3']
  assert.deepEqual(pickAt(snaps, 0, 20), { a: 's0', b: 's1', t: 0, tick: 0 })
  const mid = pickAt(snaps, 4.5, 20)
  assert.equal(mid.a, 's1'); assert.equal(mid.b, 's2'); assert.ok(Math.abs(mid.t - 0.5) < 1e-9 && Math.abs(mid.tick - 1.5) < 1e-9)
  assert.deepEqual(pickAt(snaps, 9999, 20), { a: 's3', b: 's3', t: 0, tick: 3333 })
  assert.deepEqual(aspectSize('9x16'), { w: 1080, h: 1920 })
  assert.deepEqual(aspectSize('9x16', 720), { w: 720, h: 1280 })
  assert.equal(aspectSize('nonsense'), null); assert.equal(aspectSize(null), null); assert.equal(CLIP_SECONDS, 10)
})
