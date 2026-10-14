/**
 * OWNER: scenes
 * WHEN A FRAME MAY BE DRAWN. One pure decision for every frame loop (motion-loop.ts, the maps), and one switch that says a
 * full-screen panel is covering the scene.
 *
 *   hidden or covered   stop: the loop ends itself and draws nothing until it is woken (the page comes back, the panel closes)
 *   under the frame cap wait: ask for the next browser frame without moving or drawing anything (light mode, 30 a second)
 *   otherwise           draw
 *
 * "Covered" is set by the shell (src/app/App.vue) from what it knows: a panel that takes the whole screen, or any sheet on a phone-sized
 * screen where the sheet is the screen. The scene underneath keeps its state and is drawn once when the cover goes.
 * No imports: the first download carries this file.
 */
export type FrameAction = 'draw' | 'wait' | 'stop'
export interface FrameInput { hidden: boolean; covered: boolean; now: number; last: number; capFps: number }
/** Browsers deliver frames a little early or late; a frame this much (ms) short of the gap still counts as on time. */
export const FRAME_SLACK_MS = 2

/** What the loop does with the frame the browser just delivered at `now`, the last drawn one being at `last` (-Infinity: none yet). */
export function frameAction({ hidden, covered, now, last, capFps }: FrameInput): FrameAction {
  if (hidden || covered) return 'stop'
  if (capFps > 0 && Number.isFinite(last) && now - last < 1000 / capFps - FRAME_SLACK_MS) return 'wait'
  return 'draw'
}

/** Does something on screen hide the scene? A panel that takes the whole screen always does; a sheet does on a phone-sized screen. */
export function sceneCovered({ sheetOpen, fullscreen, narrow }: { sheetOpen: boolean; fullscreen: boolean; narrow: boolean }): boolean {
  return sheetOpen && (fullscreen || narrow)
}

let covered = false
const listeners = new Set<(covered: boolean) => void>()
export const isCovered = (): boolean => covered
/** Said by the shell. Tells the listeners only when it changed. */
export function setCovered(next: boolean): void {
  if (next === covered) return
  covered = next
  for (const listener of [...listeners]) listener(next)
}
/** Be told when the scene is covered or uncovered. Returns the unsubscribe. */
export function onCoveredChange(listener: (covered: boolean) => void): () => void {
  listeners.add(listener)
  return () => { listeners.delete(listener) }
}
