/** Isolated proposal. Pure maths only; imports existing geography read-only. No runtime registration. */
import { EARTH_RADIUS_KM, ORIGINS, STANDARD_PARALLEL, UNITS_PER_KM, fromLocal, toLocal } from '../../../src/geo/frame.ts'
import { TILE_METRES, QUANTUM, globalPoint, localPoint, mapPointToMetres, metresToMapPoint, tileOf } from '../../../src/street/frame.ts'

export interface Geographic { frame: 'lonlat-degrees'; lon: number; lat: number }
export interface LocalPoint { frame: 'block-local-metres'; east: number; north: number; up: number }
export interface CityPoint { frame: 'lagos-map-units'; x: number; z: number }
export interface StreetPoint { frame: 'lagos-street-projected-metres'; x: number; z: number }
export interface ScenePoint { frame: 'pilot-scene-units'; x: number; y: number; z: number }
export interface XYZ { x: number; y: number; z: number }
export interface SceneFrame { unitsPerMetre: number; yawRadians: number; translation: XYZ }
export interface AdapterConfig { anchor: Geographic; scene: SceneFrame }
export interface AssetSpec {
  near: string
  far?: string
  metresPerModelUnit: number
  groundAnchorModel: XYZ
  forward: '+z'
}
export interface PlacementProposal {
  near: string; far?: string; x: number; y: number; z: number; ry: number; scale: number
  status: 'proposal'; frame: 'pilot-scene-units'; routeAuthorized: false
}
export interface TileAddress {
  frame: 'lagos-street-centimetres'
  tile: { x: number; z: number }
  centimetres: { x: number; z: number }
}

export const MAX_RADIUS_METRES = 500
const DEG = Math.PI / 180
const METRES_PER_DEGREE = EARTH_RADIUS_KM * 1000 * DEG
const LAGOS_PACK = { frame: { origin: ORIGINS.lagos, unitsPerKm: UNITS_PER_KM } }
const finite = (n: number, name: string): number => {
  if (!Number.isFinite(n)) throw new RangeError(`${name} must be finite`)
  return n
}
function xyz(p: XYZ): void { finite(p.x, 'x'); finite(p.y, 'y'); finite(p.z, 'z') }
function geographic(p: Geographic): void {
  if (p.frame !== 'lonlat-degrees') throw new TypeError('Expected lonlat-degrees')
  finite(p.lon, 'longitude'); finite(p.lat, 'latitude')
  if (Math.abs(p.lon) > 180 || Math.abs(p.lat) > 90) throw new RangeError('Longitude/latitude out of range')
}
function local(p: LocalPoint): void {
  if (p.frame !== 'block-local-metres') throw new TypeError('Expected block-local-metres')
  finite(p.east, 'east'); finite(p.north, 'north'); finite(p.up, 'up')
  if (Math.hypot(p.east, p.north) > MAX_RADIUS_METRES + 1e-7) throw new RangeError('Outside 500 m prototype radius')
}
function horizontal(p: CityPoint | StreetPoint, frame: CityPoint['frame'] | StreetPoint['frame']): void {
  if (p.frame !== frame) throw new TypeError(`Expected ${frame}`)
  finite(p.x, 'x'); finite(p.z, 'z')
}
function rotate(p: XYZ, angle: number): XYZ {
  const c = Math.cos(angle), s = Math.sin(angle)
  return { x: c * p.x + s * p.z, y: p.y, z: -s * p.x + c * p.z }
}
const angle = (value: number): number => ((value + Math.PI) % (2 * Math.PI) + 2 * Math.PI) % (2 * Math.PI) - Math.PI
function asset(spec: AssetSpec): void {
  if (!spec.near || (spec.far !== undefined && !spec.far) || spec.forward !== '+z') throw new TypeError('Explicit model keys and +z forward required')
  finite(spec.metresPerModelUnit, 'metresPerModelUnit'); xyz(spec.groundAnchorModel)
  if (spec.metresPerModelUnit <= 0) throw new RangeError('metresPerModelUnit must be positive')
}

/**
 * Horizontal local metres use a spherical equirectangular approximation at the anchor latitude.
 * This is not ECEF/ENU, an ellipsoidal survey CRS, terrain, or a vertical datum.
 * up is independently supplied relative to an arbitrary local zero, never inferred from lon/lat.
 */
export function createAdapter(input: AdapterConfig) {
  geographic(input.anchor); xyz(input.scene.translation)
  finite(input.scene.unitsPerMetre, 'unitsPerMetre'); finite(input.scene.yawRadians, 'yawRadians')
  if (Math.abs(input.anchor.lat) >= 85) throw new RangeError('Polar anchors are outside this prototype')
  if (input.scene.unitsPerMetre <= 0) throw new RangeError('unitsPerMetre must be positive')
  // Snapshot caller data: later mutation must not change the meaning of a frozen manifest.
  const anchor = { ...input.anchor }, scene = { ...input.scene, translation: { ...input.scene.translation } }
  const eastMetresPerDegree = METRES_PER_DEGREE * Math.cos(anchor.lat * DEG)

  function geographicToLocal(p: Geographic, upMetres: number): LocalPoint {
    geographic(p)
    const result: LocalPoint = { frame: 'block-local-metres', east: (p.lon - anchor.lon) * eastMetresPerDegree, north: (p.lat - anchor.lat) * METRES_PER_DEGREE, up: upMetres }
    local(result)
    return result
  }
  function localToGeographic(p: LocalPoint): Geographic {
    local(p)
    const result: Geographic = { frame: 'lonlat-degrees', lon: anchor.lon + p.east / eastMetresPerDegree, lat: anchor.lat + p.north / METRES_PER_DEGREE }
    geographic(result)
    return result
  }
  function geographicToCity(p: Geographic): CityPoint {
    geographicToLocal(p, 0)
    const [x, z] = toLocal(ORIGINS.lagos, p.lon, p.lat)
    return { frame: 'lagos-map-units', x, z }
  }
  function cityToGeographic(p: CityPoint): Geographic {
    horizontal(p, 'lagos-map-units')
    const result: Geographic = { frame: 'lonlat-degrees', ...fromLocal(ORIGINS.lagos, p.x, p.z) }
    geographicToLocal(result, 0)
    return result
  }
  function cityToStreet(p: CityPoint): StreetPoint {
    cityToGeographic(p)
    return { frame: 'lagos-street-projected-metres', ...mapPointToMetres(LAGOS_PACK, p) }
  }
  function streetToCity(p: StreetPoint): CityPoint {
    horizontal(p, 'lagos-street-projected-metres')
    const result: CityPoint = { frame: 'lagos-map-units', ...metresToMapPoint(LAGOS_PACK, p) }
    cityToGeographic(result)
    return result
  }
  function localToScene(p: LocalPoint): ScenePoint {
    local(p)
    const q = rotate({ x: p.east, y: p.up, z: -p.north }, scene.yawRadians), s = scene.unitsPerMetre
    const result: ScenePoint = { frame: 'pilot-scene-units', x: scene.translation.x + q.x * s, y: scene.translation.y + q.y * s, z: scene.translation.z + q.z * s }
    xyz(result)
    return result
  }
  function sceneToLocal(p: ScenePoint): LocalPoint {
    if (p.frame !== 'pilot-scene-units') throw new TypeError('Expected pilot-scene-units')
    xyz(p)
    const s = scene.unitsPerMetre, q = rotate({ x: (p.x - scene.translation.x) / s, y: (p.y - scene.translation.y) / s, z: (p.z - scene.translation.z) / s }, -scene.yawRadians)
    const result: LocalPoint = { frame: 'block-local-metres', east: q.x, north: -q.z, up: q.y }
    local(result)
    return result
  }
  function encodeStreetPoint(p: StreetPoint): TileAddress {
    streetToCity(p)
    // Quantize globally BEFORE selecting the tile so a rounded seam point belongs to its new tile.
    const quantized = { x: Math.round(p.x * QUANTUM) / QUANTUM, z: Math.round(p.z * QUANTUM) / QUANTUM }
    streetToCity({ frame: 'lagos-street-projected-metres', ...quantized })
    const tile = tileOf(quantized), q = localPoint(quantized, tile)
    return { frame: 'lagos-street-centimetres', tile, centimetres: { x: Math.round(q.x * QUANTUM), z: Math.round(q.z * QUANTUM) } }
  }
  function decodeStreetPoint(p: TileAddress): StreetPoint {
    if (p.frame !== 'lagos-street-centimetres') throw new TypeError('Expected lagos-street-centimetres')
    for (const value of [p.tile.x, p.tile.z, p.centimetres.x, p.centimetres.z]) if (!Number.isSafeInteger(value)) throw new RangeError('Tile address must contain safe integers')
    for (const value of [p.centimetres.x, p.centimetres.z]) if (value < 0 || value >= TILE_METRES * QUANTUM) throw new RangeError('Centimetres outside tile')
    const result: StreetPoint = { frame: 'lagos-street-projected-metres', ...globalPoint({ x: p.centimetres.x / QUANTUM, z: p.centimetres.z / QUANTUM }, p.tile) }
    streetToCity(result)
    return result
  }
  /** North=0°, east=90°. Asset faces +z. Positive Three.js Y yaw turns +z toward +x. */
  function place(spec: AssetSpec, ground: LocalPoint, headingDegrees: number): PlacementProposal {
    asset(spec); finite(headingDegrees, 'headingDegrees')
    const at = localToScene(ground), scale = finite(spec.metresPerModelUnit * scene.unitsPerMetre, 'placement scale')
    const ry = angle(scene.yawRadians + Math.PI - (headingDegrees % 360) * DEG)
    const pivot = rotate(spec.groundAnchorModel, ry)
    const result: PlacementProposal = {
      near: spec.near, ...(spec.far === undefined ? {} : { far: spec.far }),
      x: at.x - pivot.x * scale, y: at.y - pivot.y * scale, z: at.z - pivot.z * scale, ry, scale,
      status: 'proposal', frame: 'pilot-scene-units', routeAuthorized: false,
    }
    xyz(result)
    return result
  }
  return {
    geographicToLocal, localToGeographic, geographicToCity, cityToGeographic, cityToStreet, streetToCity,
    localToScene, sceneToLocal, encodeStreetPoint, decodeStreetPoint, place,
    mapEastScaleRelativeToLocal: Math.cos(STANDARD_PARALLEL * DEG) / Math.cos(anchor.lat * DEG),
  }
}

/** Applies the static Placement scale/yaw/translation contract to a named model anchor. */
export function modelPointToScene(p: XYZ, placement: PlacementProposal): ScenePoint {
  xyz(p); xyz(placement); finite(placement.ry, 'placement yaw'); finite(placement.scale, 'placement scale')
  if (placement.frame !== 'pilot-scene-units' || placement.scale <= 0) throw new RangeError('Invalid placement frame or scale')
  const q = rotate(p, placement.ry)
  const result: ScenePoint = { frame: 'pilot-scene-units', x: placement.x + q.x * placement.scale, y: placement.y + q.y * placement.scale, z: placement.z + q.z * placement.scale }
  xyz(result)
  return result
}
