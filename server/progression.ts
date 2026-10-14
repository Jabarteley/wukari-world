import { lagosTime } from '../src/game/clock.ts'
import { canonicalJson, hash53 } from './protocol.ts'
import type { LifeContext, LifeState } from '../src/types/life.ts'
import type { CharacterProgression, ExecutionOrigin, ProgressionEvent, ProgressionEventName } from '../src/types/progression.ts'
import type { CityLifeRecord, ContextTelemetry, SessionRecord } from './types.ts'
import { advanceRhythm } from '../src/game/cadence.ts'
import { noteSeasonDay } from '../src/game/season.ts'
import type { RetentionPolicy } from './retention-policy.ts'

const EVENT_LIMIT = 128
const PROGRESSION_EVENTS: Readonly<Record<string, ProgressionEventName>> = {
  'episode.completed': 'episode_completed_v1',
  'episode.memento.granted': 'episode_memento_granted_v1',
  'achievement.earned': 'achievement_earned_v1',
  'mission.completed': 'mission_completed_v2',
  'mission.reward.earned': 'mission_reward_earned_v2',
  'mission.reward.granted': 'mission_reward_granted_v2',
  'mission.set.completed': 'mission_set_completed_v2',
  'mission.set.reward.granted': 'mission_set_reward_granted_v2',
}
const MEANINGFUL_EVENTS = new Set(['episode.chapter.completed', 'job.applied', 'life.started', 'house.styled', 'house.upgrade-started', 'item.bought',
  'friend.made', 'table.played', 'business.opened', 'vote.cast', 'roadside.resolved'])
const token = (value: unknown): value is string => typeof value === 'string' && /^[a-zA-Z0-9][a-zA-Z0-9_.:+-]{0,159}$/.test(value)
const integer = (value: unknown): value is number => typeof value === 'number' && Number.isSafeInteger(value) && value >= 0
const isOrigin = (value: unknown): value is ExecutionOrigin => value === 'human' || value === 'delegated-agent' || value === 'agent-character' || value === 'system' || value === 'unknown'

export function progressionOf(entry: CityLifeRecord, now: number, isNew = false): CharacterProgression {
  return entry.progression ??= { version: 1, startedAt: now, cohort: isNew ? 'new-character' : 'existing-character', sequence: 0, events: [], humanDays: [] }
}

/** Remaining time changes while polling; the activity identity and its options do not. */
export function activeFingerprint(state: Pick<LifeState, 'activeAction'>): string | null {
  if (!state.activeAction) return null
  const { remaining: ignored, ...identity } = state.activeAction
  if ('teaching' in identity) delete identity.teaching
  return hash53(canonicalJson(identity))
}

export function pendingOrigin(entry: CityLifeRecord): ExecutionOrigin {
  const fingerprint = activeFingerprint(entry.state)
  if (!fingerprint) return 'system'
  return entry.progression?.active?.fingerprint === fingerprint ? entry.progression.active.origin : 'unknown'
}

export function rememberActive(entry: CityLifeRecord, origin: ExecutionOrigin): void {
  const book = entry.progression
  if (!book) return
  const fingerprint = activeFingerprint(entry.state)
  if (!fingerprint) delete book.active
  else if (book.active?.fingerprint !== fingerprint) book.active = { fingerprint, origin }
}

function record(session: SessionRecord, book: CharacterProgression, origin: ExecutionOrigin,
  row: Omit<ProgressionEvent, 'id' | 'sequence' | 'origin' | 'ownership' | 'rankingFamily'>, key: string): void {
  const id = `p1-${hash53(`${session.publicId}|${row.name}|${key}`)}`
  if (book.events.some(event => event.id === id)) return
  const ownership = session.agent?.char ? (session.agent.unclaimed ? 'unclaimed-agent' : 'owned-agent') : session.account ? 'account' : 'guest'
  const rankingFamily = origin === 'delegated-agent' || origin === 'agent-character' || session.agent?.char
    || session.agent?.week === lagosTime(row.occurredAt).week ? 'agents' : 'people'
  book.events.push({ ...row, id, sequence: ++book.sequence, origin, ownership, rankingFamily })
  if (book.events.length > EVENT_LIMIT) book.events.splice(0, book.events.length - EVENT_LIMIT)
}

/** Observations stay inside the same transaction as the outcome. The host publishes after commit. */
export function observeProgression(session: SessionRecord, entry: CityLifeRecord, origin: ExecutionOrigin): {
  observe: NonNullable<LifeContext['observe']>; meaningful: () => boolean
} {
  let meaningful = false
  return {
    meaningful: () => meaningful,
    observe(event, data, ctx) {
      if (MEANINGFUL_EVENTS.has(event)) meaningful = true
      const name = PROGRESSION_EVENTS[event]
      if (!name || !token(data.rewardId)) return
      const at = data.grantedAt ?? data.completedAt ?? data.earnedAt ?? ctx.now
      if (!integer(at)) return
      const book = progressionOf(entry, ctx.now)
      const row: Omit<ProgressionEvent, 'id' | 'sequence' | 'origin' | 'ownership' | 'rankingFamily'> = {
        name, occurredAt: at, cityId: token(data.cityId) ? data.cityId : ctx.cityId, rewardId: data.rewardId,
        ...(isOrigin(data.earnedOrigin) ? { earnedOrigin: data.earnedOrigin } : {}),
        ...(token(data.id) ? event === 'achievement.earned' ? { achievementId: data.id } : event.startsWith('episode.') ? { episodeId: token(data.episodeId) ? data.episodeId : data.id } : { missionId: data.id } : {}),
        ...(data.scope === 'daily' || data.scope === 'weekly' ? { scope: data.scope } : {}),
        ...(integer(data.period) ? { period: data.period } : {}),
        ...(integer(data.cash) ? { cash: data.cash } : {}),
        ...(integer(data.stars) ? { stars: data.stars } : {}),
      }
      // A grant is an action by the collector; completion retains the original action's origin.
      record(session, book, origin, row, data.rewardId)
    },
  }
}

/** One validated human engagement per Lagos day; automatic completion alone cannot mark a return. */
export function recordHumanDay(session: SessionRecord, entry: CityLifeRecord, origin: ExecutionOrigin, now: number, cityId: string, policy?: RetentionPolicy): void {
  if (origin !== 'human' || session.agent?.char) return
  const book = progressionOf(entry, now), day = lagosTime(now).day
  noteSeasonDay(book.season, policy?.seasonStartDay ?? null, now)
  // A fresh meaningful action after enrolling can count today even if measurement recorded
  // an earlier action. The rhythm transition owns its own durable day deduplication.
  if (policy?.rhythm && book.rhythm?.optedIn) {
    const advance = advanceRhythm(book.rhythm, day, policy)
    if (advance.counted) {
      book.rhythm = advance.state
      record(session, book, origin, { name: 'rhythm_day_v1', occurredAt: now, cityId, day, rhythmDays: advance.state.current, restUsed: advance.restUsed }, String(day))
      for (const receipt of advance.newlyRecognized) record(session, book, origin, {
        name: 'rhythm_recognition_v1', occurredAt: now, cityId, day, rewardId: receipt.id, rhythmDays: receipt.activeDays,
      }, receipt.id)
    }
  }
  if (book.humanDays.includes(day)) return
  book.humanDays = [...book.humanDays.filter(value => value > day - 31), day].sort((a, b) => a - b).slice(-31)
  book.firstHumanDay ??= day
  record(session, book, origin, { name: 'human_meaningful_day_v1', occurredAt: now, cityId, cohort: book.cohort, day, firstDay: book.firstHumanDay }, String(day))
}

export function publishProgression(telemetry: ContextTelemetry, publicId: string, events: readonly ProgressionEvent[]): void {
  for (const event of events) {
    // Hash the reward token to fit the existing privacy scrubber's 64-character token limit.
    const props = { event_version: event.name.endsWith('_v2') ? 2 : 1, origin: event.origin, ownership: event.ownership,
      ranking_family: event.rankingFamily, occurred_at: event.occurredAt, event_id: event.id,
      ...(event.earnedOrigin ? { earned_origin: event.earnedOrigin } : {}),
      ...(event.rewardId ? { reward_id: `r1-${hash53(event.rewardId)}` } : {}),
      ...(event.missionId ? { mission: event.missionId } : {}), ...(event.scope ? { scope: event.scope } : {}),
      ...(event.episodeId ? { episode: event.episodeId } : {}),
      ...(event.achievementId ? { achievement: event.achievementId } : {}),
      ...(event.period !== undefined ? { period: event.period } : {}), ...(event.cash !== undefined ? { cash: event.cash } : {}),
      ...(event.stars !== undefined ? { stars: event.stars } : {}), ...(event.cohort ? { cohort: event.cohort } : {}),
      ...(event.day !== undefined ? { day: event.day, first_day: event.firstDay } : {}) }
    if (event.rhythmDays !== undefined) Object.assign(props, { rhythm_days: event.rhythmDays, rest_used: event.restUsed === true })
    try { telemetry.track?.(publicId, event.name, props, event.cityId, { at: event.occurredAt, id: event.id }) } catch { /* analytics cannot undo a committed reward */ }
  }
}
