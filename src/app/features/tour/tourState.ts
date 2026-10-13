// What the rest of the shell needs to know about the tour, and nothing more: whether it is on screen.
// The attention ring, the coach line and the settle-in offer stay quiet while it is (and resume after).
// The tour itself (TourHost.vue and what it uses) is fetched when it is first needed.
import { reactive } from 'vue'

/**
 * active   the walkthrough is on screen.
 * pending  it is due and has not started yet (waiting for a quiet moment): the things that would compete with it — the
 *          invitation chip, the guest bar, the hint to click the floor, the welcome toast — wait too.
 */
export const tour = reactive({ active: false, pending: false, settleAway: false })

// WHO MAY SPEAK IN THE FIRST MINUTES: one prompt asks for attention at a time. The walkthrough goes first; then the offer to
// settle in (housing is the product's first priority, so the goal lines do not hold it back); then the coach's goal line, once the
// offer is put away (`tour.settleAway`) or done. Pure and kept here, which the coach line and the offer both already load, so the
// order costs no extra file on the startup path.
export type Prompt = 'tour' | 'settle' | 'coach' | null
export function promptTurn({ tour: first, settle, coach }: { tour: boolean; settle: boolean; coach: boolean }): Prompt {
  if (first) return 'tour'
  if (settle) return 'settle'
  return coach ? 'coach' : null
}
/** Does the settle-in offer apply to this life (a connected guest past the creator who has not put it away)? */
export const settleWanted = (view: { connected: boolean; onboarding: { guest: boolean; required: boolean } }, away: boolean): boolean =>
  view.connected && view.onboarding.guest && !view.onboarding.required && !away

/** Funnel events through the consent-gated 'jaw:track' path. No personal data: a step index, never a name or a place. */
export function track(name: string, props: Record<string, string | number | boolean> = {}): void {
  try { globalThis.window?.dispatchEvent(new CustomEvent('jaw:track', { detail: { name, props } })) } catch { /* no listener is fine */ }
}
