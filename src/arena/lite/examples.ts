/**
 * OWNER: spaces (lite games)
 * The built-in lite games: always playable, the examples the Allworld skill copies, and the engine's test fixtures. Each is a
 * definition of ./schema.ts read through readLite, so an example that stopped being valid fails at load and in the tests.
 */
import { readLite, type LiteGameV1 } from './schema.ts'

const RAW: { id: string; def: unknown }[] = [
  { id: 'coconut', def: { schema: 'allworld-lite', version: 1, title: 'Coconut Dodge', seats: { min: 2, max: 8 }, arena: { w: 160, h: 120 }, controls: 'left-right', player: { size: 10, speed: 4, lives: 3 },
    entities: [{ id: 'coconut', kind: 'hazard', shape: 'circle', size: 8, speed: 3, behaviour: 'fall', spawn: 'top', every: 6, max: 10, label: 'Coconut' }, { id: 'mango', kind: 'pickup', shape: 'circle', size: 6, speed: 2, behaviour: 'fall', spawn: 'top', every: 40, max: 2, value: 1, label: 'Mango' }],
    rules: { win: 'last-standing', seconds: 90 }, palette: { bg: '#1d4d34', ground: '#3d7a4f', hazard: '#7a4b22', pickup: '#f2a33a' } } },
  { id: 'mango', def: { schema: 'allworld-lite', version: 1, title: 'Mango Harvest', seats: { min: 1, max: 8 }, arena: { w: 160, h: 120 }, controls: 'stick', player: { size: 10, speed: 3, lives: 3 },
    entities: [{ id: 'mango', kind: 'pickup', shape: 'circle', size: 6, speed: 0, behaviour: 'static', spawn: 'random', every: 10, max: 8, value: 1, label: 'Mango' }],
    rules: { win: 'most-points', points: 15, seconds: 60 }, palette: { pickup: '#f2a33a' } } },
  { id: 'danfo', def: { schema: 'allworld-lite', version: 1, title: 'Cross the Road', seats: { min: 1, max: 6 }, arena: { w: 160, h: 160 }, controls: 'stick', player: { size: 8, speed: 3, lives: 3 },
    entities: [{ id: 'danfo', kind: 'hazard', shape: 'square', size: 14, speed: 3, behaviour: 'patrol', spawn: 'random', every: 20, max: 6, label: 'Danfo' }, { id: 'stop', kind: 'goal', shape: 'square', size: 40, speed: 0, behaviour: 'static', spawn: 'fixed', x: 60, y: 0, label: 'Bus stop' }],
    rules: { win: 'first-to-goal', seconds: 60 }, palette: { hazard: '#f2c14e', goal: '#ffffff', ground: '#4a4a4a' } } },
  { id: 'goat', def: { schema: 'allworld-lite', version: 1, title: 'Run From the Goat', seats: { min: 1, max: 8 }, arena: { w: 160, h: 120 }, controls: 'stick', player: { size: 8, speed: 3, lives: 2 },
    entities: [{ id: 'goat', kind: 'hazard', shape: 'square', size: 10, speed: 2, behaviour: 'chase', spawn: 'edges', every: 150, max: 3, label: 'Goat' }],
    rules: { win: 'timer', seconds: 45 }, palette: { hazard: '#e8e2d0' } } },
  { id: 'bounce', def: { schema: 'allworld-lite', version: 1, title: 'Ball Wahala', seats: { min: 2, max: 8 }, arena: { w: 160, h: 120 }, controls: 'stick', player: { size: 8, speed: 3, lives: 3 },
    entities: [{ id: 'ball', kind: 'hazard', shape: 'circle', size: 8, speed: 2, behaviour: 'bounce', spawn: 'random', every: 60, max: 5, label: 'Ball' }, { id: 'coin', kind: 'pickup', shape: 'circle', size: 5, speed: 0, behaviour: 'static', spawn: 'random', every: 25, max: 4, value: 2 }],
    rules: { win: 'most-points', points: 20, seconds: 60 } } },
  { id: 'maze', def: { schema: 'allworld-lite', version: 1, title: 'Market Maze', seats: { min: 1, max: 4 }, arena: { w: 120, h: 120 }, controls: 'stick', player: { size: 8, speed: 2, lives: 3 },
    entities: [{ id: 'stall', kind: 'wall', shape: 'square', size: 30, speed: 0, behaviour: 'static', spawn: 'fixed', x: 45, y: 45 }, { id: 'agbero', kind: 'hazard', shape: 'square', size: 8, speed: 2, behaviour: 'patrol', spawn: 'random', every: 90, max: 2, label: 'Agbero' }, { id: 'exit', kind: 'goal', shape: 'square', size: 16, speed: 0, behaviour: 'static', spawn: 'fixed', x: 100, y: 0, label: 'Way out' }],
    rules: { win: 'first-to-goal', seconds: 60 } } },
]

export const LITE_EXAMPLES: readonly { id: string; def: LiteGameV1 }[] = Object.freeze(RAW.map(({ id, def }) => {
  const read = readLite(def)
  if (!read.def) throw new Error(`The lite example ${id} is not valid: ${read.problems.join(' ')}`)
  return { id, def: read.def }
}))
