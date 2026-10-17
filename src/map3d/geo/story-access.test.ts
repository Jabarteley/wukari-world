import assert from 'node:assert/strict'
import test from 'node:test'
import { loadCityLinks } from '../../game/cities/registry.ts'
import type { MapStoryView } from '../types.ts'
import { cityAccess, cityEntry } from '../regions.ts'
import { regionInfo } from './info.ts'

await loadCityLinks()

const story = (mode: 'free' | 'story', enabled = true): MapStoryView => enabled ? ({
  enabled: true,
  mode,
  cities: [
    { id: 'lagos', label: 'Lagos', chapter: 2, unlocked: true },
    { id: 'ibadan', label: 'Ibadan', chapter: 0, unlocked: false },
    { id: 'london', label: 'London', chapter: 0, unlocked: false },
  ],
}) : { enabled: false }

test('real city access keeps the current city here and locks linked and remote destinations in Story mode', () => {
  const view = story('story')
  assert.equal(cityAccess('lagos', { current: 'lagos', story: view }), 'here')
  assert.equal(cityAccess('ibadan', { current: 'lagos', story: view }), 'locked')
  assert.equal(cityAccess('london', { current: 'lagos', story: view }), 'locked')
})

test('the real region card names a Story lock and removes its route and entry actions', () => {
  const info = regionInfo({ kind: 'state', id: 'oyo' }, {
    current: 'lagos', cityId: 'ibadan', story: story('story'), feature: { name: 'Oyo' },
    routes: [{ to: 'ibadan', mode: 'road', blocked: null }],
  })
  assert.equal(info.city?.id, 'ibadan')
  assert.equal(info.tone, 'locked')
  assert.equal(info.tag, 'Story locked')
  assert.equal(info.teaser, "Finish a connected city's story before entering Ibadan.")
  assert.equal(info.wait, null)
  assert.equal(info.action, null)
  assert.deepEqual(info.routes, [])
})

test('Free roam and a disabled capability restore the catalogue access and routes unchanged', () => {
  assert.equal(cityAccess('ibadan', { current: 'lagos', story: story('free') }), 'enter')
  assert.equal(cityAccess('london', { current: 'lagos', story: story('story', false) }), 'enter')
  const free = regionInfo({ kind: 'state', id: 'oyo' }, {
    current: 'lagos', cityId: 'ibadan', story: story('free'), feature: { name: 'Oyo' },
    routes: [{ to: 'ibadan', mode: 'road', blocked: null }],
  })
  assert.equal(free.tone, 'open')
  assert.ok(free.routes.length > 0)
  assert.equal(cityEntry('ibadan')?.status, 'playable')
})
