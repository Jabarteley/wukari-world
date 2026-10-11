import { cachedCityContent } from '../src/game/cities/registry.ts'
import type { CityId } from '../src/types/protocol.ts'
import { requireSessionCities, sessionCityIds } from './city-content.ts'
import { prepareStoredCityContent } from './request-city-content.ts'
import type { Db, RouteContext, RouteRequest, TransactOptions } from './types.ts'

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
  try {
    return await ctx.store.transact<T>(db => {
      const session = request.requireSession(db, { renew: false })
      const missing = sessionCityIds(session, extra).filter(id => cachedCityContent(id) === null)
      if (missing.length) throw new CityPreparationNeeded(missing)
      return operation(db)
    }, options)
  } catch (error) {
    if (!(error instanceof CityPreparationNeeded)) throw error
    await prepareStoredCityContent(ctx, undefined, error.cityIds)
  }
  return ctx.store.transact<T>(db => {
    requireSessionCities(request.requireSession(db, { renew: false }), extra)
    return operation(db)
  }, options)
}
