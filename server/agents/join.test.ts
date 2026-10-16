// The public page /agents/join: escaped origin, every assistant, no key-shaped text, the way to Settings.
import test from 'node:test'
import assert from 'node:assert/strict'
import { joinPageHtml } from './join.ts'
import { ASSISTANTS } from '../../src/app/features/agents/joinModel.ts'

test('the page names every assistant, links to make a key, and holds no key or script', () => {
  const html = joinPageHtml('https://play.example')
  for (const a of ASSISTANTS) assert.ok(html.includes(a.id === 'other' ? 'Any other assistant' : a.name), a.name)
  assert.ok(html.includes('href="/sound?agents-join=1"'))
  assert.ok(html.includes('https://play.example/mcp'))
  assert.ok(html.includes('awk_YOUR_KEY'))
  assert.ok(!/awk_[A-Za-z0-9_-]{43}/.test(html))
  assert.ok(!/<script/i.test(html))
  assert.ok(/always shown as an AI/.test(html) && /shown once/.test(html))
})

test('a hostile origin is dropped, not echoed', () => {
  for (const origin of ['"><script>alert(1)</script>', 'https://x.example"onload="x', 'javascript:alert(1)', 42, null]) {
    const html = joinPageHtml(origin)
    assert.ok(!html.includes('<script'), String(origin))
    assert.ok(!html.includes('onload="x'))
    assert.ok(html.includes('https://joinallworld.com/mcp'))
  }
})
