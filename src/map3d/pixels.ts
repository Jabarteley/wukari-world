/**
 * OWNER: world
 * How many device pixels a map's canvas draws. Pure — no Three.js, no DOM.
 *
 * A canvas the size of the window at the screen's own pixel ratio grows with both: an ultra-wide window on a
 * high-density screen is about twenty million pixels, each sampled several times by antialiasing, and every one of
 * them is filled on every frame of a zoom. Past a few million the eye gains nothing on a map of flat colours whose
 * names are drawn by the page, not by the canvas; the GPU pays all the same. So the ratio is the screen's own up to
 * `maxRatio`, and lower where the canvas would otherwise pass `maxPixels`. It never goes under 1: a screen of ordinary
 * density is always drawn at its own size, however wide.
 */
export interface PixelBudget { maxRatio: number; maxPixels: number }

/** The most device pixels a map canvas fills: a 3840 by 2160 screen's worth. */
export const MAP_PIXELS = 3840 * 2160;

/** The pixel ratio a canvas of `width` by `height` CSS pixels is drawn at on a screen of `deviceRatio`. */
export function pixelRatioFor(width: number, height: number, deviceRatio: number, { maxRatio, maxPixels }: PixelBudget): number {
  const ratio = Math.min(Number.isFinite(deviceRatio) && deviceRatio > 0 ? deviceRatio : 1, maxRatio);
  const area = width * height;
  if (!(area > 0) || area * ratio * ratio <= maxPixels) return ratio;
  return Math.max(1, Math.min(ratio, Math.sqrt(maxPixels / area)));
}
