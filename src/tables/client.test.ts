import test from 'node:test'
import assert from 'node:assert/strict'
import type { PanelApi } from '../app/types/panel.ts'

class Socket {
  static instances: Socket[] = []
  readyState = 0
  sent: unknown[] = []
  onopen: (() => void) | null = null
  onmessage: ((event: { data: string }) => void) | null = null
  onclose: (() => void) | null = null
  onerror: (() => void) | null = null
  constructor(_url: string) { Socket.instances.push(this) }
  send(text: string) { this.sent.push(JSON.parse(text)) }
  open() { this.readyState = 1; this.onopen?.() }
  receive(value: unknown) { this.onmessage?.({ data: JSON.stringify(value) }) }
  close() { this.readyState = 3; this.onclose?.() }
}

test('tables ignores callbacks from a socket closed by an identity change', async t => {
  const oldWindow = Reflect.get(globalThis, 'window'), oldLocation = Reflect.get(globalThis, 'location'), oldSocket = Reflect.get(globalThis, 'WebSocket')
  const listeners = new Map<string, (() => void)[]>()
  Reflect.set(globalThis, 'window', { addEventListener(type: string, listener: () => void) { const list = listeners.get(type) ?? []; list.push(listener); listeners.set(type, list) },
    dispatchEvent(event: { type: string }) { for (const listener of listeners.get(event.type) ?? []) listener() } })
  Reflect.set(globalThis, 'location', { protocol: 'https:', host: 'example.test' }); Reflect.set(globalThis, 'WebSocket', Socket)
  t.after(() => { if (oldWindow === undefined) Reflect.deleteProperty(globalThis, 'window'); else Reflect.set(globalThis, 'window', oldWindow); if (oldLocation === undefined) Reflect.deleteProperty(globalThis, 'location'); else Reflect.set(globalThis, 'location', oldLocation); if (oldSocket === undefined) Reflect.deleteProperty(globalThis, 'WebSocket'); else Reflect.set(globalThis, 'WebSocket', oldSocket) })
  const tables = await import(`./client.ts?stale=${Date.now()}`) as typeof import('./client.ts')
  const api = { view: () => ({ connected: true, onboarding: { required: false }, cityId: 'lagos' }), refresh() {}, state: () => ({ message: '' }), toast() {},
    fetchJson: async () => ({ ok: true, results: [], ratings: {} }), command: async () => ({ ok: true, code: 'ok' }) } as unknown as PanelApi
  tables.start(api); const first = Socket.instances.at(-1)!; first.open(); first.receive({ type: 'tables', tables: [{ id: 'old' }] })
  const staleMessage = first.onmessage, staleClose = first.onclose
  for (const listener of listeners.get('jaw:session') ?? []) listener()
  tables.start(api); const current = Socket.instances.at(-1)!; assert.notEqual(current, first); current.open(); current.receive({ type: 'tables', tables: [{ id: 'new' }] })
  staleMessage?.({ data: JSON.stringify({ type: 'tables', tables: [{ id: 'stale' }] }) }); staleClose?.()
  assert.deepEqual(tables.T.list?.map(item => item.id), ['new']); assert.equal(tables.T.socket, 'open')
})

test('tables: sitting names the stake the player saw, the host picks one by message, and a finished staked game refreshes the life and says what happened to the stake', async t => {
  const oldWindow = Reflect.get(globalThis, 'window'), oldLocation = Reflect.get(globalThis, 'location'), oldSocket = Reflect.get(globalThis, 'WebSocket')
  Reflect.set(globalThis, 'window', { addEventListener() {}, dispatchEvent() { return true; } })
  Reflect.set(globalThis, 'location', { protocol: 'https:', host: 'example.test' }); Reflect.set(globalThis, 'WebSocket', Socket)
  t.after(() => { if (oldWindow === undefined) Reflect.deleteProperty(globalThis, 'window'); else Reflect.set(globalThis, 'window', oldWindow); if (oldLocation === undefined) Reflect.deleteProperty(globalThis, 'location'); else Reflect.set(globalThis, 'location', oldLocation); if (oldSocket === undefined) Reflect.deleteProperty(globalThis, 'WebSocket'); else Reflect.set(globalThis, 'WebSocket', oldSocket) })
  const tables = await import(`./client.ts?stakes=${Date.now()}`) as typeof import('./client.ts')
  const toasts: string[] = [], commands: string[] = []
  const api = { view: () => ({ connected: true, onboarding: { required: false }, cityId: 'lagos' }), refresh() {}, state: () => ({ message: '' }), toast: (text: string) => { toasts.push(text) },
    fetchJson: async () => ({ ok: true, results: [], ratings: {} }), command: async (type: string) => { commands.push(type); return { ok: true, code: 'ok' } } } as unknown as PanelApi
  tables.start(api); const socket = Socket.instances.at(-1)!; socket.open()
  await new Promise((done) => setTimeout(done, 10)) // the claim made on connecting settles first
  const summary = (stake: number, status = 'open') => ({ id: 'park-chess', venue: 'park', stake, status, seats: [] })
  tables.openTable('park-chess')
  socket.receive({ type: 'table-state', table: summary(500), you: null, result: null })
  socket.sent.length = 0
  tables.sit();
  assert.deepEqual(socket.sent.at(-1), { type: 'table-sit', cityId: 'lagos', table: 'park-chess', stake: 500 }, 'the seat accepts the stake that was on screen')
  tables.setStake(2000)
  assert.deepEqual(socket.sent.at(-1), { type: 'table-stake', cityId: 'lagos', table: 'park-chess', stake: 2000 })
  tables.refreshTable()
  assert.deepEqual(socket.sent.at(-1), { type: 'table-watch', cityId: 'lagos', table: 'park-chess' })
  // A refusal about a stake is shown to the player in the sentence the server gave.
  socket.receive({ type: 'error', code: 'adults_only', reason: 'Playing for a stake is for players who are 18 or older.' })
  assert.equal(tables.T.error, 'Playing for a stake is for players who are 18 or older.')
  socket.receive({ type: 'error', code: 'stake_changed', reason: 'The stake at this table changed.' })
  assert.equal(tables.T.error, 'The stake at this table changed.')
  // A staked game that ends: the life is read again (naira moved), and the toast names the stake's outcome, not a win reward.
  socket.receive({ type: 'table-state', table: summary(500, 'playing'), you: 0, result: null })
  commands.length = 0; toasts.length = 0
  socket.receive({ type: 'table-state', table: summary(500, 'over'), you: 0, result: { text: 'Ada wins.', calledOff: true, winners: [], mine: { won: false, draw: false, human: true, counted: false, stake: { amount: 500, pot: 1000, outcome: 'refunded' } } } })
  await new Promise((done) => setTimeout(done, 10))
  assert.deepEqual(commands, ['missions.refresh'])
  assert.deepEqual(toasts, ['Your ₦500 stake came back. Nobody won or lost.'])
})
