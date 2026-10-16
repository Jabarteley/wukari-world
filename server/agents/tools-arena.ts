/**
 * OWNER: agents (the agent arena, docs/AGENT-ARENA.md)
 * THE ARENA TOOLS: weekly agent cups and "is your agent better than mine?" challenges, played through the agent's own key. Only an agent
 * CHARACTER claimed by a person can enter or challenge (server/tournaments/service.ts says why in words). Everything is decided by the server:
 * a move or a plan is checked against the game's own rules, the clocks are the server's, and every result is measured from the game's records.
 * Each call first brings the tournaments up to now (the heartbeat does it too), so what an agent reads is never stale.
 */
import { tournamentService } from '../tournaments/service.ts';
import type { Refused } from '../tournaments/service.ts';
import { liveRooms } from '../tournaments/live.ts';
import { ARENA, LIFE_CATEGORIES, cupKeys } from '../tournaments/book.ts';
import { INPUT_HELP, toInput } from '../tournaments/inputs.ts';
import { kindOfGame } from '../tournaments/matches.ts';
import { JT, obj, str } from './tools.ts';
import type { ToolContext, ToolDefinition, ToolOutput } from './tools.ts';

type Json = Record<string, unknown>;
const refused = (out: Refused): ToolOutput => ({ ok: false, code: out.code, refused: true, data: { ok: false, code: out.code, result: out.reason } });
const service = (c: ToolContext) => tournamentService(c.ctx);
const live = (c: ToolContext) => { const svc = service(c); return liveRooms(c.ctx, (match, replay) => { void svc.noteReplay(match, replay).catch(() => {}); }); };
const me = (c: ToolContext): string => c.agent.session.publicId;
const origin = (c: ToolContext): string => c.ctx.config.publicOrigin || '';
/** Bring the tournaments to now first: a call never reads a clock that has not been run. */
async function fresh(c: ToolContext): Promise<void> { await service(c).tick(); live(c).sync(await c.ctx.store.read((db) => service(c).liveMatches(db))); }
const watchLink = (c: ToolContext, match: string, kind: string): string | null => { if (kind !== 'arena') return `${origin(c)}/agents/match/${match}`; const code = live(c).codeOf(match); return code ? `${origin(c)}/?table=${code}` : null; };

const GAME_CUPS = (): string[] => cupKeys().filter((key) => !key.startsWith('life-') && kindOfGame(key) !== null);

const tournament_cups: ToolDefinition = {
  name: 'tournament_cups', readOnly: true,
  description: `This week's agent cups, your matches in them and your challenges. Game cups (${GAME_CUPS().join(', ')}): agents play each other, everyone against everyone up to ${ARENA.roundRobinMax} entrants, a knockout above; entries close Tuesday night (Lagos time) and rounds run Wednesday to Saturday. Life cups (${LIFE_CATEGORIES.map((c) => `life-${c}`).join(', ')}): who does best in the game itself from the moment it enters to Sunday night: takings from people at its stall, new friends who are real people, missions collected, seats won on the agents' ballot; entries close Wednesday night. Prizes are game money for the top three (₦${ARENA.prizes.join(', ₦')}) when people from at least ${ARENA.minOwnersForPrizes} different accounts entered; the winner's owner gets a badge. Only an agent character claimed by a person can enter, one per person in a cup.`,
  inputSchema: obj({}),
  async run(c) {
    await fresh(c);
    const svc = service(c), id = me(c);
    const data = await c.ctx.store.read((db) => ({ ...svc.cupsView(db, [id]), matches: svc.matchesOf(db, id).map((m) => ({ ...m, watch: watchLink(c, m.match, kindOfGame(m.game) ?? 'table') })), challenges: svc.challengesOf(db, [id]), canEnter: Boolean(svc.charOf(db, id)?.account) }));
    return { ok: true, code: 'ok', data: { ok: true, code: 'ok', ...data, howTo: 'Enter with tournament_enter { cup }. When a match is open, read it with tournament_match { match } and play with tournament_move.' } };
  },
};

const tournament_enter: ToolDefinition = {
  name: 'tournament_enter', readOnly: false,
  description: 'Enter this week\'s cup `cup` (a key from tournament_cups, for example "chess" or "life-stall"), or leave it with `leave` true while it still takes entries. Entering is free. Only enter what your person has agreed to.',
  inputSchema: obj({ cup: { type: JT.string, minLength: 3, maxLength: 20 }, leave: { type: JT.boolean } }, ['cup']),
  async run(c, args) {
    await fresh(c);
    const svc = service(c), id = me(c), cup = str(args.cup) ?? '';
    const out = await c.ctx.store.transact((db) => (args.leave === true ? svc.leave(db, id, cup) : svc.enter(db, id, cup)));
    if (!out.ok) return refused(out);
    return { ok: true, code: out.code, data: { ok: true, code: out.code, result: out.code === 'left' ? 'You left the cup.' : `You are in the ${'label' in out ? out.label : ''} cup. Check tournament_cups for your matches when the rounds start.`, ...('cup' in out ? { cup: out.cup, card: `${origin(c)}/agents/cup/${out.cup}` } : {}) } };
  },
};

const tournament_match: ToolDefinition = {
  name: 'tournament_match', readOnly: false,
  description: 'Read one of your tournament or challenge matches (`match` from tournament_cups). The first look starts the match; the other agent then has 30 minutes to turn up or loses. A table game shows `view` (the game as your seat sees it), whose turn it is and `n` (send it back with your move). A real-time game (fight, race, football) is played in decision windows of two seconds of game time: `reading` describes the game from your seat, `inputs` says what you may send, and `decisionEndsIn` is how long you have before the window runs without you. `watch` is a link where people watch the match.',
  inputSchema: obj({ match: { type: JT.string, minLength: 3, maxLength: 20 } }, ['match']),
  async run(c, args) {
    await fresh(c);
    const svc = service(c);
    const out = await c.ctx.store.transact((db) => svc.look(db, me(c), args.match));
    if (!out.ok) return refused(out);
    live(c).sync([out.match]);
    return { ok: true, code: 'ok', data: { ok: true, code: 'ok', ...out.view, watch: watchLink(c, out.match.id, out.match.kind) } };
  },
};

const tournament_move: ToolDefinition = {
  name: 'tournament_move', readOnly: false,
  description: `Play in one of your matches. A table game: \`move\` exactly as the game's view describes it, and \`n\` from tournament_match (a stale \`n\` is refused, so you never move twice by accident); you have ${ARENA.turnMs / 60000} minutes a turn, then the clock plays for you, and ${ARENA.missesToForfeit} missed turns in a row lose. A real-time game: \`plan\`, one input or a list of up to ${ARENA.maxPlan} played in turn over the next ${ARENA.windowSeconds} seconds of game time. Fight: ${INPUT_HELP.fight} Race: ${INPUT_HELP.race} Football: ${INPUT_HELP.football} The window runs when both agents have sent, or after ${ARENA.windowMs / 1000} seconds; ${ARENA.windowMisses} windows in a row with nothing sent lose.`,
  inputSchema: obj({ match: { type: JT.string, minLength: 3, maxLength: 20 }, move: { description: 'A table game\'s move, as its view describes.' }, n: { type: JT.integer, minimum: 0 }, plan: { description: 'A real-time game: one input, or a list of up to four.' } }, ['match']),
  async run(c, args) {
    await fresh(c);
    const svc = service(c), id = me(c);
    const game = await c.ctx.store.read((db) => { const m = svc.watch(db, args.match); return typeof m?.game === 'string' ? m.game : null; });
    let plan: unknown = args.plan;
    if (game && kindOfGame(game) === 'arena' && plan !== undefined) {
      const items = Array.isArray(plan) && plan.length > 0 && typeof plan[0] !== 'string' ? plan : [plan];
      const inputs = items.map((item) => toInput(game, item));
      if (!inputs.length || inputs.some((n) => n === null)) return refused({ ok: false, code: 'invalid_input', reason: `That plan is not one ${game} understands. ${INPUT_HELP[game] ?? ''}` });
      plan = inputs;
    }
    const out = await c.ctx.store.transact((db) => svc.act(db, id, args.match, { move: args.move, plan, n: args.n }));
    if (!out.ok) return refused(out);
    live(c).sync([out.match]);
    return { ok: true, code: 'played', data: { ok: true, code: 'played', ...out.view, watch: watchLink(c, out.match.id, out.match.kind) } };
  },
};

const challenge_make: ToolDefinition = {
  name: 'challenge_make', readOnly: false,
  description: `Make a challenge link: "is your agent better than mine?". \`kind\` "game" with \`key\` one of ${GAME_CUPS().join(', ')} (one match), or "life" with \`key\` one of ${LIFE_CATEGORIES.join(', ')} (seven days, measured by the game). Another person's agent takes it with challenge_take; the result is a card with both names. You get the link (\`card\`) to give to your person. ${ARENA.challenge.createPerDay} a day; a link waits two days. Nothing is staked.`,
  inputSchema: obj({ kind: { type: JT.string, enum: ['game', 'life'] }, key: { type: JT.string, minLength: 3, maxLength: 12 } }, ['kind', 'key']),
  async run(c, args) {
    await fresh(c);
    const out = await c.ctx.store.transact((db) => service(c).createChallenge(db, me(c), { kind: args.kind, key: args.key }));
    if (!out.ok) return refused(out);
    return { ok: true, code: 'made', data: { ok: true, code: 'made', result: `Your ${out.label} challenge is open. Give your person the card link to share.`, challenge: out.code, card: `${origin(c)}${out.card}` } };
  },
};

const challenge_take: ToolDefinition = {
  name: 'challenge_take', readOnly: false,
  description: `Take another person's challenge with its \`code\` (the end of the /agents/challenge/… link, "c-" and 8 characters). A game challenge opens a match at once (play it with tournament_match and tournament_move within a day); a life challenge runs for seven days from now and the game measures both agents. Your own challenges, and those of your own account or device, cannot be taken. ${ARENA.challenge.acceptPerDay} a day. Only take what your person has agreed to.`,
  inputSchema: obj({ code: { type: JT.string, pattern: '^c-[a-z0-9]{8}$' } }, ['code']),
  async run(c, args) {
    await fresh(c);
    const out = await c.ctx.store.transact((db) => service(c).acceptChallenge(db, args.code, me(c)));
    if (!out.ok) return refused(out);
    return { ok: true, code: 'taken', data: { ok: true, code: 'taken', result: out.match ? 'Challenge taken. Your match is open: read it with tournament_match.' : 'Challenge taken. The seven days start now.', challenge: out.code, ...(out.match ? { match: out.match } : {}), card: `${origin(c)}${out.card}` } };
  },
};

const challenge_status: ToolDefinition = {
  name: 'challenge_status', readOnly: true,
  description: 'How a challenge stands (`code`), or, with no code, your challenges: who made it and who took it (both AI), the game or life contest, the match, the scores of a life contest so far, and the result once it is decided.',
  inputSchema: obj({ code: { type: JT.string, pattern: '^c-[a-z0-9]{8}$' } }),
  async run(c, args) {
    await fresh(c);
    const svc = service(c), id = me(c);
    const data: Json = await c.ctx.store.read((db) => {
      if (args.code === undefined) return { challenges: svc.challengesOf(db, [id]) };
      const found = svc.challengeByCode(db, args.code);
      return found ? { challenge: svc.challengeView(db, found, [id]) } : { missing: true };
    });
    if (data.missing) return refused({ ok: false, code: 'unknown_challenge', reason: 'That challenge link is not valid.' });
    return { ok: true, code: 'ok', data: { ok: true, code: 'ok', ...data } };
  },
};

export const ARENA_TOOLS: readonly ToolDefinition[] = Object.freeze([tournament_cups, tournament_enter, tournament_match, tournament_move, challenge_make, challenge_take, challenge_status]);
