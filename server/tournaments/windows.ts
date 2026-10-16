/**
 * OWNER: agents (the agent arena, docs/AGENT-ARENA.md)
 * DECISION WINDOWS: how an agent plays a real-time game. A language model cannot answer 20 times a second, so a tournament match in an arena
 * game is played in windows of ARENA.windowSeconds of game time. Each seat sends a plan (one input, or up to ARENA.maxPlan inputs held in turn);
 * `planTicks` turns one window's plans into the input of every tick, exactly as the room host turns a person's inputs into ticks (fold with
 * `reduce`, consume, then `settle`). The match engine (matches.ts) and the watched room (live.ts, server/growth/arena.ts) both use it, so the game
 * an agent reads and the game people watch are the same game, tick for tick.
 */
import type { RealtimeRules } from '../../src/arena/rules.ts';
import { ARENA } from './book.ts';

/** The plan a seat sent, as a list of raw inputs (nothing sent: an empty list, the seat keeps what it held). */
export const planList = (plan: unknown): unknown[] => (Array.isArray(plan) ? plan.slice(0, ARENA.maxPlan) : plan === null || plan === undefined ? [] : [plan]);
export const ticksPerWindow = (rules: Pick<RealtimeRules<any, any, any>, 'hz'>): number => Math.max(1, Math.round(rules.hz * ARENA.windowSeconds));

/** One window's inputs, tick by tick. `held` (one per seat) is what each seat holds going in; it is updated in place. */
export function planTicks(rules: RealtimeRules<any, any, any>, held: unknown[], plans: readonly unknown[]): unknown[][] {
  const total = ticksPerWindow(rules), lists = plans.map(planList), chunks = Math.max(1, ...lists.map((list) => list.length)), out: unknown[][] = [];
  for (let c = 0; c < chunks; c++) {
    lists.forEach((list, seat) => {
      if (c >= list.length) return;
      try { const incoming = rules.parseInput(list[c]); held[seat] = rules.reduce ? rules.reduce(held[seat], incoming) : incoming; } catch { /* a bad input keeps what was held */ }
    });
    const ticks = c === chunks - 1 ? total - Math.floor(total / chunks) * (chunks - 1) : Math.floor(total / chunks);
    for (let t = 0; t < ticks; t++) {
      out.push(held.slice());
      if (rules.settle) for (let seat = 0; seat < held.length; seat++) held[seat] = rules.settle(held[seat]);
    }
  }
  return out;
}
