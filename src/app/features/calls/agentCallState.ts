// What the page knows about a call with an AI character, kept in the entry bundle on purpose: a few lines, so the Call button (in Settings) and the host agree without loading the
// call screen, the recognition engines or the voices early. The screen (AgentCallScreen.vue) is fetched when a call is started.
import { reactive } from 'vue'

export const agentCallStore = reactive({
  /** The AI character being called (a house agent's id and name), or null. */
  open: null as { agent: string; name: string } | null,
})
/** Start a call with an AI character: the screen opens, asks for the call and listens for the talk button. */
export function startAgentCall(agent: string, name: string): void { if (agentCallStore.open === null) agentCallStore.open = { agent, name } }
export function closeAgentCall(): void { agentCallStore.open = null }
