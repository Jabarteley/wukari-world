// The /api/minigames/ requests (server/routes/minigames.ts; types in src/types/minigames.ts). A refusal comes back as { ok: false, code, reason };
// a host error (offline, rate limit, a moved city) is turned into the same shape, so the screens have one thing to show.
import type { ApiError, FetchJson } from '../../types/client.ts'
import type { HaggleBest, HaggleStalls, HaggleTraderView, JambAnswerResult, JambView, NyscView, SeasonsView, SkitCheck } from '../../../types/minigames.ts'

export type Refused = { ok: false; code: string; reason: string }
export type Answer<T> = ({ ok: true } & T) | Refused

async function ask<T>(call: () => Promise<Answer<T>>): Promise<Answer<T>> {
  try { return await call() } catch (error) {
    const failure = error as ApiError
    return { ok: false, code: failure.code ?? 'offline', reason: failure.reason ?? (failure.status === 429 ? 'Too fast. Wait a moment.' : 'Could not reach the game. Check your connection.') }
  }
}

export function minigamesApi(fetchJson: FetchJson) {
  const post = <T>(path: string, body: object) => ask<T>(() => fetchJson<Answer<T>>(`/api/minigames/${path}`, { method: 'POST', body }))
  return {
    stalls: (city: string) => ask<{ stalls: HaggleStalls }>(() => fetchJson<Answer<{ stalls: HaggleStalls }>>(`/api/minigames/haggle/stalls?city=${encodeURIComponent(city)}`)),
    open: (cityId: string, trader: string, item: string) => post<{ trader: HaggleTraderView; said: string }>('haggle/open', { cityId, trader, item }),
    offer: (cityId: string, trader: string, item: string, offer: number, requestId: string) => post<{ trader: HaggleTraderView; said: string; viaModel: boolean }>('haggle/offer', { cityId, trader, item, offer, requestId }),
    buy: (cityId: string, trader: string, item: string, requestId: string) => post<{ trader: HaggleTraderView; said: string; paid: number; best: HaggleBest | null }>('haggle/buy', { cityId, trader, item, requestId }),
    checkSkit: (words: SkitCheck) => post<SkitCheck>('skit/check', words),
    seasons: (city: string) => ask<{ seasons: SeasonsView }>(() => fetchJson<Answer<{ seasons: SeasonsView }>>(`/api/minigames/seasons?city=${encodeURIComponent(city)}`)),
    joinNysc: (cityId: string, requestId: string) => post<{ nysc: NyscView }>('nysc/join', { cityId, requestId }),
    duty: (cityId: string, duty: string, option: string, requestId: string) => post<{ nysc: NyscView; paid: number }>('nysc/duty', { cityId, duty, option, requestId }),
    passOut: (cityId: string, requestId: string) => post<{ nysc: NyscView; paid: number }>('nysc/pass-out', { cityId, requestId }),
    joinJamb: (cityId: string, requestId: string) => post<{ jamb: JambView }>('jamb/join', { cityId, requestId }),
    today: (cityId: string) => post<{ jamb: JambView }>('jamb/today', { cityId }),
    answer: (cityId: string, id: number, choice: number, requestId: string) => post<{ jamb: JambView; result: JambAnswerResult }>('jamb/answer', { cityId, id, choice, requestId }),
    mockStart: (cityId: string, requestId: string) => post<{ jamb: JambView }>('jamb/mock/start', { cityId, requestId }),
    mockSubmit: (cityId: string, answers: (number | null)[], requestId: string) => post<{ jamb: JambView }>('jamb/mock/submit', { cityId, answers, requestId }),
  }
}
export type MiniGamesApi = ReturnType<typeof minigamesApi>
