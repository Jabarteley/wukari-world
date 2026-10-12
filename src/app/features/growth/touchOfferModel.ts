// The one offer of Stay in touch right after an account is made. Pure: storage and the page are passed in.
// Made once per account: the sign-in that creates it leaves a mark on this device, and the mark is taken away when the
// offer is answered or closed. The offer never switches anything on; the Stay in touch app has every question.
export const TOUCH_OFFER_KEY = 'allworld-touch-offer'
export const TOUCH_OFFER_WORDS = Object.freeze({ title: 'Stay in touch', text: 'Hear when a friend is waiting or your character needs you. Optional, and off until you say so.', action: 'Open Stay in touch' })

type Reader = Pick<Storage, 'getItem'> | null | undefined
type Writer = Pick<Storage, 'setItem' | 'removeItem'> | null | undefined
/** A sign-in made an account: the offer is owed. */
export function owe(storage: Writer): void { try { storage?.setItem(TOUCH_OFFER_KEY, 'owed') } catch { /* no offer: storage is not there */ } }
export const owed = (storage: Reader): boolean => { try { return storage?.getItem(TOUCH_OFFER_KEY) === 'owed' } catch { return false } }
/** Answered, closed or taken up: not offered again. */
export function settle(storage: Writer): void { try { storage?.removeItem(TOUCH_OFFER_KEY) } catch { /* shown for this visit only: the caller holds it in memory too */ } }

export interface OfferFacts {
  owed: boolean
  /** Signed in (an account, not a guest). */
  signedIn: boolean
  connected: boolean
  /** The character creator still holds the life. */
  creating: boolean
  tour: boolean
  /** A sheet is open, an activity or trip is running, a call is up. */
  busy: boolean
  venue: boolean
}
export const offerDue = (f: OfferFacts): boolean => f.owed && f.signedIn && f.connected && !f.creating && !f.tour && !f.busy && f.venue
