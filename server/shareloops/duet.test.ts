// Duets (docs/SHARE-LOOPS.md): a clip that answers a clip is stored as its own post linked to the first, and shown beside it.
import assert from 'node:assert/strict';
import test from 'node:test';
import { fixture } from '../test-fixture.ts';
import { ROUTE_MODULES } from '../routes/index.ts';
import { feedOf } from '../feed/data.ts';
import { feedService } from '../feed/service.ts';
import type { Db, RouteContext, RouteModule, SessionRecord } from '../types.ts';

async function scene(t: Parameters<typeof fixture>[0]) {
  let grabbed: RouteContext | null = null;
  const module: RouteModule = (ctx) => { grabbed = ctx; return {}; };
  const f = await fixture(t, { routes: [...ROUTE_MODULES, module] });
  const ctx = grabbed as RouteContext | null;
  assert.ok(ctx);
  (ctx.checks ??= {}).adult = () => true;
  // Media needs a byte store; nothing here reads bytes, so any store will do.
  if (!ctx.models) (ctx as { models?: unknown }).models = {};
  const people = [await f.device('Ada'), await f.device('Bola'), await f.device('Chi')];
  for (const person of people) await f.request('/api/life?city=lagos', null, person.cookie);
  const feed = feedService(ctx);
  const sessionOf = (db: Db, id: string): SessionRecord => Object.values(db.sessions).find((session) => session.publicId === id)!;
  /** One pending upload of the player's own, as POST /api/feed/media would leave it. */
  const pending = (db: Db, id: string, hash: string, type: 'webm' | 'jpeg') => {
    const author = (feedOf(ctx, db).authors[id] ??= { name: id });
    (author.media ??= []).push({ hash, type, w: 640, h: 360, at: ctx.now(), use: 'post', ...(type === 'webm' ? { ms: 5000 } : {}) });
  };
  const post = (who: number, body: Record<string, unknown>, hash: string, type: 'webm' | 'jpeg' = 'webm') => f.server.store.transact((db) => {
    pending(db, people[who]!.id, hash, type);
    return feed.createPost(db, sessionOf(db, people[who]!.id), { vis: 'public', media: hash, ...body });
  });
  return { f, ctx, feed, people, post, sessionOf };
}

test('a duet answers a clip with a clip; the answer carries the first beside it and its author is told', async (t) => {
  const s = await scene(t);
  const first = await s.post(0, { body: 'Dance with me' }, 'a'.repeat(64));
  assert.ok(first.ok);
  const answer = await s.post(1, { body: 'My turn', duet: first.post.id }, 'b'.repeat(64));
  assert.ok(answer.ok);
  assert.equal(answer.post.kind, 'clip');
  assert.deepEqual(answer.post.duet && { id: answer.post.duet.id, by: answer.post.duet.by.id, hash: answer.post.duet.media.hash }, { id: first.post.id, by: s.people[0]!.id, hash: 'a'.repeat(64) });
  const inbox = await s.f.server.store.read((db) => feedOf(s.ctx, db).authors[s.people[0]!.id]?.inbox ?? []);
  assert.ok(inbox.some((line) => /answered your clip with a duet/.test(line.text) && line.post === answer.post.id));
  // Read by a third person: both clips, side by side.
  const seen = await s.f.server.store.read((db) => s.feed.thread(db, s.people[2]!.id, answer.post.id));
  assert.ok(seen.ok && seen.post.duet?.id === first.post.id);
});

test('only a clip answers, only a clip can be answered, and a first clip that is gone leaves the duet standing alone', async (t) => {
  const s = await scene(t);
  const photo = await s.post(0, { body: 'A photo' }, 'c'.repeat(64), 'jpeg');
  assert.ok(photo.ok);
  const onPhoto = await s.post(1, { duet: photo.post.id }, 'd'.repeat(64));
  assert.equal(!onPhoto.ok && onPhoto.code, 'invalid_duet');
  const clip = await s.post(0, { body: 'A clip' }, 'e'.repeat(64));
  assert.ok(clip.ok);
  const withPhoto = await s.post(1, { duet: clip.post.id }, 'f'.repeat(64), 'jpeg');
  assert.equal(!withPhoto.ok && withPhoto.code, 'invalid_duet');
  const waiting = await s.f.server.store.read((db) => (feedOf(s.ctx, db).authors[s.people[1]!.id]?.media ?? []).map((m) => m.hash));
  assert.ok(waiting.includes('f'.repeat(64)), 'a refused duet leaves the upload waiting to be posted');
  const unknown = await s.post(1, { duet: 'p-nothing' }, '1'.repeat(64));
  assert.equal(!unknown.ok && unknown.code, 'unknown_post');
  const answer = await s.post(1, { duet: clip.post.id }, '2'.repeat(64));
  assert.ok(answer.ok);
  await s.f.server.store.transact((db) => s.feed.removePost(db, s.sessionOf(db, s.people[0]!.id), { id: clip.post.id }));
  const after = await s.f.server.store.read((db) => s.feed.thread(db, s.people[2]!.id, answer.post.id));
  assert.ok(after.ok);
  assert.equal(after.post.duet, null, 'the answer stays; the first is no longer shown');
});
