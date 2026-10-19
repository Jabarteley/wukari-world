// The social glue on the page (docs/SOCIAL-GLUE.md): one small store the lazy screens share. Requests go through the social client's `call`
// (the same session, the same refusal words); a `world-live` frame of kind `glue` from the server says what changed, and the screens that
// show it read again. Nothing here is in the first download: it is imported only by the glue's own lazy components.
import { reactive } from 'vue'
import { call, onCallFrame } from '../social/useSocial.ts'
import type { SocialResult } from '../social/socialClient.ts'
import type { CloseNowLine, CloseView } from '../../../types/glue.ts'
import { GLUE } from '../../../glue/model.ts'

type What = 'close' | 'trip' | 'family' | 'talk'
export const glue = reactive({
  close: null as CloseView | null,
  /** The close friends who share with me who are somewhere now (the HUD line and the Messages strip). */
  now: [] as CloseNowLine[],
  nowAt: 0,
  /** Bumped when the server says something of that kind changed; screens watch it. */
  rev: { close: 0, trip: 0, family: 0, talk: 0 } as Record<What, number>,
})

export function glueCall<T>(path: string, body?: Record<string, unknown>): Promise<SocialResult<T>> { return call<T>(path, body) }

export async function loadClose(): Promise<string | null> {
  const r = await call<CloseView>('/api/glue/close')
  if (!r.ok) return r.reason
  glue.close = r; glue.now = r.now; glue.nowAt = Date.now()
  return null
}
export async function setClose(body: Record<string, unknown>): Promise<string | null> {
  const r = await call<CloseView>('/api/glue/close', body)
  if (!r.ok) return r.reason
  glue.close = r; glue.now = r.now
  return null
}
/** The lines only; at most once a minute unless forced (a frame said they changed). */
export async function loadNow(force = false): Promise<void> {
  if (!force && Date.now() - glue.nowAt < GLUE.close.pollMs - 1000) return
  glue.nowAt = Date.now()
  const r = await call<{ now: CloseNowLine[] }>('/api/glue/close/now')
  if (r.ok) glue.now = r.now
}

onCallFrame((raw) => {
  const frame = raw as unknown as { type?: string; kind?: string; what?: What }
  if (frame.type !== 'world-live' || frame.kind !== 'glue' || !frame.what || !(frame.what in glue.rev)) return
  glue.rev[frame.what] += 1
  if (frame.what === 'close') void loadNow(true)
})
