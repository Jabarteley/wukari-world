// SPEECH TO TEXT BEHIND ONE INTERFACE. Two ways to turn a held-button recording into words, and the page does not care which:
//   'browser'  the browser's own recognition (Web Speech API). Free and it streams words while you speak, but on most phones the browser sends the audio to its maker to do it.
//   'gateway'  a short recording sent to our server, which passes it to a transcription model under the model budget and keeps nothing (server/models/transcribe.ts).
// WHICH ONE: the person's choice ('auto' follows the server's default, which is the winner of the measurements in docs/CALLS.md), and where the chosen one does not exist
// (some browsers have no recognition) or fails to start, the other one. The real engines are in sttBrowser.ts; this file is pure so the switching can be tested with fakes.

export type SttKind = 'browser' | 'gateway'
export type SttChoice = 'auto' | SttKind
export interface Heard { text: string; /** Milliseconds from the button being released to the words arriving. */ ms: number; kind: SttKind }
export interface Capture {
  /** The button was released: the words said. Rejects when the engine failed. */
  stop(): Promise<Heard>
  /** Throw the recording away. */
  cancel(): void
  /** Words heard so far, while the button is held (the browser's engine only). */
  partial?: () => string
}
export interface SttEngine {
  kind: SttKind
  available(): boolean
  /** Start listening. Rejects with an Error whose message is 'denied' (microphone refused), 'unavailable' or another short reason. */
  begin(): Promise<Capture>
}

export const STT_KEY = 'allworld:agent-call-stt'
const CHOICES: readonly SttChoice[] = ['auto', 'browser', 'gateway']
export const readChoice = (raw: unknown): SttChoice => (CHOICES.includes(raw as SttChoice) ? raw as SttChoice : 'auto')

/** The engines in the order to try: the chosen one first ('auto': the server's default), then the other. */
export function order(choice: SttChoice, serverDefault: SttKind): SttKind[] {
  const first: SttKind = choice === 'auto' ? serverDefault : choice
  return [first, first === 'browser' ? 'gateway' : 'browser']
}

export interface Picked { engine: SttEngine; /** The first choice was not available, so this is the other one. */ fellBack: boolean }
/** The first available engine in order, or null when there is none (then the page offers typing). */
export function pick(engines: readonly SttEngine[], choice: SttChoice, serverDefault: SttKind): Picked | null {
  const wanted = order(choice, serverDefault)
  for (const kind of wanted) {
    const engine = engines.find((item) => item.kind === kind && item.available())
    if (engine) return { engine, fellBack: kind !== wanted[0] }
  }
  return null
}

/** Begin listening with the best engine; one that refuses to start for any reason but the person's own 'denied' hands over to the other. */
export async function begin(engines: readonly SttEngine[], choice: SttChoice, serverDefault: SttKind): Promise<{ capture: Capture; kind: SttKind; fellBack: boolean } | null> {
  const wanted = order(choice, serverDefault)
  let fellBack = false
  for (const kind of wanted) {
    const engine = engines.find((item) => item.kind === kind && item.available())
    if (!engine) { if (kind === wanted[0]) fellBack = true; continue }
    try { return { capture: await engine.begin(), kind, fellBack } } catch (error) {
      if (error instanceof Error && error.message === 'denied') throw error
      fellBack = true
    }
  }
  return null
}

/** Words as they should be sent: one line, trimmed, at most 300 characters. */
export const tidy = (text: string): string => text.replace(/\s+/g, ' ').trim().slice(0, 300)
