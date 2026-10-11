import { isCityId } from '../src/game/cities/registry.ts'
import { prepareSessionCities, requireSessionCities } from './city-content.ts'
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

async function sessionForRequest(ctx: RouteContext, request: RouteRequest): Promise<SessionRecord | undefined> {
  return ctx.store.read((db) => request.session(db))
}

/**
 * Prepare stored lives and a query city now, then prepare parsed JSON fields at the parser boundary.
 * This deliberately leaves rawBody and routes which never parse JSON alone.
 */
export async function prepareRouteCityContent(ctx: RouteContext, request: RouteRequest): Promise<void> {
  const session = await sessionForRequest(ctx, request)
  const queryCity = request.query.get('city')
  const initial = [queryCity, ...Object.values(request.params)].filter(isCityId)
  if (session || initial.length) await prepareStoredCityContent(ctx, session, initial)

  const parse = request.json.bind(request)
  request.json = async (limit?: number) => {
    const body = await parse(limit)
    const extra = requestedCityIds(body)
    if (session || extra.length) await prepareStoredCityContent(ctx, session, extra)
    return body
  }
}

/** Prepare a socket sender's stored lives and explicit city fields before its registered handler. */
export async function prepareSocketCityContent(ctx: RouteContext, ws: WsConnection, message: unknown): Promise<void> {
  const session = await ctx.store.read((db) => ctx.core.sessionOf(ws, db))
  const extra = requestedCityIds(message)
  if (session || extra.length) await prepareStoredCityContent(ctx, session, extra)
}
