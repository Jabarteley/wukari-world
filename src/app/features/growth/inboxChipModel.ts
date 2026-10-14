// What the inbox chip says (offline, a knock at the door, hidden, or the unread count). Pure, so it is tested without a browser.
// Split from ./awayModel.ts, which the first download carries for the chip's slot: the chip's words are fetched with the chip (InboxChip.vue).
import type { SocialOverview } from '../../../types/social.ts'

export type InboxChipView =
  | { kind: 'offline'; short: string }
  | { kind: 'knock'; name: string }
  | { kind: 'hidden' }
  | { kind: 'inbox'; active: boolean; hint: string }

export function inboxChip(input: {
  connected: boolean
  onboardingRequired: boolean
  me: Pick<SocialOverview, 'house' | 'requests'> | null
  error: string | null
  unreadChats: number
  unreadUpdates: number
  freshNotices: number
  /** The connection's short words ("No internet"), or ''. */
  short: string
}): InboxChipView {
  if (!input.connected) return { kind: 'offline', short: input.short || 'Not connected' }
  const knocks = input.me?.house.knocks ?? []
  const first = knocks[0]
  if (first) return { kind: 'knock', name: first.from.name }
  const chats = input.unreadChats
  const updates = input.unreadUpdates + (input.me?.requests.in.length ?? 0) + input.freshNotices
  if (input.onboardingRequired) return { kind: 'hidden' }
  const hint = !input.me ? (input.error ? 'Could not load · tap to retry' : 'Loading…')
    : chats || updates ? [chats ? `${chats} unread` : '', updates ? `${updates} update${updates === 1 ? '' : 's'}` : ''].filter(Boolean).join(' · ') : 'No new messages'
  return { kind: 'inbox', active: Boolean(chats || updates), hint }
}
