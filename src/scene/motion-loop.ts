/**
 * OWNER: scenes
 * THE ONLY FRAME LOOP IN THE GAME'S SCENES — and it is not allowed to idle.
 *
 * BATTERY RULE: a scene is drawn on demand. A frame loop may run only while there is live input
 * or motion in progress (a movement key or the joystick is held, the avatar is walking to a
 * target, the camera is still easing after a drag or a zoom). The loop below has no way to run
 * otherwise: every frame asks its owner "is anything still moving?" and it ends itself on the
 * first "no". It also ends when the page is hidden. src/venue-world.test.ts proves: idle → zero
 * frames; walking → frames; arrived → flat again; hidden → stopped. This file is the single
 * place in src/scene, src/ui and the host that may name the browser's frame callback.
 *
 * LIGHT MODE AND COVERS (src/scene/frame-gate.ts): every frame asks frameAction() first. With light mode on (src/lightMode.ts) a frame
 * that arrives sooner than 1/30 s after the last drawn one is skipped (no step, no draw, the next browser frame is asked for). While
 * the shell says a full-screen panel covers the scene the loop ends like a hidden page and wakes again, through onVisible, when
 * the cover goes.
 */
import { lightFps } from '../lightMode.ts';
import { frameAction, isCovered, onCoveredChange } from './frame-gate.ts';


/**
 *   loop.wake()    start it (no-op when running, hidden, or when the platform has no frame callback)
 *   loop.stop()
 *   loop.running / loop.frames / loop.available
 * tick(dt) → true to keep going. The loop stops itself the moment tick returns false, and when the
 * page is hidden; onHidden() lets the owner drop held input, and onVisible() lets it resume a
 * motion that was cut short (it must call wake() itself — the loop never restarts on its own).
 */
/** The slice of `document` the loop uses (tests pass a stub). */
export interface MotionDocument {
  visibilityState?: string;
  addEventListener?(type: string, listener: () => void): void;
  removeEventListener?(type: string, listener: () => void): void;
}
export interface MotionLoopOptions {
  onHidden?: () => void;
  onVisible?: () => void;
  request?: ((callback: (time: number) => void) => number) | undefined;
  cancel?: ((handle: number) => void) | undefined;
  doc?: MotionDocument | null | undefined;
  clock?: () => number;
  /** The frame cap now (0: none); light mode's by default. */
  capFps?: () => number;
  /** Does a full-screen panel cover the scene now; the shell's answer by default. */
  covered?: () => boolean;
}
export interface MotionLoop {
  running: boolean;
  frames: number;
  available: boolean;
  wake(): boolean;
  stop(): void;
  dispose(): void;
}
export function createMotionLoop(tick: (dt: number) => boolean | void, { onHidden, onVisible, request = globalThis.requestAnimationFrame, cancel = globalThis.cancelAnimationFrame, doc = globalThis.document, clock = () => globalThis.performance.now(), capFps = lightFps, covered = isCovered }: MotionLoopOptions = {}): MotionLoop {
  let handle: number | null = null, last = 0, drawn = -Infinity, queued = false;
  const hidden = () => doc?.visibilityState === 'hidden';
  const loop: MotionLoop = {
    running: false, frames: 0,
    available: typeof request === 'function',
    wake() {
      if (loop.running || !loop.available || hidden() || covered()) return loop.running;
      loop.running = true; last = clock(); drawn = -Infinity;
      // A callback that could not be cancelled is still on its way: it will do, never ask for a second one.
      if (!queued) { queued = true; handle = request!(frame); }
      return true;
    },
    stop() {
      if (queued && typeof cancel === 'function') { cancel(handle!); queued = false; }
      handle = null; loop.running = false;
    },
    dispose() { loop.stop(); doc?.removeEventListener?.('visibilitychange', onVisibility); uncover(); },
  };
  function frame(time: number) {
    queued = false; handle = null;
    if (!loop.running) return;
    const at = Number.isFinite(time) ? time : clock();
    const action = frameAction({ hidden: hidden(), covered: covered(), now: at, last: drawn, capFps: capFps() });
    if (action === 'stop') { loop.running = false; return; }
    if (action === 'wait') { queued = true; handle = request!(frame); return; }
    drawn = at;
    const dt = Math.max(0, Math.min(0.05, (at - last) / 1000));
    last = at; loop.frames += 1;
    let more = false;
    try { more = tick(dt) === true; } catch (error) { console.error('Scene motion stopped:', error); }
    if (more && loop.running && !hidden()) { queued = true; handle = request!(frame); } else loop.running = false;
  }
  function onVisibility() { if (hidden()) { loop.stop(); onHidden?.(); } else onVisible?.(); }
  function onCover(isOver: boolean) { if (isOver) { loop.stop(); onHidden?.(); } else if (!hidden()) onVisible?.(); }
  doc?.addEventListener?.('visibilitychange', onVisibility);
  const uncover = onCoveredChange(onCover);
  return loop;
}
