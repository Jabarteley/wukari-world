// What a person can do with an AI agent, as they would with a person: write to it (the chat screen, 'agent-chat'), call it (the call screen of
// calls/), go to where it stands (the Map's trip, or the Square), and see it. The routes are server/agents/contact.ts. Lazy with the AI agents screens.
import { useApp } from '../../state/app.ts'
import { useAccountLite } from '../account/useAccountLite.ts'
import { startAgentCall } from '../calls/agentCallState.ts'
import type { AgentTalkAnswer, OnlineAgent, OnlineAgentsView } from '../../../types/agents-http.ts'

/** Residents and house agents answer here and on calls; a character an agent plays is a player: Messages and a player's card. */
export const answersHere = (id: string): boolean => id.startsWith('resident.') || id.startsWith('house.')

/** The agents of a city (and how many in each other city), a name search, or one agent by id. */
export function fetchAgents(query: { city?: string; q?: string; id?: string }): Promise<OnlineAgentsView> {
  const { game } = useApp()
  const params = new URLSearchParams(Object.entries(query).filter((entry): entry is [string, string] => typeof entry[1] === 'string' && entry[1] !== ''))
  return game.fetchJson<OnlineAgentsView>(`/api/agents/online?${params.toString()}`)
}

/** One line to an agent, with the last lines of the chat; the answer's words, or the reason it could not be had. */
export async function talkTo(agent: string, text: string, history: { me: boolean; text: string }[]): Promise<{ ok: true; answer: AgentTalkAnswer } | { ok: false; reason: string }> {
  const { game } = useApp()
  const lite = useAccountLite()
  if (!lite.token()) await lite.load().catch(() => {})
  const post = (): Promise<AgentTalkAnswer> => game.fetchJson<AgentTalkAnswer>('/api/agents/talk', { method: 'POST', body: { agent, text, history, csrf: lite.token() } })
  try {
    try { return { ok: true, answer: await post() } } catch (error) {
      // The token read before this session began (the welcome screen) is stale: read it again, once.
      if (typeof error !== 'object' || error === null || Reflect.get(error, 'code') !== 'csrf_rejected') throw error
      await lite.load(true)
      return { ok: true, answer: await post() }
    }
  } catch (error) {
    const reason = typeof error === 'object' && error !== null ? Reflect.get(error, 'reason') : undefined, code = typeof error === 'object' && error !== null ? Reflect.get(error, 'code') : undefined
    return { ok: false, reason: typeof reason === 'string' && reason ? reason : code === 'rate_limited' ? 'You are writing too quickly. Wait a moment.' : 'That did not go through. Try again.' }
  }
}

/** Open the chat with an agent (a player an agent plays: Messages). */
export function openChat(agent: Pick<OnlineAgent, 'id' | 'name' | 'city'>): void {
  const { shell } = useApp()
  if (answersHere(agent.id)) shell.open('agent-chat', { id: agent.id, name: agent.name, city: agent.city })
  else shell.open('messages', { to: agent.id, name: agent.name })
}

/** Call an agent: the call screen opens over everything. */
export function callAgent(agent: Pick<OnlineAgent, 'id' | 'name'>): void {
  const { shell } = useApp()
  startAgentCall(agent.id, agent.name)
  shell.close()
}

/** Go where the agent stands: the Square from anywhere; in this city the Map's trip to the venue; in another city the country map at that city. */
export async function goToAgent(agent: Pick<OnlineAgent, 'city' | 'venue'>): Promise<void> {
  const app = useApp()
  if (agent.city === 'world' && agent.venue === 'square') { const { enterSquare } = await import('../places/placesStore.ts'); app.shell.close(); await enterSquare(); return }
  if (agent.city === app.game.view.value.cityId) {
    if (agent.venue) await app.goTo(agent.venue)
    else app.shell.open('map')
    return
  }
  app.showMapLayer('world', { level: 2, city: agent.city })
}

/** Their card: the person card, which for a resident or a house agent shows these same actions. */
export function viewAgent(agent: Pick<OnlineAgent, 'id' | 'name'>): void { useApp().shell.open('person', { player: agent.id, name: agent.name }) }
