// The Worlds app without a DOM (docs/WORLDS.md): the words and colours of its cards and form, the link it sends.
import { WORLD_GROUNDS, WORLD_OPEN, WORLD_SIZES, WORLD_SKIES, WORLDS, worldLinkPath, type WorldGround, type WorldOpen, type WorldSize, type WorldSky } from '../../../spaces/worlds.ts'
import { WORLD_TEMPLATES, type WorldTemplate } from '../../../spaces/world-templates.ts'
import type { WorldCard } from '../spaces/spacesClient.ts'

export { WORLD_GROUNDS, WORLD_OPEN, WORLD_SIZES, WORLD_SKIES, WORLDS }

/** The colour a world's card shows before it has a cover: its ground. */
const TINTS: Readonly<Record<WorldGround, string>> = { grass: '#6f9a4a', sand: '#d9c38f', stone: '#9aa0a6', snow: '#e6edf3', island: '#3f9cc4', night: '#263a4a' }
export const groundTint = (ground: string): string => TINTS[ground as WorldGround] ?? TINTS.grass
const SKY_TINTS: Readonly<Record<WorldSky, string>> = { day: '#a9c7de', sunset: '#f2a65a', night: '#141b2b' }
export const skyTint = (sky: string): string => SKY_TINTS[sky as WorldSky] ?? SKY_TINTS.day

/** The form's choices, as rows of chips. */
export const sizeChoices = (): { id: WorldSize; label: string; line: string }[] => (Object.keys(WORLD_SIZES) as WorldSize[]).map((id) => ({ id, label: WORLD_SIZES[id].label, line: WORLD_SIZES[id].line }))
export const groundChoices = (): { id: WorldGround; label: string }[] => (Object.keys(WORLD_GROUNDS) as WorldGround[]).filter((id) => !('hidden' in WORLD_GROUNDS[id])).map((id) => ({ id, label: WORLD_GROUNDS[id].label }))
export const skyChoices = (): { id: WorldSky; label: string }[] => (Object.keys(WORLD_SKIES) as WorldSky[]).map((id) => ({ id, label: WORLD_SKIES[id].label }))
export const openChoices = (): { id: WorldOpen; label: string; line: string }[] => (Object.keys(WORLD_OPEN) as WorldOpen[]).map((id) => ({ id, label: WORLD_OPEN[id].label, line: WORLD_OPEN[id].line }))
export const templateChoices = (): { id: WorldTemplate; label: string; line: string }[] => (Object.keys(WORLD_TEMPLATES) as WorldTemplate[]).map((id) => ({ id, label: WORLD_TEMPLATES[id].label, line: WORLD_TEMPLATES[id].line }))

/** A fresh form, or one filled from a world being changed. */
export interface WorldForm { name: string; blurb: string; size: WorldSize; ground: WorldGround; open: WorldOpen; sky: WorldSky; template: WorldTemplate; game: string }
export const emptyForm = (): WorldForm => ({ name: '', blurb: '', size: 'small', ground: 'grass', open: 'link', sky: 'day', template: 'empty', game: '' })
export const formOf = (world: WorldCard): WorldForm => ({
  name: world.name, blurb: world.blurb,
  size: (world.size in WORLD_SIZES ? world.size : 'small') as WorldSize,
  ground: (world.ground in WORLD_GROUNDS ? world.ground : 'grass') as WorldGround,
  open: (world.open in WORLD_OPEN ? world.open : 'link') as WorldOpen,
  sky: (world.sky in WORLD_SKIES ? world.sky : 'day') as WorldSky,
  template: 'empty', game: world.game?.id ?? '',
})
/** The ground a starter brings when the player has not picked one (an island is sand by the sea). */
export const groundForTemplate = (template: WorldTemplate, ground: WorldGround): WorldGround => (template === 'island' ? 'island' : ground)

/** Why "Make a world" is off, or null. */
export function makeWhy(connected: boolean, on: boolean, mine: number, limit: number): string | null {
  if (!connected) return 'Making a world needs the server.'
  if (!on) return 'Worlds are not switched on here yet.'
  if (mine >= limit) return `You have ${limit} worlds, the most you can keep. Delete one to make another.`
  return null
}

/** The line a world's card shows under its name. */
export function cardLine(world: WorldCard): string {
  const open = world.open === 'everyone' ? 'open to everyone' : world.open === 'friends' ? 'friends only' : 'by link'
  const who = world.mine ? `Yours · ${open}` : world.builder ? `You build with ${world.by.name}` : `By ${world.by.name}`
  const size = WORLD_SIZES[world.size as WorldSize]?.label.toLowerCase() ?? ''
  const tail = world.here > 0 ? `${world.here} here now` : world.visits > 0 ? `${world.visits.toLocaleString('en')} visit${world.visits === 1 ? '' : 's'}` : size
  return tail ? `${who} · ${tail}` : who
}
/** The like button's words. */
export const likeLabel = (world: Pick<WorldCard, 'likes' | 'liked'>): string => `${world.liked ? '♥' : '♡'} ${world.likes.toLocaleString('en')}`

/** The link a world is sent as. */
export const worldUrl = (origin: string, id: string): string => `${origin}${worldLinkPath(id)}`
