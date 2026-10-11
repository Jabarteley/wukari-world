/**
 * AGENT ACCESS: the numbers and the allow-list, in one place (design and the reasons: docs/AGENTS.md).
 * Pure and portable: the server, the Worker and the tests read the same constants.
 */

/** What one key may do. Change a number here and nowhere else. */
export const AGENT_LIMITS = Object.freeze({
  /** Keys a signed-in account may hold at once. */
  keysPerAccount: 3,
  /** Agent characters an account may own at once. */
  charactersPerAccount: 2,
  /** Tool calls that change or read the game, per key. */
  callsPerMinute: 30,
  /** Tool calls per key per UTC day. */
  callsPerDay: 600,
  /** Messages a key may send per UTC day, in all. */
  messagesPerDay: 40,
  /** Messages a key may send in one minute. */
  messagesPerMinute: 4,
  /** Consecutive game refusals after which a key is suspended. */
  refusalsToSuspend: 25,
  /** Reports about the character an agent plays after which its keys are suspended. */
  reportsToSuspend: 3,
  /** A character an agent acted for this recently carries the AI-played badge. */
  activeWindowMs: 5 * 60000,
  /** Entries kept in a key's audit trail. */
  auditEntries: 20,
  /** Longest a wait_until_done call holds a request open. */
  longestWaitSeconds: 20,
  /** Largest request body the endpoint reads. */
  bodyBytes: 16384,
  /** Longest name a key or an agent character is given. */
  nameLength: 24,
  /** The most an agent may pay for one money request; larger ones are for the owner. */
  payRequestMax: 5000,
  /** Rows on the agents board. */
  boardRows: 20,
});

/** An account must be at least this old (the trust rule for anything strangers act on) before it makes a key. */
export const AGENT_ACCOUNT_MIN_AGE_MS = 24 * 3600000;
/** The trust tier an account needs to own an AGENT CHARACTER (an extra life in the world). A key for your own character needs only an account. */
export const AGENT_CHARACTER_MIN_TIER = 'phone' as const;

export type AgentMode = 'own' | 'agent';

/**
 * The action types an agent key may run, deny by default. Everything else the rules engine accepts (estate, cars,
 * loans and deposits, furniture, civic office, stories, onboarding and the look, the campus, calls, gifts) is refused
 * before any rule runs. A key may carry a narrower list; it can never carry a wider one.
 */
export const AGENT_ACTIONS: readonly string[] = Object.freeze([
  'activity', 'spot', 'cancel', 'travel', 'world.roadside',
  'apply-job', 'career.dilemma',
  'home.grocery-buy', 'onboarding.boutique-buy',
  'missions.claim',
]);
export const DEFAULT_AGENT_SCOPES: readonly string[] = AGENT_ACTIONS;

/** The tools an agent sees, and which of the scopes each needs. A tool that is not listed does not exist. */
export const scopeAllows = (scopes: readonly string[], type: string): boolean => AGENT_ACTIONS.includes(type) && scopes.includes(type);

/** What a session record says about agent play. */
export interface AgentPlay { char?: true; owner?: string; at?: number; week?: number }
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
