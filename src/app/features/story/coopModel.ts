import type { PlayerRef } from '../../../types/protocol.ts'
import type { StoryHelpKind } from '../../../types/story.ts'
import { publicStoryHelpId } from '../messages/messagesModel.ts'

export interface HelpQuestion {
  prompt: string
  options: Array<{ id: string; label: string }>
  answered: boolean
}

export interface HelpTable {
  cards: Array<number | null>
  turn: 'host' | 'helper'
  team: number
  house: number
  played: { host: number; helper: number }
  last: number[]
  result: 'playing' | 'lost'
}

export interface HelpSessionView {
  id: string
  host: PlayerRef
  helper: PlayerRef
  city: string
  cityName: string
  venue: string
  label: string
  kind: StoryHelpKind
  status: 'offered' | 'active' | 'completed' | 'ended' | 'expired'
  expiresAt: number
  role: 'host' | 'helper'
  joined: boolean
  question: HelpQuestion | null
  table: HelpTable | null
  errand: { mission: string; rewardId: string | null } | null
}

export interface StoryHelpView {
  ok: true
  enabled: boolean
  remainingCalls: number
  challenge: { episodeId: string; venue: string; canCall: boolean; reason: string | null } | null
  friends: PlayerRef[]
  sessions: HelpSessionView[]
}

export interface StoryHelpResult { ok: boolean; code: string; reason?: string; id?: string }

export const HELP_KINDS: readonly { id: StoryHelpKind; label: string; description: string }[] = [
  { id: 'second-answer', label: 'Second answer', description: 'Answer different questions from the same tale.' },
  { id: 'two-seat', label: 'Two-seat memory', description: 'Take turns finding pairs against the house.' },
  { id: 'errand', label: 'Shared errand', description: 'Finish a verified local mission for the team.' },
]

export function takeStoryHelpQuery(location: Pick<Location, 'href'>, history: Pick<History, 'state' | 'replaceState'>): string | null {
  const url = new URL(location.href)
  const raw = url.searchParams.get('storyHelp')
  if (raw === null) return null
  url.searchParams.delete('storyHelp')
  history.replaceState(history.state, '', `${url.pathname}${url.search}${url.hash}`)
  return publicStoryHelpId(raw)
}

export function sessionPeer(session: HelpSessionView): PlayerRef {
  return session.role === 'host' ? session.helper : session.host
}

export function expiryLabel(expiresAt: number, now: number): string {
  const minutes = Math.max(0, Math.ceil((expiresAt - now) / 60000))
  return minutes === 0 ? 'Expires now' : `${minutes} minute${minutes === 1 ? '' : 's'} left`
}

export function canPlayTable(session: HelpSessionView): boolean {
  return session.status === 'active' && session.table?.result === 'playing' && session.table.turn === session.role
}

export function turnLabel(session: HelpSessionView): string {
  const table = session.table
  if (!table) return ''
  if (table.result === 'lost') return 'The house won this round.'
  if (table.turn === session.role) return 'Your turn: choose two cards.'
  return `Waiting for ${sessionPeer(session).name}.`
}
