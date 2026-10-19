// The street round a home in 3D (docs/WORLDS.md phase 4), without a DOM: which plots are the neighbours, which directory pages hold
// them (GET /api/world/lga/:id/estate/:estate/houses: server/world/registry.ts PAGE.houses plots a page), and their houses.
import type { StreetNeighbour } from '../../../spaces/world/street3d.ts'

export const HOUSES_PAGE = 98
export const PLOTS = 196

/** The plots either side of `plot` on its street (one fewer at either end of the estate). */
export const neighbourPlots = (plot: number): number[] => [plot - 1, plot + 1].filter((p) => p >= 0 && p < PLOTS)
/** The directory pages that hold `plots`. */
export const pagesFor = (plots: readonly number[]): number[] => [...new Set(plots.map((p) => Math.floor(p / HOUSES_PAGE)))]

/** The neighbours' houses from the directory: side -1 is the plot before, +1 the plot after; an empty plot has none. */
export function neighboursFrom(houses: readonly { p: number; s: number }[], plot: number, unpack: (bits: number) => { tier: string; style: object }): StreetNeighbour[] {
  const out: StreetNeighbour[] = []
  for (const side of [-1, 1] as const) {
    const found = houses.find((h) => h.p === plot + side)
    if (!found) continue
    const { tier, style } = unpack(found.s)
    out.push({ side, tier, style: style as Record<string, number> })
  }
  return out
}
