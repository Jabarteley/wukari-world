import { planErasure, eraseData } from './erasure-data.ts';
import { checkConfirm, issueConfirm } from './confirm.ts';
import { audit } from './store.ts';
import { adminOf, notFound } from './gate.ts';
import { worldOf } from '../world/service.ts';
import { landOf } from '../world/land.ts';
import { commerceSecrets } from '../commerce/service.ts';
import { SESSION_CHANGED } from '../routes/auth.ts';
import { socialService } from '../social/service.ts';
import { moderationService } from '../moderation/service.ts';
import { sanctionsOf } from './sanctions.ts';
import { agentService } from '../agents/service.ts';
import type { Db, RouteContext, RouteRequest } from '../types.ts';

interface Job {
  id: string; admin: string; targetHash: string; requestHash: string;
  state: 'pending' | 'complete'; count: number; createdAt: number; completedAt?: number;
  actors: string[]; shards: string[]; photos: string[]; conversations: string[]; chatPhotos: string[]; voices: string[];
  commerceRevocations: { accountId: string; secret: string }[];
}
interface Jobs { jobs: Record<string, Job> }
const jobs = (db: Db): Jobs => db.playerErasure as Jobs | undefined ?? { jobs: {} };
const hash = async (value: unknown): Promise<string> => Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256', new TextEncoder().encode(JSON.stringify(value)))), byte => byte.toString(16).padStart(2, '0')).join('');
const disclosure = 'Removes Allworld accounts, characters, progress, profiles and map homes. Anonymous shared financial history and a security receipt remain. External sign-in provider accounts and historical backups are not deleted by this action.';

/** A durable job bridges the main store and independently persisted world/media stores. */
export function erasureService(ctx: RouteContext, invalidate: () => void) {
  const running = new Map<string, Promise<void>>();
  const root = (db: Db, request: RouteRequest) => {
    const admin = adminOf(ctx, db, request);
    if (!admin) throw notFound(ctx);
    if (!admin.root) throw Object.assign(ctx.fail(403, 'root_required'), { reason: 'Only the founder can permanently erase players.' });
    return admin;
  };
  const view = (job: Job) => ({ ok: job.state === 'complete', code: job.state === 'complete' ? 'player_erased' : 'erasure_pending', jobId: job.id, count: job.count,
    summary: job.state === 'complete' ? `Erased ${job.count} character${job.count === 1 ? '' : 's'} from Allworld and the map.` : 'Player access has ended. Map and media cleanup is pending; retry safely.', retained: disclosure });
  async function finish(id: string): Promise<void> {
    const existing = running.get(id);
    if (existing) return existing;
    const work = (async () => {
      const job = await ctx.store.read(db => jobs(db).jobs[id]);
      if (!job || job.state === 'complete') return;
      for (const socket of ctx.core.sockets()) if (socket.session && job.actors.includes(socket.session.id)) ctx.core.closeSocket?.(socket, SESSION_CHANGED, 'Player erased');
      socialService(ctx).forgetRuntime(job.actors);
      for (const actor of job.actors) agentService(ctx).leavePlace(actor);
      await Promise.all([moderationService(ctx).load(), sanctionsOf(ctx).load()]);
      for (const socket of ctx.core.sockets()) ctx.send(socket, { type: 'social-sync' });
      await landOf(ctx).eraseActors(job.actors);
      await worldOf(ctx).eraseActors(job.actors, job.shards);
      if (job.photos.length) {
        if (!ctx.showcaseImages) throw new Error('erasure_media_unavailable');
        await ctx.showcaseImages.remove(job.photos);
      }
      if (job.conversations.length) {
        if (!ctx.images || !ctx.voices) throw new Error('erasure_media_unavailable');
        await ctx.images.removeConv(job.conversations);
        await ctx.voices.removeConv(job.conversations);
      }
      if (job.chatPhotos.length) { if (!ctx.images) throw new Error('erasure_media_unavailable'); await ctx.images.remove(job.chatPhotos); }
      if (job.voices.length) { if (!ctx.voices) throw new Error('erasure_media_unavailable'); await ctx.voices.remove(job.voices); }
      for (const grant of job.commerceRevocations) {
        if (!ctx.commerceGateway) throw new Error('erasure_commerce_unavailable');
        await ctx.commerceGateway.revoke(await commerceSecrets(ctx).open(grant.secret, grant.accountId));
      }
      await ctx.store.transact(db => {
        const current = jobs(db).jobs[id];
        if (!current || current.state === 'complete') return;
        current.state = 'complete'; current.completedAt = ctx.now();
        current.actors = []; current.shards = []; current.photos = []; current.conversations = []; current.chatPhotos = []; current.voices = []; current.commerceRevocations = [];
      });
      invalidate();
    })();
    running.set(id, work);
    try { await work; } finally { running.delete(id); }
  }
  async function resume(): Promise<void> {
    const ids = await ctx.store.read(db => Object.values(jobs(db).jobs).filter(job => job.state === 'pending').map(job => job.id));
    for (const id of ids) try { await finish(id); } catch { ctx.core.log('Player erasure cleanup remains pending; safe retry scheduled.'); }
  }
  let lastRetry = 0;
  ctx.on?.('heartbeat', () => { if (ctx.now() - lastRetry > 30_000) { lastRetry = ctx.now(); void resume(); } });
  ctx.startup?.push(resume());
  return {
    async status(request: RouteRequest) {
      return ctx.store.read(db => {
        root(db, request);
        const job = jobs(db).jobs[request.params.id ?? ''];
        if (!job) throw ctx.fail(404, 'unknown_erasure');
        return view(job);
      });
    },
    async retry(request: RouteRequest) {
      await ctx.store.read(db => root(db, request));
      const id = request.params.id ?? '';
      try { await finish(id); } catch { /* The durable job remains pending and retryable. */ }
      return this.status(request);
    },
    async erase(request: RouteRequest, targetId: string) {
      const body = await request.json();
      ctx.onceId(body.clientId);
      const reason = typeof body.reason === 'string' ? body.reason.trim() : '';
      if (reason.length < 3 || reason.length > 200 || /[\u0000-\u001f\u007f]/.test(reason)) throw ctx.fail(400, 'reason_required');
      const admin = await ctx.store.read(db => root(db, request));
      const targetHash = await hash(targetId), requestHash = await hash([targetId, reason]);
      const id = await hash([admin.accountId, body.clientId]);
      const prior = await ctx.store.read(db => jobs(db).jobs[id]);
      if (prior) {
        if (prior.admin !== admin.accountId || prior.requestHash !== requestHash) throw ctx.fail(409, 'idempotency_conflict');
        try { await finish(id); } catch { /* Report pending, never report incomplete cleanup as erased. */ }
        return ctx.store.read(db => view(jobs(db).jobs[id]!));
      }
      const plan = await ctx.store.read(db => planErasure(ctx, db, root(db, request), targetId));
      const planHash = await hash(plan), binding = JSON.stringify([body.clientId, reason, planHash]);
      if (body.confirm === undefined) {
        const token = await issueConfirm(ctx, admin.accountId, 'erase', targetId, binding);
        return { ok: false, code: 'confirmation_required', ...token, plan: planHash, characters: plan.characters, scope: plan.scope, summary: disclosure };
      }
      if (body.plan !== planHash || body.typed !== `ERASE ${targetId}` || !(await checkConfirm(ctx, body.confirm, admin.accountId, 'erase', targetId, binding)))
        throw Object.assign(ctx.fail(409, 'erasure_confirmation_changed'), { reason: 'The confirmation expired or the player changed. Preview the erasure again.' });
      await ctx.store.transact(async db => {
        const caller = root(db, request);
        const old = jobs(db).jobs[id];
        if (old) { if (old.requestHash !== requestHash) throw ctx.fail(409, 'idempotency_conflict'); return; }
        const current = planErasure(ctx, db, caller, targetId);
        if (await hash(current) !== planHash) throw ctx.fail(409, 'erasure_confirmation_changed');
        const result = eraseData(ctx, db, current);
        ctx.core.log('Admin player erasure main-store transaction prepared.');
        const collection = db.playerErasure as Jobs | undefined ?? (db.playerErasure = { jobs: {} }) as Jobs;
        collection.jobs[id] = { id, admin: caller.accountId, targetHash, requestHash, state: 'pending', count: current.actorIds.length, createdAt: ctx.now(),
          actors: current.actorIds, shards: current.shardNames, photos: result.photos, conversations: result.conversations, chatPhotos: result.chatPhotos, voices: result.voices, commerceRevocations: result.commerceRevocations ?? [] };
        audit(ctx, db, { admin: caller.accountId, adminName: caller.name, action: 'erase', target: targetHash, targetName: 'Erased player', params: { characters: current.actorIds.length }, summary: 'Permanent player erasure requested', reason });
      });
      invalidate();
      try { await finish(id); } catch { ctx.core.log('Player erasure committed; remaining cleanup is pending.'); }
      return ctx.store.read(db => view(jobs(db).jobs[id]!));
    },
  };
}
