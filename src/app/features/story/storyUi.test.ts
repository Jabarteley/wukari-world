import assert from 'node:assert/strict'
import { after, before, test } from 'node:test'
import { fileURLToPath } from 'node:url'
import { createServer } from 'vite'
import type { ViteDevServer } from 'vite'
import { createSSRApp, h } from 'vue'
import type { Component } from 'vue'
import { renderToString } from 'vue/server-renderer'
import type { StoryMode } from '../../../types/story.ts'
import type { App } from '../../state/app.ts'
import { createFakeServer } from '../../testing/fakeServer.ts'

const root = fileURLToPath(new URL('../../../..', import.meta.url))
const server = createFakeServer()
let vite: ViteDevServer
let app: App
const realFetch = globalThis.fetch
let storyCapability = false

const load = async <T = { default: Component }>(path: string): Promise<T> => await vite.ssrLoadModule(path) as T
const text = (html: string): string => html.replace(/<!--.*?-->/g, '').replace(/<[^>]+>/g, ' ').replace(/&amp;/g, '&').replace(/&#39;/g, '\'').replace(/\s+/g, ' ').trim()
async function render(path: string, props: Record<string, unknown> = {}): Promise<string> {
  const component = (await load(path)).default
  return renderToString(createSSRApp({ render: () => h(component, props) }))
}

async function setStory(enabled: boolean, mode: StoryMode = 'free'): Promise<void> {
  const life = server.life()
  life.story = { ...life.story, mode }
  storyCapability = enabled
  assert.equal(await app.game.refresh(), true)
}

before(async () => {
  globalThis.fetch = server.fetch
  server.route('GET /api/life', () => ({ status: 200, body: { state: structuredClone(server.life()), storyMode: storyCapability } }))
  vite = await createServer({ root, configFile: `${root}vite.config.ts`, logLevel: 'error', appType: 'custom', server: { middlewareMode: true, hmr: false, ws: false, watch: null }, optimizeDeps: { noDiscovery: true, include: [] } })
  const cityLoader = await vite.ssrLoadModule('/src/game/cities/registry.ts') as typeof import('../../../game/cities/registry.ts')
  await cityLoader.loadCityContent('lagos')
  app = (await load<{ useApp: () => App }>('/src/app/state/app.ts')).useApp()
  assert.equal(await app.game.connect(), true)
  app.game.stop()
})
after(async () => { app?.game.stop(); await vite?.close(); globalThis.fetch = realFetch })

test('Story UI is absent until the trusted view enables it', async () => {
  await setStory(false)
  assert.equal(app.game.view.value.story.enabled, false)
  assert.equal(text(await render('/src/app/features/story/StoryChip.vue')), '')
  assert.equal(text(await render('/src/app/features/story/StoryModePanel.vue')), '')
})

test('Story panel exposes reversible modes, chapter guidance, progress, and the real signature destination', async () => {
  await setStory(true, 'story')
  const story = app.game.view.value.story
  assert.ok(story.enabled)
  const destination = story.signature.venue ? app.game.view.value.travel.destinations.find((row) => row.id === story.signature.venue) : null
  const html = await render('/src/app/features/story/StoryModePanel.vue')
  const words = text(html)
  assert.match(html, /role="group" aria-label="How you play"/)
  assert.match(html, /aria-pressed="false"[^>]*>.*Free Roam/s)
  assert.match(html, /aria-pressed="true"[^>]*>.*Story Path/s)
  assert.match(html, /role="status" aria-live="polite"/)
  assert.ok(words.includes(`Chapter ${story.chapter} of 4`) && words.includes(story.chapterLabel))
  assert.ok(words.includes(`Next step ${story.nextStep}`))
  assert.ok(words.includes(`${story.progress.missions} missions`) && words.includes(`${story.progress.venues} venues`))
  assert.ok(words.includes('City signature challenge'))
  assert.ok(!words.includes(story.signature.kind), 'internal signature ids are not product copy')
  if (destination) assert.ok(words.includes(`${app.game.state.value.location === destination.id ? 'Open' : 'Go to'} ${app.game.state.value.location === destination.id ? (story.signature.kind === 'tables' ? 'Tables' : story.signature.kind.startsWith('arena-') ? 'Games' : story.signature.kind === 'business' || story.signature.kind === 'haggle' ? 'Business' : story.signature.kind === 'politics' ? 'Politics' : story.signature.kind === 'festival' ? 'Events' : 'Clans') : destination.label}`))
  assert.match(html, new RegExp(`<summary[^>]*>City chapters · \\d+ of ${story.cities.length} open<\\/summary>`))

  const chip = await render('/src/app/features/story/StoryChip.vue')
  assert.match(chip, /<button[^>]*class="story-chip"[^>]*aria-label="Open Story in My Life\./)
  assert.ok(text(chip).includes(story.chapterLabel) && text(chip).includes(story.nextStep))
})

test('a helper keeps the named city keepsake without advancing the city ladder', async () => {
  const state = server.life(), before = structuredClone(state.story)
  state.story.helped = [{ id: 'help-keepsake-1', city: 'kano', completedAt: state.t }]
  await setStory(true, 'free')
  const words = text(await render('/src/app/features/story/StoryModePanel.vue'))
  assert.ok(words.includes('Help keepsakes · 1'))
  assert.ok(words.includes('Kano Roots keepsake'))
  assert.deepEqual(app.game.state.value.story.cities, before.cities)
  state.story = before
})

test('Story invitation focus accepts only public UUIDs and signature kinds choose existing feature screens', async () => {
  const ui = await load<typeof import('./storyUi.ts')>('/src/app/features/story/storyUi.ts')
  const id = '123e4567-e89b-42d3-a456-426614174000'
  assert.equal(ui.setStoryHelpFocus(id), id)
  assert.equal(ui.storyHelpFocus.value, id)
  assert.equal(ui.setStoryHelpFocus('not-public'), null)
  assert.equal(ui.storyHelpFocus.value, null)
  assert.deepEqual([
    ui.signaturePanelId('tables'), ui.signaturePanelId('arena-race'), ui.signaturePanelId('haggle'), ui.signaturePanelId('business'),
    ui.signaturePanelId('politics'), ui.signaturePanelId('festival'), ui.signaturePanelId('clan'),
  ], ['tables', 'games', 'business', 'business', 'politics', 'events', 'games'])
})

test('Venue card uses the server story reason only in Story Path', async () => {
  await setStory(true, 'story')
  const story = app.game.view.value.story
  assert.ok(story.enabled)
  const lock = story.venues.find((row) => row.locked && row.reason)
  const destination = lock ? app.game.view.value.travel.destinations.find((row) => row.id === lock.id && !row.here && !row.open && row.blocked?.code === 'story_locked' && row.modes.length) : null
  assert.ok(lock && destination)
  const lockedHtml = await render('/src/app/features/travel/VenueCard.vue', { item: destination })
  assert.ok(text(lockedHtml).includes(lock.reason ?? ''))
  assert.match(lockedHtml, /<button[^>]*class="map-go"[^>]*disabled[^>]*aria-label="Cannot go: [^"]+"[^>]*>Story path locked<\/button>/)

  await setStory(true, 'free')
  const freeDestination = app.game.view.value.travel.destinations.find((row) => row.id === destination.id)
  assert.ok(freeDestination)
  const freeHtml = await render('/src/app/features/travel/VenueCard.vue', { item: freeDestination })
  assert.doesNotMatch(freeHtml, /Story path locked/)
  assert.match(freeHtml, /<button[^>]*class="map-go"(?![^>]*disabled)[^>]*>.*Go ·/s)
})
