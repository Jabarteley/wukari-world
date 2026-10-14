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
/** Browsers deliver frames a little early or late; a frame this much (ms) short of the gap still counts as on time. */
export const FRAME_SLACK_MS = 2

/** What the loop does with the frame the browser just delivered at `now`, the last drawn one being at `last` (-Infinity: none yet). */
export const frameAction = ({ covered, now, last, capFps }: { covered: boolean; now: number; last: number; capFps: number }): FrameAction =>
  covered ? 'stop' : capFps > 0 && now - last < 1000 / capFps - FRAME_SLACK_MS ? 'wait' : 'draw'

let covered = false, seq = 0, lastDrawn = -Infinity
/** The callbacks waiting for a frame, and the browser frame each is on (0: parked while the scene is covered). */
const jobs = new Map<number, { run: (time: number) => void; frame: number }>()
function ask(job: { run: (time: number) => void; frame: number }, id: number): void {
  job.frame = globalThis.requestAnimationFrame((time) => {
    job.frame = 0
    // Covered: parked, not dropped (setCovered(false) asks again). Over the light-mode cap: the next browser frame.
    const action = frameAction({ covered, now: time, last: lastDrawn, capFps: lightFps() })
    if (action === 'wait') ask(job, id)
    else if (action === 'draw') { lastDrawn = time; jobs.delete(id); job.run(time) }
  })
}
/** requestAnimationFrame for the scene loops (motion-loop.ts uses it by default): held while covered, skipped above the light-mode cap. */
export function gatedRequest(run: (time: number) => void): number { const job = { run, frame: 0 }; jobs.set(++seq, job); ask(job, seq); return seq }
export function gatedCancel(id: number): void { const job = jobs.get(id); if (job?.frame) globalThis.cancelAnimationFrame(job.frame); jobs.delete(id) }
/** Said by the shell: a full-screen panel (or a sheet on a phone-sized screen) covers the scene. When the cover goes, every parked callback gets its frame. */
export function setCovered(next: boolean): void {
  covered = next
  if (!next) jobs.forEach((job, id) => { if (!job.frame) ask(job, id) })
}
