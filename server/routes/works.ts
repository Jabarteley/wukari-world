/**
 * OWNER: world
 * City works (server/works/works.ts, docs/SMALLER-FEATURES.md): a shared goal per city that residents fund with game money.
 *
 *   GET  /api/world/works?id=<city id>   PUBLIC, cached 15 s. { city, active, done, order, limits, you? }  (`you` only with a session:
 *        { canOrder } is true for the sitting head of the city)
 *   POST /api/civic/works/give    { cityId, amount, requestId }   pay game money to the active work; exactly once per requestId
 *   POST /api/civic/works/order   { cityId, order: [workId...], requestId }   the sitting head of the city chooses the order
 *   Every write answers { ok, code, reason?, state, works }. A finished work is announced in the gist (no amounts in the line).
 */
import { addressBucket } from '../host-context.ts';
import { gistService } from '../gist/ledger.ts';
import { govOfId } from '../politics/data.ts';
import { governorAt } from '../civic/elections.ts';
import { QUORUM } from '../../src/game/content/politics.ts';
import { civicTitle } from '../../src/game/cities/terminology.ts';
import { cityRules } from '../../src/game/cities/index.ts';
import { lagosTime } from '../../src/game/clock.ts';
import { hash53 } from '../protocol.ts';
import { transactWithCityContent } from '../prepared-city-transaction.ts';
import { activeOf, addToday, cityWorks, countGift, giveBlock, givenToday, orderBlock, peekWorks, room, viewOf, workOf } from '../works/works.ts';
import type { WorkId, WorksCollection } from '../works/works.ts';
import type { CityId } from '../../src/types/protocol.ts';
import type { Db, RouteContext, RouteHandler, RouteKey } from '../types.ts';

export default function worksRoutes(ctx: RouteContext): Record<RouteKey, RouteHandler> {
  const cityParam = (value: unknown): CityId => { const found = ctx.cityIds.find((id) => id === value); if (typeof value !== 'string' || found === undefined) throw ctx.fail(400, 'invalid_city'); return found; };
  const name = (city: string): string => cityRules(city)?.name ?? city;
  const head = (db: Db, city: CityId): string | null => governorAt(govOfId(db, `city:${city}`), ctx.now(), QUORUM.city)?.id ?? null;
  const collection = (db: Db): WorksCollection => ctx.collection(db, 'works', { v: 1, cities: {} }) as unknown as WorksCollection;
  const refused = (code: string, reason: string) => ({ ok: false as const, code, reason });
  const limit = (bucket: string, key: string, count: number): void => { if (!ctx.allow(`works:${bucket}:${key}`, count)) throw ctx.fail(429, 'works_rate_limited'); };
  return {
    'GET /api/world/works': async (request) => {
      if (!ctx.allow(`works:${addressBucket(request.ip)}`, 30, 60000)) throw Object.assign(ctx.fail(429, 'works_rate_limited'), { reason: 'You are doing that too quickly. Wait a minute and try again.' });
      const city = cityParam(request.query.get('id'));
      const body = await ctx.store.read((db) => {
        const session = request.session(db, { renew: false });
        return { ...viewOf(city, peekWorks(db, city)), ...(session ? { you: { canOrder: head(db, city) === session.publicId } } : {}) };
      });
      return { body, headers: { 'Cache-Control': 'private, max-age=15' } };
    },

    'POST /api/civic/works/give': async (request) => {
      const body = await request.json();
      const cityId = cityParam(body.cityId);
      return transactWithCityContent(ctx, request, [cityId], (db) => {
        const session = request.requireSession(db, { renew: true });
        limit('give', session.publicId, 20);
        const life = ctx.settle(session, cityId), now = ctx.now(), day = lagosTime(now).day, key = hash53(session.publicId);
        const outcome = ctx.once(db, session, { id: body.requestId, kind: 'works.give', fingerprint: [cityId, String(body.amount ?? '')] }, () => {
          const works = cityWorks(collection(db), cityId), work = activeOf(works);
          const block = giveBlock(works, body.amount, givenToday(works, day, key));
          if (block) return refused(block.code, block.reason);
          if (!work) return refused('all_done', 'Every work here is finished.');
          // A gift never overpays: the part past the price is not taken.
          const amount = Math.min(body.amount as number, room(works, work));
          const paid = ctx.act(life, { type: 'civic.treasury', cityId, payload: { op: 'pay', amount, label: `City works: ${work.label}` } });
          if (!paid.ok) return refused(paid.code, paid.reason ?? 'You cannot pay that now.');
          addToday(works, day, key, amount);
          if (countGift(works, work, amount, now)) gistService(ctx).add(db, { city: cityId, kind: 'other', text: `The ${work.label.toLowerCase()} in ${name(cityId)} is finished.`, refs: { key: `work:${cityId}:${work.id}` } });
          return { ok: true as const, code: 'given', amount };
        });
        return { body: { ...outcome, state: life, works: viewOf(cityId, peekWorks(db, cityId)) }, renew: true };
      });
    },

    'POST /api/civic/works/order': async (request) => {
      const body = await request.json();
      const cityId = cityParam(body.cityId);
      return transactWithCityContent(ctx, request, [cityId], (db) => {
        const session = request.requireSession(db, { renew: true });
        limit('order', session.publicId, 20);
        const life = ctx.settle(session, cityId);
        const outcome = ctx.once(db, session, { id: body.requestId, kind: 'works.order', fingerprint: [cityId, JSON.stringify(body.order ?? null)] }, () => {
          if (head(db, cityId) !== session.publicId) return refused('not_in_office', `Only the sitting ${civicTitle(cityId).toLowerCase()} chooses the order.`);
          const block = orderBlock(body.order);
          if (block) return refused(block.code, block.reason);
          const works = cityWorks(collection(db), cityId);
          works.order = (body.order as unknown[]).filter((id): id is WorkId => workOf(id) !== undefined);
          works.by = ctx.publicSession(session).name.slice(0, 24); works.at = ctx.now();
          return { ok: true as const, code: 'ordered' };
        });
        return { body: { ...outcome, state: life, works: viewOf(cityId, peekWorks(db, cityId)) }, renew: true };
      });
    },
  };
}
