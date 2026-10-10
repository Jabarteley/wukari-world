// Moving the ghost of a piece of furniture in Buy mode and in the home scene: a step, and a quarter turn, kept inside the plot. Only
// those screens read them, so they are not part of the rules engine (src/game/home-layout.ts holds the rules the engine reads).
import { footprint, plotOf } from '../../../game/home-layout.ts'
import type { Placement, Plot } from '../../../game/home-layout.ts'
import type { FurnitureDefinition } from '../../../types/content.ts'

type Footprinted = Pick<FurnitureDefinition, 'w' | 'h' | 'wall'>
const plotIn = (space: number | Plot): Plot => (typeof space === 'number' ? plotOf(space) : space)

/** Move a ghost by (dx, dy) tiles, kept inside the plot. Wall items slide along their wall. */
export function nudge(space: number | Plot, def: Footprinted, at: Placement, dx: number, dy: number): Placement {
  const { w: wide, d: deep } = plotIn(space)
  if (def.wall) {
    const step = dx || dy
    return at.rot === 0 ? { x: clampTo(at.x + step, 0, wide - 1), y: 0, rot: 0 } : { x: 0, y: clampTo(at.y + step, 0, deep - 1), rot: 1 }
  }
  const { w, h } = footprint(def, at.rot)
  return { x: clampTo(at.x + dx, 0, Math.max(0, wide - w)), y: clampTo(at.y + dy, 0, Math.max(0, deep - h)), rot: at.rot }
}

/** Quarter-turn a ghost (wall items hop to the other wall), kept inside the plot. */
export function turn(space: number | Plot, def: Footprinted, at: Placement): Placement {
  const { w: wide, d: deep } = plotIn(space)
  if (def.wall) return at.rot === 0 ? { x: 0, y: clampTo(at.x, 0, deep - 1), rot: 1 } : { x: clampTo(at.y, 0, wide - 1), y: 0, rot: 0 }
  return nudge(space, def, { ...at, rot: (at.rot + 1) % 4 }, 0, 0)
}

function clampTo(value: number, min: number, max: number): number { return Math.min(max, Math.max(min, value)) }
