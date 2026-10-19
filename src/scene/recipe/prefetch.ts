import { linksFrom } from '../../game/cities/registry.ts'
import { parseRecipePack, requireRecipe } from './pack.ts'
import type { RecipeAssetRef, RecipeCityPack } from './pack.ts'

type Idle = (run: () => void | Promise<void>) => void
type Stop = () => void
type PackLoader = (city: string) => Promise<unknown>

export interface RecipePrefetchOptions {
  currentCity: () => string
  onCityChange: (refresh: () => void) => Stop
  idle: Idle
  hold: () => boolean
  neighbours?: (city: string) => readonly { to: string; status?: string; mode?: string; km?: number }[]
  loadPack?: PackLoader
  fetcher?: typeof globalThis.fetch
}

type GeneratedRegistry = Readonly<Record<string, () => Promise<{ default: RecipeCityPack }>>>
let registryJob: Promise<GeneratedRegistry> | null = null

const modeRank = (mode: string | undefined): number => mode === 'road' || mode === 'rail' ? 0 : mode === 'air' ? 1 : 2
const distance = (km: number | undefined): number => km !== undefined && Number.isFinite(km) && km >= 0 ? km : Infinity

async function generatedPack(city: string): Promise<unknown> {
  const job = registryJob ??= import('./registry.generated.ts').then(module => module.RECIPE_CITY_LOADERS)
  let registry: GeneratedRegistry
  try { registry = await job }
  catch (error) { if (registryJob === job) registryJob = null; throw error }
  const load = Object.hasOwn(registry, city) ? registry[city] : undefined
  requireRecipe(load, `missing generated city ${city}`)
  return (await load()).default
}

async function consumeAsset(ref: RecipeAssetRef, fetcher: typeof globalThis.fetch, signal: AbortSignal): Promise<void> {
  const response = await fetcher(ref.url, { method: 'GET', mode: 'same-origin', credentials: 'same-origin', cache: 'force-cache', redirect: 'error', signal })
  requireRecipe(response.ok, `prefetch HTTP ${response.status}`)
  const body = response.body
  requireRecipe(body, 'prefetch response has no body')
  const declared = response.headers.get('content-length')
  if (declared !== null) requireRecipe(/^\d+$/u.test(declared) && Number(declared) <= ref.measurement.rawBytes, 'prefetch content length exceeds declared bytes')
  const reader = body.getReader()
  let received = 0
  try {
    for (;;) {
      const { done, value } = await reader.read()
      if (done) break
      received += value.byteLength
      requireRecipe(received <= ref.measurement.rawBytes, 'prefetch asset exceeds declared bytes')
    }
  } catch (error) {
    await reader.cancel().catch(() => undefined)
    throw error
  } finally { reader.releaseLock() }
  requireRecipe(received === ref.measurement.rawBytes, 'prefetch asset byte length differs from metadata')
}

/**
 * Import at most three nearby linked cities, one per idle turn, and consume their immutable GLBs into the browser HTTP cache.
 * This never decodes an image, texture or geometry; normal venue loading remains the validation and preparation path.
 */
export function startNeighborRecipePrefetch(options: RecipePrefetchOptions): Stop {
  const neighbours = options.neighbours ?? linksFrom
  const loadPack = options.loadPack ?? generatedPack
  const fetcher = options.fetcher ?? globalThis.fetch
  const warmedCities = new Set<string>(), warmedUrls = new Set<string>()
  let queue: string[] = [], revision = 0, scheduled = false, active = false, stopped = false
  let request: AbortController | null = null

  const current = (token: number, origin: string): boolean => !stopped && revision === token && options.currentCity() === origin
  const schedule = (): void => {
    if (stopped || scheduled || active || options.hold() || queue.length === 0) return
    scheduled = true
    options.idle(runOne)
  }
  const refresh = (): void => {
    revision++
    request?.abort()
    request = null
    const origin = options.currentCity(), seen = new Set<string>()
    try {
      queue = neighbours(origin)
        .filter(link => (link.status ?? 'open') === 'open' && link.to !== origin)
        .sort((a, b) => modeRank(a.mode) - modeRank(b.mode)
          || (distance(a.km) < distance(b.km) ? -1 : distance(a.km) > distance(b.km) ? 1 : 0)
          || (a.to < b.to ? -1 : a.to > b.to ? 1 : 0))
        .flatMap(link => {
          if (seen.has(link.to)) return []
          seen.add(link.to)
          return [link.to]
        }).slice(0, 3)
    } catch { queue = [] }
    schedule()
  }
  async function runOne(): Promise<void> {
    scheduled = false
    if (stopped || active || options.hold()) return
    const origin = options.currentCity(), token = revision, city = queue.shift()
    if (!city) return
    if (warmedCities.has(city)) { schedule(); return }
    active = true
    try {
      const pack = await parseRecipePack(await loadPack(city), city)
      if (!current(token, origin) || options.hold()) return
      const refs = pack.metadata.targetVenueIds.length === 0 ? [] : [pack.metadata.assets.kit, ...(pack.metadata.assets.hero ? [pack.metadata.assets.hero] : [])]
      for (const ref of refs) {
        if (!current(token, origin) || options.hold()) return
        if (warmedUrls.has(ref.url)) continue
        const controller = new AbortController()
        request = controller
        try { await consumeAsset(ref, fetcher, controller.signal) }
        finally {
          controller.abort()
          if (request === controller) request = null
        }
        if (!current(token, origin) || options.hold()) return
        warmedUrls.add(ref.url)
      }
      if (current(token, origin)) warmedCities.add(city)
    } catch { /* normal navigation loads and validates the city again */ }
    finally {
      active = false
      schedule()
    }
  }

  const unwatch = options.onCityChange(refresh)
  refresh()
  return () => {
    if (stopped) return
    stopped = true
    revision++
    queue = []
    request?.abort()
    request = null
    unwatch()
  }
}
