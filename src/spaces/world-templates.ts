/**
 * OWNER: spaces
 * STARTER WORLDS (docs/WORLDS.md, phase 3): what "Make a world" can begin with. Each is built-in shapes (src/spaces/props.ts), game
 * furniture and a script, laid out for the world's size, so a player has something to play or show at once and changes it from there.
 * Pure: the server applies one when a world is made (server/spaces/worlds.ts); the tests check every one against the space rules.
 */
import { propModel, PROP_OWNER, type PropId } from './props.ts'

export const WORLD_TEMPLATES = Object.freeze({
  empty: { label: 'Empty', line: 'Open ground: build it your way' },
  hangout: { label: 'Hangout', line: 'Sofas, a TV and lights: watch together' },
  treasure: { label: 'Treasure hunt', line: 'Twelve gems hidden: who finds them all?' },
  race: { label: 'Race', line: 'Run to the flag against the clock' },
  obby: { label: 'Obstacle course', line: 'Jump block to block to the top' },
  island: { label: 'Island', line: 'Sand, sea, palms and a ball' },
})
export type WorldTemplate = keyof typeof WORLD_TEMPLATES

export interface TemplatePlacement { k: string; m: string; by: string; hash: string; x: number; y: number; z: number; ry: number; s: number; floor: number; loose?: true }
export interface TemplateItem { itemId: string; x: number; y: number; rot: number }
export interface Template { ground?: string; items: TemplateItem[]; models: TemplatePlacement[]; script?: { code: string; lines: string[] } }

const r2 = (v: number): number => Math.round(v * 100) / 100

/** The finish line both the race and the course use: the walker reaching the flag stops the clock. */
const FINISH = `// Reach the red flag: the clock starts when you arrive and stops at the flag. Line 1 says the time.
const flag = space.find('Flag')
let t0 = -1, done = false
space.on('start', () => space.say(0))
space.on('tick', (dt, t) => {
  if (done || !flag) return
  if (t0 < 0) t0 = t
  // Close to the flag and up at its height (a flag on a block is not reached from the ground under it).
  if (flag.distanceToWalker() < 1.6 && space.walker.y > flag.y - 1.2) {
    done = true
    const s = Math.round((t - t0) * 10) / 10
    space.score(s)
    space.sound('cheer')
    space.say(1, s)
  }
})
`

const HUNT = `// Every Gem is a prize: walk into it. Line 0 counts, line 1 cheers when all are found.
const gems = space.all().filter((g) => g.name.startsWith('Gem'))
let found = 0
space.on('tick', (dt) => {
  for (const g of gems) {
    if (g.y < -1) continue
    g.turnBy(120 * dt)
    if (g.distanceToWalker() > 1.2) continue
    g.hide()
    g.moveTo(g.x, -4, g.z)
    found += 1
    space.score(found)
    space.sound(found === gems.length ? 'cheer' : 'pop')
    space.say(found === gems.length ? 1 : 0, found, gems.length)
  }
})
`

/** A starter laid out for a world `w` metres across. */
export function templateOf(id: WorldTemplate, w: number): Template {
  const c = w / 2, spawnZ = c + Math.min(6, w / 4)
  let n = 0
  const models: TemplatePlacement[] = []
  const put = (prop: PropId, x: number, z: number, over: Partial<TemplatePlacement> = {}): void => {
    models.push({ k: `t${(n++).toString(36)}`, m: propModel(prop), by: PROP_OWNER, hash: '', x: r2(x), y: 0, z: r2(z), ry: 0, s: 1, floor: 0, ...over })
  }
  const ring = (prop: PropId, count: number, radius: number): void => {
    for (let i = 0; i < count; i++) { const a = (i / count) * Math.PI * 2 + 0.3; put(prop, c + Math.cos(a) * radius, c + Math.sin(a) * radius, { ry: (i * 47) % 360 }) }
  }
  if (id === 'hangout') {
    const t = Math.floor(c)
    const items: TemplateItem[] = [
      { itemId: 'centre-rug', x: t - 1, y: t - 1, rot: 0 },
      { itemId: 'flat-tv', x: t - 1, y: t - 4, rot: 0 },
      { itemId: 'family-sofa', x: t - 1, y: t + 2, rot: 0 },
      { itemId: 'lounge-armchair', x: t - 3, y: t - 1, rot: 0 },
      { itemId: 'lounge-armchair', x: t + 2, y: t - 1, rot: 0 },
      { itemId: 'sound-system', x: t + 2, y: t - 4, rot: 0 },
      { itemId: 'potted-plant', x: t - 3, y: t - 4, rot: 0 },
      { itemId: 'standing-lamp', x: t + 3, y: t + 2, rot: 0 },
    ]
    for (const [dx, dz] of [[-5, -5], [5, -5], [-5, 5], [5, 5]] as const) put('lamp', c + dx, c + dz)
    ring('tree', 8, Math.min(c - 2, 10))
    return { items, models }
  }
  if (id === 'treasure') {
    // Twelve gems spread by the golden angle, none within 4 m of where the walker starts (it would sit in front of the camera).
    for (let i = 0, k = 0; i < 12; k++) {
      const a = k * 2.399963, rr = (0.25 + 0.7 * ((k * 0.618034) % 1)) * (c - 2), x = c + Math.cos(a) * rr, z = c + Math.sin(a) * rr
      if (Math.hypot(x - c, z - spawnZ) < 4 && k < 60) continue
      put('gem', x, z, { y: 0.6 })
      i++
    }
    for (let i = 0; i < 6; i++) { const a = i * 1.1 + 0.5, rr = (c - 2) * 0.55; put('crate', c + Math.cos(a) * rr, c + Math.sin(a) * rr, { ry: i * 23 }) }
    ring('tree', 10, c - 1.5)
    return { items: [], models, script: { code: HUNT, lines: ['Found {1} of {2}', 'You found all {1}! Well done.'] } }
  }
  if (id === 'race') {
    const end = 3
    put('arch', c, spawnZ - 2)
    put('flag', c, end)
    const gates = Math.max(2, Math.floor((spawnZ - 2 - end) / 4))
    for (let i = 1; i <= gates; i++) put('cone', c + (i % 2 ? 2.5 : -2.5), spawnZ - 2 - i * ((spawnZ - 2 - end) / (gates + 1)))
    ring('tree', 8, c - 1.5)
    return { items: [], models, script: { code: FINISH, lines: ['Run to the red flag!', 'You made it in {1} seconds!'] } }
  }
  if (id === 'obby') {
    const steps = Math.max(3, Math.min(10, Math.floor((spawnZ - 5) / 2.6)))
    for (let i = 0; i < steps; i++) put('block', c + (i % 2 ? 1.5 : -1.5), spawnZ - 4 - i * 2.6, { y: Math.min(11, -0.5 + i * 0.6) })
    const top = Math.min(11, -0.5 + (steps - 1) * 0.6) + 1
    put('flag', c + ((steps - 1) % 2 ? 1.5 : -1.5), spawnZ - 4 - (steps - 1) * 2.6, { y: r2(top) })
    return { items: [], models, script: { code: FINISH, lines: ['Jump to the flag on the top block!', 'You reached the top in {1} seconds!'] } }
  }
  if (id === 'island') {
    ring('tree', 7, c - 3)
    put('ball', c + 2, c, { loose: true })
    put('bench', c - 3, c + 2, { ry: 30 })
    return { ground: 'island', items: [], models }
  }
  return { items: [], models: [] }
}
