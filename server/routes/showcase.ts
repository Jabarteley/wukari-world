/**
 * OWNER: showcase
 * Showcase shops under /api/showcase/ (docs/SHOWCASE.md). Browsing is public; the seller's calls need a publishing account
 * (the stall conditions plus an adult's own word); `go` needs a signed-in adult and is the only call that returns a link.
 *
 *   GET  /api/showcase/directory?city&venue&category&q&after   cards, newest first, paged
 *   GET  /api/showcase/:id                               one shop page
 *   GET  /api/showcase/entry/:token                      the shop a public address leads to, with the seller's own chat and pay links (the game opens its 3D room for a visitor)
 *   POST /api/showcase/mine/share                        the public address of the caller's published shop, made once { clientId }
 *   GET  /shop/<name>-<token>                            the public page (ctx.pages): no sign-in, no script, the seller's own message link
 *   GET  /api/showcase/photo/:id                         a photo's bytes (public photos of live shops; the owner sees all of theirs)
 *   GET  /api/showcase/mine                              the caller's shop with their own links, status and upload allowance
 *   POST /api/showcase/mine                              create or edit        { clientId, expectedRevision, ...shop }
 *   POST /api/showcase/mine/photos                       { clientId, type, data (base64) }
 *   POST /api/showcase/mine/photos/arrange               { clientId, order: [photo ids, first = cover], captions?: { photo id: text } }
 *   POST /api/showcase/mine/photos/remove · /submit · /hide · /remove
 *   POST /api/showcase/:id/go                            { clientId, kind: 'chat' | 'pay' } the link, for a signed-in adult
 *   POST /api/showcase/:id/report                        { clientId, reason, note?, photo? }
 */
import { SHOWCASE } from '../../src/types/showcase.ts';
import { safeLink, shopTokenOf } from '../../src/types/showcase-link.ts';
import { VERIFIED_TIERS } from '../../src/game/trust/index.ts';
import { businessVenue } from '../../src/game/business-model.ts';
import { placeFacts } from '../../src/paths.ts';
import { shopPageHtml, unavailablePageHtml } from '../showcase/page.ts';
import { CONTENT_TYPES, FAULT_WORDS, PICTURE_LIMITS, claimedType, cleanPicture, fromBase64 } from '../social/images.ts';
import { showcaseService } from '../showcase/service.ts';
import { isShop, peekShowcase } from '../showcase/data.ts';
import type { Db, RouteContext, RouteHandler, RouteKey, SessionRecord } from '../types.ts';

const UPLOAD_BYTES = Math.ceil((PICTURE_LIMITS.bytes + 4) / 3) * 4 + 4096;

export default function showcaseRoutes(ctx: RouteContext): Record<RouteKey, RouteHandler> {
  const service = showcaseService(ctx);
  const headers = { 'Cache-Control': 'no-store' };
  const rate = (key: string, count = 60): void => { if (!ctx.allow(`showcase:${key}`, count)) throw ctx.fail(429, 'rate_limited'); };
  type Step = (db: Db, session: SessionRecord, id: string, body: Record<string, unknown>, gone: string[]) => { ok: boolean; code: string };
  /** A write: exactly once per clientId, rate limited, and the bytes of any picture it dropped deleted after it is saved. */
  const write = (op: string, step: Step): RouteHandler => async (request) => {
    const body = await request.json(); ctx.onceId(body.clientId);
    const id = String(request.params.id ?? ''), gone: string[] = [];
    const result = await ctx.store.transact((db) => {
      const session = request.requireSession(db); rate(`write:${session.publicId}`, 60);
      return ctx.once(db, session, { id: body.clientId, kind: `showcase.${op}`, fingerprint: [id, body] }, () => step(db, session, id, body, gone));
    });
    if (gone.length) await ctx.showcaseImages?.remove(gone).catch(() => {});
    return { body: result, headers, renew: true };
  };
  const read = <T extends object>(run: (db: Db, viewer: string | undefined, request: Parameters<RouteHandler>[0]) => T): RouteHandler => async (request) => ({
    body: await ctx.store.read((db) => { const viewer = request.session(db)?.publicId; rate(`read:${viewer ?? request.ip}`, 120); return run(db, viewer, request); }), headers });

  /** SHOWCASE_IMAGES_MAX_MB (megabytes, may be a fraction) lowers or raises the ceiling on all showcase photos together. */
  const ceiling = (): number => { const mb = Number(typeof ctx.env === 'function' ? ctx.env('SHOWCASE_IMAGES_MAX_MB') : ''); return Number.isFinite(mb) && mb > 0 ? Math.min(mb, 8192) * 1048576 : SHOWCASE.imageCeilingBytes; };
  const upload: RouteHandler = async (request) => {
    const body = await request.json(UPLOAD_BYTES); ctx.onceId(body.clientId);
    const images = ctx.showcaseImages;
    if (!images) throw ctx.fail(503, 'pictures_unavailable');
    const claimed = claimedType(body.type), bytes = fromBase64(body.data, PICTURE_LIMITS.bytes + 4);
    if (!claimed || !bytes) throw ctx.fail(400, 'invalid_picture');
    // Who is asking, and whether they may add a picture now, before anything is kept.
    const shopId = await ctx.store.read((db) => {
      const session = request.requireSession(db); rate(`write:${session.publicId}`, 60);
      service.canUpload(db, session);
      return peekShowcase(db).owners[session.publicId]?.shop ?? '';
    });
    const cleaned = cleanPicture(bytes, claimed);
    if (!cleaned.ok) return { body: { ok: false, code: 'picture_rejected', reason: FAULT_WORDS[cleaned.fault] }, headers, renew: true };
    const { picture } = cleaned;
    if (picture.bytes.length > SHOWCASE.photoBytes) return { body: { ok: false, code: 'picture_rejected', reason: 'That picture is too big. Showcase pictures are at most 150 kB.' }, headers, renew: true };
    // A full store refuses new pictures; it never deletes older ones.
    if ((await images.stats()).bytes + picture.bytes.length > ceiling()) throw ctx.fail(503, 'picture_store_full');
    const id = ctx.randomId().replaceAll('-', '');
    if (!PICTURE_LIMITS.idPattern.test(id)) throw ctx.fail(500, 'internal_error');
    await images.put({ id, conv: shopId, at: ctx.now(), size: picture.bytes.length, type: picture.type }, picture.bytes);
    try {
      const result = await ctx.store.transact((db) => {
        const session = request.requireSession(db);
        return ctx.once(db, session, { id: body.clientId, kind: 'showcase.photo', fingerprint: [body.type, picture.bytes.length] }, () => service.attach(db, session, { id, w: picture.width, h: picture.height, n: picture.bytes.length }));
      });
      // A refusal, or a retry of a picture already stored, keeps nothing of this upload.
      if (!result.ok || 'duplicate' in result) await images.remove([id]);
      return { body: result, headers, renew: true };
    } catch (error) { await images.remove([id]).catch(() => {}); throw error; }
  };

  const photo: RouteHandler = async (request) => {
    const id = request.params.id ?? '', images = ctx.showcaseImages;
    if (!images || !PICTURE_LIMITS.idPattern.test(id)) throw ctx.fail(404, 'unknown_photo');
    const viewer = await ctx.store.read((db) => { const who = request.session(db)?.publicId; rate(`photo:${who ?? request.ip}`, 600); return who ?? ''; });
    const stored = await images.get(id);
    const allowed = stored ? await ctx.store.read((db) => {
      const shop = peekShowcase(db).shops[stored.image.conv], found = isShop(shop) ? shop.photos.find((item) => item.id === id) : undefined;
      if (!isShop(shop) || !found) return false;
      return viewer === shop.owner || (found.approved && !found.hidden && service.isPublic(db, shop, viewer || undefined));
    }) : false;
    if (!stored || !allowed) throw ctx.fail(404, 'unknown_photo');
    return { file: { bytes: stored.bytes, type: CONTENT_TYPES[stored.image.type], cache: 'no-store' } };
  };

  // The public page. A stranger's first request: no session is read and none is set. The shop is looked up by its token only, and
  // anything that is not a published shop (unknown, hidden, held, in review, removed) gets the same plain page.
  ctx.pages?.set('/shop/', async ({ path, origin, ip }) => {
    if (!ctx.allow(`showcase:page:${ip}`, 60)) return { status: 429, cache: false, html: unavailablePageHtml(origin) };
    const token = shopTokenOf(path);
    const found = token ? await ctx.store.read((db) => {
      const shop = service.byToken(db, token);
      const badge = shop ? service.trust.badge(db, shop.owner) : null;
      const place = shop ? placeFacts(shop.city) : null;
      return shop && token ? { shop, token, city: place?.name ?? '', market: businessVenue(shop.city, shop.venue)?.name ?? '', checked: badge && (VERIFIED_TIERS as readonly string[]).includes(badge.tier) ? badge.label : null, payNotice: service.view(db, shop)?.payNotice ?? null } : null;
    }).catch(() => null) : null;
    // Never cached by a shared cache: a shop hidden or held a minute ago must not still be served.
    return found ? { status: 200, cache: false, html: shopPageHtml(found, origin) } : { status: 404, cache: false, html: unavailablePageHtml(origin) };
  });

  return {
    'GET /api/showcase/directory': read((db, viewer, request) => service.page(db, request.query, viewer)),
    'GET /api/showcase/mine': async (request) => ({ body: await ctx.store.read((db) => { const session = request.requireSession(db); rate(`read:${session.publicId}`, 120); if (service.trust.tierOf(db, session) === 'guest') throw ctx.fail(403, 'account_required'); return service.mine(db, session); }), headers }),
    'GET /api/showcase/photo/:id': photo,
    'GET /api/showcase/entry/:token': async (request) => ({ body: await ctx.store.read((db) => {
      if (!ctx.allow(`showcase:entry:${request.ip}`, 30)) throw ctx.fail(429, 'rate_limited');
      const shop = service.byToken(db, request.params.token);
      const view = shop ? service.view(db, shop) : null;
      if (!shop || !view) throw ctx.fail(404, 'shop_unavailable');
      // What the shop's own public page shows, so the 3D room can show the same: the shop, and the seller's own chat and pay links
      // (checked again here). Anyone who has the shop's public address may see them. The seller's id and name are left out, as on the page.
      return { id: shop.id, shop: { ...view, badge: { ...view.badge, id: '', name: '' } }, chat: safeLink(shop.chat.url), pay: safeLink(shop.pay?.url) };
    }), headers }),
    'GET /api/showcase/:id': read((db, viewer, request) => ({ shop: service.view(db, service.get(db, String(request.params.id), viewer)) })),
    'POST /api/showcase/mine': write('save', (db, session, _id, body) => service.save(db, session, body)),
    'POST /api/showcase/mine/photos': upload,
    'POST /api/showcase/mine/photos/arrange': write('photo-arrange', (db, session, _id, body) => service.arrange(db, session, body)),
    'POST /api/showcase/mine/photos/remove': write('photo-remove', (db, session, _id, body, gone) => service.detach(db, session, body.photo, gone)),
    'POST /api/showcase/mine/share': write('share', (db, session) => service.share(db, session)),
    'POST /api/showcase/mine/submit': write('submit', (db, session) => service.submit(db, session)),
    'POST /api/showcase/mine/hide': write('hide', (db, session, _id, body) => service.hide(db, session, body.hidden)),
    'POST /api/showcase/mine/remove': write('remove', (db, session, _id, _body, gone) => service.remove(db, session, gone)),
    'POST /api/showcase/:id/go': write('go', (db, session, id, body) => service.go(db, session, id, body.kind)),
    'POST /api/showcase/:id/report': write('report', (db, session, id, body) => service.report(db, session, id, body)),
  };
}
