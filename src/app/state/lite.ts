// LITE: Allworld without the 3D world (docs/FEED.md, "Lite"). The same app, the same routes and sockets, with no scene: the phone's social
// apps fill the screen behind five tabs (Feed, Here, Chats, People, Me), and "Step into the 3D world" opens the scene for a browser that can.
// On when the address is /app or ?lite=1 asked for it (both kept on this device), when this device chose it before, or when the browser
// cannot draw the scene (no WebGL context). ?lite=0 turns it off for this device. Decided once, before anything is drawn. The switches are
// in ./liteSwitch.ts, fetched only by the screens that offer them.
import { ref } from 'vue'

export const LITE_KEY = 'allworld-lite-v1'
/** Why Lite is on: chosen (the address, ?lite=1 or a kept choice) or no-3d (this browser cannot draw the scene); null: the 3D world. */
export type LiteWhy = 'chosen' | 'no-3d' | null
interface LiteWindow { location?: { pathname?: string; search?: string }; localStorage?: Pick<Storage, 'getItem' | 'setItem' | 'removeItem'> | null; document?: { createElement?(tag: string): unknown } }
type Probe = { getContext?(kind: string): object | null }
const draws = (win: LiteWindow): boolean => { try { const c = win.document?.createElement?.('canvas') as Probe | undefined; return Boolean(c?.getContext?.('webgl2') ?? c?.getContext?.('webgl')) } catch { return false } }
export function decideLite(win: LiteWindow): LiteWhy {
  const asked = new URLSearchParams(win.location?.search ?? '').get('lite'), store = win.localStorage
  const want = asked === '1' || /^\/app\/?$/.test(win.location?.pathname ?? '')
  let kept = false
  try { if (asked === '0') store?.removeItem(LITE_KEY); else if (want) store?.setItem(LITE_KEY, '1'); else kept = store?.getItem(LITE_KEY) === '1' } catch { /* private mode */ }
  return want || kept ? 'chosen' : draws(win) ? null : 'no-3d'
}
const why = decideLite(globalThis as unknown as LiteWindow)
export const liteWhy = ref<LiteWhy>(why)
export const lite = ref(why !== null)
if (why) globalThis.document?.body?.classList.add('is-lite')
