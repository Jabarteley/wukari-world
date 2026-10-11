import { lifeCities } from '../src/game/cities/lifeCities.ts'
import { cachedCityContent, isCityId, loadCityContent, loadCityLinks } from '../src/game/cities/registry.ts'
import type { CityId } from '../src/types/protocol.ts'
import type { SessionRecord } from './types.ts'

const missingCityContent = Symbol('missing-city-content')

interface MissingCityContentError extends Error {
  readonly [missingCityContent]: true
  readonly cityIds: readonly CityId[]
  readonly status: 503
  readonly code: 'city_content_unavailable'
  readonly reason: string
  readonly retryable: true
}

/** Include archived lives before character normalization can choose or restore one. */
export function sessionCityIds(session: SessionRecord | undefined, extra: readonly unknown[] = []): CityId[] {
  const found = new Set<CityId>()
  const add = (id: unknown): void => { if (isCityId(id)) found.add(id) }
  extra.forEach(add)
  if (!session) return [...found]
  add(session.character?.city)
  add(session.character?.from)
  for (const [id, entry] of Object.entries(session.cities ?? {})) {
    add(id)
    if (entry) lifeCities(entry.state, [id]).forEach(add)
  }
  for (const [key, entry] of Object.entries(session.legacyLives ?? {})) {
    const explicit = session.legacyLifeCities?.[key]
    const separator = key.indexOf(':')
    const original = explicit ?? (separator > 0 ? key.slice(0, separator) : key)
    lifeCities(entry.state, [original]).forEach(add)
  }
  return [...found]
}

/** Await before a transaction's synchronous settlement or receipt callback. */
export async function prepareSessionCities(session: SessionRecord | undefined, extra: readonly unknown[] = []): Promise<void> {
  await Promise.all([loadCityLinks(), ...sessionCityIds(session, extra).map(loadCityContent)])
}

/** Internal handoff from a synchronous transaction guard to an async host boundary. */
export function missingCityContentIds(error: unknown): readonly CityId[] | null {
  if (typeof error !== 'object' || error === null || Reflect.get(error, missingCityContent) !== true) return null
  const ids: unknown = Reflect.get(error, 'cityIds')
  if (!Array.isArray(ids) || !ids.every(isCityId)) return null
  return ids
}

/** A state change during preparation must fail before settlement mutates the saved life. */
export function requireSessionCities(session: SessionRecord, extra: readonly unknown[] = []): void {
  const cityIds = sessionCityIds(session, extra).filter(id => cachedCityContent(id) === null)
  if (cityIds.length) {
    throw Object.assign(new Error('city_content_unavailable'), {
      [missingCityContent]: true as const,
      cityIds,
      status: 503 as const,
      code: 'city_content_unavailable' as const,
      reason: 'City content is not ready. Please retry.',
      retryable: true as const,
    }) satisfies MissingCityContentError
  }
}
