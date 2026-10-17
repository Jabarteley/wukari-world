/**
 * OWNER: games (real-time)
 * The client's catalog of live games: what the Games hub lists and which screen a room opens. The hub (GamesApp.vue) renders
 * every entry the same way (Play with a friend / Practice vs bot / Watch) and the landing opens the screen of the game named
 * in the room code (src/arena/code.ts). A game's screen is a lazy chunk and is fetched only when opened.
 *
 * ADD A GAME: one entry below. The screen component takes `{ intent }` and emits `close` (see ArenaScreenProps).
 * This file is imported by the Games app only (a lazy chunk), never by startup code.
 */
import type { Component } from 'vue'

/** What a game screen is mounted with. `join` also covers watching: with no free seat the room makes the visitor a watcher. */
export interface ArenaIntent {
  kind: 'create' | 'practice' | 'join'
  room?: string
  /** Practice only: seats in all (people plus computer players), min..max of the game; absent = the game's minimum. */
  seats?: number
}
export interface ArenaScreenProps { intent: ArenaIntent }

export interface ArenaCatalogEntry {
  /** The rules id (src/arena/registry.ts): 'fight', 'race', 'football'. */
  id: string
  title: string
  /** One line for the card. */
  blurb: string
  /** An emoji for the card. */
  icon: string
  /** People per game (the rules' `seats`); the card says "2-4 players". */
  min: number
  max: number
  /** Whether "Practice vs bot" is offered (the rules have a bot). */
  practice: boolean
  /** The screen, fetched on first use. */
  screen: () => Promise<{ default: Component }>
  /** Card colours (CSS). */
  tint?: { bg: string; fg: string }
}

export const ARENA_CATALOG: readonly ArenaCatalogEntry[] = [
  { id: 'fight', title: 'Fight', blurb: 'Real-time 1v1 brawl. Punch, kick, block. Best of 3.', icon: '\u{1F44A}', min: 2, max: 2, practice: true, screen: () => import('../app/features/arena/FightGame.vue'), tint: { bg: '#2a2147', fg: '#ffffff' } },
  { id: 'race', title: 'Race', blurb: 'Race 2-4 friends. Others can watch.', icon: '\u{1F3CE}', min: 2, max: 4, practice: true, screen: () => import('../app/features/arena/RaceGame.vue'), tint: { bg: '#10382a', fg: '#ffffff' } },
  { id: 'football', title: 'Football', blurb: '1v1 or 2v2 with friends. Others can watch.', icon: '\u26BD', min: 2, max: 4, practice: true, screen: () => import('../app/features/arena/FootballGame.vue'), tint: { bg: '#0f5132', fg: '#ffffff' } },
  { id: 'lite', title: 'Made by players', blurb: 'Small games players made. Dodge, collect, race to the goal.', icon: '\u{1F965}', min: 1, max: 8, practice: true, screen: () => import('../app/features/arena/LiteGame.vue'), tint: { bg: '#1d4d34', fg: '#ffffff' } },
]

export const catalogEntry = (id: string | null | undefined): ArenaCatalogEntry | null => ARENA_CATALOG.find((entry) => entry.id === id) ?? null
export const playersLine = (entry: ArenaCatalogEntry): string => (entry.min === entry.max ? `${entry.max} players` : `${entry.min}-${entry.max} players`)
