// OWNER: social — the pure rules of the neighbourhood (docs/NEIGHBOURHOOD.md).
import test from 'node:test'
import assert from 'node:assert/strict'
import { NOTICE, NOTICE_KINDS, areaKey, areaOf, badgeIn, cleanNotice, extendedUntil, isNoticeKind, leftText, noticeEnded, noticeKindLabel } from './model.ts'

const H = 3600000
test('areas: a badge names its local government, or its city when it has none', () => {
  assert.equal(areaKey('lagos', 'ikeja'), 'lagos/ikeja')
  assert.equal(areaKey('lagos'), 'lagos')
  assert.equal(areaOf({ city: 'lagos', lga: 'ikeja' }), 'lagos/ikeja')
  assert.equal(areaOf({ city: 'lagos' }), 'lagos')
  assert.equal(areaOf(null), null)
})

test('areas: a local government needs a badge with that same local government; a city needs the same city', () => {
  assert.equal(badgeIn({ city: 'lagos', lga: 'ikeja' }, 'lagos/ikeja'), true)
  assert.equal(badgeIn({ city: 'lagos' }, 'lagos/ikeja'), false, 'a badge of the city alone is not enough')
  assert.equal(badgeIn({ city: 'lagos', lga: 'lagos-mainland' }, 'lagos/ikeja'), false)
  assert.equal(badgeIn({ city: 'abuja', lga: 'ikeja' }, 'lagos/ikeja'), false, 'the same name in another city is another place')
  assert.equal(badgeIn({ city: 'lagos', lga: 'ikeja' }, 'lagos'), true)
  assert.equal(badgeIn(undefined, 'lagos'), false)
})

test('notices: four kinds, each with its own life; the words are cleaned', () => {
  assert.deepEqual(NOTICE_KINDS.map(([id]) => id), ['power', 'water', 'lost', 'roads'])
  assert.ok(NOTICE.lifeMs.power < NOTICE.lifeMs.water && NOTICE.lifeMs.water < NOTICE.lifeMs.roads && NOTICE.lifeMs.roads < NOTICE.lifeMs.lost)
  assert.equal(isNoticeKind('power'), true); assert.equal(isNoticeKind('gossip'), false); assert.equal(noticeKindLabel('nope'), 'Notice')
  assert.equal(cleanNotice('  No \n light\t\there  '), 'No light here')
  assert.equal(cleanNotice('x'.repeat(500)).length, NOTICE.max)
  assert.equal(cleanNotice(42), '')
})

test('notices: they end with time, or when three more people say "not true" than "still true"', () => {
  const n = { at: 0, until: 6 * H, kind: 'power' as const, up: 0, down: 0 }
  assert.equal(noticeEnded(n, 5 * H), null)
  assert.equal(noticeEnded(n, 6 * H), 'time')
  assert.equal(noticeEnded({ ...n, down: 2 }, 1), null)
  assert.equal(noticeEnded({ ...n, down: 3 }, 1), 'votes')
  assert.equal(noticeEnded({ ...n, up: 4, down: 6 }, 1), null, 'a yes cancels a no')
  assert.equal(noticeEnded({ ...n, up: 4, down: 7 }, 1), 'votes')
})

test('notices: a "still true" pushes the end out by half a life, never shorter, and never past three lives', () => {
  const n = { at: 0, until: 6 * H, kind: 'power' as const }
  assert.equal(extendedUntil(n, 1 * H), 6 * H, 'early on, the end is where it was')
  assert.equal(extendedUntil(n, 5 * H), 8 * H)
  assert.equal(extendedUntil({ ...n, until: 17 * H }, 16 * H), 18 * H, 'three lives from the start is the cap')
  assert.equal(extendedUntil({ ...n, until: 18 * H }, 17 * H), 18 * H)
})

test('notices: how long is left, in words', () => {
  assert.equal(leftText(10 * 60000, 0), '10 min left')
  assert.equal(leftText(5 * H, 0), '5 h left')
  assert.equal(leftText(72 * H, 0), '3 days left')
  assert.equal(leftText(0, 5), '0 min left')
})
