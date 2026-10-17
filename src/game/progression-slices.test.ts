import assert from 'node:assert/strict'
import test from 'node:test'
import { createLife, makeContext, viewLife } from '../life.ts'
import { needsProgressionRules, PROGRESSION_STAND_INS, PROGRESSION_SYSTEM_IDS } from './progression-slices.ts'
import { loadCityContent } from './cities/registry.ts'

await loadCityContent('lagos')

const ctx = makeContext({ now: 1000, cityId: 'lagos' })

test('fresh stand-ins reproduce full empty slices with independent containers', () => {
  const first = createLife(null, ctx), second = createLife(null, ctx)
  for (const system of PROGRESSION_STAND_INS) {
    const id = PROGRESSION_SYSTEM_IDS.find(key => key === system.id)
    assert.ok(id)
    const expected = structuredClone(first[id])
    system.sanitize({}, first, ctx)
    system.sanitize({}, second, ctx)
    assert.deepEqual(first[id], expected)
    assert.deepEqual(second[id], expected)
    for (const key of Object.keys(first[id])) {
      const a = Object.getOwnPropertyDescriptor(first[id], key)?.value
      const b = Object.getOwnPropertyDescriptor(second[id], key)?.value
      if (a !== null && typeof a === 'object') assert.notEqual(a, b, `${id}.${key} belongs to its life`)
    }
  }
})

test('only exact empty progression data can bypass the authored sanitizer', () => {
  const state = createLife(null, ctx)
  for (const id of PROGRESSION_SYSTEM_IDS) {
    const raw = { t: 1000, [id]: structuredClone(state[id]) }
    assert.equal(needsProgressionRules(raw), false, id)
    assert.equal(needsProgressionRules({ ...raw, [id]: { ...state[id], future: true } }), true, `${id}: unknown fields survive`)
    assert.equal(needsProgressionRules({ ...raw, [id]: { ...state[id], trackingSince: 1001 } }), true, `${id}: future timestamp`)
  }
  assert.equal(needsProgressionRules({ t: 1000, story: { ...state.story, mode: 'story' } }), true)
  assert.equal(needsProgressionRules({ t: 1000, story: { ...state.story, cities: { lagos: { missions: [], venues: ['park'] } } } }), true)
  let read = false
  const story = { ...state.story }
  Object.defineProperty(story, 'cities', { enumerable: true, get() { read = true; return {} } })
  assert.equal(needsProgressionRules({ t: 1000, story }), true)
  assert.equal(read, false, 'the boundary never invokes a saved getter')
})

test('disabled full and browser Story projections agree without changing saved receipts', () => {
  const state = createLife(null, ctx)
  state.story.mode = 'story'
  state.story.start = 'lagos'
  state.story.cities.lagos = { missions: [], venues: ['park'] }
  const saved = structuredClone(state.story)
  assert.deepEqual(viewLife(state, ctx).story, { enabled: false })
  assert.deepEqual(state.story, saved)
})
