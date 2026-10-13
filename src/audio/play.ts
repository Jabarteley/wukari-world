// The only part of the sound the first download carries: a hook that does nothing until the first tap, click or key. That gesture
// fetches the audio engine (a chunk of its own); before it, nothing is created and events are dropped. Events that arrive while
// the chunk loads are kept (a few) and played when it is up.
import type { LifeState } from '../types/life.ts'
import type { PanelView } from '../app/types/panel.ts'
import type { Engine } from './engine.ts'

let engine: Engine | null = null
let loading = false
let watching = false
let calling = false
let latest: [LifeState, PanelView] | null = null
const waiting: string[] = []

function wake(): void {
  if (engine?.disposed) engine = null
  if (engine) { engine.unlock(); return }
  if (loading) return
  loading = true
  import('./engine.ts').then(({ createEngine, onSoundEnabled }) => {
    loading = false
    if (!watching) {
      watching = true
      onSoundEnabled(() => { if (!engine || engine.disposed) wake() })
    }
    engine = createEngine()
    if (!engine) { waiting.length = 0; return }
    engine.call(calling)
    if (latest) engine.observe(...latest)
    engine.unlock()
    for (const name of waiting.splice(0)) engine.play(name)
  }).catch(() => { loading = false })
}
if (typeof window !== 'undefined') for (const type of ['pointerdown', 'keydown']) window.addEventListener(type, wake, { capture: true, passive: true })

/** Play a named sound (see EVENTS in data.ts), or `cmd:<type>` for an accepted command. */
export function play(name: string): void { if (engine) engine.play(name); else if (loading && waiting.length < 6) waiting.push(name) }
/** The game changed: the life and its view. */
export function observe(state: LifeState, view: PanelView): void { latest = [state, view]; engine?.observe(state, view) }
/** A voice call is ringing or connected: ambience steps back and interface sounds soften. */
export function setCallActive(on: boolean): void { calling = on; engine?.call(on) }
// The call screens say when a call is ringing or connected (a window event, so neither side imports the other): ambience ducks under it.
globalThis.window?.addEventListener('jaw:call-active', (event) => setCallActive((event as CustomEvent<boolean>).detail === true))
