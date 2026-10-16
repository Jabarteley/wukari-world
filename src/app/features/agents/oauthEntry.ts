// A WEB ASSISTANT'S SIGN-IN (ChatGPT, Claude: docs/AGENTS.md "Sign-in for web assistants") sends the person to /oauth/authorize?... on this
// origin. This chunk keeps the request for the tab, takes it out of the address (it holds a PKCE challenge and a state), and opens Settings,
// where the approval card (OAuthApproval.vue) asks the person. Fetched only for such a visit (startExtras.ts); the first download carries nothing of it.
import { wantAgentSetup } from './claimEntry.ts'
import { OAUTH_REQUEST_KEY } from './oauthKey.ts'

export function startOAuth(): void {
  const query = location.search.replace(/^\?/, '')
  if (!query || query.length > 2048) return
  try { sessionStorage.setItem(OAUTH_REQUEST_KEY, query) } catch { /* private mode: the assistant's link can be opened again */ }
  history.replaceState(null, '', '/')
  wantAgentSetup('mine')
}
