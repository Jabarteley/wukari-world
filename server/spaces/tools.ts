/**
 * OWNER: spaces
 * The agent tools of AI Spaces (docs/SKILLS.md, docs/AGENTS.md): what the Allworld skill for Claude calls through the MCP server with a
 * player's agent key. Thin wrappers over the player's own routes (/api/spaces/check and /api/spaces/apply, server/spaces/service.ts),
 * run in-process as the character's request, so every rule a tap in the game meets holds here: the text filter on the title, the
 * placement rules, the scene budget, cash through the ordinary furniture actions, membership of a group room, the hourly limits.
 * A plan is data: nothing in it runs.
 */
import { callRoute } from '../agents/tools-more.ts';
import { JT, obj, str } from '../agents/tools.ts';
import type { ToolContext, ToolDefinition, ToolOutput } from '../agents/tools.ts';

type Json = Record<string, unknown>;
const isRecord = (value: unknown): value is Json => value !== null && typeof value === 'object' && !Array.isArray(value);
const WHERE = { target: { type: JT.string, enum: ['home', 'room'] }, roomId: { type: JT.string, maxLength: 20 }, plan: { type: JT.object, additionalProperties: true } };

async function route(c: ToolContext, path: string, body: Json): Promise<ToolOutput> {
  const answer = await callRoute(c, 'POST', path, body);
  const result = isRecord(answer.body) ? answer.body : {};
  const ok = answer.status < 400 && result.ok === true;
  return { ok, code: typeof result.code === 'string' ? result.code : ok ? 'ok' : 'refused', refused: !ok, data: result };
}
const where = (args: Json): Json => ({ target: str(args.target) ?? 'home', ...(str(args.roomId) ? { roomId: str(args.roomId) } : {}), plan: isRecord(args.plan) ? args.plan : {} });

const check_space: ToolDefinition = {
  name: 'check_space', readOnly: true,
  description: 'Check a Space Plan (docs/SPACES.md: { schema: "allworld-space", version: 1, target, tier?, style?, title?, items: [{ itemId, x, y, rot, floor? }] }) against your real home (target "home") or a group room you are a member of (target "room" with roomId "g.<n>"). Answers the plan as it would stand, every piece that moved or was left out with the reason, and what it would cost you. Changes nothing.',
  inputSchema: obj(WHERE, ['target', 'plan']),
  async run(c, args) { return route(c, '/api/spaces/check', where(args)); },
};

const import_space: ToolDefinition = {
  name: 'import_space', readOnly: false,
  description: 'Make your home (you must be at home) or a group room you are a member of the given Space Plan. Pieces you own are reused, the rest are bought with your own naira at the shop price, and pieces the plan does not use go to storage; a group room is free. Run check_space first. Answers what was placed and spent, or why nothing changed.',
  inputSchema: obj(WHERE, ['target', 'plan']),
  async run(c, args) { return route(c, '/api/spaces/apply', { ...where(args), requestId: `${c.ctx.now()}:${c.ctx.randomId()}` }); },
};

export const SPACE_TOOLS: readonly ToolDefinition[] = Object.freeze([check_space, import_space]);
