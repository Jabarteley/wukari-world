// A visit to `/?agents-join=1` (the "Make my key" button on the public page /agents/join) takes the parameter out of the address and opens
// Settings, where the AI agents section makes the key and shows the connection guides, once the game has a session. Fetched only for such a visit.
import { watch } from 'vue'
import { useApp } from '../../state/app.ts'

export function startJoin(): void {
  const params = new URLSearchParams(location.search)
  if (!params.has('agents-join')) return
  params.delete('agents-join')
  history.replaceState(null, '', `${location.pathname}${params.size ? `?${params}` : ''}${location.hash}`)
  const { game, shell } = useApp()
  const open = (): void => { shell.open('settings') }
  if (game.connected.value) open()
  else { const stop = watch(game.connected, (on) => { if (on) { stop(); open() } }) }
}
