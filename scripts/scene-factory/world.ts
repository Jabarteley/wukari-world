import { createHash } from 'node:crypto'
import { constants } from 'node:fs'
import type { Stats } from 'node:fs'
import { access, lstat, mkdir, readFile, readdir, realpath, rm, writeFile } from 'node:fs/promises'
import { dirname, isAbsolute, join, relative, resolve } from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'
import { isDeepStrictEqual } from 'node:util'
import type { MeasuredAsset, RegionId } from '../../src/scene/recipe/contract.ts'
import { REGION_IDS } from '../../src/scene/recipe/contract.ts'
import { validateAsset, validateHeroRecord, type AssetReport, type HeroAtlasBinding, type HeroRecord } from './assets.ts'
import { loadSceneHostScenery, prepareSceneBuild, type PreparedSceneBuild } from './build.ts'
import { extractCityBrief, type CityBriefV1, type ExtractCityBriefOptions } from './facts.ts'

const DEFAULT_REPO_ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '../..')
const ID = /^[a-z][a-z0-9]*(?:-[a-z0-9]+)*$/u
const MAX_JSON_BYTES = 8 * 1024 * 1024
const WORLD_SOURCES = [
  'scripts/scene-factory/world.ts',
  'scripts/scene-factory/build.ts',
  'scripts/scene-factory/facts.ts',
  'scripts/scene-factory/layout.ts',
  'scripts/scene-factory/layout-seeds.ts',
  'scripts/scene-factory/assets.ts',
  'src/scene/recipe/contract.ts',
  'src/scene/recipe/pack.ts',
] as const

type Command = 'build' | 'check'
type ExtractBrief = (options: ExtractCityBriefOptions) => Promise<CityBriefV1>
export type SceneAssetValidator = (bytes: Buffer, kind: 'kit' | 'hero', id: string, expectedNodes?: readonly string[], binding?: HeroAtlasBinding) => Promise<AssetReport>

export interface SceneWorldPlanOptions {
  repoRoot: string
  assetIndexPath: string
  hostSceneryPath: string
}

export interface SceneWorldOptions extends SceneWorldPlanOptions {
  command: Command
  outputDirectory: string
}

export interface SceneWorldDependencies {
  extractBrief: ExtractBrief
  assetValidator: SceneAssetValidator
  expectedCityCount: number
  expectedRegionCount: number
}

export interface SceneWorldSummary {
  command: Command
  cities: number
  regions: number
  recipes: number
  outputDirectory: string
  manifestSha256: string
}

interface AssetIndexRow { id: string; asset: string; report: string }
interface HeroAssetIndexRow extends AssetIndexRow { venue: string | null }
interface AssetIndex { kits: AssetIndexRow[]; heroes: HeroAssetIndexRow[] }
interface RegionRegistry { regions: { id: RegionId; cityIds: string[] }[]; cityIds: string[] }
interface InputFile { absolute: string; relative: string; bytes: Buffer; sha256: string; value: unknown }
export interface PlannedSceneWorldFile { readonly path: string; readonly bytes: Buffer }
export interface SceneWorldPlanSummary { readonly cities: number; readonly regions: number; readonly recipes: number }
export interface PreparedSceneWorld {
  readonly files: readonly PlannedSceneWorldFile[]
  readonly summary: SceneWorldPlanSummary
  readonly manifestSha256: string
}

const PRODUCTION_DEPENDENCIES: SceneWorldDependencies = {
  extractBrief: options => extractCityBrief(options), assetValidator: validateAsset,
  expectedCityCount: 284, expectedRegionCount: REGION_IDS.length,
}

function requireValue(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(message)
}

function sha256(value: string | Uint8Array): string {
  return createHash('sha256').update(value).digest('hex')
}

function dataObject(value: unknown, label: string, required: readonly string[], optional: readonly string[] = []): Record<string, unknown> {
  requireValue(value !== null && typeof value === 'object' && !Array.isArray(value), `${label} must be an object`)
  requireValue(Object.getPrototypeOf(value) === Object.prototype || Object.getPrototypeOf(value) === null, `${label} must be a plain object`)
  const allowed = new Set([...required, ...optional]), result: Record<string, unknown> = {}
  for (const key of Reflect.ownKeys(value)) {
    requireValue(typeof key === 'string' && allowed.has(key), `${label} has unknown field ${String(key)}`)
    const descriptor = Object.getOwnPropertyDescriptor(value, key)
    requireValue(descriptor?.enumerable === true && Object.hasOwn(descriptor, 'value'), `${label}.${key} must be a JSON data field`)
    result[key] = descriptor.value
  }
  for (const key of required) requireValue(Object.hasOwn(result, key), `${label}.${key} is required`)
  return result
}

function dataArray(value: unknown, label: string, maximum: number): unknown[] {
  requireValue(Array.isArray(value) && value.length <= maximum, `${label} must be an array of at most ${maximum} entries`)
  requireValue(Reflect.ownKeys(value).length === value.length + 1, `${label} must be a dense JSON array`)
  const result: unknown[] = []
  for (let index = 0; index < value.length; index++) {
    const descriptor = Object.getOwnPropertyDescriptor(value, index)
    requireValue(descriptor?.enumerable === true && Object.hasOwn(descriptor, 'value'), `${label}[${index}] must be a JSON data field`)
    result.push(descriptor.value)
  }
  return result
}

function text(value: unknown, label: string): string {
  requireValue(typeof value === 'string' && value.trim() === value && value.length > 0 && !/[\u0000-\u001f\u007f]/u.test(value), `${label} must be non-empty plain text`)
  return value
}

function identifier(value: unknown, label: string): string {
  const result = text(value, label)
  requireValue(ID.test(result), `${label} must be an identifier`)
  return result
}

function regionId(value: unknown, label: string): RegionId {
  const found = REGION_IDS.find(id => id === value)
  requireValue(found !== undefined, `${label} must be a known region`)
  return found
}

function jsonValue(bytes: Buffer, label: string): unknown {
  try { const value: unknown = JSON.parse(bytes.toString('utf8')); return value }
  catch { throw new Error(`${label} must contain valid JSON`) }
}

function logicalPath(value: unknown, label: string): string {
  const path = text(value, label)
  requireValue(!isAbsolute(path) && !path.includes('\\'), `${label} must be a repo-relative POSIX path`)
  requireValue(path.split('/').every(part => part.length > 0 && part !== '.' && part !== '..'), `${label} must stay within the repository`)
  return path
}

async function regularFile(path: string, label: string, maximum: number): Promise<Buffer> {
  let info: Stats
  try { info = await lstat(path) } catch { throw new Error(`${label} is missing or unreadable`) }
  requireValue(info.isFile() && !info.isSymbolicLink(), `${label} must be a regular non-symlink file`)
  requireValue(info.size > 0 && info.size <= maximum, `${label} exceeds its byte limit`)
  return readFile(path)
}

async function repoInput(repoRoot: string, path: string, label: string, maximum = MAX_JSON_BYTES): Promise<InputFile> {
  const input = await repoBytes(repoRoot, path, label, maximum)
  return { ...input, value: jsonValue(input.bytes, label) }
}

async function repoBytes(repoRoot: string, path: string, label: string, maximum: number): Promise<{ absolute: string; relative: string; bytes: Buffer; sha256: string }> {
  const relativePath = logicalPath(path, `${label} path`), absolute = resolve(repoRoot, relativePath)
  const back = relative(repoRoot, absolute)
  requireValue(back === relativePath || back.split('\\').join('/') === relativePath, `${label} path must stay within the repository`)
  let resolvedRoot: string, resolvedInput: string
  try { [resolvedRoot, resolvedInput] = await Promise.all([realpath(repoRoot), realpath(absolute)]) }
  catch { throw new Error(`${label} is missing or unreadable`) }
  const realBack = relative(resolvedRoot, resolvedInput)
  requireValue(realBack.length > 0 && !realBack.startsWith('..') && !isAbsolute(realBack), `${label} resolves outside the repository`)
  const bytes = await regularFile(absolute, label, maximum)
  return { absolute, relative: relativePath, bytes, sha256: sha256(bytes) }
}

function parseRegions(value: unknown, expectedRegions: number, expectedCities: number): RegionRegistry {
  const root = dataObject(value, 'region registry', ['schema', 'version', 'status', 'sourceParent', 'runtimeBase', 'upstreamMain', 'provenance', 'paletteFields', 'cityCoverage', 'regions'])
  requireValue(root.schema === 'allworld-scene-region-registry' && root.version === 1, 'region registry schema/version is unsupported')
  const coverage = dataObject(root.cityCoverage, 'region registry.cityCoverage', ['catalogueCities', 'uniqueCityIds', 'membershipCount', 'everyCityExactlyOnce'])
  requireValue(coverage.catalogueCities === expectedCities && coverage.uniqueCityIds === expectedCities && coverage.membershipCount === expectedCities && coverage.everyCityExactlyOnce === true, 'region registry city coverage is incomplete')
  const rows = dataArray(root.regions, 'region registry.regions', REGION_IDS.length).map((input, index) => {
    const row = dataObject(input, `region registry.regions[${index}]`, ['id', 'label', 'palette', 'artDirectionNote', 'cityCount', 'cityIds'])
    const id = regionId(row.id, `region registry.regions[${index}].id`)
    text(row.label, `region registry.regions[${index}].label`); text(row.artDirectionNote, `region registry.regions[${index}].artDirectionNote`)
    const palette = dataObject(row.palette, `region registry.regions[${index}].palette`, ['ground', 'wall', 'roof', 'accent', 'trim'])
    for (const [key, colour] of Object.entries(palette)) requireValue(typeof colour === 'string' && /^#[a-f0-9]{6}$/iu.test(colour), `region ${id} palette.${key} is invalid`)
    const cityIds = dataArray(row.cityIds, `region ${id}.cityIds`, expectedCities).map((city, at) => identifier(city, `region ${id}.cityIds[${at}]`))
    requireValue(row.cityCount === cityIds.length, `region ${id} cityCount is inconsistent`)
    requireValue(new Set(cityIds).size === cityIds.length, `region ${id} has duplicate city IDs`)
    return { id, cityIds }
  })
  requireValue(rows.length === expectedRegions && new Set(rows.map(row => row.id)).size === rows.length, 'region registry regions are missing or duplicated')
  const cityIds = rows.flatMap(row => row.cityIds)
  requireValue(cityIds.length === expectedCities && new Set(cityIds).size === cityIds.length, 'region registry must cover every city exactly once')
  return { regions: rows, cityIds }
}

function parseHeroes(value: unknown, cityIds: readonly string[]): Map<string, HeroRecord> {
  const rows = dataArray(value, 'hero registry', cityIds.length)
  requireValue(rows.length === cityIds.length, 'hero registry city coverage is incomplete')
  const result = new Map<string, HeroRecord>()
  for (const [index, row] of rows.entries()) {
    const exact = dataObject(row, `hero registry[${index}]`, ['city', 'country', 'name', 'category', 'sourceUrls', 'sourceRef', 'sourceLicence', 'accessed', 'geometryLicence', 'generator', 'parameters', 'evidence'], ['surface', 'builtYear', 'provenance'])
    dataArray(exact.sourceUrls, `hero registry[${index}].sourceUrls`, 32)
    dataObject(exact.parameters, `hero registry[${index}].parameters`, ['width', 'depth', 'height', 'seed', 'palette'], ['composition'])
    if (exact.surface !== undefined) dataObject(exact.surface, `hero registry[${index}].surface`, ['kind', 'region'])
    if (exact.provenance !== undefined) requireValue(exact.provenance !== null && typeof exact.provenance === 'object' && !Array.isArray(exact.provenance), `hero registry[${index}].provenance must be a JSON object`)
    validateHeroRecord(row)
    requireValue(!result.has(row.city), `hero registry duplicates ${row.city}`)
    result.set(row.city, row)
  }
  requireValue(cityIds.every(city => result.has(city)) && [...result.keys()].every(city => cityIds.includes(city)), 'hero registry must cover exactly the region cities')
  return result
}

function reportProvenance(value: unknown, label: string, canonical: HeroRecord): void {
  const report = dataObject(value, label, ['version', 'kind', 'id', 'url', 'sha256', 'rawBytes', 'brotliBytes', 'triangles', 'parts', 'extensions'], ['atlas', 'inputs'])
  if (report.inputs === undefined) {
    requireValue(canonical.surface === undefined, `${label} requires regional-atlas build inputs`)
    return
  }
  const inputs = dataObject(report.inputs, `${label}.inputs`, ['rawSha256', 'scriptsSha256', 'node', 'packer'], ['styleSha256', 'provenance'])
  if (canonical.surface) {
    requireValue(inputs.provenance !== undefined && isDeepStrictEqual(inputs.provenance, canonical), `${label} requires exact canonical regional-atlas provenance`)
    requireValue(typeof inputs.styleSha256 === 'string' && /^[a-f0-9]{64}$/.test(inputs.styleSha256), `${label} requires a regional style SHA-256`)
  } else if (inputs.provenance !== undefined) requireValue(isDeepStrictEqual(inputs.provenance, canonical), `${label} provenance differs from the canonical hero record`)
}

function measurement(report: AssetReport): MeasuredAsset {
  return {
    version: 1, kind: report.kind, id: report.id, sha256: report.sha256, rawBytes: report.rawBytes,
    brotliBytes: report.brotliBytes, triangles: report.triangles,
    parts: report.parts.map(part => ({ node: part.node, triangles: part.triangles, bounds: part.bounds })).sort((a, b) => a.node.localeCompare(b.node, 'en')),
    ...(report.atlas ? { atlas: report.atlas } : {}),
  }
}

function sameMeasurement(declared: MeasuredAsset | undefined, actual: AssetReport, label: string): void {
  requireValue(declared !== undefined, `${label} measurement is missing`)
  const normalized: MeasuredAsset = { ...declared, parts: [...declared.parts].sort((a, b) => a.node.localeCompare(b.node, 'en')) }
  requireValue(JSON.stringify(normalized) === JSON.stringify(measurement(actual)), `${label} measured report differs from decoded asset bytes`)
}

function parseAssetRow(value: unknown, label: string): AssetIndexRow {
  const row = dataObject(value, label, ['id', 'asset', 'report'])
  return { id: identifier(row.id, `${label}.id`), asset: logicalPath(row.asset, `${label}.asset`), report: logicalPath(row.report, `${label}.report`) }
}

function parseHeroAssetRow(value: unknown, label: string): HeroAssetIndexRow {
  const row = dataObject(value, label, ['id', 'asset', 'report', 'venue'])
  return {
    id: identifier(row.id, `${label}.id`), asset: logicalPath(row.asset, `${label}.asset`), report: logicalPath(row.report, `${label}.report`),
    venue: row.venue === null ? null : identifier(row.venue, `${label}.venue`),
  }
}

function parseAssetIndex(value: unknown, regions: readonly RegionId[], cities: readonly string[]): AssetIndex {
  const root = dataObject(value, 'asset index', ['schema', 'version', 'kits', 'heroes'])
  requireValue(root.schema === 'allworld-scene-assets' && root.version === 1, 'asset index schema/version is unsupported')
  const kits = dataArray(root.kits, 'asset index.kits', REGION_IDS.length).map((row, index) => parseAssetRow(row, `asset index.kits[${index}]`))
  const heroes = dataArray(root.heroes, 'asset index.heroes', cities.length).map((row, index) => parseHeroAssetRow(row, `asset index.heroes[${index}]`))
  requireValue(kits.length === regions.length && new Set(kits.map(row => row.id)).size === kits.length && regions.every(id => kits.some(row => row.id === id)), 'asset index must contain exactly one kit for every selected region')
  requireValue(heroes.length === cities.length && new Set(heroes.map(row => row.id)).size === heroes.length && cities.every(id => heroes.some(row => row.id === id)), 'asset index must contain exactly one hero for every city')
  requireValue(kits.every(row => regions.some(id => id === row.id)), 'asset index contains a kit outside the region registry')
  requireValue(heroes.every(row => cities.includes(row.id)), 'asset index contains a hero outside the city registry')
  return { kits, heroes }
}

function stableBrief(brief: CityBriefV1): string {
  return `${JSON.stringify(brief, null, 2)}\n`
}

function runtimeEntry(prepared: PreparedSceneBuild): string {
  const kit = { url: `/assets/scene-factory/kits/${prepared.runtime.region}-${prepared.runtime.assets.kit.sha256}.glb`, measurement: prepared.runtime.assets.kit }
  const hero = prepared.runtime.heroVenueId === null ? undefined : prepared.runtime.assets.hero
  requireValue(prepared.runtime.heroVenueId === null || hero !== undefined, `runtime hero metadata is missing for ${prepared.city}`)
  const metadata = {
    schema: 'allworld-recipe-runtime', version: 1, city: prepared.city, region: prepared.runtime.region,
    recipeSha256: prepared.recipeSha256, recipeBytes: Buffer.byteLength(prepared.recipeText), targetVenueIds: prepared.runtime.targetVenueIds,
    assets: { kit, ...(hero ? { hero: { url: `/assets/scene-factory/heroes/${prepared.city}-${hero.sha256}.glb`, measurement: hero } } : {}) },
    hostScenery: prepared.runtime.hostScenery,
  }
  return `import type { RecipeCityPack } from '../pack.ts'\n\nconst pack: RecipeCityPack = { text: ${JSON.stringify(prepared.recipeText)}, metadata: ${JSON.stringify(metadata)} }\n\nexport default pack\n`
}

function registrySource(cities: readonly string[]): string {
  return `import type { RecipeCityPack } from './pack.ts'\n\nconst CITY_IDS = ${JSON.stringify(cities)} as const\n\nfunction loadCity(city: string): Promise<{ default: RecipeCityPack }> {\n  return import(\`./cities/\${city}.ts\`)\n}\n\nexport const RECIPE_CITY_LOADERS: Readonly<Record<string, () => Promise<{ default: RecipeCityPack }>>> = Object.fromEntries(\n  CITY_IDS.map(city => [city, () => loadCity(city)]),\n)\n`
}

function setFile(files: Map<string, PlannedSceneWorldFile>, path: string, value: string | Buffer): void {
  const exact = logicalPath(path, 'output path')
  requireValue(!files.has(exact), `planned output duplicates ${exact}`)
  files.set(exact, { path: exact, bytes: typeof value === 'string' ? Buffer.from(value) : value })
}

async function sourcePins(): Promise<Record<string, string>> {
  const result: Record<string, string> = {}
  for (const path of WORLD_SOURCES) result[path] = sha256(await regularFile(resolve(DEFAULT_REPO_ROOT, path), path, MAX_JSON_BYTES))
  return result
}

function duplicateAssets(rows: readonly { kind: 'kit' | 'hero'; id: string; sha256: string }[]): { sha256: string; assets: string[] }[] {
  const groups = new Map<string, string[]>()
  for (const row of rows) (groups.get(row.sha256) ?? (groups.set(row.sha256, []), groups.get(row.sha256)!)).push(`${row.kind}:${row.id}`)
  return [...groups.entries()].filter(([, assets]) => assets.length > 1).sort(([left], [right]) => left.localeCompare(right, 'en')).map(([digest, assets]) => ({ sha256: digest, assets: assets.sort((a, b) => a.localeCompare(b, 'en')) }))
}

export async function prepareSceneWorld(options: SceneWorldPlanOptions, dependencies: SceneWorldDependencies = PRODUCTION_DEPENDENCIES): Promise<PreparedSceneWorld> {
  requireValue(Number.isSafeInteger(dependencies.expectedCityCount) && dependencies.expectedCityCount > 0 && dependencies.expectedCityCount <= 1000, 'expected city count is invalid')
  requireValue(Number.isSafeInteger(dependencies.expectedRegionCount) && dependencies.expectedRegionCount > 0 && dependencies.expectedRegionCount <= REGION_IDS.length, 'expected region count is invalid')
  const root = resolve(options.repoRoot)
  const rootInfo = await lstat(root)
  requireValue(rootInfo.isDirectory() && !rootInfo.isSymbolicLink(), 'repo root must be a regular directory')
  const [regionFile, heroFile, indexFile, hostFile, tools] = await Promise.all([
    repoInput(root, 'scripts/scene-factory/regions.json', 'region registry'),
    repoInput(root, 'scripts/scene-factory/heroes.json', 'hero registry'),
    repoInput(root, options.assetIndexPath, 'asset index'),
    repoInput(root, options.hostSceneryPath, 'host scenery', 2 * 1024 * 1024),
    sourcePins(),
  ])
  const regions = parseRegions(regionFile.value, dependencies.expectedRegionCount, dependencies.expectedCityCount)
  const hostScenery = await loadSceneHostScenery(hostFile.absolute, root)
  requireValue(hostScenery.sha256 === hostFile.sha256 && hostScenery.path === hostFile.relative, 'host scenery input identity changed while it was validated')
  const hostCities = Object.keys(hostScenery.cities).sort((a, b) => a.localeCompare(b, 'en'))
  const registeredCities = [...regions.cityIds].sort((a, b) => a.localeCompare(b, 'en'))
  requireValue(hostCities.length === registeredCities.length && hostCities.every((city, index) => city === registeredCities[index]), 'host scenery city coverage differs from the canonical region registry')
  const canonicalHeroes = parseHeroes(heroFile.value, regions.cityIds)
  const selectedRegions = regions.regions.map(row => row.id)
  const index = parseAssetIndex(indexFile.value, selectedRegions, regions.cityIds)
  const kits = new Map(index.kits.map(row => [row.id, row])), heroes = new Map(index.heroes.map(row => [row.id, row]))
  const regionByCity = new Map(regions.regions.flatMap(row => row.cityIds.map(city => [city, row.id] as const)))
  const files = new Map<string, PlannedSceneWorldFile>(), cities: Record<string, unknown>[] = []
  const assetRows: { kind: 'kit' | 'hero'; id: string; sourcePath: string; reportPath: string; reportSha256: string; publicPath: string; sha256: string }[] = []
  const actualKits = new Map<RegionId, AssetReport>(), actualHeroes = new Map<string, AssetReport>()

  for (const row of [...index.kits].sort((a, b) => a.id.localeCompare(b.id, 'en'))) {
    const [input, report] = await Promise.all([
      repoBytes(root, row.asset, `kit ${row.id} asset`, 2 * 1024 * 1024),
      repoInput(root, row.report, `kit ${row.id} report`, MAX_JSON_BYTES),
    ])
    const id = regionId(row.id, `kit ${row.id}.id`), actual = await dependencies.assetValidator(input.bytes, 'kit', id)
    actualKits.set(id, actual)
    const publicPath = `public/assets/scene-factory/kits/${row.id}-${input.sha256}.glb`
    setFile(files, publicPath, input.bytes)
    assetRows.push({ kind: 'kit', id: row.id, sourcePath: input.relative, reportPath: report.relative, reportSha256: report.sha256, publicPath, sha256: input.sha256 })
  }
  for (const row of [...index.heroes].sort((a, b) => a.id.localeCompare(b.id, 'en'))) {
    const canonical = canonicalHeroes.get(row.id), region = regionByCity.get(row.id)
    requireValue(canonical !== undefined && region !== undefined, `canonical hero identity is missing for ${row.id}`)
    if (canonical.surface) requireValue(canonical.surface.region === region, `canonical hero surface region differs for ${row.id}`)
    const selectedKit = actualKits.get(region)
    requireValue(selectedKit !== undefined, `validated regional kit is missing for ${row.id}`)
    const binding = canonical.surface === undefined ? undefined : { region, sha256: selectedKit.atlas?.sha256 ?? '' }
    if (binding) requireValue(binding.sha256.length > 0, `regional kit atlas is missing for ${row.id}`)
    const [input, report] = await Promise.all([
      repoBytes(root, row.asset, `hero ${row.id} asset`, 60_000),
      repoInput(root, row.report, `hero ${row.id} report`, MAX_JSON_BYTES),
    ])
    reportProvenance(report.value, `hero ${row.id} report`, canonical)
    const actual = await dependencies.assetValidator(input.bytes, 'hero', row.id, undefined, binding)
    actualHeroes.set(row.id, actual)
    const publicPath = `public/assets/scene-factory/heroes/${row.id}-${input.sha256}.glb`
    setFile(files, publicPath, input.bytes)
    assetRows.push({ kind: 'hero', id: row.id, sourcePath: input.relative, reportPath: report.relative, reportSha256: report.sha256, publicPath, sha256: input.sha256 })
  }

  let recipes = 0
  for (const city of [...regions.cityIds].sort((a, b) => a.localeCompare(b, 'en'))) {
    const region = regionByCity.get(city), kit = region === undefined ? undefined : kits.get(region), hero = heroes.get(city)
    requireValue(region !== undefined && kit !== undefined && hero !== undefined, `world inputs are incomplete for ${city}`)
    const brief = await dependencies.extractBrief({ cityId: city, region, repoRoot: root })
    requireValue(brief.city.id === city && brief.style.region === region, `fresh brief identity differs for ${city}`)
    requireValue(canonicalHeroes.get(city)?.country === (brief.city.country.id === 'nigeria' ? 'ng' : brief.city.country.id), `canonical hero country differs from the fresh brief for ${city}`)
    if (brief.targetVenueIds.length === 0) requireValue(hero.venue === null, `authored-only city ${city} must have a null hero venue`)
    else requireValue(hero.venue !== null && brief.targetVenueIds.includes(hero.venue), `hero venue for ${city} must be an actual recipe target`)
    const briefText = stableBrief(brief)
    const prepared = await prepareSceneBuild({
      briefText, briefLogicalPath: `scripts/scene-factory/generated/briefs/${city}.json`, region,
      kitReportPath: resolve(root, kit.report), kitAssetPath: resolve(root, kit.asset),
      heroReportPath: resolve(root, hero.report), heroAssetPath: resolve(root, hero.asset), heroVenueId: hero.venue,
      hostSceneryPath: hostFile.absolute, hostSceneryBook: hostScenery, sourceRoot: root,
    })
    requireValue(!prepared.manifestText.includes(`${root}/`), `offline manifest for ${city} contains an absolute repository path`)
    sameMeasurement(prepared.runtime.assets.kit, actualKits.get(region)!, `kit ${region}`)
    sameMeasurement(prepared.runtime.assets.hero, actualHeroes.get(city)!, `hero ${city}`)
    recipes += prepared.recipeCount
    setFile(files, `scripts/scene-factory/generated/briefs/${city}.json`, briefText)
    setFile(files, `scripts/scene-factory/generated/recipes/${city}.json`, prepared.recipeText)
    setFile(files, `scripts/scene-factory/generated/manifests/${city}.json`, prepared.manifestText)
    setFile(files, `src/scene/recipe/cities/${city}.ts`, runtimeEntry(prepared))
    cities.push({
      city, region, briefSha256: sha256(briefText), recipeSha256: prepared.recipeSha256,
      recipeBytes: Buffer.byteLength(prepared.recipeText), targetVenueIds: prepared.runtime.targetVenueIds,
      preservedVenueIds: brief.preservedVenueIds, excludedVenueIds: brief.excludedVenueIds,
      heroVenue: hero.venue, sourceFiles: brief.provenance.files, registrationFiles: brief.provenance.registrationFiles,
    })
  }
  const sortedCities = [...regions.cityIds].sort((a, b) => a.localeCompare(b, 'en'))
  setFile(files, 'src/scene/recipe/registry.generated.ts', registrySource(sortedCities))
  const finalHostScenery = await loadSceneHostScenery(hostFile.absolute, root)
  requireValue(finalHostScenery.sha256 === hostScenery.sha256, 'host scenery input changed while the world plan was prepared')
  const outputRows = [...files.values()].sort((a, b) => a.path.localeCompare(b.path, 'en')).map(file => ({ path: file.path, sha256: sha256(file.bytes), bytes: file.bytes.length }))
  const manifest = {
    schema: 'allworld-scene-world-manifest', version: 1, status: 'offline-staging-only',
    inputs: {
      regions: { path: regionFile.relative, sha256: regionFile.sha256 }, heroes: { path: heroFile.relative, sha256: heroFile.sha256 },
      assetIndex: { path: indexFile.relative, sha256: indexFile.sha256 }, hostScenery: { path: hostFile.relative, sha256: hostFile.sha256, sourceFiles: hostScenery.sourceFiles },
      toolSourcesSha256: tools,
    },
    coverage: { cities: sortedCities.length, regions: selectedRegions.length, recipes, cityIds: sortedCities, everyCityExactlyOnce: true },
    cities, assets: assetRows, outputs: outputRows, duplicateAssetSha256: duplicateAssets(assetRows),
    limitations: {
      runtimeAcceptance: false, browserAcceptance: false, authoredOnlyClassificationHook: 'loadAuthoredCityScenes-and-authored-citySceneDef',
      assetIdentity: 'Hashes prove byte identity. Shared hashes are reported and are not evidence of distinct geometry.',
    },
  }
  const manifestText = `${JSON.stringify(manifest, null, 2)}\n`, manifestSha256 = sha256(manifestText)
  setFile(files, 'scripts/scene-factory/generated/world-manifest.json', manifestText)
  return {
    files: Object.freeze([...files.values()].sort((a, b) => a.path.localeCompare(b.path, 'en'))),
    summary: Object.freeze({ cities: sortedCities.length, regions: selectedRegions.length, recipes }), manifestSha256,
  }
}

async function exists(path: string): Promise<boolean> {
  try { await access(path, constants.F_OK); return true } catch { return false }
}

async function buildStage(outputDirectory: string, files: readonly PlannedSceneWorldFile[]): Promise<void> {
  const out = resolve(outputDirectory)
  requireValue(!await exists(out), `output already exists: ${out}`)
  const parent = await lstat(dirname(out))
  requireValue(parent.isDirectory() && !parent.isSymbolicLink(), 'output parent must be a regular directory')
  let owned = false
  try {
    await mkdir(out); owned = true
    for (const file of files) {
      const target = join(out, ...file.path.split('/'))
      await mkdir(dirname(target), { recursive: true })
      await writeFile(target, file.bytes, { flag: 'wx' })
    }
  } catch (error) {
    if (owned) await rm(out, { recursive: true, force: true })
    throw error
  }
}

async function stagedFiles(root: string): Promise<Map<string, Buffer>> {
  const rootInfo = await lstat(root)
  requireValue(rootInfo.isDirectory() && !rootInfo.isSymbolicLink(), 'staging output must be a regular directory')
  const result = new Map<string, Buffer>()
  const visit = async (directory: string, prefix: string): Promise<void> => {
    for (const entry of await readdir(directory, { withFileTypes: true })) {
      const path = prefix ? `${prefix}/${entry.name}` : entry.name, absolute = join(directory, entry.name)
      requireValue(!entry.isSymbolicLink(), `staging output contains a symlink at ${path}`)
      if (entry.isDirectory()) await visit(absolute, path)
      else {
        requireValue(entry.isFile(), `staging output contains a non-file at ${path}`)
        result.set(path, await readFile(absolute))
      }
    }
  }
  await visit(root, '')
  return result
}

async function checkStage(outputDirectory: string, files: readonly PlannedSceneWorldFile[]): Promise<void> {
  const actual = await stagedFiles(resolve(outputDirectory))
  const planned = new Map(files.map(file => [file.path, file])), expectedPaths = [...planned.keys()].sort((a, b) => a.localeCompare(b, 'en')), actualPaths = [...actual.keys()].sort((a, b) => a.localeCompare(b, 'en'))
  requireValue(expectedPaths.length === actualPaths.length && expectedPaths.every((path, index) => path === actualPaths[index]), 'staging output file inventory differs from the deterministic rebuild')
  for (const path of expectedPaths) requireValue(actual.get(path)?.equals(planned.get(path)!.bytes) === true, `staged output differs at ${path}`)
}

export async function runSceneWorld(options: SceneWorldOptions, dependencies: SceneWorldDependencies = PRODUCTION_DEPENDENCIES): Promise<SceneWorldSummary> {
  const planned = await prepareSceneWorld(options, dependencies)
  if (options.command === 'build') await buildStage(options.outputDirectory, planned.files)
  else await checkStage(options.outputDirectory, planned.files)
  return { command: options.command, ...planned.summary, outputDirectory: resolve(options.outputDirectory), manifestSha256: planned.manifestSha256 }
}

function option(values: Map<string, string>, flag: string): string {
  const value = values.get(flag)
  requireValue(value !== undefined && value.length > 0, `${flag} requires a value`)
  return value
}

export function parseSceneWorldCli(argv: readonly string[]): SceneWorldOptions {
  const command = argv[0]
  requireValue(command === 'build' || command === 'check', 'usage: world.ts <build|check> --repo-root <path> --asset-index <repo-relative-json> --host-scenery <repo-relative-json> --out <path>')
  const values = new Map<string, string>()
  for (let index = 1; index < argv.length; index += 2) {
    const flag = argv[index], value = argv[index + 1]
    requireValue(typeof flag === 'string' && flag.startsWith('--') && value !== undefined, `${flag ?? 'argument'} requires a value`)
    requireValue(!values.has(flag), `duplicate argument ${flag}`)
    values.set(flag, value)
  }
  const allowed = new Set(['--repo-root', '--asset-index', '--host-scenery', '--out'])
  for (const flag of values.keys()) requireValue(allowed.has(flag), `unknown argument ${flag}`)
  requireValue(values.size === allowed.size, 'all scene world arguments are required')
  return {
    command, repoRoot: resolve(option(values, '--repo-root')),
    assetIndexPath: logicalPath(option(values, '--asset-index'), '--asset-index'),
    hostSceneryPath: logicalPath(option(values, '--host-scenery'), '--host-scenery'),
    outputDirectory: resolve(option(values, '--out')),
  }
}

export async function runSceneWorldCli(argv: readonly string[] = process.argv.slice(2)): Promise<SceneWorldSummary> {
  const summary = await runSceneWorld(parseSceneWorldCli(argv))
  process.stdout.write(`${JSON.stringify(summary)}\n`)
  return summary
}

if (process.argv[1] && pathToFileURL(resolve(process.argv[1])).href === import.meta.url) {
  runSceneWorldCli().catch(error => { process.stderr.write(`${error instanceof Error ? error.message : String(error)}\n`); process.exitCode = 1 })
}
