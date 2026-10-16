/**
 * OWNER: games (real-time)
 * The registry of cartridges: one entry per game (the contract is ./cartridge.ts, the guide docs/CARTRIDGES.md). Data only, no Vue
 * and no rules, so the server, the checker script and the tests can read it cheaply. The rules of each are in ./registry.ts and its
 * screen in ./catalog.ts; a test keeps the three in step.
 */
import { CARTRIDGE_CONTRACT, defineCartridge } from './cartridge.ts'
import type { Cartridge } from './cartridge.ts'

/** Fight, Race and Football draw in 3D with these (src/arena/fight-3d.ts, race-3d.ts, football-3d.ts; manifests in scripts/assets/manifests/). Fight's real characters are the world's own files, not listed here. */
const KAYKIT = 'https://github.com/KayKit-Game-Assets/KayKit-Character-Pack-Adventures-1.0'
const PACKS = 'public/assets/packs/'
const FIGHT_ASSETS = [
  ...['fighter-1', 'fighter-2'].map((name) => ({ path: `${PACKS}kaykit-adventurers/${name}.glb`, licence: 'CC0' as const, source: KAYKIT, author: 'KayKit' })),
  ...[['ring-wide', 'ring'], ['native-fight-clips', 'native-fight-clips']].map(([name, script]) => ({ path: `${PACKS}allworld-fight/${name}.glb`, licence: 'ours' as const, source: `Allworld (scripts/assets/blender/${script}.py)` })),
]
const KENNEY = 'https://kenney.nl/assets/racing-kit'
const RACE_FILES = ['raceCarRed', 'raceCarOrange', 'raceCarGreen', 'raceCarWhite', 'barrierWall', 'fenceStraight', 'grandStand', 'pitsGarage', 'treeLarge', 'treeSmall', 'lightPostModern', 'flagCheckers'] as const
const RACE_ASSETS = RACE_FILES.map((name) => ({ path: `public/assets/packs/kenney-racing-kit/${name}.glb`, licence: 'CC0' as const, source: KENNEY, author: 'Kenney' }))
const KENNEY_PEOPLE = 'https://kenney.nl/assets/blocky-characters'
const FOOTBALL_ASSETS = [
  { path: 'public/assets/packs/allworld-arenas/pitch.glb', licence: 'ours', source: 'Allworld (scripts/assets/blender/pitch.py)' },
  { path: 'public/assets/packs/allworld-arenas/goal.glb', licence: 'ours', source: 'Allworld (scripts/assets/blender/goal.py)' },
  { path: 'public/assets/packs/allworld-arenas/ball.glb', licence: 'ours', source: 'Allworld (scripts/assets/blender/ball.py)' },
  { path: 'public/assets/packs/kenney-blocky-characters/player-1.glb', licence: 'CC0', source: KENNEY_PEOPLE, author: 'Kenney' },
  { path: 'public/assets/packs/kenney-blocky-characters/player-2.glb', licence: 'CC0', source: KENNEY_PEOPLE, author: 'Kenney' },
  { path: 'public/assets/packs/kenney-blocky-characters/player-3.glb', licence: 'CC0', source: KENNEY_PEOPLE, author: 'Kenney' },
] as const
const MODES = { alone: 'live', friends: 'live', community: 'planned', matchmaking: 'planned', agents: 'planned' } as const
const READS = ['identity', 'friends', 'city'] as const
const WRITES = ['result', 'replay'] as const

export const CARTRIDGES: readonly Cartridge[] = Object.freeze([
  defineCartridge({ contract: CARTRIDGE_CONTRACT, id: 'fight', name: 'Fight', blurb: 'Real-time 1v1 brawl. Punch, kick, block. Best of 3.', rev: 1,
    venues: ['viewing-centre', 'stadium', 'arcade'], modes: MODES, reads: READS, writes: WRITES, manifest: { entry: 'FightGame', lazy: ['fight-3d', 'meshopt_decoder.module', 'native-body'], assets: FIGHT_ASSETS } }),
  defineCartridge({ contract: CARTRIDGE_CONTRACT, id: 'race', name: 'Race', blurb: 'Race 2-4 friends. Others can watch.', rev: 1,
    venues: ['race-track', 'airstrip', 'arcade'], modes: MODES, reads: READS, writes: WRITES, manifest: { entry: 'RaceGame', lazy: ['race-3d', 'meshopt_decoder.module', 'native-body'], assets: RACE_ASSETS } }),
  defineCartridge({ contract: CARTRIDGE_CONTRACT, id: 'football', name: 'Football', blurb: '1v1 or 2v2 with friends. Others can watch.', rev: 2,
    venues: ['viewing-centre', 'stadium', 'arcade'], modes: MODES, reads: READS, writes: WRITES, manifest: { entry: 'FootballGame', lazy: ['football-3d', 'meshopt_decoder.module', 'native-body'], assets: FOOTBALL_ASSETS } }),
])

export const cartridgeOf = (id: unknown): Cartridge | null => CARTRIDGES.find((c) => c.id === id) ?? null
