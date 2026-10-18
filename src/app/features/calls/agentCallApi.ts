// The phone's side of the routes in server/house/call-routes.ts: start, transcribe, turn, end. One small adapter so the call logic (agentCall.ts) never sees HTTP.
import type { FetchJson } from '../../types/client.ts'
import type { CallApi, StartAnswer, TurnAnswer } from './agentCall.ts'

/** A route's error as the words to show: its `reason` sentence when it has one. A call the server no longer has is the call ending. */
export function wordsOf(error: unknown): Error {
  const code = typeof error === 'object' && error !== null ? Reflect.get(error, 'code') : undefined
  const reason = typeof error === 'object' && error !== null ? Reflect.get(error, 'reason') : undefined
  if (code === 'call_ended') return new Error('The call has ended.')
  if (typeof reason === 'string' && reason) return new Error(reason)
  if (code === 'rate_limited') return new Error('You are going too fast. Wait a moment.')
  return new Error(error instanceof Error && error.message && !/^[a-z_]+$/.test(error.message) ? error.message : 'That did not work. Try again.')
}

export function agentCallApi(fetchJson: FetchJson, token: () => string | null, refresh?: () => Promise<void>): CallApi & { transcribe(call: string, audioBase64: string, mediaType: string): Promise<string> } {
  const send = <T>(path: string, body: Record<string, unknown>): Promise<T> => fetchJson<T>(path, { method: 'POST', body: { ...body, csrf: token() } })
  const post = async <T>(path: string, body: Record<string, unknown>): Promise<T> => {
    try { return await send<T>(path, body) } catch (error) {
      // A token read before this session began is stale: `refresh` reads it again, and the call is tried once more.
      if (!refresh || typeof error !== 'object' || error === null || Reflect.get(error, 'code') !== 'csrf_rejected') throw wordsOf(error)
      try { await refresh(); return await send<T>(path, body) } catch (again) { throw wordsOf(again) }
    }
  }
  let current = ''
  return {
    async start(agent: string): Promise<StartAnswer> {
      const answer = await post<StartAnswer>('/api/agents/call/start', { agent })
      if (answer.call) current = answer.call
      return answer
    },
    turn: (call: string, text: string): Promise<TurnAnswer> => post<TurnAnswer>('/api/agents/call/turn', { call, text }),
    async end(call: string): Promise<void> { await post('/api/agents/call/end', { call }) },
    async transcribe(call: string, audioBase64: string, mediaType: string): Promise<string> {
      const answer = await post<{ text?: string; over?: string }>('/api/agents/call/transcribe', { call: call || current, audio: audioBase64, mediaType })
      return typeof answer.text === 'string' ? answer.text : ''
    },
  }
}
