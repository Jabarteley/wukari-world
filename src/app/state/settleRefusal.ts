// "This needs a settled life": the one place that decides when a refusal means a guest of the quick start must settle in
// first, and the one hook the shell fills in to open the settle-in flow. It is read at startup (the toast layer), so it
// stays tiny; the flow itself and its notice component load only when they are used (features/start/settleModel.ts).
import type { ToastAction } from './toasts.ts'
import type { OnboardingView } from '../../types/view.ts'

/** Words on every button that opens the settle-in flow from a refusal. */
export const SETTLE_LABEL = 'Settle in now'

/** The codes a settle-in refusal can carry; whether they still matter depends on the life (needsSettling). */
export const isSettleCode = (code: unknown): boolean => code === 'settle_required' || code === 'onboarding_required' || code === 'plot_required'

/**
 * A refusal means "settle in first" by its code, never its text: 'settle_required', or, on a life that is a guest playing,
 * 'onboarding_required' or 'plot_required' (a life held for its look has the quick start's own gate). A life that is not a
 * guest never needs it: the answer follows the life now, not the last refusal.
 */
export const needsSettling = (code: unknown, onboarding?: Pick<OnboardingView, 'guest' | 'required'> | null): boolean =>
  // Asked of the life as it is now: once it has settled in there is nothing left to settle, whatever the last refusal said.
  onboarding?.guest === false ? false
    : code === 'settle_required' || ((code === 'onboarding_required' || code === 'plot_required') && onboarding?.guest === true && onboarding.required !== true)

/** The button a refusal's toast carries when it is a settle-in matter (undefined otherwise). */
export const settleToastAction = (code: unknown, onboarding?: Pick<OnboardingView, 'guest' | 'required'> | null): ToastAction | undefined =>
  needsSettling(code, onboarding) ? { label: SETTLE_LABEL, run: openSettleFlow } : undefined

/** Filled in by the shell (state/app.ts): opens the settle-in flow and remembers the sheet to come back to. */
export const settleHandler: { run: ((back?: () => void) => void) | null } = { run: null }
/** `back` brings the player to where they were, when that is not a sheet (the map's travel card). */
export const openSettleFlow = (back?: () => void): void => { settleHandler.run?.(back) }
