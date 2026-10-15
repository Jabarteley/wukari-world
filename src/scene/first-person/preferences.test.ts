import test from 'node:test'
import assert from 'node:assert/strict'
import {
  VIEW_PREFERENCES_DEFAULTS,
  VIEW_PREFERENCES_EVENT,
  VIEW_PREFERENCES_KEY,
  createViewPreferenceStore,
  parseViewPreferences,
} from './preferences.ts'

test('parsing untrusted preferences validates every field independently', () => {
  assert.deepEqual(parseViewPreferences(null), VIEW_PREFERENCES_DEFAULTS)
  assert.deepEqual(parseViewPreferences('{broken'), VIEW_PREFERENCES_DEFAULTS)
  assert.deepEqual(parseViewPreferences(JSON.stringify({ mode: 'first', bob: true, vignette: 'yes', snapTurn: false })), {
    mode: 'first', bob: true, vignette: false, snapTurn: false,
  })
  assert.deepEqual(parseViewPreferences({ mode: 'side', bob: 1, vignette: true, snapTurn: true }), {
    mode: 'third', bob: false, vignette: true, snapTurn: true,
  })
})

test('a failed device write keeps the validated choice for this visit and notifies listeners', () => {
  const events = new EventTarget()
  const storage = {
    getItem: () => JSON.stringify({ mode: 'third', bob: false }),
    setItem: () => { throw new Error('blocked') },
  }
  const store = createViewPreferenceStore(storage, events)
  let changes = 0, eventsSeen = 0
  const stop = store.onChange(() => { changes += 1 })
  events.addEventListener(VIEW_PREFERENCES_EVENT, () => { eventsSeen += 1 })

  assert.equal(store.set({ mode: 'first', bob: true }), false)
  assert.deepEqual(store.read(), { mode: 'first', bob: true, vignette: false, snapTurn: false })
  assert.equal(changes, 1)
  assert.equal(eventsSeen, 1)
  stop()
})

test('successful writes use the device key and cross-tab changes stop after unsubscribe', () => {
  let writtenKey = '', writtenValue = ''
  const storage = {
    getItem: () => null,
    setItem: (key: string, value: string) => { writtenKey = key; writtenValue = value },
  }
  const events = new EventTarget()
  const store = createViewPreferenceStore(storage, events)
  let changes = 0
  const stop = store.onChange(() => { changes += 1 })

  assert.equal(store.set({ vignette: true }), true)
  assert.equal(writtenKey, VIEW_PREFERENCES_KEY)
  assert.deepEqual(JSON.parse(writtenValue), { mode: 'third', bob: false, vignette: true, snapTurn: false })

  const crossTab = new Event('storage') as StorageEvent
  Object.defineProperties(crossTab, {
    key: { value: VIEW_PREFERENCES_KEY },
    newValue: { value: JSON.stringify({ mode: 'first', snapTurn: true }) },
  })
  events.dispatchEvent(crossTab)
  assert.deepEqual(store.read(), { mode: 'first', bob: false, vignette: false, snapTurn: true })
  assert.equal(changes, 2)

  stop()
  events.dispatchEvent(crossTab)
  assert.equal(changes, 2)
})
