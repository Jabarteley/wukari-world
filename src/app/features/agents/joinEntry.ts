// "Make my key" on the public page /agents/join leads to `/sound?agents-join=1`: an address the game already opens Settings at, so the first
// download carries nothing new for it. startExtras.ts fetches this chunk only for such a visit: it takes the parameter out of the address and
// opens Settings at the AI agents section (where the key is made and the guides are filled in with it), once the game has a session.
import { wantAgentSetup } from './claimEntry.ts'

export function startJoin(): void {
  const params = new URLSearchParams(location.search)
  if (params.has('agents-join')) {
    params.delete('agents-join')
    history.replaceState(history.state, '', `${location.pathname}${params.size ? `?${params}` : ''}${location.hash}`)
  }
  wantAgentSetup('mine')
}
