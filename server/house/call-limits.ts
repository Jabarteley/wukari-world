/**
 * OWNER: agents (calls with house agents, docs/CALLS.md "Calls with AI characters", docs/AI-SAFETY.md "Limits on talking with AI")
 * THE MINUTES OF CALLS WITH AGENTS, AND THE BREAK REMINDER. Portable and pure (no Node imports); the Node host and the Worker run it.
 *
 *   start(player, agent)  → { ok: true, call, leftSeconds } | { ok: false, over: 'player' | 'total' }
 *   touch(call)           → charges the time since the last touch (at most GAP_MS of it) and says what is left and whether a break is due; null for a call that ended
 *   end(call)
 *
 * TIME IS WALL TIME OF THE CALL: every request of a call (a turn, a recording, a ping, the end) charges the time since the one before, at most GAP_MS (a person who put the
 * phone down without hanging up is charged a minute and a half, not an hour). A call with nothing for IDLE_MS is over. Seconds are counted per UTC day, per person and in total.
 * LIMITS are settings (agentCallPlayerMinutes, agentCallTotalMinutes); over either, the agent says it will call back (server/house/lines.ts) and the call ends.
 * BREAK REMINDER: calls that follow each other with gaps under SESSION_GAP_MS are one session; every `breakMinutes` of session the next touch says a break is due, once.
 * PRIVACY: the ledger holds numbers only. A person is a one-way id (as the model router's), kept for the day; nothing of what was said is here.
 */
import { sha256Hex } from '../../src/game/util.ts';

export const DAY_MS = 86400000, GAP_MS = 90_000, IDLE_MS = 3 * 60000, SESSION_GAP_MS = 15 * 60000, MAX_CALLS = 2000, PLAYERS_KEPT = 5000, DAYS_KEPT = 3;
export interface DayUse { total: number; players: Record<string, number> }
export interface Stored { days: Record<string, DayUse> }
export interface Limits { playerSeconds: number; totalSeconds: number; breakSeconds: number }
export interface Deps { now(): number; limits(): Limits; load(): Promise<Stored | undefined>; save(stored: Stored): Promise<void>; newId(): string }
interface Call { id: string; player: string; agent: string; startedAt: number; lastAt: number; seconds: number }
interface Session { startedAt: number; lastAt: number; remindedAt: number }

export const personKey = (publicId: string): string => `c_${sha256Hex(`allworld-calls-v1|${publicId}`).slice(0, 32)}`;
const own = (table: object, key: string): boolean => Object.hasOwn(table, key);

export function createCallLedger(deps: Deps) {
  let stored: Stored = { days: {} };
  let loading: Promise<void> | null = null;
  const ready = (): Promise<void> => (loading ??= deps.load().then((found) => { if (found && typeof found.days === 'object' && found.days !== null) stored = { days: { ...found.days } }; }, () => {}));
  const calls = new Map<string, Call>();
  const sessions = new Map<string, Session>();
  let saving = false, dirty = false;
  const dayKey = (): string => String(Math.floor(deps.now() / DAY_MS));
  function today(): DayUse {
    const key = dayKey();
    if (!own(stored.days, key)) {
      stored.days[key] = { total: 0, players: {} };
      for (const old of Object.keys(stored.days).map(Number).sort((a, b) => a - b).slice(0, -DAYS_KEPT)) delete stored.days[String(old)];
    }
    return stored.days[key]!;
  }
  function persist(): void {
    dirty = true;
    if (saving) return;
    saving = true;
    void (async () => { try { while (dirty) { dirty = false; await deps.save(stored); } } catch { /* the next change tries again */ } finally { saving = false; } })();
  }
  const leftFor = (player: string): number => {
    const limits = deps.limits(), day = today();
    return Math.max(0, Math.min(limits.playerSeconds - (day.players[player] ?? 0), limits.totalSeconds - day.total));
  };
  const overWhich = (player: string): 'player' | 'total' | null => {
    const limits = deps.limits(), day = today();
    if (day.total >= limits.totalSeconds) return 'total';
    return (day.players[player] ?? 0) >= limits.playerSeconds ? 'player' : null;
  };
  function charge(call: Call, seconds: number): void {
    if (seconds <= 0) return;
    const day = today();
    if (!own(day.players, call.player) && Object.keys(day.players).length >= PLAYERS_KEPT) return;
    call.seconds += seconds; day.total += seconds; day.players[call.player] = (day.players[call.player] ?? 0) + seconds;
    persist();
  }
  function sweep(): void {
    const now = deps.now();
    for (const call of [...calls.values()]) if (now - call.lastAt > IDLE_MS) calls.delete(call.id);
    for (const [player, session] of sessions) if (now - session.lastAt > SESSION_GAP_MS) sessions.delete(player);
  }

  return {
    ready,
    async start(publicId: string, agent: string): Promise<{ ok: true; call: string; leftSeconds: number } | { ok: false; over: 'player' | 'total' }> {
      await ready();
      sweep();
      const player = personKey(publicId), over = overWhich(player);
      if (over) return { ok: false, over };
      // A person has one call at a time: a new one ends the old.
      for (const call of [...calls.values()]) if (call.player === player) calls.delete(call.id);
      if (calls.size >= MAX_CALLS) calls.delete(calls.keys().next().value as string);
      const now = deps.now(), id = deps.newId();
      calls.set(id, { id, player, agent, startedAt: now, lastAt: now, seconds: 0 });
      const session = sessions.get(player);
      if (!session) sessions.set(player, { startedAt: now, lastAt: now, remindedAt: now }); else session.lastAt = now;
      return { ok: true, call: id, leftSeconds: leftFor(player) };
    },
    /** The call's owner and agent, or null when the call is not this person's or has ended. */
    find(publicId: string, id: string): { agent: string } | null {
      const call = calls.get(id);
      return call && call.player === personKey(publicId) && deps.now() - call.lastAt <= IDLE_MS ? { agent: call.agent } : null;
    },
    /** Charge the time since the last request of this call and report: seconds left today, whether the limit is reached, and whether a break is due. */
    touch(id: string): { leftSeconds: number; over: 'player' | 'total' | null; breakDue: boolean; sessionSeconds: number } | null {
      const call = calls.get(id);
      if (!call) return null;
      const now = deps.now();
      if (now - call.lastAt > IDLE_MS) { calls.delete(id); return null; }
      charge(call, Math.round(Math.min(GAP_MS, now - call.lastAt) / 1000));
      call.lastAt = now;
      const over = overWhich(call.player);
      let session = sessions.get(call.player);
      if (!session || now - session.lastAt > SESSION_GAP_MS) { session = { startedAt: now, lastAt: now, remindedAt: now }; sessions.set(call.player, session); }
      session.lastAt = now;
      const breakAfter = deps.limits().breakSeconds;
      const breakDue = breakAfter > 0 && now - session.remindedAt >= breakAfter * 1000;
      if (breakDue) session.remindedAt = now;
      if (over) calls.delete(id);
      return { leftSeconds: leftFor(call.player), over, breakDue, sessionSeconds: Math.round((now - session.startedAt) / 1000) };
    },
    end(id: string): void {
      const call = calls.get(id);
      if (!call) return;
      const now = deps.now();
      charge(call, Math.round(Math.min(GAP_MS, now - call.lastAt) / 1000));
      calls.delete(id);
    },
    /** For the operator page and the tests. */
    usage: (): { day: string; total: number; players: number; open: number } => { const day = today(); return { day: dayKey(), total: day.total, players: Object.keys(day.players).length, open: calls.size }; },
    secondsUsed: (publicId: string): number => today().players[personKey(publicId)] ?? 0,
    stored: (): Stored => stored,
  };
}
export type CallLedger = ReturnType<typeof createCallLedger>;
