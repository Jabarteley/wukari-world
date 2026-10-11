// The only part of the voices the rest of the game imports: three functions that raise a window event. Nothing happens until the audio
// engine (after the first tap) is listening, and nothing is sent anywhere.
import { VOICE_EVENT, VOICE_SCENE_EVENT, VOICE_STOP_EVENT, type HeardLine, type SceneNote } from './types.ts'

const fire = (type: string, detail?: unknown): void => { try { globalThis.window?.dispatchEvent(new CustomEvent(type, { detail })) } catch { /* no window */ } }
/** A line has appeared in a bubble or a chat in the place the player is in. Never call this for a private message. */
export const heard = (line: HeardLine): void => fire(VOICE_EVENT, line)
/** Who is in the place and what they do. */
export const heardScene = (note: SceneNote): void => fire(VOICE_SCENE_EVENT, note)
/** The scene changed or the voices should stop. */
export const heardStop = (): void => fire(VOICE_STOP_EVENT)
