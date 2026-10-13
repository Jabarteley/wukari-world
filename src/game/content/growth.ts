/**
 * OWNER: growth
 * Numbers for the growth features that pay or count: table-game wins and referrals.
 * Plain data only. Every figure is an original design and is played through the balance
 * simulation (scripts/economy-sim.ts, strategy "social") before it ships.
 */

/** Table games (src/tables/**). A win is paid by the game; a staked game (TABLE_STAKES) is paid by the loser's stake instead, never both. */
import type { ReferralRules, TableRewards, TableStakes } from '../../types/content.ts'

export const TABLE_REWARDS: Readonly<TableRewards> = Object.freeze({
  /** Naira for a counted win against at least one real player. A loss, a draw or a bot game pays nothing. */
  win: 150,
  /** Paid wins per Lagos day, per life. */
  paidWinsPerDay: 4,
  /** Finished games against bots that count toward missions per Lagos day (they never pay). */
  botCreditsPerDay: 1,
  /** The same two players' games count (pay, rating, missions) this many times a Lagos day; more are for fun. */
  pairGamesPerDay: 3,
});

/**
 * Table stakes (docs/GAMES.md, "Stakes"): game naira put on a two-player game, winner takes the pot. Game naira only: it can
 * never be bought with real money or cashed out (docs/REAL-VALUE.md red lines). Skill games only, never against a bot, 18+.
 */
export const TABLE_STAKES: Readonly<TableStakes> = /* @__PURE__ */ Object.freeze({
  /** What each player may put in, in naira; 0 is a free game. The most is the last. */
  choices: /* @__PURE__ */ Object.freeze([0, 100, 500, 1000, 2000]),
  /** Staked naira per Lagos day between the same two players, whoever wins. */
  pairPerDay: 5000,
  /** Staked naira per player per Lagos day in all. */
  playerPerDay: 10000,
  /** The only games that may be staked: skill games between two real players. Chance games are never added here. */
  games: /* @__PURE__ */ Object.freeze(['whot', 'ayo', 'chess', 'penalty', 'weave']),
  beta: true,
});

/** Referral: both sides are rewarded only after the newcomer has really played. */
export const REFERRAL: Readonly<ReferralRules> = Object.freeze({
  /** To the newcomer, once they have been paid for work on `welcomeWorkDays` Lagos day(s). */
  welcome: 1000, welcomeWorkDays: 1,
  /** To the inviter, once the newcomer has been paid for work on `countWorkDays` different Lagos days. */
  reward: 1500, rewardStars: 2, countWorkDays: 2,
  /** Paid referrals per inviter: per Lagos week and for life. Beyond these a referral still counts for titles. */
  paidPerWeek: 5, paidLifetime: 20,
  /** A link can only be attached to a life this young (Lagos days since it began). */
  linkWithinDays: 3,
  /** Links one network address may attach to one inviter in seven days (hostels and carriers share addresses). */
  perAddressPerWeek: 3,
  titles: [{ id: 'connector', count: 3, label: 'Connector' }, { id: 'area-mayor', count: 10, label: 'Area Mayor' }, { id: 'big-name', count: 25, label: 'Big Name' }],
});
