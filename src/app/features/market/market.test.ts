// The Market app: what its model says (prices, the order ticket, why a control is off, the chart, the tape, the
// account limits), that the app is registered as a lazy Phone panel next to Invest, and that its copy never uses the
// words the red lines forbid (docs/REAL-VALUE.md).
import assert from 'node:assert/strict'
import { readFileSync, readdirSync } from 'node:fs'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { test } from 'node:test'
import type { MarketAccountView, MarketLimits } from '../../../types/market.ts'
import { market, MARKET_PANELS } from './register.ts'
import { NATIVE_PANELS, invest } from '../panels.ts'
import {
  ANON_LABEL, MARKET_COPY, SIMULATION_LINE, agoWords, bpsWords, clampPrice, depositMax, depositWhy, feeOf, fillsLine, historyKey, historyPath, holdingRows, leftWords, lookOf, marketRules, nowPrice,
  orderLine, percent, sparkline, tapeLine, ticketOf, ticketWhy, toneOf, viewKey, viewPath, withdrawMax, withdrawWhy,
} from './marketModel.ts'

const limits: MarketLimits = { feeBps: 50, spreadBps: 200, bandBps: 1500, maxUnitsPerOrder: 50, maxOpenOrders: 5, depositPerDay: 100000, accountMax: 500000, tradedPerDay: 300000, makerUnitsPerDay: 100, maxPosition: 500, pairPerDay: 100000, orderHours: 24 }
const account = (patch: Partial<MarketAccountView> = {}): MarketAccountView => ({ cash: 50000, reservedCash: 0, holdings: { rice: 10 }, reservedUnits: {}, orders: [], anon: false, today: { deposited: 0, traded: 0, makerUnits: {} }, ...patch })
const band = { min: 1500, max: 2100 }

test('keys and paths', () => {
  assert.deepEqual([viewKey('lagos'), viewPath('lagos'), historyKey('lagos', 'palm-oil'), historyPath('lagos', 'palm-oil')],
    ['market:view:lagos', '/api/market/view?city=lagos', 'market:history:lagos:palm-oil', '/api/market/history?city=lagos&commodity=palm-oil'])
  assert.equal(viewPath('a b'), '/api/market/view?city=a%20b')
})

test('percentages from basis points, and the tone they take', () => {
  assert.deepEqual([1250, -80, 0, 5, 100, -2500].map(percent), ['+12.5%', '−0.8%', '0.0%', '+0.1%', '+1.0%', '−25.0%'])
  assert.deepEqual([1250, 4, 0, -4, -300].map(toneOf), ['up', 'flat', 'flat', 'flat', 'down'])
  assert.equal(bpsWords(50), '0.5%'); assert.equal(bpsWords(100), '1%')
})

test('a commodity looks as the server says, else from the table, else from its id', () => {
  assert.deepEqual(lookOf('rice'), { label: 'Rice', unit: '10 kg bag', icon: '🍚' })
  assert.deepEqual(lookOf('rice', { label: 'Ofada rice', icon: '🌾' }), { label: 'Ofada rice', unit: '10 kg bag', icon: '🌾' })
  assert.deepEqual(lookOf('yam-flour'), { label: 'Yam flour', unit: '', icon: '📦' })
})

test('the ticket: value, fee (at least ₦1, rounded up), what a buyer pays and a seller receives', () => {
  assert.equal(feeOf(0, 50), 0)
  assert.equal(feeOf(10, 50), 1)
  assert.equal(feeOf(1820 * 5, 50), 46) // 9,100 × 0.5% = 45.5 → 46
  assert.equal(feeOf(20000, 50), 100)
  assert.equal(feeOf(20001, 50), 101)
  assert.deepEqual(ticketOf('buy', 1820, 5, 50), { value: 9100, fee: 46, buyerTotal: 9146, sellerReceives: 9054, total: 9146 })
  assert.deepEqual(ticketOf('sell', 1820, 5, 50), { value: 9100, fee: 46, buyerTotal: 9146, sellerReceives: 9054, total: 9054 })
  assert.deepEqual(ticketOf('sell', 1, 1, 50), { value: 1, fee: 1, buyerTotal: 2, sellerReceives: 0, total: 0 })
  assert.equal(ticketOf('buy', 100, 0, 50).total, 0)
})

test('price helpers: stay inside the band; "now" orders go to the worst price the caller accepts', () => {
  assert.deepEqual([1000, 1700, 1700.4, 9999, Number.NaN].map((price) => clampPrice(price, band)), [1500, 1700, 1700, 2100, 1500])
  assert.equal(nowPrice('buy', band), 2100); assert.equal(nowPrice('sell', band), 1500)
})

test('why an order cannot be sent: one sentence, in the order the server would check', () => {
  const ticket = { side: 'buy' as const, commodity: 'rice' as const, units: 5, price: 1800, band }
  assert.equal(ticketWhy(ticket, account(), limits, null), '')
  assert.equal(ticketWhy(ticket, account(), limits, 'No connection.'), 'No connection.')
  assert.equal(ticketWhy(ticket, null, limits, null), 'Sign in to trade.')
  assert.match(ticketWhy(ticket, account({ frozen: true }), limits, null), /frozen/)
  for (const units of [0, 51, 2.5]) assert.equal(ticketWhy({ ...ticket, units }, account(), limits, null), 'Trade 1 to 50 units at a time.')
  for (const price of [1499, 2101]) assert.equal(ticketWhy({ ...ticket, price }, account(), limits, null), 'The price must be between ₦1,500 and ₦2,100.')
  const orders = Array.from({ length: 5 }, (_, index) => ({ id: `o${index}`, commodity: 'rice' as const, side: 'buy' as const, price: 1800, units: 1, filled: 0, at: 0, expiresAt: 1 }))
  assert.equal(ticketWhy(ticket, account({ orders }), limits, null), 'You can have 5 open orders at most. Cancel one first.')
  assert.equal(ticketWhy(ticket, account({ orders }), limits, null, false), '', 'a "now" order never rests, so it needs no order slot')
  // 5 × 1,800 = 9,000 + 45 fee
  assert.equal(ticketWhy(ticket, account({ cash: 9045 }), limits, null), '')
  assert.equal(ticketWhy(ticket, account({ cash: 9044 }), limits, null), 'You need ₦9,045 in your market account, fee included; you have ₦9,044.')
  assert.equal(ticketWhy({ ...ticket, units: 50, price: 2000 }, account({ cash: 9e6, today: { deposited: 0, traded: 250000, makerUnits: {} } }), limits, null), 'You can trade ₦300,000 a day in one city. ₦50,000 is left today.')
  assert.match(ticketWhy({ ...ticket, units: 10 }, account({ holdings: { rice: 495 } }), limits, null), /You can hold at most 500/)
  assert.equal(ticketWhy({ ...ticket, units: 1, price: 1500 }, account({ cash: 1507 }), limits, null), 'You need ₦1,508 in your market account, fee included; you have ₦1,507.', 'the server holds price + fee for every unit')
  const sell = { ...ticket, side: 'sell' as const }
  assert.equal(ticketWhy({ ...sell, units: 10 }, account(), limits, null), '')
  assert.equal(ticketWhy({ ...sell, units: 11 }, account(), limits, null), 'You have 10 to sell in this city.')
  assert.equal(ticketWhy({ ...sell, commodity: 'beans' }, account(), limits, null), 'You have none to sell in this city.')
})

test('cash in and out: bounded by the wallet, the day and the account; out by the free cash', () => {
  const some = account({ cash: 400000, reservedCash: 50000, today: { deposited: 30000, traded: 0, makerUnits: {} } })
  assert.equal(depositMax(20000, some, limits), 20000) // wallet
  assert.equal(depositMax(900000, some, limits), 50000) // account room: 500,000 − 450,000 (day room is 70,000)
  assert.equal(depositMax(900000, account({ today: { deposited: 95000, traded: 0, makerUnits: {} } }), limits), 5000) // the day
  assert.equal(depositMax(900000, null, limits), 0)
  assert.equal(depositMax(900000, account({ today: { deposited: 200000, traded: 0, makerUnits: {} } }), limits), 0)
  assert.equal(withdrawMax(account({ cash: 1234.7 })), 1234); assert.equal(withdrawMax(null), 0)
  assert.equal(depositWhy(1000, 5000, account(), limits, null), '')
  assert.equal(depositWhy(1000, 5000, account(), limits, 'No connection.'), 'No connection.')
  assert.equal(depositWhy(0, 5000, account(), limits, null), 'Enter a whole number of naira.')
  assert.equal(depositWhy(1.5, 5000, account(), limits, null), 'Enter a whole number of naira.')
  assert.equal(depositWhy(6000, 5000, account(), limits, null), 'You have ₦5,000 in your wallet.')
  assert.equal(depositWhy(6000, 90000, account({ today: { deposited: 95000, traded: 0, makerUnits: {} } }), limits, null), 'You can move ₦5,000 more into this market today.')
  assert.equal(depositWhy(1, 90000, account({ today: { deposited: 100000, traded: 0, makerUnits: {} } }), limits, null), 'You have moved in the most you can today. Try again tomorrow.')
  assert.equal(depositWhy(60000, 90000, some, limits, null), 'This market account has room for ₦50,000 more.')
  assert.equal(depositWhy(1, 90000, account({ cash: 500000 }), limits, null), 'This market account is full.')
  assert.equal(withdrawWhy(100, account(), null), '')
  assert.equal(withdrawWhy(0, account(), null), 'Enter a whole number of naira.')
  assert.equal(withdrawWhy(60000, account(), null), 'You have ₦50,000 here.')
  assert.equal(withdrawWhy(60000, account({ reservedCash: 9000 }), null), '₦50,000 is free; ₦9,000 is held by open buy orders.')
  assert.equal(withdrawWhy(1, null, null), 'Sign in to use the market.')
})

test('the chart path: scaled into the box, oldest left, high prices up', () => {
  assert.deepEqual(sparkline([], 100, 50), { path: '', min: 0, max: 0, minLabel: '', maxLabel: '', first: 0, last: 0, tone: 'flat' })
  const up = sparkline([[0, 1000], [10, 1500], [20, 2000]], 100, 50, 0)
  assert.equal(up.path, 'M0 50L50 25L100 0')
  assert.deepEqual([up.minLabel, up.maxLabel, up.tone], ['₦1,000', '₦2,000', 'up'])
  const down = sparkline([[0, 2000], [10, 1000]], 100, 50, 5)
  assert.equal(down.path, 'M5 5L95 45'); assert.equal(down.tone, 'down')
  assert.equal(sparkline([[0, 700], [10, 700]], 100, 50, 0).path, 'M0 25L100 25', 'a flat line runs through the middle')
  assert.equal(sparkline([[5, 700]], 100, 50).path, 'M50 25')
  assert.equal(sparkline([[0, Number.NaN], [1, 5]], 10, 10).path.startsWith('M'), true, 'a bad point is dropped, not drawn')
})

test('the tape, orders and time words', () => {
  assert.equal(tapeLine({ buyer: 'Ada', seller: 'Market maker', units: 5, price: 1820, commodity: 'rice' }), 'Ada bought 5 × Rice at ₦1,820 from Market maker')
  assert.equal(tapeLine({ buyer: '', seller: 'Ada', units: 1, price: 900, commodity: 'petrol' }, 'Fuel'), `${ANON_LABEL} bought 1 × Fuel at ₦900 from Ada`)
  const order = { id: 'o1', commodity: 'beans' as const, side: 'sell' as const, price: 2300, units: 4, filled: 1, at: 0, expiresAt: 1 }
  assert.equal(orderLine(order), 'Sell 4 × Beans at ₦2,300 · 1 filled')
  assert.equal(orderLine({ ...order, side: 'buy', filled: 0 }), 'Buy 4 × Beans at ₦2,300')
  const minute = 60000, hour = 60 * minute
  assert.deepEqual([0, 5 * minute, 3 * hour, 49 * hour, 24 * hour].map((gone) => agoWords(1000, 1000 + gone)), ['just now', '5 min ago', '3 h ago', '2 days ago', '1 day ago'])
  assert.deepEqual([-5, 30 * minute, 6 * hour].map((left) => leftWords(left, 0)), ['expired', 'under an hour left', '6 h left'])
  assert.equal(fillsLine('buy', [{ units: 2, price: 1000 }, { units: 3, price: 1100 }], 'Rice', false), 'Bought 5 × Rice for ₦5,300.')
  assert.equal(fillsLine('sell', [{ units: 1, price: 900 }], 'Rice', true), 'Sold 1 × Rice for ₦900.')
  assert.equal(fillsLine('buy', [], 'Rice', true), 'Your order is resting in the market.')
  assert.equal(fillsLine('buy', undefined, 'Rice', false), 'Nothing was filled at that price.')
  assert.deepEqual(holdingRows(account({ holdings: { rice: 3, beans: 0 }, reservedUnits: { beans: 2, cement: 0 } })), [{ commodity: 'rice', free: 3, reserved: 0 }, { commodity: 'beans', free: 0, reserved: 2 }])
})

test('the app is a lazy Phone panel in the money group, after Invest', () => {
  assert.deepEqual(MARKET_PANELS.map((panel) => [panel.id, panel.placement, panel.group, panel.title, panel.live]), [['market', 'phone', 'money', 'Market', false]])
  assert.ok(NATIVE_PANELS.includes(market))
  assert.equal(new Set(NATIVE_PANELS.map((panel) => panel.id)).size, NATIVE_PANELS.length)
  assert.ok((market.order ?? 0) > (invest.order ?? 0) && (market.order ?? 0) < 51, 'right after Invest')
  assert.ok(market.tint && NATIVE_PANELS.filter((panel) => panel.tint === market.tint).length === 1, 'a colour of its own')
})

test('the first download carries only register.ts: the app body is loaded by key, lazily', () => {
  const root = fileURLToPath(new URL('../../', import.meta.url))
  const register = readFileSync(join(root, 'features', 'market', 'register.ts'), 'utf8')
  assert.doesNotMatch(register, /from '\.\/(Market|market)[A-Za-z]*(\.vue|\.ts)'/, 'register.ts imports nothing of the feature')
  assert.match(register, /bodyLoader\('market\/MarketApp'\)/)
  assert.match(readFileSync(join(root, 'state', 'panelBodies.ts'), 'utf8'), /'market\/MarketApp': \(\) => import\('\.\.\/features\/market\/MarketApp\.vue'\)/)
})

// "earn", "invest", "investment", "profit": red lines (docs/REAL-VALUE.md). Whole words and their forms, so "learn" is fine.
const BANNED = /\b(earn\w*|invest\w*|profit\w*)\b/i

test('no copy in the Market uses the banned words, and the simulation line is on every screen', () => {
  assert.match(SIMULATION_LINE, /^A simulation with game naira\. Nothing here can be bought with real money or turned into real money\.$/)
  const strings = [...MARKET_COPY, ...marketRules(100), ANON_LABEL]
  const failures = [
    ticketWhy({ side: 'buy', commodity: 'rice', units: 0, price: 1, band }, account(), limits, null), ticketWhy({ side: 'buy', commodity: 'rice', units: 5, price: 1800, band }, account({ cash: 1 }), limits, null),
    ticketWhy({ side: 'sell', commodity: 'beans', units: 5, price: 1800, band }, account(), limits, null), ticketWhy({ side: 'buy', commodity: 'rice', units: 5, price: 1800, band }, null, limits, null),
    depositWhy(0, 1, account(), limits, null), depositWhy(9, 1, account(), limits, null), withdrawWhy(0, account(), null), withdrawWhy(9e9, account({ reservedCash: 1 }), null),
    fillsLine('buy', [], 'Rice', true), fillsLine('buy', [], 'Rice', false), fillsLine('sell', [{ units: 1, price: 1 }], 'Rice', false),
  ]
  for (const line of [...strings, ...failures]) assert.doesNotMatch(line, BANNED, line)
  assert.doesNotMatch('learn and burn', BANNED); assert.match('Your profit', BANNED); assert.match('Earn naira', BANNED); assert.match('An Investment', BANNED)
  // The templates and the script text of every file of the feature (comments aside).
  const dir = fileURLToPath(new URL('.', import.meta.url))
  for (const name of readdirSync(dir)) {
    if (!/\.(vue|ts)$/.test(name) || /\.test\.ts$/.test(name)) continue
    const code = readFileSync(join(dir, name), 'utf8').replace(/<!--[\s\S]*?-->/g, '').replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '').replace(/ \/\/ .*$/gm, '')
    assert.doesNotMatch(code, BANNED, `${name} uses a word the market must not use`)
  }
  for (const name of ['MarketApp.vue', 'MarketTicket.vue', 'MarketAccount.vue', 'MarketTape.vue']) assert.ok(readFileSync(join(dir, name), 'utf8').length > 0)
  assert.match(readFileSync(join(dir, 'MarketApp.vue'), 'utf8'), /<p class="mk-sim" role="note">\{\{ SIMULATION_LINE \}\}<\/p>[\s\S]*<CivicStatus/, 'the simulation line sits above the tabs and the content, outside every tab')
})
