import test from 'node:test'
import assert from 'node:assert/strict'
import { LITE_KEY, decideLite } from './lite.ts'
import { LITE_KEY as SWITCH_KEY } from './liteSwitch.ts'

const store = (initial: Record<string, string> = {}) => { const m = new Map(Object.entries(initial)); return { getItem: (k: string) => m.get(k) ?? null, setItem: (k: string, v: string) => { m.set(k, v) }, removeItem: (k: string) => { m.delete(k) }, m } }
const gl = { createElement: () => ({ getContext: () => ({}) }) }
const noGl = { createElement: () => ({ getContext: () => null }) }

test('lite: /app and ?lite=1 are kept, a kept choice holds, no WebGL is Lite, ?lite=0 turns it off', () => {
  assert.equal(decideLite({ location: { pathname: '/', search: '' }, localStorage: store(), document: gl }), null)
  const kept = store()
  assert.equal(decideLite({ location: { pathname: '/app', search: '' }, localStorage: kept, document: gl }), 'chosen')
  assert.equal(kept.m.get(LITE_KEY), '1')
  assert.equal(decideLite({ location: { pathname: '/', search: '' }, localStorage: kept, document: gl }), 'chosen', 'the choice is kept')
  assert.equal(decideLite({ location: { pathname: '/', search: '?lite=0' }, localStorage: kept, document: gl }), null)
  assert.equal(kept.m.has(LITE_KEY), false)
  assert.equal(decideLite({ location: { pathname: '/', search: '?lite=1' }, localStorage: store(), document: gl }), 'chosen')
  assert.equal(decideLite({ location: { pathname: '/', search: '' }, localStorage: store(), document: noGl }), 'no-3d')
  assert.equal(decideLite({ location: { pathname: '/', search: '?lite=0' }, localStorage: store(), document: noGl }), 'no-3d', 'a browser that cannot draw stays Lite')
  assert.equal(decideLite({ location: { pathname: '/', search: '?lite=1' }, localStorage: null, document: gl }), 'chosen', 'no storage: asked still counts')
})

test('lite: the switch uses the same key', () => { assert.equal(SWITCH_KEY, LITE_KEY) })
