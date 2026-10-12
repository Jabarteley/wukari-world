// A CLAIM LINK (/agents/claim/<token>) sends a person to /?claim-agent=<token>. This chunk keeps the token for the tab, takes it out of the address,
// and opens Settings (where the "AI agents" section offers the claim) once the game has a session. Fetched only for such a visit.
import { watch } from 'vue'
import { useApp } from '../../state/app.ts'

export const CLAIM_KEY = 'jaw:claim-agent'
export function startClaim(): void {
  const params = new URLSearchParams(location.search), token = params.get('claim-agent')
  if (!token || !/^awc_[A-Za-z0-9_-]{43}$/.test(token)) return
  try { sessionStorage.setItem(CLAIM_KEY, token) } catch { /* private mode: the link can be opened again */ }
  params.delete('claim-agent')
  history.replaceState(null, '', `${location.pathname}${params.size ? `?${params}` : ''}${location.hash}`)
  const { game, shell } = useApp()
  const open = (): void => { shell.open('settings') }
  if (game.connected.value) open()
  else { const stop = watch(game.connected, (on) => { if (on) { stop(); open() } }) }
}

/** The entry page's "Connect an AI agent" cards: keep which one was chosen, start the game, and open Settings at the agent section. */
export const SETUP_KEY = 'jaw:agent-setup'
export type AgentSetup = 'mine' | 'own'
export function wantAgentSetup(choice: AgentSetup): void {
  try { sessionStorage.setItem(SETUP_KEY, choice) } catch { /* the Settings section is still one tap away */ }
  const { game, shell } = useApp()
  const open = (): void => { shell.open('settings') }
  if (game.connected.value) open()
  else { const stop = watch(game.connected, (on) => { if (on) { stop(); open() } }) }
}
/** The choice kept by `wantAgentSetup`, once. */
export function takeAgentSetup(): AgentSetup | null {
  try { const choice = sessionStorage.getItem(SETUP_KEY); sessionStorage.removeItem(SETUP_KEY); return choice === 'mine' || choice === 'own' ? choice : null } catch { return null }
}
