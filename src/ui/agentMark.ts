/** Does a public identity carry the "AI-played" mark at server time `now`? An agent character always; an own character until `agentUntil`. */
export function agentPlayed(who: { agent?: true | undefined; agentUntil?: number | undefined } | null | undefined, now: number): boolean {
  return who?.agent === true && (who.agentUntil === undefined || now < who.agentUntil)
}
