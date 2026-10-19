import assert from 'node:assert/strict'
import test from 'node:test'
import { castOf, venueFor, type Spec } from '../house/cast.ts'
import { cityContent, cityRules, loadCityContent, playableCityIds } from '../../src/game/cities/index.ts'
import { cityCastOf, houseTalkBankId, houseTalkBindingsOf } from './cast.ts'

const SOURCE_SHA256 = 'a'.repeat(64)

test('unloaded or unknown cities retain the supplied fallback by identity', () => {
  const fallback: readonly Spec[] = Object.freeze([])
  assert.equal(cityCastOf('not-a-city', fallback), fallback)
  assert.equal(houseTalkBankId('not-a-city', 'guide'), null)
  assert.equal(houseTalkBankId('../lagos', 'guide'), null)
})

test('loaded city cast preserves authored attributes and adds exact city and post context', async () => {
  await loadCityContent('kano')
  const original = castOf('kano'), contextual = cityCastOf('kano')
  const rules = cityRules('kano'), content = cityContent('kano')
  assert.ok(rules)
  assert.notEqual(contextual, original)
  assert.equal(contextual.length, original.length)
  for (let at = 0; at < original.length; at++) {
    const before = original[at]!, after = contextual[at]!
    const post = venueFor('kano', before.post, before.role), venue = content.venues.find(row => row.id === post)
    assert.ok(venue)
    assert.equal(after.key, before.key)
    assert.equal(after.name, before.name)
    assert.equal(after.role, before.role)
    assert.equal(after.look, before.look)
    assert.equal(after.voice, before.voice)
    assert.deepEqual(after.hours, before.hours)
    assert.deepEqual(after.post, before.post)
    assert.deepEqual(after.market, before.market)
    assert.deepEqual(after.eatery, before.eatery)
    assert.deepEqual(after.items, before.items)
    assert.equal(after.card, `In ${rules.name}, you work at ${venue.name}. ${before.card}`)
  }
})

test('every playable city preserves its full house cast while contextualizing to a loaded venue', async () => {
  const cityIds = [...playableCityIds()]
  assert.equal(cityIds.length, 284)
  for (const cityId of cityIds) {
    const content = await loadCityContent(cityId)
    const original = castOf(cityId), snapshot = structuredClone(original)
    const contextual = cityCastOf(cityId), rules = cityRules(cityId)
    assert.ok(rules, `${cityId}: playable city has rules`)
    assert.deepEqual(original, snapshot, `${cityId}: contextualization does not mutate canonical cast`)
    assert.equal(contextual.length, original.length, `${cityId}: contextual cast retains every spec`)
    for (let at = 0; at < snapshot.length; at++) {
      const before = snapshot[at]!, after = contextual[at]!
      const post = venueFor(cityId, before.post, before.role)
      const venue = content.venues.find(row => row.id === post)
      assert.ok(venue, `${cityId}/${before.key}: canonical post resolves to a loaded venue`)
      assert.deepEqual({ ...after, card: before.card }, before, `${cityId}/${before.key}: all canonical cast attributes remain unchanged`)
      assert.equal(after.card, `In ${rules.name}, you work at ${venue.name}. ${before.card}`, `${cityId}/${before.key}: exact contextual card`)
      assert.equal(houseTalkBankId(cityId, before.key), `${cityId}-house-${before.key}`, `${cityId}/${before.key}: canonical bank identity`)
    }
    assert.equal(houseTalkBankId(cityId, '__unknown__'), null, `${cityId}: unknown cast key is rejected`)
  }
})

test('house bindings use distinct canonical ids and exact loaded cast, post, and source evidence', async () => {
  await loadCityContent('lagos')
  const bindings = houseTalkBindingsOf('lagos', SOURCE_SHA256), cast = cityCastOf('lagos'), content = cityContent('lagos')
  assert.deepEqual(bindings.map(binding => binding.npc.id), [...bindings.map(binding => binding.npc.id)].sort((a, b) => a.localeCompare(b, 'en')))
  assert.equal(bindings.length, cast.length)
  for (const binding of bindings) {
    const key = binding.npc.id.slice('lagos-house-'.length), spec = cast.find(row => row.key === key)
    assert.ok(spec)
    const post = venueFor('lagos', spec.post, spec.role), venue = content.venues.find(row => row.id === post)
    assert.ok(venue)
    assert.equal(binding.npc.id, houseTalkBankId('lagos', spec.key))
    assert.equal(binding.npc.name, spec.name)
    assert.deepEqual(binding.venue, { id: venue.id, name: venue.name, source: binding.npc.source })
    assert.equal(binding.facts.find(fact => fact.id === 'npc-role')?.text, spec.role)
    assert.equal(binding.facts.find(fact => fact.id === 'house-card')?.text, spec.card)
    assert.equal(binding.facts.find(fact => fact.id === 'house-hours-open')?.text, String(spec.hours.open))
    assert.equal(binding.facts.find(fact => fact.id === 'house-hours-close')?.text, String(spec.hours.close))
    assert.equal(binding.facts.every(fact => fact.source === `server/house/cast.ts#sha256=${SOURCE_SHA256}`), true)
  }
  assert.equal(houseTalkBankId('lagos', 'invented'), null)
  assert.throws(() => houseTalkBindingsOf('lagos', 'not-a-hash'), /source hash must be sha256/)
})
