import type { PlayerRef } from '../../../types/protocol.ts'
import type { StoryHelpKind } from '../../../types/story.ts'
import { publicStoryHelpId } from '../messages/messagesModel.ts'

import type { HelpSessionView } from '../../../types/story-http.ts'
export type { HelpQuestion, HelpTable, HelpSessionView, StoryHelpView, StoryHelpResult } from '../../../types/story-http.ts'

export const HELP_KINDS: readonly { id: StoryHelpKind; label: string; description: string }[] = [
  { id: 'second-answer', label: 'Second answer', description: 'Answer different questions about the same city.' },
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

export function canPickTableCard(session: HelpSessionView, index: number): boolean {
  const table = session.table
  return Boolean(canPlayTable(session) && table && Number.isSafeInteger(index) && index >= 0 && index < table.cards.length && !table.found.includes(index))
}

export function turnLabel(session: HelpSessionView): string {
  const table = session.table
  if (!table) return ''
  if (table.result === 'lost') return 'The house won this round.'
  if (table.turn === session.role) return 'Your turn: choose two cards.'
  return `Waiting for ${sessionPeer(session).name}.`
}
