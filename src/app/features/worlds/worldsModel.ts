// The Worlds app without a DOM (docs/WORLDS.md): the words and colours of its cards and form, the link it sends.
import { WORLD_GROUNDS, WORLD_OPEN, WORLD_SIZES, WORLDS, worldLinkPath, type WorldGround, type WorldOpen, type WorldSize } from '../../../spaces/worlds.ts'
import type { WorldCard } from '../spaces/spacesClient.ts'

export { WORLD_GROUNDS, WORLD_OPEN, WORLD_SIZES, WORLDS }

/** The colour a world's card shows before it has a cover: its ground. */
const TINTS: Readonly<Record<WorldGround, string>> = { grass: '#6f9a4a', sand: '#d9c38f', stone: '#9aa0a6', snow: '#e6edf3', night: '#263a4a' }
export const groundTint = (ground: string): string => TINTS[ground as WorldGround] ?? TINTS.grass

/** The form's choices, as rows of chips. */
export const sizeChoices = (): { id: WorldSize; label: string; line: string }[] => (Object.keys(WORLD_SIZES) as WorldSize[]).map((id) => ({ id, label: WORLD_SIZES[id].label, line: WORLD_SIZES[id].line }))
export const groundChoices = (): { id: WorldGround; label: string }[] => (Object.keys(WORLD_GROUNDS) as WorldGround[]).map((id) => ({ id, label: WORLD_GROUNDS[id].label }))
export const openChoices = (): { id: WorldOpen; label: string; line: string }[] => (Object.keys(WORLD_OPEN) as WorldOpen[]).map((id) => ({ id, label: WORLD_OPEN[id].label, line: WORLD_OPEN[id].line }))

/** A fresh form, or one filled from a world being changed. */
export interface WorldForm { name: string; blurb: string; size: WorldSize; ground: WorldGround; open: WorldOpen }
export const emptyForm = (): WorldForm => ({ name: '', blurb: '', size: 'small', ground: 'grass', open: 'link' })
export const formOf = (world: WorldCard): WorldForm => ({ name: world.name, blurb: world.blurb, size: (world.size in WORLD_SIZES ? world.size : 'small') as WorldSize, ground: (world.ground in WORLD_GROUNDS ? world.ground : 'grass') as WorldGround, open: (world.open in WORLD_OPEN ? world.open : 'link') as WorldOpen })

/** Why "Make a world" is off, or null. */
export function makeWhy(connected: boolean, on: boolean, mine: number, limit: number): string | null {
  if (!connected) return 'Making a world needs the server.'
  if (!on) return 'Worlds are not switched on here yet.'
  if (mine >= limit) return `You have ${limit} worlds, the most you can keep. Delete one to make another.`
  return null
}

/** The line a world's card shows under its name. */
export function cardLine(world: WorldCard): string {
  const who = world.mine ? (world.open === 'everyone' ? 'Yours · open to everyone' : 'Yours · by link') : `By ${world.by.name}`
  const size = WORLD_SIZES[world.size as WorldSize]?.label.toLowerCase() ?? ''
  const tail = world.here > 0 ? `${world.here} here now` : world.visits > 0 ? `${world.visits.toLocaleString('en')} visit${world.visits === 1 ? '' : 's'}` : size
  return tail ? `${who} · ${tail}` : who
}

/** The link a world is sent as. */
export const worldUrl = (origin: string, id: string): string => `${origin}${worldLinkPath(id)}`
