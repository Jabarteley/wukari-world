/**
 * OWNER: characters
 * Runs the Meshoptimizer part of a background person's simplification (./native-static-lod-job.ts) off the
 * main thread: the same function on the same numbers, so the result is the same as on the main thread.
 */
import { MeshoptSimplifier } from 'meshoptimizer';
import { runNativeStaticLodJob, type NativeStaticLodJob } from './native-static-lod-job.ts';

// The worker's own global, typed by hand: the webworker lib would change the DOM types of the whole project.
const scope = self as unknown as { onmessage: ((event: MessageEvent) => void) | null; postMessage(message: unknown, transfer?: Transferable[]): void };
MeshoptSimplifier.useExperimentalFeatures = true;
const ready = MeshoptSimplifier.ready.then(() => {
  if (!MeshoptSimplifier.supported) throw new Error('Meshoptimizer is unavailable in this worker');
});

scope.onmessage = async (event: MessageEvent<{ id: number; job: NativeStaticLodJob }>) => {
  const { id, job } = event.data;
  try {
    await ready;
    const result = runNativeStaticLodJob(job);
    scope.postMessage({ id, result }, [result.combined.buffer, result.remap.buffer]);
  } catch (error) {
    scope.postMessage({ id, error: String((error as Error)?.message ?? error) });
  }
};
