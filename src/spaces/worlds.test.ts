import test from 'node:test'
import assert from 'node:assert/strict'
import { cleanWorld, isWebp, worldLinkFrom, worldLinkPath, worldLine, worldPlot, WORLDS } from './worlds.ts'

test('a world is checked: name, blurb, size, ground and who may come, with safe fallbacks', () => {
  const made = cleanWorld({ name: '  My   park ', blurb: 'x'.repeat(500), size: 'huge', ground: 'snow', open: 'everyone' })
  assert.equal(made.ok, true)
  if (!made.ok) return
  assert.deepEqual(made.world, { name: 'My park', blurb: 'x'.repeat(WORLDS.blurb), size: 'huge', ground: 'snow', open: 'everyone' })
  assert.equal(cleanWorld({ name: 'A' }).ok, false)
  assert.equal(cleanWorld('nope').ok, false)
  const safe = cleanWorld({ name: 'Yard', size: 'enormous', ground: 'lava', open: 'public' })
  assert.equal(safe.ok && safe.world.size, 'small')
  assert.equal(safe.ok && safe.world.ground, 'grass')
  assert.equal(safe.ok && safe.world.open, 'link')
  const changed = cleanWorld({ open: 'everyone' }, made.world)
  assert.deepEqual(changed.ok && changed.world, { ...made.world, open: 'everyone' })
})

test('a world link is read from its path or its query, and nothing else', () => {
  assert.equal(worldLinkFrom(worldLinkPath('wabc123def456')), 'wabc123def456')
  assert.equal(worldLinkFrom('/w/short'), null)
  assert.equal(worldLinkFrom('/r/abc'), null)
})

test('plots, covers and the line under a name', () => {
  assert.deepEqual(worldPlot('big'), { w: 48, d: 48, floors: 1 })
  assert.equal(isWebp(new Uint8Array([0x52, 0x49, 0x46, 0x46, 1, 2, 3, 4, 0x57, 0x45, 0x42, 0x50, 0])), true)
  assert.equal(isWebp(new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0, 0, 0, 0, 0, 0, 0, 0, 0])), false)
  assert.equal(worldLine({ by: { name: 'Ada' }, here: 3, visits: 10, mine: false, open: 'everyone' }), 'By Ada · 3 here now')
  assert.equal(worldLine({ by: { name: 'Ada' }, here: 0, visits: 1, mine: true, open: 'link' }), 'Yours · by link · 1 visit')
  assert.equal(worldLine({ by: { name: 'Ada' }, here: 0, visits: 0, mine: true, open: 'everyone' }), 'Yours · open to everyone')
})
