/**
 * OWNER: spaces (lite games)
 * PLAYER-MADE LITE GAMES on the server (docs/SPACES.md, "Lite games"): a player (or Claude through the Allworld skill and the agent tool
 * import_game) imports a definition (src/arena/lite/schema.ts); it is checked, its words pass the text filter and agentWords, and it is
 * stored and made playable by the one lite engine (src/arena/lite/rules.ts registerLite). A room is then opened as for any arena game,
 * `game: 'lite'` with the option `game: <id>`, and friends join by its code. No code of the author runs anywhere.
 *
 * STORED (additive, spaces collection): spaces.games[id] = { def, by, at, title }   id = 'l' + 8 characters.
 * At most GAMES.perPlayer a player; forgotten GAMES.days days after it was made; erased with its maker (eraseSpaces). Registered with the
 * engine when the server starts (ctx.startup) and when imported. Private: a game is reached by its id or a room code, never listed for
 * strangers (a public listing would need the admin review the plan describes; not built).
 */
import { screenText } from '../moderation/text.ts';
import { agentWords } from '../moderation/agent-words.ts';
import { forgetLite, liteDef, registerLite } from '../../src/arena/lite/rules.ts';
import { LITE_EXAMPLES } from '../../src/arena/lite/examples.ts';
import { liteWords, readLite, type LiteGameV1 } from '../../src/arena/lite/schema.ts';
import { spacesOf } from './store.ts';
import type { Db, RouteContext, SessionRecord } from '../types.ts';

export const GAMES = Object.freeze({ perPlayer: 20, days: 30, importsPerHour: 20 });
export interface StoredGame { def: LiteGameV1; by: string; at: number; title: string }
const DAY = 86400000;
const no = (code: string, reason: string) => ({ ok: false as const, code, reason });

const services = new WeakMap<RouteContext, ReturnType<typeof build>>();
export function gamesService(ctx: RouteContext) {
  const found = services.get(ctx);
  if (found) return found;
  const made = build(ctx);
  services.set(ctx, made);
  return made;
}

const gamesOf = (db: Db): Record<string, StoredGame> => {
  const col = spacesOf(db) as unknown as { games?: Record<string, StoredGame> };
  return col.games ??= {};
};
const peek = (db: Db): Record<string, StoredGame> => ((db as { spaces?: { games?: Record<string, StoredGame> } }).spaces?.games ?? {});

function build(ctx: RouteContext) {
  // The stored games become playable when the server starts.
  ctx.startup?.push(ctx.store.read((db) => {
    const t = ctx.now();
    for (const [id, game] of Object.entries(peek(db))) if (game.at > t - GAMES.days * DAY) { const read = readLite(game.def); if (read.def) registerLite(id, read.def); }
  }));
  const newId = (taken: Record<string, unknown>): string => {
    for (let tries = 0; tries < 8; tries++) { const id = `l${ctx.randomId().replace(/[^0-9a-f]/g, '').slice(0, 8)}`; if (!Object.hasOwn(taken, id)) return id; }
    throw ctx.fail(503, 'busy');
  };
  const summary = (id: string, game: { title: string; def: LiteGameV1 }, mine: boolean) => ({ id, title: game.title, seats: game.def.seats, win: game.def.rules.win, controls: game.def.controls, mine });

  return {
    /** POST /api/spaces/games { def } inside a transaction: check, filter, store, register. */
    importGame(db: Db, session: SessionRecord, body: Record<string, unknown>) {
      const read = readLite(body.def);
      if (!read.def) return { ...no('invalid_game', `That game cannot be played: ${read.problems.slice(0, 3).join(' ')}`), problems: read.problems };
      for (const words of liteWords(read.def)) {
        const blocked = screenText(words, { contact: true, what: 'A name in that game' });
        if (blocked) return no(blocked.code, blocked.reason);
        if (!agentWords(words, { toMinor: true }).ok) return no('text_blocked', 'A name in that game was not accepted. Change the wording and try again.');
      }
      const muted = ctx.checks?.muted?.(session.publicId);
      if (muted) return no(muted.code, muted.reason);
      if (!ctx.allow(`spaces:games:${session.publicId}`, GAMES.importsPerHour, 3600000)) return no('rate_limited', 'You have made many games this hour. Wait a little.');
      const games = gamesOf(db), t = ctx.now();
      for (const [id, game] of Object.entries(games)) if (game.at <= t - GAMES.days * DAY) { delete games[id]; forgetLite(id); }
      const mine = Object.entries(games).filter(([, game]) => game.by === session.publicId).sort((a, b) => a[1].at - b[1].at);
      // The oldest of a player's games makes room for a new one.
      while (mine.length >= GAMES.perPlayer) { const [id] = mine.shift()!; delete games[id]; forgetLite(id); }
      const id = newId(games);
      games[id] = { def: read.def, by: session.publicId, at: t, title: read.def.title };
      registerLite(id, read.def);
      return { ok: true as const, code: 'imported', game: summary(id, games[id]!, true) };
    },
    /** GET /api/spaces/games: the built-in games and the caller's own. */
    list(db: Db, session: SessionRecord) {
      const own = Object.entries(peek(db)).filter(([, game]) => game.by === session.publicId).map(([id, game]) => summary(id, game, true));
      return { ok: true as const, code: 'ok', games: [...LITE_EXAMPLES.map(({ id, def }) => summary(id, { title: def.title, def }, false)), ...own] };
    },
    /** GET /api/spaces/game?id= : a definition, for the screen that draws it (anyone holding the id or a room code may play it). */
    one(id: unknown) {
      const def = liteDef(id);
      return def ? { ok: true as const, code: 'ok', def } : no('unknown_game', 'That game is not here any more.');
    },
  };
}
