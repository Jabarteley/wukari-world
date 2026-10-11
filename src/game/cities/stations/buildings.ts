import { BufferGeometry, Color, ExtrudeGeometry, Float32BufferAttribute, Shape, Vector2 } from 'three'
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js'
import { polygonProblem, triangulationProblem } from '../africa/polygonCheck.ts'
import type { Pt } from '../africa/polygonCheck.ts'
import type { StationCoordinate, StationFrame } from './frame.ts'

export interface StationBuilding {
  readonly id: string
  readonly ring: readonly StationCoordinate[]
  readonly height: { readonly metres: number; readonly kind: 'source' | 'estimated' }
  readonly colour: string
}

export interface StationBuildingGeometry {
  readonly geometry: BufferGeometry
  readonly triangles: number
}

/** Extrudes screened mapped footprints; callers own provenance, mesh/material creation and returned geometry disposal. */
export function createStationBuildings(frame: StationFrame, buildings: readonly StationBuilding[]): StationBuildingGeometry {
  if (frame.unitsPerKm !== 10 || frame.maxRadiusKm !== 20) throw new RangeError('Station buildings require the 10 units/km, 20 km frame')
  const pieces: BufferGeometry[] = [], identities = new Set<string>()
  try {
    for (const building of buildings) {
      if (!building.id.trim() || identities.has(building.id)) throw new TypeError('Station building identity is missing or duplicated')
      identities.add(building.id)
      if (!Number.isFinite(building.height.metres) || building.height.metres <= 0
        || !['source', 'estimated'].includes(building.height.kind)) {
        throw new RangeError(`${building.id}: positive finite height and explicit provenance kind required`)
      }
      if (!/^#(?:[0-9a-f]{3}|[0-9a-f]{6})$/iu.test(building.colour)) throw new TypeError(`${building.id}: colour must be a hexadecimal RGB value`)
      const first = building.ring[0], last = building.ring.at(-1)
      if (building.ring.length < 4 || !first || !last || first.lon !== last.lon || first.lat !== last.lat) {
        throw new TypeError(`${building.id}: footprint requires a closed ring with at least four coordinates`)
      }
      const ring: Pt[] = building.ring.map(point => frame.project(point))
      const problem = polygonProblem([ring]) ?? triangulationProblem([ring])
      if (problem) throw new TypeError(`${building.id}: invalid projected footprint: ${problem}`)

      const shape = new Shape(ring.slice(0, -1).map(([x, z]) => new Vector2(x, -z)))
      const geometry = new ExtrudeGeometry(shape, { depth: building.height.metres * frame.unitsPerKm / 1000, bevelEnabled: false, steps: 1, curveSegments: 1 })
      pieces.push(geometry)
      geometry.rotateX(-Math.PI / 2)
      const position = geometry.getAttribute('position')
      if (!position || position.count === 0 || position.count % 3 !== 0 || geometry.index) {
        throw new TypeError(`${building.id}: footprint extrusion did not produce nonindexed triangles`)
      }
      const colour = new Color(building.colour), colours = new Float32Array(position.count * 3)
      for (let i = 0; i < position.count; i++) {
        if (![position.getX(i), position.getY(i), position.getZ(i)].every(Number.isFinite)) {
          throw new RangeError(`${building.id}: footprint extrusion produced nonfinite coordinates`)
        }
        colours[i * 3] = colour.r
        colours[i * 3 + 1] = colour.g
        colours[i * 3 + 2] = colour.b
      }
      geometry.setAttribute('color', new Float32BufferAttribute(colours, 3))
      geometry.clearGroups()
    }
    if (!pieces.length) return { geometry: new BufferGeometry(), triangles: 0 }
    const geometry = mergeGeometries(pieces, false)
    if (!geometry) throw new TypeError('Station building geometries could not be merged')
    return { geometry, triangles: geometry.getAttribute('position').count / 3 }
  } finally {
    for (const geometry of pieces) geometry.dispose()
  }
}
