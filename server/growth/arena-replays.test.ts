// OWNER: games (real-time) — the replay shelf's bounds (age, per game) and erasure, over the stored collection.
import test from 'node:test'
import assert from 'node:assert/strict'
import { clipAddress, forgetReplayPlayers, pruneReplays } from './arena-replays.ts'
import type { ReplayCollection, StoredReplay } from './arena-replays.ts'
import type { ReplayLog } from '../../src/arena/replay.ts'
import type { Db } from '../types.ts'

const log = (game: string): ReplayLog => ({ v: 1, game, rev: 1, hz: 20, seed: 's', options: {}, seats: [{ name: 'A', bot: false }, { name: 'B', bot: true }], ticks: 1, i: [], s: [], f: [], end: null, result: { text: '', winners: [0], draw: false, reason: 'ko', scores: [1, 0] } })
const item = (game: string, at: number, who: string[] = ['p1']): StoredReplay => ({ at, game, who, log: log(game), clip: null })

test('pruning drops old replays and keeps the newest of each game', () => {
  const c: ReplayCollection = { v: 1, items: { a: item('fight', 1000), b: item('fight', 3000), c: item('fight', 2000), d: item('race', 100), e: item('race', 9000) } }
  pruneReplays(c, 10_000, { perGame: 2, ttlMs: 9_500 })
  assert.deepEqual(Object.keys(c.items).sort(), ['b', 'c', 'e'])
})

test('damaged entries are dropped rather than kept', () => {
  const c = { v: 1, items: { a: item('fight', 1000), bad: { at: 'x' }, worse: null } } as unknown as ReplayCollection
  pruneReplays(c, 2000, { perGame: 5, ttlMs: 100_000 })
  assert.deepEqual(Object.keys(c.items), ['a'])
})

test('an erased player takes every replay they sat in with them', () => {
  const db = { arenareplays: { v: 1, items: { a: item('fight', 1, ['p1', 'p2']), b: item('fight', 2, ['p3']), c: item('race', 3, ['p2']) } } } as unknown as Db
  forgetReplayPlayers(db, new Set(['p2']))
  assert.deepEqual(Object.keys((db as unknown as { arenareplays: ReplayCollection }).arenareplays.items), ['b'])
  forgetReplayPlayers({} as Db, new Set(['p1']))
})

test('a clip address is this site or https, an mp4, and nothing that can break out of an attribute', () => {
  assert.equal(clipAddress('/clips/a.mp4'), '/clips/a.mp4')
  assert.equal(clipAddress('https://cdn.example/a.mp4'), 'https://cdn.example/a.mp4')
  for (const bad of ['//evil/a.mp4', 'http://x/a.mp4', '/a.webm', '/a b.mp4', '/a".mp4', 'javascript:a.mp4', 7]) assert.equal(clipAddress(bad), null, String(bad))
})
