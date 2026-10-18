/**
 * Real data for a city's street tiles (src/street/types.ts MappedArea). Lagos: Lagos Island core, prepared by
 * scripts/realworld/prepare-lagos-island.ts into public/realworld/lagos-island/world.json (OpenStreetMap and Overture footprints and
 * roads, Open Buildings measured heights, roof colours from the 2019 Maxar mosaic; provenance in that folder's PROVENANCE.md).
 * Street metres and the realworld frame coincide for Lagos (both 3.4°E 6.45°N, src/geo/frame.ts ORIGINS.lagos).
 */
import { readFile } from 'node:fs/promises'
import { createHash } from 'node:crypto'
import type { MappedArea } from '../../src/street/types.ts'

const SOURCES: Record<string, URL> = { lagos: new URL('../../public/realworld/lagos-island/world.json', import.meta.url) }

export async function mappedArea(city: string): Promise<{ area: MappedArea; sha256: string } | null> {
  const url = SOURCES[city]; if (!url) return null
  const text = await readFile(url, 'utf8'), world = JSON.parse(text) as { buildings: { id: string; ring: [number, number][]; height: number; levels: number | null; roof: string | null }[]; roads: { id: string; name?: string; width: number; bridge: boolean; points: [number, number][] }[] }
  const xs = world.buildings.flatMap(b => b.ring.map(p => p[0])), zs = world.buildings.flatMap(b => b.ring.map(p => p[1]))
  // The area is the footprints' extent: outside it the generated street goes on as before.
  const box = { x0: Math.min(...xs), z0: Math.min(...zs), x1: Math.max(...xs), z1: Math.max(...zs) }
  const inBox = ([x, z]: [number, number]) => x >= box.x0 - 64 && x <= box.x1 + 64 && z >= box.z0 - 64 && z <= box.z1 + 64
  const area: MappedArea = {
    box,
    buildings: world.buildings.map(b => ({ id: b.id.toLowerCase().replace(/[^a-z0-9:_-]/g, '-').slice(0, 160), ring: b.ring.map(([x, z]) => ({ x, z })), height: b.height, roof: b.roof?.toLowerCase() ?? null, levels: b.levels })),
    roads: world.roads.filter(r => r.points.some(inBox)).map(r => ({ id: `mapped:${r.id}`.toLowerCase().replace(/[^a-z0-9:_-]/g, '-').slice(0, 160), name: (r.name ?? '').slice(0, 160), width: r.width, bridge: r.bridge, points: r.points.map(([x, z]) => ({ x, z })) })),
  }
  // The fictional Marina depot (src/game/living-world/depot-site.ts) is pinned to the map's Marina road in this tile: keep it generated.
  if (city === 'lagos') area.exclude = [{ x: -9, z: -5 }]
  return { area, sha256: createHash('sha256').update(text).digest('hex') }
}
