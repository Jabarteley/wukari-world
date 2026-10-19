import { createHash } from 'node:crypto'
import { access, readFile, writeFile } from 'node:fs/promises'
import { constants } from 'node:fs'
import { resolve } from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'
import { GENERATED_CITY_CATALOGUE_ROWS } from '../../src/game/cities/catalogue.generated.ts'
import { DEFAULT_CITY_ID, cityContent, cityModule } from '../../src/game/cities/registry.ts'
import { spotsOf } from '../../src/life.ts'
import { destinationVenueIds, validateDestinationFacts } from '../../src/game/cities/africa/types.ts'
import type { DestinationFacts, DestinationPlace } from '../../src/game/cities/africa/types.ts'
import { UNILAG_VENUE } from '../../src/campus/unilag/content.ts'
import { CITY_KINDS, citySceneDef, loadAuthoredCityScenes } from '../../src/scene/city-scenes.ts'
import { SCENES as CAMPUS_SCENES } from '../../src/scene/venues-campus.ts'
import { SCENES as CIVIC_SCENES } from '../../src/scene/venues-civic.ts'
import { SCENES as OUTDOOR_SCENES } from '../../src/scene/venues-outdoor.ts'
import { SCENES as SOCIAL_SCENES } from '../../src/scene/venues-social.ts'
import { SCENES as TRANSPORT_SCENES } from '../../src/scene/venues-transport.ts'
import { SCENES as VIEWPOINT_SCENES } from '../../src/scene/venues-viewpoint.ts'
import { SCENES as WORK_SCENES } from '../../src/scene/venues-work.ts'
import { REGION_IDS } from '../../src/scene/recipe/contract.ts'
import type { RegionId } from '../../src/scene/recipe/contract.ts'
import type { CityContent, CityVenueContent, SceneKind } from '../../src/types/content.ts'

export const CITY_BRIEF_SCHEMA = 'allworld-city-brief' as const
export const CITY_BRIEF_VERSION = 1 as const

export interface SourceFileHashV1 { path: string; sha256: string }
export interface SourceIdV1 { kind: 'airport' | 'osm' | 'wikidata'; value: string }
export type BriefPositionV1 = { kind: 'lon-lat'; lon: number; lat: number } | { kind: 'legacy-map'; x: number; y: number }
export type SceneDispositionV1 = 'preserve-authored' | 'target-recipe' | 'exclude-home'

export interface VenueProvenanceV1 {
  status: 'sourced' | 'unknown'
  sourceFile: string | null
  sourceIds: SourceIdV1[]
  sourceKind: SceneKind | null
  accuracy: 'mapped-feature' | 'feature-centroid' | 'source-point' | null
  gap: string | null
}

export interface CityBriefVenueV1 {
  id: string
  name: string
  kind: string
  position: BriefPositionV1
  spots: { id: string; name: string }[]
  effectiveSpots: { id: string; name: string; source: 'content' | 'system' }[]
  regularIds: string[]
  scene: { kind: string; variant: string | null; disposition: SceneDispositionV1 }
  provenance: VenueProvenanceV1
}

export interface CityBriefRegularV1 {
  id: string
  venueId: string
  name: string
  role: string
  provenance: { kind: 'game-content'; sourceFile: string }
}

export interface CityBriefV1 {
  schema: typeof CITY_BRIEF_SCHEMA
  version: typeof CITY_BRIEF_VERSION
  city: {
    id: string
    name: string
    state: { id: string; name: string }
    country: { id: string; name: string }
    point: { lon: number; lat: number }
  }
  style: { region: RegionId; selection: 'explicit-input' }
  provenance: {
    status: 'sourced' | 'unknown'
    sourceLabel: string | null
    sourceUrls: string[]
    licence: string | null
    files: SourceFileHashV1[]
    registrationFiles: SourceFileHashV1[]
    gaps: string[]
  }
  venues: CityBriefVenueV1[]
  regulars: CityBriefRegularV1[]
  targetVenueIds: string[]
  preservedVenueIds: string[]
  excludedVenueIds: string[]
  digests: { inputSha256: string; contentSha256: string }
}

export interface ExtractCityBriefOptions {
  cityId: unknown
  region: unknown
  repoRoot?: string
}

interface DestinationEvidence {
  facts: DestinationFacts
  factsPath: string
  placesPath: string | null
  places: readonly DestinationPlace[]
}

const TRUSTED_CITY_FILES = ['index.ts', 'rules.ts', 'content.ts', 'facts.ts', 'places.ts', 'scenes.ts', 'venues.ts', 'regulars.ts', 'cast.ts'] as const
const CLASSIFIER_SOURCE_FILES = [
  'src/scene/city-scenes.ts', 'src/scene/venue-scenes.ts',
  'src/scene/venues-outdoor.ts', 'src/scene/venues-social.ts', 'src/scene/venues-work.ts',
  'src/scene/venues-civic.ts', 'src/scene/venues-transport.ts',
  'src/scene/venues-campus.ts', 'src/scene/venues-viewpoint.ts',
  'src/campus/unilag/content.ts', 'src/campus/unilag/world-adapter.ts',
] as const
const SPOT_REGISTRATION_SOURCE_FILES = [
  'src/life.ts', 'src/game/registry.ts', 'src/game/systems/index.ts', 'src/game/systems/base.ts',
  'src/game/systems/activities.ts', 'src/game/systems/home.ts', 'src/game/systems/career.ts',
  'src/game/systems/travel.ts', 'src/game/systems/goals.ts', 'src/game/systems/social.ts',
  'src/game/features.ts', 'src/game/dilemma-pack.ts',
] as const
const DEFAULT_CITY_SCENES = { ...OUTDOOR_SCENES, ...SOCIAL_SCENES, ...WORK_SCENES, ...CIVIC_SCENES, ...TRANSPORT_SCENES }
const SHARED_LAZY_SCENES: Readonly<Record<string, unknown>> = { quad: CAMPUS_SCENES.quad, hilltop: VIEWPOINT_SCENES.hilltop }
const CITY_ID = /^[a-z0-9]+(?:-[a-z0-9]+)*$/u
const OSM_ID = /^(?:node|way|relation)\/[1-9][0-9]*$/u
const WIKIDATA_ID = /^Q[1-9][0-9]*$/u
const SHA256 = /^[a-f0-9]{64}$/u
type DestinationSlot = keyof ReturnType<typeof destinationVenueIds>
const SLOT_RUNTIME_KINDS = {
  airport: 'airport', transit: 'hub', meal: 'buka', community: 'office', clinic: 'hospital', recreation: 'park', market: 'market',
  worship: 'worship', polling: 'polling', government: 'statehouse',
} as const satisfies Readonly<Record<DestinationSlot, SceneKind>>

function requireValue(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(message)
}

function plainText(value: unknown, label: string): string {
  requireValue(typeof value === 'string' && value.trim() === value && value.length > 0 && !/[\u0000-\u001f\u007f]/u.test(value), `${label} must be non-empty plain text`)
  return value
}

function coordinate(lon: unknown, lat: unknown, label: string): { lon: number; lat: number } {
  requireValue(typeof lon === 'number' && Number.isFinite(lon) && lon >= -180 && lon <= 180, `${label}.lon must be a finite WGS84 longitude`)
  requireValue(typeof lat === 'number' && Number.isFinite(lat) && lat >= -90 && lat <= 90, `${label}.lat must be a finite WGS84 latitude`)
  return { lon, lat }
}

function sha256(value: string | Uint8Array): string { return createHash('sha256').update(value).digest('hex') }

function canonical(value: unknown): string {
  if (value === null || typeof value === 'boolean' || typeof value === 'string') return JSON.stringify(value)
  if (typeof value === 'number') { requireValue(Number.isFinite(value), 'content digest cannot include a non-finite number'); return JSON.stringify(value) }
  if (Array.isArray(value)) return `[${value.map(item => canonical(item)).join(',')}]`
  requireValue(value !== null && typeof value === 'object', 'content digest only accepts JSON data')
  const rows = Object.entries(value as Record<string, unknown>).filter(([, item]) => item !== undefined).sort(([a], [b]) => a.localeCompare(b, 'en'))
  return `{${rows.map(([key, item]) => `${JSON.stringify(key)}:${canonical(item)}`).join(',')}}`
}

async function exists(path: string): Promise<boolean> {
  try { await access(path, constants.F_OK); return true } catch { return false }
}

async function sourceFiles(repoRoot: string, cityId: string): Promise<SourceFileHashV1[]> {
  const rows: SourceFileHashV1[] = []
  const relatives = [
    ...TRUSTED_CITY_FILES.map(name => `src/game/cities/${cityId}/${name}`),
    ...CLASSIFIER_SOURCE_FILES,
  ].sort((a, b) => a.localeCompare(b, 'en'))
  for (const relative of relatives) {
    const path = resolve(repoRoot, relative)
    if (await exists(path)) rows.push({ path: relative, sha256: sha256(await readFile(path)) })
  }
  return rows
}

async function registrationSourceFiles(repoRoot: string): Promise<SourceFileHashV1[]> {
  return Promise.all([...SPOT_REGISTRATION_SOURCE_FILES].sort((a, b) => a.localeCompare(b, 'en')).map(async relative => {
    const path = resolve(repoRoot, relative)
    requireValue(await exists(path), `missing spot-registration source ${relative}`)
    return { path: relative, sha256: sha256(await readFile(path)) }
  }))
}

function sceneDisposition(cityId: string, venue: CityVenueContent): SceneDispositionV1 {
  if (venue.id === 'home') return 'exclude-home'
  if (venue.definition === UNILAG_VENUE) return 'preserve-authored'
  const { kind } = venue.definition.scene, variant = venue.definition.scene.variant ?? ''
  const cityDef = citySceneDef(cityId, kind, variant, true)
  const sharedFallback = cityId !== CITY_KINDS[kind] && cityDef !== null && cityDef === SHARED_LAZY_SCENES[kind]
  if (cityDef !== null && !sharedFallback) return 'preserve-authored'
  return cityId === DEFAULT_CITY_ID && Object.hasOwn(DEFAULT_CITY_SCENES, kind) ? 'preserve-authored' : 'target-recipe'
}

function validatePlace(value: unknown, at: number): DestinationPlace {
  requireValue(value !== null && typeof value === 'object' && !Array.isArray(value), `PLACES[${at}] must be an object`)
  const place = value as Record<string, unknown>
  const keys = new Set(['slot', 'key', 'name', 'district', 'kind', 'category', 'icon', 'lon', 'lat', 'line', 'osm', 'wikidata', 'accuracy'])
  for (const key of Object.keys(place)) requireValue(keys.has(key), `PLACES[${at}] has unknown field ${key}`)
  requireValue((typeof place.slot === 'string') !== (typeof place.key === 'string'), `PLACES[${at}] must have exactly one slot or key`)
  if (place.slot !== undefined) requireValue(typeof place.slot === 'string' && Object.hasOwn(SLOT_RUNTIME_KINDS, place.slot), `PLACES[${at}].slot is invalid`)
  if (place.key !== undefined) requireValue(CITY_ID.test(plainText(place.key, `PLACES[${at}].key`)), `PLACES[${at}].key must be an id`)
  plainText(place.name, `PLACES[${at}].name`); plainText(place.district, `PLACES[${at}].district`); plainText(place.kind, `PLACES[${at}].kind`)
  coordinate(place.lon, place.lat, `PLACES[${at}]`)
  requireValue(OSM_ID.test(plainText(place.osm, `PLACES[${at}].osm`)), `PLACES[${at}].osm is invalid`)
  if (place.wikidata !== undefined) requireValue(WIKIDATA_ID.test(plainText(place.wikidata, `PLACES[${at}].wikidata`)), `PLACES[${at}].wikidata is invalid`)
  requireValue(place.accuracy === 'mapped-feature' || place.accuracy === 'feature-centroid', `PLACES[${at}].accuracy is invalid`)
  return value as DestinationPlace
}

async function destinationEvidence(repoRoot: string, cityId: string): Promise<DestinationEvidence | null> {
  const factsPath = resolve(repoRoot, `src/game/cities/${cityId}/facts.ts`)
  const placesPath = resolve(repoRoot, `src/game/cities/${cityId}/places.ts`)
  const hasFacts = await exists(factsPath), hasPlaces = await exists(placesPath)
  requireValue(hasFacts || !hasPlaces, `${cityId} has places.ts without facts.ts`)
  if (!hasFacts) return null
  const factsModule = await import(pathToFileURL(factsPath).href) as { FACTS?: unknown }
  const facts = validateDestinationFacts(factsModule.FACTS as DestinationFacts)
  requireValue(facts.id === cityId, `FACTS.id does not match ${cityId}`)
  let places: readonly DestinationPlace[] = []
  if (hasPlaces) {
    const placesModule = await import(pathToFileURL(placesPath).href) as { PLACES?: unknown }
    requireValue(Array.isArray(placesModule.PLACES), `${cityId} PLACES must be an array`)
    places = placesModule.PLACES.map(validatePlace)
  }
  return { facts, factsPath: `src/game/cities/${cityId}/facts.ts`, placesPath: hasPlaces ? `src/game/cities/${cityId}/places.ts` : null, places }
}

function venuePosition(venue: CityVenueContent): BriefPositionV1 {
  if (venue.position.kind === 'lon-lat') return { kind: 'lon-lat', ...coordinate(venue.position.lon, venue.position.lat, `venue ${venue.id}`) }
  const { x, y } = venue.position.point
  requireValue(Number.isFinite(x) && x >= 0 && x <= 100 && Number.isFinite(y) && y >= 0 && y <= 100, `venue ${venue.id} has an invalid legacy map point`)
  return { kind: 'legacy-map', x, y }
}

function placeIndex(cityId: string, evidence: DestinationEvidence | null): Map<string, DestinationPlace> {
  const found = new Map<string, DestinationPlace>()
  if (!evidence) return found
  const ids = destinationVenueIds(cityId, evidence.facts.airport.id)
  for (const place of evidence.places) {
    const venueId = place.slot ? ids[place.slot] : `${cityId}-${place.key}`
    requireValue(!found.has(venueId), `duplicate place provenance for venue ${venueId}`)
    found.set(venueId, place)
  }
  return found
}

function venueProvenance(cityId: string, venue: CityVenueContent, evidence: DestinationEvidence | null, places: ReadonlyMap<string, DestinationPlace>): VenueProvenanceV1 {
  if (!evidence) return { status: 'unknown', sourceFile: null, sourceIds: [], sourceKind: null, accuracy: null, gap: `No trusted facts.ts or places.ts provenance for ${cityId}.` }
  const ids = destinationVenueIds(cityId, evidence.facts.airport.id)
  if (venue.id === ids.airport) {
    requireValue(venue.name === evidence.facts.airport.name, `airport name mismatch for ${cityId}`)
    if (venue.position.kind === 'lon-lat') {
      requireValue(venue.position.lon === evidence.facts.airport.lon && venue.position.lat === evidence.facts.airport.lat, `airport point mismatch for ${cityId}`)
    }
    return { status: 'sourced', sourceFile: evidence.factsPath, sourceIds: [{ kind: 'airport', value: evidence.facts.airport.id }], sourceKind: null, accuracy: 'source-point', gap: null }
  }
  const place = places.get(venue.id)
  if (!place) return { status: 'unknown', sourceFile: null, sourceIds: [], sourceKind: null, accuracy: null, gap: `Venue ${venue.id} has no mapped place source record.` }
  requireValue(venue.name === place.name, `place name mismatch for venue ${venue.id}`)
  const runtimeKind = place.slot ? SLOT_RUNTIME_KINDS[place.slot] : place.kind
  requireValue(venue.kind === runtimeKind, `place runtime kind mismatch for venue ${venue.id}`)
  requireValue(venue.position.kind === 'lon-lat' && venue.position.lon === place.lon && venue.position.lat === place.lat, `place point mismatch for venue ${venue.id}`)
  return {
    status: 'sourced', sourceFile: evidence.placesPath,
    sourceIds: [{ kind: 'osm', value: place.osm }, ...(place.wikidata ? [{ kind: 'wikidata' as const, value: place.wikidata }] : [])],
    sourceKind: place.kind, accuracy: place.accuracy, gap: null,
  }
}

function validateUnique(rows: readonly { id: string }[], label: string): void {
  const seen = new Set<string>()
  for (const row of rows) { requireValue(CITY_ID.test(plainText(row.id, `${label}.id`)), `${label}.id must be a lower-case id`); requireValue(!seen.has(row.id), `duplicate ${label} id ${row.id}`); seen.add(row.id) }
}

function contentProjection(content: CityContent): unknown {
  return {
    cityId: content.cityId,
    venues: content.venues.map(venue => ({
      id: venue.id, name: venue.name, kind: venue.kind, position: venue.position,
      scene: venue.definition.scene,
      spots: Object.values(venue.definition.spots).map(spot => ({ id: spot.id, label: spot.label })),
    })),
    regulars: content.regulars.map(regular => ({ id: regular.id, venueId: regular.venueId, name: regular.definition.name, role: regular.definition.role })),
  }
}

export async function extractCityBrief(options: ExtractCityBriefOptions): Promise<CityBriefV1> {
  requireValue(typeof options.cityId === 'string' && CITY_ID.test(options.cityId), 'cityId must be a lower-case city id')
  requireValue(typeof options.region === 'string' && REGION_IDS.includes(options.region as RegionId), `region must be one of ${REGION_IDS.join(', ')}`)
  const cityId = options.cityId, region = options.region as RegionId
  const row = GENERATED_CITY_CATALOGUE_ROWS.find(entry => entry[0] === cityId)
  requireValue(row !== undefined, `unknown catalogue city ${cityId}`)
  const cataloguePoint = coordinate(row[4], row[5], `catalogue city ${cityId}`)
  const repoRoot = resolve(options.repoRoot ?? fileURLToPath(new URL('../..', import.meta.url)))
  await loadAuthoredCityScenes(cityId)
  const module = cityModule(cityId), content = cityContent(cityId)
  requireValue(module !== null && module.id === cityId && module.rules.id === cityId && content.cityId === cityId, `city module did not load for ${cityId}`)
  requireValue(module.rules.name === row[1], `catalogue and rules name differ for ${cityId}`)

  const [files, registrationFiles, evidence] = await Promise.all([sourceFiles(repoRoot, cityId), registrationSourceFiles(repoRoot), destinationEvidence(repoRoot, cityId)])
  requireValue(files.length > 0 && files.every(file => SHA256.test(file.sha256)), `no trusted source files found for ${cityId}`)
  const places = placeIndex(cityId, evidence)
  validateUnique(content.venues, 'venue'); validateUnique(content.regulars, 'regular')
  const venueIds = new Set(content.venues.map(venue => venue.id))
  for (const regular of content.regulars) requireValue(venueIds.has(regular.venueId), `regular ${regular.id} references unknown venue ${regular.venueId}`)

  const regulars: CityBriefRegularV1[] = [...content.regulars].sort((a, b) => a.id.localeCompare(b.id, 'en')).map(regular => ({
    id: regular.id, venueId: regular.venueId,
    name: plainText(regular.definition.name, `regular ${regular.id}.name`),
    role: plainText(regular.definition.role, `regular ${regular.id}.role`),
    provenance: { kind: 'game-content', sourceFile: `src/game/cities/${cityId}/content.ts` },
  }))
  const regularIdsByVenue = new Map<string, string[]>()
  for (const regular of regulars) (regularIdsByVenue.get(regular.venueId) ?? (regularIdsByVenue.set(regular.venueId, []), regularIdsByVenue.get(regular.venueId)!)).push(regular.id)

  const venues: CityBriefVenueV1[] = [...content.venues].sort((a, b) => a.id.localeCompare(b.id, 'en')).map(venue => {
    const spots = Object.values(venue.definition.spots).map(spot => ({ id: spot.id, name: plainText(spot.label, `venue ${venue.id} spot ${spot.id}`) })).sort((a, b) => a.id.localeCompare(b.id, 'en'))
    validateUnique(spots, `venue ${venue.id} spot`)
    const authoredSpotIds = new Set(spots.map(spot => spot.id))
    const effectiveSpots = spotsOf(venue.id, cityId).map(spot => ({
      id: spot.id, name: plainText(spot.label, `venue ${venue.id} effective spot ${spot.id}`),
      source: authoredSpotIds.has(spot.id) ? 'content' as const : 'system' as const,
    })).sort((a, b) => a.id.localeCompare(b.id, 'en'))
    validateUnique(effectiveSpots, `venue ${venue.id} effective spot`)
    const variant = venue.definition.scene.variant ?? null
    const disposition = sceneDisposition(cityId, venue)
    return {
      id: venue.id, name: plainText(venue.name, `venue ${venue.id}.name`), kind: plainText(venue.kind, `venue ${venue.id}.kind`),
      position: venuePosition(venue), spots, effectiveSpots, regularIds: [...(regularIdsByVenue.get(venue.id) ?? [])],
      scene: { kind: venue.definition.scene.kind, variant, disposition },
      provenance: venueProvenance(cityId, venue, evidence, places),
    }
  })
  for (const venueId of places.keys()) requireValue(venueIds.has(venueId), `place source references unknown venue ${venueId}`)

  const gaps = new Set<string>()
  if (!evidence) {
    gaps.add('No trusted facts.ts source record is present for this legacy city.')
    gaps.add('No trusted places.ts source records are present for this legacy city.')
  } else if (!evidence.placesPath) gaps.add('No trusted places.ts source records are present for this city.')
  for (const venue of venues) if (venue.provenance.gap) gaps.add(venue.provenance.gap)
  const targetVenueIds = venues.filter(venue => venue.scene.disposition === 'target-recipe').map(venue => venue.id)
  const preservedVenueIds = venues.filter(venue => venue.scene.disposition === 'preserve-authored').map(venue => venue.id)
  const excludedVenueIds = venues.filter(venue => venue.scene.disposition === 'exclude-home').map(venue => venue.id)
  const contentSha256 = sha256(canonical(contentProjection(content)))
  const inputSha256 = sha256(canonical({ cityId, region, catalogue: row, rules: module.rules, files, registrationFiles, contentSha256, effectiveSpots: venues.map(venue => ({ id: venue.id, spots: venue.effectiveSpots })), scenes: venues.map(venue => ({ id: venue.id, ...venue.scene })) }))
  const sourceUrls = evidence ? [...new Set([evidence.facts.sourceUrl, evidence.facts.airport.sourceUrl])].sort((a, b) => a.localeCompare(b, 'en')) : []
  return {
    schema: CITY_BRIEF_SCHEMA, version: CITY_BRIEF_VERSION,
    city: {
      id: cityId, name: module.rules.name,
      state: { id: module.rules.state.id, name: module.rules.state.name },
      country: { id: module.rules.country.id, name: module.rules.country.name },
      point: cataloguePoint,
    },
    style: { region, selection: 'explicit-input' },
    provenance: {
      status: evidence ? 'sourced' : 'unknown',
      sourceLabel: evidence?.facts.sourceLabel ?? null,
      sourceUrls,
      licence: evidence?.facts.licence ?? null,
      files,
      registrationFiles,
      gaps: [...gaps].sort((a, b) => a.localeCompare(b, 'en')),
    },
    venues, regulars, targetVenueIds, preservedVenueIds, excludedVenueIds,
    digests: { inputSha256, contentSha256 },
  }
}

export async function writeCityBrief(path: string, brief: CityBriefV1): Promise<void> {
  requireValue(typeof path === 'string' && path.trim() === path && path.length > 0, 'output path is required')
  await writeFile(resolve(path), `${JSON.stringify(brief, null, 2)}\n`, { encoding: 'utf8', flag: 'wx' })
}

function cliOptions(argv: readonly string[]): { cityId: string; region: string; out?: string } {
  let cityId: string | undefined, region: string | undefined, out: string | undefined
  for (let at = 0; at < argv.length; at += 2) {
    const flag = argv[at], value = argv[at + 1]
    requireValue(value !== undefined, `${flag ?? 'argument'} requires a value`)
    if (flag === '--city') cityId = value
    else if (flag === '--region') region = value
    else if (flag === '--out') out = value
    else throw new Error(`unknown argument ${flag}`)
  }
  requireValue(cityId !== undefined && region !== undefined, 'usage: facts.ts --city <id> --region <region-id> [--out <new-file>]')
  return { cityId, region, ...(out === undefined ? {} : { out }) }
}

export async function runCityBriefCli(argv: readonly string[] = process.argv.slice(2)): Promise<void> {
  const options = cliOptions(argv), brief = await extractCityBrief(options)
  if (options.out) await writeCityBrief(options.out, brief)
  else process.stdout.write(`${JSON.stringify(brief, null, 2)}\n`)
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  runCityBriefCli().catch(error => { process.stderr.write(`${error instanceof Error ? error.message : String(error)}\n`); process.exitCode = 1 })
}
