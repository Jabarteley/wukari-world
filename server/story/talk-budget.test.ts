import assert from 'node:assert/strict'
import test from 'node:test'
import { COMPANION_PRIMARY, COMPANION_FALLBACK } from '../models/catalog.ts'
import type { Entry, Provider } from '../models/catalog.ts'
import type { AskInput } from '../models/router.ts'
import { talkFitsBudget } from './talk-budget.ts'

const input = (system = 'a'.repeat(58), question = 'b'.repeat(90)): AskInput => ({ purpose: 'agent-talk', messages: [{ role: 'system', content: system }, { role: 'user', content: question }], maxTokens: 16, carriesPlayerWords: true })
const routing = (entries: Entry[], providers: Provider[] = ['gateway']) => ({ listFor: () => entries, hasKey: (provider: Provider) => providers.includes(provider) })
const primary: Entry = { provider: 'gateway', id: COMPANION_PRIMARY }
const fallback: Entry = { provider: 'gateway', id: COMPANION_FALLBACK }

test('the sum of all usable paid candidates must stay at or below ninety micro', () => {
  assert.equal(talkFitsBudget(input(), routing([primary, fallback])), true)
  assert.equal(talkFitsBudget(input('a'.repeat(59)), routing([primary, fallback])), true)
  assert.equal(talkFitsBudget(input('a'.repeat(60)), routing([primary, fallback])), false)
  const long = input('a'.repeat(160))
  assert.equal(talkFitsBudget(long, routing([primary])), true)
  assert.equal(talkFitsBudget(long, routing([fallback])), true)
  assert.equal(talkFitsBudget(long, routing([primary, fallback])), false)
})

test('UTF-8 bytes plus framing, rather than code-unit estimates, govern admission', () => {
  assert.equal(talkFitsBudget(input('a'.repeat(58), 'é'.repeat(45)), routing([primary, fallback])), true)
  assert.equal(talkFitsBudget(input('a'.repeat(58), '界'.repeat(45)), routing([primary, fallback])), false)
  assert.equal(talkFitsBudget(input('a'.repeat(160), 'b'.repeat(91)), routing([primary])), false)
  assert.equal(talkFitsBudget({ ...input(), maxTokens: 32 }, routing([primary])), false)
})

test('unknown available prices refuse, unavailable/free entries do not expand the paid chain', () => {
  assert.equal(talkFitsBudget(input(), routing([{ provider: 'openrouter', id: COMPANION_PRIMARY }])), false)
  assert.equal(talkFitsBudget(input(), routing([{ provider: 'gateway', id: 'fixture/text:free' }])), false)
  assert.equal(talkFitsBudget(input(), routing([primary, { provider: 'gateway', id: 'unknown/paid' }])), false)
  assert.equal(talkFitsBudget(input(), routing([primary, { provider: 'openrouter', id: 'unknown/paid' }])), true)
})

test('greater host ceilings apply to every fallback and cannot lower catalogued prices', () => {
  const ceiling = (key: string) => key === 'COMPANION_PRICE_IN_PER_M' ? '0.2' : ''
  assert.equal(talkFitsBudget(input(), routing([primary, fallback]), ceiling), false)
  assert.equal(talkFitsBudget(input(), routing([primary, fallback]), () => '0'), true)
  assert.equal(talkFitsBudget(input(), routing([primary, fallback]), () => '-10'), true)
})


test('admission includes both message envelopes and reply framing at the host price ceiling', () => {
  const ceiling = (key: string) => key === 'COMPANION_PRICE_IN_PER_M' ? '0.22' : key === 'COMPANION_PRICE_OUT_PER_M' ? '1.32' : ''
  // With 217 content bytes, the full reservation is 90 micro; one more byte needs 91.
  assert.equal(talkFitsBudget(input('a'.repeat(127)), routing([primary]), ceiling), true)
  assert.equal(talkFitsBudget(input('a'.repeat(128)), routing([primary]), ceiling), false)
  // A shorter framing allowance incorrectly admits this two-model chain at 90 rather than 100.
  assert.equal(talkFitsBudget(input('a'.repeat(90)), routing([primary, fallback])), false)
  const lowerCeiling = (key: string) => key === 'COMPANION_PRICE_IN_PER_M' ? '0.165' : key === 'COMPANION_PRICE_OUT_PER_M' ? '0.66' : ''
  assert.equal(talkFitsBudget(input('a'.repeat(160)), routing([primary]), lowerCeiling), true)
})
