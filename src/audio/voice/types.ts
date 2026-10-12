// What the game tells the voices, as plain data on three window events, so the scene, the chat and the audio engine never import each other.
import type { Build } from './seed.ts'

/** The kinds of speaker a line can come from. `self` is the player's own companion or agent. */
export type SpeakerKind = 'npc' | 'regular' | 'player' | 'agent' | 'companion' | 'greeting'
/** `jaw:voice`: a line has just appeared (a bubble over someone, a venue chat line, a regular's greeting, the companion). */
export interface HeardLine {
  /** Who: a regular's `npc:<id>`, a person's public id, `companion`. Used for the seed when none is given. */
  id: string
  text: string
  kind?: SpeakerKind
  /** The voice seed the server put on the public view, when it has. */
  seed?: string
  /** A hint about the speaker's build (an elder regular), else the seed decides. */
  build?: Build
  /** Where they stand in scene units (the listener's own position comes from the avatar events), when known. */
  x?: number
  z?: number
  /** Their screen position, -1 (left) .. 1 (right), when a bubble knows it. */
  screenX?: number
  /** The city's country id, for the choice of an accent when the device speaks. */
  country?: string
  /** A reply to a line just heard (a pair talking): may bring a laugh. */
  reply?: boolean
  /** The scene kind, for the goal cheer at a viewing centre. */
  place?: string
}
/** `jaw:voice-scene`: who is in the place and what they are doing, every few seconds. */
export interface SceneNote { kind: string; country?: string; people: { id: string; role: string; x: number; z: number; sitting: boolean }[] }
export const VOICE_EVENT = 'jaw:voice'
export const VOICE_SCENE_EVENT = 'jaw:voice-scene'
export const VOICE_STOP_EVENT = 'jaw:voice-stop'
