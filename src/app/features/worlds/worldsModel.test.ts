import test from 'node:test'
import assert from 'node:assert/strict'
import { cardLine, emptyForm, formOf, groundTint, makeWhy, openChoices, sizeChoices, worldUrl } from './worldsModel.ts'

const card = (over: Record<string, unknown> = {}) => ({ id: 'wabc123def456', name: 'Park', blurb: '', by: { id: 'u', name: 'Ada' }, size: 'big', ground: 'sand', open: 'everyone', visits: 0, here: 0, cover: null, at: 1, updated: 1, mine: false, ...over })

test('the card line says whose a world is and how it is doing', () => {
  assert.equal(cardLine(card()), 'By Ada · big')
  assert.equal(cardLine(card({ here: 2, visits: 9 })), 'By Ada · 2 here now')
  assert.equal(cardLine(card({ visits: 1, mine: true, open: 'link' })), 'Yours · by link · 1 visit')
  assert.equal(cardLine(card({ mine: true, size: 'nope' })), 'Yours · open to everyone')
})

test('the form, its choices and why making is off', () => {
  assert.deepEqual(emptyForm(), { name: '', blurb: '', size: 'small', ground: 'grass', open: 'link' })
  assert.deepEqual(formOf(card({ size: 'huge', ground: 'lava', open: 'link' })), { name: 'Park', blurb: '', size: 'huge', ground: 'grass', open: 'link' })
  assert.deepEqual(sizeChoices().map((c) => c.id), ['small', 'big', 'huge'])
  assert.deepEqual(openChoices().map((c) => c.id), ['everyone', 'link'])
  assert.equal(makeWhy(false, true, 0, 12), 'Making a world needs the server.')
  assert.equal(makeWhy(true, false, 0, 12), 'Worlds are not switched on here yet.')
  assert.match(makeWhy(true, true, 12, 12) ?? '', /12 worlds/)
  assert.equal(makeWhy(true, true, 3, 12), null)
  assert.equal(groundTint('snow'), '#e6edf3')
  assert.equal(groundTint('lava'), groundTint('grass'))
  assert.equal(worldUrl('https://joinallworld.com', 'wabc123def456'), 'https://joinallworld.com/w/wabc123def456')
})
