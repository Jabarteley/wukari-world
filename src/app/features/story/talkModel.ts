import type { TalkHistoryLine } from '../../../types/story-talk.ts'

export const TALK_QUESTION_MAX = 600
export const TALK_HISTORY_MAX = 4
export const TALK_HISTORY_TEXT_MAX = 240
export const TALK_REPLY_MAX = 140

export interface TalkContext {
  character: string
  city: string
  venue: string
  npc: string
  enabled: boolean
  connected: boolean
}

export interface TalkPostPayload {
  npc: string
  clientId: string
  question: string
  history: TalkHistoryLine[]
}

export interface TalkRequestToken {
  context: string
  generation: number
  clientId: string
}

export interface TalkModelState {
  context: string
  generation: number
  history: TalkHistoryLine[]
  retry: TalkPostPayload | null
}

export const talkContextKey = (context: TalkContext): string => JSON.stringify([
  context.character, context.city, context.venue, context.npc, context.enabled, context.connected,
])

const boundedLine = (line: TalkHistoryLine): TalkHistoryLine => ({
  from: line.from,
  text: line.text.slice(0, TALK_HISTORY_TEXT_MAX),
})

export function boundTalkHistory(lines: readonly TalkHistoryLine[]): TalkHistoryLine[] {
  return lines.slice(-TALK_HISTORY_MAX).map(boundedLine)
}

export function createTalkModel(context: TalkContext): TalkModelState {
  return { context: talkContextKey(context), generation: 0, history: [], retry: null }
}

export function reconcileTalkContext(state: TalkModelState, context: TalkContext): TalkModelState {
  const key = talkContextKey(context)
  return key === state.context ? state : { context: key, generation: state.generation + 1, history: [], retry: null }
}

export function currentTalkToken(state: TalkModelState): TalkRequestToken {
  return { context: state.context, generation: state.generation, clientId: '' }
}

export function isTalkTokenCurrent(state: TalkModelState, token: TalkRequestToken): boolean {
  return state.context === token.context && state.generation === token.generation
    && (token.clientId === '' || state.retry?.clientId === token.clientId)
}

export function beginTalkRequest(state: TalkModelState, npc: string, clientId: string, rawQuestion: string): {
  state: TalkModelState
  payload: TalkPostPayload
  token: TalkRequestToken
} {
  if (state.retry) throw new Error('retry the pending talk request before starting another')
  const question = rawQuestion.trim()
  if (!npc || !clientId || !question || question.length > TALK_QUESTION_MAX) throw new Error('talk request is incomplete or too long')
  const payload: TalkPostPayload = { npc, clientId, question, history: boundTalkHistory(state.history) }
  const next = { ...state, retry: payload }
  return { state: next, payload, token: { context: next.context, generation: next.generation, clientId } }
}

export function retryTalkRequest(state: TalkModelState): { payload: TalkPostPayload; token: TalkRequestToken } {
  if (!state.retry) throw new Error('there is no talk request to retry')
  return {
    payload: state.retry,
    token: { context: state.context, generation: state.generation, clientId: state.retry.clientId },
  }
}

export function discardTalkRequest(state: TalkModelState): TalkModelState {
  if (!state.retry) return state
  return { ...state, generation: state.generation + 1, retry: null }
}

export function completeTalkReply(state: TalkModelState, token: TalkRequestToken, reply: string): TalkModelState | null {
  if (!isTalkTokenCurrent(state, token)) return null
  if (!reply || reply.length > TALK_REPLY_MAX) throw new Error('talk reply is empty or too long')
  const pending = state.retry
  if (!pending) return null
  return {
    ...state,
    history: boundTalkHistory([...state.history, { from: 'player', text: pending.question }, { from: 'npc', text: reply }]),
    retry: null,
  }
}

export function completeTalkNotice(state: TalkModelState, token: TalkRequestToken): TalkModelState | null {
  return isTalkTokenCurrent(state, token) ? { ...state, retry: null } : null
}
