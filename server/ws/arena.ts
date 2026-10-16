/**
 * OWNER: games (real-time)
 * Socket messages for the real-time game rooms. Thin adapters over server/growth/arena.ts, which holds every rule.
 * All types are prefixed `arena-`; the frames are documented in src/types/arena.ts and the design in docs/REALTIME-GAMES.md.
 * A socket need not have joined a venue room, and no life is read: the room code is the invitation.
 */
import { arenaService } from '../growth/arena.ts';
import type { RouteContext, WsHandlers } from '../types.ts';

export default function arenaSocket(ctx: RouteContext): WsHandlers {
  const arena = arenaService(ctx);
  return {
    close(ws) { arena.drop(ws); },
    messages: {
      'arena-create': async (ws, message) => { await arena.create(ws, message); },
      'arena-join': async (ws, message) => { await arena.join(ws, message); },
      'arena-watch': async (ws, message) => { await arena.watch(ws, message); },
      'arena-start': async (ws, message) => { await arena.start(ws, message); },
      'arena-options': async (ws, message) => { await arena.options(ws, message); },
      'arena-input': (ws, message) => { arena.input(ws, message); },
      'arena-again': async (ws, message) => { await arena.again(ws, message); },
      'arena-leave': async (ws, message) => { await arena.leave(ws, message); },
      'arena-stake': async (ws, message) => { await arena.stake(ws, message); },
      'arena-back': async (ws, message) => { await arena.back(ws, message); },
    },
  };
}
