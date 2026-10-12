// What the "Spoken voices" setting means right now. Pure.
import type { SoundSettings } from '../settings.ts'

export type VoiceSetting = 'off' | 'sounds' | 'speech'
export const VOICE_SETTINGS: readonly VoiceSetting[] = ['off', 'sounds', 'speech']
export interface Mode { sounds: boolean; speech: boolean }

/** Off is silent; Sounds is the talk sounds; Speech adds the browser's spoken words where the device has a voice. Muted sound is silent, and Quiet keeps the spoken words off. */
export function modeOf(settings: Pick<SoundSettings, 'on' | 'quiet' | 'voices' | 'master'>, haveVoices: boolean): Mode {
  if (!settings.on || settings.master === 0 || settings.voices === 'off') return { sounds: false, speech: false }
  return { sounds: true, speech: settings.voices === 'speech' && haveVoices && !settings.quiet }
}
