// The Space Plan contract (src/spaces/plan.ts): reading any input safely, fitting a plan into a real plot, repairing what does not
// fit, and pricing what applying it would buy.
import test from 'node:test'
import assert from 'node:assert/strict'
import { FURNITURE } from '../game/content/furniture.ts'
import { DEFAULT_STYLE } from '../game/content/world.ts'
import { checkPlacement, doorSlot, MAX_PLACED as LAYOUT_MAX } from '../game/home-layout.ts'
import { MAX_PLACED, firstJsonObject, fitSpacePlan, fittedPlan, normalizeSpacePlan, packPlan, repairSpacePlan, roomPlot, spacePlanDiff, stylePriceOf, tierPlot, validateSpacePlan, describePlot, type SpacePlanV1, type SpaceProblem } from './plan.ts'
import type { PlacedItem } from '../types/life.ts'

const plan = (items: SpacePlanV1['items'], extra: Partial<SpacePlanV1> = {}): SpacePlanV1 => ({ schema: 'allworld-space', version: 1, target: 'home', items, ...extra })

test('normalize refuses what is not a plan and never throws', () => {
  const bad: unknown[] = [null, undefined, 0, 'plan', [], true, {}, { items: 'x' }, { target: 'home' }, { target: 'house', items: [] }, { schema: 'other', target: 'home', items: [] },
    { schema: 'allworld-space', version: 2, target: 'home', items: [] }, { v: 3, target: 'room', items: [] }, { target: 'home', items: {} }, { target: 'room', items: null },
    { target: 1, items: [] }, { target: ['home'], items: [] }, Object.create(null), { target: 'home', items: [], version: '1' }, { schema: 'allworld-space', target: 'shop', items: [] }]
  assert.equal(bad.length, 20)
  for (const value of bad) assert.equal(normalizeSpacePlan(value), null, JSON.stringify(value))
})

test('normalize drops unknown items, bad positions and unknown keys, and names each', () => {
  const problems: SpaceProblem[] = []
  const got = normalizeSpacePlan({ schema: 'allworld-space', version: 1, target: 'home', tier: 'bq', hack: 'x', style: { wall: 3, roof: 99, nope: 1 }, title: 'A\nnice   place\u0000', notes: 'n',
    items: [{ itemId: 'spring-bed', x: 0, y: 0, rot: 5 }, { itemId: 'jet-ski', x: 1, y: 1, rot: 0 }, { itemId: 'toilet', x: 1.5, y: 0, rot: 0 }, ['fridge', 3, 0, 0], { item: 'basin', x: 4, y: 0 }, { itemId: '__proto__', x: 0, y: 0, rot: 0 }] }, problems)
  assert.ok(got)
  assert.deepEqual(Object.keys(got).sort(), ['items', 'notes', 'schema', 'style', 'target', 'tier', 'title', 'version'])
  assert.deepEqual(got.style, { wall: 3 })
  assert.equal(got.title, 'A nice place')
  assert.deepEqual(got.items.map((item) => [item.itemId, item.rot]), [['spring-bed', 1], ['fridge', 0], ['basin', 0]])
  assert.deepEqual(problems.map((p) => p.code), ['unknown_item', 'left_out', 'unknown_item'])
  assert.equal(normalizeSpacePlan({ items: [] }, [], 'room')?.target, 'room', 'the caller’s target when the plan names none')
  assert.equal(normalizeSpacePlan({ target: 'room', style: { wall: 1 }, items: [] })?.style, undefined, 'a room has no look')
})

test('normalize caps the pieces of a home and of a room', () => {
  const many = Array.from({ length: 200 }, (_, i) => ['plastic-chair', i % 10, Math.floor(i / 10), 0])
  const problems: SpaceProblem[] = []
  assert.equal(normalizeSpacePlan({ target: 'home', items: many }, problems)?.items.length, MAX_PLACED)
  assert.equal(problems.filter((p) => p.code === 'too_many').length, 40)
  assert.equal(normalizeSpacePlan({ target: 'room', items: many })?.items.length, 60)
})

test('pack and normalize are one round trip, and a full house packs under the 8 KB request limit', () => {
  const original = plan([{ itemId: 'foam-bed', x: 0, y: 0, rot: 0 }, { itemId: 'wall-lamp', x: 0, y: 2, rot: 1 }, { itemId: 'bookshelf', x: 2, y: 3, rot: 0, floor: 1 }], { tier: 'duplex', style: { wall: 1 }, title: 'T', notes: 'dropped' })
  const packed = packPlan(original)
  const back = normalizeSpacePlan(JSON.parse(JSON.stringify(packed)))
  assert.deepEqual(back, { schema: 'allworld-space', version: 1, target: 'home', tier: 'duplex', style: { wall: 1 }, title: 'T', items: original.items })
  const full = plan(Array.from({ length: MAX_PLACED }, (_, i) => ({ itemId: 'camera-tripod', x: i % 20, y: Math.floor(i / 20), rot: 3, floor: 2 })), { title: 'x'.repeat(80), style: { ...DEFAULT_STYLE } })
  assert.ok(JSON.stringify({ target: 'home', requestId: `${Date.now()}:${crypto.randomUUID()}`, plan: packPlan(full) }).length < 8192)
})

test('the first JSON object is found inside words and fences, braces in strings included', () => {
  assert.deepEqual(firstJsonObject('Here you go:\n```json\n{"a": "}{", "b": {"c": 1}}\n```\nEnjoy'), { a: '}{', b: { c: 1 } })
  assert.equal(firstJsonObject('no json'), undefined)
  assert.equal(firstJsonObject('{"a": 1'), undefined)
})

test('validate keeps what fits and drops a collision and a door block; repair moves them to the nearest free spot', () => {
  const plot = tierPlot('starter')
  const door = doorSlot(plot.grid)
  const wanted = plan([{ itemId: 'spring-bed', x: 0, y: 0, rot: 0 }, { itemId: 'plastic-chair', x: 0, y: 1, rot: 0 }, { itemId: 'velvet-sofa', x: 0, y: door, rot: 1 }, { itemId: 'toilet', x: 5, y: 5, rot: 0 }])
  const checked = validateSpacePlan(wanted, plot)
  assert.deepEqual(checked.items.map((item) => item.itemId), ['spring-bed', 'toilet'])
  assert.deepEqual(checked.problems.map((p) => [p.itemId, p.code]), [['plastic-chair', 'left_out'], ['velvet-sofa', 'left_out']])
  const repaired = repairSpacePlan(wanted, plot)
  assert.deepEqual(repaired.items.map((item) => item.itemId), ['spring-bed', 'plastic-chair', 'velvet-sofa', 'toilet'])
  assert.deepEqual(repaired.problems.map((p) => p.code), ['moved', 'moved'])
  const chair = repaired.items[1]!
  assert.ok(Math.abs(chair.x - 0) + Math.abs(chair.y - 1) <= 2, 'the chair moved next to where it was asked')
  // Every repaired piece really stands: re-check each against the others.
  for (const item of repaired.items) assert.equal(checkPlacement(plot, repaired.items, FURNITURE[item.itemId]!, item.x, item.y, item.rot, item.id, item.floor ?? 0), null)
  assert.equal(repaired.cost, FURNITURE['spring-bed']!.price + FURNITURE['plastic-chair']!.price + FURNITURE['velvet-sofa']!.price + FURNITURE.toilet!.price)
})

test('wall pieces: the window and door slots are refused and two on one slot is one too many', () => {
  const plot = tierPlot('starter')
  const fit = validateSpacePlan(plan([{ itemId: 'wall-art', x: 3, y: 0, rot: 0 }, { itemId: 'wall-lamp', x: 0, y: 4, rot: 1 }, { itemId: 'wall-fan', x: 1, y: 0, rot: 0 }, { itemId: 'wall-calendar', x: 1, y: 0, rot: 0 }]), plot)
  assert.deepEqual(fit.items.map((item) => item.itemId), ['wall-fan'])
  const repaired = repairSpacePlan(plan([{ itemId: 'wall-fan', x: 1, y: 0, rot: 0 }, { itemId: 'wall-calendar', x: 1, y: 0, rot: 0 }]), plot)
  assert.equal(repaired.items.length, 2)
  assert.notEqual(repaired.items[1]!.x, 1)
})

test('a villa plan re-fits into a two-room house: nothing overlaps, upstairs pieces come down or are left out', () => {
  const villa = tierPlot('villa')
  const pieces: SpacePlanV1['items'] = []
  for (const [itemId, floor] of [['king-bed', 1], ['king-bed', 1], ['chef-range', 0], ['double-fridge', 0], ['gold-sofa', 0], ['family-sofa', 0], ['bathtub', 1], ['wc-suite', 1], ['aquarium', 0], ['flat-tv', 0], ['bookshelf', 2]] as const) pieces.push({ itemId, x: 3, y: 3, rot: 0, ...(floor ? { floor } : {}) })
  const big = repairSpacePlan(plan(pieces, { tier: 'villa' }), villa)
  assert.equal(big.items.length, pieces.length)
  const small = repairSpacePlan(fittedPlan(plan(pieces), big), tierPlot('bq'))
  assert.ok(small.items.every((item) => !item.floor), 'a two-room house has one floor')
  for (const item of small.items) assert.equal(checkPlacement(tierPlot('bq'), small.items, FURNITURE[item.itemId]!, item.x, item.y, item.rot, item.id, 0), null)
})

test('a room plan fits the 10 × 10 room and is capped at 60 pieces', () => {
  const chairs = Array.from({ length: 80 }, (_, i) => ({ itemId: 'plastic-chair' as const, x: i % 10, y: Math.floor(i / 10) % 10, rot: 0 }))
  const fit = fitSpacePlan(normalizeSpacePlan({ target: 'room', items: chairs })!, roomPlot())
  assert.equal(fit.items.length, 60)
})

test('the diff reuses owned pieces (placed or stored), buys the rest and stores what the plan leaves out', () => {
  const placed: PlacedItem[] = [{ id: 'f1', itemId: 'spring-bed', x: 0, y: 0, rot: 0 }, { id: 'f2', itemId: 'plastic-chair', x: 2, y: 2, rot: 0 }, { id: 'f3', itemId: 'plastic-chair', x: 3, y: 2, rot: 0 }]
  const diff = spacePlanDiff(placed, { 'velvet-sofa': 1, 'bogus': 3 } as never, [{ itemId: 'plastic-chair' }, { itemId: 'velvet-sofa' }, { itemId: 'velvet-sofa' }, { itemId: 'fridge' }])
  assert.deepEqual(diff.buy, { 'velvet-sofa': 1, fridge: 1 })
  assert.deepEqual(diff.reuse, { 'plastic-chair': 1, 'velvet-sofa': 1 })
  assert.deepEqual(diff.store, { 'spring-bed': 1, 'plastic-chair': 1 })
  assert.equal(diff.cost, FURNITURE['velvet-sofa']!.price + FURNITURE.fridge!.price)
  assert.equal(stylePriceOf({ ...DEFAULT_STYLE }, { shape: 2, wall: 0, roof: 6 }), 5000 + 1500)
})

test('the plot description names the rooms and the stairs of a duplex', () => {
  const lines = describePlot(tierPlot('duplex')).join('\n')
  assert.match(lines, /Floor 1:/)
  assert.match(lines, /Stairs from floor 0/)
  assert.match(lines, /Front door on the side wall at x 0, y 10/)
})

test('the plan’s piece cap is the home’s', () => assert.equal(MAX_PLACED, LAYOUT_MAX))
