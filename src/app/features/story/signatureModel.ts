import type { SignatureGameView } from '../../../types/story-http.ts'
export type { SignatureItemView, SignatureGameView, SignatureFailure, SignatureResult } from '../../../types/story-http.ts'

export function naira(value: number): string {
  return `₦${Math.max(0, Math.round(value)).toString().replace(/\B(?=(\d{3})+(?!\d))/g, ',')}`
}

export function offerFromInput(value: string): number | null {
  const clean = value.trim().replaceAll(',', '')
  if (!/^\d{1,10}$/.test(clean)) return null
  const offer = Number(clean)
  return Number.isSafeInteger(offer) && offer <= 1_000_000_000 ? offer : null
}

export function verdictText(view: Pick<SignatureGameView, 'verdict' | 'item'>): string {
  const verdict = view.verdict, item = view.item
  if (!verdict || !item) return ''
  if (verdict.kind === 'accept') return `Agreed at ${naira(verdict.price)}. This is a practice quote only.`
  if (verdict.kind === 'counter') return `Counteroffer: ${naira(verdict.price)}.`
  if (verdict.kind === 'refuse') return `Offer refused. The seller is still asking ${naira(verdict.price)}.`
  return `Final practice price: ${naira(verdict.price)}.`
}
