import type { AchievementId, AchievementProgress, AchievementReceipt, AchievementState } from '../../types/achievements.ts'
import { ACHIEVEMENT_IDS } from '../../types/achievements.ts'
import type { ExecutionOrigin } from '../../types/progression.ts'
import type { LifeContext, LifeState, SystemDefinition } from '../../types/index.ts'
import { ACHIEVEMENTS } from '../content/achievements.ts'
import { LEFT_OUT, PLAYS } from '../profile.ts'
import { emit } from '../registry.ts'
import { fail, isRecord, ok } from '../util.ts'
import { isCityId } from '../cities/registry.ts'

const ORIGINS: readonly ExecutionOrigin[] = ['human', 'delegated-agent', 'agent-character', 'system', 'unknown']
const known = (id: unknown): id is AchievementId => typeof id === 'string' && ACHIEVEMENT_IDS.some(value => value === id)
const stamp = (value: unknown, now: number): value is number => typeof value === 'number' && Number.isSafeInteger(value) && value > 0 && value <= now
const originsOf = (value: unknown): ExecutionOrigin[] => Array.isArray(value) ? ORIGINS.filter(origin => value.includes(origin)) : []
const originOf = (ctx: LifeContext): ExecutionOrigin => ctx.executionOrigin ?? 'unknown'

/** Each definition has a finite target and one permanent completion receipt. */
function progress(state: LifeState, id: AchievementId, ctx: LifeContext, mark?: string, level?: number): void {
  const book = state.achievements
  if (!book || book.earned[id]) return
  const def = ACHIEVEMENTS.find(row => row.id === id)!
  const row = book.progress[id] ??= { n: 0, marks: [], origins: [] }
  if (mark && row.marks.includes(mark)) return
  if (mark) row.marks.push(mark)
  row.n = Math.min(def.target, level === undefined ? row.n + 1 : Math.max(row.n, level))
  const origin = originOf(ctx)
  if (!row.origins.includes(origin)) row.origins.push(origin)
  if (row.n < def.target) return
  const receipt: AchievementReceipt = { id, version: 1, earnedAt: ctx.now, cityId: state.estate.city, origins: [...row.origins] }
  book.earned[id] = receipt
  emit(state, 'achievement.earned', { ...receipt, rewardId: `achievement:v1:${id}` }, ctx)
  emit(state, 'notice.posted', { kind: 'mission', text: `Achievement earned: ${def.title}. Pin it in My Life or display its plaque at home.` }, ctx)
}

const play = PLAYS ? {
  actions: {
    'achievements.pin'(state, payload) {
      const ids = payload.ids
      if (!Array.isArray(ids) || ids.length > 3 || !ids.every(known) || new Set(ids).size !== ids.length) return fail(state, 'invalid_selection', 'Choose up to three different earned badges.')
      if (ids.some(id => !state.achievements.earned[id])) return fail(state, 'not_earned', 'Earn that achievement before pinning it.')
      state.achievements.pinned = [...ids]
      return ok(state, 'pinned')
    },
    'achievements.display'(state, payload) {
      if (state.location !== 'home' || state.onboarding.stage === 'guest' && !state.onboarding.done) return fail(state, 'not_home', 'Go to your home to change the achievement plaque.')
      if (payload.id === null) { state.achievements.displayed = null; return ok(state, 'cleared') }
      if (!known(payload.id)) return fail(state, 'invalid_selection', 'Choose an earned achievement.')
      if (!state.achievements.earned[payload.id]) return fail(state, 'not_earned', 'Earn that achievement before displaying its plaque.')
      state.achievements.displayed = payload.id
      return ok(state, 'displayed')
    },
  },
  on: {
    'travel.arrived'(state, data, ctx) { if (data.venue !== 'home') progress(state, 'wayfinder', ctx, `${state.estate.city}:${data.venue}`) },
    'friend.made'(state, data, ctx) { progress(state, 'familiar-face', ctx, `${data.npc ? 'resident' : 'player'}:${data.id}`) },
    'shift.completed'(state, data, ctx) { if (data.pay > 0) progress(state, 'first-shift', ctx) },
    'campus.job.completed'(state, data, ctx) { if (data.pay > 0) progress(state, 'first-shift', ctx) },
    'item.bought'(state, data, ctx) { if (data.kind === 'furniture') progress(state, 'home-maker', ctx, data.id) },
    'table.played'(state, data, ctx) { progress(state, 'table-regular', ctx) },
    'skill.levelup'(state, data, ctx) { progress(state, 'curious-mind', ctx, undefined, data.level) },
  },
} satisfies Pick<SystemDefinition<'achievements'>, 'actions' | 'on'> : LEFT_OUT

export default {
  id: 'achievements', stateKeys: ['achievements'],
  sanitize(input, state, ctx) {
    const now = ctx.now || state.t
    const raw = isRecord(input.achievements) ? input.achievements : {}
    const book: AchievementState = { version: 1, trackingSince: stamp(raw.trackingSince, now) ? raw.trackingSince : now, progress: {}, earned: {}, pinned: [], displayed: null }
    for (const def of ACHIEVEMENTS) {
      const saved = isRecord(raw.progress) ? raw.progress[def.id] : undefined
      if (isRecord(saved)) {
        const marks = Array.isArray(saved.marks) ? [...new Set(saved.marks.filter((value): value is string => typeof value === 'string' && /^[a-zA-Z0-9_.:-]{1,120}$/.test(value)))].slice(0, def.target) : []
        const row: AchievementProgress = { n: typeof saved.n === 'number' && Number.isSafeInteger(saved.n) ? Math.min(def.target, Math.max(0, saved.n)) : 0, marks, origins: originsOf(saved.origins) }
        book.progress[def.id] = row
      }
      const earned = isRecord(raw.earned) ? raw.earned[def.id] : undefined
      if (isRecord(earned) && earned.id === def.id && earned.version === 1 && stamp(earned.earnedAt, now) && isCityId(earned.cityId)) {
        book.earned[def.id] = { id: def.id, version: 1, earnedAt: earned.earnedAt, cityId: earned.cityId, origins: originsOf(earned.origins) }
      }
    }
    if (Array.isArray(raw.pinned)) book.pinned = [...new Set(raw.pinned.filter(known))].filter(id => book.earned[id]).slice(0, 3)
    if (known(raw.displayed) && book.earned[raw.displayed]) book.displayed = raw.displayed
    state.achievements = book
  },
  ...play,
  view(state) {
    const book = state.achievements
    return { trackingSince: book.trackingSince, earnedCount: Object.keys(book.earned).length, pinned: [...book.pinned], displayed: book.displayed,
      rows: ACHIEVEMENTS.map(def => {
        const earned = book.earned[def.id]
        return { ...def, progress: earned ? def.target : book.progress[def.id]?.n ?? 0, earnedAt: earned?.earnedAt ?? null, earnedCity: earned?.cityId ?? null, origins: earned?.origins ?? book.progress[def.id]?.origins ?? [], pinned: book.pinned.includes(def.id), displayed: book.displayed === def.id }
      }) }
  },
} satisfies SystemDefinition<'achievements'>
