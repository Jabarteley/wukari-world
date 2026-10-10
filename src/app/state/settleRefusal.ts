// "This needs a settled life": the one place that decides when a refusal means a guest of the quick start must settle in
// first, and the one hook the shell fills in to open the settle-in flow. It is read at startup (the toast layer), so it
// stays tiny; the flow itself and its notice component load only when they are used (features/start/settleModel.ts).
import type { ToastAction } from './toasts.ts'
import type { OnboardingView } from '../../types/view.ts'

/** Words on every button that opens the settle-in flow from a refusal. */
export const SETTLE_LABEL = 'Settle in now'

/**
 * A refusal means "settle in first" by its code, never its text: 'settle_required', or, on a life that is a guest playing,
 * 'onboarding_required' or 'plot_required' (a life held for its look has the quick start's own gate).
 */
export const needsSettling = (code: unknown, onboarding?: Pick<OnboardingView, 'guest' | 'required'> | null): boolean =>
  code === 'settle_required' || ((code === 'onboarding_required' || code === 'plot_required') && onboarding?.guest === true && onboarding.required !== true)

/** The button a refusal's toast carries when it is a settle-in matter (undefined otherwise). */
export const settleToastAction = (code: unknown, onboarding?: Pick<OnboardingView, 'guest' | 'required'> | null): ToastAction | undefined =>
  needsSettling(code, onboarding) ? { label: SETTLE_LABEL, run: openSettleFlow } : undefined

/** Filled in by the shell (state/app.ts): opens the settle-in flow and remembers the sheet to come back to. */
export const settleHandler: { run: (() => void) | null } = { run: null }
export const openSettleFlow = (): void => { settleHandler.run?.() }
