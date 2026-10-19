import assert from 'node:assert/strict'
import { createHash } from 'node:crypto'
import test from 'node:test'
import { hostTalkAssets } from './talk-assets.ts'

const bytes = new TextEncoder().encode('{"ok":true}')
const digest = createHash('sha256').update(bytes).digest('hex')
const cityPath = `/assets/talk-banks/kano-${digest}.json`

test('portable adapter reads only the index and exact city hash paths through the supplied host', async () => {
  const seen: string[] = []
  const read = hostTalkAssets(async path => {
    seen.push(path)
    return new Response(bytes, { status: 200, headers: { 'content-length': String(bytes.byteLength) } })
  })
  assert.deepEqual(await read('/assets/talk-banks/index.json', 100), bytes)
  assert.deepEqual(await read(cityPath, 100), bytes)
  assert.deepEqual(seen, ['/assets/talk-banks/index.json', cityPath])
})

test('portable adapter rejects path collisions, escapes, queries, encoded separators, and invalid caps before fetch', async () => {
  let calls = 0
  const read = hostTalkAssets(async () => { calls++; return new Response(bytes) })
  for (const path of [
    '/assets/talk-banks/index.jsonx', '/assets/talk-banks/index.json?x=1', '/assets/talk-banks/../index.json',
    '/assets/talk-banks/%2findex.json', `/assets/talk-banks/Kano-${digest}.json`, `${cityPath}/extra`, 'https://example.test/assets/talk-banks/index.json',
  ]) await assert.rejects(read(path, 100), /Talk asset read failed/)
  for (const cap of [0, -1, 1.5, 5_000_001, Number.NaN]) await assert.rejects(read('/assets/talk-banks/index.json', cap), /Talk asset read failed/)
  assert.equal(calls, 0)
})

test('portable adapter enforces declared and streamed byte limits and cancels unfinished bodies', async () => {
  let cancelled = 0
  const oversized = new ReadableStream<Uint8Array>({
    start(controller) { controller.enqueue(Uint8Array.of(1, 2, 3)); controller.enqueue(Uint8Array.of(4, 5, 6)) },
    cancel() { cancelled++ },
  })
  const streamRead = hostTalkAssets(async () => new Response(oversized))
  await assert.rejects(streamRead('/assets/talk-banks/index.json', 5), /Talk asset read failed/)
  assert.equal(cancelled, 1)

  const declaredRead = hostTalkAssets(async () => new Response(bytes, { headers: { 'content-length': String(bytes.byteLength + 1) } }))
  await assert.rejects(declaredRead('/assets/talk-banks/index.json', 100), /Talk asset read failed/)
  const declaredOversize = hostTalkAssets(async () => new Response(bytes, { headers: { 'content-length': '101' } }))
  await assert.rejects(declaredOversize('/assets/talk-banks/index.json', 100), /Talk asset read failed/)
})

test('portable adapter turns host and HTTP failures into path-free internal failures', async () => {
  for (const read of [
    hostTalkAssets(async () => new Response('private upstream detail', { status: 404 })),
    hostTalkAssets(async () => { throw new Error('https://secret.example/token') }),
  ]) {
    await assert.rejects(read('/assets/talk-banks/index.json', 100), error => {
      assert.equal((error as Error).message, 'Talk asset read failed')
      return true
    })
  }
})
