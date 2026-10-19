// The social glue's pure rules (docs/SOCIAL-GLUE.md): who may be told where a close friend is, the words of a place, the talk window,
// the names screen of the gist board, a trip's readiness and card, and who may marry whom.
import test from 'node:test'
import assert from 'node:assert/strict'
import { GLUE, boardKeyOf, ceremonyLine, cleanGist, closeLine, isRing, mayShare, namesPerson, proposalRefusal, talkPhase, talkStartRefusal, tripCardLine, tripReady } from './model.ts'

test('close friends: every condition must hold, each time', () => {
  const ok = { on: true, list: ['ada'], viewer: 'ada', friends: true, blocked: false }
  assert.equal(mayShare(ok), true)
  assert.equal(mayShare({ ...ok, on: false }), false, 'off by default and off at once')
  assert.equal(mayShare({ ...ok, viewer: 'bola' }), false, 'a friend who is not on the list')
  assert.equal(mayShare({ ...ok, friends: false }), false, 'no longer friends')
  assert.equal(mayShare({ ...ok, blocked: true }), false, 'a block, either way')
})

test('close friends: a place in the game, in words', () => {
  assert.equal(closeLine('Tunde', { kind: 'square' }), 'Tunde is in the Square now')
  assert.equal(closeLine('Ada', { kind: 'venue', city: 'lagos', cityName: 'Lagos', venue: 'freedom-park', venueName: 'Freedom Park' }), 'Ada is at Freedom Park, Lagos')
  assert.equal(closeLine('Bola', { kind: 'home', city: 'lagos', cityName: 'Lagos' }), 'Bola is at home in Lagos')
  assert.equal(closeLine('Chidi', { kind: 'city', city: 'abuja', cityName: 'Abuja' }), 'Chidi is in Abuja', 'a visit says only the city')
  assert.equal(closeLine('Dayo', { kind: 'room' }), 'Dayo is in a group room now', 'never which group')
})

test('talks: soon, open 15 minutes before, live once the stage is up, over at the end; a start time not too soon or far', () => {
  const t = { start: 100 * 60000, end: 160 * 60000, stageOpen: false }
  assert.equal(talkPhase(t, 80 * 60000), 'soon')
  assert.equal(talkPhase(t, 86 * 60000), 'open')
  assert.equal(talkPhase({ ...t, stageOpen: true }, 99 * 60000), 'live')
  assert.equal(talkPhase({ ...t, stageOpen: true }, 160 * 60000), 'over')
  assert.match(String(talkStartRefusal(5 * 60000, 0)), /10 minutes/)
  assert.match(String(talkStartRefusal(15 * 86400000, 0)), /two weeks/)
  assert.equal(talkStartRefusal(60 * 60000, 0), null)
  assert.match(String(talkStartRefusal('soon', 0)), /when/)
})

test('gist board: board keys, clean words, and no names of members or @mentions', () => {
  assert.equal(boardKeyOf('campus:unilag'), 'campus:unilag')
  assert.equal(boardKeyOf('crew:c12ab'), 'crew:c12ab')
  assert.equal(boardKeyOf('crew:../x'), null)
  assert.equal(boardKeyOf('campus:oau'), null)
  assert.equal(cleanGist('  two\n\nlines\u0000 '), 'two lines')
  assert.equal(cleanGist('x'.repeat(400)).length, GLUE.board.max)
  const members = [{ name: 'Chidi Okafor' }, { name: 'Jo' }, { name: 'Ngozi', handle: 'ngoz' }, { name: 'Émeka' }]
  assert.equal(namesPerson('Chidi Okafor snores in class', members), true, 'a whole name')
  assert.equal(namesPerson('chidi snores in class', members), true, 'a first name, any case')
  assert.equal(namesPerson('emeka never pays back', members), true, 'accents do not hide a name')
  assert.equal(namesPerson('ngoz is lying', members), true, 'a handle')
  assert.equal(namesPerson('tell @anyone to stop', members), true, 'any @mention')
  assert.equal(namesPerson('Jo is short for nothing', members), false, 'a two-letter name is not screened alone')
  assert.equal(namesPerson('The cafeteria rice is a crime against Chidiebere', members), false, 'a whole word only')
  assert.equal(namesPerson('Who else hates 8am lectures?', members), false)
})

test('group trips: everyone answers and two go; the card', () => {
  assert.equal(tripReady([{ name: 'Ada', answer: 'yes' }, { name: 'Bola', answer: 'waiting' }, { name: 'Chidi', answer: 'waiting' }]), 'Waiting for Bola and Chidi to answer.')
  assert.equal(tripReady([{ name: 'Ada', answer: 'yes' }, { name: 'Bola', answer: 'no' }]), 'A group trip needs at least two people going.')
  assert.equal(tripReady([{ name: 'Ada', answer: 'yes' }, { name: 'Bola', answer: 'yes' }, { name: 'Chidi', answer: 'no' }]), null)
  assert.equal(tripCardLine({ mode: 'flight', fromName: 'Lagos', toName: 'Abuja', count: 4 }), '4 of us flew from Lagos to Abuja, together')
})

test('marriage: two people, both adults, friends, unblocked, free', () => {
  const ok = { self: false, adultA: true, adultB: true, aiA: false, aiB: false, friends: true, blocked: false, takenA: false, takenB: false, nameB: 'Bola' }
  assert.equal(proposalRefusal(ok), null)
  assert.match(String(proposalRefusal({ ...ok, adultB: false })), /18 or older/)
  assert.match(String(proposalRefusal({ ...ok, adultA: false })), /18 or older/)
  assert.match(String(proposalRefusal({ ...ok, aiB: true })), /two people/)
  assert.match(String(proposalRefusal({ ...ok, friends: false })), /friends/)
  assert.match(String(proposalRefusal({ ...ok, blocked: true })), /not accepting/)
  assert.match(String(proposalRefusal({ ...ok, takenB: true })), /already married/)
  assert.match(String(proposalRefusal({ ...ok, self: true })), /yourself/)
  assert.equal(isRing('gold'), true)
  assert.equal(isRing('diamond'), false)
  assert.equal(ceremonyLine('Ada', 'Bola', 'the Square', ['Chidi', 'Dayo']), 'Ada and Bola just got married at the Square with Chidi and Dayo as witnesses. Congratulations!')
})
