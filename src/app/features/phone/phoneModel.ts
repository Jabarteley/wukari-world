// The Phone sheet's scope: when a sheet that holds per-identity state must be rebuilt. Pure, tested without a browser.
// The home screen's lists (dock, pages, badges, notifications) are in ./phoneHomeModel.ts, fetched with the Phone.
import { ref, watch } from 'vue'
import type { Ref } from 'vue'

/**
 * Whether a sheet that holds per-identity state must be rebuilt when the identity or the city under it changes.
 * Going from a session (or a city) to a different one is a real switch: sign-in, sign-out, travel. The first session
 * given to a visitor who had none, and a city chosen while there was still no session, are the visitor's own
 * start (the character creator's Play) and leave an open sheet alone.
 */
export function scopeSwitched(before: { session: string | null; city: string }, after: { session: string | null; city: string }): boolean {
  if (before.session !== null && after.session !== before.session) return true
  return before.session !== null && after.city !== before.city
}
/**
 * A number that changes exactly when `scopeSwitched` says so: the key of the sheet's body. While `frozen()` is true (the
 * visitor's own start is in flight: the session, the life and the city all arrive in an order of the network's choosing) no
 * change counts, so the creator that sent the start is never rebuilt by it. Read at the moment of each change.
 */
export function useSheetScope(session: Ref<string | null>, city: Ref<string>, frozen: () => boolean = () => false): Ref<number> {
  const epoch = ref(0)
  watch([session, city], ([id, now], [wasId, was]) => { if (!frozen() && scopeSwitched({ session: wasId, city: was }, { session: id, city: now })) epoch.value += 1 }, { flush: 'sync' })
  return epoch
}
