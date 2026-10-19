// The page's copy of the weekly world event, the open stage of a room and the election-night board (docs/WORLD-EVENTS.md). Loaded only
// by the lazy chip, the phone app and the Square's panel. Everything is the server's: buttons ask, the answers replace what is shown.
// The server pushes `world-live` frames to the people in the Square and at the event's venues; the reads below are also polled slowly.
import { reactive } from 'vue'
import { call, onCallFrame } from '../social/useSocial.ts'
import { stageVoice } from '../../../community.ts'
import { mayTalk } from '../../../world-events/stage.ts'
import type { StageView } from '../../../world-events/stage.ts'
import type { ElectionNightView, EventStepOp, WorldEventMine, WorldEventView, WorldLiveFrame } from '../../../types/world-events.ts'

export const worldEvent = reactive<{ view: WorldEventView | null; mine: WorldEventMine | null; at: number; busy: boolean; note: string; moment: { title: string; name: string; text: string; ai: boolean; at: number } | null }>({ view: null, mine: null, at: 0, busy: false, note: '', moment: null })
export const stageState = reactive<{ room: string; stage: StageView | null; canOpen: boolean; busy: boolean; note: string }>({ room: '', stage: null, canOpen: false, busy: false, note: '' })
export const night = reactive<{ city: string; view: ElectionNightView | null; at: number }>({ city: '', view: null, at: 0 })

const EVENT_MS = 60000, LIVE_MS = 10000
let loading: Promise<void> | null = null
/** Read the week's event (public), at most every minute, every ten seconds while it runs, or now with `force`. */
export function loadEvent(force = false, withMine = false): Promise<void> {
  const live = worldEvent.view?.event?.phase === 'live' || worldEvent.view?.event?.phase === 'warmup'
  if (!force && Date.now() - worldEvent.at < (live ? LIVE_MS : EVENT_MS)) return Promise.resolve()
  if (loading) return loading
  loading = (async () => {
    try {
      const view = await call<WorldEventView>('/api/world/event') as unknown as WorldEventView & { ok?: boolean }
      if (view && typeof view.now === 'number') { worldEvent.view = view; worldEvent.at = Date.now() }
      if (withMine) { const mine = await call<WorldEventMine>('/api/world/event/me') as unknown as WorldEventMine; if (mine && typeof mine.steps === 'number') worldEvent.mine = mine }
    } finally { loading = null }
  })()
  return loading
}
/** One step of the event. Returns the server's sentence when it refused. */
export async function eventStep(op: EventStepOp, extra: { question?: string; answer?: string } = {}): Promise<string | null> {
  if (worldEvent.busy) return null
  worldEvent.busy = true; worldEvent.note = ''
  try {
    const done = await call<{ code: string; count: number; mine: WorldEventMine }>('/api/world/event/step', { op, ...extra })
    if ('mine' in done && done.mine) worldEvent.mine = done.mine as WorldEventMine
    await loadEvent(true)
    return done.ok ? null : done.reason
  } finally { worldEvent.busy = false }
}

// ---- the stage of a room ----------------------------------------------------------------------------------------------------
/** Keep the voice rule of the open stage in the community controller (src/community.ts). */
function voiceRule(): void {
  const stage = stageState.stage
  stageVoice.onStage = stage && stage.endsAt > Date.now() - 60000 ? (id: string) => mayTalk({ moderator: stage.moderator, speakers: stage.speakers }, id) : null
}
export async function loadStage(room: string): Promise<void> {
  if (stageState.room !== room) { stageState.room = room; stageState.stage = null; stageState.note = '' }
  const done = await call<{ stage: StageView | null; canOpen: boolean }>(`/api/world/stage?room=${encodeURIComponent(room)}`) as unknown as { stage?: StageView | null; canOpen?: boolean }
  if (stageState.room !== room || !done || !('stage' in done)) return
  stageState.stage = done.stage ?? null; stageState.canOpen = done.canOpen === true
  voiceRule()
}
export async function stageAct(op: string, extra: Record<string, unknown> = {}): Promise<string | null> {
  if (stageState.busy || !stageState.room) return null
  stageState.busy = true; stageState.note = ''
  try {
    const done = await call<{ stage: StageView | null }>('/api/world/stage', { room: stageState.room, op, ...extra })
    if (done.ok) { stageState.stage = done.stage ?? null; voiceRule() }
    return done.ok ? null : done.reason
  } finally { stageState.busy = false }
}
/** Leaving the room: the ordinary voice rules again. */
export function leaveStage(): void { stageState.room = ''; stageState.stage = null; stageVoice.onStage = null }

// ---- election night -----------------------------------------------------------------------------------------------------------
export async function loadNight(city: string, force = false): Promise<void> {
  if (!city || (!force && night.city === city && Date.now() - night.at < 20000)) return
  const view = await call<ElectionNightView>(`/api/world/election-night?city=${encodeURIComponent(city)}`) as unknown as ElectionNightView
  if (view && Array.isArray(view.seats)) { night.city = city; night.view = view; night.at = Date.now() }
}
export async function nightPost(path: 'speech' | 'card', body: Record<string, unknown>): Promise<{ ok: true; n?: number; text?: string } | { ok: false; reason: string }> {
  const done = await call<{ n?: number; text?: string }>(`/api/world/election-night/${path}`, body)
  return done.ok ? { ok: true, ...(typeof done.n === 'number' ? { n: done.n } : {}), ...(typeof done.text === 'string' ? { text: done.text } : {}) } : { ok: false, reason: done.reason }
}

// ---- frames ---------------------------------------------------------------------------------------------------------------------
onCallFrame((raw) => {
  if (raw.type !== 'world-live') return
  const frame = raw as unknown as WorldLiveFrame
  if (frame.kind === 'event') {
    const event = worldEvent.view?.event
    if (event && event.week === frame.week) { event.count = frame.count; event.percent = frame.percent; event.phase = frame.phase }
    void loadEvent(true)
  } else if (frame.kind === 'stage') {
    if (frame.room === stageState.room) void loadStage(frame.room)
  } else if (frame.kind === 'moment') {
    worldEvent.moment = { title: frame.title, name: frame.name, text: frame.text, ai: frame.ai === true, at: Date.now() }
  }
})
