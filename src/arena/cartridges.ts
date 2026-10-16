/**
 * OWNER: games (real-time)
 * The registry of cartridges: one entry per game (the contract is ./cartridge.ts, the guide docs/CARTRIDGES.md). Data only, no Vue
 * and no rules, so the server, the checker script and the tests can read it cheaply. The rules of each are in ./registry.ts and its
 * screen in ./catalog.ts; a test keeps the three in step.
 */
import { CARTRIDGE_CONTRACT, defineCartridge } from './cartridge.ts'
import type { Cartridge } from './cartridge.ts'

/** Fight draws in 3D with these (src/arena/fight-3d.ts; manifests in scripts/assets/manifests/); Race and Football draw by code. */
const KAYKIT = 'https://github.com/KayKit-Game-Assets/KayKit-Character-Pack-Adventures-1.0'
const FIGHT_ASSETS = [
  { path: 'public/assets/packs/kaykit-adventurers/fighter-1.glb', licence: 'CC0', source: KAYKIT, author: 'KayKit' },
  { path: 'public/assets/packs/kaykit-adventurers/fighter-2.glb', licence: 'CC0', source: KAYKIT, author: 'KayKit' },
  { path: 'public/assets/packs/allworld-fight/ring-wide.glb', licence: 'ours', source: 'Allworld (scripts/assets/blender/ring.py)' },
] as const
const MODES = { alone: 'live', friends: 'live', community: 'planned', matchmaking: 'planned', agents: 'planned' } as const
const READS = ['identity', 'friends', 'city'] as const
const WRITES = ['result', 'replay'] as const

export const CARTRIDGES: readonly Cartridge[] = Object.freeze([
  defineCartridge({ contract: CARTRIDGE_CONTRACT, id: 'fight', name: 'Fight', blurb: 'Real-time 1v1 brawl. Punch, kick, block. Best of 3.', rev: 1,
    venues: ['viewing-centre', 'stadium', 'arcade'], modes: MODES, reads: READS, writes: WRITES, manifest: { entry: 'FightGame', lazy: ['fight-3d', 'meshopt_decoder.module', 'native-body'], assets: FIGHT_ASSETS } }),
  defineCartridge({ contract: CARTRIDGE_CONTRACT, id: 'race', name: 'Race', blurb: 'Race 2-4 friends. Others can watch.', rev: 1,
    venues: ['race-track', 'airstrip', 'arcade'], modes: MODES, reads: READS, writes: WRITES, manifest: { entry: 'RaceGame', assets: [] } }),
  defineCartridge({ contract: CARTRIDGE_CONTRACT, id: 'football', name: 'Football', blurb: '1v1 or 2v2 with friends. Others can watch.', rev: 1,
    venues: ['viewing-centre', 'stadium', 'arcade'], modes: MODES, reads: READS, writes: WRITES, manifest: { entry: 'FootballGame', assets: [] } }),
])

export const cartridgeOf = (id: unknown): Cartridge | null => CARTRIDGES.find((c) => c.id === id) ?? null
