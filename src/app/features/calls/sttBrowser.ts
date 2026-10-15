// The two real speech-to-text engines (stt.ts) on a phone. Loaded lazily with the call screen; nothing here runs until the person holds the talk button.
import type { Capture, SttEngine } from './stt.ts'
import { WAV_RATE, encodeWav, mixDown, resample, toBase64 } from './wav.ts'

/** The longest hold: the transcription route takes 20 seconds, the screen stops the recording a little before. */
export const MAX_HOLD_MS = 15000

interface Recognition {
  lang: string; interimResults: boolean; continuous: boolean; maxAlternatives: number
  onresult: ((event: { resultIndex: number; results: ArrayLike<ArrayLike<{ transcript: string }> & { isFinal: boolean }> }) => void) | null
  onerror: ((event: { error?: string }) => void) | null
  onend: (() => void) | null
  start(): void; stop(): void; abort(): void
}
type RecognitionCtor = new () => Recognition
const recognitionCtor = (): RecognitionCtor | null => {
  const scope = globalThis as unknown as { SpeechRecognition?: RecognitionCtor; webkitSpeechRecognition?: RecognitionCtor }
  return scope.SpeechRecognition ?? scope.webkitSpeechRecognition ?? null
}

/** The browser's own recognition. `lang` is a BCP 47 tag; en-NG is Nigerian English, which Chrome and Android offer. */
export function browserEngine(lang = 'en-NG'): SttEngine {
  return {
    kind: 'browser',
    available: () => recognitionCtor() !== null,
    async begin(): Promise<Capture> {
      const Ctor = recognitionCtor()
      if (!Ctor) throw new Error('unavailable')
      const rec = new Ctor()
      rec.lang = lang; rec.interimResults = true; rec.continuous = false; rec.maxAlternatives = 1
      let final = '', interim = '', ended = false, failure: string | null = null, release = 0
      let finish: () => void = () => {}
      const done = new Promise<void>((resolve) => { finish = resolve })
      rec.onresult = (event) => {
        interim = ''
        for (let i = event.resultIndex; i < event.results.length; i++) {
          const piece = event.results[i]![0]?.transcript ?? ''
          if (event.results[i]!.isFinal) final += `${piece} `; else interim += piece
        }
      }
      rec.onerror = (event) => { failure = event.error ?? 'error'; ended = true; finish() }
      rec.onend = () => { ended = true; finish() }
      rec.start()
      return {
        partial: () => `${final} ${interim}`.trim(),
        async stop() {
          release = Date.now()
          if (!ended) { try { rec.stop() } catch { /* already over */ } }
          await Promise.race([done, new Promise<void>((resolve) => setTimeout(resolve, 4000))])
          if (failure === 'not-allowed' || failure === 'service-not-allowed') throw new Error('denied')
          if (failure && failure !== 'no-speech' && failure !== 'aborted') throw new Error(failure)
          return { text: `${final} ${interim}`.trim(), ms: Date.now() - release, kind: 'browser' }
        },
        cancel() { ended = true; try { rec.abort() } catch { /* already over */ } },
      }
    },
  }
}

export interface GatewayApi { transcribe(audioBase64: string, mediaType: string): Promise<string> }

/** A short recording passed to our server for the gateway's transcription model. Needs a recorder and a way to decode what it recorded. */
export function gatewayEngine(api: GatewayApi): SttEngine {
  const supported = (): boolean => typeof navigator !== 'undefined' && Boolean(navigator.mediaDevices?.getUserMedia) && typeof MediaRecorder !== 'undefined'
  return {
    kind: 'gateway',
    available: supported,
    async begin(): Promise<Capture> {
      let stream: MediaStream
      try { stream = await navigator.mediaDevices.getUserMedia({ audio: { channelCount: 1, echoCancellation: true, noiseSuppression: true } }) } catch { throw new Error('denied') }
      const recorder = new MediaRecorder(stream), chunks: Blob[] = []
      recorder.ondataavailable = (event) => { if (event.data.size > 0) chunks.push(event.data) }
      const closed = new Promise<void>((resolve) => { recorder.onstop = () => resolve() })
      const off = (): void => { for (const track of stream.getTracks()) track.stop() }
      recorder.start()
      return {
        async stop() {
          const release = Date.now()
          if (recorder.state !== 'inactive') recorder.stop()
          await closed; off()
          const blob = new Blob(chunks, { type: recorder.mimeType || 'audio/webm' })
          if (blob.size < 200) return { text: '', ms: Date.now() - release, kind: 'gateway' }
          const Audio = (globalThis as unknown as { AudioContext?: typeof AudioContext; webkitAudioContext?: typeof AudioContext })
          const Context = Audio.AudioContext ?? Audio.webkitAudioContext
          if (!Context) throw new Error('unavailable')
          const context = new Context()
          try {
            const decoded = await context.decodeAudioData(await blob.arrayBuffer())
            const channels = Array.from({ length: decoded.numberOfChannels }, (_, n) => decoded.getChannelData(n))
            const wav = encodeWav(resample(mixDown(channels), decoded.sampleRate, WAV_RATE), WAV_RATE)
            const text = await api.transcribe(toBase64(wav), 'audio/wav')
            return { text, ms: Date.now() - release, kind: 'gateway' }
          } finally { void context.close().catch(() => {}) }
        },
        cancel() { try { if (recorder.state !== 'inactive') recorder.stop() } catch { /* over */ } off() },
      }
    },
  }
}
