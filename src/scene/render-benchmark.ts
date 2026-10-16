/** A finite observer of real scene draws. It never requests a rendering frame. */
export interface RenderSnapshot {
  location: string | null;
  visible: boolean;
  width: number;
  height: number;
  pixelRatio: number;
  triangles: number;
  drawCalls: number;
  renderCount: number;
}

export interface RenderBenchmark {
  valid: boolean;
  reason: string | null;
  durationMs: number;
  warmupMs: number;
  renders: number;
  motionFrames: number;
  movingFrames: number;
  rendersPerSecond: number;
  intervalMs: { median: number; p95: number; max: number } | null;
  motionCpuMs: { mean: number; p95: number; max: number } | null;
  start: RenderSnapshot;
  end: RenderSnapshot;
  peak: { triangles: number; drawCalls: number };
}

const round = (value: number): number => Math.round(value * 100) / 100;
const percentile = (sorted: number[], p: number): number => sorted[Math.min(sorted.length - 1, Math.ceil(sorted.length * p) - 1)]!;

export function observeRenders(read: () => RenderSnapshot, complete: (result: RenderBenchmark) => void) {
  const durationMs = 10_000, warmupMs = 1_000;
  const began = performance.now(), start = read();
  const intervals: number[] = [], motionCpu: number[] = [];
  let renders = 0, movingFrames = 0, previous: number | null = null, done = false;
  let peakTriangles = start.triangles, peakDrawCalls = start.drawCalls;
  const finish = (reason: string | null = null) => {
    if (done) return;
    done = true;
    clearTimeout(timer);
    globalThis.document?.removeEventListener('visibilitychange', visibility);
    const end = read();
    if (!reason && (end.location !== start.location || end.width !== start.width || end.height !== start.height || end.pixelRatio !== start.pixelRatio || !end.visible)) reason = 'Scene or rendering size changed';
    intervals.sort((a, b) => a - b); motionCpu.sort((a, b) => a - b);
    complete({
      valid: reason === null, reason, durationMs, warmupMs, renders, motionFrames: motionCpu.length, movingFrames,
      rendersPerSecond: round(renders / ((durationMs - warmupMs) / 1_000)),
      intervalMs: intervals.length ? { median: round(percentile(intervals, 0.5)), p95: round(percentile(intervals, 0.95)), max: round(intervals.at(-1)!) } : null,
      motionCpuMs: motionCpu.length ? { mean: round(motionCpu.reduce((a, b) => a + b, 0) / motionCpu.length), p95: round(percentile(motionCpu, 0.95)), max: round(motionCpu.at(-1)!) } : null,
      start, end, peak: { triangles: peakTriangles, drawCalls: peakDrawCalls },
    });
  };
  const visibility = () => { if (!start.visible || globalThis.document?.visibilityState === 'hidden') finish('Page became hidden'); };
  const timer = setTimeout(() => finish(), durationMs);
  globalThis.document?.addEventListener('visibilitychange', visibility);
  queueMicrotask(visibility);
  return {
    cancel: (reason: string) => finish(reason),
    record(at: number, updateCpuMs: number | null, moving: boolean) {
      if (done || at - began < warmupMs || at - began > durationMs) return;
      const now = read();
      if (now.location !== start.location || now.width !== start.width || now.height !== start.height || now.pixelRatio !== start.pixelRatio || !now.visible) { finish('Scene or rendering size changed'); return; }
      peakTriangles = Math.max(peakTriangles, now.triangles);
      peakDrawCalls = Math.max(peakDrawCalls, now.drawCalls);
      renders++;
      if (moving) movingFrames++;
      if (updateCpuMs !== null) {
        motionCpu.push(updateCpuMs);
        if (previous !== null) intervals.push(at - previous);
        previous = at;
      } else previous = null;
    },
  };
}
