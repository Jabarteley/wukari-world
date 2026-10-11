import { isCityId, loadCityContent, loadCityLinks } from '../src/game/cities/registry.ts'
import { missingCityContentIds, prepareSessionCities, requireSessionCities } from './city-content.ts'
import type { RouteContext, RouteRequest, SessionRecord, WsConnection } from './types.ts'

const record = (value: unknown): Record<string, unknown> | null =>
  value !== null && typeof value === 'object' && !Array.isArray(value) ? value as Record<string, unknown> : null

/** Only explicit, catalogue-valid request fields may cause an asset load. */
export function requestedCityIds(value: unknown): string[] {
  const body = record(value)
  if (!body) return []
  const found = new Set<string>()
  const add = (candidate: unknown): void => { if (isCityId(candidate)) found.add(candidate) }
  add(body.cityId)
  add(body.city)
  add(body.to)
  add(body.id)
  const payload = record(body.payload)
  if (payload) {
    add(payload.cityId)
    add(payload.city)
    add(payload.to)
    add(payload.id)
  }
  return [...found]
}

function unavailable(ctx: RouteContext): Error {
  return Object.assign(ctx.fail(503, 'city_content_unavailable'), {
    reason: 'City content is not ready. Please retry.',
    retryable: true,
  })
}

/** Prepare before entering synchronous settlement, action or receipt callbacks. */
export async function prepareStoredCityContent(
  ctx: RouteContext,
  session: SessionRecord | undefined,
  extra: readonly unknown[] = [],
): Promise<void> {
  try {
    await prepareSessionCities(session, extra)
    if (session) requireSessionCities(session, extra)
  } catch {
    throw unavailable(ctx)
  }
}

/**
 * Prepare explicit path and query cities now, then parsed JSON fields at the parser boundary.
 * This deliberately leaves rawBody and routes which never parse JSON alone.
 */
export async function prepareRouteCityContent(ctx: RouteContext, request: RouteRequest): Promise<void> {
  const queryCity = request.query.get('city')
  const initial = [queryCity, ...Object.values(request.params)].filter(isCityId)
  if (initial.length) await prepareStoredCityContent(ctx, undefined, initial)

  const parse = request.json.bind(request)
  request.json = async (limit?: number) => {
    const body = await parse(limit)
    const extra = requestedCityIds(body)
    if (extra.length) await prepareStoredCityContent(ctx, undefined, extra)
    return body
  }
}

/** Prepare only explicit city fields before the registered socket handler. */
export async function prepareSocketCityContent(ctx: RouteContext, _ws: WsConnection, message: unknown): Promise<void> {
  const extra = requestedCityIds(message)
  if (extra.length) await prepareStoredCityContent(ctx, undefined, extra)
}

/** Warm the exact cold cities named by a transaction guard, then preserve its original refusal. */
export async function warmCityContentFailure(error: unknown): Promise<unknown> {
  const cityIds = missingCityContentIds(error)
  if (!cityIds) return error
  try {
    await Promise.all([loadCityLinks(), ...cityIds.map(loadCityContent)])
  } catch {
    // The stable retryable refusal must not expose asset paths or transport failures.
  }
  return error
}
