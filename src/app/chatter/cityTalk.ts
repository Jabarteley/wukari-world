import type { Chosen } from '../../game/chatter/types.ts'
import type { StoryTalkRegular } from '../../types/story-talk.ts'

export interface CityTalkContext {
  identity: string | null
  bornAt: number
  city: string
  venue: string
  enabled: boolean
  connected: boolean
}

export interface CityTalkDependencies {
  fetchView(): Promise<unknown>
  now(): number
  ttlMs?: number
}

type Rows = ReadonlyMap<StoryTalkRegular['id'], readonly string[]>
const record = (value: unknown): value is Record<string, unknown> => value !== null && typeof value === 'object' && !Array.isArray(value)
const active = (context: CityTalkContext): boolean => context.enabled && context.connected && Boolean(context.identity)
  && Number.isFinite(context.bornAt) && Boolean(context.city) && Boolean(context.venue)

export function cityTalkContextKey(context: CityTalkContext): string {
  return JSON.stringify([context.identity, context.bornAt, context.city, context.venue, context.enabled, context.connected])
}

function rowsOf(value: unknown, context: CityTalkContext): Rows | null {
  if (!record(value) || value.ok !== true || value.enabled !== true || value.available !== true
    || !record(value.city) || value.city.id !== context.city || !record(value.venue) || value.venue.id !== context.venue
    || !Array.isArray(value.regulars)) return null
  const rows = new Map<string, readonly string[]>()
  for (const regular of value.regulars) {
    if (!record(regular) || typeof regular.id !== 'string' || !regular.id.trim() || rows.has(regular.id) || regular.ai !== true
      || !Array.isArray(regular.ambient) || regular.ambient.length === 0 || regular.ambient.length > 8) return null
    const lines: string[] = []
    for (const line of regular.ambient) {
      if (typeof line !== 'string' || !line.trim() || line.length > 140 || /[\p{Cc}\p{Cf}\u2028\u2029]/u.test(line)) return null
      lines.push(line)
    }
    rows.set(regular.id, lines)
  }
  return rows
}

function lineOf(lines: readonly string[], slot: number, regular: string): string | undefined {
  let seed = 2166136261
  for (const char of JSON.stringify([slot, regular])) seed = Math.imul(seed ^ char.charCodeAt(0), 16777619)
  return lines[(seed >>> 0) % lines.length]
}

/** One current-context bank cache. The caller rechecks the captured generation and live context before playback. */
export function createCityTalk(dependencies: CityTalkDependencies) {
  const requestedTtl = dependencies.ttlMs ?? 15_000
  const ttl = Number.isFinite(requestedTtl) ? Math.max(1, Math.min(30_000, requestedTtl)) : 15_000
  let key: string | null = null, generation = 0
  let cache: { promise: Promise<Rows | null>; expiresAt: number } | null = null
  const clear = (): void => { generation++; key = null; cache = null }
  const isCurrent = (context: CityTalkContext, token: number): boolean => active(context)
    && generation === token && key === cityTalkContextKey(context)

  function replace(context: CityTalkContext, chosen: Chosen): Chosen | Promise<Chosen> {
    const nextKey = cityTalkContextKey(context)
    if (key !== nextKey) { clear(); key = nextKey }
    if (!active(context)) return chosen
    const token = generation
    const snapshot = { ...context }
    if (!cache || dependencies.now() >= cache.expiresAt) {
      const entry = { promise: Promise.resolve<Rows | null>(null), expiresAt: Infinity }
      entry.promise = Promise.resolve().then(() => isCurrent(snapshot, token) ? dependencies.fetchView() : null)
        .then(value => {
          if (!isCurrent(snapshot, token)) return null
          const rows = rowsOf(value, snapshot)
          if (cache === entry) {
            if (rows) entry.expiresAt = dependencies.now() + ttl
            else cache = null
          }
          return rows
        }, () => { if (cache === entry) cache = null; return null })
      cache = entry
    }
    return cache.promise.then(rows => {
      if (!rows || !isCurrent(snapshot, token)) return chosen
      const first = rows.get(chosen.first.npcId), second = rows.get(chosen.second.npcId)
      if (!first || !second) return chosen
      const firstText = lineOf(first, chosen.slot, chosen.first.npcId), secondText = lineOf(second, chosen.slot, chosen.second.npcId)
      if (!firstText || !secondText) return chosen
      return { ...chosen, first: { ...chosen.first, text: firstText }, second: { ...chosen.second, text: secondText } }
    })
  }

  return { replace, clear, isCurrent, get generation(): number { return generation } }
}
