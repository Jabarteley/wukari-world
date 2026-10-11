// The optional layer of real spoken words: the browser's own speech synthesis, for the nearest speaker's line only. Only a voice that
// runs on the device is used (a voice that sends the text to a server is never picked: nothing here calls out to anyone). Lines queue,
// never overlap, and are dropped when the scene changes or the page is hidden. With no voice at all, every call does nothing and the
// talk sounds carry on alone.
import type { VoiceProfile } from './seed.ts'

export interface VoiceInfo { name: string; lang: string; localService: boolean; default?: boolean }
export interface UtteranceLike {
  text: string; voice: unknown; pitch: number; rate: number; volume: number; lang: string
  onend: (() => void) | null; onerror: (() => void) | null
}
export interface SpeechApi {
  speak(utterance: UtteranceLike): void
  cancel(): void
  getVoices(): VoiceInfo[]
}
export interface SpeechDeps {
  api: SpeechApi | null
  /** A new utterance for a text. */
  utter: (text: string) => UtteranceLike
  hidden: () => boolean
  after: (run: () => void, ms: number) => () => void
  now: () => number
}

/** English locales of Africa, best first for a Nigerian city: a device that offers one reads the lines in its own accent. */
const AFRICAN_ENGLISH = ['en-NG', 'en-GH', 'en-KE', 'en-ZA', 'en-TZ', 'en-ZW', 'en-UG', 'en-ZM', 'en-RW', 'en-NA', 'en-BW', 'en-MU']
const COUNTRY_LOCALE: Readonly<Record<string, string>> = { ng: 'en-NG', gh: 'en-GH', ke: 'en-KE', za: 'en-ZA', tz: 'en-TZ', zw: 'en-ZW', ug: 'en-UG', zm: 'en-ZM', rw: 'en-RW', na: 'en-NA', bw: 'en-BW', mu: 'en-MU' }
/** The language of the lines the game writes. */
export const LINE_LANG = 'en'

const norm = (lang: string): string => lang.replace('_', '-')

/** How well a voice suits a city's lines (0 = not usable). Only local voices in English count. */
export function scoreVoice(voice: VoiceInfo, country: string): number {
  if (!voice.localService) return 0
  const lang = norm(voice.lang)
  if (!/^en(-|$)/i.test(lang)) return 0
  const wanted = COUNTRY_LOCALE[country.toLowerCase()] ?? 'en-NG'
  let score = lang.toLowerCase() === wanted.toLowerCase() ? 100 : AFRICAN_ENGLISH.some(l => l.toLowerCase() === lang.toLowerCase()) ? 80 : /^en-GB$/i.test(lang) ? 50 : /^en-US$/i.test(lang) ? 40 : 30
  if (/natural|enhanced|premium|neural/i.test(voice.name)) score += 5
  if (voice.default) score += 1
  return score
}
/** The best usable voice for a country, or null. */
export function pickVoice<T extends VoiceInfo>(voices: readonly T[], country: string): T | null {
  let best: T | null = null, top = 0
  for (const voice of voices) { const s = scoreVoice(voice, country); if (s > top) { top = s; best = voice } }
  return best
}
/** Pitch and rate for one speaker from the same voice profile the sounds use: men lower, women and youths higher, elders slower. */
export function manner(voice: VoiceProfile): { pitch: number; rate: number } {
  const pitch = Math.max(0.6, Math.min(1.7, 1 + Math.log2(voice.f0 / 150) * 0.9))
  const rate = Math.max(0.8, Math.min(1.25, 0.82 + (voice.speed - 6.5) * 0.09)) * (voice.build === 'elder' ? 0.92 : 1)
  return { pitch, rate }
}

interface Waiting { text: string; profile: VoiceProfile; volume: number; at: number }
/** A queued line older than this is stale and not spoken. */
export const STALE_MS = 9_000
const MAX_WAITING = 1

export class Speech {
  private readonly deps: SpeechDeps
  private waiting: Waiting[] = []
  private speaking = false
  private cancelGuard: (() => void) | null = null
  country = 'ng'
  /** How many lines were handed to the browser (for tests and the measurements). */
  spoken = 0
  constructor(deps: SpeechDeps) { this.deps = deps }

  /** Whether the device has a voice it may use. Voices can arrive late: ask again when the browser says they changed. */
  available(): boolean { const api = this.deps.api; return !!api && pickVoice(this.safeVoices(), this.country) !== null }
  private safeVoices(): VoiceInfo[] { try { return this.deps.api?.getVoices() ?? [] } catch { return [] } }

  /** Queue a line. False when it cannot be spoken (no voice, hidden page): the caller keeps the talk sounds. */
  say(text: string, profile: VoiceProfile, volume: number): boolean {
    if (!this.deps.api || this.deps.hidden() || !text.trim()) return false
    if (!pickVoice(this.safeVoices(), this.country)) return false
    this.waiting.push({ text, profile, volume, at: this.deps.now() })
    while (this.waiting.length > MAX_WAITING + (this.speaking ? 0 : 1)) this.waiting.shift()
    if (!this.speaking) this.next()
    return true
  }
  /** Whether a line is being spoken or waiting. */
  busy(): boolean { return this.speaking || this.waiting.length > 0 }

  private next(): void {
    const api = this.deps.api
    if (!api) return
    if (this.deps.hidden()) { this.waiting = []; return }
    let item = this.waiting.shift()
    while (item && this.deps.now() - item.at > STALE_MS) item = this.waiting.shift()
    if (!item) { this.speaking = false; return }
    const voice = pickVoice(this.safeVoices(), this.country)
    if (!voice) { this.speaking = false; this.waiting = []; return }
    const u = this.deps.utter(item.text), how = manner(item.profile)
    u.voice = voice; u.lang = norm(voice.lang); u.pitch = how.pitch; u.rate = how.rate; u.volume = Math.max(0, Math.min(1, item.volume))
    this.speaking = true
    let finished = false
    const finish = (): void => { if (finished) return; finished = true; this.cancelGuard?.(); this.cancelGuard = null; this.speaking = false; this.next() }
    u.onend = finish; u.onerror = finish
    // Some phones never report the end of a line: move on after a generous time for its length.
    this.cancelGuard = this.deps.after(finish, 1500 + item.text.length * 110 / how.rate)
    try { api.speak(u); this.spoken++ } catch { finish() }
  }

  /** Stop talking and forget what waits (the scene changed, the page was hidden, the setting changed). */
  cancel(): void {
    this.waiting = []
    this.cancelGuard?.(); this.cancelGuard = null
    const was = this.speaking
    this.speaking = false
    if (was || this.deps.api) { try { this.deps.api?.cancel() } catch { /* nothing to cancel */ } }
  }
}

/** The browser's speech synthesis as the layer's API, or null when the page has none. */
export function browserSpeech(): { api: SpeechApi; utter: (text: string) => UtteranceLike; onVoices: (run: () => void) => () => void } | null {
  const synth = (globalThis as { speechSynthesis?: SpeechSynthesis }).speechSynthesis
  const Utter = (globalThis as { SpeechSynthesisUtterance?: typeof SpeechSynthesisUtterance }).SpeechSynthesisUtterance
  if (!synth || !Utter) return null
  return {
    api: {
      speak: u => synth.speak(u as unknown as SpeechSynthesisUtterance),
      cancel: () => synth.cancel(),
      getVoices: () => synth.getVoices() as unknown as VoiceInfo[],
    },
    utter: text => new Utter(text) as unknown as UtteranceLike,
    onVoices: run => { synth.addEventListener?.('voiceschanged', run); return () => synth.removeEventListener?.('voiceschanged', run) },
  }
}
