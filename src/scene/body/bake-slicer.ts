/**
 * OWNER: characters
 * Time slices for baking background people (src/scene/body/canonical-crowd.ts). A posed template used to be baked in one go,
 * 30 to 430 ms in a single frame. Now the bake runs in slices of at most BAKE_SLICE_MS, one slice per frame, after the frame
 * has been drawn, so a template arrives over several frames instead of holding one. The result is the same bytes: only when
 * the work runs changes, never what it computes. A figure shows nothing until its template is complete, as before.
 *
 * One budget is shared by every bake in the page (all kits): a bake checks `bakeSliceSpent()` between small steps and, when
 * the slice is spent, awaits `nextBakeSlice()`. Waiters resume in the order they asked.
 *
 * With no requestAnimationFrame (node tests, workers), nothing is sliced: every step runs at once, as before.
 */
export const BAKE_SLICE_MS = 6;

type Waiter = () => void;
let sliceStart = Number.NEGATIVE_INFINITY;
let waiters: Waiter[] = [];
let scheduled = 0;
let generation = 0;
let channel: MessageChannel | null = null;

const now = (): number => globalThis.performance?.now?.() ?? Date.now();
const sliced = (): boolean => typeof globalThis.requestAnimationFrame === 'function';

function runSlice(token: number): void {
  if (scheduled !== token) return;
  scheduled = 0;
  sliceStart = now();
  const ready = waiters;
  waiters = [];
  for (const resume of ready) resume();
}

function schedule(): void {
  if (scheduled) return;
  const token = scheduled = ++generation;
  // After the next frame is drawn: rAF, then a message task (it runs once the frame's rendering is done). A hidden page has no
  // frames, so a slow timer keeps the bake moving there too.
  if (!channel && typeof MessageChannel === 'function') {
    channel = new MessageChannel();
    channel.port1.onmessage = (event: MessageEvent<number>) => runSlice(event.data);
    (channel.port1 as unknown as { unref?: () => void }).unref?.(); // node only: an idle port must not keep a test process alive
  }
  globalThis.requestAnimationFrame(() => { if (channel) channel.port2.postMessage(token); else setTimeout(() => runSlice(token), 0); });
  setTimeout(() => runSlice(token), 250);
}

/** True when the current slice has used its budget (or no slice is running): the caller should await nextBakeSlice(). */
export function bakeSliceSpent(): boolean {
  return sliced() && now() - sliceStart >= BAKE_SLICE_MS;
}

/** Resolves at the start of a fresh slice: after the next frame. Resolves at once where nothing is sliced. */
export function nextBakeSlice(): Promise<void> {
  if (!sliced()) return Promise.resolve();
  return new Promise<void>((resolve) => { waiters.push(resolve); schedule(); });
}

/** Await a fresh slice only if the current one is spent. */
export async function bakeCheckpoint(): Promise<void> {
  while (bakeSliceSpent()) await nextBakeSlice();
}
