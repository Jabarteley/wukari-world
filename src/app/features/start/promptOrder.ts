// WHO MAY SPEAK IN THE FIRST MINUTES: one prompt asks for attention at a time. The walkthrough goes first; then the offer to
// settle in (housing is the product's first priority, so it is not held back by the goal lines); then the coach's goal line,
// once the offer is put away or done. Pure, so the order is tested without a browser.

export type Prompt = 'tour' | 'settle' | 'coach' | null

export interface PromptFacts {
  /** The walkthrough is on screen, or due and waiting for a quiet moment. */
  tour: boolean
  /** The settle-in offer applies to this life: a connected guest past the creator, who has not put it away this visit. */
  settle: boolean
  /** The coach has a goal line to say. */
  coach: boolean
}

export function promptTurn({ tour, settle, coach }: PromptFacts): Prompt {
  if (tour) return 'tour'
  if (settle) return 'settle'
  return coach ? 'coach' : null
}

/** Does the settle-in offer apply to this life now (before the walkthrough is considered)? */
export const settleWanted = (view: { connected: boolean; onboarding: { guest: boolean; required: boolean } }, dismissed: boolean): boolean =>
  view.connected && view.onboarding.guest && !view.onboarding.required && !dismissed
