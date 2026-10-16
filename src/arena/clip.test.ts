// OWNER: games (real-time) — the words a replay and its clip carry, and the clip format chosen on a phone.
import test from 'node:test'
import assert from 'node:assert/strict'
import { FORBIDDEN_WORDS } from '../game/table-stakes.ts'
import { FOOTER, replayCaption, seatName, versus } from './replay-caption.ts'
import { CLIP_BITS, CLIP_TYPES, clipFileName, pickClipType } from './clip-recorder.ts'
import { replayLink } from './clip-share.ts'
import type { ReplayLog } from './replay.ts'

const result = { text: 'Ada wins by knock-out', winners: [0], draw: false, reason: 'ko', scores: [2, 0] }

test('every seat an agent played carries the AI mark; a house bot is the computer', () => {
  assert.equal(seatName({ name: 'Ada', bot: false }), 'Ada')
  assert.equal(seatName({ name: 'Scout', bot: false, ai: true }), 'Scout · AI')
  assert.equal(seatName({ name: 'Bot 1', bot: true }), 'Computer')
  assert.equal(versus({ seats: [{ name: 'Ada', bot: false }, { name: 'Scout', bot: false, ai: true }] }), 'Ada vs Scout · AI')
  assert.equal(versus({ seats: [{ name: 'A', bot: false }, { name: 'B', bot: false }, { name: 'C', bot: true }] }), 'A, B and Computer')
})

test('the caption names the game from the registry, says the result and the way in, and never a betting word', () => {
  const c = replayCaption({ game: 'fight', seats: [{ name: 'Ada', bot: false }, { name: 'Bola', bot: false }], result } as Pick<ReplayLog, 'game' | 'seats' | 'result'>)
  assert.equal(c.title, 'Fight'); assert.equal(c.result, 'Ada wins by knock-out'); assert.equal(c.footer, FOOTER)
  assert.match(c.footer, /no install|browser/i)
  for (const line of Object.values(c)) assert.doesNotMatch(line, FORBIDDEN_WORDS)
  assert.equal(replayCaption({ game: 'nope', seats: [{ name: 'A', bot: false }], result: { ...result, text: ' ', draw: true } } as Pick<ReplayLog, 'game' | 'seats' | 'result'>).result, 'A draw')
})

test('a phone records MP4 when it can, WebM when not, nothing when it cannot', () => {
  assert.equal(pickClipType(() => true), CLIP_TYPES[0])
  assert.equal(pickClipType((t) => t.startsWith('video/webm')), 'video/webm;codecs=vp9')
  assert.equal(pickClipType(() => false), null)
  assert.equal(pickClipType(() => { throw new Error('no') }), null)
  assert.equal(clipFileName('fight', 'video/mp4;codecs=avc1'), 'allworld-fight.mp4')
  assert.equal(clipFileName('race', 'video/webm'), 'allworld-race.webm')
  assert.ok(CLIP_BITS * 10 / 8 < 2_000_000, 'ten seconds stay under a WhatsApp status')
  assert.equal(replayLink('r-abcdefghjk', 'https://joinallworld.com'), 'https://joinallworld.com/replay?replay=r-abcdefghjk')
})
