// The Sound section of the Settings tab, as plain data and functions: which controls it lists, how a 0..1 level is shown, and what a
// change of one control does to the stored preferences. Pure, so it is tested without a browser. The values live in src/audio/settings.ts.
import type { SoundSettings } from '../../../audio/settings.ts'

export type SoundSwitchId = 'on' | 'quiet' | 'musicOn'
export type SoundSliderId = 'master' | 'effects' | 'ambience' | 'calls' | 'music'
export const SOUND_SWITCHES: readonly { id: SoundSwitchId; label: string; hint: string }[] = [
  { id: 'on', label: 'Sound', hint: 'Everything the game plays. The speaker in the top bar does the same in one tap.' },
  { id: 'musicOn', label: 'Music on', hint: 'Original instrumental tunes for each place.' },
  { id: 'quiet', label: 'Quiet', hint: 'No background ambience, with softer music and effects. For buses and waiting rooms.' },
]
export const SOUND_SLIDERS: readonly { id: SoundSliderId; label: string; hint: string }[] = [
  { id: 'master', label: 'Volume', hint: 'Over everything.' },
  { id: 'effects', label: 'Effects', hint: 'Taps, coins, footsteps, doors, meals and rides.' },
  { id: 'ambience', label: 'Ambience', hint: 'The sound of the place you are in, and the weather.' },
  { id: 'music', label: 'Music', hint: 'Background tunes, kept below voices. Venue music follows Ambience.' },
  { id: 'calls', label: 'Call sounds', hint: 'Ringing and call tones.' },
]
export const VOICE_CHOICES: readonly { id: SoundSettings['voices']; label: string }[] = [
  { id: 'off', label: 'Off' }, { id: 'sounds', label: 'Sounds' }, { id: 'speech', label: 'Speech' },
]
export const VOICES_HINT = 'People in a place make soft talk sounds as their words appear. Speech reads the nearest line aloud with a voice already on your device, where it has one; it stays off in Quiet.'
/** What picking one of the spoken-voice choices stores. */
export const voicesChange = (value: string): Partial<SoundSettings> => ({ voices: value === 'off' || value === 'speech' ? value : 'sounds' })
export const SOUND_NOT_SAVED = 'This browser would not save the sound settings, so they last only until you close the tab.'

/** A 0..1 level as the whole percent shown beside a slider. */
export const percent = (level: number): number => Math.round(Math.min(1, Math.max(0, level)) * 100)
/** A slider's 0..100 value as a level. */
export const levelOf = (value: number | string): number => {
  const n = Number(value)
  return Number.isFinite(n) ? Math.min(1, Math.max(0, Math.round(n) / 100)) : 0
}
/** What changing one control stores. */
export function change(id: SoundSwitchId | SoundSliderId, value: boolean | number | string): Partial<SoundSettings> {
  if (id === 'on' || id === 'quiet' || id === 'musicOn') return { [id]: value === true }
  return { [id]: levelOf(value as number | string) }
}
/** The one-line state of the section: what the player hears right now. */
export function soundSummary(s: SoundSettings): string {
  if (!s.on) return 'Muted'
  if (s.master === 0) return 'Volume is at zero'
  return s.quiet ? 'On · quiet' : 'On'
}
