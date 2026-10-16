/**
 * Capability hints for optional scenery and crowd scheduling. Canonical characters are not gated here and have no
 * procedural or 2D renderer fallback. bodyAllowed() keeps ambient populations lighter on constrained devices and
 * avoids optional neighbourhood scenery loading; drawsWebGL2() is used by that scenery loader.
 *
 * This module remains a small compatibility boundary for those hints and older diagnostics. Production character
 * entrypoints preload src/scene/body/skinned.ts directly before synchronous createBody() calls.
 */

/** What the capability hint reads (navigator in a browser; a plain object in tests). */
export interface BodyDevice {
  connection?: { saveData?: boolean; effectiveType?: string } | undefined;
  hardwareConcurrency?: number | undefined;
  deviceMemory?: number | undefined;
}

/**
 * Whether optional crowd/scenery work should use its full tier. Data Saver, 2G and low-tier devices use a lighter crowd:
 * two cores or fewer, or 2 GB of memory or less (what the browser reports; unreported values do not count against it).
 */
export function bodyAllowed(device: BodyDevice | null | undefined = globalThis.navigator as BodyDevice | undefined): boolean {
  if (!device) return false;
  const connection = device.connection;
  if (connection?.saveData === true || connection?.effectiveType === '2g' || connection?.effectiveType === 'slow-2g') return false;
  if (typeof device.hardwareConcurrency === 'number' && device.hardwareConcurrency > 0 && device.hardwareConcurrency <= 2) return false;
  if (typeof device.deviceMemory === 'number' && device.deviceMemory > 0 && device.deviceMemory <= 2) return false;
  return true;
}

/** Whether an optional neighbourhood-scene model loader can use this renderer's WebGL2 context. */
export function drawsWebGL2(renderer: { getContext?: () => unknown } | null | undefined): boolean {
  const Context = (globalThis as { WebGL2RenderingContext?: abstract new (...args: never[]) => unknown }).WebGL2RenderingContext;
  try { return Boolean(Context && renderer?.getContext && renderer.getContext() instanceof Context); } catch { return false; }
}

/** Compatibility counter retained for existing diagnostics/tests; production scene loaders import the canonical module directly. */
export const bodyImports = { count: 0 };

/** Compatibility lazy-import helper; production canonical body entrypoints preload the module directly. */
export function importBody(): Promise<typeof import('./skinned.ts')> {
  bodyImports.count += 1;
  return import('./skinned.ts');
}
