// OWNER: agents (prayers, docs/PRAYERS.md) - a player's prayer (the notice first), the Prayers page, and every act of the owner on a real server:
// limits (illness once a week and never on a minor, money inside the wallet rules, a stall blessed once a day, weather over the real weather),
// the append-only log, gist lines that carry no private detail, and the admin routes refusing everyone who is not an admin.
import test from 'node:test';
import assert from 'node:assert/strict';
import { admins, FOUNDER_ADDRESS } from '../admin/admin.test.ts';
import { LIMITS, NOTICE, RECEIVED, emptyActs, fateIn } from './model.ts';
import { agentWords } from '../moderation/agent-words.ts';
import type { TestContext } from 'node:test';

type Json = Record<string, unknown>;
const WEEK = LIMITS.sickGapMs, DAY = 86400000;

async function world(t: TestContext) {
  const a = await admins(t);
  const founder = await a.account(FOUNDER_ADDRESS, 'Founder');
  const act = (body: Json) => a.admin('/api/admin/prayers/act', founder.cookie, body);
  const page = async (query = ''): Promise<Json & { items: Json[]; log: { lines: Json[]; total: number } }> => (await a.admin(`/api/admin/prayers${query}`, founder.cookie)).body as never;
  const consent = (d: { cookie: string }, age: 'adult' | 'minor') => a.f.request('/api/growth/consent', { cityId: 'lagos', age }, d.cookie);
  const person = async (name: string, age: 'adult' | 'minor' | null = 'adult') => { const d = await a.ready(name); if (age) await consent(d, age); await a.f.request('/api/social/me', null, d.cookie); return d; };
  const edit = (d: { cookie: string }, change: (state: any) => void, city = 'lagos') => a.f.server.store.transact((db) => { const state = db.sessions[d.cookie.slice(4)]?.cities[city as 'lagos']?.state; assert.ok(state); change(state); });
  const pray = (d: { cookie: string }, body: Json = {}) => a.call('/api/world/pray', { text: 'Please let my mother be well.', notice: true, clientId: a.f.id(), ...body }, d.cookie);
  const gist = async (city = 'lagos') => ((await (await a.f.request(`/api/world/gist?id=${city}`)).json()) as { items: { text: string; kind: string }[] }).items;
  const heard = async (d: { cookie: string }) => JSON.stringify(await (await a.f.request('/api/social/me', null, d.cookie)).json());
  const tick = async () => { a.f.advance(25000); await a.f.server.store.read(() => 0); };
  return { a, founder, act, page, person, edit, pray, gist, heard, tick };
}

test('a player is shown the notice before the box, a prayer without it is refused, and three a day are kept for the admin to read', async (t) => {
  const w = await world(t);
  const ada = await w.person('Ada');
  const info = await (await w.a.call('/api/world/pray', null, ada.cookie)).json() as Json;
  assert.equal(info.notice, NOTICE); assert.equal(info.notice, 'Prayers are read by the people who run Allworld.'); assert.equal(info.left, 3);
  assert.equal((await w.a.call('/api/world/pray', null, '')).status, 401, 'a session is needed');
  const unseen = await w.pray(ada, { notice: undefined });
  assert.equal(unseen.status, 400); assert.equal(((await unseen.json()) as Json).error, 'notice_required');
  assert.equal((await w.page()).items.length, 0, 'nothing is kept for a prayer sent without the notice');
  const ok = await w.pray(ada);
  assert.equal(ok.status, 200); assert.equal(((await ok.json()) as Json).message, RECEIVED);
  assert.equal(((await (await w.a.call('/api/world/pray', null, ada.cookie)).json()) as Json).left, 2);
  assert.equal((await w.pray(ada, { text: 'call me on 08031234567' })).status, 400, 'no contact details');
  assert.equal((await w.pray(ada, { text: 'hi' })).status, 400, 'too short');
  await w.pray(ada, { text: 'Thank you for this week.' }); await w.pray(ada, { text: 'Guide my exam.' });
  assert.equal((await w.pray(ada, { text: 'One more.' })).status, 429);
  const shown = await w.page();
  assert.equal(shown.items.length, 3);
  assert.equal(shown.items[0]!.text, 'Guide my exam.', 'newest first');
  assert.equal(shown.items[0]!.name, 'Ada'); assert.equal(shown.items[0]!.by, 'player');
  // Filters: from, city, answered.
  assert.equal((await w.page('?by=resident')).items.length, 0);
  assert.equal((await w.page('?by=player&answered=no')).items.length, 3);
  assert.equal((await w.page('?answered=yes')).items.length, 0);
  assert.equal((await w.page('?city=ibadan')).items.length, 0);
  assert.equal((await w.page('?city=lagos')).items.length, 3);
  // Praying changes nothing in the game for the player.
  assert.equal(JSON.stringify(await w.heard(ada)).includes('prayer'), false);
});

test('the prayers and acts routes refuse everyone who is not an admin, even with a good body', async (t) => {
  const w = await world(t);
  const ada = await w.person('Ada'), guest = await w.a.player('Guest'), account = await w.a.account('plain@example.com', 'Plain');
  await w.pray(ada);
  for (const who of [ada.cookie, guest.cookie, account.cookie, '']) {
    const read = await w.a.admin('/api/admin/prayers', who);
    assert.equal(read.status, 404, 'the page'); assert.deepEqual(read.body, { error: 'not_found' });
    const act = await w.a.admin('/api/admin/prayers/act', who, { kind: 'heal', target: ada.id, reason: 'test' });
    assert.equal(act.status, 404, 'the act'); assert.deepEqual(act.body, { error: 'not_found' });
  }
  assert.equal(((await w.page()).log as { total: number }).total, 0, 'nothing was done');
});

test('heal cures an illness and names a confirmed adult kindly in the gist; a resident is healed in its own fate', async (t) => {
  const w = await world(t);
  const ada = await w.person('Ada'), kid = await w.person('Kunle', 'minor');
  await w.edit(ada, (state) => { state.health.sick = true; state.health.cause = 'rain'; state.health.since = 1; });
  const done = await w.act({ kind: 'heal', target: ada.id, reason: 'prayer for health' });
  assert.equal(done.status, 200); assert.equal(done.body.code, 'done');
  assert.equal((await w.a.life(ada.cookie) as any).health.sick, false);
  assert.match(await w.heard(ada), /You woke up feeling much better\./);
  await w.tick();
  const lines = await w.gist();
  assert.ok(lines.some((line) => line.kind === 'owner' && line.text === 'Ada is on the mend'), 'a confirmed adult is named when the line is kind');
  // A minor is healed but never in the gist.
  assert.equal((await w.act({ kind: 'heal', target: kid.id, reason: 'a cold' })).status, 200);
  assert.equal(JSON.stringify(await w.gist()).includes('Kunle'), false);
  assert.equal((await w.gist()).filter((line) => line.kind === 'owner').length, 1, 'no line for the minor');
  // A resident: sicken then heal through its fate.
  await w.act({ kind: 'sicken', target: 'resident.lagos.remi', reason: 'a test' });
  assert.ok((fateIn(await w.a.f.server.store.read((db) => db), 'resident.lagos.remi')?.sickUntil ?? 0) > w.a.f.now());
  await w.act({ kind: 'heal', target: 'resident.lagos.remi', reason: 'a test' });
  assert.equal(fateIn(await w.a.f.server.store.read((db) => db), 'resident.lagos.remi')?.sickUntil, undefined);
});

test('an illness: only on a confirmed adult, once a week per person, never on a minor or an unknown age; the gist says a fever is going round, with no name', async (t) => {
  const w = await world(t);
  const ada = await w.person('Ada'), kid = await w.person('Kunle', 'minor'), unknown = await w.person('Nobody', null);
  for (const d of [kid, unknown]) { const r = await w.act({ kind: 'sicken', target: d.id, reason: 'not allowed' }); assert.equal(r.status, 409); assert.equal(r.body.error, 'minor_protected'); assert.equal((await w.a.life(d.cookie) as any).health.sick, false); }
  assert.equal((await w.act({ kind: 'sicken', target: ada.id, reason: 'a test' })).status, 200);
  assert.equal((await w.a.life(ada.cookie) as any).health.sick, true);
  assert.match(await w.heard(ada), /fever coming on/);
  assert.equal(JSON.stringify(await w.heard(ada)).match(/admin|owner|prayer/i), null, 'not a message from the owner');
  // Cured by other means, the same person still cannot be sickened again within the week.
  await w.edit(ada, (state) => { state.health.sick = false; state.health.cause = null; state.health.since = null; state.health.immuneUntil = 0; });
  const again = await w.act({ kind: 'sicken', target: ada.id, reason: 'again' });
  assert.equal(again.status, 409); assert.equal(again.body.error, 'sick_too_soon');
  w.a.f.advance(WEEK + 1000);
  await w.edit(ada, (state) => { state.health.immuneUntil = 0; });
  assert.equal((await w.act({ kind: 'sicken', target: ada.id, reason: 'a week on' })).status, 200);
  await w.tick();
  const owner = (await w.gist()).filter((line) => line.kind === 'owner');
  assert.ok(owner.length >= 1 && owner.every((line) => /^A fever is going round /.test(line.text)), JSON.stringify(owner));
  assert.equal(owner.some((line) => line.text.includes('Ada')), false);
});

test('game money: inside the wallet and the admin limits, never below zero, audited, and the gist never carries an amount', async (t) => {
  const w = await world(t);
  const ada = await w.person('Ada'), kid = await w.person('Kunle', 'minor');
  const before = (await w.a.life(ada.cookie)).cash;
  const given = await w.act({ kind: 'give', target: ada.id, amount: 500, reason: 'a small luck' });
  assert.equal(given.status, 200);
  const after = await w.a.life(ada.cookie);
  assert.equal(after.cash, before + 500);
  assert.ok(after.ledger.some((entry) => entry.amount === 500 && /Luck/.test(entry.reason)), 'one ledger line through the wallet');
  assert.equal(after.social.earned, 0, 'a gift is not earned money');
  assert.match(await w.heard(ada), /A bit of luck/);
  for (const amount of [0, -5, 1.5, LIMITS.moneyMax + 1]) { const r = await w.act({ kind: 'give', target: ada.id, amount, reason: 'too much' }); assert.equal(r.status, 400, `amount ${amount}`); assert.equal(r.body.error, 'invalid_amount'); }
  const huge = await w.act({ kind: 'take', target: ada.id, amount: LIMITS.moneyMax, reason: 'a hard week' });
  assert.equal(huge.status, 200);
  assert.equal((await w.a.life(ada.cookie)).cash, 0, 'a debit takes at most the balance');
  const empty = await w.act({ kind: 'take', target: ada.id, amount: 10, reason: 'again' });
  assert.equal(empty.status, 409); assert.equal(empty.body.error, 'nothing_to_take');
  // The admin audit knows both, as an ordinary credit and debit, so the day limits count them.
  const audit = (await w.a.admin('/api/admin/audit?action=credit', w.founder.cookie)).body as { lines: { params: Json }[] };
  assert.ok(audit.lines.some((line) => line.params.via === 'prayer-act'));
  assert.equal((await w.act({ kind: 'give', target: kid.id, amount: 100, reason: 'a minor may be given a little' })).status, 200);
  assert.equal((await w.act({ kind: 'give', target: 'resident.lagos.remi', amount: 100, reason: 'not allowed' })).body.error, 'resident_no_purse');
  await w.tick();
  const owner = (await w.gist()).filter((line) => line.kind === 'owner').map((line) => line.text);
  assert.equal(owner.length, 2); assert.ok(owner.includes('Ada had a stroke of luck this week'));
  assert.ok(owner.every((text) => !/[₦\d]/.test(text)), 'no amount');
  assert.equal(owner.some((text) => text.includes('Kunle')), false, 'a minor is not in the gist');
  const taken = owner.find((text) => /pinch/.test(text)) ?? '';
  assert.match(taken, /^A few households in .+ felt the pinch this week$/); assert.equal(taken.includes('Ada'), false, 'a taking names nobody');
});

test('weather over a city lays over the real weather for a few hours, once at a time, and the gist says so', async (t) => {
  const w = await world(t);
  const hour = (state: { hours: [number, string, number | null][] } | null) => state?.hours.find((h) => h[0] <= w.a.f.now() && w.a.f.now() < h[0] + 3600000)?.[1];
  const sky = async () => ((await (await w.a.f.request('/api/world/feed?id=ibadan')).json()) as { weather: { hours: [number, string, number | null][] } | null }).weather;
  assert.equal(hour(await sky()), undefined, 'no observed weather yet');
  for (const body of [{ hours: 0 }, { hours: LIMITS.weatherHoursMax + 1 }, { hours: 2, sky: 'snow' }, { hours: 2, sky: 'rain', city: 'nowhere' }]) {
    const r = await w.act({ kind: 'weather', city: 'ibadan', sky: 'rain', reason: 'test', ...body }); assert.equal(r.status, 400, JSON.stringify(body));
  }
  const done = await w.act({ kind: 'weather', city: 'ibadan', sky: 'rain', hours: 3, reason: 'a drought' });
  assert.equal(done.status, 200);
  assert.equal(hour(await sky()), 'rain');
  const twice = await w.act({ kind: 'weather', city: 'ibadan', sky: 'clear', hours: 2, reason: 'again' });
  assert.equal(twice.status, 409); assert.equal(twice.body.error, 'weather_active');
  w.a.f.advance(4 * 3600000);
  assert.notEqual(hour(await sky()), 'rain', 'it ends');
  await w.tick();
  assert.ok((await w.gist('ibadan')).some((line) => line.kind === 'owner' && line.text === 'Rain came early over Ibadan'));
});

test('a dream or a sign reaches the person as their own, is gentle, and is limited to one a day', async (t) => {
  const w = await world(t);
  const ada = await w.person('Ada');
  const ok = await w.act({ kind: 'dream', target: ada.id, text: 'your grandmother smiling in a market', form: 'dream', reason: 'comfort' });
  assert.equal(ok.status, 200);
  const heard = await w.heard(ada);
  assert.match(heard, /A dream stayed with you: your grandmother smiling in a market/);
  assert.equal(/admin|owner|prayer|Allworld/i.test(heard.replace(/Allworld/g, '')), false, 'not a message from the owner');
  assert.equal((await w.act({ kind: 'dream', target: ada.id, text: 'a second one tonight', reason: 'again' })).body.error, 'dream_too_soon');
  w.a.f.advance(DAY + 1000);
  assert.equal((await w.act({ kind: 'dream', target: ada.id, text: 'a bird on a green gate', form: 'sign', reason: 'a sign' })).status, 200);
  assert.match(await w.heard(ada), /You noticed a sign: a bird on a green gate/);
  w.a.f.advance(DAY + 1000);
  for (const text of ['visit www.example.com now', 'send me 5000 naira', 'call 08031234567 tonight', 'short']) assert.equal((await w.act({ kind: 'dream', target: ada.id, text, reason: 'not allowed' })).status, 400, text);
  // A resident keeps it as a dream in its fate (read into its next turns).
  assert.equal((await w.act({ kind: 'dream', target: 'resident.lagos.remi', text: 'a green door in the rain', reason: 'comfort' })).status, 200);
  assert.equal(fateIn(await w.a.f.server.store.read((db) => db), 'resident.lagos.remi')?.dreams?.[0]?.text, 'a green door in the rain');
  assert.equal((await w.act({ kind: 'dream', target: 'resident.lagos.remi', text: 'we are all in a game', reason: 'not allowed' })).status, 400, 'a resident is never told what it lives in');
  assert.equal((await w.gist()).filter((line) => line.kind === 'owner').length, 0, 'a dream is private: no gist line');
});

test('crossing two paths: only confirmed adults in one city, at a public place, and each feels a pull', async (t) => {
  const w = await world(t);
  const ada = await w.person('Ada'), tunde = await w.person('Tunde'), kid = await w.person('Kunle', 'minor');
  const cross = (body: Json) => w.act({ kind: 'cross', target: ada.id, other: tunde.id, venue: 'market', reason: 'a test', ...body });
  assert.equal((await cross({ other: kid.id })).body.error, 'minor_protected');
  assert.equal((await cross({ other: ada.id })).body.error, 'invalid_target');
  assert.equal((await cross({ venue: 'home' })).body.error, 'invalid_venue');
  assert.equal((await cross({ venue: 'nowhere-at-all' })).body.error, 'invalid_venue');
  assert.equal((await cross({})).status, 200);
  for (const d of [ada, tunde]) assert.match(await w.heard(d), /Something keeps pulling you towards .+ today\./);
  const remi = await cross({ other: 'resident.lagos.remi', venue: 'market' });
  assert.equal(remi.status, 200);
  assert.equal(fateIn(await w.a.f.server.store.read((db) => db), 'resident.lagos.remi')?.cross?.venue, 'market');
});

test('silence answers a prayer without acting, and a prayer is answered once', async (t) => {
  const w = await world(t);
  const ada = await w.person('Ada');
  await w.pray(ada);
  const n = Number((await w.page()).items[0]!.n);
  assert.equal((await w.act({ kind: 'silence', reason: 'no prayer given' })).body.error, 'prayer_required');
  const before = JSON.stringify(await w.a.life(ada.cookie));
  assert.equal((await w.act({ kind: 'silence', prayer: n, reason: 'it is for the person to carry' })).status, 200);
  assert.equal(JSON.stringify(await w.a.life(ada.cookie)), before, 'nothing in the life changed');
  const shown = await w.page('?answered=yes');
  assert.equal(shown.items.length, 1); assert.equal((shown.items[0]!.answered as Json).act, 'silence');
  assert.equal((await w.act({ kind: 'heal', prayer: n, reason: 'late' })).body.error, 'already_answered');
  assert.equal((await w.act({ kind: 'heal', prayer: 999, reason: 'late' })).body.error, 'unknown_prayer');
  // Answering from the prayer itself aims the act at whoever prayed.
  await w.pray(ada, { text: 'I am unwell this week.' });
  await w.edit(ada, (state) => { state.health.sick = true; state.health.cause = 'rain'; state.health.since = 1; });
  const second = Number((await w.page('?answered=no')).items[0]!.n);
  assert.equal((await w.act({ kind: 'heal', prayer: second, reason: 'prayer for health' })).status, 200);
  assert.equal((await w.a.life(ada.cookie) as any).health.sick, false);
});

test('a stall is blessed once a day with a small capped boost', async (t) => {
  const w = await world(t);
  const ada = await w.person('Ada');
  await w.edit(ada, (state) => { state.cash = 100000; state.ledger = []; state.ledgerDays = []; state.location = 'market'; state.social.earned = 30000; });
  await w.a.f.request('/api/social/me', null, ada.cookie);
  assert.equal((await w.act({ kind: 'bless', target: ada.id, reason: 'no stall' })).body.error, 'no_stall');
  const opened = await w.a.call('/api/business/open', { cityId: 'lagos', venue: 'market', type: 'food', name: 'Mama Put', colour: 'gold', icon: '🍲', requestId: w.a.f.id() }, ada.cookie);
  assert.equal(((await opened.json()) as Json).code, 'opened');
  const till = async () => ((await w.a.f.server.store.read((db) => (db.business as { shops: Record<string, { till: number }> }).shops[ada.id]?.till)) ?? 0);
  const was = await till();
  assert.equal((await w.act({ kind: 'bless', target: ada.id, amount: 999999, reason: 'busy day' })).status, 200);
  assert.equal(await till(), was + LIMITS.blessMax, 'capped');
  assert.equal((await w.act({ kind: 'bless', target: ada.id, reason: 'again' })).body.error, 'blessed_today');
  await w.tick();
  const line = (await w.gist()).find((item) => item.kind === 'owner');
  assert.match(line?.text ?? '', /^Customers kept coming to a stall in .+ all day$/);
  assert.equal(/Mama Put|Ada/.test(line?.text ?? ''), false);
});

test('every act is logged with who, when, what, target and reason; the log only grows and is bounded', async (t) => {
  const w = await world(t);
  const ada = await w.person('Ada');
  await w.act({ kind: 'dream', target: ada.id, text: 'a quiet river at dusk', reason: 'comfort' });
  w.a.f.advance(60000);
  await w.act({ kind: 'weather', city: 'lagos', sky: 'clear', hours: 1, reason: 'a wedding' });
  const log = (await w.page()).log;
  assert.equal(log.total, 2); assert.equal(log.lines[0]!.n, 2, 'newest first');
  const [weather, dream] = log.lines as Json[];
  assert.equal(weather!.kind, 'weather'); assert.equal(weather!.reason, 'a wedding'); assert.equal(weather!.adminName, 'Founder'); assert.equal(typeof weather!.at, 'number'); assert.equal(weather!.targetKind, 'city');
  assert.equal(dream!.kind, 'dream'); assert.equal(dream!.target, ada.id); assert.equal(dream!.targetName, 'Ada'); assert.equal(dream!.reason, 'comfort');
  assert.ok(Number(weather!.at) > Number(dream!.at));
  assert.equal((await w.a.admin('/api/admin/audit?action=act-dream', w.founder.cookie)).status, 200);
  // A refused act writes nothing.
  await w.act({ kind: 'sicken', target: 'resident.lagos.remi', reason: 'first try' });
  const refused = await w.act({ kind: 'sicken', target: 'resident.lagos.remi', reason: 'again' });
  assert.equal(refused.status, 409);
  assert.equal((await w.page()).log.total, 3);
  // Bounded: a log already full drops its oldest line, never grows past the cap, and the numbers keep counting.
  await w.a.f.server.store.transact((db) => {
    const acts = (db['ownerActs'] ??= emptyActs()) as ReturnType<typeof emptyActs>;
    const base = acts.lines[0]!;
    acts.lines = Array.from({ length: LIMITS.logKept }, (_, i) => ({ ...base, n: i + 1 }));
    acts.seq = LIMITS.logKept;
  });
  w.a.f.advance(WEEK);
  assert.equal((await w.act({ kind: 'dream', target: ada.id, text: 'a bird on a green gate', reason: 'bound' })).status, 200);
  const stored = (await w.a.f.server.store.read((db) => (db['ownerActs'] as ReturnType<typeof emptyActs>))) as ReturnType<typeof emptyActs>;
  assert.equal(stored.lines.length, LIMITS.logKept); assert.equal(stored.lines.at(-1)!.n, LIMITS.logKept + 1); assert.equal(stored.lines[0]!.n, 2);
});

test('the gist carries no id, no amount, no reason and no word of prayer or owner, whatever was done', async (t) => {
  const w = await world(t);
  const ada = await w.person('Ada'), tunde = await w.person('Tunde');
  await w.pray(ada, { text: 'Secret: my brother is in hospital.' });
  await w.act({ kind: 'heal', target: ada.id, reason: 'private reason about the hospital' });
  await w.act({ kind: 'give', target: tunde.id, amount: 700, reason: 'private reason about rent' });
  await w.act({ kind: 'take', target: ada.id, amount: 5, reason: 'private reason' });
  await w.act({ kind: 'sicken', target: tunde.id, reason: 'private reason' });
  await w.act({ kind: 'weather', city: 'lagos', sky: 'storm', hours: 2, reason: 'private reason' });
  await w.tick();
  const text = (await w.gist()).map((line) => line.text).join('\n');
  assert.ok((await w.gist()).filter((line) => line.kind === 'owner').length >= 4);
  assert.equal(/private|hospital|rent|brother|Secret|700|₦|prayer|owner|admin/i.test(text), false, text);
  assert.equal(new RegExp(`${ada.id}|${tunde.id}|[0-9a-f]{8}-[0-9a-f]{4}`).test(text), false, 'no id');
});

test('a prayer written by a resident passes the agent word rules, and one that does not is not kept', () => {
  assert.equal(agentWords('Thank you for this quiet morning. Keep my sister safe in Ibadan.', { toMinor: true }).ok, true);
  assert.equal(agentWords('Please send me money to my account', { toMinor: true }).ok, false);
});
