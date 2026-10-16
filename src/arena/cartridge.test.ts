// OWNER: games (real-time) — every cartridge conforms to the contract (src/arena/cartridge.ts, docs/CARTRIDGES.md) without the
// games having been changed: entry valid, rules/catalog/entry agree, bots finish or keep going deterministically, snapshots are small.
import test from 'node:test'
import assert from 'node:assert/strict'
import { makeRng } from '../game/util.ts'
import { ARENA_GAMES } from './registry.ts'
import { ARENA_CATALOG } from './catalog.ts'
import { CARTRIDGES, cartridgeOf } from './cartridges.ts'
import { CARTRIDGE_CONTRACT, CARTRIDGE_LIMITS, DEFAULT_CAP_BROTLI, clampRewards, defineCartridge, validateCartridge } from './cartridge.ts'
import type { Cartridge } from './cartridge.ts'

test('every game in the arena registry is a cartridge, and the other way round', () => {
  assert.deepEqual(CARTRIDGES.map((c) => c.id).sort(), Object.keys(ARENA_GAMES).sort())
  assert.deepEqual(CARTRIDGES.map((c) => c.id).sort(), ARENA_CATALOG.map((c) => c.id).sort())
})

test('each entry is valid and agrees with its rules and its catalog card', () => {
  for (const c of CARTRIDGES) {
    assert.deepEqual(validateCartridge(c), [], c.id)
    const rules = ARENA_GAMES[c.id]!, card = ARENA_CATALOG.find((e) => e.id === c.id)!
    assert.equal(rules.id, c.id); assert.equal(rules.label, c.name); assert.equal(card.title, c.name); assert.equal(card.blurb, c.blurb)
    assert.equal(card.min, rules.seats.min); assert.equal(card.max, rules.seats.max)
    assert.ok(rules.hz >= 1 && rules.hz <= 30, `${c.id} hz`)
    assert.equal(c.modes.alone === 'live', card.practice, `${c.id}: alone mode is the Practice button`)
    assert.equal(c.manifest.cap ?? DEFAULT_CAP_BROTLI, DEFAULT_CAP_BROTLI)
  }
})

test('the rules honour the contract: idle and parseInput, a bot for every seat, deterministic steps, small snapshots', () => {
  for (const c of CARTRIDGES) {
    const rules = ARENA_GAMES[c.id]!
    for (const seats of [rules.seats.min, rules.seats.max]) {
      const run = () => {
        const rng = makeRng('contract-' + c.id), state = rules.start(seats, rng, {})
        const snaps: string[] = []
        for (let t = 0; t < 400 && !rules.outcome(state); t++) {
          const inputs = Array.from({ length: seats }, (_, s) => rules.bot(state, s, rng))
          rules.step(state, inputs, rng)
          snaps.push(JSON.stringify(rules.snapshot(state)))
        }
        return snaps
      }
      const a = run(), b = run()
      assert.deepEqual(a, b, `${c.id} is deterministic`)
      assert.ok(Math.max(...a.map((s) => s.length)) < 400, `${c.id} snapshot stays small`)
    }
    assert.throws(() => rules.parseInput({ nonsense: 'x'.repeat(5000) }), undefined, c.id)
    assert.equal(cartridgeOf(c.id), c)
  }
})

test('validateCartridge names what is wrong', () => {
  const ok = CARTRIDGES[0]!
  const bad = (change: Partial<Cartridge>) => validateCartridge(defineCartridge({ ...ok, ...change }))
  assert.match(bad({ id: 'Fight1' }).join(), /id must be/)
  assert.match(bad({ rev: 0 }).join(), /rev/)
  assert.match(bad({ modes: { ...ok.modes, alone: 'planned', friends: 'planned' } }).join(), /at least one mode/)
  assert.match(bad({ manifest: { entry: 'FightGame', cap: DEFAULT_CAP_BROTLI + 1, assets: [] } }).join(), /manifest.cap/)
  const asset = { path: 'public/a.glb', licence: 'CC-BY' as const, source: 'https://example.org/a' }
  assert.match(bad({ manifest: { entry: 'FightGame', assets: [asset] } }).join(), /needs attribution/)
  assert.deepEqual(bad({ manifest: { entry: 'FightGame', assets: [{ ...asset, attribution: 'A by B, CC BY 4.0' }] } }), [])
  assert.match(bad({ manifest: { entry: 'FightGame', assets: [{ ...asset, path: '../x', licence: 'CC0' }] } }).join(), /inside the repository/)
  assert.match(bad({ manifest: { entry: 'FightGame', assets: [{ ...asset, licence: 'GPL' as never }] } }).join(), /licence/)
  assert.equal(CARTRIDGE_CONTRACT, 1)
})

test('rewards are clamped to what a table pays', () => {
  assert.deepEqual(clampRewards([-5, 99999, 12.7, Number.NaN]), [0, CARTRIDGE_LIMITS.rewardPerWin, 12, 0])
})
