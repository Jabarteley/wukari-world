/**
 * AGENT ACCESS: the numbers and the allow-list, in one place (design and the reasons: docs/AGENTS.md).
 * Pure and portable: the server, the Worker and the tests read the same constants.
 */

/** What one key may do. Change a number here and nowhere else. */
export const AGENT_LIMITS = Object.freeze({
  /** Keys a signed-in account may hold at once. */
  keysPerAccount: 3,
  /** Agent characters an account may own at once (claimed ones count). */
  charactersPerAccount: 2,
  /**
   * The ONE per-key ceiling, purely a runaway guard: an agent otherwise has the same limits a human session has (the per-session request
   * limit of the host, and every rule and limit inside the game and the chat). Calls per key per UTC day.
   */
  callsPerDay: 6000,
  /** Game refusals in a row after which a key is suspended (a runaway guard). */
  refusalsToSuspend: 25,
  /** Reports about the character an agent plays after which its keys are suspended. */
  reportsToSuspend: 3,
  /** A character an agent acted for this recently carries the AI-played badge (an own character's mark lapses after this). */
  activeWindowMs: 5 * 60000,
  /** A character an agent acted for this recently is present in its place for everyone there (no socket: the room module's virtual member). */
  presenceMs: 2 * 60000,
  /** Entries kept in a key's audit trail. */
  auditEntries: 20,
  /** Longest a wait_until_done call holds a request open. */
  longestWaitSeconds: 20,
  /** Largest request body the endpoint reads. */
  bodyBytes: 16384,
  /** Longest name a key or an agent character is given. */
  nameLength: 24,
  /** Rows on the agents board. */
  boardRows: 20,
  /** Largest tool answer, in characters; a longer one is cut and says so. */
  answerChars: 14000,
});

/** An agent that signs itself up, and the account-less character it gets until a person claims it. */
export const UNCLAIMED = Object.freeze({
  /** New agent accounts one network address may make a day. */
  createPerAddressDay: 3,
  /** New agent accounts the whole server accepts a day, until an operator sets another number. */
  createDailyCap: 200,
  /** A claim link works once and for this long. */
  claimLinkMs: 30 * 86400000,
  /** An unclaimed character with no activity for this long is archived (the existing archive of expired lives). */
  idleMs: 14 * 86400000,
  /** The most naira an unclaimed agent may send to, or receive from, a player who is not an agent, in one transfer or request. */
  moneyMax: 500,
  /** Longest a claim token is, for the plain shape check. */
  tokenLength: 43,
});

/** An account must be at least this old (the trust rule for anything strangers act on) before it makes a key. */
export const AGENT_ACCOUNT_MIN_AGE_MS = 24 * 3600000;

export type AgentMode = 'own' | 'agent';

/** What a session record says about agent play. */
export interface AgentPlay { char?: true; owner?: string; at?: number; week?: number; unclaimed?: true }
/**
 * The "AI-played" mark of a public identity. An agent character always carries it; a player's own character carries it, with the time it lapses, for
 * a few minutes after a key acted for it. Clients show the mark while `agentUntil` is absent or still ahead of the server clock.
 */
export function agentMark(play: AgentPlay | undefined): { agent?: true; agentUntil?: number } {
  if (!play) return {};
  if (play.char === true) return { agent: true };
  return play.at !== undefined ? { agent: true, agentUntil: play.at + AGENT_LIMITS.activeWindowMs } : {};
}
/** Does this mark still hold at `now`? */
export const agentMarked = (mark: { agent?: true | undefined; agentUntil?: number | undefined } | undefined, now: number): boolean => mark?.agent === true && (mark.agentUntil === undefined || now < mark.agentUntil);
