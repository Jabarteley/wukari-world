/**
 * OWNER: agents (the agent arena, docs/AGENT-ARENA.md)
 * WATCHING AN AGENT MATCH: every real-time tournament match that is being played has a room in the arena host (server/growth/arena.ts, "DRIVEN
 * ROOMS") that people open by its code, `/?table=<code>`, exactly like a friend's game, and watch. After every change to a match (a plan sent, a
 * window closed by the clock) `sync` turns the match's new log entries into ticks (windows.ts) and hands them to the room, which plays them at the
 * game's own speed. Nothing here is stored: the room is memory, as every room is. After a restart, the next sync makes the room again and plays
 * what was already played at once, unseen, so the room is back where the match is. When the room has played the match out, its replay id is
 * written on the match (the result card links to it).
 */
import { arenaService } from '../growth/arena.ts';
import type { DrivenTick } from '../growth/arena.ts';
import type { RouteContext } from '../types.ts';
import type { MatchRec } from './book.ts';
import { realtimeRules } from './matches.ts';
import { planTicks } from './windows.ts';

interface Entry { code: string; fed: number; held: unknown[]; game: string }
const lives = new WeakMap<object, ReturnType<typeof build>>();
export function liveRooms(ctx: RouteContext, onReplay: (match: string, replay: string) => void) {
  const found = lives.get(ctx);
  if (found) return found;
  const made = build(ctx, onReplay);
  lives.set(ctx, made);
  return made;
}

function build(ctx: RouteContext, onReplay: (match: string, replay: string) => void) {
  const arena = arenaService(ctx);
  const rooms = new Map<string, Entry>();

  /** Bring the rooms of these matches (arena kind; playing, or finished with their log kept) up to their logs. */
  function sync(matches: readonly MatchRec[]): void {
    for (const m of matches) {
      if (m.kind !== 'arena') continue;
      const rules = realtimeRules(m.game);
      if (!rules) continue;
      let entry = rooms.get(m.id), quiet = false;
      if (!entry) {
        if (m.status !== 'playing') continue;
        const code = arena.hostDriven({ game: m.game, seed: m.seed, seats: m.names.map((name, i) => ({ id: m.ids[i] ?? '', name })), onOver: (replay) => { rooms.delete(m.id); if (replay) onReplay(m.id, replay); } });
        if (!code) continue;
        entry = { code, fed: 0, held: [rules.idle(), rules.idle()], game: m.game };
        rooms.set(m.id, entry);
        // A match already well under way (the host restarted): catch up at once rather than replaying minutes of it to the first watcher.
        quiet = m.log.length > 3;
      }
      if (m.log.length <= entry.fed) continue;
      const ticks: DrivenTick[] = [];
      for (const item of m.log.slice(entry.fed)) {
        if (Array.isArray(item)) ticks.push(...planTicks(rules, entry.held, item));
        else if (item !== null && typeof item === 'object' && typeof (item as { f?: unknown }).f === 'number') ticks.push({ f: (item as { f: number }).f });
      }
      entry.fed = m.log.length;
      if (!arena.feedDriven(entry.code, ticks, quiet)) rooms.delete(m.id);
    }
  }
  /** The code of the room a match is watched in, or null (none yet, or it closed). */
  const codeOf = (matchId: string): string | null => rooms.get(matchId)?.code ?? null;
  return { sync, codeOf };
}
