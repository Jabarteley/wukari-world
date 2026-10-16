/**
 * OWNER: games (real-time)
 * A game screen's controller, in one call: the poller (./poller.ts) runs while the screen is mounted, "Controller connected" is
 * said once, Start opens the controller panel, and `rumble` shakes the pad. Give the returned object to ArenaStage (`:pad`), which
 * shows the Controller button and panel. The handlers are the screen's own touch functions, so a pad sends the same input.
 */
import { onBeforeUnmount, onMounted, ref } from 'vue'
import type { Ref } from 'vue'
import { createPadPoller, connectedPad, padSupported } from './poller.ts'
import type { PadHandlers, PadPoller } from './poller.ts'
import type { PadControls } from './pad.ts'

export interface ScreenPad {
  controls: PadControls
  /** The Controller panel is open. */
  panel: Ref<boolean>
  /** The connected pad's short name, or null. */
  connected: Ref<string | null>
  supported: boolean
  rumble(strength: number, ms: number): void
  /** After the panel changed the settings. */
  reload(): void
}

export function usePad(controls: PadControls, handlers: Omit<PadHandlers, 'menu' | 'connected'>, toast?: (text: string) => void): ScreenPad {
  const panel = ref(false), connected = ref<string | null>(null)
  let poller: PadPoller | null = null
  onMounted(() => {
    connected.value = connectedPad()
    poller = createPadPoller(controls, {
      ...handlers,
      menu: () => { panel.value = !panel.value },
      connected: (name) => { const was = connected.value; connected.value = name; if (name && !was) toast?.(`Controller connected: ${name}`) },
    })
  })
  onBeforeUnmount(() => { poller?.stop(); poller = null })
  return { controls, panel, connected, supported: padSupported(), rumble: (s, ms) => poller?.rumble(s, ms), reload: () => poller?.reload() }
}

/** A stick axis as a held direction with a little hysteresis, so a thumb resting near the edge does not flicker. */
export function axisDir(value: number, was: -1 | 0 | 1, on = 0.45, off = 0.3): -1 | 0 | 1 {
  if (was !== 0 && Math.sign(value) === was && Math.abs(value) > off) return was
  return value > on ? 1 : value < -on ? -1 : 0
}
