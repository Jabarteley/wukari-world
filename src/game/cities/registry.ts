import { CITY_INDEX, CITY_LOADERS, CITY_WORLD_INDEX, RESERVED_CITIES } from './catalogue.ts'
import { generateCityLinks } from './generatedLinks.ts'
import { mapEntryOf } from './mapEntry.ts'
import { priceLevelOf, scaleCityContent } from '../price-levels.ts'
import { CITY_NETWORK_AT_START, fetchCityNetwork } from '#city-network'
import type { CityCatalogueEntry, CityModuleLoader, CityWorldIndex, CityWorldIndexLoader } from './catalogue.ts'
import type { CityLandComponentRow } from './generatedLinks.ts'
import type { CityNetwork } from './network.ts'
import type { CityId } from './ids.ts'
import type { CityAtlasMarker, CityContent, CityCountry, CityDistrict, CityHub, CityLink, CityLinkFrom, CityMapOrigin, CityMapPack, CityModule, CityRouteGeometry, CityRules, CityState } from '../../types/content.ts'

export const DEFAULT_CITY_ID: CityId<'lagos'> = 'lagos'

export interface CityCompatibility { acceptStoredLives: boolean; allowNewLives: boolean; contentSource: string | null; note: string }
export interface KnownCity { catalogue: CityCatalogueEntry; serverKnown: boolean; compatibility: CityCompatibility }
export interface CataloguedCityRules extends CityRules {
  state: CityState
  country: CityCountry
  timezone: string
  atlas: CityAtlasMarker
  mapOrigin: CityMapOrigin | null
  districts: readonly CityDistrict[]
  rentedHomeIds: readonly string[]
  defaultRentedHome: string | null
  defaultName: string
  careerIds: readonly string[]
  campus?: 'unilag'
  hasStateOverview?: boolean
  hubs: readonly CityHub[]
}

const PLAYABLE_ORDER = ['lagos', 'ibadan', 'abeokuta', 'ota', 'ijebu-ode', 'sagamu', 'port-harcourt', 'abuja', 'kano'] as const

// ---- The city index and the world network ---------------------------------------------------------------------------------------
// The city index (catalogue.ts CITY_INDEX: each open city's id and name, plus its rules loader) is enough to know which cities exist
// and are open, to name them and to load any city's rules. Node, the Worker and the development server hold all of it from the start.
// A browser build starts with Nigeria's rows only (a fixed set, so a new city elsewhere adds nothing to the first download) and fetches
// the whole index once, as the lazy `city-index` chunk (vite.config.ts lazyCityLoaders): loadCityIndex(). Until then the readers below
// answer for the startup ids and refuse for any other (CityIndexNotReadyError): never a silent "no such city" for a city that exists.
// Everything about where cities are and how they connect (the full catalogue, the land components, the authored routes, and so the
// generated links) is the world network (network.ts), a lazy chunk in the browser and part of the module graph in Node and the Worker
// (#city-network). The synchronous readers of the network refuse to answer before it is in: a caller awaits loadCityNetwork() first,
// which brings the whole index too.

interface IndexState { open: ReadonlySet<string>; names: ReadonlyMap<string, string>; ids: readonly string[]; loaders: Readonly<Record<string, CityModuleLoader | undefined>> }
function indexState(rows: readonly { readonly id: string; readonly name: string }[], loaders: Readonly<Record<string, CityModuleLoader | undefined>>): IndexState {
  const closed = RESERVED_CITIES.filter((city) => !rows.some((open) => open.id === city.id))
  return {
    open: new Set(rows.map((city) => city.id)),
    names: new Map([...rows, ...closed].map((city) => [city.id, city.name])),
    ids: Object.freeze([...rows.slice(0, 4).map((city) => city.id), ...closed.map((city) => city.id), ...rows.slice(4).map((city) => city.id)]),
    loaders,
  }
}
/** Open cities from the city index, then the reserved closed ones. Known ids never need the network. */
let cityIndex: IndexState = indexState(CITY_INDEX, CITY_LOADERS)
/** The ids the startup index answers for without the whole index (every one in Node and the Worker). */
let startupIds: ReadonlySet<string> = new Set(cityIndex.names.keys())
let worldIndexLoader: CityWorldIndexLoader | null = CITY_WORLD_INDEX
let pendingIndex: Promise<void> | null = null

/** Thrown by a synchronous city-id reader asked about a city outside the startup index before loadCityIndex() settled. */
export class CityIndexNotReadyError extends Error {
  readonly code = 'city_index_not_ready'
  constructor(reader: string) { super(`${reader} needs the whole city index: await loadCityIndex()`) }
}

function installIndex(loaded: CityWorldIndex): void {
  if (loaded.index.length !== loaded.loaders.length) throw new Error('City index and loaders differ')
  const rows = loaded.index.map(([id, name]) => Object.freeze({ id, name }))
  cityIndex = indexState(rows, Object.freeze(Object.fromEntries(rows.map((city, row) => [city.id, loaded.loaders[row]]))))
  worldIndexLoader = null
  registeredIds = null
}

/** Whether the whole city index is in (always in Node, the Worker and the development server; in a browser build once loadCityIndex() settled). */
export const cityIndexReady = (): boolean => worldIndexLoader === null

/** Fetch the whole city index once (a small lazy chunk in a browser build; already in everywhere else). */
export function loadCityIndex(): Promise<void> {
  const loader = worldIndexLoader
  if (!loader) return Promise.resolve()
  if (pendingIndex) return pendingIndex
  const work: Promise<void> = loader().then((loaded) => { if (worldIndexLoader === loader) installIndex(loaded) }).finally(() => { if (pendingIndex === work) pendingIndex = null })
  pendingIndex = work
  return work
}

/**
 * What a caller about to read ids it got from storage or the server must wait for: null when the startup index answers for every
 * one of them (or the whole index is in), else loadCityIndex(). Callers write `const wait = cityIndexWaitFor(ids); if (wait) await wait`,
 * so a resident of a startup city (and every path in Node and the Worker) runs exactly as before, with no extra turn.
 */
export function cityIndexWaitFor(values: Iterable<unknown>): Promise<void> | null {
  if (!worldIndexLoader) return null
  for (const value of values) if (typeof value === 'string' && !startupIds.has(value) && !fixtures.has(value)) return loadCityIndex()
  return null
}

/** True when the reader may answer: the whole index is in. Otherwise it throws, or in a production browser build reports once. */
let indexReported = false
function wholeIndexFor(reader: string): boolean {
  if (!worldIndexLoader) return true
  const error = new CityIndexNotReadyError(reader)
  if (!lenient) throw error
  if (!indexReported) { indexReported = true; (globalThis as { console?: { error(value: unknown): void } }).console?.error(error) }
  return false
}
/** For a point reader: the id is in the startup index, or the whole index is in (else refuse as wholeIndexFor does). */
const answerable = (id: string, reader: string): boolean => cityIndex.names.has(id) || fixtures.has(id) || wholeIndexFor(`${reader}(${JSON.stringify(id)})`)

interface ReadyNetwork { catalogue: readonly CityCatalogueEntry[]; byId: ReadonlyMap<string, CityCatalogueEntry>; land: readonly CityLandComponentRow[]; known: Readonly<Record<string, KnownCity | undefined>> }
let network: ReadyNetwork | null = null
let pendingNetwork: Promise<void> | null = null

/** Thrown by a synchronous reader of the world network called before loadCityNetwork() settled. */
export class CityNetworkNotReadyError extends Error {
  readonly code = 'city_network_not_ready'
  constructor(reader: string) { super(`${reader} reads the world city network, which has not loaded yet: await loadCityNetwork() before calling it`) }
}

// A production browser build defines this (vite.config.ts): there a missed await is reported once instead of breaking the page.
declare const __CITY_NETWORK_LENIENT__: boolean | undefined
const lenient = typeof __CITY_NETWORK_LENIENT__ !== 'undefined' && __CITY_NETWORK_LENIENT__ === true
let reported = false
/** The network, or (only in a production browser build, after one console report) null; everywhere else a missed await throws. */
function networkFor(reader: string): ReadyNetwork | null {
  if (network) return network
  const error = new CityNetworkNotReadyError(reader)
  if (!lenient) throw error
  if (!reported) { reported = true; (globalThis as { console?: { error(value: unknown): void } }).console?.error(error) }
  return null
}

function installNetwork(loaded: CityNetwork): void {
  const byId = new Map(loaded.catalogue.map((city) => [city.id, city]))
  const known = Object.freeze(Object.fromEntries(loaded.catalogue.map((catalogue) => [catalogue.id, Object.freeze({
    catalogue,
    serverKnown: catalogue.open,
    compatibility: Object.freeze({ acceptStoredLives: catalogue.open, allowNewLives: catalogue.open, contentSource: catalogue.open ? catalogue.id : null, note: catalogue.open ? 'Open and playable.' : 'Reserved for future city content.' }),
  })])))
  network = { catalogue: loaded.catalogue, byId, land: loaded.land, known }
  authoredCityLinks = loaded.authoredLinks
  CITY_LINKS = authoredCityLinks
  linkCache = null
}

/** Whether the world network is in (always in Node and the Worker; in the browser once loadCityNetwork() settled). */
export const cityNetworkReady = (): boolean => network !== null

/** Fetch the world network (and the whole city index) once; every caller that reads other cities' places or routes awaits this. */
export function loadCityNetwork(): Promise<void> {
  if (network) return worldIndexLoader ? loadCityIndex() : Promise.resolve()
  if (pendingNetwork) return pendingNetwork
  const work: Promise<void> = Promise.all([fetchCityNetwork(), loadCityIndex()]).then(([loaded]) => { if (!network) installNetwork(loaded) }).finally(() => { if (pendingNetwork === work) pendingNetwork = null })
  pendingNetwork = work
  return work
}

/**
 * Test only: behave as the browser does before the world network has loaded (Node and the Worker have it from the start), so a test
 * can prove a path works with the startup index alone. dispose() puts the network back.
 */
export function unloadCityNetworkForTest(): { dispose: () => void } {
  const kept = { network, authoredCityLinks, links: CITY_LINKS }
  network = null; authoredCityLinks = null; CITY_LINKS = Object.freeze([]); linkCache = null; pendingNetwork = null
  return Object.freeze({ dispose: () => { network = kept.network; authoredCityLinks = kept.authoredCityLinks; CITY_LINKS = kept.links; linkCache = null; pendingNetwork = null } })
}

/**
 * Test only: behave as a browser build does before the whole city index is in: the startup index holds only the ids in `startup`
 * (Nigeria's open cities by default, as vite.config.ts keeps) and loadCityIndex() brings back the whole one. dispose() restores it.
 */
export function startupCityIndexForTest(startup: (id: string) => boolean): { dispose: () => void } {
  const kept = { cityIndex, startupIds, worldIndexLoader, registeredIds }
  const ids = kept.cityIndex.ids.filter((id) => kept.cityIndex.open.has(id))
  const whole: CityWorldIndex = Object.freeze({ index: Object.freeze(ids.map((id) => Object.freeze([id, kept.cityIndex.names.get(id) ?? id] as const))), loaders: Object.freeze(ids.map((id) => kept.cityIndex.loaders[id] as CityModuleLoader)) })
  const rows = ids.filter(startup).map((id) => Object.freeze({ id, name: kept.cityIndex.names.get(id) ?? id }))
  cityIndex = indexState(rows, Object.freeze(Object.fromEntries(rows.map((city) => [city.id, kept.cityIndex.loaders[city.id]]))))
  startupIds = new Set(cityIndex.names.keys())
  worldIndexLoader = () => Promise.resolve(whole)
  pendingIndex = null; registeredIds = null
  return Object.freeze({ dispose: () => { cityIndex = kept.cityIndex; startupIds = kept.startupIds; worldIndexLoader = kept.worldIndexLoader; registeredIds = kept.registeredIds; pendingIndex = null } })
}

/** Every catalogued city (open and reserved), keyed by id, with how stored lives treat it. Reads the world network. */
export const knownCities = (): Readonly<Record<string, KnownCity | undefined>> => networkFor('knownCities()')?.known ?? Object.freeze({})

const fixtures = new Map<string, CityModule>()
const loadedModules = new Map<string, CityModule>()
const loadedRules = new Map<string, CataloguedCityRules>()
const loadedContent = new Map<string, CityContent>()
const loadedMaps = new Map<string, CityMapPack>()
const pendingModules = new Map<string, Promise<CityModule>>()
const pendingContent = new Map<string, Promise<CityContent>>()
const pendingMaps = new Map<string, Promise<CityMapPack>>()
let hostModuleLoader: ((id: string) => Promise<CityModule>) | undefined

/** Hosts install their immutable asset reader before serving requests. */
export function installCityModuleLoader(loader: (id: string) => Promise<CityModule>): void {
  hostModuleLoader = loader
}
let authoredCityLinks: readonly CityLink[] | null = null
/** Loaded authored routes only. loadCityLinks (or loadCityNetwork) fills this live binding. */
export let CITY_LINKS: readonly CityLink[] = Object.freeze([])
let linkCache: readonly CityLink[] | null = null
if (CITY_NETWORK_AT_START) installNetwork(CITY_NETWORK_AT_START)

/** Full rules that have actually loaded. This compatibility table never invents partial city rules. */
const mutableCityRules: Record<string, CityRules> = Object.create(null)
export const CITY_RULES: Readonly<Record<string, CityRules>> = mutableCityRules
const publicRules = ({ id, name, status, unit, units, hub, civicTitle, climate }: CityRules): CityRules => Object.freeze({
  id, name, status, unit, units, hub, ...(civicTitle ? { civicTitle } : {}), ...(climate ? { climate } : {}),
})

function rememberModule(module: CityModule): CityModule {
  loadedModules.set(module.id, module)
  loadedRules.set(module.id, module.rules)
  mutableCityRules[module.id] = publicRules(module.rules)
  linkCache = null
  return module
}

async function readCityModule(id: string): Promise<CityModule> {
  const fixture = fixtures.get(id)
  if (fixture) return fixture
  const cached = loadedModules.get(id)
  if (cached) return cached
  if (!cityIndex.loaders[id] && worldIndexLoader) await loadCityIndex()
  const loader = cityIndex.loaders[id]
  if (!loader) throw new RangeError(`City rules are not available: ${id}`)
  const module = await (hostModuleLoader ? hostModuleLoader(id) : loader())
  if (module.id !== id || module.rules.id !== id) throw new Error(`City module id ${module.id} does not match ${id}`)
  return rememberModule(module)
}

function loadCityModule(id: string): Promise<CityModule> {
  const existing = pendingModules.get(id)
  if (existing) return existing
  const work = readCityModule(id).finally(() => { if (pendingModules.get(id) === work) pendingModules.delete(id) })
  pendingModules.set(id, work)
  return work
}

const catalogueOfModule = (module: CityModule): CityCatalogueEntry => Object.freeze({
  id: module.id,
  name: module.rules.name,
  state: Object.freeze({ id: module.rules.state.id, name: module.rules.state.name }),
  ...(module.rules.country.id !== 'ng' && module.rules.country.id !== 'nigeria' ? { countryISO: mapEntryOf(module.rules.country.id), countryName: module.rules.country.name } : {}),
  lon: module.rules.atlas.lon,
  lat: module.rules.atlas.lat,
  open: module.rules.status === 'open',
  airport: module.rules.hubs.some((hub) => hub.mode === 'air'),
  ...(module.rules.generatedLinkPolicy ? { generatedLinkPolicy: module.rules.generatedLinkPolicy } : {}),
  ...(module.rules.atlas.teaser ? { teaser: module.rules.atlas.teaser } : {}),
  ...(module.rules.atlas.preview ? { preview: module.rules.atlas.preview } : {}),
})

/** Every catalogued city with its place, state and country. Reads the world network: await loadCityNetwork() first. */
export const cityCatalogue = (): readonly CityCatalogueEntry[] => {
  const all = networkFor('cityCatalogue()')?.catalogue ?? []
  if (!fixtures.size) return all
  const catalogue = new Map(all.map((city) => [city.id, city]))
  for (const module of fixtures.values()) catalogue.set(module.id, catalogueOfModule(module))
  return Object.freeze([...catalogue.values()])
}
/** One city's place, state and country, or null for an unknown id. Reads the world network (except for a test fixture). */
export const cityCatalogueEntry = (value: unknown): CityCatalogueEntry | null => {
  if (typeof value !== 'string') return null
  const fixture = fixtures.get(value)
  if (fixture) return catalogueOfModule(fixture)
  return networkFor(`cityCatalogueEntry(${JSON.stringify(value)})`)?.byId.get(value) ?? null
}
export const catalogueCitiesInState = (stateId: unknown): readonly CityCatalogueEntry[] => typeof stateId === 'string' ? cityCatalogue().filter((city) => city.state.id === stateId) : []
// The id readers below use the city index only: they never need the network. The lists need the whole index; a point reader needs it
// only for an id outside the startup index (cityIndexWaitFor, loadCityIndex).
export const knownCityIds = (): readonly string[] => { wholeIndexFor('knownCityIds()'); return Object.freeze([...cityIndex.ids, ...fixtures.keys()].filter((id, at, all) => all.indexOf(id) === at)) }
/** Asked on every request and for every stored life: the list is made once and again only when a test adds or removes a city. */
let registeredIds: readonly CityId[] | null = null
export const registeredCityIds = (): readonly CityId[] => {
  if (!wholeIndexFor('registeredCityIds()')) return Object.freeze([...cityIndex.ids.filter((id) => cityIndex.open.has(id)), ...fixtures.keys()].filter((id, at, all) => all.indexOf(id) === at))
  return registeredIds ??= Object.freeze([...cityIndex.ids.filter((id) => cityIndex.open.has(id)), ...fixtures.keys()].filter((id, at, all) => all.indexOf(id) === at))
}
/** The open cities the index holds so far (Nigeria's in a browser before loadCityIndex() settles, all after): never refuses and never reports, for a reader that runs at mount. */
export const playableCityIdsSoFar = (): readonly CityId[] => {
  const open = new Set(cityIndex.ids.filter((id) => cityIndex.open.has(id)))
  const ordered = PLAYABLE_ORDER.filter((id) => open.delete(id))
  return Object.freeze([...ordered, ...open, ...fixtures.keys()].filter((id, at, all) => all.indexOf(id) === at))
}
export const playableCityIds = (): readonly CityId[] => { wholeIndexFor('playableCityIds()'); return playableCityIdsSoFar() }
export const isKnownCityId = (value: unknown): value is string => typeof value === 'string' && answerable(value, 'isKnownCityId') && (cityIndex.names.has(value) || fixtures.has(value))
export const isCityId = (value: unknown): value is CityId => typeof value === 'string' && answerable(value, 'isCityId') && (cityIndex.open.has(value) || fixtures.has(value))
export const isOpenCityId = isCityId

/** Loaded modules and full rules only. Hosts await a loader before synchronous engine work. */
export const cityModule = (value: unknown): CityModule | null => typeof value === 'string' ? fixtures.get(value) ?? loadedModules.get(value) ?? null : null
export const cityRules = (value: unknown): CataloguedCityRules | null => typeof value === 'string' ? fixtures.get(value)?.rules ?? loadedRules.get(value) ?? null : null

export async function loadCityRules(cityId: unknown): Promise<CataloguedCityRules> {
  if (typeof cityId !== 'string') throw new TypeError('A city id is required')
  return (await loadCityModule(cityId)).rules
}
export async function loadAllCityRules(): Promise<readonly CataloguedCityRules[]> { return Promise.all(playableCityIds().map(loadCityRules)) }
export async function loadStateOverviewCity(stateId: unknown): Promise<string | null> {
  if (typeof stateId !== 'string') return null
  await loadCityNetwork()
  for (const city of catalogueCitiesInState(stateId).filter((item) => item.open)) if ((await loadCityRules(city.id)).hasStateOverview) return city.id
  return null
}

/** A city's display name from its loaded rules, else the city index (never the network). */
export const cityName = (value: unknown): string | null => cityRules(value)?.name ?? (typeof value === 'string' && answerable(value, 'cityName') ? cityIndex.names.get(value) ?? null : null)
export const cityDefaultName = (value: unknown): string => cityRules(value)?.defaultName ?? 'New Lagosian'
export const isDefaultName = (name: unknown): boolean => name === 'New Lagosian' || [...loadedRules.values(), ...[...fixtures.values()].map((value) => value.rules)].some((rules) => rules.defaultName === name)
/** Loaded full rules in a state. Catalogue-only marker callers use catalogueCitiesInState. */
export const citiesInState = (stateId: unknown): readonly CataloguedCityRules[] => typeof stateId === 'string'
  ? [...loadedRules.values(), ...[...fixtures.values()].map((value) => value.rules)].filter((rules) => rules.state.id === stateId)
  : []

const linkKey = (link: Pick<CityLink, 'a' | 'b' | 'mode'>): string => `${[link.a, link.b].sort().join('|')}|${link.mode}`
const sameLink = (a: CityLink, b: CityLink): boolean => a.a === b.a && a.b === b.b && a.mode === b.mode && (a.status ?? 'open') === (b.status ?? 'open') && a.label === b.label && a.icon === b.icon && a.fare === b.fare && a.seconds === b.seconds && a.km === b.km && a.beta === b.beta

/** Load the world network and return its authored routes. Hosts await this before synchronous travel views are built. */
export async function loadCityLinks(): Promise<readonly CityLink[]> {
  await loadCityNetwork()
  return authoredCityLinks ?? CITY_LINKS
}

/** Authored routes win over generated road and air routes. Rail is never generated. Reads the world network. */
export function allCityLinks(): readonly CityLink[] {
  if (linkCache) return linkCache
  const ready = networkFor('allCityLinks()')
  const merged = new Map<string, CityLink>()
  for (const link of authoredCityLinks ?? [...loadedModules.values()].flatMap((module) => module.rules.links)) merged.set(linkKey(link), link)
  const fixtureLinks = new Map<string, CityLink>()
  for (const link of [...fixtures.values()].flatMap((module) => module.rules.links)) {
    const key = linkKey(link), existing = fixtureLinks.get(key)
    if (existing && !sameLink(existing, link)) throw new Error(`Conflicting fixtures city link ${key}`)
    fixtureLinks.set(key, link); merged.set(key, link)
  }
  const open = (ready?.catalogue ?? []).filter((city) => city.open).map((city) => ({ id: city.id, name: city.name, lon: city.lon, lat: city.lat, airport: city.airport, countryId: city.countryISO ?? 'ng', generatedLinkPolicy: city.generatedLinkPolicy }))
  for (const link of generateCityLinks(open, [...merged.values()], ready?.land ?? [])) merged.set(linkKey(link), link)
  const links = Object.freeze([...merged.values()])
  if (ready) linkCache = links
  return links
}
// With ~160 open cities the merged list holds thousands of links and every route search asks for the links of many cities:
// index the (cached, frozen) list by city once instead of filtering all of it per call. Order is the list's order.
const linksByCity = new WeakMap<readonly CityLink[], Map<string, CityLink[]>>()
export const cityLinks = (cityId: string): readonly CityLink[] => {
  const all = allCityLinks()
  let index = linksByCity.get(all)
  if (!index) {
    index = new Map()
    for (const link of all) {
      for (const end of link.a === link.b ? [link.a] : [link.a, link.b]) {
        const list = index.get(end)
        if (list) list.push(link)
        else index.set(end, [link])
      }
    }
    linksByCity.set(all, index)
  }
  return [...(index.get(cityId) ?? [])]
}
export const linksFrom = (cityId: string): CityLinkFrom[] => cityLinks(cityId).map(({ a, b, ...link }) => ({ ...link, to: a === cityId ? b : a }))

async function readCityContent(cityId: string): Promise<CityContent> {
  const cached = loadedContent.get(cityId)
  if (cached) return cached
  // A city's content never reads the world network: a resident's startup is its rules and content only.
  const module = await loadCityModule(cityId)
  const loaded = await module.loadContent()
  if (loaded.cityId !== module.id) throw new Error(`City content id ${loaded.cityId} does not match ${module.id}`)
  // Real price levels (docs/PRICE-LEVELS.md): outside Nigeria a city's prices and wages are its base values times its country's level. The table is a lazy file, fetched here.
  const country = module.rules.country.id
  const foreign = country !== 'ng' && country !== 'nigeria'
  const content = foreign ? scaleCityContent(loaded, priceLevelOf((await import('../price-levels-data.ts')).PRICE_LEVEL_DATA, mapEntryOf(country))) : loaded
  if (cityModule(module.id) === module) loadedContent.set(module.id, content)
  return content
}
export function loadCityContent(cityId: unknown): Promise<CityContent> {
  if (typeof cityId !== 'string') return Promise.reject(new TypeError('A city id is required'))
  const pending = pendingContent.get(cityId)
  if (pending) return pending
  const work = readCityContent(cityId).finally(() => { if (pendingContent.get(cityId) === work) pendingContent.delete(cityId) })
  pendingContent.set(cityId, work)
  return work
}
export function cityContent(cityId: unknown): CityContent {
  if (typeof cityId !== 'string') throw new TypeError('A city id is required')
  const content = loadedContent.get(cityId)
  if (!content) throw new Error(`City content has not been loaded: ${cityId}`)
  return content
}
export const cachedCityContent = (cityId: unknown): CityContent | null => typeof cityId === 'string' ? loadedContent.get(cityId) ?? null : null

async function readCityMap(cityId: string): Promise<CityMapPack> {
  const cached = loadedMaps.get(cityId)
  if (cached) return cached
  // A map draws the cities and states around it (src/map3d, a city's map pack): the world network is in before its code runs.
  const [module] = await Promise.all([loadCityModule(cityId), loadCityNetwork()]), map = await module.loadMap()
  if (map.cityId !== module.id) throw new Error(`City map id ${map.cityId} does not match ${module.id}`)
  if (cityModule(module.id) === module) loadedMaps.set(module.id, map)
  return map
}
export function loadCityMap(cityId: unknown): Promise<CityMapPack> {
  if (typeof cityId !== 'string') return Promise.reject(new TypeError('A city id is required'))
  const pending = pendingMaps.get(cityId)
  if (pending) return pending
  const work = readCityMap(cityId).finally(() => { if (pendingMaps.get(cityId) === work) pendingMaps.delete(cityId) })
  pendingMaps.set(cityId, work)
  return work
}
export function cityMap(cityId: unknown): CityMapPack {
  if (typeof cityId !== 'string') throw new TypeError('A city id is required')
  const map = loadedMaps.get(cityId)
  if (!map) throw new Error(`City map has not been loaded: ${cityId}`)
  return map
}

/** Register one isolated fictional module for a test and remove every cached value on disposal. */
export function registerCityForTest(module: CityModule, { replaceClosed = false }: { replaceClosed?: boolean } = {}): { dispose: () => void } {
  const replacesReserved = replaceClosed && cityCatalogueEntry(module.id)?.open === false && !cityModule(module.id)
  if (!module.id.startsWith('test-') && !replacesReserved) throw new Error('Test city ids must start with test- or replace a closed reserved city')
  if (isKnownCityId(module.id) && !replacesReserved) throw new Error(`City id is already registered: ${module.id}`)
  fixtures.set(module.id, module); mutableCityRules[module.id] = publicRules(module.rules); linkCache = null; registeredIds = null
  let disposed = false
  return Object.freeze({ dispose: () => {
    if (disposed) return
    disposed = true
    if (fixtures.get(module.id) === module) { fixtures.delete(module.id); delete mutableCityRules[module.id]; linkCache = null; registeredIds = null }
    pendingModules.delete(module.id); pendingContent.delete(module.id); pendingMaps.delete(module.id)
    loadedModules.delete(module.id); loadedRules.delete(module.id); loadedContent.delete(module.id); loadedMaps.delete(module.id)
  } })
}

/** Map-only route geometry; loading rules never downloads its coordinates. */
export async function loadCityRoutes(id: string): Promise<readonly CityRouteGeometry[]> {
  if (!fixtures.has(id) && !cityIndex.loaders[id] && worldIndexLoader) await loadCityIndex()
  if (!fixtures.has(id) && !cityIndex.loaders[id]) return []
  return (await loadCityModule(id)).loadRoutes?.() ?? []
}
