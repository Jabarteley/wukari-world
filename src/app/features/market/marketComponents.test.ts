// Component tests of the Market app, the way the Business app is tested (businessComponents.test.ts): the single-file
// components are compiled by the project's own Vite configuration and rendered to a string against the real store and a
// fake server, with the cache of server answers filled first. What a press does is the server's rules, not this screen's.
import assert from 'node:assert/strict'
import { after, before, test } from 'node:test'
import { fileURLToPath } from 'node:url'
import { createServer } from 'vite'
import type { ViteDevServer } from 'vite'
import { createSSRApp, h } from 'vue'
import type { Component } from 'vue'
import { renderToString } from 'vue/server-renderer'
import type { MarketAccountView, MarketFill, MarketHistoryResponse, MarketLimits, MarketQuote, MarketViewResponse } from '../../../types/market.ts'
import type { App } from '../../state/app.ts'
import type { Civic } from '../civic/civicClient.ts'
import { createFakeServer } from '../../testing/fakeServer.ts'

const root = fileURLToPath(new URL('../../../..', import.meta.url))
const server = createFakeServer()
let vite: ViteDevServer
let app: App
let cache: Civic
const realFetch = globalThis.fetch
const load = async <T = { default: Component }>(path: string): Promise<T> => await vite.ssrLoadModule(path) as T
const text = (html: string): string => html.replace(/<!--.*?-->/g, '').replace(/<[^>]+>/g, ' ').replace(/&amp;/g, '&').replace(/&#39;/g, '\'').replace(/&quot;/g, '"').replace(/\s+/g, ' ').trim()
async function render(props: Record<string, unknown> = {}): Promise<string> {
  const component = (await load('/src/app/features/phone/PanelHost.vue')).default
  const panel = app.shell.byId.get('market')
  assert.ok(panel, 'Market is registered before its component loads')
  return renderToString(createSSRApp({ render: () => h(component, { ...props, panel }) }))
}
async function renderChild(file: string, props: Record<string, unknown>): Promise<string> {
  const component = (await load(`/src/app/features/market/${file}`)).default
  return renderToString(createSSRApp({ render: () => h(component, props) }))
}
const buttonTag = (html: string, label: string): string => {
  const hit = [...html.matchAll(/<button\b[^>]*>.*?<\/button>/gs)].map((match) => match[0]).find((tag) => text(tag).includes(label))
  assert.ok(hit, `no button "${label}"`)
  return hit
}

before(async () => {
  globalThis.fetch = server.fetch
  vite = await createServer({ root, configFile: `${root}vite.config.ts`, logLevel: 'error', appType: 'custom', server: { middlewareMode: true, hmr: false, ws: false, watch: null }, optimizeDeps: { noDiscovery: true, include: [] } })
  const cityLoader = await vite.ssrLoadModule('/src/game/cities/registry.ts') as typeof import('../../../game/cities/registry.ts')
  await cityLoader.loadCityContent('lagos')
  app = (await load<{ useApp: () => App }>('/src/app/state/app.ts')).useApp()
  cache = (await load<{ useCivic: () => Civic }>('/src/app/features/civic/useCivic.ts')).useCivic()
  assert.equal(await app.game.connect(), true)
  app.game.stop()
  assert.ok(!vite.moduleGraph.getModuleById(`${root}src/app/features/market/MarketApp.vue`)?.ssrModule, 'Market stays unloaded until PanelHost renders it')
})
after(async () => { app?.game.stop(); await vite?.close(); globalThis.fetch = realFetch })

const limits: MarketLimits = { feeBps: 50, spreadBps: 200, bandBps: 1500, maxUnitsPerOrder: 50, maxOpenOrders: 5, depositPerDay: 100000, accountMax: 500000, tradedPerDay: 300000, makerUnitsPerDay: 100, maxPosition: 500, pairPerDay: 100000, orderHours: 24 }
const rice: MarketQuote = { commodity: 'rice', ref: 1820, bid: 1784, ask: 1856, change: 1250, band: { min: 1547, max: 2093 }, last: 1830, event: { headline: 'Festive demand lifts rice', to: 1 } }
const petrol: MarketQuote = { commodity: 'petrol', ref: 900, bid: 882, ask: 918, change: -310, band: { min: 765, max: 1035 } }
const account = (patch: Partial<MarketAccountView> = {}): MarketAccountView => ({ cash: 50000, reservedCash: 9000, holdings: { rice: 7 }, reservedUnits: { rice: 2 }, orders: [], anon: false, today: { deposited: 20000, traded: 0, makerUnits: {} }, ...patch })
const fill = (patch: Partial<MarketFill> = {}): MarketFill => ({ id: 'f1', commodity: 'rice', price: 1820, units: 5, at: server.now() - 5 * 60000, buyer: 'Ada', seller: 'Market maker', ...patch })
const view = (patch: Partial<MarketViewResponse> = {}): MarketViewResponse => ({ city: 'lagos', quotes: [rice, petrol], tape: [fill()], account: account(), limits, ...patch })
const keyOf = () => app.game.view.value.cityId

test('a skeleton until the answer is here; always the simulation line, never a banned word', async () => {
  const waiting = await render()
  assert.match(waiting, /role="status" aria-label="Loading"/)
  assert.ok(text(waiting).includes('A simulation with game naira. Nothing here can be bought with real money or turned into real money.'))
})

test('prices: icon, label, unit, price, 24 h change, event chip; the ticket shows value, fee and total before anything is sent', async () => {
  cache.put<MarketViewResponse>(`market:view:${keyOf()}`, view())
  cache.put<MarketHistoryResponse>(`market:history:${keyOf()}:rice`, { city: 'lagos', commodity: 'rice', points: [[0, 1600], [1, 1700], [2, 1820]] })
  const html = await render(), words = text(html)
  for (const part of ['A simulation with game naira', 'Prices today', 'Rice 10 kg bag Festive demand lifts rice ₦1,820 +12.5%', 'Petrol', '₦900 −3.1%', 'Market maker buys ₦1,784', 'Market maker sells ₦1,856', 'Last trade ₦1,830', 'Price band ₦1,547 to ₦2,093',
    'Order ticket 7 held here', 'Value ₦1,820', 'Fee (0.5%, at least ₦1) +₦10', 'You pay ₦1,830', 'Buy now', 'Place order', 'How the market works']) assert.ok(words.includes(part), `${part} — in: ${words.slice(0, 1400)}`)
  assert.match(html, /<svg[^>]*role="img"[^>]*aria-label="Rice price over 7 days/)
  assert.match(html, /<input[^>]*value="1820"[^>]*min="1547"[^>]*max="2093"/)
  assert.match(html, /class="is-up"/); assert.match(html, /class="is-down"/)
  assert.doesNotMatch(buttonTag(html, 'Buy now'), /disabled/)
  assert.doesNotMatch(buttonTag(html, 'Place order'), /disabled/)
})

test('a guest or an account without cash: the trade buttons are off, each for one stated reason', async () => {
  cache.put<MarketViewResponse>(`market:view:${keyOf()}`, view({ account: null }))
  const guest = await render()
  assert.match(buttonTag(guest, 'Buy now'), /disabled/)
  assert.ok(text(guest).includes('Sign in to trade.'))
  cache.put<MarketViewResponse>(`market:view:${keyOf()}`, view({ account: account({ cash: 100 }) }))
  const poor = text(await render())
  assert.ok(poor.includes('You need ₦1,830 in your market account, fee included; you have ₦100.'), poor.slice(0, 900))
  cache.put<MarketViewResponse>(`market:view:${keyOf()}`, view({ account: account({ frozen: true }) }))
  assert.ok(text(await render()).includes('Your market account is frozen.'))
})

test('the account: free and held cash, holdings, deposit and withdraw with their limits, open orders with Cancel, the anonymous choice', async () => {
  const props = { account: account({ orders: [{ id: 'o1', commodity: 'rice', side: 'buy', price: 1800, units: 5, filled: 2, at: 0, expiresAt: server.now() + 6 * 3600000 }], anon: true }), limits, wallet: 30000, cityName: 'Lagos', now: server.now(), offline: null, busy: () => false }
  const html = await renderChild('MarketAccount.vue', props), words = text(html)
  for (const part of ['Market account · Lagos', '₦50,000', 'free to use', '₦9,000 held by open buy orders', 'Holdings in Lagos', 'Rice 10 kg bag · 2 in open sell orders 7', '₦80,000 left to move in today',
    'Your wallet has ₦30,000', 'Most (₦30,000)', 'All (₦50,000)', 'Move into the market', 'Take out to my wallet', 'Open orders 1 of 5', 'Buy 5 × Rice at ₦1,800 · 2 filled', '3 units to go · 6 h left', 'Cancel', 'Show me as Anonymous trader on the tape']) assert.ok(words.includes(part), `${part} — in: ${words}`)
  assert.match(html, /<input[^>]*type="checkbox"[^>]*checked/)
  assert.ok(words.includes('Enter a whole number of naira.'))
  const empty = text(await renderChild('MarketAccount.vue', { ...props, account: account({ holdings: {}, reservedUnits: {}, orders: [], reservedCash: 0, anon: false, frozen: true }) }))
  assert.ok(empty.includes('No goods yet') && empty.includes('No open orders') && empty.includes('This account is frozen.'))
  const away = text(await renderChild('MarketAccount.vue', { ...props, offline: 'No connection.' }))
  assert.ok(away.includes('No connection.'))
})

test('the tape: newest first, own fills marked, names are text and never markup', async () => {
  const tape = [fill({ id: 'f2', buyer: 'You <b>Me</b>', seller: 'Anonymous trader', mine: true, at: server.now() }), fill()]
  const html = await renderChild('MarketTape.vue', { tape, now: server.now() }), words = text(html)
  assert.ok(words.indexOf('You <b>Me</b> bought') < words.indexOf('Ada bought'), words)
  assert.ok(words.includes('Ada bought 5 × Rice at ₦1,820 from Market maker') && words.includes('5 min ago') && words.includes('just now'))
  assert.equal([...html.matchAll(/class="is-mine"/g)].length, 1)
  assert.ok(words.includes('· yours'))
  assert.ok(html.includes('You &lt;b&gt;Me&lt;/b&gt;') && !html.includes('<b>Me</b>'))
  assert.ok(text(await renderChild('MarketTape.vue', { tape: [], now: 0 })).includes('Nothing has traded here yet'))
})
