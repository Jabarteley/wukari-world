/**
 * The open-mode routes (the page panel and `npm run dev:fund` / `dev:seed` call them). They live under /api/account/open-dev/
 * so the admin address, which answers only account and admin routes, can reach the operator one. They exist only on a host that
 * started in open mode (server/open-dev/index.ts); the normal route table does not list them.
 *
 *   GET  /api/account/open-dev                the mode, what it changed, and who the caller is
 *   GET|POST /api/account/open-dev/operator   sign this browser in as the local operator (founder: admin and moderation tools)
 *   POST /api/account/open-dev/fund           { name?, amount? }  top a player's lives up to the open-mode amount (or add `amount`)
 *   POST /api/account/open-dev/trust          { name?, tier? }    set a player's trust tier in one step (default phone, adult declared)
 *   POST /api/account/open-dev/seed           make a few local players, friends of the caller (or of every local player)
 */
import { randomUUID } from 'node:crypto';
import { accountId, adoptNewSession, signIn } from '../accounts/service.ts';
import type { AccountDeps } from '../accounts/service.ts';
import type { VerifiedIdentity } from '../accounts/token.ts';
import { growthOf, playerOf } from '../growth/data.ts';
import { hasLife } from '../host-context.ts';
import { socialService } from '../social/service.ts';
import { emailHash } from '../social/founder.ts';
import { trustOf } from '../trust/service.ts';
import { cityRules } from '../../src/game/content/world.ts';
import { isVerifiedTier } from '../../src/game/trust/tiers.ts';
import type { VerifiedTier } from '../../src/game/trust/tiers.ts';
import type { CityId } from '../../src/types/protocol.ts';
import type { AccountRecord, Db, RouteContext, RouteHandler, RouteKey, RouteRequest, SessionRecord } from '../types.ts';
import { OPERATOR_EMAIL, type OpenDevConfig } from './config.ts';
import { fundLife, topUp } from './life.ts';

const DAY = 86400000;
/** The local players `dev:seed` makes: a name each, and which of the open cities they live in (round robin). */
export const SEED_NAMES = ['Dev Ada', 'Dev Tunde', 'Dev Ngozi', 'Dev Musa'] as const;
const OPERATOR_SUBJECT = 'open-dev-operator';

export default function openDevRoutes(ctx: RouteContext, config: OpenDevConfig): Record<RouteKey, RouteHandler> {
  const { store, now, fail } = ctx;
  const deps = (): AccountDeps => ({ now, ttlMs: ctx.config.sessionTtlMs, tokenMaxAgeMs: 3600000, newId: () => ctx.core.newId(), newSecret: () => ctx.core.newIdentity().secret, archive: (db, secret, session) => ctx.core.archiveSession(db, secret, session), fail });
  const refuse = (status: number, code: string, reason: string) => Object.assign(fail(status, code), { reason });
  const mustBeSameOrigin = (request: RouteRequest): void => { if (request.strictOrigin !== true) throw refuse(403, 'origin_required', 'Open-mode changes come from this page or from the dev scripts (they send an Origin header).'); };
  const text = (value: unknown, max = 40): string => (typeof value === 'string' ? value.trim().slice(0, max) : '');
  const openCities = (): CityId[] => ctx.cityIds.filter((id) => cityRules(id)?.status === 'open');

  const named = (db: Db, name: string): SessionRecord | undefined => Object.values(db.sessions).find((session) => session.name.toLowerCase() === name.toLowerCase());
  /** The player a request is about: the one named, else the caller. */
  function targetOf(db: Db, request: RouteRequest, body: Record<string, unknown>): SessionRecord {
    const name = text(body.name);
    const found = name ? named(db, name) : request.session(db);
    if (!found) throw refuse(404, name ? 'no_such_player' : 'device_session_required', name ? `No local player is called "${name}".` : 'Start a life first (open the game once), or give a name.');
    return found;
  }

  /** A local account for a session that has none, made directly (no browser holds it: seeded players). */
  function localAccount(db: Db, session: SessionRecord, subject: string, email: string): AccountRecord {
    const accounts = (db.accounts ??= {}), id = accountId(subject), at = now();
    const account = accounts[id] ??= { v: 1, id, provider: 'password', subject, email, createdAt: at - 30 * DAY, lastSeenAt: at, sessionKey: session.secret, publicId: session.publicId, devices: [], parked: [], mailOptIn: true };
    session.account = id;
    account.sessionKey = session.secret; account.publicId = session.publicId;
    return account;
  }
  /** The tier, an adult declaration, and an account old enough that no new-account wait applies. */
  function setTrust(db: Db, session: SessionRecord, tier: VerifiedTier): void {
    const account = db.accounts?.[session.account ?? ''];
    if (!account) throw refuse(409, 'account_required', 'This player has no local account yet.');
    account.createdAt = Math.min(account.createdAt, now() - 30 * DAY);
    trustOf(ctx, db).players[session.publicId] = { tier, by: 'admin', at: now(), account: account.id, adultVerified: true };
    const player = playerOf(growthOf(ctx, db), session.publicId);
    if (player) player.consent = { age: 'adult', push: player.consent?.push === true, email: player.consent?.email === true, at: now() };
  }
  const livesOf = (session: SessionRecord): CityId[] => Object.keys(session.cities ?? {}) as CityId[];
  function fundSession(db: Db, session: SessionRecord, amount: number | null): number {
    let funded = 0;
    for (const city of livesOf(session)) {
      const life = ctx.settle(session, city);
      if (amount === null ? topUp(life, city, now(), config.cash) : fundLife(life, city, now(), amount)) funded += 1;
    }
    return funded;
  }

  /** Sign the caller in as the operator (the founder of this local world): the account, its character, trust, and the account's age. */
  async function becomeOperator(request: RouteRequest) {
    const at = now();
    const identity: VerifiedIdentity = { subject: OPERATOR_SUBJECT, email: OPERATOR_EMAIL, emailVerified: true, provider: 'password', issuedAt: at, authAt: at, expiresAt: at + 3600000, digest: randomUUID() };
    const result = await store.transact((db) => {
      const accountDeps = deps();
      let cookie = request.cookie, session = request.session(db);
      const known = db.accounts?.[accountId(OPERATOR_SUBJECT)]?.sessionKey;
      // A browser with no life of its own gets one for the operator account, unless that account already has one to come back to.
      if (!session && !(known && db.sessions[known])) {
        const made = ctx.core.newIdentity();
        session = db.sessions[made.secret] = { secret: made.secret, publicId: made.publicId, name: 'Operator', expiresAt: at + ctx.config.sessionTtlMs, cities: {}, actions: {} };
        cookie = made.secret;
      }
      const out = signIn(db, accountDeps, { cookie, binding: request.binding, identity });
      if (!out.character) {
        const made = ctx.core.newIdentity();
        adoptNewSession(db, accountDeps, out.cookie, { secret: made.secret, publicId: made.publicId, name: 'Operator', expiresAt: at + ctx.config.sessionTtlMs, cities: {}, actions: {} });
      }
      const account = db.accounts?.[accountId(OPERATOR_SUBJECT)];
      const character = account?.sessionKey ? db.sessions[account.sessionKey] : undefined;
      if (character) setTrust(db, character, 'id');
      return { cookie: out.cookie, outcome: out.outcome, name: character?.name ?? 'Operator', publicId: character?.publicId ?? null };
    });
    ctx.core.log?.('Open dev mode: this browser is signed in as the local operator.');
    return { body: { ok: true, outcome: result.outcome, operator: true, name: result.name, next: 'Open /api/admin/me or the admin page on admin.localhost with this browser.' }, headers: { 'Set-Cookie': ctx.core.cookieHeader(request, result.cookie) } };
  }

  async function trust(request: RouteRequest) {
    mustBeSameOrigin(request);
    const body = await request.json(), asked = body.tier ?? 'phone';
    if (!isVerifiedTier(asked)) throw refuse(400, 'invalid_tier', 'The tier is phone, id or business.');
    const result = await store.transact((db) => {
      const session = targetOf(db, request, body), at = now();
      if (session.account !== undefined && db.accounts?.[session.account]) { setTrust(db, session, asked); return { name: session.name, cookie: null as string | null }; }
      if (session === request.session(db)) {
        // The caller is a guest: sign this browser in to a local account of its own (the same life, now with an account), then set the tier.
        const subject = `open-dev-${session.publicId}`;
        const identity: VerifiedIdentity = { subject, email: `${subject}@open-dev.invalid`, emailVerified: true, provider: 'password', issuedAt: at, authAt: at, expiresAt: at + 3600000, digest: randomUUID() };
        const out = signIn(db, deps(), { cookie: request.cookie, binding: request.binding, identity });
        const account = db.accounts?.[accountId(subject)], linked = account?.sessionKey ? db.sessions[account.sessionKey] : undefined;
        if (!linked) throw refuse(409, 'account_required', 'The account could not be made.');
        setTrust(db, linked, asked);
        return { name: linked.name, cookie: out.cookie };
      }
      localAccount(db, session, `open-dev-${session.publicId}`, `${session.publicId}@open-dev.invalid`);
      setTrust(db, session, asked);
      return { name: session.name, cookie: null };
    });
    return { body: { ok: true, name: result.name, tier: asked, adult: true }, ...(result.cookie ? { headers: { 'Set-Cookie': ctx.core.cookieHeader(request, result.cookie) } } : {}) };
  }

  async function seed(request: RouteRequest) {
    mustBeSameOrigin(request);
    const cities = openCities();
    if (!cities.length) throw refuse(409, 'no_open_city', 'No city is open.');
    const social = socialService(ctx);
    const made = await store.transact((db) => {
      const seeded = new Set<string>(), rows: { name: string; city: CityId; created: boolean }[] = [];
      SEED_NAMES.forEach((name, index) => {
        const subject = `open-dev-seed-${index + 1}`, existing = db.accounts?.[accountId(subject)];
        let session = existing?.sessionKey ? db.sessions[existing.sessionKey] : undefined;
        const created = !session, city = cities[index % cities.length]!;
        if (!session) { const id = ctx.core.newIdentity(); session = db.sessions[id.secret] = { secret: id.secret, publicId: id.publicId, name, expiresAt: now() + ctx.config.sessionTtlMs, cities: {}, actions: {} }; }
        session.expiresAt = now() + ctx.config.sessionTtlMs;
        localAccount(db, session, subject, `${subject}@open-dev.invalid`);
        ctx.settle(session, city);
        setTrust(db, session, 'phone');
        seeded.add(session.publicId);
        rows.push({ name: session.name, city, created });
      });
      const caller = request.session(db);
      // The visitor who asks has a life to be friends from (the page may not have made one yet).
      if (caller && !seeded.has(caller.publicId) && !livesOf(caller).length) ctx.settle(caller, cities[0]!);
      const visitors = (caller && !seeded.has(caller.publicId) ? [caller] : Object.values(db.sessions).filter((session) => !seeded.has(session.publicId) && hasLife(session))).filter((session) => livesOf(session).length > 0);
      // Everyone is registered as a player first (what their first social request does), or they cannot be found.
      for (const session of [...visitors, ...Object.values(db.sessions).filter((item) => seeded.has(item.publicId))]) social.me(db, session, { lite: true });
      let friendships = 0;
      for (const visitor of visitors) {
        const cityId = livesOf(visitor)[0]!;
        for (const id of seeded) {
          const other = Object.values(db.sessions).find((session) => session.publicId === id);
          if (!other) continue;
          const asked = social.friendRequest(db, other, { to: visitor.publicId, cityId: livesOf(other)[0] ?? cityId });
          const answered = asked.ok && social.friendAnswer(db, visitor, { from: other.publicId, accept: true, cityId });
          if (answered) friendships += 1;
        }
      }
      // The friendships are two days old, so the "new friend" rules (blurred pictures, first-day limits) are already behind them.
      const book = ctx.collection(db, 'social');
      for (const [id, player] of Object.entries(book.players)) for (const friend of Object.keys(player.friends)) if (seeded.has(id) || seeded.has(friend)) player.friends[friend] = Math.min(player.friends[friend] ?? 0, now() - 2 * DAY);
      return { rows, friendships, visitors: visitors.length };
    });
    return { body: { ok: true, players: made.rows, friendships: made.friendships, friendsOf: made.visitors, note: made.visitors ? undefined : 'No local player has a life yet: open the game once, then seed again to make them your friends.' } };
  }

  return {
    'GET /api/account/open-dev': async (request) => {
      const view = await store.read((db) => {
        const session = request.session(db), account = session?.account ? db.accounts?.[session.account] : undefined;
        return { signedIn: Boolean(account), operator: account ? emailHash(account.email) === emailHash(OPERATOR_EMAIL) : false, name: session?.name ?? null, tier: session ? trustOf(ctx, db).players[session.publicId]?.tier ?? null : null };
      });
      return { body: { openDev: true, speed: config.speed, cash: config.cash, ...view } };
    },
    // A GET as well, so the admin address (a separate browser origin with its own cookie) can be signed in by opening one link.
    'GET /api/account/open-dev/operator': (request) => becomeOperator(request),
    'POST /api/account/open-dev/operator': (request) => { mustBeSameOrigin(request); return becomeOperator(request); },
    'POST /api/account/open-dev/fund': async (request) => {
      mustBeSameOrigin(request);
      const body = await request.json(), given = body.amount;
      if (given !== undefined && !(typeof given === 'number' && Number.isSafeInteger(given) && given > 0)) throw refuse(400, 'invalid_amount', 'The amount is a whole number of naira above zero.');
      const out = await store.transact((db) => { const session = targetOf(db, request, body); return { name: session.name, lives: fundSession(db, session, typeof given === 'number' ? given : null) }; });
      return { body: { ok: true, ...out, ...(typeof given === 'number' ? { amount: given } : { upTo: config.cash }) } };
    },
    'POST /api/account/open-dev/trust': trust,
    'POST /api/account/open-dev/seed': seed,
  };
}
