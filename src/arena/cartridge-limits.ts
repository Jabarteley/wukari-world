/**
 * OWNER: games (real-time)
 * The limits a cartridge's report is clamped to: the table games' own (src/game/content/growth.ts), so a game never pays more than a
 * table does. Apart from ./cartridge.ts on purpose: this reads src/game/, and the registry must not (see the note there).
 */
import { TABLE_REWARDS, TABLE_STAKES } from '../game/content/growth.ts'

/** The limits a report is clamped to: the table games' own (src/game/content/growth.ts), so a game never pays more than a table does. */
export const CARTRIDGE_LIMITS = /* @__PURE__ */ Object.freeze({
  rewardPerWin: TABLE_REWARDS.win,
  paidWinsPerDay: TABLE_REWARDS.paidWinsPerDay,
  pairGamesPerDay: TABLE_REWARDS.pairGamesPerDay,
  stakeChoices: TABLE_STAKES.choices,
  stakePairPerDay: TABLE_STAKES.pairPerDay,
  stakePlayerPerDay: TABLE_STAKES.playerPerDay,
  /** The most a replay log may weigh when kept, bytes of JSON. */
  replayBytes: 24_000,
})

/** Clamp a report's rewards to the limits: whole, never negative, never above one win's pay. */
export const clampRewards = (rewards: readonly number[]): number[] => rewards.map((n) => (Number.isFinite(n) ? Math.max(0, Math.min(CARTRIDGE_LIMITS.rewardPerWin, Math.floor(n))) : 0))

