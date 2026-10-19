import assert from 'node:assert/strict'
import { test } from 'node:test'
import { characterLink, characterShareText } from './characterCard.ts'

test('the card link carries the character ad-source words and the share text ends with it', () => {
  const link = characterLink()
  assert.equal(link, 'https://joinallworld.com/?utm_source=character&utm_medium=card&utm_campaign=creator')
  const text = characterShareText('Ada')
  assert.ok(text.startsWith('Meet Ada, my character'))
  assert.ok(text.endsWith(`\n${link}`))
})

test('the share text strips control characters and works without a name', () => {
  assert.ok(!/[\u0000-\u001f\u007f]/.test(characterShareText('Ada\u0007\nX').split('\n')[0]!))
  assert.ok(characterShareText('  ').startsWith('My character on Allworld'))
})
