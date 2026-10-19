// OWNER: social — the screens of Phase 5 (docs/NEIGHBOURHOOD.md, docs/PROMOTE.md): the shop-front card, the Noticeboard and Economy apps, and their
// places in the phone. Rendered to a string with Vue's server renderer; what is asserted is what a person reads. What a click does is tested where
// the logic lives (server/neighbourhood.test.ts, src/promote/boards.test.ts).
import assert from 'node:assert/strict'
import { after, before, test } from 'node:test'
import { fileURLToPath } from 'node:url'
import { createServer } from 'vite'
import type { ViteDevServer } from 'vite'
import { createSSRApp, h } from 'vue'
import type { Component } from 'vue'
import { renderToString } from 'vue/server-renderer'
import type { App } from '../../state/app.ts'
import { createFakeServer } from '../../testing/fakeServer.ts'
import type { ListingView } from '../../../types/promote.ts'

const root = fileURLToPath(new URL('../../../..', import.meta.url))
const server = createFakeServer()
let vite: ViteDevServer
let app: App
const realFetch = globalThis.fetch
const load = async <T = { default: Component }>(path: string): Promise<T> => await vite.ssrLoadModule(path) as T
const text = (html: string): string => html.replace(/<!--.*?-->/g, '').replace(/<[^>]+>/g, ' ').replace(/&amp;/g, '&').replace(/&#39;/g, '\'').replace(/\s+/g, ' ').trim()
async function render(path: string, props: Record<string, unknown> = {}): Promise<string> {
  const component = (await load(path)).default
  return renderToString(createSSRApp({ render: () => h(component, props) }))
}
const listing = (more: Partial<ListingView> = {}): ListingView => ({ id: 'Bx1', owner: { id: 'o1', name: 'Basira' }, name: 'Iya Basira Foods', category: 'food', categoryLabel: 'Food and drinks', city: 'lagos', cityName: 'Lagos', area: 'Yaba', about: 'Amala and ewedu, delivery around Yaba', at: 1, status: 'live', boosted: false, mine: false, ...more })

before(async () => {
  globalThis.fetch = server.fetch
  vite = await createServer({ root, configFile: `${root}vite.config.ts`, logLevel: 'error', appType: 'custom', server: { middlewareMode: true, hmr: false, ws: false, watch: null }, optimizeDeps: { noDiscovery: true, include: [] } })
  const cityLoader = await vite.ssrLoadModule('/src/game/cities/registry.ts') as typeof import('../../../game/cities/registry.ts')
  await cityLoader.loadCityContent('lagos')
  app = (await load<{ useApp: () => App }>('/src/app/state/app.ts')).useApp()
  assert.equal(await app.game.connect(), true)
  app.game.stop()
})
after(async () => { app?.game.stop(); await vite?.close(); globalThis.fetch = realFetch })

test('shop front: the name, kind and area, what it offers, a message to the owner, and the shop only when there is one; no outside link', async () => {
  const plain = text(await render('/src/app/features/promote/ShopFront.vue', { listing: listing() }))
  assert.match(plain, /Iya Basira Foods Food and drinks · Yaba/)
  assert.match(plain, /Amala and ewedu, delivery around Yaba/)
  assert.match(plain, /Message Basira/)
  assert.doesNotMatch(plain, /Visit shop|Sponsored/)
  const html = await render('/src/app/features/promote/ShopFront.vue', { listing: listing({ shop: 'k3x9', boosted: true, photo: 'ab12cd' }), opened: true })
  assert.match(text(html), /Sponsored/)
  assert.match(text(html), /Visit shop/)
  assert.match(html, /src="\/api\/feed\/media\/ab12cd"/)
  assert.match(html, /is-opened/)
  assert.doesNotMatch(html, /href=|wa\.me/i, 'a listing carries no outside link and no phone number: the shop holds them')
})

test('noticeboard: both tabs are there, and a person who has not confirmed their area is not shown a board', async () => {
  const html = await render('/src/app/features/neighbourhood/NoticeboardApp.vue')
  const plain = text(html)
  assert.match(plain, /Noticeboard Meet your neighbours/)
  assert.match(html, /data-hood="app"/)
  assert.doesNotMatch(plain, /Post to the board/, 'nothing to post to before the board has said where it is')
})

test('economy: a loading line stands in until the numbers arrive', async () => {
  const plain = text(await render('/src/app/features/neighbourhood/EconomyApp.vue'))
  assert.match(plain, /Loading the numbers/)
})

test('Plans has a Neighbours side that opens the noticeboard, and the Rich List has an Economy tab; the phone gains no app of its own', async () => {
  const plans = text(await render('/src/app/features/feed/PlansApp.vue'))
  assert.match(plans, /Plans Neighbours/)
  assert.match(plans, /Plan a hangout/, 'Plans is still what it opens on')
  const hood = text(await render('/src/app/features/feed/PlansApp.vue', { params: { tab: 'neighbours' } }))
  assert.match(hood, /Noticeboard Meet your neighbours/)
  const rich = text(await render('/src/app/features/civic/RichListApp.vue', { params: { tab: 'economy' } }))
  assert.match(rich, /Players Places Economy/)
  assert.match(rich, /Loading the numbers/)
  assert.doesNotMatch(rich, /Humans Agents/, 'whose rankings means nothing for the economy')
  const { NATIVE_PANELS } = await load<typeof import('../panels.ts')>('/src/app/features/panels.ts')
  assert.ok(!NATIVE_PANELS.some((p) => p.id === 'noticeboard' || p.id === 'economy'), 'no new app in the phone: the first download and the list of apps do not grow')
})
