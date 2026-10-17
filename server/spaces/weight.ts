/**
 * OWNER: spaces
 * What a piece of furniture costs the home scene, so a designed or imported plan never carries a floor past the scene's 15,000
 * scenery triangles (src/budgets.ts; the gate is src/spaces/budget.test.ts, which renders AI-designed and densest-possible homes
 * through the housing studio). A piece drawn from a model costs that model's triangles (the counts of src/housing-studio/asset-manifest.ts, copied
 * here because that module builds asset URLs when it loads, which the Worker cannot; src/spaces/budget.test.ts asserts they match; the
 * shape-to-model table mirrors src/housing-studio/furnishings.ts) plus its stand-in; any other piece a small stand-in.
 * The shell of each house size (walls, floors, doors, windows) was measured with the housing studio's own audit, worst view.
 * Server only: the page never needs it (a plan is fitted here before anyone sees it).
 */
import { FURNITURE } from '../../src/game/content/furniture.ts';
import type { FurnitureId, HouseTierId } from '../../src/types/life.ts';

export const SCENERY_TRIANGLES = 15000;
/** Worst-view shell triangles of an empty house, per floor (measured 17 October 2026), and a margin for what the audit adds. */
export const SHELL_TRIANGLES: Readonly<Record<HouseTierId | 'room', number>> = Object.freeze({ starter: 3000, bq: 2918, bungalow: 4406, duplex: 7208, villa: 8888, room: 4406 });
export const MARGIN = 800;
const SHAPES: Readonly<Record<string, string>> = { sofa: 'two-seat-sofa', bed: 'single-bed', wardrobe: 'wardrobe', chair: 'dining-chair', desk: 'dining-table', tv: 'flat-panel-television', plant: 'broadleaf-planter', basin: 'knee-clearance-public-washbasin', fridge: 'display-fridge', cooker: 'four-burner-stove', floorlamp: 'floor-lamp' };
const STAND_IN = 60;
/** Triangles of each housing model, as src/housing-studio/asset-manifest.ts lists them. */
export const MODEL_TRIANGLES: Readonly<Record<string, number>> = Object.freeze({
  'two-seat-sofa': 890, 'single-bed': 888, 'wardrobe': 790, 'wood-armchair': 590, 'dining-chair': 590, 'dining-table': 590,
  'flat-panel-television': 180, 'broadleaf-planter': 590, 'knee-clearance-public-washbasin': 200, 'display-fridge': 668, 'floor-lamp': 574, 'four-burner-stove': 790,
});

export function weigh(itemId: FurnitureId): number {
  const def = FURNITURE[itemId];
  if (!def) return 0;
  const model = itemId === 'lounge-armchair' ? 'wood-armchair' : SHAPES[def.shape];
  return (model ? MODEL_TRIANGLES[model] ?? 0 : 0) + STAND_IN;
}
/** The furniture one floor of a house of this size may carry. */
export const allowanceOf = (size: HouseTierId | 'room'): number => SCENERY_TRIANGLES - SHELL_TRIANGLES[size] - MARGIN;
