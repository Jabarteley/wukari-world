// OWNER: social — Near you's pure rules (docs/FEED.md, "Near you"): how near a badge is, the ranking's bonus, near-first lists, the words.
import test from 'node:test'
import assert from 'node:assert/strict'
import { LOCAL_SCOPES, LOCAL_SCOPE_LABEL, NEAR, badgePlaceText, confirmedText, isLocalScope, monthOf, nearFirst, nearness, rank } from './model.ts'
import type { Rankable } from './model.ts'

test('nearness: the same local government, then the same city (or a thing placed in it), then nothing', () => {
  const me = { city: 'lagos', lga: 'ikeja' }
  assert.equal(nearness(me, { city: 'lagos', lga: 'ikeja' }), 'lga')
  assert.equal(nearness(me, { city: 'lagos', lga: 'surulere' }), 'city')
  assert.equal(nearness(me, { city: 'lagos' }), 'city')
  assert.equal(nearness(me, { city: 'ibadan', lga: 'ikeja' }), null, 'an id of another city is not the same place')
  assert.equal(nearness(me, undefined, 'lagos'), 'city', 'no badge, but placed in my city')
  assert.equal(nearness(me, undefined, 'abuja'), null)
  assert.equal(nearness({ city: 'lagos' }, { city: 'lagos', lga: 'ikeja' }), 'city', 'a viewer without a local government has no neighbours, only a city')
  assert.equal(nearness(null, { city: 'lagos', lga: 'ikeja' }, 'lagos'), null, 'no badge, no bonus')
})

test('the ranking: a neighbour\'s older post can lead; a much older one does not run away; nothing is dropped', () => {
  const now = 10 * 3600000
  const post = (id: string, ageHours: number, near: Rankable['near']): Rankable & { id: string } => ({ id, at: now - ageHours * 3600000, replies: 0, reactions: 0, friend: false, mine: false, ai: false, kind: 'text', near })
  const list = [post('fresh', 0, null), post('city', 1, 'city'), post('neighbour', 3, 'lga'), post('old-neighbour', 24, 'lga')]
  assert.deepEqual(rank(list, now).map((p) => p.id), ['neighbour', 'city', 'fresh', 'old-neighbour'])
  assert.ok(NEAR.lga > NEAR.city && NEAR.city > 1)
  assert.deepEqual(rank(list.map((p) => ({ ...p, near: null })), now).map((p) => p.id), ['fresh', 'city', 'neighbour', 'old-neighbour'], 'without a badge: as the city tab')
})

test('near first: local government, then city, then the rest, each keeping its order', () => {
  const items = [{ id: 'a', n: null }, { id: 'b', n: 'city' }, { id: 'c', n: 'lga' }, { id: 'd', n: 'city' }, { id: 'e', n: 'lga' }] as const
  assert.deepEqual(nearFirst(items, (x) => x.n).map((x) => x.id), ['c', 'e', 'b', 'd', 'a'])
})

test('scopes and words: the area scope, counts as numbers, the month', () => {
  assert.deepEqual([...LOCAL_SCOPES], ['lga', 'city', 'state', 'country'])
  assert.equal(isLocalScope('lga'), true)
  assert.equal(LOCAL_SCOPE_LABEL.lga, 'Only people confirmed in this area')
  assert.equal(confirmedText(214, 'Yaba'), '214 people confirmed in Yaba this month')
  assert.equal(confirmedText(1, 'Lagos'), '1 person confirmed in Lagos this month')
  assert.equal(confirmedText(1200, 'Lagos', false), '1,200 people confirmed in Lagos')
  assert.equal(badgePlaceText({ name: 'Lagos', lgaName: 'Lagos Mainland' }), 'Lagos Mainland, Lagos')
  assert.equal(badgePlaceText({ name: 'Lagos' }), 'Lagos')
  assert.equal(monthOf(Date.UTC(2026, 9, 19, 23)), '2026-10')
  assert.equal(monthOf(Date.UTC(2026, 10, 1)), '2026-11')
})
