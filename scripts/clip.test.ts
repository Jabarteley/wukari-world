// The clip renderer's pure parts: its arguments, the frames it captures, and the FFmpeg commands (scripts/clip.ts).
import test from 'node:test'
import assert from 'node:assert/strict'
import { WHATSAPP_BYTES, bigArgs, captureFrames, fitKbps, pageUrl, parseArgs, smallArgs } from './clip.ts'

test('arguments: a replay id or a log file, an origin, 30 or 60 frames a second', () => {
  const o = parseArgs(['--replay', 'r-abcdefghjk'])
  assert.ok(typeof o !== 'string')
  assert.equal(o.origin, 'https://joinallworld.com'); assert.equal(o.fps, 30); assert.equal(o.page, '/replay'); assert.equal(o.name, 'r-abcdefghjk')
  assert.equal(pageUrl(o), 'https://joinallworld.com/replay?replay=r-abcdefghjk&aspect=9x16&w=1080&frame=0')
  const local = parseArgs(['--log', 'm.json', '--origin', 'http://127.0.0.1:5173/', '--page', '/replay.html', '--fps', '60'])
  assert.ok(typeof local !== 'string')
  assert.equal(pageUrl(local), 'http://127.0.0.1:5173/replay.html?aspect=9x16&w=1080&frame=0')
  for (const bad of [[], ['--replay', 'nope'], ['--replay', 'r-abcdefghjk', '--fps', '24'], ['--log', 'a', '--origin', 'ftp://x']]) assert.equal(typeof parseArgs(bad), 'string', bad.join(' '))
})

test('frames: every virtual frame at 60 fps, every other at 30, exactly the clip window', () => {
  assert.deepEqual(captureFrames({ start: 10, count: 6 }, 60), [10, 11, 12, 13, 14, 15])
  assert.deepEqual(captureFrames({ start: 10, count: 6 }, 30), [10, 12, 14])
  assert.equal(captureFrames({ start: 0, count: 600 }, 30).length, 300)
})

test('FFmpeg: PNGs from stdin to an H.264 MP4 that starts playing at once; the small copy fits a WhatsApp status', () => {
  const big = bigArgs(30, 'out/a.mp4')
  assert.deepEqual(big.slice(big.indexOf('-f'), big.indexOf('-f') + 6), ['-f', 'image2pipe', '-framerate', '30', '-i', '-'])
  for (const want of ['libx264', 'yuv420p', '+faststart']) assert.ok(big.includes(want), want)
  assert.equal(big.at(-1), 'out/a.mp4')
  const kbps = fitKbps(10)
  assert.ok(kbps * 1000 * 10 / 8 < WHATSAPP_BYTES, 'ten seconds at that rate fit in 2 MB')
  assert.ok(kbps > 1000, 'and it is not starved')
  const small = smallArgs('a.mp4', 'b.mp4', kbps)
  assert.ok(small.includes('scale=720:1280:flags=lanczos') && small.includes(`${kbps}k`) && small.at(-1) === 'b.mp4')
  assert.equal(fitKbps(0), fitKbps(1)); assert.ok(fitKbps(1000) >= 200)
})
