import test from 'node:test'
import assert from 'node:assert/strict'
import { cleanScreen, embedUrl, screenPosition, youtubeId } from './screen.ts'
import { propOf, propModel, PROPS, propView } from './props.ts'

test('a YouTube or YouTube Music link gives its video id, and nothing else does', () => {
  for (const link of ['https://www.youtube.com/watch?v=dQw4w9WgXcQ', 'youtube.com/watch?v=dQw4w9WgXcQ&t=30', 'https://youtu.be/dQw4w9WgXcQ?si=x', 'https://m.youtube.com/shorts/dQw4w9WgXcQ',
    'https://music.youtube.com/watch?v=dQw4w9WgXcQ&list=RD', 'https://www.youtube.com/live/dQw4w9WgXcQ', 'dQw4w9WgXcQ']) assert.equal(youtubeId(link), 'dQw4w9WgXcQ', link)
  for (const bad of ['', 'https://vimeo.com/123', 'https://evil.com/watch?v=dQw4w9WgXcQ', 'https://youtube.com/watch?v=short', 'javascript:alert(1)', 42]) assert.equal(youtubeId(bad), null, String(bad))
})

test('the screen follows the host: where it is now, frames checked, the embed address', () => {
  assert.equal(screenPosition({ v: 'dQw4w9WgXcQ', play: true, pos: 10, at: 1000 }, 31_000), 40)
  assert.equal(screenPosition({ v: 'dQw4w9WgXcQ', play: false, pos: 10, at: 1000 }, 31_000), 10)
  assert.deepEqual(cleanScreen({ v: 'dQw4w9WgXcQ', play: true, pos: 12.345 }), { v: 'dQw4w9WgXcQ', play: true, pos: 12.3 })
  assert.equal(cleanScreen({ v: 'nope', play: true, pos: 1 }), null)
  assert.equal(cleanScreen({ v: 'dQw4w9WgXcQ', play: 'yes', pos: 1 }), null)
  assert.equal(cleanScreen({ v: 'dQw4w9WgXcQ', play: true, pos: -1 }), null)
  assert.match(embedUrl('dQw4w9WgXcQ', 41.9, 'https://joinallworld.com'), /^https:\/\/www\.youtube-nocookie\.com\/embed\/dQw4w9WgXcQ\?enablejsapi=1&autoplay=1&playsinline=1&rel=0&start=41&origin=https%3A%2F%2Fjoinallworld\.com$/)
})

test('built-in shapes: ids, views and the placement id', () => {
  assert.equal(propOf(propModel('coin')), 'coin')
  assert.equal(propOf('p-dragon'), null)
  assert.equal(propOf('mabcdefghi'), null)
  for (const id of Object.keys(PROPS) as (keyof typeof PROPS)[]) { const v = propView(id); assert.ok(v.triangles > 0 && v.size.every((n) => n > 0) && v.hash === '', id) }
})
