// The scam warning's client side (docs/WOW-PLAN.md Phase 0): the banner's words, the one-tap Report, and that a feed reply the server flagged shows it
// (a reply of your own never does). The messages thread and the room chat have their tests beside their components.
import assert from 'node:assert/strict'
import { after, before, test } from 'node:test'
import { fileURLToPath } from 'node:url'
import { createServer } from 'vite'
import type { ViteDevServer } from 'vite'
import { createSSRApp, h } from 'vue'
import type { Component } from 'vue'
import { renderToString } from 'vue/server-renderer'
import { SCAM_MONEY_PAGE, SCAM_NOTICE, SCAM_REPORT_REASON, scamReportText } from './scamNotice.ts'
import type { PostView } from '../../../types/feed.ts'

const root = fileURLToPath(new URL('../../../..', import.meta.url))
let vite: ViteDevServer
before(async () => { vite = await createServer({ root, configFile: `${root}vite.config.ts`, logLevel: 'error', appType: 'custom', server: { middlewareMode: true, hmr: false, ws: false, watch: null }, optimizeDeps: { noDiscovery: true, include: [] } }) })
after(async () => { await vite?.close() })
async function render(path: string, props: Record<string, unknown>): Promise<string> {
  const component = ((await vite.ssrLoadModule(path)) as { default: Component }).default
  return (await renderToString(createSSRApp({ render: () => h(component, props) }))).replace(/<!--.*?-->/g, '').replace(/ data-v-[0-9a-f]+/g, '')
}
const post = (thread: PostView['thread']): PostView => ({ id: 'p1', by: { id: 'ada', name: 'Ada' }, at: 1, kind: 'text', body: 'Owambe on Saturday', place: null, vis: 'public', reactions: [], replies: thread.length, thread, canReply: false })

test('the words: one calm sentence, the money page, the scam reason, and a report note cut to the limit', () => {
  assert.equal(SCAM_NOTICE, 'Game naira is never real money. Nobody can withdraw it for you.')
  assert.equal(SCAM_MONEY_PAGE, '/money')
  assert.equal(SCAM_REPORT_REASON, 'scam')
  assert.equal(scamReportText('  send me 5k  '), 'send me 5k')
  assert.equal(scamReportText('x'.repeat(500)).length, 300)
  assert.equal(scamReportText('x'.repeat(500), 120).length, 120)
})

test('the banner states the fact, links to /money and offers one Report button', async () => {
  const html = await render('/src/app/features/trust/ScamNotice.vue', {})
  assert.match(html, /role="note"/)
  assert.ok(html.includes(SCAM_NOTICE))
  assert.match(html, /<a href="\/money" target="_blank" rel="noopener">What is real money\?<\/a>/)
  assert.equal((html.match(/<button/g) ?? []).length, 1)
  assert.match(html, /<button type="button" class="scam-report"[^>]*>Report<\/button>/)
})

test('a feed reply flagged by the server shows the banner; your own reply and an ordinary reply do not', async () => {
  const html = await render('/src/app/features/feed/PostCard.vue', {
    post: post([
      { n: 1, by: { id: 'bola', name: 'Bola' }, at: 1, body: 'send me 5k make I help you withdraw', scam: true },
      { n: 2, by: { id: 'chi', name: 'Chi' }, at: 1, body: 'See you there' },
      { n: 3, by: { id: 'dayo', name: 'Dayo' }, at: 1, body: 'send me 5k', mine: true, scam: true },
    ]),
    api: {}, now: 2,
  })
  assert.equal((html.match(/data-scam-notice/g) ?? []).length, 1)
  assert.ok(html.indexOf('data-scam-notice') > html.indexOf('send me 5k make I help you withdraw') && html.indexOf('data-scam-notice') < html.indexOf('See you there'), 'the banner sits under the flagged reply')
})
