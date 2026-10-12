/**
 * TWO ELECTORATES. Every office has two ballots run in parallel with the same title, terms, quorum and rules: the PEOPLE's, and the AGENTS'
 * (docs/POLITICS.md, docs/AGENTS.md). A character is in the agents' electorate when it is an agent character, or when an AI agent key has played it
 * during the current election cycle (the same "played by an agent this period" the boards use, with the Lagos week as the period); otherwise in the
 * people's. The side is decided the first time the character files or votes in the cycle and is RECORDED ON THE BALLOT it used, so it cannot flip
 * mid-election: a character that has a candidacy or a vote on one side this week is on that side for the rest of the week.
 */
import { lagosTime } from '../../src/game/clock.ts';
import type { Db, SessionRecord } from '../types.ts';
import { govOfId, seatsOf } from './data.ts';
import type { Side } from './data.ts';

export type { Side };
export const sideParam = (value: unknown): Side | undefined => (value === 'agents' ? 'agents' : value === 'humans' ? 'humans' : undefined);

/** Has an AI agent played this character during this election cycle (or is it an agent character)? */
export const agentPlayed = (session: Pick<SessionRecord, 'agent'>, now: number): boolean => session.agent?.char === true || session.agent?.week === lagosTime(now).week;

/** The side the character is on this cycle, for `cityId` (its city seat) and the state and nation it votes in. */
export function electorateOf(db: Db, session: Pick<SessionRecord, 'agent' | 'publicId'>, now: number, cityId: string, cityName: string): Side {
  const week = lagosTime(now).week;
  for (const side of ['humans', 'agents'] as const) {
    for (const seat of seatsOf(cityId, cityName, side)) {
      const election = govOfId(db, seat.id).gov.elections[week];
      if (election?.candidates?.[session.publicId] || election?.votes?.[session.publicId]) return side;
    }
  }
  return agentPlayed(session, now) ? 'agents' : 'humans';
}

/** The plain refusal for a character that is on the other side, or null when `requested` is its side. */
export function electorateBlock(session: Pick<SessionRecord, 'agent'>, mine: Side, requested: Side, doing: 'stand' | 'vote'): { code: string; reason: string } | null {
  if (requested === mine) return null;
  const verb = doing === 'stand' ? 'stand' : 'vote';
  if (mine === 'agents') {
    return session.agent?.char === true
      ? { code: 'agents_electorate', reason: `This is the people's ballot. Agents elect agent officials: use the Agents ballot to ${verb}.` }
      : { code: 'agents_electorate', reason: `An AI agent has played your character during this election week, so you are in the agents' electorate until the new week: you can ${verb} only on the Agents ballot. People's ballots are for characters played by people. (It counts from the first time an agent acts for your character in the week.)` };
  }
  return { code: 'humans_electorate', reason: `This is the agents' ballot, for AI agents and the characters they play. You are in the people's electorate: use the Humans ballot to ${verb}.` };
}
