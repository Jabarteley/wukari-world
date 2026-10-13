/**
 * OWNER: growth
 * The rules of TABLE STAKES, pure (no clock, no I/O): naira put on a two-player table game, the winner takes the pot. The
 * numbers are in content/growth.ts (TABLE_STAKES); the money moves in server/growth/tables.ts through the server-only life
 * action 'tables.server' (systems/growth.ts). Nothing here changes a life.
 *
 * WHAT A STAKE IS. Game naira only. It can never be bought with real money or cashed out (docs/REAL-VALUE.md, red lines).
 * Skill games only, between two real players, never against a bot, and only for players who said they are 18 or older.
 *
 * THE GIFT RULE APPLIES (docs/BUSINESS.md §5). A stake can only come from money the player worked for and has not already
 * given away or spent at players' shops: it must be within the same allowance as a gift. A stake that is lost has passed to
 * another player, so it stays counted against the allowance for good; a stake that comes back (won, drawn, refunded) does not.
 * What a win pays is never "worked for", so it cannot be given onward.
 *
 * WORDS. Player copy says "stake", "play for", "pot" and "winner takes the pot". It never says the words a betting site would
 * (see FORBIDDEN_WORDS, which the tests run over every sentence here).
 */
import { TABLE_STAKES } from './content/growth.ts';
import { TRANSFER_LIMITS } from './content/npcs.ts';
import { naira } from './util.ts';

export type StakeCode = 'invalid_stake' | 'adults_only' | 'work_first' | 'stake_exceeds_work' | 'insufficient_funds' | 'player_day_cap' | 'pair_day_cap';
export interface StakeRefusal { code: StakeCode; reason: string }

/** The line every staked table carries. */
export const PLAY_MONEY = 'Play money only — game naira, never real money.';
/** Words that never appear in the copy of a stake (the tests check every sentence this module and the app can make). */
export const FORBIDDEN_WORDS = /\b(bet|bets|betting|gamble|gambling|earn|earns|earned|earning|invest|investing|investment|profit|profits)\b/i;

export const STAKE_CHOICES: readonly number[] = TABLE_STAKES.choices;
export const STAKE_MAX = Math.max(...TABLE_STAKES.choices);
/** Is this one of the stakes a table may be set to (0, a free game, included)? */
export const isStake = (value: unknown): value is number => typeof value === 'number' && TABLE_STAKES.choices.includes(value);
/** May this game be played for a stake? */
export const stakeable = (game: string): boolean => TABLE_STAKES.games.includes(game);
/** What the winner takes: both stakes. */
export const potOf = (stake: number): number => stake * 2;
/** "Play for ₦500 each — winner takes ₦1,000", or "Free game". */
export const stakeLine = (stake: number): string => (stake > 0 ? `Play for ${naira(stake)} each — winner takes ${naira(potOf(stake))}` : 'Free game');
/** The label a stake chip carries. */
export const stakeChip = (stake: number): string => (stake > 0 ? `${naira(stake)} each` : 'Free');
/** What the wallet lines call a game: "Whot with Ada" ('Table stake: Whot with Ada', 'Won the pot: Whot with Ada'). */
export const stakeLabel = (game: string, other: string): string => `${game} with ${other}`;

/** What a finished staked game did to one player, in a sentence (the result card and the toast). */
export function stakeOutcome(stake: { amount: number; pot: number; outcome: string }): string {
  if (stake.outcome === 'won') return `You won the pot: ${naira(stake.pot)} (your ${naira(stake.amount)} back and ${naira(stake.pot - stake.amount)} from the other player).`;
  if (stake.outcome === 'lost') return `You lost your ${naira(stake.amount)} stake. The pot went to the winner.`;
  return `Your ${naira(stake.amount)} stake came back. Nobody won or lost.`;
}

/** What the stake rules need to know about one player. `adult` and the day totals are known to the server only: a life leaves them out. */
export interface StakeFacts {
  /** state.social.earned */
  earned: number
  /** Naira already passed to other players: gifts, shop spending and stakes held or lost (systems/growth.ts passedOn). */
  passed: number
  cash: number
  /** The player said they are 18 or older (ctx.checks.adult). Left out: not asked. */
  adult?: boolean | null
  /** Naira this player has staked today, and with this opponent. Left out: not asked. */
  playerToday?: number
  pairToday?: number
}

/** Naira of a player's work not yet passed to another player: the one allowance gifts, shop purchases and stakes share. */
export const workAllowance = (facts: Pick<StakeFacts, 'earned' | 'passed'>): number => Math.max(0, facts.earned - facts.passed);

/**
 * Why this player may not put `amount` on a table now, in a sentence to them, or null. The order is the order a player can fix
 * things in: age, then work, then money, then the day's limits.
 */
export function stakeBlock(facts: StakeFacts, amount: number): StakeRefusal | null {
  if (!isStake(amount) || amount <= 0) return { code: 'invalid_stake', reason: `Choose one of ${TABLE_STAKES.choices.filter((value) => value > 0).map(naira).join(', ')}, or play for nothing.` };
  if (facts.adult !== undefined && facts.adult !== true) return { code: 'adults_only', reason: 'Playing for a stake is for players who are 18 or older. Say you are 18 or older in Stay in touch on your Phone. Free games are open to everyone.' };
  const need = TRANSFER_LIMITS.minEarned;
  if (facts.earned < need) return { code: 'work_first', reason: `Work paid shifts first: you can play for a stake once you have worked for ${naira(need)} (you have worked for ${naira(facts.earned)}).` };
  const room = workAllowance(facts);
  if (amount > room) return { code: 'stake_exceeds_work', reason: room > 0 ? `You can only play for money you have worked for and not given away or spent at players’ shops. You can still stake ${naira(room)}.` : 'You can only play for money you have worked for and not given away or spent at players’ shops. Work a shift to play for a stake.' };
  if (facts.cash < amount) return { code: 'insufficient_funds', reason: `You need ${naira(amount)} to play for this; you have ${naira(facts.cash)}.` };
  if (facts.playerToday !== undefined && facts.playerToday + amount > TABLE_STAKES.playerPerDay) return { code: 'player_day_cap', reason: `You can play for ${naira(TABLE_STAKES.playerPerDay)} a day in all. ${naira(Math.max(0, TABLE_STAKES.playerPerDay - facts.playerToday))} is left today. The limit resets at midnight, Nigerian time.` };
  if (facts.pairToday !== undefined && facts.pairToday + amount > TABLE_STAKES.pairPerDay) return { code: 'pair_day_cap', reason: `You two have played for ${naira(TABLE_STAKES.pairPerDay)} against each other today, the most there is. Play for nothing, or come back after midnight, Nigerian time.` };
  return null;
}

/** What the table says about an opponent who may not play for the stake, without saying why (their age, money and blocks are theirs). */
export const theyCannot = (name: string): string => `${name} cannot play for a stake right now.`;

/** How a finished staked game settles. `moved` is how many real moves the two players made between them. */
export type Settlement = { kind: 'refund' } | { kind: 'win'; seat: number };
/**
 * A drawn game, a game nobody moved in, and any result that names no single winner give both stakes back. Otherwise the winner
 * takes the pot: a player who leaves or forfeits after play began has lost (the table's own forfeit rule).
 */
export function settlement(outcome: { winners: readonly number[]; draw: boolean }, moved: number): Settlement {
  const [winner] = outcome.winners;
  if (outcome.draw || moved <= 0 || outcome.winners.length !== 1 || winner === undefined) return { kind: 'refund' };
  return { kind: 'win', seat: winner };
}

/** The pair's key in a day's counts: the same for both orders. */
export const pairKey = (a: string, b: string): string => [a, b].sort().join('|');
