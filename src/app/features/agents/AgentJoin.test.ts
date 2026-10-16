// AgentJoin.vue never keeps a key: no browser storage, no address changes.
import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'

test('AgentJoin.vue has no localStorage, sessionStorage, cookie or history writes', () => {
  const source = readFileSync(new URL('./AgentJoin.vue', import.meta.url), 'utf8')
  for (const word of ['localStorage', 'sessionStorage', 'document.cookie', 'indexedDB', 'history.', 'location.search', 'location.hash']) assert.ok(!source.includes(word), word)
})
