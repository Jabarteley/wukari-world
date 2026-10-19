// Whether this device's player has a location badge, remembered on the device from the last feed read that said so (the Feed app, My
// profile, the first-minute strip), so the Phone can put Feed first on a return visit without asking the server first. Only yes or no is
// kept: never the city, the area or anything else of the badge. Storage is passed in, so it runs under node --test.
type Store = Pick<Storage, 'getItem' | 'setItem' | 'removeItem'> | null | undefined

export const BADGE_KEY = 'allworld-badge-v1'
const storage = (): Store => { try { return globalThis.localStorage } catch { return null } }

export function keepBadge(on: boolean, store: Store = storage()): void {
  try { if (on) store?.setItem(BADGE_KEY, '1'); else store?.removeItem(BADGE_KEY) } catch { /* private mode: the Phone keeps its usual order */ }
}
export function hasBadge(store: Store = storage()): boolean {
  try { return store?.getItem(BADGE_KEY) === '1' } catch { return false }
}
