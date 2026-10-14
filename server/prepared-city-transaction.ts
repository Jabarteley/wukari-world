import { cachedCityContent } from '../src/game/cities/registry.ts'
import type { CityId } from '../src/types/protocol.ts'
import { requireSessionCities, sessionCityIds } from './city-content.ts'
import { prepareStoredCityContent } from './request-city-content.ts'
import type { Db, RouteContext, RouteRequest, TransactOptions } from './types.ts'
import { bindSessionOrigin, requestOrigin } from './execution-origin.ts'
import { publishProgression } from './progression.ts'
import type { ProgressionEvent } from '../src/types/progression.ts'

class CityPreparationNeeded extends Error {
  readonly cityIds: readonly CityId[]
  constructor(cityIds: readonly CityId[]) {
    super('city_preparation_needed')
    this.cityIds = cityIds
  }
}

/** A cold preflight aborts before the business callback, which runs once after loading outside storage. */
export async function transactWithCityContent<T>(
  ctx: RouteContext,
  request: RouteRequest,
  extra: readonly unknown[],
  operation: (db: Db) => T | Promise<T>,
  options?: TransactOptions<T>,
): Promise<T> {
  let delivery: { publicId: string; events: ProgressionEvent[] } | undefined
  let warmed = false
  const prepared = async (db: Db): Promise<T> => {
    delivery = undefined
    const session = request.requireSession(db, { renew: false })
    const missing = sessionCityIds(session, extra).filter(id => cachedCityContent(id) === null)
    if (missing.length && !warmed) throw new CityPreparationNeeded(missing)
    requireSessionCities(session, extra)
    bindSessionOrigin(session, requestOrigin(request, session))
    const before = new Map(Object.values(session.cities).flatMap(entry => entry ? [[entry, entry.progression?.sequence ?? 0] as const] : []))
    try {
      const result = await operation(db)
      const events = Object.values(session.cities).flatMap(entry => entry?.progression?.events.filter(event => event.sequence > (before.get(entry) ?? 0)) ?? [])
      delivery = { publicId: session.publicId, events }
      return result
    } finally { bindSessionOrigin(session, 'system') }
  }
  const durable: NonNullable<TransactOptions<T>>['durable'] = result => {
    const requested = typeof options?.durable === 'function' ? options.durable(result) : options?.durable !== false
    return Boolean(delivery?.events.length) || requested
  }
  const commit = async (): Promise<T> => {
    const result = await ctx.store.transact(prepared, { ...options, durable })
    if (delivery) publishProgression(ctx.telemetry, delivery.publicId, delivery.events)
    return result
  }
  try {
    return await commit()
  } catch (error) {
    if (!(error instanceof CityPreparationNeeded)) throw error
    await prepareStoredCityContent(ctx, undefined, error.cityIds)
    warmed = true
  }
  return commit()
}
