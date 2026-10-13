import { createAdapter, modelPointToScene } from './adapter.ts'
import type { LocalPoint } from './adapter.ts'
import { BASELINE, CONFIG, COORDINATOR, PROPOSED_BOUNDARY, PROPOSAL_ID, SYNTHETIC_FEATURES, point } from './fixture.ts'
import type { SyntheticFeature } from './fixture.ts'

const SOURCE_URL = `https://github.com/kromate/joinallworld/blob/${BASELINE}/src/map3d/cities/lagos.ts`
const adaptor = () => createAdapter(CONFIG)
function recordPoint(p: LocalPoint) {
  const a = adaptor(), geographic = a.localToGeographic(p), city = a.geographicToCity(geographic), street = a.cityToStreet(city)
  return { local: { ...p }, geographic, city, street, scene: a.localToScene(p), tile: a.encodeStreetPoint(street) }
}
function validateFeature(f: SyntheticFeature): void {
  if (!/^synthetic-[a-z0-9-]+$/.test(f.id)) throw new TypeError('Synthetic feature ID required')
  if (!f.asset.near.startsWith('synthetic:') || (f.asset.far !== undefined && !f.asset.far.startsWith('synthetic:'))) throw new TypeError('Synthetic asset keys required')
  for (const n of [f.footprintMetres.width, f.footprintMetres.depth, f.height.nominalMetres, ...f.height.scenarioRangeMetres]) {
    if (!Number.isFinite(n) || n <= 0) throw new RangeError('Dimensions must be positive finite numbers')
  }
  const [low, high] = f.height.scenarioRangeMetres
  if (low > f.height.nominalMetres || high < f.height.nominalMetres || f.height.method !== 'synthetic-assumption' || f.height.confidence !== 'not-measured' || f.height.realWorldErrorBoundMetres !== null) throw new RangeError('Synthetic height uncertainty must remain explicit')
}
function footprint(f: SyntheticFeature): LocalPoint[] {
  const w = f.footprintMetres.width / 2, d = f.footprintMetres.depth / 2, yaw = Math.PI - f.headingDegrees * Math.PI / 180
  const c = Math.cos(yaw), s = Math.sin(yaw)
  return [[-w, -d], [-w, d], [w, d], [w, -d], [-w, -d]].map(([x, z]) => {
    const p = point(f.ground.east + c * x! + s * z!, f.ground.north + s * x! - c * z!, f.ground.up)
    if (Math.abs(p.east) > 100 || Math.abs(p.north) > 100) throw new RangeError('Synthetic footprint exceeds proposed boundary')
    return p
  })
}

/** No time, randomness, I/O, network, renderer, or mutable runtime state. IDs define output order. */
export function buildManifest(features: readonly SyntheticFeature[] = SYNTHETIC_FEATURES) {
  if (features.length > 64 || new Set(features.map(f => f.id)).size !== features.length) throw new RangeError('At most 64 unique synthetic features')
  const a = adaptor()
  return {
    schema: 'allworld-lagos-geography-proposal-v1', proposalId: PROPOSAL_ID, beta: true,
    status: 'proposal-synthetic-only', integrationReady: false, routeAuthorized: false,
    sourceBaseline: BASELINE, coordinatorCommit: COORDINATOR, observationDate: '2026-10-13',
    sourcePinsFile: 'source-pins.json',
    provenance: [
      { id: 'repository-game-anchor', kind: 'repository-authored-approximation', url: SOURCE_URL,
        author: 'Allworld repository contributors', licence: 'AGPL-3.0-or-later (repository LICENSE)',
        usedFor: 'Naming and centring a proposed Sabo Yaba area only; PLACES.cchub coordinate',
        accuracy: 'Source describes tens to hundreds of metres; no certified error bound', horizontalErrorBoundMetres: null,
        externalSurvey: false, imageryUsed: false },
      { id: 'original-synthetic-fixtures', kind: 'synthetic', author: 'Allworld Lagos geography cloud lane, 2026-10-13',
        licence: 'AGPL-3.0-or-later', sourceFile: 'fixture.ts',
        usedFor: 'AOI dimensions, feature IDs, footprints, headings, pivots, elevations, heights and scenario ranges',
        accuracy: 'No correspondence to real objects asserted; scenario ranges are not confidence intervals',
        horizontalErrorBoundMetres: null, verticalErrorBoundMetres: null, externalSurvey: false, imageryUsed: false },
    ],
    coordinateContract: {
      geographic: 'longitude, latitude in decimal degrees; repository anchor treated as WGS84-like, datum unverified',
      local: 'spherical equirectangular at anchor latitude; east/north/up metres; max radius 500 m; not ellipsoidal ENU',
      vertical: 'Arbitrary local zero, not sea level or ellipsoidal altitude; ground elevations synthetic; no DEM',
      city: 'nigeria-equirectangular-v1; x east, z south; rounded Lagos origin (-5052,2835); 10 units/km',
      street: 'city-local map x/z times 100; projected metres inherit 9 degree standard-parallel scale',
      mapEastScaleRelativeToLocal: a.mapEastScaleRelativeToLocal,
      scene: { ...CONFIG.scene, translation: { ...CONFIG.scene.translation }, axesAtZeroYaw: 'x east, y up, z south',
        status: 'Standalone proposal frame; not wired to city-street or procedural neighbourhood' },
      heading: 'degrees clockwise from local north, model forward +z; ry = sceneYaw + pi - headingRadians',
      asset: 'metresPerModelUnit converts model units; groundAnchorModel is placed at the requested local ground point',
      tile: '128 projected metres, centimetre quantization before tile selection, half-open local [0,128)',
      atlas: 'Equal Earth atlas is deliberately excluded',
    },
    boundaryProposal: {
      label: 'PROPOSAL: 200 m × 200 m around existing approximate Sabo Yaba game anchor',
      status: 'proposed-area-of-interest-not-surveyed-block', sourceId: 'original-synthetic-fixtures',
      anchorSourceId: 'repository-game-anchor', anchor: { ...CONFIG.anchor },
      dimensionsLocalMetres: [200, 200], areaLocalSquareMetres: 40000,
      realWorldBoundaryErrorBoundMetres: null,
      ringOrder: 'closed counter-clockwise east/north; GeoJSON coordinates are [longitude,latitude]',
      ring: PROPOSED_BOUNDARY.map(recordPoint),
      geojson: { type: 'Feature', properties: { proposalId: PROPOSAL_ID, status: 'proposal', surveyed: false },
        geometry: { type: 'Polygon', coordinates: [PROPOSED_BOUNDARY.map(p => { const g = a.localToGeographic(p); return [g.lon, g.lat] })] } },
    },
    features: [...features].sort((left, right) => left.id < right.id ? -1 : left.id > right.id ? 1 : 0).map(f => {
      validateFeature(f)
      const placement = a.place(f.asset, f.ground, f.headingDegrees)
      return {
        id: f.id, label: f.label, beta: true, sourceId: 'original-synthetic-fixtures', geometryStatus: 'synthetic',
        horizontalErrorBoundMetres: null, groundElevationErrorBoundMetres: null,
        headingDegrees: f.headingDegrees, headingErrorBoundDegrees: null,
        height: { ...f.height, scenarioRangeMetres: [...f.height.scenarioRangeMetres] },
        footprintMetres: { ...f.footprintMetres }, footprint: footprint(f).map(p => ({ ...p })),
        ground: recordPoint(f.ground),
        model: { ...f.asset, groundAnchorModel: { ...f.asset.groundAnchorModel }, filesExist: false },
        placement, placedGroundAnchor: modelPointToScene(f.asset.groundAnchorModel, placement),
      }
    }),
    promotionBlockers: [
      'Parent must select the actual block and target runtime scene',
      'Licensed surveyed or mapped geometry with per-input provenance is absent',
      'Horizontal datum, anchor accuracy, heights, ground datum, road alignment and entrances are unverified',
      'Synthetic asset keys have no model files, collider, support or navigation semantics',
      'Runtime owner must decide how local metric geometry maps to existing projected street coordinates',
      'No current-game, visual, Blender export, phone or performance acceptance is claimed',
    ],
  }
}

/** Stable object key ordering; array order remains semantic. No precision or uncertainty is hidden. */
export function canonicalJson(value: unknown): string {
  function ordered(item: unknown): unknown {
    if (typeof item === 'number' && !Number.isFinite(item)) throw new TypeError('Nonfinite JSON number')
    if (Array.isArray(item)) return item.map(ordered)
    if (item !== null && typeof item === 'object') return Object.fromEntries(Object.entries(item).sort(([a], [b]) => a < b ? -1 : a > b ? 1 : 0).map(([key, child]) => [key, ordered(child)]))
    return item
  }
  return `${JSON.stringify(ordered(value), null, 2)}\n`
}
