import assert from 'node:assert/strict'
import { test } from 'node:test'
import { COPY_LABEL, NO_SCENE_HELP, NO_SCENE_PROXY, NO_SCENE_TITLE, copyGameLink, sceneHelp, sceneSupport } from './sceneSupport.ts'

const canvas = (kinds: Record<string, unknown>) => () => ({ getContext: (kind: string) => (kinds[kind] ?? null) as never })
const CHROME = 'Mozilla/5.0 (Linux; Android 13; TECNO) AppleWebKit/537.36 Chrome/118 Mobile Safari/537.36'

test('a browser that gives a WebGL context can show the scene, and the probe context is handed back', () => {
  let lost = 0
  const gl = { getExtension: (name: string) => (name === 'WEBGL_lose_context' ? { loseContext: () => { lost += 1 } } : null) }
  assert.deepEqual(sceneSupport(CHROME, canvas({ webgl2: gl })), { ok: true })
  assert.equal(lost, 1)
  assert.deepEqual(sceneSupport(CHROME, canvas({ webgl: {} })), { ok: true }, 'WebGL 1 is enough to try; a probe with no extension is fine')
})

test('no context, a throwing probe, or no canvas at all: no WebGL', () => {
  assert.deepEqual(sceneSupport(CHROME, canvas({})), { ok: false, reason: 'no-webgl' })
  assert.deepEqual(sceneSupport(CHROME, () => { throw new Error('blocked') }), { ok: false, reason: 'no-webgl' })
  assert.deepEqual(sceneSupport(CHROME, () => null), { ok: false, reason: 'no-webgl' })
})

test('Opera Mini is refused before anything is probed', () => {
  let probed = false
  const result = sceneSupport('Opera/9.80 (Android; Opera Mini/36.2.2254/119.132; U; en) Presto/2.12.423 Version/12.16', () => { probed = true; return null })
  assert.deepEqual(result, { ok: false, reason: 'proxy' })
  assert.equal(probed, false)
})

test('the words say what happened, what to do, and what still works', () => {
  assert.match(NO_SCENE_HELP, /Open Allworld in Chrome or your phone's own browser/)
  assert.match(NO_SCENE_HELP, /Everything else works here/)
  assert.match(NO_SCENE_PROXY, /Open Allworld in Chrome or your phone's own browser/)
  assert.match(NO_SCENE_PROXY, /extreme mode/)
  assert.deepEqual(sceneHelp('no-webgl'), { title: NO_SCENE_TITLE, help: NO_SCENE_HELP })
  assert.deepEqual(sceneHelp('failed'), { title: NO_SCENE_TITLE, help: NO_SCENE_HELP })
  assert.equal(sceneHelp('proxy').help, NO_SCENE_PROXY)
  assert.equal(COPY_LABEL, 'Copy link')
  for (const sentence of [NO_SCENE_TITLE, NO_SCENE_HELP, NO_SCENE_PROXY]) assert.ok(!/error|fail|crash|invalid/i.test(sentence), 'no blame, no jargon')
})

test('copying the link says whether it worked', async () => {
  let kept = ''
  assert.equal(await copyGameLink('https://joinallworld.com/', { writeText: async (text) => { kept = text } }), true)
  assert.equal(kept, 'https://joinallworld.com/')
  assert.equal(await copyGameLink('x', { writeText: async () => { throw new Error('denied') } }), false)
  assert.equal(await copyGameLink('x', undefined), false)
  assert.equal(await copyGameLink('x', {}), false)
})
