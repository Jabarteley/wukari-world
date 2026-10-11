// Pressing an Invite control (the HUD button, the online pill when the player is alone): the growth store and its share code are
// fetched on the first press (and ahead of that once the game is idle: InviteNudge.vue loads them), so they are not in the first
// download. A press while they are on the way is not lost: it waits for them, and the control says it is busy meanwhile.
import { computed, ref } from 'vue'
import { sharedGrowth } from './growthShared.ts'

const waiting = ref(false)

/** An invitation is being prepared, or the code for it is on its way: the controls are disabled. */
export const inviteBusy = computed(() => waiting.value || (sharedGrowth.value?.state.busy ?? null) !== null)

/** Start an invitation from a control. `failed` is told when the share code could not be fetched. */
export function shareInvite(surface: 'hud' | 'prompt', failed: () => void): void {
  if (inviteBusy.value) return
  waiting.value = true
  void import('./useGrowth.ts')
    .then(({ useGrowth }) => useGrowth().share('invite', { surface }))
    .catch(failed)
    .finally(() => { waiting.value = false })
}
