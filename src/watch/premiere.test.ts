// OWNER: watch - artist premieres: the application (a YouTube track, never an upload), when one may apply again, the premiere's fields, the front row, the words.
import test from 'node:test'
import assert from 'node:assert/strict'
import { PREMIERE, cleanApplication, cleanPremiere, clipWords, frontRow, mayApply, premiereGist, premierePhase } from './premiere.ts'

const NOW = Date.UTC(2026, 9, 19, 12)

test('an application: a plain name, a few https links, and a YouTube track', () => {
  const ok = cleanApplication({ name: '  Ada   Sings ', about: 'Afrobeats from Yaba.', links: ['https://instagram.com/adasings', 'https://instagram.com/adasings'], track: 'https://youtu.be/dQw4w9WgXcQ' })
  assert.ok(ok.ok)
  assert.deepEqual(ok.ok && ok.value, { name: 'Ada Sings', about: 'Afrobeats from Yaba.', links: ['https://instagram.com/adasings'], track: 'dQw4w9WgXcQ' })
  assert.equal(cleanApplication({ name: 'A', track: 'dQw4w9WgXcQ' }).ok, false)
  assert.equal(cleanApplication({ name: 'www.adasings.com', track: 'dQw4w9WgXcQ' }).ok, false, 'a name is not a link')
  assert.equal(cleanApplication({ name: 'Ada', track: 'https://soundcloud.com/x/y' }).ok, false, 'only YouTube: nothing is uploaded')
  assert.equal(cleanApplication({ name: 'Ada', track: 'dQw4w9WgXcQ', links: ['http://insecure.example'] }).ok, false)
  assert.equal(cleanApplication({ name: 'Ada', track: 'dQw4w9WgXcQ', links: ['https://a.b', 'https://c.d', 'https://e.f', 'https://g.h'] }).ok, false)
})

test('who may apply: a new or pending applicant; a declined one after a week; not an approved artist', () => {
  assert.equal(mayApply(undefined, NOW).ok, true)
  const base = { name: 'Ada', about: '', links: [], track: 'dQw4w9WgXcQ', at: NOW - 1000 }
  assert.equal(mayApply({ ...base, status: 'pending' }, NOW).ok, true)
  assert.equal(mayApply({ ...base, status: 'approved' }, NOW).ok, false)
  assert.equal(mayApply({ ...base, status: 'declined', decidedAt: NOW - 1000 }, NOW).ok, false)
  assert.equal(mayApply({ ...base, status: 'declined', decidedAt: NOW - PREMIERE.reapplyMs }, NOW).ok, true)
})

test('a premiere is one of the artist’s Plans events, and optionally one of their worlds', () => {
  assert.deepEqual(cleanPremiere({ event: 'e12ab3' }), { ok: true, event: 'e12ab3' })
  assert.deepEqual(cleanPremiere({ event: 'e12ab3', world: 'wabcdefghijkl' }), { ok: true, event: 'e12ab3', world: 'wabcdefghijkl' })
  assert.equal(cleanPremiere({ event: 'x' }).ok, false)
  assert.equal(cleanPremiere({ event: 'e1', world: 'not-a-world' }).ok, false)
  assert.equal(premierePhase({ start: NOW + 1, end: NOW + 2 }, NOW), 'upcoming')
  assert.equal(premierePhase({ start: NOW, end: NOW + 2 }, NOW), 'live')
  assert.equal(premierePhase({ start: NOW - 2, end: NOW }, NOW), 'over')
})

test('the front row: ticket holders of a priced premiere (in order), else who said they are going; never the artist; twelve at most', () => {
  const going = ['artist', 'a', 'b', 'c']
  assert.deepEqual(frontRow('artist', going, null), ['a', 'b', 'c'])
  assert.deepEqual(frontRow('artist', going, ['c', 'a']), ['c', 'a'], 'a priced premiere: the tickets, not the going list')
  assert.equal(frontRow('artist', Array.from({ length: 30 }, (_, i) => `p${i}`), null).length, PREMIERE.frontRow)
})

test('the words', () => {
  const line = premiereGist('Ada Sings', 'Lagos Love', 'on Saturday at 20:00')
  assert.equal(line, 'New music: Ada Sings premieres "Lagos Love" on Saturday at 20:00. Come and listen together.')
  assert.ok(line.length <= 120)
  assert.match(clipWords('Ada Sings', 'Lagos Love', true), /^Front row at Ada Sings's premiere/)
})
