// The one-tap "Share" of a moment (a line of the public record: an election result, a law, a new party, a removal). The growth store
// and its share code are fetched on the first press (like shareInvite.ts), so none of it is in the first download. The server
// reads the entry itself from the public record and writes the card's words; the browser sends only the entry's number.
// The same hook serves the city gist of a later phase: any public item with a stable number is a kind 'news' share.
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
