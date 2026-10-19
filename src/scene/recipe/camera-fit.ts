import type { SceneCameraFitFrame } from '../types.ts';
import type { Bounds3, ValidatedRecipe } from './contract.ts';

const PADDING = 12;

/** Fit measured corners to the shifted perspective frustum, in scene units. */
export function fitRecipeBounds(boxes: readonly Bounds3[], frame: SceneCameraFitFrame): number | null {
  const { width, height, fov, zoom, shift, top, bottom, preset, pivot, scale } = frame;
  if (![width, height, fov, zoom, shift, top, bottom, scale, ...preset, ...pivot].every(Number.isFinite)
    || preset.length !== 3 || pivot.length !== 3 || width <= PADDING * 2 || height <= 0 || fov <= 0 || fov >= 180 || zoom <= 0 || scale <= 0) return null;
  const opticalY = height / 2 - shift;
  const upper = opticalY - top - PADDING, lower = height - bottom - PADDING - opticalY;
  if (upper <= 0 || lower <= 0) return null;
  const tangent = Math.tan(fov * Math.PI / 360) / zoom;
  const horizontal = tangent * (width - PADDING * 2) / height;
  const upSlope = tangent * 2 * upper / height, downSlope = tangent * 2 * lower / height;
  const [px, py, pz] = preset as readonly [number, number, number];
  const length = Math.hypot(px, py - 0.7, pz), flat = Math.hypot(px, pz);
  if (length === 0 || flat === 0) return null;
  const back = [px / length, (py - 0.7) / length, pz / length];
  const right = [pz / flat, 0, -px / flat];
  const up = [back[1]! * right[2]!, back[2]! * right[0]! - back[0]! * right[2]!, -back[1]! * right[0]!];
  let distance = 6.2 * scale;
  for (const box of boxes) {
    if (![...box.min, ...box.max].every(Number.isFinite) || box.min.some((n, i) => n > box.max[i]!)) return null;
    for (const x of [box.min[0], box.max[0]]) for (const y of [box.min[1], box.max[1]]) for (const z of [box.min[2], box.max[2]]) {
      const q = [x - pivot[0]!, y - pivot[1]!, z - pivot[2]!];
      const depth = q.reduce((sum, n, i) => sum + n * back[i]!, 0);
      const side = q.reduce((sum, n, i) => sum + n * right[i]!, 0);
      const vertical = q.reduce((sum, n, i) => sum + n * up[i]!, 0);
      distance = Math.max(distance, depth + Math.abs(side) / horizontal,
        depth + (vertical >= 0 ? vertical / upSlope : -vertical / downSlope));
    }
  }
  return Number.isFinite(distance) ? distance : null;
}

function body(x: number, y: number, z: number, scale: number): Bounds3 {
  // Standing 2.45-unit figure, with room for hair, arms and a small framing margin.
  return { min: [x - 0.65 * scale, y, z - 0.65 * scale], max: [x + 0.65 * scale, y + 2.65 * scale, z + 0.65 * scale] };
}

/** Created only by the downloaded recipe compiler; no fitting math enters the shared host. */
export function recipeCameraFit(value: ValidatedRecipe): (frame: SceneCameraFitFrame) => number | null {
  const { recipe } = value;
  // Validated solids already contain rotated/scaled placement, shell and sign bounds.
  const fixed = [...value.solids, ...recipe.crowd.map(([x, z]) => body(x, 0, z, 1))];
  return frame => {
    if (frame.player.length !== 3 || !frame.player.every(Number.isFinite)) return null;
    const boxes = [...fixed, body(recipe.entrance[0], 0, recipe.entrance[1], frame.scale),
      body(frame.player[0]!, frame.player[1]!, frame.player[2]!, frame.scale)];
    // Actual host boxes include tables and other scenery added after recipe validation.
    for (const b of frame.solids) {
      if (b.length !== 6) return null;
      boxes.push({ min: [b[0]!, b[1]!, b[2]!], max: [b[3]!, b[4]!, b[5]!] });
    }
    return fitRecipeBounds(boxes, frame);
  };
}
