// When to offer notifications: after a good moment, never on arrival. A good moment is a win at a table (the win count
// went up) or a new friend (the friend list grew), seen while the player is in the game. The offer is a slim, closable bar
// whose button opens Stay in touch, which has the browser's own prompt behind a tap (src/ui/push-client.ts). It is made once;
// a "not now" waits 30 days. Pure: storage and the page are passed in, so it is tested without a browser.
export const NOTIFY_ASK_KEY = 'allworld-notify-ask'
export const NOTIFY_ASK_SNOOZE_MS = 30 * 86400000
export const NOTIFY_ASK_WORDS = Object.freeze({
  'table-win': { text: 'Nice win. Want a ping when friends invite you to a table?', action: 'Set up' },
  friend: { text: 'You have a new friend. Want to hear when they write?', action: 'Set up' },
})
export type AskMoment = keyof typeof NOTIFY_ASK_WORDS

/** What the player has, read from the view; two reads are compared. `null` fields are unknown (not loaded yet), which is never a moment. */
export interface AskFacts { tablesWon: number | null; friends: number | null }

/** The moment between two reads, or null. The first read is only a baseline: arriving with wins and friends is not a moment. */
export function askMoment(before: AskFacts | null, now: AskFacts): AskMoment | null {
  if (!before) return null
  if (before.tablesWon !== null && now.tablesWon !== null && now.tablesWon > before.tablesWon) return 'table-win'
  if (before.friends !== null && now.friends !== null && now.friends > before.friends) return 'friend'
  return null
}

type Reader = Pick<Storage, 'getItem'> | null | undefined
type Writer = Pick<Storage, 'setItem'> | null | undefined
/** Kept on this device: 'done' (taken up), or the ms until which a "not now" holds. */
export function askHeld(storage: Reader, now: number): boolean {
  try {
    const raw = storage?.getItem(NOTIFY_ASK_KEY)
    return raw === 'done' || (raw !== null && raw !== undefined && Number(raw) > now)
  } catch { return false }
}
export function askAnswer(storage: Writer, now: number, taken: boolean): void { try { storage?.setItem(NOTIFY_ASK_KEY, taken ? 'done' : String(now + NOTIFY_ASK_SNOOZE_MS)) } catch { /* shown for this visit only */ } }

export interface AskState {
  moment: AskMoment | null
  /** pushState() of src/ui/push-client.ts: only 'ready' can be asked; an iPhone not on the home screen, no support, or a "no" cannot. */
  push: 'ready' | 'unsupported' | 'needs-install' | 'blocked' | 'unknown'
  held: boolean
  signedIn: boolean
  connected: boolean
  /** The character creator, the tour, a sheet, an activity or a call is in front. */
  busy: boolean
}
/** Whether the offer is shown now. */
export const askDue = (s: AskState): boolean => s.moment !== null && s.push === 'ready' && !s.held && s.signedIn && s.connected && !s.busy
