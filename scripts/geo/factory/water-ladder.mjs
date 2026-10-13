// Budget-aware water ladder (target `waterBudgetLadder: true`; OFF unless the target table sets it).
//
// The exact-coast stage (exact-coastwater.py) simplifies the source shore to about 1 m (0.01% area guard). A dense, canal-rich city can still overflow the 90,000-triangle
// scene budget (Amsterdam: 121,181 with the reach layer, about 100k with `sceneWaterExtent: play`). With the ladder the runner treats the source-scene stage as the
// authority: when ONLY the triangle budget fails, it restores the generated terrain and geometry that the exact-coast stage replaced, runs the stage again with a
// coarser shore (the next rung below), and measures the scene again. Every rung is recorded in the coast-water report as `toleranceLadder` (rung, measured area error
// against its cap, and the triangles measured) next to the attempts the runner made. Deterministic: fixed rungs, fixed order, no randomness.
//
// Fidelity: the standard guard (symmetric-difference area of the simplified water against the exact source water <= 0.01%) is NEVER relaxed silently. A rung relaxes it to
// LADDER_AREA_CAP (0.1%) and the measured fraction, the cap and `relaxesStandardGuard` are written to the report; a rung whose shore misses even that cap is
// infeasible (exit code 3 of the python stage) and the ladder stops there. Land is untouched, no anchor or islet representative may become wet (checks unchanged).
import assert from 'node:assert/strict';
import { assertSourceScene } from './source-scene.mjs';

// Rungs in degrees of latitude (1 degree = 111,320 m): about 1.1, 1.7, 2.2 and 3.3 m. The stage's own standard ladder starts at 0.00001 under the 0.01% guard and steps FINER (0.5, 0.2, 0.1 m)
// when its guard rejects the shore: Amsterdam ends there at 0.56 m (100,244 triangles). A rung is any step coarser than the attempt that overflowed, under the relaxed cap.
export const LADDER_RUNGS_DEGREES = Object.freeze([0.00001, 0.000015, 0.00002, 0.00003]);
// The cap applies to the fraction of the PLAY-box water area that differs from the exact source water (the stage's `sourceSymmetricDifferenceFraction`, a stricter figure than the whole-water one).
export const LADDER_AREA_CAP = 0.001;
export const STANDARD_AREA_CAP = 0.0001;
export const RUNG_INFEASIBLE_EXIT = 3;

export function validateWaterBudgetLadder(value, id = 'target') {
  if (value !== undefined && typeof value !== 'boolean') throw new TypeError(`${id}: waterBudgetLadder must be true or false`);
  return value === true;
}

/** True when the source-scene proof failed ONLY on the triangle count: every other assertion of assertSourceScene still holds with the triangles set to zero. */
export function budgetOverrunOnly(scene) {
  if (!scene || !Number.isFinite(scene.triangles) || !Number.isFinite(scene.triangleLimit)) return false;
  if (!(scene.triangles >= scene.triangleLimit)) return false;
  try { assertSourceScene({ ...scene, triangles: 0 }); } catch { return false; }
  return true;
}

/** The rungs still available after a stage run at `chosenToleranceDegrees` (the shore the previous attempt used): strictly coarser, in order. */
export function remainingRungs(chosenToleranceDegrees) {
  assert.ok(Number.isFinite(chosenToleranceDegrees) && chosenToleranceDegrees > 0, 'the tolerance of the attempt that overflowed the budget is required');
  return LADDER_RUNGS_DEGREES.filter(rung => rung > chosenToleranceDegrees + 1e-12);
}

export function rungArguments(rung) {
  assert.ok(LADDER_RUNGS_DEGREES.includes(rung), 'unknown ladder rung');
  return ['--ladder-tolerance-degrees', String(rung), '--ladder-area-cap', String(LADDER_AREA_CAP)];
}

/** One line of the ladder record. `report` is the coast-water report of the attempt (may be absent when the rung was infeasible). */
export function attemptRecord({ rung, toleranceDegrees, report, scene, outcome, reason }) {
  const simplification = report?.simplification;
  return {
    rung, toleranceDegrees, toleranceMetresApprox: Math.round(toleranceDegrees * 111320 * 100) / 100, outcome,
    ...(reason ? { reason } : {}),
    // `playWaterAreaFraction` is the figure the cap bounds (play-box water against the exact source water); `wholeWaterAreaFraction` is the simplification of all the water in the extract.
    ...(simplification ? { playWaterAreaFraction: report.geometry?.water?.sourceSymmetricDifferenceFraction, wholeWaterAreaFraction: simplification.areaSymmetricDifferenceFraction, areaCap: simplification.maximumAreaSymmetricDifferenceFraction } : {}),
    ...(report?.waterVertices !== undefined ? { waterVertices: report.waterVertices } : {}),
    ...(scene ? { triangles: scene.triangles, triangleLimit: scene.triangleLimit, drawCalls: scene.drawCalls } : {}),
  };
}

/** The `toleranceLadder` object the runner adds to the accepted (or last) coast-water report. */
export function ladderRecord({ attempts, accepted, standardAreaCap = STANDARD_AREA_CAP, areaCap = LADDER_AREA_CAP }) {
  assert.ok(Array.isArray(attempts) && attempts.length >= 1);
  const last = attempts.at(-1);
  return {
    rule: 'waterBudgetLadder: the source-scene proof failed only on the triangle budget, so the exact-coast stage was repeated with a coarser shore (fixed rungs, in order) until the scene fit',
    standardAreaCap, rungAreaCap: areaCap, rungsDegrees: [...LADDER_RUNGS_DEGREES],
    attempts, accepted: accepted ? { rung: last.rung, toleranceDegrees: last.toleranceDegrees, triangles: last.triangles, playWaterAreaFraction: last.playWaterAreaFraction, wholeWaterAreaFraction: last.wholeWaterAreaFraction } : null,
  };
}
