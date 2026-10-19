// Sharing a capture: the corner mark's words and place, the 9:16 crop, the video type, and the link and text that leave the phone.
import assert from 'node:assert/strict'
import { test } from 'node:test'
import { sourceQuery } from '../../../game/share-model.ts'
import { CLIP_MAX_EDGE, MOMENT_MS, baseVideoType, clipLink, clipText, frameFor, liveMoment, markHandle, markLayout, markText, pickVideoType, profilePath, shareFileName, videoExtension } from './captureShareModel.ts'

test('the mark says the handle and the site, or the site alone', () => {
  assert.equal(markText('ada'), '@ada · joinallworld.com')
  assert.equal(markText('@Ada.Obi'), '@ada.obi · joinallworld.com')
  assert.equal(markText(undefined), 'joinallworld.com')
  assert.equal(markText('x'), 'joinallworld.com', 'a handle is three letters at least')
  assert.equal(markText('ada<script>'), 'joinallworld.com', 'anything that is not a handle is left out')
  assert.equal(markHandle('1ada'), null)
})

const wide = (size: number): number => size * 0.55 * 24

test('the mark sits inside the lower right corner and scales with the picture', () => {
  const full = markLayout(1920, 1080, wide)
  assert.equal(full.fontSize, 37)
  assert.ok(full.box.x + full.box.w <= 1920 && full.box.y + full.box.h <= 1080 && full.box.x >= 0 && full.box.y >= 0)
  assert.ok(full.box.x > 1920 / 2 && full.box.y > 1080 / 2, 'lower right')
  assert.equal(full.box.x + full.box.w, 1920 - 32, 'the margin is 3% of the short side')
  const small = markLayout(640, 360, wide)
  assert.ok(small.fontSize < full.fontSize && small.fontSize >= 12)
  const tiny = markLayout(100, 100, wide)
  assert.ok(tiny.box.x >= 0 && tiny.box.x + tiny.box.w <= 100, 'a very small frame still holds it')
})

test('the mark shrinks to stay under 78% of a narrow frame', () => {
  const layout = markLayout(360, 640, wide)
  assert.ok(layout.box.w <= 360 * 0.78 + 1, `box ${layout.box.w}`)
  assert.ok(layout.textX >= layout.box.x && layout.textX + wide(layout.fontSize) <= layout.box.x + layout.box.w + 1)
})

test('in a story the mark is lifted clear of the bottom strip', () => {
  const plain = markLayout(1080, 1920, wide), story = markLayout(1080, 1920, wide, true)
  assert.equal(plain.box.x, story.box.x)
  assert.equal(plain.box.y - story.box.y, Math.round(1920 * 0.14))
})

test('the 9:16 crop keeps the middle of a wide scene and of a tall one', () => {
  const wideFrame = frameFor(1920, 1080, true, 4000)
  assert.deepEqual([wideFrame.sx, wideFrame.sy, wideFrame.sw, wideFrame.sh], [656, 0, 607, 1080])
  assert.equal(wideFrame.w % 2, 0); assert.equal(wideFrame.h % 2, 0)
  const tall = frameFor(1000, 3000, true, 4000)
  assert.equal(tall.sw, 1000); assert.equal(tall.sh, 1777); assert.equal(tall.sy, Math.floor((3000 - 1777) / 2))
  const exact = frameFor(1080, 1920, true, 4000)
  assert.deepEqual([exact.sx, exact.sy, exact.sw, exact.sh], [0, 0, 1080, 1920])
})

test('without the crop the whole picture is kept, and no edge passes the limit', () => {
  const whole = frameFor(1920, 1080, false, 4000)
  assert.deepEqual([whole.sx, whole.sy, whole.sw, whole.sh, whole.w, whole.h], [0, 0, 1920, 1080, 1920, 1080])
  const clip = frameFor(3840, 2160, false, CLIP_MAX_EDGE)
  assert.equal(clip.w, 1280); assert.equal(clip.h, 720)
  const story = frameFor(3840, 2160, true, CLIP_MAX_EDGE)
  assert.ok(Math.max(story.w, story.h) <= CLIP_MAX_EDGE)
  assert.ok(Math.abs(story.w / story.h - 9 / 16) < 0.01)
})

test('MP4 is chosen where the browser records it, WebM otherwise, and none when neither', () => {
  assert.deepEqual(pickVideoType((type) => type.startsWith('video/')), { mimeType: 'video/mp4;codecs=avc1.42E01E', type: 'video/mp4', ext: 'mp4' })
  assert.deepEqual(pickVideoType((type) => type === 'video/mp4'), { mimeType: 'video/mp4', type: 'video/mp4', ext: 'mp4' })
  assert.deepEqual(pickVideoType((type) => type.startsWith('video/webm')), { mimeType: 'video/webm;codecs=vp9', type: 'video/webm', ext: 'webm' })
  assert.equal(pickVideoType(() => false), null)
})

test('a recorder type becomes a plain file type and a name', () => {
  assert.equal(baseVideoType('video/webm;codecs=vp9'), 'video/webm')
  assert.equal(baseVideoType('video/mp4; codecs=avc1'), 'video/mp4')
  assert.equal(baseVideoType('', 'video/mp4'), 'video/mp4')
  assert.equal(baseVideoType(undefined), 'video/webm')
  assert.equal(videoExtension('video/mp4;codecs=avc1.42E01E'), 'mp4')
  assert.equal(shareFileName('video', 'video/webm'), 'allworld-scene.webm')
  assert.equal(shareFileName('video', 'video/mp4'), 'allworld-scene.mp4')
  assert.equal(shareFileName('photo', 'image/jpeg'), 'allworld-scene.jpg')
})

test('the link is the player\'s profile with the clip words; without a handle the public id, then the front door', () => {
  assert.equal(profilePath('ada', 'p-1'), '/p/@ada')
  assert.equal(profilePath(undefined, 'p-1'), '/p/p-1')
  assert.equal(profilePath(undefined, 'a b/../'), '')
  assert.equal(clipLink('https://joinallworld.com', 'ada', 'p-1'), 'https://joinallworld.com/p/@ada?utm_source=clip&utm_medium=share&utm_campaign=clip')
  assert.equal(clipLink('https://joinallworld.com/', null, 'p-1'), 'https://joinallworld.com/p/p-1?utm_source=clip&utm_medium=share&utm_campaign=clip')
  assert.equal(clipLink('https://joinallworld.com', null, null), 'https://joinallworld.com/?utm_source=clip&utm_medium=share&utm_campaign=clip')
  // The profile page keeps those words on its way into the game, cleaned the same way the metrics clean them.
  const query = new URL(clipLink('https://joinallworld.com', 'ada', null)).searchParams
  assert.equal(sourceQuery(query), 'utm_source=clip&utm_medium=share&utm_campaign=clip')
})

test('the share text ends with the link and names the handle only when there is one', () => {
  const link = clipLink('https://joinallworld.com', 'ada', null)
  const clip = clipText('ada', link, 'video').split('\n')
  assert.equal(clip.at(-1), link)
  assert.ok(clip.some((line) => line.includes('@ada')))
  assert.match(clipText('ada', link, 'photo'), /look at my world/i)
  const anon = clipText(null, clipLink('https://joinallworld.com', null, null), 'photo')
  assert.doesNotMatch(anon, /@/)
})

test('Clip this moment is offered for a live party, else the first live event', () => {
  const now = 1_000_000
  assert.equal(MOMENT_MS, 6000)
  assert.equal(liveMoment({ party: null, events: [], now }), null)
  assert.deepEqual(liveMoment({ party: { title: 'Ada\'s owambe', until: now + 5000 }, events: [], now }), { key: `party:${now + 5000}`, label: 'Ada\'s owambe' })
  assert.equal(liveMoment({ party: { title: 'Over', until: now - 1 }, events: [], now }), null, 'a party that ended is not offered')
  const events = [{ key: 'a', title: 'Soon', live: false, end: now + 9000 }, { key: 'b', title: 'Jollof cup', live: true, end: now + 9000 }, { key: 'c', title: 'Old', live: true, end: now - 5 }]
  assert.deepEqual(liveMoment({ party: null, events, now }), { key: `event:b:${now + 9000}`, label: 'Jollof cup' })
})
