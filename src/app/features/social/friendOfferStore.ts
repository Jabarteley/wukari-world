// The browser's memory of the friendship cards it has shown (friendOfferModel.ts), kept in localStorage: nothing about it is sent anywhere.
// Storage that is full or off only means a card may be shown again, never that anything breaks.
import { cleanMemory, freshMemory } from './friendOfferModel.ts'
import type { OfferMemory } from './friendOfferModel.ts'

const KEY = 'aw-friend-offers'
let memory: OfferMemory | null = null

/** The one memory of this page, read from storage the first time. */
export function offerMemory(now: number = Date.now()): OfferMemory {
  if (memory) return memory
  let raw: unknown = null
  try { raw = JSON.parse(globalThis.localStorage?.getItem(KEY) ?? 'null') } catch { /* nothing kept, or unreadable */ }
  return (memory = raw === null ? freshMemory() : cleanMemory(raw, now))
}
export function saveOfferMemory(): void { try { if (memory) globalThis.localStorage?.setItem(KEY, JSON.stringify(memory)) } catch { /* it will be shown again */ } }
/** For tests: forget the page's memory. */
export function resetOfferMemory(): void { memory = null }
