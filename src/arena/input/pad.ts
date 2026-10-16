/**
 * OWNER: games (real-time)
 * GAME CONTROLLERS, the pure part: how a pad read through the browser's Gamepad API becomes a game's actions. Shared by every
 * cartridge (docs/CARTRIDGES.md, "Controllers"), tested with fake pads (./pad.test.ts). The browser side is ./poller.ts.
 *
 * EQUAL TERMS. A pad never gives a player anything a thumb cannot: each game turns pad actions into exactly the input its touch
 * controls send (Fight's and Race's buttons, Football's stick heading), through the same InputPipe, so the server sees one kind of
 * input and replays stay exact. The stick is read with a radial dead zone and quantised by the game like the touch stick.
 *
 * THE STANDARD MAPPING (the W3C "standard" gamepad layout, which Chrome on Android and desktop browsers give most pads):
 *   buttons 0 A (bottom), 1 B (right), 2 X (left), 3 Y (top), 4 LB, 5 RB, 6 LT, 7 RT, 8 Back/Select, 9 Start, 10 L3, 11 R3,
 *   12 up, 13 down, 14 left, 15 right, 16 Home; axes 0/1 left stick x/y, 2/3 right stick. A pad with another layout gets the
 *   same indexes as a best guess, and the remap screen fixes the rest.
 */

export interface PadButtonLike { pressed: boolean; value: number }
export interface PadLike { id: string; index: number; mapping: string; connected: boolean; buttons: readonly PadButtonLike[]; axes: readonly number[] }

export const BUTTON_NAMES: readonly string[] = ['A', 'B', 'X', 'Y', 'LB', 'RB', 'LT', 'RT', 'Back', 'Start', 'L3', 'R3', 'Up', 'Down', 'Left', 'Right', 'Home']
export const START = 9, BACK = 8, UP = 12, DOWN = 13, LEFT = 14, RIGHT = 15
export const buttonName = (index: number): string => BUTTON_NAMES[index] ?? `Button ${index + 1}`

/** One thing a player can do in a game, with the buttons it is on unless the player remapped it. */
export interface PadAction { id: string; label: string; buttons: readonly number[] }
/** A game's pad controls: its actions, and whether the left stick (and d-pad) moves. */
export interface PadControls { game: string; actions: readonly PadAction[]; stick: boolean }

export const DEFAULT_DEAD_ZONE = 0.22
/** Analogue triggers count as pressed past this. */
export const TRIGGER_ON = 0.35

/** A radial dead zone with the rest rescaled, so a small push still moves and a full push reaches 1. */
export function deadZone(x: number, y: number, zone: number = DEFAULT_DEAD_ZONE): [number, number] {
  const fx = Number.isFinite(x) ? x : 0, fy = Number.isFinite(y) ? y : 0
  const len = Math.hypot(fx, fy)
  if (len <= zone) return [0, 0]
  const scaled = Math.min(1, (len - zone) / (1 - zone))
  return [(fx / len) * scaled, (fy / len) * scaled]
}

const isDown = (b: PadButtonLike | undefined): boolean => !!b && (b.pressed || b.value >= TRIGGER_ON)

/** Which buttons each action is on: the player's own binding where they made one, the game's default otherwise. */
export function bindingOf(controls: PadControls, own: Readonly<Record<string, readonly number[]>> = {}): Record<string, readonly number[]> {
  const out: Record<string, readonly number[]> = {}
  for (const action of controls.actions) {
    const mine = own[action.id]
    // An empty list is kept: the action lost its button to another one in a remap. Only an action left out takes the default.
    out[action.id] = Array.isArray(mine) && mine.every((n) => Number.isInteger(n) && n >= 0 && n < 32) ? mine : action.buttons
  }
  return out
}

export interface PadRead {
  /** The left stick after the dead zone, or the d-pad when the stick is at rest; -1..1, y down. */
  stick: [number, number]
  /** Per action id: held now. */
  held: Record<string, boolean>
}

/** Read one pad for a game. The d-pad stands in for the stick when the stick is at rest. */
export function readPad(pad: PadLike, controls: PadControls, binding: Readonly<Record<string, readonly number[]>>, zone: number = DEFAULT_DEAD_ZONE): PadRead {
  const held: Record<string, boolean> = {}
  for (const action of controls.actions) held[action.id] = (binding[action.id] ?? action.buttons).some((n) => isDown(pad.buttons[n]))
  let stick: [number, number] = [0, 0]
  if (controls.stick) {
    stick = deadZone(pad.axes[0] ?? 0, pad.axes[1] ?? 0, zone)
    if (!stick[0] && !stick[1]) {
      const dx = (isDown(pad.buttons[RIGHT]) ? 1 : 0) - (isDown(pad.buttons[LEFT]) ? 1 : 0), dy = (isDown(pad.buttons[DOWN]) ? 1 : 0) - (isDown(pad.buttons[UP]) ? 1 : 0)
      const len = Math.hypot(dx, dy)
      stick = len ? [dx / len, dy / len] : [0, 0]
    }
  }
  return { stick, held }
}

/** What changed between two reads: actions newly pressed and newly released. */
export function changes(before: PadRead | null, now: PadRead): { pressed: string[]; released: string[] } {
  const pressed: string[] = [], released: string[] = []
  for (const [id, on] of Object.entries(now.held)) {
    const was = before?.held[id] === true
    if (on && !was) pressed.push(id)
    else if (!on && was) released.push(id)
  }
  return { pressed, released }
}

/** The first button down on a pad (for "press a button for Punch"), ignoring the d-pad and Start, or -1. */
export function firstButtonDown(pad: PadLike): number {
  for (let n = 0; n < pad.buttons.length; n++) if (n !== START && (n < UP || n > RIGHT) && isDown(pad.buttons[n])) return n
  return -1
}

/** A short, readable name for a pad ("Xbox Wireless Controller (STANDARD GAMEPAD …)" -> its first part). */
export const padName = (id: string): string => (id.split('(')[0]?.trim() || 'Controller').slice(0, 40)

// ---- the player's settings (kept on the device) -------------------------------------------------------------------
export interface PadSettings { v: 1; zone: number; rumble: boolean; bind: Record<string, Record<string, number[]>> }
export const PAD_KEY = 'aw-pad-v1'
export const defaultPadSettings = (): PadSettings => ({ v: 1, zone: DEFAULT_DEAD_ZONE, rumble: true, bind: {} })

/** Settings read back from storage, repaired: anything malformed falls back to the default. */
export function cleanPadSettings(raw: unknown): PadSettings {
  const out = defaultPadSettings()
  if (!raw || typeof raw !== 'object') return out
  const r = raw as Partial<PadSettings>
  if (typeof r.zone === 'number' && r.zone >= 0.05 && r.zone <= 0.6) out.zone = r.zone
  if (typeof r.rumble === 'boolean') out.rumble = r.rumble
  if (r.bind && typeof r.bind === 'object') {
    for (const [game, actions] of Object.entries(r.bind)) {
      if (!/^[a-z]{2,16}$/.test(game) || !actions || typeof actions !== 'object') continue
      const kept: Record<string, number[]> = {}
      for (const [id, buttons] of Object.entries(actions)) if (/^[a-z]{2,16}$/.test(id) && Array.isArray(buttons) && buttons.length <= 4 && buttons.every((n) => Number.isInteger(n) && n >= 0 && n < 32)) kept[id] = buttons.slice()
      out.bind[game] = kept
    }
  }
  return out
}

/** Put `button` on `action` for a game; the action that had it loses it (one button, one action). */
export function remap(settings: PadSettings, controls: PadControls, action: string, button: number): PadSettings {
  const now = bindingOf(controls, settings.bind[controls.game])
  const next: Record<string, number[]> = {}
  for (const a of controls.actions) next[a.id] = a.id === action ? [button] : (now[a.id] ?? []).filter((n) => n !== button)
  return { ...settings, bind: { ...settings.bind, [controls.game]: next } }
}
export const resetBinding = (settings: PadSettings, game: string): PadSettings => { const bind = { ...settings.bind }; delete bind[game]; return { ...settings, bind } }

// ---- each game's controls ----------------------------------------------------------------------------------------
export const FIGHT_PAD: PadControls = { game: 'fight', stick: true, actions: [
  { id: 'punch', label: 'Punch', buttons: [2] },
  { id: 'kick', label: 'Kick', buttons: [1, 3] },
  { id: 'jump', label: 'Jump', buttons: [0] },
  { id: 'block', label: 'Block (hold)', buttons: [4, 5, 6] },
] }
export const RACE_PAD: PadControls = { game: 'race', stick: true, actions: [
  { id: 'gas', label: 'Gas', buttons: [7, 0] },
  { id: 'brake', label: 'Brake / reverse', buttons: [6, 1] },
] }
export const FOOTBALL_PAD: PadControls = { game: 'football', stick: true, actions: [
  { id: 'shoot', label: 'Shoot or pass (hold to power up)', buttons: [0, 7] },
  { id: 'tackle', label: 'Tackle', buttons: [1, 2] },
] }
export const PADS: Readonly<Record<string, PadControls>> = { fight: FIGHT_PAD, race: RACE_PAD, football: FOOTBALL_PAD }
