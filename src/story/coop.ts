import type { LifeContext, LifeState, SystemDefinition } from '../types/index.ts'
import type { StoryHelpKind } from '../types/story.ts'
import { arriveInCity } from '../game/api.ts'
import { isOpenCityId } from '../game/cities/registry.ts'
import { venueFor } from '../game/cities/runtime.ts'
import { missionCatalogues } from '../game/systems/missions.ts'
import { fail, ok } from '../game/util.ts'
import { chapterOf } from './ladder.ts'

export const STORY_HELP_MS = 30 * 60_000
const reference = (value: unknown): value is string => typeof value === 'string' && /^[a-zA-Z0-9][a-zA-Z0-9_.:+-]{0,159}$/.test(value)
const helpKind = (value: unknown): value is StoryHelpKind => value === 'second-answer' || value === 'two-seat' || value === 'errand'
const timestamp = (value: unknown, now: number): value is number => typeof value === 'number' && Number.isSafeInteger(value) && value > 0 && value <= now

export function leaveStoryHelp(state: LifeState, ctx: LifeContext): void {
  const helper = state.story.helper
  if (!helper) return
  if (state.activeAction) {
    helper.until = Math.min(helper.until, ctx.now)
    return
  }
  const from = helper.from
  if (!venueFor(from.city, from.venue)) throw new TypeError('The help session return venue must be loaded before settlement.')
  arriveInCity(state, { id: from.city }, ctx, { venue: from.venue, ...(from.spot === null ? {} : { spot: from.spot }) })
  if (from.spot === null) state.spot = null
  delete state.story.helper
  state.message = 'You returned from helping your friend. Your own story progress is unchanged.'
}

export function advanceStoryHelp(state: LifeState, ctx: LifeContext): void {
  if (state.story.helper && (ctx.now >= state.story.helper.until || ctx.storyMode !== true)) leaveStoryHelp(state, ctx)
}

export const storyHelpActions = {
  'story.help.enter': {
    serverOnly: true,
    run(state, payload, ctx) {
      if (ctx.storyMode !== true) return fail(state, 'story_help_unavailable', 'Story help is not available right now.')
      if (!reference(payload.session) || !reference(payload.host) || !helpKind(payload.kind) || !isOpenCityId(payload.city) || typeof payload.venue !== 'string') return fail(state, 'invalid_help_session', 'Choose a current help invitation.')
      if (typeof payload.until !== 'number' || !Number.isSafeInteger(payload.until) || payload.until <= ctx.now || payload.until > ctx.now + STORY_HELP_MS) return fail(state, 'help_session_expired', 'That help invitation has expired.')
      if (state.story.helper) return state.story.helper.session === payload.session
        ? ok(state, 'help_entered') : fail(state, 'story_help_unavailable', 'Leave the current help session first.')
      if (state.activeAction) return fail(state, 'busy', 'Finish what you are doing before helping your friend.')
      if (state.onboarding.required && !state.onboarding.done) return fail(state, 'story_help_unavailable', 'Choose your look and tap Play first.')
      const venue = venueFor(payload.city, payload.venue)
      if (!venue || payload.venue === 'home' || venue.cities) return fail(state, 'invalid_place', 'Your friend needs to be at a public venue.')
      if (!venueFor(state.estate.city, state.location)) return fail(state, 'invalid_place', 'Return to a venue before taking the help pass.')
      state.story.helper = { session: payload.session, host: payload.host, kind: payload.kind, city: payload.city, venue: payload.venue, until: payload.until,
        from: { city: state.estate.city, venue: state.location, spot: state.spot } }
      arriveInCity(state, { id: payload.city }, ctx, payload.venue)
      state.message = 'You joined your friend on a help pass. This visit does not unlock your own story.'
      return ok(state, 'help_entered')
    },
  },
  'story.help.leave': {
    serverOnly: true,
    run(state, payload, ctx) {
      if (!state.story.helper) return ok(state, 'help_inactive')
      if (payload.session !== state.story.helper.session) return fail(state, 'invalid_help_session', 'That is not your current help session.')
      leaveStoryHelp(state, ctx)
      return ok(state, 'help_left')
    },
  },
  'story.roots.reward': {
    serverOnly: true,
    run(state, payload, ctx) {
      if (!reference(payload.id) || !helpKind(payload.kind) || !isOpenCityId(payload.city) || !timestamp(payload.completedAt, ctx.now)) return fail(state, 'invalid_help_receipt', 'That help receipt is not valid.')
      if (state.story.helper || state.estate.city !== payload.city || chapterOf(state, payload.city) < 3) return fail(state, 'help_session_required', 'Finish the Roots challenge in its city first.')
      const row = state.story.cities[payload.city] ??= { missions: [], venues: [] }
      if (row.roots) return ok(state, 'already_recorded')
      const suppliedReward = typeof payload.missionRewardId === 'string' ? payload.missionRewardId : undefined
      const match = payload.kind === 'errand' && suppliedReward
        ? /^mission:v1:([^:]+):(daily|weekly):(\d+):(.+)$/.exec(suppliedReward) : null
      const missionRewardId = match && match[1] === payload.city && missionCatalogues.authoredIds.has(match[4]!)
        && missionCatalogues.byId.get(match[4]!)?.cityId === payload.city ? suppliedReward : undefined
      if (payload.kind === 'errand' && !missionRewardId) return fail(state, 'invalid_help_receipt', 'The errand needs an authored local mission receipt.')
      row.roots = { id: payload.id, kind: payload.kind, completedAt: payload.completedAt, ...(missionRewardId ? { missionRewardId } : {}) }
      if (missionRewardId && !row.missions.includes(missionRewardId)) row.missions = [...row.missions, missionRewardId].slice(-8)
      return ok(state, 'roots_recorded')
    },
  },
  'story.help.reward': {
    serverOnly: true,
    run(state, payload, ctx) {
      if (!reference(payload.id) || !isOpenCityId(payload.city) || !timestamp(payload.completedAt, ctx.now)) return fail(state, 'invalid_help_receipt', 'That help receipt is not valid.')
      if (!state.story.helper || state.story.helper.session !== payload.id || state.story.helper.city !== payload.city) return fail(state, 'help_session_required', 'Join the help session before receiving its keepsake.')
      if (state.story.helped.some(receipt => receipt.id === payload.id)) return ok(state, 'already_rewarded')
      state.story.helped = [...state.story.helped, { id: payload.id, city: payload.city, completedAt: payload.completedAt }].slice(-8)
      return ok(state, 'help_rewarded')
    },
  },
} satisfies Pick<NonNullable<SystemDefinition<'story'>['actions']>, 'story.help.enter' | 'story.help.leave' | 'story.roots.reward' | 'story.help.reward'>
