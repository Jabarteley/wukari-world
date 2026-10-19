// The one-tap "Share" of a moment (a line of the public record: an election result, a law, a new party, a removal). The growth store
// and its share code are fetched on the first press (like shareInvite.ts), so none of it is in the first download. The server
// reads the entry itself from the public record and writes the card's words; the browser sends only the entry's number.
// The same hook serves the city gist of a later phase: any public item with a stable number is a kind 'news' share.
// A street card (shareStreet) is the same one tap: the browser sends a city id and a place id, the server names them from the rules.
import type { ShareKind } from '../../../types/growth.ts'
import type { RecordKind } from '../../../types/records.ts'

/** The share kind of a public record entry, or null when it is not shared as a card (a ruling can name a person who was tried). */
export function momentKind(kind: RecordKind): Extract<ShareKind, 'election' | 'news'> | null {
  return kind === 'term' ? 'election' : kind === 'law' || kind === 'party' || kind === 'impeachment' ? 'news' : null
}

/** Share one entry of the public record. `failed` is told when the share code could not be fetched. */
export function shareMoment(kind: RecordKind, n: number, failed: () => void): void {
  const asked = momentKind(kind)
  if (!asked) return
  void import('./useGrowth.ts').then(({ useGrowth }) => useGrowth().share(asked, { record: n, surface: 'other' })).catch(failed)
}

/** Share one line of the city gist (its ledger number); the server reads the line itself. */
export function shareGist(n: number, failed: () => void): void {
  void import('./useGrowth.ts').then(({ useGrowth }) => useGrowth().share('gist', { record: n, surface: 'other' })).catch(failed)
}

/** Share a street (a local unit or district of a city, or a city alone): the server names it from the city's rules, the card leads to its address. */
export function shareStreet(street: { city?: string; place?: string }, failed: () => void, surface = 'other'): void {
  void import('./useGrowth.ts').then(({ useGrowth }) => useGrowth().share('street', { ...street, surface })).catch(failed)
}
