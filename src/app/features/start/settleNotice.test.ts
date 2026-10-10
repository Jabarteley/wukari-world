// "This needs a settled life": the shared notice, the toast button, the standing entry and the way back, rendered the way the
// start components' tests do (the project's Vite configuration, the real store connected to a fake server).
import assert from 'node:assert/strict'
import { after, before, test } from 'node:test'
import { fileURLToPath } from 'node:url'
import { createServer } from 'vite'
import type { ViteDevServer } from 'vite'
import { createSSRApp, h } from 'vue'
import type { Component } from 'vue'
import { renderToString } from 'vue/server-renderer'
import type { LifeState } from '../../../types/life.ts'
import type { App } from '../../state/app.ts'
import { createFakeServer } from '../../testing/fakeServer.ts'

const root = fileURLToPath(new URL('../../../..', import.meta.url))
const server = createFakeServer()
let vite: ViteDevServer
let app: App
const realFetch = globalThis.fetch

const load = async <T = { default: Component }>(path: string): Promise<T> => await vite.ssrLoadModule(path) as T
const text = (html: string): string => html.replace(/<!--.*?-->/g, '').replace(/<[^>]+>/g, ' ').replace(/&amp;/g, '&').replace(/\s+/g, ' ').trim()
async function render(path: string, props: Record<string, unknown> = {}): Promise<string> {
  const component = (await load(path)).default
  return renderToString(createSSRApp({ render: () => h(component, props) }))
}
async function withState<T>(change: (state: LifeState) => LifeState, check: () => Promise<T>): Promise<T> {
  const before = app.game.state.value
  app.game.state.value = change(before)
  try { return await check() } finally { app.game.state.value = before }
}
const guest = (state: LifeState): LifeState => ({ ...state, onboarding: { ...state.onboarding, stage: 'guest', done: false, required: false, step: 1, lottery: null, traits: [], dream: null } })
const settled = (state: LifeState): LifeState => ({ ...state, onboarding: { ...state.onboarding, stage: 'settled', done: true, required: false } })
const NOTICE = '/src/app/features/start/SettleNotice.vue'
const BUTTON = 'data-settle-now'

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

test('a refusal needs settling by its code, not its words', async () => {
  const { needsSettling } = await load<typeof import('../../state/settleRefusal.ts')>('/src/app/state/settleRefusal.ts')
  const guestView = { guest: true, required: false }
  assert.equal(needsSettling('settle_required', null), true)
  assert.equal(needsSettling('onboarding_required', guestView), true)
  assert.equal(needsSettling('plot_required', guestView), true)
  assert.equal(needsSettling('onboarding_required', { guest: true, required: true }), false, 'a life held for its look has the quick start gate')
  assert.equal(needsSettling('onboarding_required', { guest: false, required: false }), false)
  assert.equal(needsSettling('insufficient_funds', guestView), false)
  assert.equal(needsSettling(undefined, guestView), false)
})

test('the notice carries the button for a settle refusal and draws nothing for any other', async () => {
  await withState(guest, async () => {
    const html = await render(NOTICE, { code: 'settle_required', message: 'Settle in first: then you can travel between cities.' })
    assert.match(html, new RegExp(BUTTON))
    assert.match(html, /role="alert"/)
    assert.match(text(html), /Settle in first: then you can travel between cities\. Settle in now/)
    assert.equal(text(await render(NOTICE, { code: 'insufficient_funds', message: 'You need more cash.' })), '')
  })
  await withState(settled, async () => assert.equal(text(await render(NOTICE, { code: 'insufficient_funds', message: 'x' })), ''))
})

test('the hint is for a guest only, and says it up front', async () => {
  await withState(guest, async () => { const html = await render(NOTICE, { hint: true }); assert.match(html, new RegExp(BUTTON)); assert.match(text(html), /Settle in first Settle in now/) })
  await withState(settled, async () => assert.equal(text(await render(NOTICE, { hint: true })), ''))
})

test('every surface that tells a guest to settle in mounts the notice', async () => {
  for (const path of ['world/LgaCard', 'home/HousesApp', 'neighbourhood/LandPanel', 'neighbourhood/NeighbourhoodPanel', 'life/BoutiqueApp', 'sim/ProfileTab']) {
    const source = await (await import('node:fs/promises')).readFile(`${root}src/app/features/${path}.vue`, 'utf8')
    assert.match(source, /<SettleNotice /, path)
  }
  for (const path of ['growth/MissionsApp', 'travel/MyHouse']) {
    const source = await (await import('node:fs/promises')).readFile(`${root}src/app/features/${path}.vue`, 'utf8')
    assert.match(source, /startSettling\(shell/, path)
  }
})

test('a toast of a settle refusal carries the button, and pressing it opens the flow', async () => {
  const toasts = await load<typeof import('../../state/toasts.ts')>('/src/app/state/toasts.ts')
  const refusal = await load<typeof import('../../state/settleRefusal.ts')>('/src/app/state/settleRefusal.ts')
  const shown = toasts.createToasts(() => undefined)
  let opened = 0
  refusal.settleHandler.run = () => { opened += 1 }
  const view = { guest: true, required: false }
  shown.toast('Settle in first.', 'error', refusal.settleToastAction('settle_required', view))
  shown.toast('Not enough cash.', 'error', refusal.settleToastAction('insufficient_funds', view))
  assert.deepEqual(shown.items.value.map((item) => [item.text, item.action?.label ?? null]), [['Settle in first.', 'Settle in now'], ['Not enough cash.', null]])
  shown.items.value[0]!.action?.run()
  assert.equal(opened, 1)
  assert.ok(toasts.toastLifetime('x', true) > toasts.toastLifetime('x'), 'a toast with a button stays longer')
  const stack = await (await import('node:fs/promises')).readFile(`${root}src/app/ui/ToastStack.vue`, 'utf8')
  assert.match(stack, /<button v-if="item.action" type="button" class="toast-action"/)
})

test('the standing entry shows while the life is a guest, hides after settling, and is put away for the visit', async () => {
  const model = await load<typeof import('./settleModel.ts')>('/src/app/features/start/settleModel.ts')
  const ENTRY = '/src/app/features/start/SettleEntry.vue'
  await withState(guest, async () => {
    const html = await render(ENTRY)
    assert.match(html, /data-settle-entry/)
    assert.match(text(html), /Settle in: get your home/)
    model.settleEntry.dismissed = true
    assert.equal(text(await render(ENTRY)), '')
    model.settleEntry.dismissed = false
  })
  await withState(settled, async () => assert.equal(text(await render(ENTRY)), ''))
})

test('pressing the button opens the settle-in panel, and closing it brings the sheet back', async () => {
  const model = await load<typeof import('./settleModel.ts')>('/src/app/features/start/settleModel.ts')
  const sheet = { kind: 'panel' as const, id: 'lga', params: { lga: 'x' }, from: null }
  const fake = { sheet: { value: sheet as unknown }, open(id: string) { this.sheet.value = { kind: 'panel', id, from: null }; return true } }
  model.startSettling(fake as never)
  assert.deepEqual(fake.sheet.value, { kind: 'panel', id: 'onboarding', from: null })
  fake.sheet.value = null
  model.returnFromSettling(fake as never)
  assert.equal(fake.sheet.value, sheet)
  // Nothing comes back twice, nor over something else that opened in between.
  fake.sheet.value = null
  model.returnFromSettling(fake as never)
  assert.equal(fake.sheet.value, null)
})

test('the refusal texts no longer point at a goal that may not be on screen', async () => {
  const fs = await import('node:fs/promises')
  for (const path of ['src/game/systems/onboarding.ts', 'src/game/systems/estate.ts', 'src/game/systems/missions.ts', 'server/street/authority.ts']) {
    const source = await fs.readFile(`${root}${path}`, 'utf8')
    assert.doesNotMatch(source, /tap the "(Settle in|Create your character)" goal/, path)
  }
})
