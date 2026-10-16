/**
 * OWNER: games (real-time)
 * The replay of a finished arena match (src/arena/replay.ts), for the replay page and the clip renderer.
 *
 *   GET  /api/arena/replay/:id           PUBLIC, no session; limited per address. { id, at, clip, log } for a match that has FINISHED and is
 *                                        still on the shelf (server/growth/arena-replays.ts), else 404 `replay_unknown`. The log holds public
 *                                        names, the AI mark and the cosmetic look of each seat, never an id or the room code.
 *   GET  /api/arena/replay/:id?meta=1    only { id, game, clip } (a few bytes): the result screen asks this to know whether a clip exists.
 *   POST /api/arena/clip                 OPERATOR (bearer token, like /api/mod/): { id, url } says the rendered clip is at `url`.
 */
import { addressBucket } from '../host-context.ts';
import { arenaService } from '../growth/arena.ts';
import { clipAddress } from '../growth/arena-replays.ts';
import type { RouteContext, RouteHandler, RouteKey } from '../types.ts';

const ID = /^r-[a-z0-9]{10}$/;
export default function arenaRoutes(ctx: RouteContext): Record<RouteKey, RouteHandler> {
  const arena = arenaService(ctx);
  return {
    'GET /api/arena/replay/:id': async (request) => {
      if (!ctx.allow(`arena:replay:${addressBucket(request.ip)}`, 60, 60000)) throw Object.assign(ctx.fail(429, 'replay_rate_limited'), { reason: 'You are doing that too quickly. Wait a minute and try again.' });
      const id = request.params.id ?? '';
      const found = ID.test(id) ? arena.replay(id) : null;
      if (!found) throw Object.assign(ctx.fail(404, 'replay_unknown'), { reason: 'That replay is not on any more.' });
      const headers = { 'Cache-Control': 'public, max-age=60' };
      if (request.query.get('meta') === '1') return { body: { id: found.id, game: found.log.game, clip: found.clip }, headers };
      return { body: { id: found.id, at: found.at, clip: found.clip, log: found.log }, headers };
    },
    'POST /api/arena/clip': async (request) => {
      if (!request.moderator()) throw ctx.fail(401, 'operator_only');
      const body = await request.json() as { id?: unknown; url?: unknown };
      const url = clipAddress(body.url);
      if (typeof body.id !== 'string' || !ID.test(body.id) || !url) throw ctx.fail(400, 'invalid_clip');
      if (!arena.setClip(body.id, url)) throw ctx.fail(404, 'replay_unknown');
      return { body: { ok: true } };
    },
  };
}
