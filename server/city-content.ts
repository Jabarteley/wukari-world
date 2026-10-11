import { lifeCities } from '../src/game/cities/lifeCities.ts'
import { cachedCityContent, isCityId, loadCityContent, loadCityLinks } from '../src/game/cities/registry.ts'
import type { SessionRecord } from './types.ts'

/** Include archived lives before character normalization can choose or restore one. */
export function sessionCityIds(session: SessionRecord | undefined, extra: readonly unknown[] = []): string[] {
  const found = new Set<string>()
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

/** A state change during preparation must fail before settlement mutates the saved life. */
export function requireSessionCities(session: SessionRecord, extra: readonly unknown[] = []): void {
  if (sessionCityIds(session, extra).some(id => cachedCityContent(id) === null)) {
    throw Object.assign(new Error('city_content_unavailable'), {
      status: 503,
      code: 'city_content_unavailable',
      reason: 'City content is not ready. Please retry.',
      retryable: true,
    })
  }
}
