import { loadCityContent as preloadCityContent } from '../src/game/cities/registry.ts';
await preloadCityContent('lagos');
// OWNER: social — the feed (docs/FEED.md): profiles and handles, posts with a place and who sees them, replies and reactions with the
// age rule, reports that hide, follows, people you may know, friend codes, crews and their wall, events with RSVP and the invitation page,
// gigs with reviews and vouches, moments drafted from the gist, the inbox, the operator's queue and erasure.
import test from 'node:test';
import assert from 'node:assert/strict';
import { fixture } from './test-fixture.ts';
import type { Device } from './test-fixture.ts';
import { cleanHandle, canSee, canReply, allowedVisibility, rank, FEED } from '../src/feed/model.ts';
import { forgetFeedPlayers } from './feed/service.ts';
import type { FeedCollection } from './feed/data.ts';

type Fixture = Awaited<ReturnType<typeof fixture>>;
type Json = Record<string, any>;
const json = async (res: Response): Promise<Json> => ({ status: res.status, ...((await res.json()) as Json) });

const TOKEN = 'operator-token-for-the-feed-test-0123456789'
async function setup(t: Parameters<typeof fixture>[0]) {
  const f = await fixture(t, { moderatorToken: TOKEN });
  const get = async (path: string, who?: Device): Promise<Json> => json(await f.request(path, null, who?.cookie));
  const post = async (path: string, body: unknown, who?: Device): Promise<Json> => json(await f.request(path, body, who?.cookie));
  async function player(name: string, { adult = true }: { adult?: boolean } = {}): Promise<Device> {
    const who = await f.device(name);
    await f.request('/api/life?city=lagos', null, who.cookie);
    await post('/api/growth/hello', { cityId: 'lagos' }, who);
    await post('/api/growth/consent', { cityId: 'lagos', age: adult ? 'adult' : 'minor' }, who);
    await get('/api/social/me', who);
    return who;
  }
  const befriend = async (a: Device, b: Device): Promise<void> => {
    assert.equal((await post('/api/social/friends/request', { to: b.id, cityId: 'lagos' }, a)).code, 'requested');
    assert.equal((await post('/api/social/friends/answer', { from: a.id, accept: true, cityId: 'lagos' }, b)).code, 'accepted');
  };
  const feedDb = (): Promise<FeedCollection> => f.server.store.read((db) => JSON.parse(JSON.stringify((db as Record<string, unknown>).feed ?? null)) as FeedCollection);
  return { f, get, post, player, befriend, feedDb };
}

test('model: handles, visibility, the age rule and ranking', () => {
  assert.equal(cleanHandle('@Ada.Lagos'), 'ada.lagos');
  for (const bad of ['ab', '1ada', 'ada..x', 'ada_', 'admin', 'a'.repeat(21), 'ada lagos']) assert.equal(cleanHandle(bad), null, bad);
  const stranger = { self: false, friend: false, crewMember: false, blocked: false, adult: true, player: true };
  assert.equal(canSee({ vis: 'public' }, stranger), true);
  assert.equal(canSee({ vis: 'friends' }, stranger), false);
  assert.equal(canSee({ vis: 'public', hidden: 1 }, stranger), false);
  assert.equal(canSee({ vis: 'public', hidden: 1 }, { ...stranger, self: true }), true, 'the author still sees a hidden post');
  assert.equal(canSee({ vis: 'public' }, { ...stranger, blocked: true }), false);
  assert.equal(canSee({ vis: 'city' }, { ...stranger, player: false }), false);
  assert.equal(canReply({ vis: 'public' }, { ...stranger, adult: false }), false, 'a minor never replies to a stranger');
  assert.equal(canReply({ vis: 'public' }, { ...stranger, adult: false, friend: true }), true);
  assert.deepEqual(allowedVisibility('public', { adult: false, media: false, publicMedia: false, crew: false }), { ok: false, code: 'friends_only', reason: 'Until you are confirmed as 18 or older, your posts go to friends and crews only.' });
  assert.equal(allowedVisibility(undefined, { adult: true, media: true, publicMedia: false, crew: false }), 'friends', 'media defaults to friends');
  assert.equal(allowedVisibility('public', { adult: true, media: true, publicMedia: false, crew: false }).constructor, Object);
  const now = 100 * 3600000;
  const order = rank([{ at: now - 10 * 3600000, replies: 9, reactions: 9, friend: false, mine: false, ai: false, kind: 'text' as const }, { at: now, replies: 0, reactions: 0, friend: false, mine: false, ai: true, kind: 'moment' as const }, { at: now - 3600000, replies: 0, reactions: 0, friend: true, mine: false, ai: false, kind: 'text' as const }], now);
  assert.equal(order[0]!.friend, true, 'a friend\'s fresh post leads');
});

test('profile: a unique handle once a month, a filtered bio and status, /p/@handle, and a friend code', async (t) => {
  const { f, get, post, player } = await setup(t);
  const ada = await player('Ada'), bola = await player('Bola');
  assert.equal((await post('/api/feed/handle', { handle: '@ada' }, ada)).ok, true);
  assert.equal((await post('/api/feed/handle', { handle: 'ada' }, bola)).code, 'handle_taken');
  assert.equal((await post('/api/feed/handle', { handle: 'ada.two' }, ada)).code, 'too_soon');
  assert.equal((await post('/api/feed/profile', { bio: 'call me on 08031234567' }, ada)).code, 'contact_not_allowed');
  const edited = await post('/api/feed/profile', { bio: 'Jollof first, questions later', status: 'Open to a game of Whot' }, ada);
  assert.equal(edited.profile.bio, 'Jollof first, questions later');
  assert.equal(edited.profile.status.text, 'Open to a game of Whot');
  const seen = await get('/api/feed/profile?id=%40ada', bola);
  assert.equal(seen.profile.id, ada.id);
  assert.equal(seen.profile.handle, 'ada');
  assert.equal(seen.profile.code, undefined, 'a stranger does not see the friend code');
  const me = await get('/api/feed/me', ada);
  assert.match(me.profile.code, /^[A-Z]{6}$/);
  const byCode = await get(`/api/feed/code?code=${me.profile.code}`, bola);
  assert.equal(byCode.kind, 'friend'); assert.equal(byCode.profile.id, ada.id);
  const page = await f.request('/p/@ada');
  assert.equal(page.status, 200);
  const html = await page.text();
  assert.match(html, /@ada/); assert.match(html, /Jollof first/);
  await f.server.store.transact((db) => { const a = (db as unknown as { feed: FeedCollection }).feed.authors[ada.id]!; a.handleAt = f.now() - FEED.handleEveryMs - 1000; });
  assert.equal((await post('/api/feed/handle', { handle: 'ada.two' }, ada)).ok, true);
  assert.equal((await get('/api/feed/profile?id=%40ada', bola)).code, 'unknown_player', 'the old handle is free again');
});

test('posts: a place from the stored life, who sees what, replies, reactions, the inbox and reports that hide', async (t) => {
  const { get, post, player, befriend } = await setup(t);
  const ada = await player('Ada'), bola = await player('Bola'), chi = await player('Chi'), kid = await player('Kid', { adult: false }), dayo = await player('Dayo');
  await befriend(ada, bola);
  const pub = await post('/api/feed/post', { body: 'Market is loud today' }, ada);
  assert.equal(pub.ok, true, JSON.stringify(pub));
  assert.equal(pub.post.vis, 'public');
  assert.equal(pub.post.place.city, 'lagos');
  const priv = await post('/api/feed/post', { body: 'Friends only: who is coming tonight?', vis: 'friends' }, ada);
  assert.equal((await post('/api/feed/post', { body: 'https://spam.example' }, ada)).code, 'links_not_allowed');
  // Bola is a friend: sees both. Chi is a stranger: sees the public one in the city and the world.
  const bolaFriends = await get('/api/feed/list?tab=friends', bola);
  assert.deepEqual(bolaFriends.posts.map((p: Json) => p.id).sort(), [pub.post.id, priv.post.id].sort());
  const chiCity = await get('/api/feed/list?tab=city&city=lagos', chi);
  assert.deepEqual(chiCity.posts.map((p: Json) => p.id), [pub.post.id]);
  assert.ok(Array.isArray(chiCity.news));
  const world = await get('/api/feed/list?tab=world');
  assert.deepEqual(world.posts.map((p: Json) => p.id), [pub.post.id], 'a guest with no session reads the world feed');
  assert.equal((await get(`/api/feed/post?id=${priv.post.id}`, chi)).code, 'unknown_post');
  // A minor cannot post publicly and cannot reply to a stranger; an adult stranger can.
  assert.equal((await post('/api/feed/post', { body: 'hi', vis: 'public' }, kid)).code, 'friends_only');
  assert.equal((await post('/api/feed/reply', { id: pub.post.id, body: 'hello' }, kid)).code, 'cannot_reply');
  const replied = await post('/api/feed/reply', { id: pub.post.id, body: 'Which market? @ada' }, chi);
  assert.equal(replied.ok, true); assert.equal(replied.post.replies, 1);
  assert.equal((await post('/api/feed/react', { id: pub.post.id, emoji: '🔥' }, bola)).post.reactions[0].count, 1);
  assert.equal((await post('/api/feed/react', { id: pub.post.id, emoji: 'fire' }, bola)).code, 'invalid_reaction');
  const inbox = await get('/api/feed/me', ada);
  assert.equal(inbox.unseen, 2);
  assert.deepEqual(inbox.inbox.map((l: Json) => l.kind).sort(), ['reaction', 'reply']);
  await post('/api/feed/seen', {}, ada);
  assert.equal((await get('/api/feed/me', ada)).unseen, 0);
  // Blocks win: Chi blocks Ada and no longer sees her posts.
  await post('/api/social/block', { id: ada.id, cityId: 'lagos' }, chi);
  assert.deepEqual((await get('/api/feed/list?tab=world', chi)).posts, []);
  // Two different reports hide a post for everyone but its author.
  await post('/api/feed/report', { kind: 'post', id: pub.post.id, reason: 'spam' }, bola);
  assert.equal((await get('/api/feed/list?tab=world', dayo)).posts.length, 1);
  await post('/api/feed/report', { kind: 'post', id: pub.post.id, reason: 'spam' }, dayo);
  assert.deepEqual((await get('/api/feed/list?tab=world', dayo)).posts, []);
  assert.equal((await get(`/api/feed/post?id=${pub.post.id}`, ada)).post.hidden, true);
  // The author removes their own post.
  assert.equal((await post('/api/feed/post/remove', { id: priv.post.id }, bola)).code, 'unknown_post');
  assert.equal((await post('/api/feed/post/remove', { id: priv.post.id }, ada)).ok, true);
});

test('posts: the daily cap and paging without repeats', async (t) => {
  const { get, post, player } = await setup(t);
  const ada = await player('Ada'), bola = await player('Bola');
  for (let i = 0; i < FEED.postsPerDay; i++) assert.equal((await post('/api/feed/post', { body: `Post number ${i}` }, ada)).ok, true);
  assert.equal((await post('/api/feed/post', { body: 'one more' }, ada)).code, 'daily_limit');
  const first = await get('/api/feed/list?tab=world', bola);
  assert.equal(first.posts.length, FEED.page);
  const mine = await get(`/api/feed/by?id=${ada.id}`, bola);
  assert.equal(mine.posts.length, FEED.page);
  assert.equal(mine.next, null, 'exactly one page');
});

test('follow: only an open profile or an AI character; people you may know', async (t) => {
  const { get, post, player, befriend } = await setup(t);
  const ada = await player('Ada'), bola = await player('Bola'), chi = await player('Chi'), kid = await player('Kid', { adult: false });
  assert.equal((await post('/api/feed/follow', { id: ada.id }, bola)).code, 'not_followable');
  assert.equal((await post('/api/feed/profile', { open: true }, kid)).code, 'adults_only');
  await post('/api/feed/profile', { open: true }, ada);
  assert.equal((await post('/api/feed/follow', { id: ada.id }, bola)).profile.following, true);
  await post('/api/feed/post', { body: 'For my followers' }, ada);
  assert.equal((await get('/api/feed/list?tab=friends', bola)).posts.length, 1, 'a followed person\'s public posts are in Friends');
  await befriend(ada, bola); await befriend(bola, chi);
  const known = await get('/api/feed/suggestions', ada);
  assert.deepEqual(known.people.map((s: Json) => s.person.id), [chi.id]);
  assert.equal(known.people[0].why, 'Friends with people you know');
});

test('crews: a join link with a page, a wall only members read, a size cap and leaving', async (t) => {
  const { f, get, post, player } = await setup(t);
  const ada = await player('Ada'), bola = await player('Bola'), chi = await player('Chi');
  assert.equal((await post('/api/feed/crews', { name: 'x' }, ada)).code, 'invalid_name');
  const made = await post('/api/feed/crews', { name: 'Yaba Ballers', colour: 'gold', about: 'Football on Saturdays' }, ada);
  assert.equal(made.ok, true);
  const code = made.crew.code as string;
  const page = await f.request(`/c/${code}`);
  assert.equal(page.status, 200);
  assert.match(await page.text(), /Join Yaba Ballers/);
  assert.equal((await post('/api/feed/crews/join', { code }, bola)).crew.size, 2);
  const wall = await post('/api/feed/post', { body: 'Pitch at 4', vis: 'crew', crew: made.crew.id }, bola);
  assert.equal(wall.ok, true);
  assert.equal((await get(`/api/feed/crew?id=${made.crew.id}`, ada)).posts.length, 1);
  assert.equal((await get(`/api/feed/crew?id=${made.crew.id}`, chi)).code, 'not_member');
  assert.equal((await get('/api/feed/list?tab=city&city=lagos', chi)).posts.length, 0, 'a crew post is not in the city');
  assert.equal((await get('/api/feed/list?tab=friends', ada)).posts.length, 1, 'crew posts reach crew members in Friends');
  assert.equal((await post('/api/feed/crews/leave', { id: made.crew.id, member: ada.id }, bola)).code, 'not_owner');
  assert.equal((await post('/api/feed/crews/leave', { id: made.crew.id, member: bola.id }, ada)).ok, true);
  assert.equal((await post('/api/feed/crews/join', { code }, bola)).code, 'not_allowed', 'asked to leave: not back for a week');
});

test('events: a time ahead, RSVP with a cap, a page that previews, reminders in the inbox, cancel', async (t) => {
  const { f, get, post, player } = await setup(t);
  const ada = await player('Ada'), bola = await player('Bola'), chi = await player('Chi');
  const start = f.now() + 3 * 3600000;
  assert.equal((await post('/api/feed/events', { title: 'Owambe', start: f.now() - 3600000 }, ada)).code, 'invalid_time');
  const made = await post('/api/feed/events', { title: 'Owambe at the Square', about: 'Wear gold', start, hours: 3, place: 'The Square', cap: 2 }, ada);
  assert.equal(made.ok, true, JSON.stringify(made));
  assert.equal(made.event.going, 1);
  assert.equal(made.post.kind, 'event');
  assert.equal((await post('/api/feed/events/rsvp', { id: made.event.id, answer: 'going' }, bola)).event.going, 2);
  assert.equal((await post('/api/feed/events/rsvp', { id: made.event.id, answer: 'going' }, chi)).code, 'event_full');
  assert.equal((await post('/api/feed/events/rsvp', { id: made.event.id, answer: 'maybe' }, chi)).event.maybe, 1);
  const listed = await get('/api/feed/events?city=lagos', chi);
  assert.equal(listed.events.length, 1); assert.equal(listed.mine.length, 1);
  const page = await f.request(`/ev/${made.event.code}`);
  assert.equal(page.status, 200);
  assert.match(await page.text(), /og:title" content="Owambe at the Square/);
  f.advance(3 * 3600000 - 20 * 60000);
  f.server.beat();
  await new Promise((resolve) => setTimeout(resolve, 50));
  assert.equal((await post('/api/feed/events/cancel', { id: made.event.id }, bola)).code, 'unknown_event');
  assert.equal((await post('/api/feed/events/cancel', { id: made.event.id }, ada)).ok, true);
  assert.equal((await get('/api/feed/events?city=lagos', chi)).events.length, 0);
  assert.ok((await get('/api/feed/me', chi)).inbox.some((l: Json) => /called off/.test(l.text)));
});

test('gigs: adults post, people apply, the poster chooses and marks done, both review; vouches from friends', async (t) => {
  const { get, post, player, befriend } = await setup(t);
  const ada = await player('Ada'), bola = await player('Bola'), kid = await player('Kid', { adult: false });
  assert.equal((await post('/api/feed/gigs', { title: 'Help', reward: 100 }, kid)).code, 'adults_only');
  const gig = await post('/api/feed/gigs', { title: 'Paint my shop sign', about: 'Two hours', reward: 2000 }, ada);
  assert.equal(gig.ok, true);
  const id = gig.gig.id;
  assert.equal((await get('/api/feed/gigs?city=lagos', bola)).gigs.length, 1);
  assert.equal((await post('/api/feed/gigs/act', { id, op: 'apply' }, kid)).gig.applied, true, 'anyone may apply');
  assert.equal((await post('/api/feed/gigs/act', { id, op: 'apply' }, bola)).gig.applicants, 2);
  assert.equal((await post('/api/feed/gigs/act', { id, op: 'choose', worker: bola.id }, ada)).gig.state, 'taken');
  assert.equal((await post('/api/feed/gigs/act', { id, op: 'review', stars: 5 }, bola)).code, 'cannot_review');
  assert.equal((await post('/api/feed/gigs/act', { id, op: 'done' }, ada)).gig.state, 'done');
  assert.equal((await post('/api/feed/gigs/act', { id, op: 'review', stars: 5, text: 'Paid on time' }, bola)).ok, true);
  assert.equal((await post('/api/feed/gigs/act', { id, op: 'review', stars: 4, text: 'Neat work' }, ada)).ok, true);
  const work = (await get(`/api/feed/profile?id=${bola.id}`, ada)).profile.work;
  assert.equal(work.gigsDone, 1); assert.equal(work.rating, '4.0 from 1 review');
  assert.equal((await post('/api/feed/vouch', { id: bola.id, skill: 'Fashion' }, ada)).code, 'friends_only');
  await befriend(ada, bola);
  assert.deepEqual((await post('/api/feed/vouch', { id: bola.id, skill: 'Fashion' }, ada)).profile.work.vouches, [{ skill: 'Fashion', count: 1, mine: true }]);
});

test('moments: a gist line about an adult becomes a draft, posted in one tap; erasure takes everything out', async (t) => {
  const { f, get, post, player, feedDb } = await setup(t);
  const ada = await player('Ada'), kid = await player('Kid', { adult: false });
  await f.server.store.transact((db) => {
    const ctx = f.server.context;
    ctx.checks.moment?.(db, { n: 77, at: f.now(), city: 'lagos', kind: 'business', text: 'Ada opened a food stall in Yaba Market' }, [ada.id, kid.id]);
  });
  const me = await get('/api/feed/me', ada);
  assert.equal(me.drafts.length, 1);
  assert.equal((await get('/api/feed/me', kid)).drafts.length, 0, 'a minor gets no draft');
  const posted = await post('/api/feed/post', { draft: 77, body: 'Come and eat!' }, ada);
  assert.equal(posted.post.kind, 'moment'); assert.equal(posted.post.gist, 77);
  assert.match(posted.post.body, /food stall[\s\S]*Come and eat/);
  assert.equal((await get('/api/feed/me', ada)).drafts.filter((d: Json) => d.kind !== 'recap').length, 0);
  await f.server.store.transact((db) => forgetFeedPlayers(db, new Set([ada.id])));
  const stored = await feedDb();
  assert.equal(JSON.stringify(stored).includes(ada.id), false);
});

test('operator: the queue shows reported posts, remove deletes and clear unhides', async (t) => {
  const { f, get, post, player } = await setup(t);
  const ada = await player('Ada'), bola = await player('Bola'), chi = await player('Chi');
  const p = await post('/api/feed/post', { body: 'Something rude' }, ada);
  await post('/api/feed/report', { kind: 'post', id: p.post.id, reason: 'harassment' }, bola);
  await post('/api/feed/report', { kind: 'post', id: p.post.id, reason: 'harassment' }, chi);
  const mod = async (body?: unknown): Promise<Json> => json(await fetch(`${f.base}/api/mod/feed`, { method: body ? 'POST' : 'GET', headers: { authorization: `Bearer ${TOKEN}`, ...(body ? { 'content-type': 'application/json' } : {}) }, ...(body ? { body: JSON.stringify(body) } : {}) }));
  const queue = await mod();
  assert.equal(queue.items.length, 2); assert.equal(queue.items[0].hidden, true);
  await mod({ kind: 'post', id: p.post.id, action: 'clear' });
  assert.equal((await get('/api/feed/list?tab=world', bola)).posts.length, 1);
  assert.equal((await mod()).items.length, 0);
});

test('recap: a week with posts and an event gives one recap draft; posting it is a recap post', async (t) => {
  const { f, get, post, player } = await setup(t);
  const ada = await player('Ada');
  await post('/api/feed/post', { body: 'First', label: 'Yaba Market' }, ada);
  await post('/api/feed/post', { body: 'Second', label: 'Yaba Market' }, ada);
  // The draft is made on the next read of the profile, once per Lagos week.
  const me = await get('/api/feed/me', ada);
  const recap = me.drafts.find((d: Json) => d.kind === 'recap');
  assert.ok(recap, JSON.stringify(me.drafts));
  assert.match(recap.text, /2 posts/); assert.match(recap.text, /Yaba Market/);
  assert.equal((await get('/api/feed/me', ada)).drafts.filter((d: Json) => d.kind === 'recap').length, 1, 'made once');
  const posted = await post('/api/feed/post', { draft: recap.n }, ada);
  assert.equal(posted.post.kind, 'recap');
  await post('/api/feed/draft/remove', { n: recap.n }, ada);
  assert.equal((await get('/api/feed/me', ada)).drafts.filter((d: Json) => d.kind === 'recap').length, 0, 'not made again the same week');
  void f;
});

test('agents: an AI character\'s post passes the AI-safety words check', async (t) => {
  const { f, post, player } = await setup(t);
  const bot = await player('Bot');
  await f.server.store.transact((db) => { const p = (db as unknown as { social: { players: Record<string, { agent?: { char?: true } }> } }).social.players[bot.id]!; p.agent = { char: true }; });
  assert.equal((await post('/api/feed/post', { body: 'Send me some money and I will double it' }, bot)).ok, false);
  const fine = await post('/api/feed/post', { body: 'Quiz night at the Square, come and play' }, bot);
  assert.equal(fine.ok, true); assert.equal(fine.post.ai, true);
});

test('reviewer: a report is decided at once, the author is told, undo puts it back; a model failure changes nothing', async (t) => {
  const { review, readVerdict } = await import('./feed/review.ts');
  const { feedService } = await import('./feed/service.ts');
  const { f, get, post, player } = await setup(t);
  const ada = await player('Ada'), bola = await player('Bola');
  const p = (await post('/api/feed/post', { body: 'Send me 5000 and I will send back 10000 tomorrow' }, ada)).post;
  await post('/api/feed/report', { kind: 'post', id: p.id, reason: 'scam' }, bola);
  const ctx = f.server.context;
  let asked = '';
  const verdict = await review(ctx, { kind: 'post', id: p.id }, 'report', { ask: async (m) => { asked = String(m[1]!.content); return '{"action":"remove","category":"scam","reason":"Promises of doubled money are not allowed."}'; } });
  assert.equal(verdict?.action, 'remove');
  assert.match(asked, /Reported by 1 person for: scam/);
  assert.equal((await get(`/api/feed/post?id=${p.id}`, bola)).code, 'unknown_post');
  assert.equal((await get(`/api/feed/post?id=${p.id}`, ada)).code, 'unknown_post', 'a removed post is gone for its author too');
  assert.ok((await get('/api/feed/me', ada)).inbox.some((l: Json) => l.kind === 'moderation' && /removed your post/.test(l.text)));
  const log = await f.server.store.read((db) => feedService(ctx).decisions(db));
  assert.equal(log.decisions[0]!.by, 'ai'); assert.equal(log.open, 0);
  await f.server.store.transact((db) => feedService(ctx).undo(db, log.decisions[0]!.n, 'Owner'));
  assert.equal((await get(`/api/feed/post?id=${p.id}`, bola)).ok, true, 'undo brings it back');
  // A failure, or an answer that cannot be read, leaves things as they are.
  const q = (await post('/api/feed/post', { body: 'Nice day in Yaba' }, ada)).post;
  await post('/api/feed/report', { kind: 'post', id: q.id, reason: 'spam' }, bola);
  assert.equal(await review(ctx, { kind: 'post', id: q.id }, 'report', { ask: async () => null }), null);
  assert.equal(await review(ctx, { kind: 'post', id: q.id }, 'report', { ask: async () => 'I think it is fine' }), null);
  assert.equal((await get(`/api/feed/post?id=${q.id}`, bola)).ok, true);
  // Keep closes the reports and unhides what reports hid.
  await review(ctx, { kind: 'post', id: q.id }, 'report', { ask: async () => '{"action":"keep","category":"ok","reason":""}' });
  assert.equal((await f.server.store.read((db) => feedService(ctx).decisions(db))).open, 0);
  // Minor safety is always removed, whatever action the model wrote.
  assert.deepEqual(readVerdict('{"action":"keep","category":"minor-safety","reason":"x"}'), { action: 'remove', category: 'minor-safety', reason: 'x' });
});

test('reviewer: an admin decision on a profile removes bio, status and handle, and undo restores them', async (t) => {
  const { feedService } = await import('./feed/service.ts');
  const { f, get, post, player } = await setup(t);
  const ada = await player('Ada'), bola = await player('Bola');
  await post('/api/feed/handle', { handle: 'ada' }, ada); await post('/api/feed/profile', { bio: 'Hello there' }, ada);
  const ctx = f.server.context;
  const d = await f.server.store.transact((db) => feedService(ctx).decide(db, { by: 'operator', kind: 'profile', id: ada.id, action: 'remove', category: 'admin', reason: 'test' }));
  assert.ok(d.ok);
  assert.equal((await get(`/api/feed/profile?id=${ada.id}`, bola)).profile.bio, undefined);
  assert.equal((await get('/api/feed/profile?id=%40ada', bola)).code, 'unknown_player');
  await f.server.store.transact((db) => feedService(ctx).undo(db, (d as { decision: { n: number } }).decision.n, 'Owner'));
  const back = (await get('/api/feed/profile?id=%40ada', bola)).profile;
  assert.equal(back.bio, 'Hello there'); assert.equal(back.handle, 'ada');
});

test('contacts: hashes only, blinded with a secret, matched only both ways; nothing stored reads back; forget deletes it all', async (t) => {
  const { phoneHash } = await import('../src/feed/phone.ts');
  const { f, get, post, player } = await setup(t);
  const ada = await player('Ada'), bola = await player('Bola'), eve = await player('Eve'), kid = await player('Kid', { adult: false });
  const [A = '', B = '', E = ''] = await Promise.all(['+2348031111111', '+2348032222222', '+2348033333333'].map(phoneHash));
  assert.equal((await post('/api/feed/contacts/self', { hash: A }, ada)).code, 'consent_required');
  assert.equal((await post('/api/feed/contacts/self', { hash: A, consent: true }, kid)).code, 'adults_only');
  assert.equal((await post('/api/feed/contacts/match', { hashes: [B] }, ada)).code, 'declare_first');
  assert.equal((await post('/api/feed/contacts/self', { hash: A, consent: true }, ada)).declared, true);
  assert.equal((await post('/api/feed/contacts/self', { hash: B, consent: true }, bola)).declared, true);
  assert.equal((await post('/api/feed/contacts/self', { hash: A, consent: true }, eve)).code, 'number_unavailable', 'a number held by someone else says nothing more');
  await post('/api/feed/contacts/self', { hash: E, consent: true }, eve);
  // Ada has Bola's number: nothing yet, Bola has not uploaded Ada's.
  const first = await post('/api/feed/contacts/match', { hashes: [B, E] }, ada);
  assert.deepEqual([first.matched.length, first.waiting], [0, 2]);
  // Bola uploads Ada's number: both see each other. Eve never uploaded Ada: Eve is never shown to Ada.
  const second = await post('/api/feed/contacts/match', { hashes: [A] }, bola);
  assert.deepEqual(second.matched.map((p: Json) => p.id), [ada.id]);
  assert.equal((await get('/api/feed/contacts', ada)).found, 1);
  assert.ok((await get('/api/feed/suggestions', ada)).people.some((s: Json) => s.person.id === bola.id && s.why === 'In your contacts'));
  // The store holds no number and no client hash, only blinded tokens.
  const stored = await f.server.store.read((db) => JSON.stringify((db as Record<string, unknown>).contacts));
  for (const leak of ['2348031111111', '2348032222222', A, B, E]) assert.equal(stored.includes(leak), false, `stored text contains ${leak}`);
  assert.equal(JSON.stringify(await f.server.store.read((db) => db)).includes(A), false);
  // Forget: Ada's number, edges and matches go, and Bola's match of Ada too.
  await post('/api/feed/contacts/forget', {}, ada);
  assert.deepEqual([(await get('/api/feed/contacts', ada)).declared, (await get('/api/feed/contacts', ada)).found, (await get('/api/feed/contacts', bola)).found], [false, 0, 0]);
  // Limits: three uploads a day.
  await post('/api/feed/contacts/self', { hash: A, consent: true }, ada);
  for (let i = 0; i < 3; i++) await post('/api/feed/contacts/match', { hashes: [E] }, ada);
  assert.equal((await post('/api/feed/contacts/match', { hashes: [E] }, ada)).code, 'rate_limited');
});

test('communities: a city based on a real place, open to join from Discover, moderators, 1,000 members, and a group as its 3D world', async (t) => {
  const { f, get, post, player } = await setup(t);
  const ada = await player('Ada'), bola = await player('Bola'), chi = await player('Chi'), kid = await player('Kid', { adult: false });
  assert.equal((await post('/api/feed/crews', { name: 'Ikeja Peeps', kind: 'city', city: 'lagos' }, kid)).code, 'adults_only');
  const made = await post('/api/feed/crews', { name: 'Ikeja Peeps', kind: 'city', city: 'lagos', open: true, about: 'Everyone in Ikeja' }, ada);
  assert.equal(made.ok, true, JSON.stringify(made));
  assert.deepEqual([made.crew.kind, made.crew.cap, made.crew.place.real, made.crew.place.state, made.crew.open], ['city', 1000, 1, 'Lagos State', true]);
  const imagined = await post('/api/feed/crews', { name: 'Wakanda Ville', kind: 'state', placeName: 'Wakanda', open: true }, ada);
  assert.deepEqual(imagined.crew.place, { name: 'Wakanda' });
  const found = await get('/api/feed/communities?city=lagos', chi);
  assert.deepEqual(found.communities.map((c: Json) => c.name).sort(), ['Ikeja Peeps', 'Wakanda Ville']);
  assert.equal((await get('/api/feed/communities?city=lagos&kind=state', chi)).communities.length, 1);
  assert.equal((await post('/api/feed/crews/join', { id: made.crew.id }, chi)).crew.size, 2, 'an open community joins in one tap');
  await post('/api/feed/crews/join', { id: made.crew.id }, bola);
  assert.equal((await post('/api/feed/crews/mod', { id: made.crew.id, member: bola.id }, chi)).code, 'not_owner');
  assert.equal((await post('/api/feed/crews/mod', { id: made.crew.id, member: bola.id }, ada)).crew.mods[0].id, bola.id);
  assert.equal((await post('/api/feed/crews/leave', { id: made.crew.id, member: chi.id }, bola)).ok, true, 'a moderator removes a member');
  assert.equal((await post('/api/feed/crews/leave', { id: made.crew.id, member: ada.id }, bola)).code, 'not_owner', 'not the founder');
  // The world: a group the founder made, with its room link on.
  const group = await post('/api/social/groups', { name: 'Ikeja Peeps world', members: [], clientId: f.id() }, ada);
  assert.equal(group.code, 'created', JSON.stringify(group));
  assert.equal((await post('/api/feed/crews/world', { id: made.crew.id, conv: group.conv.id }, bola)).code, 'not_owner');
  const bolaGroup = await post('/api/social/groups', { name: 'Not hers', members: [], clientId: f.id() }, bola);
  assert.equal((await post('/api/feed/crews/world', { id: made.crew.id, conv: bolaGroup.conv.id }, ada)).code, 'not_your_group');
  await post('/api/places/room/link', { id: group.conv.id, on: true }, ada);
  const attached = await post('/api/feed/crews/world', { id: made.crew.id, conv: group.conv.id }, ada); assert.equal(attached.ok, true, JSON.stringify(attached)); const world = attached.crew.world;
  assert.equal(world.room, group.conv.id); assert.match(world.link, /^\/r\/\d+-[A-Za-z0-9_-]{22}$/);
  assert.match((await get(`/api/feed/crews/one?id=${made.crew.id}`, bola)).crew.world.link, /^\/r\//, 'members get the way in');
  assert.equal((await get(`/api/feed/crews/one?id=${made.crew.id}`, chi)).crew.world.link, undefined, 'a non-member does not');
});

test('activation: a first post, community or "going" activates a person once, under their landing words, and nothing else does', async (t) => {
  const { f, get, post, player } = await setup(t);
  const ada = await player('Ada'), bola = await player('Bola');
  const growth = () => f.server.store.read((db) => JSON.parse(JSON.stringify((db as Record<string, any>).growth?.metrics?.activation ?? {})) as Record<string, Record<string, number>>);
  const total = async () => Object.values(await growth()).reduce((sum, keys) => sum + Object.values(keys).reduce((a, b) => a + b, 0), 0);
  assert.equal(await total(), 0, 'saying hello and reading the feed is not an action');
  await get('/api/feed/communities?city=lagos', ada);
  assert.equal(await total(), 0);
  assert.equal((await post('/api/feed/post', { body: 'Hello Yaba' }, ada)).ok, true);
  assert.equal(await total(), 1);
  assert.equal((await post('/api/feed/post', { body: 'Hello again' }, ada)).ok, true);
  const made = await post('/api/feed/crews', { name: 'Yaba Ballers', colour: 'gold', about: 'Football on Saturdays' }, ada);
  assert.equal(made.ok, true);
  assert.equal(await total(), 1, 'a second action is not a second activation');
  assert.equal((await post('/api/feed/crews/join', { code: made.crew.code }, bola)).ok, true);
  assert.equal(await total(), 2, 'a different person joining a community is the second');
  assert.deepEqual(Object.values(await growth()).flatMap((keys) => Object.keys(keys)), ['direct|direct|direct'], 'no utm words came with the hello');
});
