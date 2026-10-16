/**
 * OWNER: games (real-time)
 * GAME CONTROLLERS, the browser part: watches for a pad (the Gamepad API), reads it once a frame for the open game (./pad.ts), and
 * tells the screen what changed through the same callbacks its touch and keyboard controls use. Rumble where the browser allows it
 * (the pad's vibration actuator), off when the player turned it off. Settings (dead zone, rumble, remapped buttons) are kept on the
 * device under PAD_KEY. A browser without the Gamepad API gets a poller that never fires.
 */
import { PAD_KEY, START, bindingOf, changes, cleanPadSettings, padName, readPad } from './pad.ts'
import type { PadControls, PadLike, PadRead, PadSettings } from './pad.ts'

export interface PadHandlers {
  /** An action's button went down (true) or up (false). */
  action(id: string, down: boolean): void
  /** The stick (or d-pad) moved: -1..1, y down, after the dead zone. */
  stick?(x: number, y: number): void
  /** Start was pressed: the screen's menu (a live match cannot be paused: the server judges it in real time). */
  menu?(): void
  /** A pad was connected (its short name) or the last one went (null). */
  connected?(name: string | null): void
}

interface RumbleActuator { playEffect?(type: 'dual-rumble', params: { duration: number; strongMagnitude: number; weakMagnitude: number; startDelay?: number }): Promise<unknown> }
type BrowserPad = PadLike & { vibrationActuator?: RumbleActuator | null }

export function loadPadSettings(): PadSettings {
  try { return cleanPadSettings(JSON.parse(localStorage.getItem(PAD_KEY) ?? 'null')) } catch { return cleanPadSettings(null) }
}
export function savePadSettings(settings: PadSettings): void {
  try { localStorage.setItem(PAD_KEY, JSON.stringify(settings)) } catch { /* private mode: the settings last this visit */ }
}

const pads = (): BrowserPad[] => {
  const nav = globalThis.navigator as Navigator | undefined
  if (typeof nav?.getGamepads !== 'function') return []
  return [...nav.getGamepads()].filter((p): p is Gamepad => !!p && p.connected) as unknown as BrowserPad[]
}
export const padSupported = (): boolean => typeof globalThis.navigator?.getGamepads === 'function'
/** The name of a connected pad, or null. */
export const connectedPad = (): string | null => { const p = pads()[0]; return p ? padName(p.id) : null }

export interface PadPoller {
  /** Shake the pad: `strength` 0..1 for `ms`. Nothing when there is no pad, no actuator, or rumble is off. */
  rumble(strength: number, ms: number): void
  /** Read the settings again (after the controller panel changed them). */
  reload(): void
  stop(): void
}

export function createPadPoller(controls: PadControls, handlers: PadHandlers): PadPoller {
  let settings = loadPadSettings()
  let binding = bindingOf(controls, settings.bind[controls.game])
  let last: PadRead | null = null, lastStick: [number, number] = [0, 0], startDown = false
  let raf = 0, stopped = false, active: BrowserPad | null = null
  const supported = padSupported() && typeof requestAnimationFrame === 'function'

  const release = (): void => {
    if (last) for (const id of Object.keys(last.held)) if (last.held[id]) handlers.action(id, false)
    if (lastStick[0] || lastStick[1]) handlers.stick?.(0, 0)
    last = null; lastStick = [0, 0]
  }
  const poll = (): void => {
    if (stopped) return
    raf = requestAnimationFrame(poll)
    // The pad used last stays the one read while it is connected; otherwise the first with anything held.
    const all = pads()
    const pad = all.find((p) => p.index === active?.index) ?? all[0] ?? null
    if (!pad) { if (active) { release(); active = null } return }
    active = pad
    const now = readPad(pad, controls, binding, settings.zone)
    const { pressed, released } = changes(last, now)
    for (const id of released) handlers.action(id, false)
    for (const id of pressed) handlers.action(id, true)
    if (now.stick[0] !== lastStick[0] || now.stick[1] !== lastStick[1]) handlers.stick?.(now.stick[0], now.stick[1])
    const start = !!pad.buttons[START]?.pressed
    if (start && !startDown) handlers.menu?.()
    startDown = start
    last = now; lastStick = now.stick
  }
  const onConnect = (event: Event): void => { const pad = (event as GamepadEvent).gamepad; handlers.connected?.(pad ? padName(pad.id) : connectedPad()) }
  const onDisconnect = (): void => { release(); active = null; handlers.connected?.(connectedPad()) }
  if (supported) {
    addEventListener('gamepadconnected', onConnect)
    addEventListener('gamepaddisconnected', onDisconnect)
    raf = requestAnimationFrame(poll)
  }
  return {
    rumble(strength, ms) {
      if (!settings.rumble || !active) return
      const s = Math.max(0, Math.min(1, strength))
      try { void active.vibrationActuator?.playEffect?.('dual-rumble', { duration: Math.max(10, Math.min(1000, ms)), strongMagnitude: s, weakMagnitude: Math.min(1, s * 0.6 + 0.2) })?.catch(() => {}) } catch { /* a pad that cannot rumble */ }
    },
    reload() { settings = loadPadSettings(); binding = bindingOf(controls, settings.bind[controls.game]) },
    stop() {
      stopped = true
      if (raf) cancelAnimationFrame(raf)
      if (supported) { removeEventListener('gamepadconnected', onConnect); removeEventListener('gamepaddisconnected', onDisconnect) }
      release()
    },
  }
}
