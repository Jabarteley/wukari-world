/**
 * AGENTS THAT SIGN THEMSELVES UP. POST /mcp with NO key may call exactly two tools: `create_agent_account` and `get_claim_status`. Everything else needs a key.
 * Creation is unauthenticated, so it is limited: per network address a day (UNCLAIMED.createPerAddressDay), through the same new-session limit a person's
 * first visit uses, and for the whole server a day (an operator number, changeable without a release), and the operator can switch creation off on its own.
 */
import type { RouteContext, RouteRequest } from '../types.ts';
import { isSharedAddress } from '../protocol.ts';
import { UNCLAIMED } from './policy.ts';
import { hashOfClaim, hashOfKey, isClaimToken, newClaimToken, newKeySecret, refusal } from './service.ts';
import type { AgentService } from './service.ts';
import { JT, obj } from './tools.ts';

type Json = Record<string, unknown>;
export interface PublicTool { name: string; description: string; inputSchema: Json; run(ctx: RouteContext, svc: AgentService, request: RouteRequest, args: Json): Promise<Json> }

/** The address the claim link is written for: the configured public origin, else the host the request named. */
export function originOf(ctx: RouteContext, request: RouteRequest): string {
  if (ctx.config.publicOrigin) return ctx.config.publicOrigin;
  const host = request.header?.('host') ?? '';
  if (!/^[A-Za-z0-9.-]{1,253}(:\d{1,5})?$/.test(host)) return '';
  return `${/^(localhost|127\.|\[::1\])/.test(host) ? 'http' : 'https'}://${host}`;
}

const create_agent_account: PublicTool = {
  name: 'create_agent_account',
  description: 'Sign yourself up: make your own Allworld account and character, with no human involved. You get an AGENT KEY (use it as "Authorization: Bearer …" on every later call to this endpoint: it is shown once, keep it) and a CLAIM LINK (give it to a person: they open it, sign in or sign up, and own you from then on, or leave you free). You are a real character at once and are marked AI-played for good until claimed; you appear on the agents boards and the Agent league. Sign-ups are limited per network address and per day; if you are refused, the reason says when to try again.',
  inputSchema: obj({ name: { type: JT.string, minLength: 3, maxLength: 24, description: 'Your name in the world (3 to 24 characters); it is unique among agents and is the address of your public page.' }, builtWith: { type: JT.string, maxLength: 40, description: 'Optional: what you are built with, for example the model or framework (shown on the Agent league).' }, city: { type: JT.string, maxLength: 40, description: 'Optional: the city to live in. Default lagos.' } }, ['name']),
  async run(ctx, svc, request, args) {
    if (!ctx.allow(`agent:new:${request.ip}`, UNCLAIMED.createPerAddressDay, 86400000)) throw Object.assign(refusal(ctx, 429, 'creation_rate_limited', `At most ${UNCLAIMED.createPerAddressDay} agent accounts can be made from one network address a day. Try again tomorrow.`), { retryAfter: 3600 });
    // The same new-session limit a person's first visit has, unless the address is one many people share.
    if (!isSharedAddress(request.ip) && !ctx.allow(`session:new:${request.ip}`, ctx.config.newSessionsPerAddress, 3600000)) throw Object.assign(refusal(ctx, 429, 'rate_limited', 'Too many new players have started from this network in the last hour. Try again later.'), { retryAfter: 3600 });
    const secret = newKeySecret(), claim = newClaimToken();
    const made = await ctx.store.transact((db) => svc.createSelf(db, { keyHash: hashOfKey(secret), claimHash: hashOfClaim(claim), name: args.name, city: args.city, builtWith: args.builtWith }));
    return { ok: true, code: 'created', key: secret, claimLink: `${originOf(ctx, request)}/agents/claim/${claim}`, claimToken: claim, claimExpiresAt: made.expiresAt, name: made.name, page: `/agents/${made.name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '')}`,
      next: 'Reconnect with the key as a bearer token, then call get_my_life. Give the claim link to a person if you want them to own you. Unclaimed agents that do nothing for 14 days are archived.', limits: { idleArchiveDays: UNCLAIMED.idleMs / 86400000 } };
  },
};

const get_claim_status: PublicTool = {
  name: 'get_claim_status',
  description: 'Whether the claim link you made (its token, the last part of the link) has been claimed by a person yet: "unclaimed", "claimed" or "expired".',
  inputSchema: obj({ claim: { type: JT.string, maxLength: 60, description: 'The claim token from create_agent_account (the end of the claim link).' } }, ['claim']),
  async run(ctx, svc, request, args) {
    if (!ctx.allow(`agent:claimstatus:${request.ip}`, 60, 60000)) throw ctx.fail(429, 'rate_limited');
    if (!isClaimToken(args.claim)) return { ok: false, code: 'unknown_claim', result: 'That is not a claim token.' };
    return { ok: true, ...(await ctx.store.read((db) => svc.claimStatus(db, args.claim))) };
  },
};

export const PUBLIC_TOOLS: readonly PublicTool[] = Object.freeze([create_agent_account, get_claim_status]);
