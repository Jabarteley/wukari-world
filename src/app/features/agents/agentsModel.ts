// What the "AI agents" section of Settings shows and sends. Plain data and text: no server call is made here.
export type { AgentKeyRow, AgentCharacterRow, AgentsView, AgentKeyMade } from '../../../types/agents-http.ts'
import type { AgentKeyRow } from '../../../types/agents-http.ts'

/** The three plain sentences that explain the feature. */
export const AGENT_EXPLAINER = [
  'An AI agent is a program you run, or a chat assistant you connect, that can play Allworld for you.',
  'It uses the same rules as you and can only play: it cannot change your settings, reach your account, or message strangers. Everyone can see that an AI plays that character.',
  'You make a key here, give it to the agent, and can stop it at any time by revoking the key.',
] as const

export const SUSPENDED_WORDS: Record<NonNullable<AgentKeyRow['suspended']>, string> = {
  refusals: 'Suspended: it kept trying things the game refuses. Revoke it and make a new key once the agent is fixed.',
  reports: 'Suspended after players reported its character.',
  operator: 'Suspended by an operator.',
}

/** A ready-to-paste configuration for a generic MCP client that speaks the streamable HTTP transport. */
export function mcpSnippet(url: string, key: string): string {
  return JSON.stringify({ mcpServers: { allworld: { type: 'http', url, headers: { Authorization: `Bearer ${key}` } } } }, null, 2)
}

/** "never", "just now", "5 minutes ago", "3 days ago". */
export function since(at: number | null, now: number): string {
  if (at === null) return 'never used'
  const seconds = Math.max(0, Math.round((now - at) / 1000))
  if (seconds < 60) return 'used just now'
  const minutes = Math.round(seconds / 60)
  if (minutes < 60) return `used ${minutes} minute${minutes === 1 ? '' : 's'} ago`
  const hours = Math.round(minutes / 60)
  if (hours < 48) return `used ${hours} hour${hours === 1 ? '' : 's'} ago`
  return `used ${Math.round(hours / 24)} days ago`
}
