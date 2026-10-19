import test from 'node:test'
import assert from 'node:assert/strict'
import { cardLine, emptyForm, formOf, groundChoices, groundForTemplate, groundTint, likeLabel, makeWhy, openChoices, sizeChoices, skyChoices, templateChoices, worldUrl } from './worldsModel.ts'

const card = (over: Record<string, unknown> = {}) => ({ id: 'wabc123def456', name: 'Park', blurb: '', by: { id: 'u', name: 'Ada' }, size: 'big', ground: 'sand', open: 'everyone', sky: 'day', visits: 0, here: 0, cover: null, at: 1, updated: 1, mine: false, likes: 0, liked: false, builder: false, ...over })

test('the card line says whose a world is, who may come and how it is doing', () => {
  assert.equal(cardLine(card()), 'By Ada · big')
  assert.equal(cardLine(card({ here: 2, visits: 9 })), 'By Ada · 2 here now')
  assert.equal(cardLine(card({ visits: 1, mine: true, open: 'link' })), 'Yours · by link · 1 visit')
  assert.equal(cardLine(card({ mine: true, open: 'friends', size: 'nope' })), 'Yours · friends only')
  assert.equal(cardLine(card({ builder: true })), 'You build with Ada · big')
  assert.equal(likeLabel({ likes: 1200, liked: true }), '♥ 1,200')
  assert.equal(likeLabel({ likes: 0, liked: false }), '♡ 0')
})

test('the form, its choices and why making is off', () => {
  assert.deepEqual(emptyForm(), { name: '', blurb: '', size: 'small', ground: 'grass', open: 'link', sky: 'day', template: 'empty', game: '' })
  assert.deepEqual(formOf(card({ size: 'huge', ground: 'lava', open: 'link', sky: 'sunset', game: { id: 'g1', title: 'Snake' } })), { name: 'Park', blurb: '', size: 'huge', ground: 'grass', open: 'link', sky: 'sunset', template: 'empty', game: 'g1' })
  assert.deepEqual(sizeChoices().map((c) => c.id), ['small', 'big', 'huge'])
  assert.deepEqual(openChoices().map((c) => c.id), ['everyone', 'friends', 'link'])
  assert.deepEqual(groundChoices().map((c) => c.id), ['grass', 'sand', 'stone', 'snow', 'island'], 'the old night ground is not offered')
  assert.deepEqual(skyChoices().map((c) => c.id), ['day', 'sunset', 'night'])
  assert.deepEqual(templateChoices().map((c) => c.id), ['empty', 'hangout', 'treasure', 'race', 'obby', 'island'])
  assert.equal(groundForTemplate('island', 'grass'), 'island')
  assert.equal(groundForTemplate('race', 'snow'), 'snow')
  assert.equal(makeWhy(false, true, 0, 12), 'Making a world needs the server.')
  assert.equal(makeWhy(true, false, 0, 12), 'Worlds are not switched on here yet.')
  assert.match(makeWhy(true, true, 12, 12) ?? '', /12 worlds/)
  assert.equal(makeWhy(true, true, 3, 12), null)
  assert.equal(groundTint('snow'), '#e6edf3')
  assert.equal(groundTint('lava'), groundTint('grass'))
  assert.equal(worldUrl('https://joinallworld.com', 'wabc123def456'), 'https://joinallworld.com/w/wabc123def456')
})
