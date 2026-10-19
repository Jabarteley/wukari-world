// The /api/danfo/ requests (server/routes/danfo.ts; types in src/types/danfo.ts). A refusal comes back as { ok: false, code, reason };
// a host error (offline, rate limit, a moved city) is turned into the same shape, so the screens have one thing to show.
import type { ApiError, FetchJson } from '../../types/client.ts'
import type { DanfoPark, DanfoRole, DanfoRunView } from '../../../types/danfo.ts'
import type { StopCall } from '../../../danfo/run.ts'

export type Refused = { ok: false; code: string; reason: string }
export type Answer<T> = ({ ok: true } & T) | Refused
type RunAnswer = Answer<{ run: DanfoRunView; paid?: number; duplicate?: true }>
export interface BoardAnswerRow { name: string; earned: number; ms: number; at: number }

async function ask<T>(call: () => Promise<Answer<T>>): Promise<Answer<T>> {
  try { return await call() } catch (error) {
    const failure = error as ApiError
    return { ok: false, code: failure.code ?? 'offline', reason: failure.reason ?? (failure.status === 429 ? 'Too fast. Wait a moment.' : 'Could not reach the motor park. Check your connection.') }
  }
}

export function danfoApi(fetchJson: FetchJson) {
  const post = <T>(path: string, body: object) => ask<T>(() => fetchJson<Answer<T>>(`/api/danfo/${path}`, { method: 'POST', body }))
  return {
    park: (city: string) => ask<DanfoPark>(() => fetchJson<Answer<DanfoPark>>(`/api/danfo/park?city=${encodeURIComponent(city)}`)),
    run: (id: string) => ask<{ run: DanfoRunView }>(() => fetchJson<RunAnswer>(`/api/danfo/run?id=${encodeURIComponent(id)}`)),
    board: (route: string) => ask<{ route: string; week: number; rows: BoardAnswerRow[]; you: number }>(() => fetchJson(`/api/danfo/board?route=${encodeURIComponent(route)}`)),
    start: (cityId: string, routeId: string, requestId: string) => post<{ run: DanfoRunView }>('start', { cityId, routeId, requestId }),
    stop: (runId: string, stop: number, call: StopCall) => post<{ run: DanfoRunView }>('stop', { runId, stop, call }),
    finish: (runId: string, requestId: string, hardBrakes: number, crashes: number) => post<{ run: DanfoRunView; paid?: number }>('finish', { runId, requestId, hardBrakes, crashes }),
    abandon: (runId: string) => post<{ run: DanfoRunView }>('abandon', { runId }),
    join: (runId: string, role: DanfoRole) => post<{ run: DanfoRunView }>('join', { runId, role }),
    leave: (runId: string) => post<{ run: DanfoRunView }>('leave', { runId }),
    shout: (runId: string) => post<{ run: DanfoRunView }>('shout', { runId }),
    collect: (runId: string, requestId: string) => post<{ run: DanfoRunView; paid: number }>('collect', { runId, requestId }),
  }
}
export type DanfoApi = ReturnType<typeof danfoApi>
