import { isFree, priceOf, PRICES } from '../models/catalog.ts'
import type { AskInput, Router } from '../models/router.ts'

type Routing = Pick<Router, 'listFor' | 'hasKey'>
const ceiling = (value: string): number => {
  const number = Number(value)
  return value.trim() && Number.isFinite(number) && number >= 0 ? number : 0
}

/** Existing-table estimate across the usable paid chain, not a provider invoice guarantee. */
export function talkFitsBudget(input: AskInput, router: Routing, env: (name: string) => string = () => ''): boolean {
  if (input.purpose !== 'agent-talk' || !input.carriesPlayerWords || input.maxTokens !== 16 || input.messages.length !== 2
    || input.messages[0]?.role !== 'system' || input.messages[1]?.role !== 'user') return false
  const bytes = input.messages.reduce((sum, message) => sum + new TextEncoder().encode(message.content).byteLength, 0)
  if (bytes > 250) return false
  const entries = router.listFor(input.purpose).filter(entry => router.hasKey(entry.provider) && !isFree(entry.id))
  if (!entries.length) return false
  const tokens = bytes + 32 * input.messages.length + 32
  const inputCeiling = ceiling(env('COMPANION_PRICE_IN_PER_M'))
  const outputCeiling = ceiling(env('COMPANION_PRICE_OUT_PER_M'))
  let total = 0
  for (const entry of entries) {
    if (!Object.hasOwn(PRICES, entry.id)) return false
    const price = priceOf(entry.id)
    total += Math.ceil(tokens * Math.max(price.input, inputCeiling) + 16 * Math.max(price.output, outputCeiling))
    if (!Number.isSafeInteger(total) || total > 90) return false
  }
  return true
}
