/**
 * OWNER: minigames (docs/MINI-GAMES.md)
 * THE SKIT: what a person composes in the skit studio, and how it plays out over time. A skit has up to four actors (the person and up to three friends), a
 * title, a backdrop and a few beats; a beat gives every actor a pose and may carry one caption line. The recording is a title card, the beats in turn and an end
 * card, 15 or 30 seconds in all. Poses are the game's own (src/models/people POSES). Nothing here records sound: a skit is poses and captions, and the studio
 * says so. Pure: no page, no clock, no network. The page draws it (src/app/features/minigames/skitDraw.ts) and Capture marks it.
 */

/** The game's own poses, in the order the picker shows them. */
export const POSES = ['stand', 'wave', 'dance', 'sit', 'work', 'eat', 'phone', 'relax', 'walk', 'jog'] as const
export type SkitPose = typeof POSES[number]
export const POSE_LABELS: Readonly<Record<SkitPose, string>> = Object.freeze({ stand: 'Stand', wave: 'Wave', dance: 'Dance', sit: 'Sit', work: 'Work', eat: 'Eat', phone: 'On the phone', relax: 'Relax', walk: 'Walk', jog: 'Jog' })

export const BACKDROPS = Object.freeze([
  { id: 'home', label: 'My home', sky: ['#f6e7c8', '#e9c98f'], floor: '#8b5e3c' },
  { id: 'street', label: 'The street', sky: ['#7ec8f5', '#d8efff'], floor: '#555b61' },
  { id: 'market', label: 'The market', sky: ['#ffd27a', '#ff9d4a'], floor: '#9a6b3a' },
  { id: 'rooftop', label: 'A rooftop at dusk', sky: ['#3a2a6b', '#f08a5d'], floor: '#2c2c34' },
  { id: 'stage', label: 'A stage', sky: ['#14081f', '#4a1d6b'], floor: '#2b1740' },
  { id: 'beach', label: 'The beach', sky: ['#7fd1f5', '#fff1c1'], floor: '#e8cf96' },
] as const)
export type BackdropId = typeof BACKDROPS[number]['id']

export const LENGTHS = [15_000, 30_000] as const
export type SkitLength = typeof LENGTHS[number]
export const TITLE_MS = 2500, END_MS = 2000, MIN_BEAT_MS = 2000, MAX_ACTORS = 4, MAX_BEATS = 6
export const TITLE_MAX = 40, CAPTION_MAX = 80
/** The recording stops this long before the capture limit, so the clip always ends on the end card rather than on the cap. */
export const SAFETY_MS = 200

export interface SkitActor { id: string; name: string; you: boolean }
export interface SkitBeat { poses: SkitPose[]; caption: string }
export interface Skit { title: string; backdrop: BackdropId; lengthMs: SkitLength; actors: SkitActor[]; beats: SkitBeat[] }

/** Most beats a length can hold: every beat gets at least MIN_BEAT_MS. */
export const maxBeats = (lengthMs: number): number => Math.max(1, Math.min(MAX_BEATS, Math.floor((lengthMs - TITLE_MS - END_MS) / MIN_BEAT_MS)))
export const beatMs = (skit: Pick<Skit, 'lengthMs' | 'beats'>): number => (skit.lengthMs - TITLE_MS - END_MS) / Math.max(1, skit.beats.length)
/** How long the recording runs: the length, less the safety margin. */
export const recordMs = (skit: Pick<Skit, 'lengthMs'>): number => skit.lengthMs - SAFETY_MS

const POSE_SET: ReadonlySet<string> = new Set(POSES)
export const isPose = (value: unknown): value is SkitPose => typeof value === 'string' && POSE_SET.has(value)
const tidy = (value: unknown, max: number): string => (typeof value === 'string' ? value.replace(/[\u0000-\u001f\u007f]/g, ' ').replace(/\s+/g, ' ').trim().slice(0, max) : '')

/** A new skit: the person alone on a street, one beat, standing. */
export function newSkit(you: { id: string; name: string }): Skit {
  return { title: '', backdrop: 'street', lengthMs: 30_000, actors: [{ id: you.id, name: tidy(you.name, 24) || 'Me', you: true }], beats: [{ poses: ['stand'], caption: '' }, { poses: ['wave'], caption: '' }] }
}

/** The skit made safe to play: bounded sizes, known poses and backdrop, every beat with one pose per actor, the person first. Null when it cannot be made safe. */
export function sanitize(input: unknown): Skit | null {
  if (input === null || typeof input !== 'object') return null
  const raw = input as Record<string, unknown>
  const actors: SkitActor[] = []
  for (const entry of Array.isArray(raw.actors) ? raw.actors.slice(0, 4 * MAX_ACTORS) : []) {
    if (actors.length >= MAX_ACTORS) break
    const item = entry as Record<string, unknown> | null
    if (!item || typeof item.id !== 'string' || !item.id || actors.some((actor) => actor.id === item.id)) continue
    actors.push({ id: item.id.slice(0, 64), name: tidy(item.name, 24) || 'Friend', you: item.you === true && !actors.some((actor) => actor.you) })
  }
  if (!actors.length || !actors.some((actor) => actor.you)) return null
  actors.sort((a, b) => Number(b.you) - Number(a.you))
  const lengthMs: SkitLength = raw.lengthMs === 15_000 ? 15_000 : 30_000
  const beats: SkitBeat[] = []
  for (const entry of Array.isArray(raw.beats) ? raw.beats.slice(0, maxBeats(lengthMs)) : []) {
    const item = entry as Record<string, unknown> | null
    const poses = actors.map((_, at) => { const pose = Array.isArray(item?.poses) ? item.poses[at] : undefined; return isPose(pose) ? pose : 'stand' })
    beats.push({ poses, caption: tidy(item?.caption, CAPTION_MAX) })
  }
  if (!beats.length) return null
  const backdrop = BACKDROPS.find((entry) => entry.id === raw.backdrop)?.id ?? 'street'
  return { title: tidy(raw.title, TITLE_MAX), backdrop, lengthMs, actors, beats }
}

// ---- editing (each returns a new skit that still obeys the rules above) ----------------------------------------------------------------

export function addActor(skit: Skit, actor: { id: string; name: string }): Skit {
  if (skit.actors.length >= MAX_ACTORS || skit.actors.some((item) => item.id === actor.id)) return skit
  return { ...skit, actors: [...skit.actors, { id: actor.id, name: tidy(actor.name, 24) || 'Friend', you: false }], beats: skit.beats.map((beat) => ({ ...beat, poses: [...beat.poses, 'stand'] })) }
}
export function removeActor(skit: Skit, id: string): Skit {
  const at = skit.actors.findIndex((actor) => actor.id === id && !actor.you)
  return at < 0 ? skit : { ...skit, actors: skit.actors.filter((_, index) => index !== at), beats: skit.beats.map((beat) => ({ ...beat, poses: beat.poses.filter((_, index) => index !== at) })) }
}
export function setPose(skit: Skit, beat: number, actor: number, pose: SkitPose): Skit {
  if (!skit.beats[beat] || actor < 0 || actor >= skit.actors.length || !isPose(pose)) return skit
  return { ...skit, beats: skit.beats.map((item, at) => (at === beat ? { ...item, poses: item.poses.map((old, who) => (who === actor ? pose : old)) } : item)) }
}
export function setCaption(skit: Skit, beat: number, caption: string): Skit {
  return skit.beats[beat] ? { ...skit, beats: skit.beats.map((item, at) => (at === beat ? { ...item, caption: tidy(caption, CAPTION_MAX) } : item)) } : skit
}
export function addBeat(skit: Skit): Skit {
  if (skit.beats.length >= maxBeats(skit.lengthMs)) return skit
  const last = skit.beats.at(-1)
  return { ...skit, beats: [...skit.beats, { poses: last ? [...last.poses] : skit.actors.map(() => 'stand' as SkitPose), caption: '' }] }
}
export function removeBeat(skit: Skit, beat: number): Skit {
  return skit.beats.length <= 1 || !skit.beats[beat] ? skit : { ...skit, beats: skit.beats.filter((_, at) => at !== beat) }
}
/** A shorter length may hold fewer beats: the extra are dropped. */
export function setLength(skit: Skit, lengthMs: SkitLength): Skit {
  return { ...skit, lengthMs, beats: skit.beats.slice(0, maxBeats(lengthMs)) }
}
export const setTitle = (skit: Skit, title: string): Skit => ({ ...skit, title: tidy(title, TITLE_MAX) })

/** Every line of words in the skit that other people will read: what the server's text filter checks. */
export const wordsOf = (skit: Skit): { title: string; captions: string[] } => ({ title: skit.title, captions: skit.beats.map((beat) => beat.caption) })

// ---- playing ------------------------------------------------------------------------------------------------------------------------

export interface SkitFrame {
  phase: 'title' | 'beat' | 'end'
  /** The beat on show (the last one during the end card), and how far through the beat or the card it is (0 to 1). */
  beat: number
  progress: number
  poses: SkitPose[]
  caption: string
}
/** What the skit shows `ms` after it starts. */
export function frameAt(skit: Skit, ms: number): SkitFrame {
  const t = Math.max(0, ms), length = beatMs(skit), body = length * skit.beats.length
  if (t < TITLE_MS) return { phase: 'title', beat: 0, progress: t / TITLE_MS, poses: skit.beats[0]?.poses ?? [], caption: '' }
  if (t >= TITLE_MS + body) return { phase: 'end', beat: skit.beats.length - 1, progress: Math.min(1, (t - TITLE_MS - body) / END_MS), poses: skit.beats.at(-1)?.poses ?? [], caption: '' }
  const at = Math.min(skit.beats.length - 1, Math.floor((t - TITLE_MS) / length)), beat = skit.beats[at]!
  return { phase: 'beat', beat: at, progress: ((t - TITLE_MS) % length) / length, poses: beat.poses, caption: beat.caption }
}

/** A stable shade for an actor, from its id: the figure's clothes. */
export function hueOf(id: string): number {
  let h = 2166136261
  for (const char of id) { h ^= char.charCodeAt(0); h = Math.imul(h, 16777619) }
  return (h >>> 0) % 360
}
