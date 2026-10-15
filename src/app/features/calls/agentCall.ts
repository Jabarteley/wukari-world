// THE CALL WITH AN AI CHARACTER, as plain logic (the screen is AgentCallScreen.vue; this file has no DOM so it can be tested with fakes).
//
//   start()          asks the server for a call (the day's minutes are checked there); over the limit the character says it will call back and the call is over at once
//   press()          the talk button went down: start listening (stt.ts picks the engine)
//   release()        it came up: the words are made (by the browser or the gateway), sent as text, and the character's answer is spoken on THIS phone
//   say(text)        typed words instead of speech (always possible, and what a phone with no recognition uses)
//   hangup()         ends the call
// NOTHING OF THE CHARACTER'S VOICE CROSSES THE NETWORK: the server answers with text and a voiceSeed; `speak` is the phone's own voice for that seed (src/audio/voice/speech.ts).
// The character is always shown as AI-played, and the game's own help and break lines are shown as the game's, not the character's.
import { begin, readChoice, STT_KEY, tidy } from './stt.ts'
import type { Capture, SttChoice, SttEngine, SttKind } from './stt.ts'

export interface CallApi {
  start(agent: string): Promise<StartAnswer>
  turn(call: string, text: string): Promise<TurnAnswer>
  end(call: string): Promise<void>
}
export interface StartAnswer { call?: string; name: string; voiceSeed: number; leftSeconds?: number; over?: 'player' | 'total'; text?: string; stt?: { default: SttKind; gateway: boolean }; breakMinutes?: number }
export interface TurnAnswer { said: string; text: string; voiceSeed: number; leftSeconds: number; over?: 'player' | 'total'; breakText?: string; help?: boolean }
export type Phase = 'idle' | 'starting' | 'ready' | 'listening' | 'thinking' | 'speaking' | 'over' | 'ended' | 'error'
export interface Line { who: 'you' | 'agent' | 'game'; text: string }
export interface View {
  phase: Phase
  name: string
  lines: Line[]
  /** Words heard so far while the button is held. */
  partial: string
  leftSeconds: number | null
  /** Which engine the last (or next) recording uses, for the line under the button. */
  stt: SttKind | null
  /** The person has no way to speak (no recognition, no recorder, or both failed): typing only. */
  typeOnly: boolean
  /** The character's voice could not be played on this phone: the words are shown instead. */
  silent: boolean
  /** A short plain sentence for something that went wrong, or null. */
  problem: string | null
  /** How long the last recognition took after the button was released, in ms (null before the first). */
  delay: number | null
}
export interface Deps {
  api: CallApi
  engines: readonly SttEngine[]
  /** Speak a line in the voice for this seed; false when the phone has no voice (the words are shown). Resolves when done or at once when it cannot. */
  speak(text: string, seed: number): boolean
  stopSpeaking(): void
  storage?: { get(key: string): string | null; set(key: string, value: string): void }
  /** Fires while the call is on (the music fades: jaw:call-active). */
  active?(on: boolean): void
  now?: () => number
}

const WORDS = {
  denied: 'The microphone is blocked. Allow it in your browser settings, or type instead.',
  nothing: 'I did not catch that. Hold the button and try again, or type.',
  failed: 'That did not come through. Try again, or type.',
  gone: 'The call has ended.',
  offline: 'Could not connect. Check your network and try again.',
} as const

export function createAgentCall(deps: Deps) {
  const now = deps.now ?? Date.now
  const state: View = { phase: 'idle', name: '', lines: [], partial: '', leftSeconds: null, stt: null, typeOnly: false, silent: false, problem: null, delay: null }
  let call = '', agent = '', serverDefault: SttKind = 'browser', capture: Capture | null = null, kind: SttKind | null = null, down = 0
  const failed = new Set<SttKind>(), off = new Set<SttKind>()
  const listeners = new Set<(view: View) => void>()
  const emit = (): void => { const copy: View = { ...state, lines: state.lines.map((line) => ({ ...line })) }; for (const run of listeners) run(copy) }
  const set = (patch: Partial<View>): void => { Object.assign(state, patch); emit() }
  const choice = (): SttChoice => readChoice(deps.storage?.get(STT_KEY))
  const usable = (): SttEngine[] => deps.engines.filter((engine) => !failed.has(engine.kind) && !off.has(engine.kind))
  const add = (who: Line['who'], text: string): void => { state.lines.push({ who, text }); if (state.lines.length > 40) state.lines.shift() }
  const show = (engines: readonly SttEngine[]): void => { state.typeOnly = !engines.some((engine) => engine.available()) }

  /** The character's words, shown and spoken; resolves when it has been said. */
  function hear(text: string, seed: number): void {
    add('agent', text)
    const spoken = deps.speak(text, seed)
    set({ silent: !spoken })
  }

  async function start(id: string): Promise<void> {
    if (state.phase !== 'idle') return
    agent = id
    set({ phase: 'starting', problem: null }); deps.active?.(true)
    let answer: StartAnswer
    try { answer = await deps.api.start(id) } catch (error) {
      deps.active?.(false)
      set({ phase: 'error', problem: error instanceof Error && error.message ? error.message : WORDS.offline }); return
    }
    serverDefault = answer.stt?.default ?? 'browser'
    // Gateway transcription is off on this server: only the browser's own recognition is offered.
    if (answer.stt && !answer.stt.gateway) off.add('gateway')
    show(usable())
    set({ name: answer.name, leftSeconds: answer.leftSeconds ?? null })
    if (answer.over || !answer.call) {
      hear(answer.text ?? 'I will call you back tomorrow.', answer.voiceSeed)
      set({ phase: 'over' }); deps.active?.(false); return
    }
    call = answer.call
    set({ phase: 'ready' })
  }

  async function press(): Promise<void> {
    if (state.phase !== 'ready') return
    deps.stopSpeaking()
    set({ phase: 'listening', partial: '', problem: null })
    down = now()
    let got: Awaited<ReturnType<typeof begin>>
    try { got = await begin(usable(), choice(), serverDefault) } catch (error) {
      set({ phase: 'ready', problem: error instanceof Error && error.message === 'denied' ? WORDS.denied : WORDS.failed }); return
    }
    if (!got) { set({ phase: 'ready', typeOnly: true, problem: 'This phone cannot turn speech into words here. Type instead.' }); return }
    // The button came up while the microphone was still opening: stop at once.
    if ((state.phase as Phase) !== 'listening') { got.capture.cancel(); return }
    capture = got.capture; kind = got.kind
    set({ stt: got.kind })
    const watch = (): void => { if (capture === got!.capture && state.phase === 'listening') { set({ partial: capture.partial?.() ?? '' }); setTimeout(watch, 250) } }
    if (capture.partial) watch()
  }

  async function release(): Promise<void> {
    if (state.phase === 'listening' && !capture) { set({ phase: 'ready' }); return }
    if (state.phase !== 'listening' || !capture) return
    const active = capture, used = kind
    capture = null
    set({ phase: 'thinking', partial: '' })
    // A tap that was too short to be speech.
    if (now() - down < 250) { active.cancel(); set({ phase: 'ready', problem: WORDS.nothing }); return }
    let words = ''
    try {
      const heard = await active.stop()
      words = tidy(heard.text)
      set({ delay: heard.ms })
    } catch (error) {
      if (error instanceof Error && error.message === 'denied') { set({ phase: 'ready', problem: WORDS.denied }); return }
      // This way failed: the next press uses the other one, when there is one.
      if (used) failed.add(used)
      show(usable())
      set({ phase: 'ready', problem: error instanceof Error && error.message && error.message !== 'unavailable' && !/^[a-z-]+$/.test(error.message) ? error.message : WORDS.failed })
      return
    }
    if (!words) { set({ phase: 'ready', problem: WORDS.nothing }); return }
    await send(words)
  }

  async function send(words: string): Promise<void> {
    set({ phase: 'thinking', problem: null })
    let answer: TurnAnswer
    try { answer = await deps.api.turn(call, words) } catch (error) {
      const message = error instanceof Error ? error.message : ''
      if (message === WORDS.gone) { set({ phase: 'ended', problem: WORDS.gone }); deps.active?.(false); return }
      set({ phase: 'ready', problem: message || WORDS.failed }); return
    }
    add('you', answer.said || words)
    if (answer.help) add('game', answer.text); else hear(answer.text, answer.voiceSeed)
    if (answer.breakText) add('game', answer.breakText)
    set({ leftSeconds: answer.leftSeconds })
    if (answer.over) { set({ phase: 'over' }); deps.active?.(false); return }
    set({ phase: 'ready' })
  }

  /** Typed words. */
  async function say(text: string): Promise<void> {
    const words = tidy(text)
    if (!words || (state.phase !== 'ready' && state.phase !== 'listening')) return
    if (state.phase === 'listening') { capture?.cancel(); capture = null }
    deps.stopSpeaking()
    await send(words)
  }

  async function hangup(): Promise<void> {
    capture?.cancel(); capture = null
    deps.stopSpeaking()
    const was = call
    call = ''
    if (state.phase !== 'ended' && state.phase !== 'over' && state.phase !== 'error') deps.active?.(false)
    set({ phase: 'ended', partial: '' })
    if (was) { try { await deps.api.end(was) } catch { /* the server drops an idle call by itself */ } }
  }

  return {
    start, press, release, say, hangup,
    view: (): View => ({ ...state, lines: state.lines.map((line) => ({ ...line })) }),
    subscribe(run: (view: View) => void): () => void { listeners.add(run); return () => { listeners.delete(run) } },
    agent: (): string => agent,
    setChoice(next: SttChoice): void { deps.storage?.set(STT_KEY, next); failed.clear(); if (state.phase !== 'idle') show(usable()); emit() },
    choice,
  }
}
export type AgentCall = ReturnType<typeof createAgentCall>
