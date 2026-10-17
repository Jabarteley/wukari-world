import type { Block } from '../../types/content.ts'
import type { ActionType, ActionVetoCode } from '../../types/actions.ts'
import type { TravelView } from '../../types/view.ts'
import type { LifeContext, LifeState, SystemDefinition, WorldCityId } from '../../types/index.ts'
import type { StoryCityReceipts, StoryHelpKind, StoryHelpedReceipt, StoryHelperSession, StoryMode, StoryRootsReceipt, StoryState, StoryView } from '../../types/story.ts'
import { cityName, isOpenCityId, playableCityIdsSoFar } from '../cities/registry.ts'
import { readCityReference } from '../cities/references.ts'
import { cachedCityContent } from '../cities/registry.ts'
import { venueFor } from '../cities/runtime.ts'
import { dealMissions, missionCatalogues } from './missions.ts'
import { LEFT_OUT, PLAYS } from '../profile.ts'
import { isRecord, fail, ok } from '../util.ts'
import { STORY_HELP_MS, advanceStoryHelp, leaveStoryHelp, storyHelpActions } from '../../story/coop.ts'
import {
  STORY_CHAPTERS, chapterOf, cityUnlocked, nextStep, storyBlock, storyBlockReason, storySignature,
  venueBlockReason, venueOpen,
} from '../../story/ladder.ts'
import { venueChapter } from '../../story/slots.ts'

const MAX_MISSIONS = 8
const MAX_VENUES = 6
const MAX_HELPED = 8
const REF = /^[a-zA-Z0-9][a-zA-Z0-9_.:+-]{0,159}$/

const stamp = (value: unknown, now: number): value is number => typeof value === 'number' && Number.isSafeInteger(value) && value >= 0 && value <= now
const ref = (value: unknown): value is string => typeof value === 'string' && REF.test(value)
const storyMode = (value: unknown): value is StoryMode => value === 'free' || value === 'story'
const helpKind = (value: unknown): value is StoryHelpKind => value === 'second-answer' || value === 'two-seat' || value === 'errand'
const cityId = (value: unknown): value is WorldCityId => typeof value === 'string' && isOpenCityId(value)

function validMissionReward(value: unknown, city: string): value is string {
  if (typeof value !== 'string') return false
  const match = /^mission:v1:([^:]+):(daily|weekly):(\d+):(.+)$/.exec(value)
  if (!match || match[1] !== city) return false
  const id = match[4]!, definition = missionCatalogues.byId.get(id)
  return missionCatalogues.authoredIds.has(id) && definition?.cityId === city
}

function cleanRoots(value: unknown, now: number, city: string): StoryRootsReceipt | undefined {
  if (!isRecord(value) || !ref(value.id) || !['second-answer', 'two-seat', 'errand'].includes(String(value.kind)) || !stamp(value.completedAt, now) || value.completedAt === 0) return undefined
  const missionRewardId = value.kind === 'errand' && validMissionReward(value.missionRewardId, city) ? value.missionRewardId : undefined
  return { id: value.id, kind: value.kind as StoryRootsReceipt['kind'], completedAt: value.completedAt, ...(missionRewardId ? { missionRewardId } : {}) }
}

function cleanCity(value: unknown, city: string, now: number): StoryCityReceipts | null {
  if (!isRecord(value)) return null
  const missions = [...new Set((Array.isArray(value.missions) ? value.missions : []).filter(row => validMissionReward(row, city)))].slice(-MAX_MISSIONS)
  const venues = [...new Set((Array.isArray(value.venues) ? value.venues : []).filter(ref))].slice(-MAX_VENUES)
  const roots = cleanRoots(value.roots, now, city)
  return { missions, venues, ...(roots ? { roots } : {}) }
}

function cleanHelper(value: unknown, now: number): StoryHelperSession | undefined {
  if (!isRecord(value) || !ref(value.session) || !ref(value.host) || !helpKind(value.kind) || !cityId(value.city) || !ref(value.venue)
    || typeof value.until !== 'number' || !Number.isSafeInteger(value.until) || value.until <= 0 || value.until > now + STORY_HELP_MS
    || !venueFor(value.city, value.venue) || !isRecord(value.from) || !cityId(value.from.city) || !ref(value.from.venue)
    || !venueFor(value.from.city, value.from.venue) || !(value.from.spot === null || ref(value.from.spot))) return undefined
  return { session: value.session, host: value.host, kind: value.kind, city: value.city, venue: value.venue, from: { city: value.from.city, venue: value.from.venue, spot: value.from.spot }, until: value.until }
}

function cleanHelped(value: unknown, now: number): StoryHelpedReceipt | null {
  if (!isRecord(value) || !ref(value.id) || !cityId(value.city) || !stamp(value.completedAt, now) || value.completedAt === 0) return null
  return { id: value.id, city: value.city, completedAt: value.completedAt }
}

function legacyMissionReceipts(state: LifeState): Partial<Record<WorldCityId, StoryCityReceipts>> {
  const cities: Partial<Record<WorldCityId, StoryCityReceipts>> = {}
  for (const reward of [...state.missions.grants, ...state.missions.pending]) {
    if (!cityId(reward.cityId) || !validMissionReward(reward.rewardId, reward.cityId)) continue
    const row = cities[reward.cityId] ??= { missions: [], venues: [] }
    if (!row.missions.includes(reward.rewardId) && row.missions.length < MAX_MISSIONS) row.missions.push(reward.rewardId)
  }
  for (const key of state.travel.visited) {
    const found = readCityReference(key, state.estate.city, (city, id) => Boolean(venueFor(city, id)))
    if (!found || found.id === 'home' || !cityId(found.cityId)) continue
    const row = cities[found.cityId] ??= { missions: [], venues: [] }
    if (!row.venues.includes(found.id) && row.venues.length < MAX_VENUES) row.venues.push(found.id)
  }
  return cities
}

function modeAction(state: LifeState, payload: Record<string, unknown>, ctx: LifeContext) {
  if (ctx.storyMode !== true) return fail(state, 'story_disabled', 'Story mode is not available right now.')
  if (!storyMode(payload.mode)) return fail(state, 'invalid_story_mode', 'Choose Free roam or Story mode.')
  if (state.story.helper) leaveStoryHelp(state, ctx)
  state.story.mode = payload.mode
  if (payload.mode === 'story' && state.story.start === null) state.story.start = state.estate.city
  ensureStoryMissions(state, ctx)
  state.message = payload.mode === 'story' ? 'Story mode is on. Your chapter locks are active.' : 'Free roam is on. Every open place is available.'
  return ok(state, 'mode_set')
}

function ensureStoryMissions(state: LifeState, ctx: LifeContext): void {
  if (ctx.storyMode !== true || state.story.mode !== 'story' || state.story.helper) return
  for (const scope of ['daily', 'weekly'] as const) {
    const rows = state.missions[scope]
    if (!rows.some(row => row.n === 0 && !row.claimed && !missionCatalogues.authoredIds.has(row.id))) continue
    const kept = rows.filter(row => row.n > 0 || row.claimed).map(row => row.id)
    const offered = dealMissions(state, scope, scope === 'daily' ? state.missions.day : state.missions.week, ctx, kept)
    state.missions[scope] = rows.map(row => {
      if (row.n > 0 || row.claimed || missionCatalogues.authoredIds.has(row.id)) return row
      return offered.find(next => missionCatalogues.byId.get(next.id)?.kind === missionCatalogues.byId.get(row.id)?.kind) ?? row
    })
  }
}

const block = (code: 'story_locked' | 'story_helper_active', reason: string): Block<'story_locked' | 'story_helper_active'> => ({ code, reason })

function helperVenueAllowed(helper: StoryHelperSession, city: unknown, venue: unknown): boolean {
  if (city !== helper.city || typeof venue !== 'string') return false
  if (venue === helper.venue) return true
  const found = helper.kind === 'errand' ? venueFor(helper.city, venue) : null
  return Boolean(found && venue !== 'home' && !found.cities)
}

function actionBlock(value: Block<ActionVetoCode> | null, state: LifeState, data: { type: ActionType; payload: Record<string, unknown> }, ctx: LifeContext) {
  if (value) return value
  const helper = state.story.helper
  if (helper) {
    if (data.type.startsWith('episodes.')) return block('story_helper_active', 'Finish or leave the help session before continuing your own tale.')
    if (data.type === 'estate.relocate' && data.payload.to !== helper.city) return block('story_helper_active', 'Leave the help session before travelling to another city.')
    if (data.type === 'homeward.accept') return block('story_helper_active', 'Leave the help session before booking a ride home.')
    if (data.type === 'travel' && !helperVenueAllowed(helper, state.estate.city, data.payload.id)) return block('story_helper_active', 'This help pass is limited to its challenge places.')
    if (data.type === 'street.place' && !helperVenueAllowed(helper, state.estate.city, data.payload.to)) return block('story_helper_active', 'This help pass is limited to its challenge places.')
    if (data.type === 'social.server' && data.payload.op === 'join' && !helperVenueAllowed(helper, data.payload.city, data.payload.venue)) {
      return block('story_helper_active', 'This help pass is limited to your friend’s city and venue.')
    }
  }
  if (ctx.storyMode !== true) return null
  if (data.type === 'estate.relocate' && typeof data.payload.to === 'string' && storyBlock(state, data.payload.to)) return block('story_locked', storyBlockReason(data.payload.to))
  if (data.type === 'homeward.accept' && state.estate.home && storyBlock(state, state.estate.home)) return block('story_locked', storyBlockReason(state.estate.home))
  if (data.type === 'travel' && typeof data.payload.id === 'string' && venueOpen(state, state.estate.city, data.payload.id)) return block('story_locked', venueBlockReason(state, state.estate.city, data.payload.id))
  if (data.type === 'street.place' && typeof data.payload.to === 'string' && venueOpen(state, state.estate.city, data.payload.to)) return block('story_locked', venueBlockReason(state, state.estate.city, data.payload.to))
  if (data.type === 'social.server' && data.payload.op === 'join' && typeof data.payload.city === 'string') {
    if (storyBlock(state, data.payload.city)) return block('story_locked', storyBlockReason(data.payload.city))
    if (typeof data.payload.venue === 'string' && venueOpen(state, data.payload.city, data.payload.venue)) return block('story_locked', venueBlockReason(state, data.payload.city, data.payload.venue))
  }
  return null
}

const play = PLAYS ? {
  actions: { 'story.mode': modeAction, ...storyHelpActions },
  advance(state: LifeState, _dt: number, ctx: LifeContext) { advanceStoryHelp(state, ctx); ensureStoryMissions(state, ctx) },
  on: {
    'mission.reward.granted'(state: LifeState, _data, ctx) { ensureStoryMissions(state, ctx) },
    'mission.completed'(state: LifeState, data: { rewardId: string; cityId: WorldCityId }) {
      if (state.story.helper || !validMissionReward(data.rewardId, data.cityId)) return
      const row = state.story.cities[data.cityId] ??= { missions: [], venues: [] }
      if (!row.missions.includes(data.rewardId)) row.missions = [...row.missions, data.rewardId].slice(-MAX_MISSIONS)
    },
    'travel.arrived'(state: LifeState, data: { venue: string }, ctx: LifeContext) {
      if (state.story.helper || typeof data.venue !== 'string' || data.venue === 'home' || !venueFor(ctx.cityId, data.venue)) return
      const id = ctx.cityId as WorldCityId, row = state.story.cities[id] ??= { missions: [], venues: [] }
      if (!row.venues.includes(data.venue)) row.venues = [...row.venues, data.venue].slice(-MAX_VENUES)
    },
  },
} satisfies Pick<SystemDefinition<'story'>, 'actions' | 'advance' | 'on'> : LEFT_OUT

function travelView(view: TravelView, state: LifeState, _data: Record<string, never>, ctx: LifeContext): TravelView {
  if (ctx.storyMode !== true || (state.story.mode !== 'story' && !state.story.helper)) return view
  return { ...view, destinations: view.destinations.map(destination => {
    if (destination.kind === 'soon' || destination.here) return destination
    const helper = state.story.helper
    const outsidePass = helper && (helper.city !== state.estate.city || (helper.kind !== 'errand' && helper.venue !== destination.id) || destination.id === 'home')
    const locked = outsidePass ? block('story_helper_active', 'Leave the help session before exploring your own places.')
      : venueOpen(state, state.estate.city, destination.id) ? block('story_locked', venueBlockReason(state, state.estate.city, destination.id)) : null
    return locked ? { ...destination, open: false, status: 'Locked', blocked: locked,
      modes: destination.modes.map(mode => ({ ...mode, blocked: locked })) } : destination
  }) }
}

function storyView(state: LifeState, ctx: LifeContext): StoryView {
  if (ctx.storyMode !== true) return { enabled: false }
  const current = state.estate.city, chapter = chapterOf(state, current), tally = state.story.cities[current] ?? { missions: [], venues: [] }
  const content = cachedCityContent(current)
  return {
    enabled: true,
    mode: state.story.mode,
    cityId: current,
    start: state.story.start,
    chapter,
    chapterLabel: STORY_CHAPTERS[chapter],
    nextStep: nextStep(state, current),
    progress: { missions: tally.missions.length, venues: tally.venues.length },
    signature: storySignature(current),
    helped: state.story.helped.map(receipt => ({ ...receipt, label: cityName(receipt.city) ?? receipt.city })),
    cities: playableCityIdsSoFar().map(id => ({ id, label: cityName(id) ?? id, chapter: chapterOf(state, id), unlocked: cityUnlocked(state, id) })),
    venues: (content?.venues ?? []).map(row => {
      const required = venueChapter(current, row.definition, content), locked = venueOpen(state, current, row.id) !== null
      return { id: row.id, label: row.name, chapter: required, locked, reason: locked ? venueBlockReason(state, current, row.id) : null }
    }),
  }
}

export default {
  id: 'story',
  stateKeys: ['story'],
  sanitize(input, state, ctx) {
    const now = ctx.now || state.t, raw = isRecord(input.story) ? input.story : null
    if (!raw) {
      state.story = { version: 1, trackingSince: now, mode: 'free', start: null, cities: legacyMissionReceipts(state), helped: [] }
      return
    }
    const trackingSince = raw.version === 1 && stamp(raw.trackingSince, now) ? raw.trackingSince : now
    const cities: StoryState['cities'] = {}
    if (raw.version === 1 && isRecord(raw.cities)) for (const [id, value] of Object.entries(raw.cities)) {
      if (!cityId(id)) continue
      const clean = cleanCity(value, id, now)
      if (clean) cities[id] = clean
    }
    const mode = raw.version === 1 && storyMode(raw.mode) ? raw.mode : 'free'
    const start = raw.version === 1 && cityId(raw.start) ? raw.start : mode === 'story' ? state.estate.city : null
    const helped = raw.version === 1 && Array.isArray(raw.helped) ? raw.helped.flatMap(value => cleanHelped(value, now) ?? []).slice(-MAX_HELPED) : []
    const helper = raw.version === 1 ? cleanHelper(raw.helper, now) : undefined
    state.story = { version: 1, trackingSince, mode, start, cities, helped, ...(helper ? { helper } : {}) }
  },
  ...play,
  modifiers: { ...(PLAYS ? { 'action.block': actionBlock } : {}), 'travel.view': travelView },
  view: storyView,
} satisfies SystemDefinition<'story'>
