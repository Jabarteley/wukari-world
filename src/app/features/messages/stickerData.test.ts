// The sticker pack: small, plain, unique, and always a message that fits any chat.
import assert from 'node:assert/strict'
import test from 'node:test'
import { STICKER_MAX, STICKER_SETS } from './stickerData.ts'
import { messageLength } from './messagesText.ts'

const all = STICKER_SETS.flatMap((set) => set.stickers)
test('three sets with a handful of stickers each, none repeated', () => {
  assert.deepEqual(STICKER_SETS.map((set) => set.id), ['pidgin', 'owambe', 'games'])
  assert.ok(STICKER_SETS.every((set) => set.stickers.length >= 8))
  assert.equal(new Set(all).size, all.length)
})
test('every sticker is short text with an emoji, and costs next to nothing', () => {
  for (const sticker of all) {
    assert.ok(messageLength(sticker) <= STICKER_MAX, sticker)
    assert.match(sticker, /\p{Extended_Pictographic}/u, sticker)
    assert.equal(sticker, sticker.trim())
  }
  assert.ok(new TextEncoder().encode(JSON.stringify(STICKER_SETS)).length < 3000, 'the whole pack is a few KB at most')
})
