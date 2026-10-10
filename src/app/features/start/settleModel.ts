// OPENING THE SETTLE-IN FLOW FROM WHEREVER A LIFE WAS TOLD IT MUST SETTLE: one function for every notice, button and
// toast (SettleNotice.vue, the toast action, the map's travel card, the home screen's entry). It opens the existing
// "Make this life yours" panel and remembers the sheet the player came from, so that closing or finishing the flow
// puts them back there with the refused action ready to be tried again.
import { reactive } from 'vue'
import { dismissToast, toasts } from '../../state/toasts.ts'
import type { Shell } from '../../state/shell.ts'
import type { Sheet } from '../../types/panel.ts'

/** Words of the persistent entry, the profile line and the hint beside a control that cannot work yet. */
export const SETTLE_ENTRY = { title: 'Settle in: get your home', hint: 'Pick your traits, your dream and where you live. It takes a minute and you keep everything you have.' } as const
/** The short hint beside a control that needs a settled life. */
export const SETTLE_FIRST_HINT = 'Settle in first'

/** The standing entry can be put away for this visit; it is back with the next one while the life is a guest. */
export const settleEntry = reactive({ dismissed: false })

let cameFrom: Sheet | null = null

/** Open the settle-in flow, from the sheet that is open now (if any). */
export function startSettling(shell: Pick<Shell, 'sheet' | 'open'>, params?: unknown): void {
  const open = shell.sheet.value
  // Only another sheet is worth coming back to: the settle-in flow itself and an empty screen are not.
  // The refusals that sent the player here are answered: their toasts (with the button) go.
  for (const item of [...toasts.value]) if (item.action) dismissToast(item.id)
  cameFrom = open && !(open.kind === 'panel' && open.id === 'onboarding') ? open : null
  shell.open('onboarding', params)
}

/** The settle-in flow has closed (finished or "Not now"): bring back the sheet it replaced, if nothing else has opened since. */
export function returnFromSettling(shell: Pick<Shell, 'sheet'>): void {
  const back = cameFrom
  cameFrom = null
  if (back && shell.sheet.value === null) shell.sheet.value = back
}
