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
 * The first download carries this file (it imports only src/lightMode.ts).
 */
import { lightFps } from '../lightMode.ts'
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

let covered = false, seq = 0, lastDrawn = -Infinity
/** Callbacks waiting for a frame (by id), and the browser frame each one is on. */
const waiting = new Map<number, (time: number) => void>(), asked = new Map<number, number>()
export const isCovered = (): boolean => covered
function ask(id: number): void {
  asked.set(id, globalThis.requestAnimationFrame((time) => {
    asked.delete(id)
    const run = waiting.get(id)
    if (!run) return
    // Covered: the callback is parked, not dropped; setCovered(false) asks for its frame. Over the cap: the next browser frame.
    const action = frameAction({ hidden: false, covered, now: time, last: lastDrawn, capFps: lightFps() })
    if (action === 'stop') return
    if (action === 'wait') { ask(id); return }
    lastDrawn = time; waiting.delete(id); run(time)
  }))
}
/** requestAnimationFrame for the scene loops (motion-loop.ts uses it by default): held while covered, skipped above the light-mode cap. */
export function gatedRequest(run: (time: number) => void): number { const id = ++seq; waiting.set(id, run); ask(id); return id }
export function gatedCancel(id: number): void { waiting.delete(id); const frame = asked.get(id); if (frame !== undefined) globalThis.cancelAnimationFrame(frame); asked.delete(id) }
/** Said by the shell. When the cover goes, every parked callback gets its frame. */
export function setCovered(next: boolean): void {
  if (next === covered) return
  covered = next
  if (!next) for (const id of waiting.keys()) if (!asked.has(id)) ask(id)
}
