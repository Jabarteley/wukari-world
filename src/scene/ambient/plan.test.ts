import test from 'node:test'
import assert from 'node:assert/strict'
import { createWalkGrid } from '../walk-grid.ts'
import type { WalkShape } from '../walk-grid.ts'
import { densityFor, levelAt, PROFILES, TIER_CAPS } from './density.ts'
import type { Tier } from './density.ts'
import { KEEP_APART, QUARTER_MS, WAVE_MS, createPlanner, gates, mixAt, planFar, planStays, planWave, sampleTrack } from './plan.ts'
import type { Ident, Stage } from './plan.ts'

// A market-sized floor with a few stalls and a row of benches in the way.
const BLOCK: WalkShape[] = [[-6, -4, -3, -2], [3, -4, 6, -2], [-2, 0, 2, 1.5], [7, 2, 9, 3]]
const grid = createWalkGrid({ bounds: [-10, -8, 10, 8], block: BLOCK })
const points: [number, number][] = []
for (let x = -9; x <= 9; x += 1.5) for (let z = -7; z <= 7; z += 1.5) if (grid.free(x, z)) points.push([x, z])
const seats = [-8, -6, -4, 4, 6, 8].map((x) => ({ x, z: -6.5, ry: 0, seat: 0.6 }))
const stage = (more: Partial<Stage> = {}): Stage => ({ bounds: [-10, -8, 10, 8], entrance: [0, 7.4], open: true, free: (x, z) => grid.free(x, z), path: (ax, az, bx, bz) => grid.path(ax, az, bx, bz), seats, points, fixed: [{ x: 0, z: 3 }], ...more })

const MORNING = Date.UTC(2026, 9, 12, 9, 0) // 10:00 in Lagos (UTC+1)
const ident = (kind: string, more: Partial<Ident> = {}): Ident => ({ cityId: 'lagos', venueId: 'market-1', kind, tier: 'full', rainingAt: () => false, hourAt: (at) => ((at / 3_600_000 + 1) % 24), ...more })

test('density: a market is busy at ten and quiet at ten at night; a bar is the reverse', () => {
  const m10 = densityFor('market', 10, false), m22 = densityFor('market', 22, false)
  assert.ok(m10.walkers + m10.sitters + m10.standers > 3 * (m22.walkers + m22.sitters + m22.standers), JSON.stringify([m10, m22]))
  const b10 = densityFor('club', 10, false), b22 = densityFor('club', 22, false)
  assert.ok(b22.far > b10.far && b22.walkers + b22.sitters + b22.standers > 2 * (b10.walkers + b10.sitters + b10.standers), JSON.stringify([b10, b22]))
  // football draws a crowd to a viewing centre at the end of the afternoon, and the park fills at the cool ends of the day
  assert.ok(densityFor('viewing', 18.5, false).sitters > densityFor('viewing', 10, false).sitters)
  assert.ok(densityFor('park', 18, false).level > densityFor('park', 12.5, false).level)
})

test('density: rain thins an open place and barely touches an indoor one; a weak phone gets a few walkers and no far crowd', () => {
  const dry = densityFor('park', 18, false), wet = densityFor('park', 18, true)
  assert.ok(wet.walkers + wet.sitters + wet.standers + wet.far < (dry.walkers + dry.sitters + dry.standers + dry.far) * 0.6)
  assert.ok(densityFor('mall', 14, true).level >= densityFor('mall', 14, false).level * 0.99)
  const light = densityFor('market', 10, false, 'light')
  assert.equal(light.far, 0)
  assert.ok(light.walkers <= TIER_CAPS.light.walkers && light.sitters <= TIER_CAPS.light.sitters)
  const off = densityFor('market', 10, false, 'off')
  assert.deepEqual([off.walkers, off.sitters, off.standers, off.far], [0, 0, 0, 0])
  for (const kind of Object.keys(PROFILES)) for (let h = 0; h < 24; h += 0.5) {
    const mix = densityFor(kind, h, false)
    assert.ok(mix.walkers <= TIER_CAPS.full.walkers && mix.far <= TIER_CAPS.full.far && mix.level >= 0 && mix.level <= 1, `${kind} ${h}`)
  }
  assert.equal(levelAt(PROFILES.market!.curve, 24), levelAt(PROFILES.market!.curve, 0))
})

test('the same place at the same time is the same crowd: positions, people and far figures', () => {
  const a = createPlanner(stage(), ident('market')), b = createPlanner(stage(), ident('market'))
  for (const dt of [0, 5_000, 31_000, 120_000, 400_000, 899_000]) {
    const now = MORNING + dt
    assert.deepEqual(a.at(now).map(({ track, sample }) => [track.id, sample.x, sample.z, sample.pose]), b.at(now).map(({ track, sample }) => [track.id, sample.x, sample.z, sample.pose]))
    assert.deepEqual(a.far(now), b.far(now))
  }
  // asked in another order, or after other times, a planner still answers the same
  const late = createPlanner(stage(), ident('market'))
  late.at(MORNING + 3_000_000)
  assert.deepEqual(late.at(MORNING + 20_000).map((x) => x.track.id), a.at(MORNING + 20_000).map((x) => x.track.id))
  // and another venue, or another quarter, is another crowd
  const other = createPlanner(stage(), ident('market', { venueId: 'market-2' }))
  assert.notDeepEqual(other.at(MORNING + 60_000).map((x) => x.track.id), a.at(MORNING + 60_000).map((x) => x.track.id))
})

test('a busy market holds far more people at ten than at ten at night, and a rainy park fewer than a dry one', () => {
  const count = (kind: string, at: number, raining = false): number => {
    const planner = createPlanner(stage(), ident(kind, { rainingAt: () => raining }))
    let most = 0
    for (let s = 0; s < 40; s++) most = Math.max(most, planner.at(at + s * 5_000).length)
    return most + planner.far(at).length
  }
  const morning = count('market', MORNING), night = count('market', MORNING + 12 * 3_600_000)
  assert.ok(morning >= 8, `market at ten: ${morning}`)
  assert.ok(night <= morning / 2, `market at ten at night: ${night} against ${morning}`)
  const evening = MORNING + 8.5 * 3_600_000
  assert.ok(count('park', evening, true) < count('park', evening, false))
})

test('walkers come in by a gate, leave by a gate, stay on free floor, and never meet each other, a seat taker, or a regular', () => {
  const s = stage(), id = ident('market'), door = gates(s)
  const start = Math.floor(MORNING / WAVE_MS) * WAVE_MS
  let walkers = 0
  for (let w = 0; w < 12; w++) {
    const stays = [...planStays(s, id, Math.floor((start + w * WAVE_MS) / QUARTER_MS))]
    const wave = planWave(s, id, Math.floor(start / WAVE_MS) + w, stays)
    walkers += wave.length
    for (const track of wave) {
      const first = track.keys[0]!, last = track.keys[track.keys.length - 1]!
      assert.ok(door.some((g) => Math.hypot(g.x - first.x, g.z - first.z) < 0.01), 'starts at a gate')
      assert.ok(door.some((g) => Math.hypot(g.x - last.x, g.z - last.z) < 0.01), 'ends at a gate')
      assert.ok(last.t + last.hold <= (Math.floor(start / WAVE_MS) + w + 1) * WAVE_MS, 'ends inside its wave')
      for (let at = first.t; at <= last.t + last.hold; at += 250) {
        const p = sampleTrack(track, at)!
        // a straight line between two waypoints may graze the margin the grid keeps round furniture, but never goes into the furniture itself
        assert.ok(!BLOCK.some((shape) => shape.length === 4 && p.x > shape[0] && p.x < shape[2] && p.z > shape[1] && p.z < shape[3]), `${track.id} went through furniture at ${p.x.toFixed(2)},${p.z.toFixed(2)}`)
        assert.ok(p.x > -10 && p.x < 10 && p.z > -8 && p.z < 8.5, 'inside the place')
        assert.ok(Math.hypot(p.x - 0, p.z - 3) >= KEEP_APART - 1e-6, 'keeps clear of the regular')
      }
    }
    for (let at = (Math.floor(start / WAVE_MS) + w) * WAVE_MS; at < (Math.floor(start / WAVE_MS) + w + 1) * WAVE_MS; at += 200) {
      const here = [...wave, ...stays].flatMap((t) => { const p = sampleTrack(t, at); return p ? [{ id: t.id, ...p }] : [] })
      for (let i = 0; i < here.length; i++) for (let j = i + 1; j < here.length; j++) {
        const [a, b] = [here[i]!, here[j]!]
        if (a.id.includes('|q|') && b.id.includes('|q|')) continue // two long stays are planned apart by seat and place, not by this check
        assert.ok(Math.hypot(a.x - b.x, a.z - b.z) >= KEEP_APART - 0.12, `${a.id} and ${b.id} are ${Math.hypot(a.x - b.x, a.z - b.z).toFixed(2)} apart at ${at}: ${JSON.stringify([a, b, wave.filter((t) => t.id === a.id || t.id === b.id).map((t) => t.keys.map((k) => [Math.round(k.t - at), +k.x.toFixed(1), +k.z.toFixed(1), k.hold]))])}`)
      }
    }
  }
  assert.ok(walkers >= 20, `walkers planned over twelve waves: ${walkers}`)
})

test('people who stay sit on real seats and stand at free places, in pairs that face each other, and keep clear of each other', () => {
  const s = stage(), id = ident('club', { hourAt: () => 22 })
  let sat = 0, talkers = 0
  for (let q = 0; q < 6; q++) {
    const stays = planStays(s, id, 100 + q), mid = (100 + q) * QUARTER_MS + QUARTER_MS / 2
    const there = stays.flatMap((t) => { const p = sampleTrack(t, mid); return p ? [{ t, p }] : [] })
    for (const { t, p } of there) {
      if (t.role === 'sitter') { sat++; assert.equal(p.mode, 'sit'); assert.ok(seats.some((seat) => Math.hypot(seat.x - p.x, seat.z - p.z) < 0.01 && Math.abs(seat.ry - p.ry) < 0.01), 'on a real seat, facing its way') }
      else assert.ok(grid.free(p.x, p.z), 'on free floor')
      if (t.role === 'talker') {
        talkers++
        const mate = there.find((o) => o.t.id === t.with)
        assert.ok(mate, 'a talker has a partner')
        const gap = Math.hypot(mate!.p.x - p.x, mate!.p.z - p.z)
        assert.ok(gap >= 1 && gap < 1.4, `partners stand at talking distance: ${gap}`)
        const toward = Math.atan2(mate!.p.x - p.x, mate!.p.z - p.z)
        assert.ok(Math.abs(Math.atan2(Math.sin(toward - p.ry), Math.cos(toward - p.ry))) < 0.01, 'and face each other')
      }
    }
    for (let i = 0; i < there.length; i++) for (let j = i + 1; j < there.length; j++) assert.ok(Math.hypot(there[i]!.p.x - there[j]!.p.x, there[i]!.p.z - there[j]!.p.z) >= 1.0, 'no two overlap')
  }
  assert.ok(sat > 6 && talkers > 3, `sat ${sat}, talked ${talkers}`)
})

test('nobody appears in a place from nowhere: every stay begins and ends at a gate, spread over the turn of the quarter', () => {
  const s = stage(), id = ident('club', { hourAt: () => 22 }), door = gates(s)
  const stays = planStays(s, id, 500)
  assert.ok(stays.length > 3)
  const starts = stays.map((t) => t.keys[0]!.t)
  for (const t of stays) {
    const f = t.keys[0]!, l = t.keys[t.keys.length - 1]!
    assert.ok(door.some((g) => Math.hypot(g.x - f.x, g.z - f.z) < 0.01) && door.some((g) => Math.hypot(g.x - l.x, g.z - l.z) < 0.01))
    assert.ok(f.t >= 500 * QUARTER_MS && l.t + l.hold >= 501 * QUARTER_MS)
  }
  assert.ok(new Set(starts).size === starts.length, 'arrivals are spread out, not all at once')
})

test('the far crowd is static, cheap to ask for, off on a weak device and stays out of the middle of things', () => {
  const s = stage()
  const far = planFar(s, ident('club', { hourAt: () => 22 }), 7)
  assert.ok(far.length >= 6 && far.length <= TIER_CAPS.full.far)
  for (const f of far) assert.ok(grid.free(f.x, f.z))
  assert.deepEqual(planFar(s, ident('club', { hourAt: () => 22, tier: 'light' as Tier }), 7), [])
  assert.equal(createPlanner(s, ident('club', { hourAt: () => 22, tier: 'light' })).far(7 * QUARTER_MS).length, 0)
  const lightMix = mixAt(ident('market', { tier: 'light' }), MORNING)
  assert.ok(lightMix.walkers <= 3)
  assert.equal(createPlanner(s, ident('market', { tier: 'off' })).at(MORNING + 20_000).length, 0)
})
