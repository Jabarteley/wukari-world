/**
 * THE MCP ENDPOINT: POST /mcp, the Model Context Protocol's "streamable HTTP" transport reduced to what a tool server needs: one JSON-RPC 2.0
 * request in, one JSON answer out, no stream and no session (stateless per request). Written by hand, no dependency.
 *
 *   initialize, notifications/initialized, ping, tools/list, tools/call.
 *
 * Authentication is a bearer AGENT KEY in the Authorization header, on every request. CORS is closed on purpose: agents are servers and
 * command-line programs, not web pages, so a request that carries an Origin header (a browser) is refused and no Access-Control header is
 * ever sent. The host maps /mcp to the route registered here (server/server.ts, deploy/cloudflare-worker.ts).
 */
import type { RouteContext, RouteKey, RouteRequest, SessionRecord } from '../types.ts';
import { renewSession } from '../protocol.ts';
import { AGENT_LIMITS } from './policy.ts';
import { bearerKey, hashOfKey, refusal } from './service.ts';
import type { Agent, AgentService } from './service.ts';
import { TOOLS } from './tools.ts';
import type { ToolContext, ToolDefinition, ToolOutput } from './tools.ts';
import { characterCity } from '../character.ts';
import type { RouteHandler } from '../types.ts';

export const MCP_PATH = '/mcp';
export const MCP_ROUTE = '/api/agents/mcp';
export const PROTOCOL_VERSIONS: readonly string[] = ['2025-06-18', '2025-03-26', '2024-11-05'];
const SERVER_INFO = { name: 'allworld', title: 'Allworld', version: '1.0.0' };
const INSTRUCTIONS = 'You are playing a life in Allworld, a persistent world shared with real people. Start with get_my_life. Look after hunger and energy, earn money by working or doing paid activities, and use get_goals when unsure what to do. Actions take real time: use wait_until_done. You play by the same rules as a person; if the game refuses something, read the reason and do what it says. Be honest and kind to people: they can see that an AI plays this character.';

type Json = Record<string, unknown>;
interface Rpc { jsonrpc: '2.0'; id?: string | number | null; method?: string; params?: unknown }
const isRecord = (value: unknown): value is Json => value !== null && typeof value === 'object' && !Array.isArray(value);
const ok = (id: Rpc['id'], result: object) => ({ jsonrpc: '2.0' as const, id: id ?? null, result });
const fault = (id: Rpc['id'], code: number, message: string, data?: Json) => ({ jsonrpc: '2.0' as const, id: id ?? null, error: { code, message, ...(data ? { data } : {}) } });

/** A small JSON-schema check for the schemas the tools declare: type, required, enum, bounds, pattern, no extra fields. A message for the agent, or null. */
function invalid(schema: Json, value: unknown, path = 'arguments'): string | null {
  const type = schema.type;
  if (type === 'object') {
    if (!isRecord(value)) return `${path} must be an object.`;
    const props = isRecord(schema.properties) ? schema.properties : {};
    for (const name of Array.isArray(schema.required) ? schema.required as string[] : []) if (value[name] === undefined) return `${path}.${name} is required.`;
    for (const [name, item] of Object.entries(value)) {
      if (!Object.hasOwn(props, name)) return `${path}.${name} is not a known field.`;
      const problem = invalid(props[name] as Json, item, `${path}.${name}`);
      if (problem) return problem;
    }
    return null;
  }
  if (type === 'string') {
    if (typeof value !== 'string') return `${path} must be a string.`;
    if (typeof schema.minLength === 'number' && value.length < schema.minLength) return `${path} is too short.`;
    if (typeof schema.maxLength === 'number' && value.length > schema.maxLength) return `${path} is too long (at most ${schema.maxLength} characters).`;
    if (typeof schema.pattern === 'string' && !new RegExp(schema.pattern).test(value)) return `${path} is not in the expected form.`;
    if (Array.isArray(schema.enum) && !schema.enum.includes(value)) return `${path} must be one of: ${schema.enum.join(', ')}.`;
    return null;
  }
  if (type === 'integer' || type === 'number') {
    if (typeof value !== 'number' || !Number.isFinite(value) || (type === 'integer' && !Number.isInteger(value))) return `${path} must be ${type === 'integer' ? 'a whole number' : 'a number'}.`;
    if (typeof schema.minimum === 'number' && value < schema.minimum) return `${path} must be at least ${schema.minimum}.`;
    if (typeof schema.maximum === 'number' && value > schema.maximum) return `${path} must be at most ${schema.maximum}.`;
    return null;
  }
  if (type === 'boolean') return typeof value === 'boolean' ? null : `${path} must be true or false.`;
  return null;
}

const listing = (tool: ToolDefinition) => ({ name: tool.name, description: tool.description, inputSchema: tool.inputSchema, annotations: { readOnlyHint: tool.readOnly, destructiveHint: false, openWorldHint: false } });

/** A thrown game or host refusal as what a tool answers: the sentence, never a stack or a path. */
function refused(error: unknown): { status: number; code: string; reason: string } | null {
  if (!isRecord(error) || typeof error.status !== 'number' || typeof error.code !== 'string') return null;
  const reason = typeof error.reason === 'string' ? error.reason : error.code === 'city_content_unavailable' ? 'The city is still loading. Try again in a moment.' : error.code === 'storage_unavailable' ? 'The game could not save just now. Nothing was changed; try again.' : `The game refused that (${error.code}).`;
  return { status: error.status, code: error.code, reason };
}

export function mcpRoutes(ctx: RouteContext, svc: AgentService): Record<RouteKey, RouteHandler> {
  /** The request, as the agent's character: its session in place of a browser cookie. */
  function asAgent(request: RouteRequest, agent: Agent): RouteRequest {
    const wrapped: RouteRequest = Object.create(request) as RouteRequest;
    const find = (db: Parameters<RouteRequest['session']>[0], renew: boolean): SessionRecord | undefined => {
      const stored = db.sessions[agent.session.secret];
      if (!stored || stored.publicId !== agent.session.publicId || !(stored.expiresAt > ctx.now())) return undefined;
      if (renew) renewSession(stored, ctx.now(), ctx.config.sessionTtlMs);
      wrapped.publicId = request.publicId = stored.publicId;
      wrapped.secret = request.secret = stored.secret;
      return stored;
    };
    wrapped.session = (db, options) => find(db, options?.renew === true);
    wrapped.requireSession = (db, options) => { const found = find(db, options?.renew === true); if (!found) throw ctx.fail(401, 'device_session_required'); return found; };
    wrapped.secret = agent.session.secret;
    return wrapped;
  }

  async function call(request: RouteRequest, agent: Agent, params: unknown): Promise<{ answer: Json; error?: boolean }> {
    const name = isRecord(params) ? params.name : undefined;
    const tool = TOOLS.find((item) => item.name === name);
    if (!tool) throw Object.assign(new Error('unknown_tool'), { rpc: -32602, text: `Unknown tool "${String(name).slice(0, 40)}". Call tools/list for the tools you may use.` });
    const args = isRecord(params) && isRecord(params.arguments) ? params.arguments : {};
    const problem = invalid(tool.inputSchema, args);
    let output: ToolOutput;
    const rid = typeof args.rid === 'string' ? args.rid : undefined;
    const context: ToolContext = { ctx, svc, agent, request: asAgent(request, agent) };
    try {
      if (problem) throw refusal(ctx, 400, 'invalid_arguments', problem);
      svc.admit(agent, { message: tool.message === true });
      output = await tool.run(context, args, rid);
    } catch (error) {
      const found = refused(error);
      if (!found) throw error;
      // A limit is the agent's to wait out, not a game refusal: it is told plainly and is not counted towards suspension.
      const limit = found.code === 'rate_limited' || found.code === 'daily_cap' || found.code === 'message_cap';
      output = { ok: false, code: found.code, refused: !limit && found.status < 500, data: { ok: false, code: found.code, result: found.reason, ...(limit ? { retry: found.code === 'rate_limited' ? 'Wait a little, then carry on.' : 'Try again later.' } : {}) } };
    }
    // One write after the call: counters, the audit trail, the "AI-played" mark.
    const done = await ctx.store.transact((db) => svc.record(db, agent, { tool: tool.name, ok: output.ok, code: output.code, ...(rid ? { rid } : {}), ...(output.aid ? { aid: output.aid } : {}), ...(output.sent ? { sent: true } : {}), ...(output.refused ? { refused: true } : {}), ...(output.facts ? { facts: output.facts } : {}) }),
      { durable: tool.readOnly ? false : true });
    if (done.announce) ctx.core.refreshNames(ctx.publicSession(done.announce));
    return { answer: { content: [{ type: 'text', text: JSON.stringify(output.data) }], structuredContent: output.data, isError: !output.ok }, error: !output.ok };
  }

  async function handle(request: RouteRequest, message: unknown, agent: Agent) {
    if (!isRecord(message) || message.jsonrpc !== '2.0' || typeof message.method !== 'string') return fault(isRecord(message) ? (message.id as Rpc['id']) : null, -32600, 'Send one JSON-RPC 2.0 request object.');
    const rpc = message as unknown as Rpc, id = rpc.id;
    const notification = id === undefined;
    switch (rpc.method) {
      case 'initialize': {
        const wanted = isRecord(rpc.params) && typeof rpc.params.protocolVersion === 'string' ? rpc.params.protocolVersion : '';
        return ok(id, { protocolVersion: PROTOCOL_VERSIONS.includes(wanted) ? wanted : PROTOCOL_VERSIONS[0], capabilities: { tools: { listChanged: false } }, serverInfo: SERVER_INFO, instructions: INSTRUCTIONS });
      }
      case 'ping': return notification ? null : ok(id, {});
      case 'tools/list': return notification ? null : ok(id, { tools: TOOLS.map(listing) });
      case 'tools/call': {
        if (notification) return null;
        try { return ok(id, (await call(request, agent, rpc.params)).answer); }
        catch (error) {
          const coded = isRecord(error) && typeof error.rpc === 'number' ? error : null;
          if (coded) return fault(id, coded.rpc as number, String(coded.text));
          throw error;
        }
      }
      default:
        if (notification || rpc.method.startsWith('notifications/')) return null;
        return fault(id, -32601, `Method not found: ${rpc.method.slice(0, 60)}. This server offers initialize, ping, tools/list and tools/call.`);
    }
  }

  return {
    'POST /api/agents/mcp': async (request) => {
      const bare = (status: number, body: object, headers?: Record<string, string>) => ({ status, body, bare: true as const, ...(headers ? { headers } : {}) });
      try {
        if (request.header?.('origin')) throw refusal(ctx, 403, 'origin_rejected', 'Agent access is not for web pages. Connect from a program, not a browser.');
        const secret = bearerKey(request.header?.('authorization'));
        if (!secret) throw refusal(ctx, 401, 'invalid_key', 'Send your agent key as "Authorization: Bearer awk_…". Make one in Settings, AI agents.');
        const hash = hashOfKey(secret);
        let agent: Agent;
        try { agent = await ctx.store.read((db) => svc.authenticate(db, hash)); }
        catch (error) {
          // Guessing keys is slowed down per address; a wrong key learns nothing but that it is wrong.
          if (refused(error)?.code === 'invalid_key' && !ctx.allow(`agent:badkey:${request.ip}`, 30, 600000)) throw Object.assign(refusal(ctx, 429, 'rate_limited', 'Too many wrong keys from this address. Try again in a few minutes.'), { retryAfter: 300 });
          throw error;
        }
        const city = characterCity(agent.session);
        if (city && city !== agent.cityId) agent = { ...agent, cityId: city };
        let message: unknown;
        try {
          const bytes = await request.rawBody?.(AGENT_LIMITS.bodyBytes);
          message = JSON.parse(new TextDecoder('utf-8', { fatal: true }).decode(bytes));
        } catch (error) {
          if (refused(error)?.status === 413) throw error;
          return bare(200, fault(null, -32700, 'The request body is not valid JSON.'));
        }
        const answer = await handle(request, message, agent);
        return answer === null ? bare(202, {}) : bare(200, answer);
      } catch (error) {
        const found = refused(error);
        if (!found) throw error;
        const retry = isRecord(error) && typeof error.retryAfter === 'number' ? { 'Retry-After': String(Math.ceil(error.retryAfter)) } : undefined;
        return bare(found.status === 400 || found.status === 413 ? 400 : found.status, fault(null, -32001, found.reason, { code: found.code }), retry);
      }
    },
    'GET /api/agents/mcp': () => ({ status: 405, bare: true as const, body: fault(null, -32000, 'This server answers POST /mcp only (no event stream).') }),
    'DELETE /api/agents/mcp': () => ({ status: 405, bare: true as const, body: fault(null, -32000, 'This server keeps no session to end.') }),
  };
}
