// OWNER: social — the screens of the social glue (docs/SOCIAL-GLUE.md): where each part sits (no new phone app; one small lazy HUD line),
// what a person reads before anything has loaded, and the trip card. Rendered to a string with Vue's server renderer; the rules are tested
// in src/glue/model.test.ts and server/glue.test.ts.
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
import type { TripView } from '../../../types/glue.ts'

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

const trip = (more: Partial<TripView> = {}): TripView => ({ id: 'T1', crew: 'c1', crewName: 'Road Trip Crew', mode: 'danfo', city: 'lagos', from: 'park', fromName: 'Ojota Park', to: 'market', toName: 'Balogun Market', by: { id: 'a', name: 'Ada' },
  members: [{ id: 'a', name: 'Ada', answer: 'yes' }, { id: 'b', name: 'Bola', answer: 'yes' }, { id: 'c', name: 'Chidi', answer: 'no' }], state: 'gone', leftAt: 1, arriveAt: 2, mine: true, myAnswer: 'yes', ready: null,
  card: '2 of us took a danfo from Ojota Park to Balogun Market, together', ...more })

test('the trip card: the route, the line, who went (not who stayed), and a way to share it', async () => {
  const html = await render('/src/app/features/glue/TripCard.vue', { trip: trip() })
  const plain = text(html)
  assert.match(plain, /Ojota Park → Balogun Market/)
  assert.match(plain, /2 of us took a danfo from Ojota Park to Balogun Market, together/)
  assert.match(plain, /Ada · Bola/)
  assert.doesNotMatch(plain, /Chidi/, 'who said no is not on the card')
  assert.match(plain, /Share the card/)
  assert.match(plain, /WhatsApp/)
})

test('Plans has a Talks side; nothing is recorded, and the page says so', async () => {
  const plans = text(await render('/src/app/features/feed/PlansApp.vue'))
  assert.match(plans, /Plans Neighbours Talks/)
  const talks = text(await render('/src/app/features/feed/PlansApp.vue', { params: { tab: 'talks' } }))
  assert.match(talks, /Hosted talks: speakers on a stage, the audience raises hands and asks questions\. Voice is live only; nothing is recorded\./)
  assert.match(talks, /Host a talk/)
})

test('close friends: the fold says sharing is off until chosen; the HUD line is empty with nobody to show', async () => {
  const fold = text(await render('/src/app/features/glue/CloseFriends.vue'))
  assert.match(fold, /Close friends · sharing off/)
  const chip = await render('/src/app/features/glue/CloseNowChip.vue')
  assert.doesNotMatch(chip, /close-now-chip/, 'no close friend sharing: no line at all')
  const strip = await render('/src/app/features/glue/CloseNowStrip.vue')
  assert.doesNotMatch(strip, /glue-strip/)
})

test('where the glue sits: one lazy HUD line, no new phone app', async () => {
  const { NATIVE_PANELS } = await load<typeof import('../panels.ts')>('/src/app/features/panels.ts')
  const chip = NATIVE_PANELS.find((p) => p.id === 'close-now')
  assert.equal(chip?.placement, 'hud')
  assert.ok(!NATIVE_PANELS.some((p) => p.placement === 'phone' && ['glue', 'talks', 'gist-board', 'trips', 'marriage', 'close-friends'].includes(p.id)), 'no new app in the phone')
})
