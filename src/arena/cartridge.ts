/**
 * OWNER: games (real-time)
 * THE CARTRIDGE CONTRACT, version 1. A "cartridge" is one game module of the arena: everything Allworld needs to host it.
 * Written down here as types and a validator; explained in docs/CARTRIDGES.md. The three games (fight, race, football) are
 * the first cartridges (./cartridges.ts).
 *
 * A cartridge provides
 *   1. RULES     deterministic, server-owned: a `RealtimeRules` (./rules.ts) found in ./registry.ts. hz 1..30, a snapshot under
 *                about 300 bytes, a bot, `reduce`/`settle` when the input has taps. The server is the only judge.
 *   2. RENDERER  a lazy client screen (./catalog.ts) plus the manifest below: every asset file with its licence, and a size cap.
 *   3. ENTRY     the registry entry: id, name, venues, modes, what it reads from the world and writes back.
 * A cartridge may READ (CartridgeRead) and WRITE (CartridgeWrite) only what its entry declares; the host hands over nothing else.
 * Nothing here runs a game: this file is types, constants and `validateCartridge`, safe to import anywhere. It imports nothing from
 * src/game/, so the client chunks that read the registry leave the startup engine chunk exactly as it was.
 */

/** Bump when the shape of a cartridge entry changes in a way an old cartridge cannot satisfy. */
export const CARTRIDGE_CONTRACT = 1
/** The most a cartridge's lazy chunks plus listed assets may weigh, brotli bytes. */
export const DEFAULT_CAP_BROTLI = 1_500_000

/** CC0 and MIT need no credit line; CC BY needs `attribution`; `ours` is made for Allworld (AGPL with the rest of the repository). */
export type AssetLicence = 'CC0' | 'CC-BY' | 'MIT' | 'ours'
export const LICENCES: readonly AssetLicence[] = ['CC0', 'CC-BY', 'MIT', 'ours']

export interface CartridgeAsset {
  /** From the repository root, e.g. `public/assets/arena/fight/ring.glb`. Must exist. */
  path: string
  licence: AssetLicence
  /** Where it came from: a page address for third-party work, `Allworld` for ours. */
  source: string
  /** The maker, when known. */
  author?: string
  /** CC-BY only, required: the credit line exactly as it must appear. It must also be written in NOTICE.md. */
  attribution?: string
}

export interface CartridgeManifest {
  /** The stem of the screen's lazy chunk in dist/assets (`FightGame` for `FightGame-1a2b3c4d.js`). */
  entry: string
  /**
   * Chunks the screen loads later by dynamic import (a 3D view, three.js, a loader), by stem: counted against the cap with what they
   * import, beyond the first download. The entry's own static imports are counted without being listed.
   */
  lazy?: readonly string[]
  /** Brotli cap for the lazy chunks the entry pulls in (beyond the first download) plus the listed assets. Default DEFAULT_CAP_BROTLI. */
  cap?: number
  /** Every file the cartridge loads that is not code. Empty when everything is drawn and played by code. */
  assets: readonly CartridgeAsset[]
}

/** How people can play it. `live` works today; `planned` is in the contract but not built. */
export type CartridgeMode = 'alone' | 'friends' | 'community' | 'matchmaking' | 'agents'
export const MODES: readonly CartridgeMode[] = ['alone', 'friends', 'community', 'matchmaking', 'agents']
export type ModeState = 'live' | 'planned'

/** Places in the world a game may be played at (a venue offers its cartridges). A private room by code needs none. */
export type CartridgeVenue = 'viewing-centre' | 'stadium' | 'race-track' | 'airstrip' | 'arcade' | 'square'
export const VENUES: readonly CartridgeVenue[] = ['viewing-centre', 'stadium', 'race-track', 'airstrip', 'arcade', 'square']

/** What a cartridge may read from the world. */
export type CartridgeRead = 'identity' | 'friends' | 'closeness' | 'stake' | 'venue' | 'city'
/** What a cartridge may write back. */
export type CartridgeWrite = 'result' | 'rating' | 'gist' | 'reward' | 'replay'
export const READS: readonly CartridgeRead[] = ['identity', 'friends', 'closeness', 'stake', 'venue', 'city']
export const WRITES: readonly CartridgeWrite[] = ['result', 'rating', 'gist', 'reward', 'replay']

export interface Cartridge {
  contract: typeof CARTRIDGE_CONTRACT
  /** The rules id (`[a-z]{2,16}`, src/arena/registry.ts). */
  id: string
  name: string
  /** One line for the card. */
  blurb: string
  /** Rules revision: raise it whenever `step`, `start` or `bot` change in a way that changes a match. A replay is only exact for the revision that recorded it. */
  rev: number
  venues: readonly CartridgeVenue[]
  modes: Readonly<Record<CartridgeMode, ModeState>>
  reads: readonly CartridgeRead[]
  writes: readonly CartridgeWrite[]
  manifest: CartridgeManifest
}
export const defineCartridge = (cartridge: Cartridge): Cartridge => cartridge

// ---- what the host gives a cartridge (read side) --------------------------------------------------------------------
/** A seat's public identity: the name other players see and the AI mark. Never an account, a device or an id other than the public one. */
export interface CartridgeIdentity { id: string; name: string; /** An AI agent plays this seat: the mark is always shown. */ ai: boolean; /** Public home city, if the player shows one. */ city?: string }
/** A friend of the seat who is in the same room, and how close (0..100, the friendship score the social system keeps). */
export interface CartridgeFriend { id: string; closeness: number }
/** Game naira staked on the match, within TABLE_STAKES: never real money, never against a bot, adults only, no cash-out. */
export interface CartridgeStake { each: number; pot: number }
export interface CartridgeVenueRef { venue: CartridgeVenue; cityId: string }
export interface CartridgeHost {
  contract: typeof CARTRIDGE_CONTRACT
  identity(seat: number): CartridgeIdentity | null
  friends(seat: number): readonly CartridgeFriend[]
  stake(): CartridgeStake | null
  venue(): CartridgeVenueRef | null
  city(): string | null
}

// ---- what a cartridge reports back (write side) ---------------------------------------------------------------------
export interface CartridgeReport {
  /** The game and the replay id of the finished match. */
  game: string
  replay: string | null
  /** Per seat: finishing place (1 = first) and score. */
  places: readonly number[]
  scores: readonly number[]
  /** Rating change per seat; the host applies the ladder rules (docs/agent-plans/viral/RESEARCH.md), not the cartridge. */
  rating?: readonly number[]
  /** One public line for the city gist, written through gistService(ctx).add (names via `people`, minors skipped). */
  gist?: { text: string; people: readonly { id: string; name: string }[] }
  /** Naira rewards per seat. The host clamps them to CARTRIDGE_LIMITS. */
  rewards?: readonly number[]
}
/** The limits a report is clamped to, and `clampRewards`, are in ./cartridge-limits.ts (server side: they read the table limits). */

const ID = /^[a-z]{2,16}$/
const STEM = /^[A-Za-z][A-Za-z0-9]{1,40}$/

/** What is wrong with a cartridge entry or its asset list, as sentences; empty when it is fine. Pure: the files themselves are checked by scripts/cartridge-check.ts. */
export function validateCartridge(c: Cartridge): string[] {
  const bad: string[] = []
  if (c.contract !== CARTRIDGE_CONTRACT) bad.push(`contract must be ${CARTRIDGE_CONTRACT}`)
  if (!ID.test(c.id)) bad.push('id must be 2-16 lower-case letters')
  if (!c.name.trim()) bad.push('name is empty')
  if (!Number.isSafeInteger(c.rev) || c.rev < 1) bad.push('rev must be a whole number from 1')
  for (const v of c.venues) if (!VENUES.includes(v)) bad.push(`unknown venue ${v}`)
  for (const m of MODES) if (c.modes[m] !== 'live' && c.modes[m] !== 'planned') bad.push(`mode ${m} must be live or planned`)
  if (!MODES.some((m) => c.modes[m] === 'live')) bad.push('at least one mode must be live')
  for (const r of c.reads) if (!READS.includes(r)) bad.push(`unknown read ${r}`)
  for (const w of c.writes) if (!WRITES.includes(w)) bad.push(`unknown write ${w}`)
  if (c.reads.includes('stake') && !c.reads.includes('identity')) bad.push('a staked game must read identity')
  if (!STEM.test(c.manifest.entry)) bad.push('manifest.entry must be the chunk stem, like FightGame')
  for (const stem of c.manifest.lazy ?? []) if (!/^[A-Za-z][A-Za-z0-9._-]{1,60}$/.test(stem)) bad.push(`manifest.lazy ${stem} must be a chunk stem`)
  const cap = c.manifest.cap ?? DEFAULT_CAP_BROTLI
  if (!Number.isSafeInteger(cap) || cap < 1 || cap > DEFAULT_CAP_BROTLI) bad.push(`manifest.cap must be 1..${DEFAULT_CAP_BROTLI} (a bigger cartridge needs the owner)`)
  const seen = new Set<string>()
  for (const a of c.manifest.assets) {
    if (!a.path || a.path.startsWith('/') || a.path.includes('..')) bad.push(`asset path ${a.path} must be inside the repository`)
    if (seen.has(a.path)) bad.push(`asset ${a.path} is listed twice`)
    seen.add(a.path)
    if (!LICENCES.includes(a.licence)) bad.push(`asset ${a.path} has no valid licence`)
    if (!a.source.trim()) bad.push(`asset ${a.path} has no source`)
    if (a.licence === 'CC-BY' && !a.attribution?.trim()) bad.push(`asset ${a.path} is CC BY and needs attribution text`)
  }
  return bad
}
