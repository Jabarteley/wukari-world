export interface StationCoordinate {
  readonly lon: number
  readonly lat: number
}

export interface StationFrame {
  readonly reference: StationCoordinate
  readonly unitsPerKm: 10
  readonly maxRadiusKm: 20
  project(point: StationCoordinate): readonly [x: number, z: number]
  unproject(point: readonly [x: number, z: number]): StationCoordinate
}

type Vector = readonly [number, number, number]
const EARTH_RADIUS_KM = 6371.0088
const DEG = Math.PI / 180
const UNITS_PER_KM = 10
const MAX_RADIUS_KM = 20
const DOMAIN_TOLERANCE_KM = 1e-9

function validateCoordinate(point: StationCoordinate): void {
  if (!Number.isFinite(point.lon) || !Number.isFinite(point.lat)
    || Math.abs(point.lon) > 180 || Math.abs(point.lat) > 90) {
    throw new RangeError('Station frame requires finite WGS84 longitude and latitude')
  }
}

function vector({ lon, lat }: StationCoordinate): Vector {
  if (Math.abs(lat) === 90) return [0, 0, lat > 0 ? 1 : -1]
  const longitude = lon * DEG, latitude = lat * DEG, parallel = Math.cos(latitude)
  return [parallel * Math.cos(longitude), parallel * Math.sin(longitude), Math.sin(latitude)]
}

const dot = (a: Vector, b: Vector): number => a[0] * b[0] + a[1] * b[1] + a[2] * b[2]

/** Spherical orthographic local frame: x east, z south, with an explicit reference meridian at poles. */
export function createStationFrame(reference: StationCoordinate): StationFrame {
  validateCoordinate(reference)
  const origin = Object.freeze({ lon: reference.lon, lat: reference.lat })
  const longitude = origin.lon * DEG, latitude = origin.lat * DEG
  const sinLatitude = Math.sin(latitude), cosLatitude = Math.abs(origin.lat) === 90 ? 0 : Math.cos(latitude)
  const up = vector(origin)
  const east: Vector = [-Math.sin(longitude), Math.cos(longitude), 0]
  const north: Vector = [-sinLatitude * Math.cos(longitude), -sinLatitude * Math.sin(longitude), cosLatitude]
  const maxProjectedKm = EARTH_RADIUS_KM * Math.sin(MAX_RADIUS_KM / EARTH_RADIUS_KM)

  return Object.freeze({
    reference: origin,
    unitsPerKm: UNITS_PER_KM,
    maxRadiusKm: MAX_RADIUS_KM,
    project(point: StationCoordinate): readonly [number, number] {
      validateCoordinate(point)
      const position = vector(point), alongEast = dot(position, east), alongNorth = dot(position, north)
      const radialKm = EARTH_RADIUS_KM * Math.atan2(Math.hypot(alongEast, alongNorth), dot(position, up))
      if (radialKm > MAX_RADIUS_KM + DOMAIN_TOLERANCE_KM) {
        throw new RangeError('Station point exceeds the 20 km spherical radial domain')
      }
      return [EARTH_RADIUS_KM * alongEast * UNITS_PER_KM, -EARTH_RADIUS_KM * alongNorth * UNITS_PER_KM]
    },
    unproject([x, z]: readonly [number, number]): StationCoordinate {
      if (!Number.isFinite(x) || !Number.isFinite(z)) {
        throw new RangeError('Station inverse requires finite map coordinates')
      }
      const eastKm = x / UNITS_PER_KM, northKm = -z / UNITS_PER_KM
      const projectedKm = Math.hypot(eastKm, northKm)
      if (projectedKm > maxProjectedKm + DOMAIN_TOLERANCE_KM) {
        throw new RangeError('Station inverse exceeds the 20 km spherical radial domain')
      }
      const alongEast = eastKm / EARTH_RADIUS_KM, alongNorth = northKm / EARTH_RADIUS_KM
      const height = Math.sqrt(1 - alongEast * alongEast - alongNorth * alongNorth)
      const vx = height * up[0] + alongEast * east[0] + alongNorth * north[0]
      const vy = height * up[1] + alongEast * east[1] + alongNorth * north[1]
      const vz = height * up[2] + alongEast * east[2] + alongNorth * north[2]
      const horizontal = Math.hypot(vx, vy)
      if (horizontal <= Number.EPSILON * 4) return { lon: 0, lat: vz > 0 ? 90 : -90 }
      return { lon: Math.atan2(vy, vx) / DEG, lat: Math.atan2(vz, horizontal) / DEG }
    },
  })
}
