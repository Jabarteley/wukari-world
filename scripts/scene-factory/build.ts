import { createHash } from 'node:crypto'
import { constants } from 'node:fs'
import type { Stats } from 'node:fs'
import { access, lstat, mkdir, readFile, readdir, realpath, rm, writeFile } from 'node:fs/promises'
import { dirname, isAbsolute, join, relative, resolve } from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'
import { screenText } from '../../server/moderation/text.ts'
import { KIT_PROP_IDS, REGION_IDS, RECIPE_LIMITS, parseCityRecipes, parseHostSceneryByVenue } from '../../src/scene/recipe/contract.ts'
import type { HostSceneryByVenue, MeasuredAsset, MeasuredPart, RecipeAssets, RegionId } from '../../src/scene/recipe/contract.ts'
import type { CityBriefRegularV1, CityBriefV1, CityBriefVenueV1, SourceFileHashV1, VenueProvenanceV1 } from './facts.ts'
import { draftCityRecipes, layoutSeed, venueForRecipe } from './layout.ts'
import type { LayoutCandidateResult } from './layout.ts'

const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), '../..')
const SHA256 = /^[a-f0-9]{64}$/u
const ID = /^[a-z0-9]+(?:-[a-z0-9]+)*$/u
const SCENE_KINDS: readonly NonNullable<VenueProvenanceV1['sourceKind']>[] = [
  'park', 'buka', 'hub', 'club', 'office', 'market', 'gym', 'mall', 'beach', 'hospital', 'salon',
  'rooftop', 'police', 'worship', 'radio', 'polling', 'viewing', 'shrine', 'walk', 'statehouse', 'airport',
  'refinery', 'unilag', 'home', 'quad', 'hilltop', 'lakeside',
]
const MAX_BRIEF_BYTES = 2 * 1024 * 1024
const MAX_REPORT_BYTES = 5 * 1024 * 1024
const MAX_HOST_BYTES = 2 * 1024 * 1024
const MIN_SOURCE_PIN_BYTES = Buffer.byteLength(JSON.stringify({ path: 'a', sha256: '0'.repeat(64) })) + 1
const MAX_HOST_SOURCE_FILES = Math.floor((MAX_HOST_BYTES + 1) / MIN_SOURCE_PIN_BYTES)
const SOURCE_PIN_READERS = 8
const TOOL_SOURCES: readonly string[] = [
  'scripts/scene-factory/build.ts',
  'scripts/scene-factory/facts.ts',
  'scripts/scene-factory/layout.ts',
  'scripts/scene-factory/layout-seeds.ts',
  'src/scene/recipe/contract.ts',
  'server/moderation/text.ts',
]

type Command = 'build' | 'check'

export interface SceneBuildOptions {
  command: Command
  briefPath: string
  region: RegionId
  kitReportPath: string
  kitAssetPath: string
  heroReportPath: string
  heroAssetPath: string
  heroVenueId: string | null
  hostSceneryPath: string
  outputDirectory: string
}

export interface SceneBuildSummary {
  command: Command
  city: string
  recipes: number
  outputDirectory: string
  recipeFile: string
  recipeSha256: string
  manifestSha256: string
}

export interface PreparedSceneBuild {
  city: string
  recipeFile: string
  recipeText: string
  manifestText: string
  recipeSha256: string
  manifestSha256: string
  recipeCount: number
  runtime: {
    region: RegionId
    targetVenueIds: string[]
    assets: RecipeAssets
    hostScenery: HostSceneryByVenue
    heroVenueId: string | null
  }
}

export interface SceneHostSceneryBook {
  readonly sha256: string
  readonly path: string
  readonly sourceFiles: readonly SourceFileHashV1[]
  readonly cities: Readonly<Record<string, HostSceneryByVenue>>
}

export interface SceneBuildCompilerOptions extends Omit<SceneBuildOptions, 'command' | 'briefPath' | 'outputDirectory'> {
  briefText: string
  briefLogicalPath: string
  sourceRoot?: string
  hostSceneryBook?: SceneHostSceneryBook
}

const LOADED_HOST_BOOKS = new WeakSet<object>()

function requireValue(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(message)
}

function sha256(value: string | Uint8Array): string {
  return createHash('sha256').update(value).digest('hex')
}

function jsonValue(text: string, label: string): unknown {
  try {
    const value: unknown = JSON.parse(text)
    return value
  } catch {
    throw new Error(`${label} must contain valid JSON`)
  }
}

function dataObject(value: unknown, label: string, required: readonly string[], optional: readonly string[] = []): Record<string, unknown> {
  requireValue(value !== null && typeof value === 'object' && !Array.isArray(value), `${label} must be an object`)
  requireValue(Object.getPrototypeOf(value) === Object.prototype || Object.getPrototypeOf(value) === null, `${label} must be a plain object`)
  const allowed = new Set([...required, ...optional])
  const result: Record<string, unknown> = {}
  for (const key of Reflect.ownKeys(value)) {
    requireValue(typeof key === 'string' && allowed.has(key), `${label} has unknown field ${String(key)}`)
    const descriptor = Object.getOwnPropertyDescriptor(value, key)
    requireValue(descriptor?.enumerable === true && Object.hasOwn(descriptor, 'value'), `${label}.${key} must be a JSON data field`)
    const item: unknown = descriptor.value
    result[key] = item
  }
  for (const key of required) requireValue(Object.hasOwn(result, key), `${label}.${key} is required`)
  return result
}

function looseObject(value: unknown, label: string): Record<string, unknown> {
  requireValue(value !== null && typeof value === 'object' && !Array.isArray(value), `${label} must be an object`)
  requireValue(Object.getPrototypeOf(value) === Object.prototype || Object.getPrototypeOf(value) === null, `${label} must be a plain object`)
  const result: Record<string, unknown> = {}
  for (const key of Reflect.ownKeys(value)) {
    requireValue(typeof key === 'string', `${label} has a non-string field`)
    const descriptor = Object.getOwnPropertyDescriptor(value, key)
    requireValue(descriptor?.enumerable === true && Object.hasOwn(descriptor, 'value'), `${label}.${key} must be a JSON data field`)
    const item: unknown = descriptor.value
    result[key] = item
  }
  return result
}

function dataArray(value: unknown, label: string, maximum = 10_000): unknown[] {
  requireValue(Array.isArray(value) && value.length <= maximum, `${label} must be an array of at most ${maximum} entries`)
  const result: unknown[] = []
  for (let index = 0; index < value.length; index++) {
    requireValue(Object.hasOwn(value, index), `${label} must be dense`)
    const item: unknown = Reflect.get(value, index)
    result.push(item)
  }
  return result
}

function text(value: unknown, label: string): string {
  requireValue(typeof value === 'string' && value.trim() === value && value.length > 0 && !/[\u0000-\u001f\u007f]/u.test(value), `${label} must be non-empty plain text`)
  return value
}

function nullableText(value: unknown, label: string): string | null {
  if (value === null) return null
  return text(value, label)
}

function identifier(value: unknown, label: string): string {
  const result = text(value, label)
  requireValue(ID.test(result), `${label} must be an identifier`)
  return result
}

function finite(value: unknown, label: string, minimum: number, maximum: number): number {
  requireValue(typeof value === 'number' && Number.isFinite(value) && value >= minimum && value <= maximum, `${label} is out of range`)
  return value
}

function integer(value: unknown, label: string, minimum: number, maximum: number): number {
  const result = finite(value, label, minimum, maximum)
  requireValue(Number.isSafeInteger(result), `${label} must be a safe integer`)
  return result
}

function shaText(value: unknown, label: string): string {
  const result = text(value, label)
  requireValue(SHA256.test(result), `${label} must be a SHA-256 digest`)
  return result
}

function region(value: unknown, label: string): RegionId {
  const found = REGION_IDS.find(item => item === value)
  requireValue(found !== undefined, `${label} must be a known region`)
  return found
}

function stringArray(value: unknown, label: string, maximum = 1000): string[] {
  return dataArray(value, label, maximum).map((item, index) => text(item, `${label}[${index}]`))
}

function sourceFile(value: unknown, label: string): SourceFileHashV1 {
  const row = dataObject(value, label, ['path', 'sha256'])
  return { path: text(row.path, `${label}.path`), sha256: shaText(row.sha256, `${label}.sha256`) }
}

function position(value: unknown, label: string): CityBriefVenueV1['position'] {
  const row = looseObject(value, label)
  if (row.kind === 'lon-lat') {
    const exact = dataObject(value, label, ['kind', 'lon', 'lat'])
    return { kind: 'lon-lat', lon: finite(exact.lon, `${label}.lon`, -180, 180), lat: finite(exact.lat, `${label}.lat`, -90, 90) }
  }
  requireValue(row.kind === 'legacy-map', `${label}.kind is unknown`)
  const exact = dataObject(value, label, ['kind', 'x', 'y'])
  return { kind: 'legacy-map', x: finite(exact.x, `${label}.x`, 0, 100), y: finite(exact.y, `${label}.y`, 0, 100) }
}

function namedRows(value: unknown, label: string): { id: string; name: string }[] {
  return dataArray(value, label, 128).map((item, index) => {
    const row = dataObject(item, `${label}[${index}]`, ['id', 'name'])
    return { id: identifier(row.id, `${label}[${index}].id`), name: text(row.name, `${label}[${index}].name`) }
  })
}

function venueProvenance(value: unknown, label: string): VenueProvenanceV1 {
  const row = dataObject(value, label, ['status', 'sourceFile', 'sourceIds', 'sourceKind', 'accuracy', 'gap'])
  requireValue(row.status === 'sourced' || row.status === 'unknown', `${label}.status is unknown`)
  const sourceIds = dataArray(row.sourceIds, `${label}.sourceIds`, 16).map<VenueProvenanceV1['sourceIds'][number]>((item, index) => {
    const source = dataObject(item, `${label}.sourceIds[${index}]`, ['kind', 'value'])
    requireValue(source.kind === 'airport' || source.kind === 'osm' || source.kind === 'wikidata', `${label}.sourceIds[${index}].kind is unknown`)
    return { kind: source.kind, value: text(source.value, `${label}.sourceIds[${index}].value`) }
  })
  const sourceKindText = row.sourceKind === null ? null : text(row.sourceKind, `${label}.sourceKind`)
  const sourceKind = sourceKindText === null ? null : SCENE_KINDS.find(item => item === sourceKindText)
  requireValue(sourceKind !== undefined, `${label}.sourceKind is unknown`)
  requireValue(row.accuracy === null || row.accuracy === 'mapped-feature' || row.accuracy === 'feature-centroid' || row.accuracy === 'source-point', `${label}.accuracy is unknown`)
  return {
    status: row.status,
    sourceFile: nullableText(row.sourceFile, `${label}.sourceFile`),
    sourceIds,
    sourceKind,
    accuracy: row.accuracy,
    gap: nullableText(row.gap, `${label}.gap`),
  }
}

function venue(value: unknown, label: string): CityBriefVenueV1 {
  const row = dataObject(value, label, ['id', 'name', 'kind', 'position', 'spots', 'effectiveSpots', 'regularIds', 'scene', 'provenance'])
  const scene = dataObject(row.scene, `${label}.scene`, ['kind', 'variant', 'disposition'])
  requireValue(scene.disposition === 'preserve-authored' || scene.disposition === 'target-recipe' || scene.disposition === 'exclude-home', `${label}.scene.disposition is unknown`)
  return {
    id: identifier(row.id, `${label}.id`),
    name: text(row.name, `${label}.name`),
    kind: identifier(row.kind, `${label}.kind`),
    position: position(row.position, `${label}.position`),
    spots: namedRows(row.spots, `${label}.spots`),
    effectiveSpots: dataArray(row.effectiveSpots, `${label}.effectiveSpots`, 128).map((item, index) => {
      const spot = dataObject(item, `${label}.effectiveSpots[${index}]`, ['id', 'name', 'source'])
      requireValue(spot.source === 'content' || spot.source === 'system', `${label}.effectiveSpots[${index}].source is unknown`)
      return { id: identifier(spot.id, `${label}.effectiveSpots[${index}].id`), name: text(spot.name, `${label}.effectiveSpots[${index}].name`), source: spot.source }
    }),
    regularIds: stringArray(row.regularIds, `${label}.regularIds`, 256).map((id, index) => identifier(id, `${label}.regularIds[${index}]`)),
    scene: { kind: identifier(scene.kind, `${label}.scene.kind`), variant: nullableText(scene.variant, `${label}.scene.variant`), disposition: scene.disposition },
    provenance: venueProvenance(row.provenance, `${label}.provenance`),
  }
}

function regular(value: unknown, label: string): CityBriefRegularV1 {
  const row = dataObject(value, label, ['id', 'venueId', 'name', 'role', 'provenance'])
  const provenance = dataObject(row.provenance, `${label}.provenance`, ['kind', 'sourceFile'])
  requireValue(provenance.kind === 'game-content', `${label}.provenance.kind is unknown`)
  return {
    id: identifier(row.id, `${label}.id`), venueId: identifier(row.venueId, `${label}.venueId`),
    name: text(row.name, `${label}.name`), role: text(row.role, `${label}.role`),
    provenance: { kind: 'game-content', sourceFile: text(provenance.sourceFile, `${label}.provenance.sourceFile`) },
  }
}

function parseCityBrief(value: unknown): CityBriefV1 {
  const row = dataObject(value, 'brief', ['schema', 'version', 'city', 'style', 'provenance', 'venues', 'regulars', 'targetVenueIds', 'preservedVenueIds', 'excludedVenueIds', 'digests'])
  requireValue(row.schema === 'allworld-city-brief' && row.version === 1, 'brief schema/version is unsupported')
  const city = dataObject(row.city, 'brief.city', ['id', 'name', 'state', 'country', 'point'])
  const state = dataObject(city.state, 'brief.city.state', ['id', 'name'])
  const country = dataObject(city.country, 'brief.city.country', ['id', 'name'])
  const point = dataObject(city.point, 'brief.city.point', ['lon', 'lat'])
  const style = dataObject(row.style, 'brief.style', ['region', 'selection'])
  requireValue(style.selection === 'explicit-input', 'brief.style.selection must be explicit-input')
  const provenance = dataObject(row.provenance, 'brief.provenance', ['status', 'sourceLabel', 'sourceUrls', 'licence', 'files', 'registrationFiles', 'gaps'])
  requireValue(provenance.status === 'sourced' || provenance.status === 'unknown', 'brief.provenance.status is unknown')
  const venues = dataArray(row.venues, 'brief.venues', 512).map((item, index) => venue(item, `brief.venues[${index}]`))
  const regulars = dataArray(row.regulars, 'brief.regulars', 4096).map((item, index) => regular(item, `brief.regulars[${index}]`))
  const targetVenueIds = stringArray(row.targetVenueIds, 'brief.targetVenueIds', 512).map((id, index) => identifier(id, `brief.targetVenueIds[${index}]`))
  const preservedVenueIds = stringArray(row.preservedVenueIds, 'brief.preservedVenueIds', 512).map((id, index) => identifier(id, `brief.preservedVenueIds[${index}]`))
  const excludedVenueIds = stringArray(row.excludedVenueIds, 'brief.excludedVenueIds', 512).map((id, index) => identifier(id, `brief.excludedVenueIds[${index}]`))
  const digests = dataObject(row.digests, 'brief.digests', ['inputSha256', 'contentSha256'])
  const brief: CityBriefV1 = {
    schema: 'allworld-city-brief', version: 1,
    city: {
      id: identifier(city.id, 'brief.city.id'), name: text(city.name, 'brief.city.name'),
      state: { id: identifier(state.id, 'brief.city.state.id'), name: text(state.name, 'brief.city.state.name') },
      country: { id: identifier(country.id, 'brief.city.country.id'), name: text(country.name, 'brief.city.country.name') },
      point: { lon: finite(point.lon, 'brief.city.point.lon', -180, 180), lat: finite(point.lat, 'brief.city.point.lat', -90, 90) },
    },
    style: { region: region(style.region, 'brief.style.region'), selection: 'explicit-input' },
    provenance: {
      status: provenance.status,
      sourceLabel: nullableText(provenance.sourceLabel, 'brief.provenance.sourceLabel'),
      sourceUrls: stringArray(provenance.sourceUrls, 'brief.provenance.sourceUrls', 128).map((url, index) => {
        let parsed: URL
        try { parsed = new URL(url) } catch { throw new Error(`brief.provenance.sourceUrls[${index}] must be an absolute URL`) }
        requireValue(parsed.protocol === 'https:', `brief.provenance.sourceUrls[${index}] must use HTTPS`)
        return url
      }),
      licence: nullableText(provenance.licence, 'brief.provenance.licence'),
      files: dataArray(provenance.files, 'brief.provenance.files', 128).map((item, index) => sourceFile(item, `brief.provenance.files[${index}]`)),
      registrationFiles: dataArray(provenance.registrationFiles, 'brief.provenance.registrationFiles', 128).map((item, index) => sourceFile(item, `brief.provenance.registrationFiles[${index}]`)),
      gaps: stringArray(provenance.gaps, 'brief.provenance.gaps', 1024),
    },
    venues, regulars, targetVenueIds, preservedVenueIds, excludedVenueIds,
    digests: { inputSha256: shaText(digests.inputSha256, 'brief.digests.inputSha256'), contentSha256: shaText(digests.contentSha256, 'brief.digests.contentSha256') },
  }
  validateCoverage(brief)
  return brief
}

function validateCoverage(brief: CityBriefV1): void {
  const venueIds = brief.venues.map(item => item.id)
  requireValue(new Set(venueIds).size === venueIds.length, 'brief contains duplicate venue IDs')
  const groups = [brief.targetVenueIds, brief.preservedVenueIds, brief.excludedVenueIds]
  for (const [index, ids] of groups.entries()) {
    requireValue(new Set(ids).size === ids.length, `brief coverage group ${index} contains duplicates`)
    requireValue(ids.every(id => venueIds.includes(id)), `brief coverage group ${index} contains an unknown venue`)
  }
  const flattened = groups.flat()
  requireValue(flattened.length === venueIds.length && new Set(flattened).size === venueIds.length, 'brief target/preserved/excluded coverage must partition every venue exactly once')
  const expectedTargets = brief.venues.filter(item => item.scene.disposition === 'target-recipe').map(item => item.id)
  const expectedPreserved = brief.venues.filter(item => item.scene.disposition === 'preserve-authored').map(item => item.id)
  const expectedExcluded = brief.venues.filter(item => item.scene.disposition === 'exclude-home').map(item => item.id)
  requireValue(equalStrings(brief.targetVenueIds, expectedTargets), 'brief targetVenueIds do not match venue dispositions')
  requireValue(equalStrings(brief.preservedVenueIds, expectedPreserved), 'brief preservedVenueIds do not match venue dispositions')
  requireValue(equalStrings(brief.excludedVenueIds, expectedExcluded), 'brief excludedVenueIds do not match venue dispositions')
  requireValue(brief.venues.some(item => item.id === 'home' && item.scene.disposition === 'exclude-home') && brief.excludedVenueIds.includes('home'), 'brief must explicitly exclude home')
  const regularIds = new Set(brief.regulars.map(item => item.id))
  requireValue(regularIds.size === brief.regulars.length, 'brief contains duplicate regular IDs')
  requireValue(brief.regulars.every(item => venueIds.includes(item.venueId)), 'brief regular references an unknown venue')
}

function equalStrings(left: readonly string[], right: readonly string[]): boolean {
  return left.length === right.length && left.every((item, index) => item === right[index])
}

function measuredBounds(value: unknown, label: string): MeasuredPart['bounds'] {
  const row = dataObject(value, label, ['min', 'max'])
  const triple = (input: unknown, at: string): [number, number, number] => {
    const values = dataArray(input, at, 3)
    requireValue(values.length === 3, `${at} must have three values`)
    return [finite(values[0], `${at}[0]`, -1024, 1024), finite(values[1], `${at}[1]`, -1024, 1024), finite(values[2], `${at}[2]`, -1024, 1024)]
  }
  const min = triple(row.min, `${label}.min`), max = triple(row.max, `${label}.max`)
  requireValue(min.every((item, index) => item < max[index]!), `${label} is empty or inverted`)
  return { min, max }
}

function measuredAsset(value: unknown, expectedKind: 'kit' | 'hero'): MeasuredAsset {
  const row = looseObject(value, `asset report ${expectedKind}`)
  requireValue(row.version === 1 && row.kind === expectedKind, `asset report ${expectedKind} identity is invalid`)
  const id = identifier(row.id, `asset report ${expectedKind}.id`)
  const parts = dataArray(row.parts, `asset report ${expectedKind}.parts`, KIT_PROP_IDS.length).map((item, index): MeasuredPart => {
    const part = looseObject(item, `asset report ${expectedKind}.parts[${index}]`)
    return {
      node: identifier(part.node, `asset report ${expectedKind}.parts[${index}].node`),
      triangles: integer(part.triangles, `asset report ${expectedKind}.parts[${index}].triangles`, 1, expectedKind === 'kit' ? 1500 : 4000),
      bounds: measuredBounds(part.bounds, `asset report ${expectedKind}.parts[${index}].bounds`),
    }
  })
  requireValue(parts.length > 0 && new Set(parts.map(item => item.node)).size === parts.length, `asset report ${expectedKind} parts are missing or duplicated`)
  if (expectedKind === 'kit') {
    requireValue(parts.every(item => KIT_PROP_IDS.some(id => id === item.node)), 'kit report contains an unknown prop')
    requireValue(parts.length === KIT_PROP_IDS.length && KIT_PROP_IDS.every(id => parts.some(item => item.node === id)), 'kit report must measure every required prop exactly once')
  }
  else requireValue(parts.length === 1 && parts[0]?.node === id, 'hero report must contain one city-named part')
  const triangles = integer(row.triangles, `asset report ${expectedKind}.triangles`, 1, 100_000)
  requireValue(triangles === parts.reduce((sum, item) => sum + item.triangles, 0), `asset report ${expectedKind} triangle total is inconsistent`)
  const digest = shaText(row.sha256, `asset report ${expectedKind}.sha256`)
  const rawBytes = integer(row.rawBytes, `asset report ${expectedKind}.rawBytes`, 1, expectedKind === 'kit' ? 2 * 1024 * 1024 : 60_000)
  const brotliBytes = integer(row.brotliBytes, `asset report ${expectedKind}.brotliBytes`, 1, expectedKind === 'kit' ? 300_000 : 60_000)
  if (expectedKind === 'hero' && row.atlas === undefined) {
    return { version: 1, kind: 'hero', id, sha256: digest, rawBytes, brotliBytes, triangles, parts }
  }
  const atlas = dataObject(row.atlas, `asset report ${expectedKind}.atlas`, ['width', 'height', 'mimeType', 'sha256'])
  requireValue(atlas.width === 1024 && atlas.height === 1024 && atlas.mimeType === 'image/webp', `${expectedKind} report atlas must be a 1024px WebP`)
  return {
    version: 1, kind: expectedKind, id, sha256: digest, rawBytes, brotliBytes, triangles, parts,
    atlas: { width: 1024, height: 1024, mimeType: 'image/webp', sha256: shaText(atlas.sha256, `asset report ${expectedKind}.atlas.sha256`) },
  }
}

async function regularFile(path: string, label: string, maximum: number): Promise<Buffer> {
  const exact = resolve(path)
  let info: Stats
  try { info = await lstat(exact) } catch { throw new Error(`${label} is missing or unreadable: ${exact}`) }
  requireValue(info.isFile() && !info.isSymbolicLink(), `${label} must be a regular non-symlink file`)
  requireValue(info.size > 0 && info.size <= maximum, `${label} exceeds its byte limit`)
  return readFile(exact)
}

async function jsonFile(path: string, label: string, maximum: number): Promise<{ bytes: Buffer; value: unknown; sha256: string }> {
  const bytes = await regularFile(path, label, maximum)
  return { bytes, value: jsonValue(bytes.toString('utf8'), label), sha256: sha256(bytes) }
}

function repoLogicalPath(value: unknown, label: string): string {
  const path = text(value, label)
  requireValue(!isAbsolute(path) && !path.includes('\\'), `${label} must be a repo-relative POSIX path`)
  requireValue(path.split('/').every(part => part.length > 0 && part !== '.' && part !== '..'), `${label} must stay within the repository`)
  return path
}

async function pinnedSource(root: string, path: string, expected: string, label: string): Promise<void> {
  const sourceRoot = resolve(root), absolute = resolve(sourceRoot, path)
  const back = relative(sourceRoot, absolute)
  requireValue(back === path || back.split('\\').join('/') === path, `${label} must stay within the repository`)
  let resolvedRoot: string, resolvedInput: string
  try { [resolvedRoot, resolvedInput] = await Promise.all([realpath(sourceRoot), realpath(absolute)]) }
  catch { throw new Error(`${label} is missing or unreadable`) }
  const realBack = relative(resolvedRoot, resolvedInput)
  requireValue(realBack.length > 0 && !realBack.startsWith('..') && !isAbsolute(realBack), `${label} resolves outside the repository`)
  const bytes = await regularFile(absolute, label, 5 * 1024 * 1024)
  requireValue(sha256(bytes) === expected, `${label} no longer matches its pinned SHA-256`)
}

async function validateSourcePins(sourceRoot: string, sourceFiles: readonly SourceFileHashV1[]): Promise<void> {
  let next = 0
  const validate = async (): Promise<void> => {
    for (;;) {
      const index = next++
      const file = sourceFiles[index]
      if (!file) return
      await pinnedSource(sourceRoot, file.path, file.sha256, `host scenery.sourceFiles[${index}]`)
    }
  }
  const outcomes = await Promise.allSettled(Array.from({ length: Math.min(SOURCE_PIN_READERS, sourceFiles.length) }, validate))
  for (const outcome of outcomes) if (outcome.status === 'rejected') throw outcome.reason
}

async function parseSceneHostScenery(value: unknown, digest: string, path: string, sourceRoot: string): Promise<SceneHostSceneryBook> {
  const root = dataObject(value, 'host scenery', ['schema', 'version', 'sourceFiles', 'cities'])
  requireValue(root.schema === 'allworld-scene-host-measurements' && root.version === 1, 'host scenery schema/version is unsupported')
  const sourceFiles = dataArray(root.sourceFiles, 'host scenery.sourceFiles', MAX_HOST_SOURCE_FILES).map((input, index) => {
    const row = dataObject(input, `host scenery.sourceFiles[${index}]`, ['path', 'sha256'])
    return Object.freeze({ path: repoLogicalPath(row.path, `host scenery.sourceFiles[${index}].path`), sha256: shaText(row.sha256, `host scenery.sourceFiles[${index}].sha256`) })
  })
  requireValue(sourceFiles.length > 0 && new Set(sourceFiles.map(file => file.path)).size === sourceFiles.length, 'host scenery source files must be non-empty and unique')
  await validateSourcePins(sourceRoot, sourceFiles)
  const inputCities = looseObject(root.cities, 'host scenery.cities'), cities: Record<string, HostSceneryByVenue> = {}
  for (const [key, input] of Object.entries(inputCities).sort(([left], [right]) => left.localeCompare(right, 'en'))) {
    const city = identifier(key, `host scenery.cities.${key}`), venueRows = looseObject(input, `host scenery.cities.${city}`)
    const venueIds = Object.keys(venueRows)
    requireValue(venueIds.length <= 256, `host scenery.cities.${city} has too many venues`)
    cities[city] = parseHostSceneryByVenue(venueRows, venueIds)
  }
  requireValue(Object.keys(cities).length > 0, 'host scenery.cities must not be empty')
  return Object.freeze({ sha256: digest, path, sourceFiles: Object.freeze(sourceFiles), cities: Object.freeze(cities) })
}

export async function loadSceneHostScenery(path: string, sourceRoot: string): Promise<SceneHostSceneryBook> {
  const input = await jsonFile(path, 'host scenery', MAX_HOST_BYTES)
  const book = await parseSceneHostScenery(input.value, input.sha256, displayPath(path, sourceRoot), sourceRoot)
  LOADED_HOST_BOOKS.add(book)
  return book
}

async function checkedAsset(reportPath: string, assetPath: string, kind: 'kit' | 'hero', sourceRoot: string): Promise<{ asset: MeasuredAsset; reportSha256: string; reportPath: string; filePath: string; referenceName?: string }> {
  const report = await jsonFile(reportPath, `${kind} report`, MAX_REPORT_BYTES)
  const asset = measuredAsset(report.value, kind)
  const bytes = await regularFile(assetPath, `${kind} asset`, kind === 'kit' ? 2 * 1024 * 1024 : 60_000)
  requireValue(bytes.length === asset.rawBytes, `${kind} asset byte length does not match its measured report`)
  requireValue(sha256(bytes) === asset.sha256, `${kind} asset hash does not match its measured report`)
  const metadata = looseObject(report.value, `${kind} report`)
  let referenceName: string | undefined
  if (kind === 'hero' && metadata.inputs !== undefined) {
    const inputs = looseObject(metadata.inputs, 'hero report.inputs')
    if (inputs.provenance !== undefined) referenceName = text(looseObject(inputs.provenance, 'hero report.inputs.provenance').name, 'hero report.inputs.provenance.name')
  }
  return { asset, reportSha256: report.sha256, reportPath: displayPath(reportPath, sourceRoot), filePath: displayPath(assetPath, sourceRoot), ...(referenceName === undefined ? {} : { referenceName }) }
}

function displayPath(value: string, sourceRoot = repoRoot): string {
  const absolute = resolve(value), local = relative(resolve(sourceRoot), absolute)
  return !local.startsWith('..') && !isAbsolute(local) ? local : absolute
}

async function sourcePins(): Promise<Record<string, string>> {
  const pins: Record<string, string> = {}
  for (const path of TOOL_SOURCES) pins[path] = sha256(await regularFile(join(repoRoot, path), path, 5 * 1024 * 1024))
  return pins
}

interface BriefCompilerInput {
  path: string
  value: unknown
  sha256: string
}

interface SceneBuildInputs extends Omit<SceneBuildOptions, 'command' | 'briefPath' | 'outputDirectory'> {
  sourceRoot: string
  hostSceneryBook?: SceneHostSceneryBook
}

async function prepareWithBrief(options: SceneBuildInputs, briefFile: BriefCompilerInput): Promise<PreparedSceneBuild> {
  const brief = parseCityBrief(briefFile.value)
  requireValue(brief.style.region === options.region, 'explicit region does not match the city brief')
  if (brief.targetVenueIds.length === 0) requireValue(options.heroVenueId === null, 'an authored-only city cannot select a hero venue')
  else requireValue(options.heroVenueId !== null && brief.targetVenueIds.includes(options.heroVenueId), 'a city with recipe targets requires one explicit target hero venue')
  if (options.hostSceneryBook !== undefined) {
    requireValue(LOADED_HOST_BOOKS.has(options.hostSceneryBook), 'host scenery book must come from the strict file loader')
    requireValue(options.hostSceneryBook.path === displayPath(options.hostSceneryPath, options.sourceRoot), 'host scenery book path differs from the requested input')
  }
  const [kitInput, heroInput, hostInput, tools] = await Promise.all([
    checkedAsset(options.kitReportPath, options.kitAssetPath, 'kit', options.sourceRoot),
    checkedAsset(options.heroReportPath, options.heroAssetPath, 'hero', options.sourceRoot),
    options.hostSceneryBook ?? loadSceneHostScenery(options.hostSceneryPath, options.sourceRoot),
    sourcePins(),
  ])
  const selectedHost = hostInput.cities[brief.city.id]
  requireValue(selectedHost !== undefined, `host scenery has no city entry for ${brief.city.id}`)
  const host = parseHostSceneryByVenue(selectedHost, brief.targetVenueIds)
  requireValue(kitInput.asset.id === options.region, 'kit report does not match the explicit region')
  requireValue(heroInput.asset.id === brief.city.id, 'hero report does not match the city brief')
  requireValue(heroInput.asset.atlas === undefined || heroInput.asset.atlas.sha256 === kitInput.asset.atlas?.sha256, 'hero atlas differs from the selected regional kit')
  const assets: RecipeAssets = { kit: kitInput.asset, hero: heroInput.asset }
  const selectedVenue = brief.venues.find(venue => venue.id === options.heroVenueId)
  const foldedName = (name: string): string => name.normalize('NFKD').replace(/\p{M}/gu, '').toLowerCase().replace(/[^\p{L}\p{N}]/gu, '')
  const heroReferenceLabel = heroInput.referenceName && selectedVenue && foldedName(heroInput.referenceName) !== foldedName(selectedVenue.name) ? heroInput.referenceName : undefined
  const candidateResults: LayoutCandidateResult[] = []
  const layoutInput = options.heroVenueId === null
    ? { brief, assets, screenText, hostScenery: host, onCandidateResult: (result: LayoutCandidateResult) => candidateResults.push(result) }
    : { brief, assets, screenText, hostScenery: host, heroVenueId: options.heroVenueId, ...(heroReferenceLabel ? { heroReferenceLabel } : {}), onCandidateResult: (result: LayoutCandidateResult) => candidateResults.push(result) }
  const pack = draftCityRecipes(layoutInput)
  requireValue(equalStrings(pack.recipes.map(recipe => recipe.venue), brief.targetVenueIds), 'drafted recipes do not exactly cover target venues')
  requireValue(pack.recipes.every(recipe => !brief.preservedVenueIds.includes(recipe.venue) && !brief.excludedVenueIds.includes(recipe.venue)), 'drafted recipes include preserved or excluded venues')
  if (options.heroVenueId === null) requireValue(pack.recipes.every(recipe => recipe.hero === undefined), 'an authored-only city must not place a generated hero')
  else requireValue(pack.recipes.filter(recipe => recipe.hero).length === 1 && pack.recipes.find(recipe => recipe.hero)?.venue === options.heroVenueId, 'city hero coverage is incomplete or duplicated')
  const recipeText = `${JSON.stringify(pack)}\n`
  const parsed = parseCityRecipes(recipeText, {
    city: brief.city.id,
    venues: brief.venues.filter(item => item.scene.disposition === 'target-recipe').map(venueForRecipe),
    assets,
    screenText,
    hostScenery: host,
  })
  const signTexts = pack.recipes.flatMap(recipe => recipe.signs.map(sign => sign.text))
  const recipeFile = `${brief.city.id}.json`
  const recipeSha256 = sha256(recipeText)
  const firstCandidateSuccessCount = brief.targetVenueIds.filter(venueId => candidateResults.some(result => result.venue === venueId && result.candidate === 1 && result.kind === 'accepted')).length
  const rejectedCandidateCount = candidateResults.filter(result => result.kind === 'rejected').length
  const candidateDrafting = {
    targetVenueCount: brief.targetVenueIds.length,
    attemptedCandidateCount: candidateResults.length,
    acceptedCandidateCount: candidateResults.length - rejectedCandidateCount,
    rejectedCandidateCount,
    firstCandidateSuccessCount,
    firstCandidateSuccessRate: brief.targetVenueIds.length === 0 ? null : firstCandidateSuccessCount / brief.targetVenueIds.length,
    venues: brief.targetVenueIds.map(venue => ({
      venue,
      attempts: candidateResults.filter(result => result.venue === venue).map(result => result.kind === 'accepted'
        ? { candidate: result.candidate, outcome: result.kind }
        : { candidate: result.candidate, outcome: result.kind, reason: result.reason }),
    })),
  }
  const manifest = {
    schema: 'allworld-scene-build-manifest', version: 1, status: 'offline-staging-only',
    city: brief.city.id, region: options.region, recipeFile, recipeSha256,
    input: {
      brief: { path: briefFile.path, sha256: briefFile.sha256, inputSha256: brief.digests.inputSha256, contentSha256: brief.digests.contentSha256 },
      layoutSeed: layoutSeed(brief),
      hostScenery: { path: hostInput.path, sha256: hostInput.sha256, sourceFiles: hostInput.sourceFiles, value: host },
      kit: { reportPath: kitInput.reportPath, reportSha256: kitInput.reportSha256, assetPath: kitInput.filePath, assetSha256: kitInput.asset.sha256, rawBytes: kitInput.asset.rawBytes, brotliBytes: kitInput.asset.brotliBytes },
      hero: {
        reportPath: heroInput.reportPath, reportSha256: heroInput.reportSha256, assetPath: heroInput.filePath,
        assetSha256: heroInput.asset.sha256, rawBytes: heroInput.asset.rawBytes, brotliBytes: heroInput.asset.brotliBytes,
        venue: options.heroVenueId,
        referenceLabel: heroReferenceLabel ?? null,
        placementReason: options.heroVenueId === null ? 'all-public-venues-authored' : null,
      },
      toolSourcesSha256: tools,
    },
    coverage: {
      targetVenueIds: brief.targetVenueIds,
      recipeVenueIds: pack.recipes.map(recipe => recipe.venue),
      preservedVenueIds: brief.preservedVenueIds,
      excludedVenueIds: brief.excludedVenueIds,
      homeExcluded: brief.excludedVenueIds.includes('home'),
      heroVenueId: options.heroVenueId,
      heroPlacementReason: options.heroVenueId === null ? 'all-public-venues-authored' : null,
    },
    candidateDrafting,
    signs: {
      filter: 'server/moderation/text.ts#screenText',
      targetVenueCount: brief.targetVenueIds.length,
      emittedCount: signTexts.length,
      filteredOutCount: brief.targetVenueIds.length - signTexts.length,
      emittedTextSha256: sha256(JSON.stringify(signTexts)),
    },
    validation: {
      parseCityRecipes: true,
      utf8Bytes: parsed.utf8Bytes,
      limits: RECIPE_LIMITS,
      estimates: parsed.recipes.map(result => ({ venue: result.recipe.venue, ...result.estimate })),
      evidence: 'recipe-validation-only',
    },
    limitations: {
      authoredOnlyClassificationHook: 'loadAuthoredCityScenes-and-authored-citySceneDef',
      regenerationBootstrap: 'derived-recipe-parts-excluded-from-brief-classification',
      currentUse: 'Fresh brief extraction loads and classifies authored scene parts only. Generated recipes cannot classify themselves as authored source.',
      runtimeAcceptance: false,
    },
  }
  const manifestText = `${JSON.stringify(manifest, null, 2)}\n`
  return {
    city: brief.city.id, recipeFile, recipeText, manifestText, recipeSha256,
    manifestSha256: sha256(manifestText), recipeCount: pack.recipes.length,
    runtime: { region: options.region, targetVenueIds: [...brief.targetVenueIds], assets, hostScenery: host, heroVenueId: options.heroVenueId },
  }
}

function logicalPath(value: string, label: string): string {
  requireValue(value.trim() === value && value.length > 0 && !isAbsolute(value) && !value.includes('\\'), `${label} must be a relative POSIX path`)
  const parts = value.split('/')
  requireValue(parts.every(part => part.length > 0 && part !== '.' && part !== '..'), `${label} must stay within its staging root`)
  return value
}

export async function prepareSceneBuild(options: SceneBuildCompilerOptions): Promise<PreparedSceneBuild> {
  const bytes = Buffer.from(options.briefText)
  requireValue(bytes.length > 0 && bytes.length <= MAX_BRIEF_BYTES, 'city brief exceeds its byte limit')
  const inputs: SceneBuildInputs = {
    region: options.region,
    kitReportPath: options.kitReportPath, kitAssetPath: options.kitAssetPath,
    heroReportPath: options.heroReportPath, heroAssetPath: options.heroAssetPath,
    heroVenueId: options.heroVenueId, hostSceneryPath: options.hostSceneryPath, sourceRoot: resolve(options.sourceRoot ?? repoRoot),
    ...(options.hostSceneryBook === undefined ? {} : { hostSceneryBook: options.hostSceneryBook }),
  }
  return prepareWithBrief(inputs, {
    path: logicalPath(options.briefLogicalPath, 'brief logical path'),
    value: jsonValue(options.briefText, 'city brief'), sha256: sha256(bytes),
  })
}

async function prepare(options: SceneBuildOptions): Promise<PreparedSceneBuild> {
  const briefFile = await jsonFile(options.briefPath, 'city brief', MAX_BRIEF_BYTES)
  const inputs: SceneBuildInputs = {
    region: options.region,
    kitReportPath: options.kitReportPath, kitAssetPath: options.kitAssetPath,
    heroReportPath: options.heroReportPath, heroAssetPath: options.heroAssetPath,
    heroVenueId: options.heroVenueId, hostSceneryPath: options.hostSceneryPath, sourceRoot: repoRoot,
  }
  return prepareWithBrief(inputs, { value: briefFile.value, sha256: briefFile.sha256, path: displayPath(options.briefPath) })
}

async function exists(path: string): Promise<boolean> {
  try { await access(path, constants.F_OK); return true } catch { return false }
}

async function buildStage(options: SceneBuildOptions, prepared: PreparedSceneBuild): Promise<void> {
  const out = resolve(options.outputDirectory)
  requireValue(!await exists(out), `output already exists: ${out}`)
  let parent: Stats
  try { parent = await lstat(dirname(out)) } catch { throw new Error(`output parent is missing or unreadable: ${dirname(out)}`) }
  requireValue(parent.isDirectory() && !parent.isSymbolicLink(), 'output parent must be an existing regular directory')
  let owned = false
  try {
    await mkdir(out, { recursive: false }); owned = true
    await writeFile(join(out, prepared.recipeFile), prepared.recipeText, { encoding: 'utf8', flag: 'wx' })
    await writeFile(join(out, 'manifest.json'), prepared.manifestText, { encoding: 'utf8', flag: 'wx' })
  } catch (error) {
    if (owned) await rm(out, { recursive: true, force: true })
    throw error
  }
}

async function checkStage(options: SceneBuildOptions, prepared: PreparedSceneBuild): Promise<void> {
  const out = resolve(options.outputDirectory), info = await lstat(out)
  requireValue(info.isDirectory() && !info.isSymbolicLink(), 'staging output must be a regular directory')
  const entries = (await readdir(out)).sort((a, b) => a.localeCompare(b, 'en'))
  const expected = [prepared.recipeFile, 'manifest.json'].sort((a, b) => a.localeCompare(b, 'en'))
  requireValue(equalStrings(entries, expected), 'staging output must contain exactly the recipe and manifest files')
  const recipe = await regularFile(join(out, prepared.recipeFile), 'staged recipe', RECIPE_LIMITS.cityBytes)
  const manifest = await regularFile(join(out, 'manifest.json'), 'staged manifest', MAX_REPORT_BYTES)
  requireValue(recipe.equals(Buffer.from(prepared.recipeText)), 'staged recipe differs from the deterministic rebuild')
  requireValue(manifest.equals(Buffer.from(prepared.manifestText)), 'staged manifest differs from the deterministic rebuild')
}

function optionPath(value: string | undefined, flag: string): string {
  requireValue(value !== undefined && value.length > 0, `${flag} requires a value`)
  return resolve(value)
}

export function parseSceneBuildCli(argv: readonly string[]): SceneBuildOptions {
  const command = argv[0]
  requireValue(command === 'build' || command === 'check', 'usage: build.ts <build|check> --brief <json> --region <id> --kit-report <json> --kit-asset <file> --hero-report <json> --hero-asset <file> --hero-venue <venue-id|-> --host-scenery <json> --out <new-or-existing-directory>')
  const values = new Map<string, string>()
  for (let index = 1; index < argv.length; index += 2) {
    const flag = argv[index], value = argv[index + 1]
    requireValue(typeof flag === 'string' && flag.startsWith('--') && value !== undefined, `${flag ?? 'argument'} requires a value`)
    requireValue(!values.has(flag), `duplicate argument ${flag}`)
    values.set(flag, value)
  }
  const allowed = new Set(['--brief', '--region', '--kit-report', '--kit-asset', '--hero-report', '--hero-asset', '--hero-venue', '--host-scenery', '--out'])
  for (const flag of values.keys()) requireValue(allowed.has(flag), `unknown argument ${flag}`)
  requireValue(values.size === allowed.size, 'all scene build arguments are required')
  return {
    command,
    briefPath: optionPath(values.get('--brief'), '--brief'),
    region: region(values.get('--region'), '--region'),
    kitReportPath: optionPath(values.get('--kit-report'), '--kit-report'),
    kitAssetPath: optionPath(values.get('--kit-asset'), '--kit-asset'),
    heroReportPath: optionPath(values.get('--hero-report'), '--hero-report'),
    heroAssetPath: optionPath(values.get('--hero-asset'), '--hero-asset'),
    heroVenueId: values.get('--hero-venue') === '-' ? null : identifier(values.get('--hero-venue'), '--hero-venue'),
    hostSceneryPath: optionPath(values.get('--host-scenery'), '--host-scenery'),
    outputDirectory: optionPath(values.get('--out'), '--out'),
  }
}

export async function runSceneBuild(options: SceneBuildOptions): Promise<SceneBuildSummary> {
  const prepared = await prepare(options)
  if (options.command === 'build') await buildStage(options, prepared)
  else await checkStage(options, prepared)
  return {
    command: options.command, city: prepared.city, recipes: prepared.recipeCount,
    outputDirectory: resolve(options.outputDirectory), recipeFile: prepared.recipeFile,
    recipeSha256: prepared.recipeSha256, manifestSha256: prepared.manifestSha256,
  }
}

export async function runSceneBuildCli(argv: readonly string[] = process.argv.slice(2)): Promise<SceneBuildSummary> {
  const summary = await runSceneBuild(parseSceneBuildCli(argv))
  process.stdout.write(`${JSON.stringify(summary)}\n`)
  return summary
}

if (process.argv[1] && pathToFileURL(resolve(process.argv[1])).href === import.meta.url) {
  runSceneBuildCli().catch(error => { process.stderr.write(`${error instanceof Error ? error.message : String(error)}\n`); process.exitCode = 1 })
}
