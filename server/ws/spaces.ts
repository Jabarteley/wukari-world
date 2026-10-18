/**
 * OWNER: spaces
 * TOGETHER IN A SPACE (docs/SPACES-3D.md, phase 5): the socket frames that let visitors of one space in 3D see each other, and see
 * the space's models move as its script and physics move them on one device, the host's.
 *
 *   space-join { target, host?, id? }   join the space the 3D screen shows; the same rule as GET /api/spaces/world decides who may
 *   space-tick { p, o?, s?, say? }      at most SPACE_LIVE.hz a second: where I am [x, y, z, yaw]; from the host also the models
 *                                       [[index, x, y, z, qx, qy, qz, qw], …], the score and a line of the space's (index and numbers)
 *   space-leave {}
 *   → space-room { key, you, host, members: [{ id, name }] }   who is here, whenever that changes
 *   → space-peer { id, p, o?, s?, say? }                         one member's tick, to everyone else
 *
 * The host is the space's owner when they are in it, else whoever came first; when the host leaves the next one takes over. Only
 * the host's models, score and lines are passed on. Nothing here is stored: a space's live state lives in this process's memory.
 */
import { worldService } from '../spaces/world.ts';
import type { RouteContext, WsConnection, WsHandlers } from '../types.ts';

export const SPACE_LIVE = Object.freeze({ hz: 6, members: 16, objects: 40 });

interface Live { key: string; owner: string | null; host: string | null; sockets: Set<WsConnection> }

const finite = (value: unknown, limit: number): value is number => typeof value === 'number' && Number.isFinite(value) && Math.abs(value) <= limit;
/** [x, y, z, yaw], in range, rounded to centimetres. */
function cleanPose(value: unknown): number[] | null {
  if (!Array.isArray(value) || value.length !== 4 || !value.every((v) => finite(v, 1000))) return null;
  return value.map((v: number) => Math.round(v * 100) / 100);
}
/** The host's models: at most SPACE_LIVE.objects rows of [index, x, y, z, qx, qy, qz, qw]. */
function cleanObjects(value: unknown): number[][] | null {
  if (!Array.isArray(value) || value.length > SPACE_LIVE.objects) return null;
  const rows: number[][] = [];
  for (const row of value) {
    if (!Array.isArray(row) || row.length !== 8 || !Number.isInteger(row[0]) || row[0] < 0 || row[0] >= SPACE_LIVE.objects || !row.slice(1).every((v) => finite(v, 1000))) return null;
    rows.push([row[0], ...row.slice(1).map((v: number) => Math.round(v * 1000) / 1000)]);
  }
  return rows;
}
function cleanSay(value: unknown): number[] | null {
  if (!Array.isArray(value) || value.length < 1 || value.length > 5 || !Number.isInteger(value[0]) || value[0] < 0 || value[0] >= 40 || !value.slice(1).every((v) => finite(v, 1e9))) return null;
  return value as number[];
}

export default function spacesSocket(ctx: RouteContext): WsHandlers {
  const world = worldService(ctx);
  const spaces = new Map<string, Live>();
  const where = new Map<WsConnection, Live>();
  const send = (ws: WsConnection, frame: Record<string, unknown>): void => { if (ws.readyState === 1) ctx.send(ws, frame as never); };
  // As server/growth/arena.ts refuses: the dispatcher answers an `error` frame with the code and these words.
  const refuse = (code: string, reason: string): Error => Object.assign(new Error(code), { reason });

  function announce(live: Live): void {
    const members = [...new Map([...live.sockets].map((ws) => [ws.session.id, { id: ws.session.id, name: ws.session.name }])).values()];
    for (const ws of live.sockets) send(ws, { type: 'space-room', key: live.key, you: ws.session.id, host: live.host, members });
  }
  function leave(ws: WsConnection): void {
    const live = where.get(ws);
    if (!live) return;
    where.delete(ws);
    live.sockets.delete(ws);
    if (!live.sockets.size) { spaces.delete(live.key); return; }
    const ids = new Set([...live.sockets].map((s) => s.session.id));
    if (!live.host || !ids.has(live.host)) live.host = live.owner && ids.has(live.owner) ? live.owner : [...live.sockets][0]!.session.id;
    announce(live);
  }

  return {
    close(ws) { leave(ws); },
    messages: {
      'space-join': async (ws, message) => {
        const query = new URLSearchParams();
        query.set('target', typeof message.target === 'string' ? message.target : '');
        if (typeof message.host === 'string') query.set('host', message.host);
        if (typeof message.id === 'string') query.set('id', message.id);
        const seen = await ctx.store.read((db) => {
          const session = ctx.core.sessionByPublicId(db, ws.session.id);
          return session ? world.access(db, session, query) : null;
        });
        if (!seen) throw refuse('space_unavailable', 'This space is not open to you.');
        if (!seen.ok) throw refuse(seen.code, seen.reason);
        leave(ws);
        let live = spaces.get(seen.key);
        if (!live) { live = { key: seen.key, owner: seen.kind === 'home' ? seen.owner : null, host: null, sockets: new Set() }; spaces.set(seen.key, live); }
        if (new Set([...live.sockets].map((s) => s.session.id).concat(ws.session.id)).size > SPACE_LIVE.members) throw refuse('space_full', `At most ${SPACE_LIVE.members} people can be in a space together.`);
        live.sockets.add(ws);
        where.set(ws, live);
        // The owner hosts their own space; otherwise the first one in keeps hosting.
        if (!live.host || ws.session.id === live.owner) live.host = ws.session.id;
        announce(live);
      },
      'space-leave': (ws) => { leave(ws); },
      'space-tick': (ws, message) => {
        const live = where.get(ws);
        if (!live) return;
        // A little above the screen's own rate, so a burst after a slow frame is not refused; past it, ticks are dropped.
        if (!ctx.allow(`spaces:tick:${ws.session.id}`, SPACE_LIVE.hz * 60 + 60, 60_000)) return;
        const p = cleanPose(message.p);
        if (!p) return;
        const frame: Record<string, unknown> = { type: 'space-peer', id: ws.session.id, p };
        if (live.host === ws.session.id) {
          const o = message.o === undefined ? null : cleanObjects(message.o);
          if (o) frame['o'] = o;
          if (finite(message.s, 1e9)) frame['s'] = message.s;
          const say = message.say === undefined ? null : cleanSay(message.say);
          if (say) frame['say'] = say;
        }
        for (const other of live.sockets) if (other !== ws && other.session.id !== ws.session.id) send(other, frame);
      },
    },
  };
}
