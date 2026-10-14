import assert from 'node:assert/strict'
import test from 'node:test'
import { tidyRoads } from './road-tidy.ts'
import type { PackRoad, Point2 } from './types.ts'

const road = (id: string, points: Point2[], extra: Partial<PackRoad> = {}): PackRoad => ({ id, name: id, major: true, points, ...extra })

test('road tidy: two pieces of one road that meet end to end become one ribbon', () => {
  const out = tidyRoads([road('a', [[0, 0], [5, 0]]), road('b', [[5, 0], [10, 1]])])
  assert.equal(out.length, 1)
  assert.deepEqual(out[0]!.points, [[0, 0], [5, 0], [10, 1]])
})

test('road tidy: an end that misses another road end by tens of metres is snapped onto it and joined', () => {
  const out = tidyRoads([road('a', [[0, 0], [5, 0]]), road('b', [[5.4, 0.2], [12, 0]])])
  assert.equal(out.length, 1)
  assert.equal(out[0]!.points.length, 3)
})

test('road tidy: an end near the middle of a road is snapped onto it, with a vertex added there (a T-junction)', () => {
  const out = tidyRoads([road('main', [[0, 0], [10, 0]]), road('side', [[5, 0.6], [5, 8]])])
  const main = out.find(r => r.id === 'main')!, side = out.find(r => r.id === 'side')!
  assert.deepEqual(side.points[0], [5, 0])
  assert.ok(main.points.some(p => p[0] === 5 && p[1] === 0), 'the junction is a vertex of the main road')
})

test('road tidy: the other carriageway, a few metres beside a road, is drawn by that road', () => {
  const out = tidyRoads([road('north', [[0, 0], [10, 0]]), road('south', [[0, 0.25], [10, 0.25]])])
  assert.equal(out.length, 1)
})

test('road tidy: short stubs with a loose end and short loose pieces go; long roads stay', () => {
  const out = tidyRoads([road('main', [[0, 0], [20, 0]]), road('stub', [[8, 0], [8, 2]]), road('island', [[0, 30], [3, 30]]), road('far', [[0, 60], [12, 60]])])
  assert.deepEqual(out.map(r => r.id).sort(), ['far', 'main'])
})

test('road tidy: roads of different classes are not joined into one ribbon, and a bridge is kept as it is', () => {
  const bridge = road('bridge', [[5, 0], [15, 0]], { bridge: 0.6 })
  const out = tidyRoads([road('a', [[0, 0], [5, 0]], { trunk: true }), road('b', [[-6, 0.3], [0, 0]], { major: false }), bridge])
  assert.equal(out.length, 3)
  assert.deepEqual(out.find(r => r.id === 'bridge')!.points, bridge.points)
})

test('road tidy: deterministic, and the input is not changed', () => {
  const input = [road('a', [[0, 0], [5, 0]]), road('b', [[5.3, 0], [9, 3]]), road('c', [[9, 3], [9, 12]], { major: false })]
  const copy = JSON.stringify(input)
  assert.deepEqual(tidyRoads(input), tidyRoads(input))
  assert.equal(JSON.stringify(input), copy)
})

test('road tidy: Port Moresby keeps its network and loses most of its loose ends', async () => {
  const [{ TERRAIN }, { toLocal }] = await Promise.all([import('../game/cities/port-moresby/terrain.ts'), import('../geo/frame.ts')])
  const origin = { x: 0, z: 0 }
  const raw: PackRoad[] = TERRAIN.roads.map((row, i) => {
    const [name, major, x0, y0, ...steps] = row as [string, number, number, number, ...number[]]
    let x = x0, y = y0
    const points: Point2[] = [toLocal(origin, x / 1e4, y / 1e4)]
    for (let k = 0; k + 1 < steps.length; k += 2) { x += steps[k]!; y += steps[k + 1]!; points.push(toLocal(origin, x / 1e4, y / 1e4)) }
    return { id: `road-${i}`, name, ...(major ? { major: true } : {}), points }
  })
  const loose = (roads: readonly PackRoad[]) => {
    const at = new Map<string, number>()
    for (const r of roads) r.points.forEach(p => at.set(`${p[0]},${p[1]}`, (at.get(`${p[0]},${p[1]}`) ?? 0) + 1))
    return roads.reduce((n, r) => n + [r.points[0]!, r.points[r.points.length - 1]!].filter(p => at.get(`${p[0]},${p[1]}`) === 1).length, 0)
  }
  const out = tidyRoads(raw)
  assert.ok(out.length < raw.length / 2, `${out.length} ribbons from ${raw.length} rows`)
  assert.ok(loose(out) < loose(raw) / 4, `loose ends ${loose(raw)} → ${loose(out)}`)
  const km = (roads: readonly PackRoad[]) => roads.reduce((s, r) => s + r.points.slice(1).reduce((t, p, k) => t + Math.hypot(p[0] - r.points[k]![0], p[1] - r.points[k]![1]), 0), 0) / 10
  assert.ok(km(out) > km(raw) * 0.6, 'the network is not thinned away')
})
