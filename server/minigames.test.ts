import { loadCityContent as preloadCityContent } from '../src/game/cities/registry.ts';
await preloadCityContent('lagos');
// OWNER: minigames — the local mini-games on the server (docs/MINI-GAMES.md): the market haggle (the floor stays on the server, the trader remembers, a deal becomes
// a real purchase, once), the skit studio's word check, NYSC camp (three weeks, one duty a day, paid once) and JAMB season (answers checked on the server, the mock
// marked there, small capped prizes), each season behind an admin switch and for Nigeria only; erasure leaves nothing behind.
import test from 'node:test';
import type { TestContext } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { createStore } from './store.ts';
import { fixture } from './test-fixture.ts';
import { ROUTE_MODULES } from './routes/index.ts';
import minigamesRoutes from './routes/minigames.ts';
import { HAGGLE } from './house/haggle.ts';
import { BUYS_PER_DAY, REPHRASE_PLAYER_DAY, haggleService, pricedToday, tradersOf } from './minigames/haggle.ts';
import type { AskInput, AskResult } from './models/router.ts';
import { templatesOf } from './minigames/haggle-lines.ts';
import { optionsOf } from './minigames/jamb-questions.ts';
import { MOCK_MINUTES, PAY_PER_CORRECT, MOCK_PAY, MOCK_PAY_LOW } from './minigames/jamb.ts';
import { DUTIES, DUTY_PAY, PASS_OUT_PAY } from './minigames/nysc.ts';
import { SEASON_DAY_CAP } from './minigames/common.ts';
import { forgetMinigamesPlayers, peekMinigames } from './minigames/store.ts';
import { dayOf } from './minigames/common.ts';
import type { Look } from '../src/types/life.ts';

type F = Awaited<ReturnType<typeof fixture>>;
type Player = { cookie: string; id: string };
type Json = Record<string, any>;
const LOOK: Look = { body: 'woman', hair: 'braids', outfit: 'casual', fabric: 'plain', skin: 'skin-4', hairColor: 'black', outfitColor: 'blue', bottomsColor: 'navy' };
const DAY = 86_400_000;

/** A server whose stored admin settings are the given ones, as an operator's choice is stored before the host starts. */
async function setup(t: TestContext, settings: Record<string, boolean | string> = {}): Promise<F> {
  const dir = await mkdtemp(join(tmpdir(), 'minigames-'));
  t.after(() => rm(dir, { recursive: true, force: true }));
  const store = await createStore(dir, { log: () => {} });
  await store.transact((db) => { (db as Record<string, unknown>)['adminSettings'] = { values: Object.fromEntries(Object.entries(settings).map(([key, value]) => [key, { value, at: 1, by: 'test' }])) }; });
  return fixture(t, { store });
}
async function onboard(f: F, name: string): Promise<Player> {
  const created = await f.request('/api/session', { name, onboarding: true });
  const value = await created.json() as { session?: { id?: string } };
  const player = { cookie: (created.headers.get('set-cookie') ?? '').split(';')[0] ?? '', id: value.session?.id ?? '' };
  assert.equal((await f.action(player.cookie, { type: 'onboarding.quick-start', payload: { look: LOOK } })).code, 'playing');
  return player;
}
const post = async (f: F, path: string, body: object, player: Player): Promise<Json> => (await f.request(`/api/minigames/${path}`, body, player.cookie)).json() as Promise<Json>;
const get = async (f: F, path: string, player: Player): Promise<Json> => (await f.request(`/api/minigames/${path}`, null, player.cookie)).json() as Promise<Json>;
const life = <T>(f: F, player: Player, read: (state: any) => T): Promise<T> => f.server.store.read((db) => read(Object.values(db.sessions).find((s) => s.publicId === player.id)!.cities.lagos!.state));
const cash = (f: F, player: Player): Promise<number> => life(f, player, (state) => state.cash);
const bag = (f: F, player: Player): Promise<Record<string, number>> => life(f, player, (state) => ({ ...state.business.bag }));
/** Puts the person's life in a place with this much cash. */
const place = (f: F, player: Player, venue: string, money?: number): Promise<void> => f.server.store.transact((db) => {
  const state = Object.values(db.sessions).find((s) => s.publicId === player.id)!.cities.lagos!.state;
  state.location = venue; state.spot = null; if (money !== undefined) state.cash = money;
});
const sade = tradersOf('lagos')[0]!, emeka = tradersOf('lagos')[1]!;
const priced = (f: F, id: string, trader = sade) => pricedToday(trader, id, dayOf(f.now()))!;
const talkOf = (body: Json, item: string): Json | undefined => (body.trader.talks as Json[]).find((talk) => talk.item === item);

test('the module is registered, and every route needs a session', async (t) => {
  assert.ok(ROUTE_MODULES.includes(minigamesRoutes));
  const f = await setup(t);
  assert.equal((await f.request('/api/minigames/seasons?city=lagos')).status, 401, 'a session is needed');
});

test('the market haggle: the floor stays on the server, offers are answered, a deal is held, and buying it is a real purchase made once', async (t) => {
  const f = await setup(t), ada = await onboard(f, 'Ada');
  // Away from the market a haggle is refused, and the stalls say so.
  await place(f, ada, 'park', 30000);
  const away = await get(f, 'haggle/stalls?city=lagos', ada);
  assert.equal(away.ok, true);
  assert.equal(away.stalls.here, false);
  assert.equal(away.stalls.marketName, 'Balogun Market');
  assert.equal((await post(f, 'haggle/open', { cityId: 'lagos', trader: 'sade', item: 'ankara' }, ada)).code, 'not_at_market');
  await place(f, ada, 'market');
  const stalls = await get(f, 'haggle/stalls?city=lagos', ada);
  assert.equal(stalls.stalls.here, true);
  assert.deepEqual(stalls.stalls.traders.map((trader: Json) => trader.key), ['sade', 'emeka']);
  assert.ok(stalls.stalls.traders.every((trader: Json) => trader.ai === true), 'every trader is marked AI-played');
  assert.equal(stalls.stalls.traders[0].memory, 'new');
  assert.equal(stalls.stalls.today.cap, BUYS_PER_DAY);
  assert.doesNotMatch(JSON.stringify(stalls), /floor|fair/i, 'the floor and the fair price never leave the server');

  const ankara = priced(f, 'ankara');
  assert.equal(stalls.stalls.traders[0].items.find((item: Json) => item.id === 'ankara').list, ankara.list);
  // Offers before the talk is opened, for a thing the trader does not sell, or not in naira are refused.
  assert.equal((await post(f, 'haggle/offer', { cityId: 'lagos', trader: 'sade', item: 'ankara', offer: 1000, requestId: f.id() }, ada)).code, 'open_first');
  assert.equal((await post(f, 'haggle/open', { cityId: 'lagos', trader: 'sade', item: 'cap' }, ada)).code, 'unknown_item');
  assert.equal((await post(f, 'haggle/open', { cityId: 'lagos', trader: 'nobody', item: 'ankara' }, ada)).code, 'unknown_trader');
  const opened = await post(f, 'haggle/open', { cityId: 'lagos', trader: 'sade', item: 'ankara' }, ada);
  assert.equal(opened.ok, true);
  assert.equal(opened.trader.talks[0].ask, ankara.list, 'the first ask is the list price');
  assert.equal(opened.trader.talks[0].roundsLeft, HAGGLE.rounds);
  assert.equal(opened.trader.talks[0].lines.length, 1);
  assert.equal(opened.said, opened.trader.talks[0].lines[0].text);
  assert.equal((await post(f, 'haggle/offer', { cityId: 'lagos', trader: 'sade', item: 'ankara', offer: 5, requestId: f.id() }, ada)).code, 'invalid_offer');

  // A silly offer is refused and the ask stays; the same request twice costs one round only.
  const requestId = f.id();
  const low = await post(f, 'haggle/offer', { cityId: 'lagos', trader: 'sade', item: 'ankara', offer: 200, requestId }, ada);
  assert.equal(low.ok, true);
  assert.equal(talkOf(low, 'ankara')!.ask, ankara.list);
  assert.equal(talkOf(low, 'ankara')!.roundsLeft, HAGGLE.rounds - 1);
  assert.equal(talkOf(low, 'ankara')!.state, 'open');
  const again = await post(f, 'haggle/offer', { cityId: 'lagos', trader: 'sade', item: 'ankara', offer: 200, requestId }, ada);
  assert.equal(again.duplicate, true);
  assert.equal(talkOf(again, 'ankara')!.roundsLeft, HAGGLE.rounds - 1, 'a repeated request is harmless');
  // An offer between the floor and fair is countered, never under the floor.
  const mid = await post(f, 'haggle/offer', { cityId: 'lagos', trader: 'sade', item: 'ankara', offer: ankara.floor, requestId: f.id() }, ada);
  const counter = talkOf(mid, 'ankara')!;
  assert.ok(counter.ask >= ankara.floor && counter.ask < ankara.list, `countered at ${counter.ask}`);
  assert.equal(counter.state, 'open');
  assert.equal(counter.lines.at(-1).who, 'trader');
  // A fair offer is taken at once; the price is held and nothing was charged yet.
  const before = await cash(f, ada);
  const deal = await post(f, 'haggle/offer', { cityId: 'lagos', trader: 'sade', item: 'ankara', offer: ankara.fair, requestId: f.id() }, ada);
  const held = talkOf(deal, 'ankara')!;
  assert.equal(held.state, 'deal');
  assert.equal(held.deal, ankara.fair);
  assert.equal(held.saved, ankara.list - ankara.fair);
  assert.ok(['fair', 'good', 'sharp', 'floor'].includes(held.grade));
  assert.equal(held.dealUntil, f.now() + HAGGLE.quoteMs);
  assert.equal(await cash(f, ada), before, 'agreeing a price charges nothing');
  // Nothing said afterwards lowers it.
  const lower = await post(f, 'haggle/offer', { cityId: 'lagos', trader: 'sade', item: 'ankara', offer: 10, requestId: f.id() }, ada);
  assert.equal(talkOf(lower, 'ankara')!.deal, ankara.fair);

  // Buying: the price held, once, into the bag.
  const bought = await post(f, 'haggle/buy', { cityId: 'lagos', trader: 'sade', item: 'ankara', requestId: f.id() }, ada);
  assert.equal(bought.ok, true, bought.reason);
  assert.equal(bought.paid, ankara.fair);
  assert.equal(await cash(f, ada), before - ankara.fair, 'paid exactly the held price');
  assert.equal((await bag(f, ada)).ankara, 1, 'the cloth is in the bag');
  assert.equal(talkOf(bought, 'ankara')!.state, 'bought');
  assert.equal(bought.best.saved, ankara.list - ankara.fair);
  assert.equal(bought.best.item, 'Ankara wax print');
  assert.ok(bought.best.lines.length >= 2 && bought.best.lines.every((line: Json) => Object.keys(line).sort().join() === 'text,who'));
  const second = await post(f, 'haggle/buy', { cityId: 'lagos', trader: 'sade', item: 'ankara', requestId: f.id() }, ada);
  assert.equal(second.ok, true);
  assert.equal(await cash(f, ada), before - ankara.fair, 'never charged twice');
  assert.equal((await bag(f, ada)).ankara, 1);
  assert.equal((await post(f, 'haggle/buy', { cityId: 'lagos', trader: 'sade', item: 'adire', requestId: f.id() }, ada)).code, 'no_deal');
});

test('the trader remembers the person: the same day ("You again? Last price."), the next day, and as a regular; three buys a day at most; a lapsed deal; a short purse', async (t) => {
  const f = await setup(t), ada = await onboard(f, 'Ada');
  await place(f, ada, 'market', 100000);
  const buy = async (trader: string, item: string, spec = sade) => {
    assert.equal((await post(f, 'haggle/open', { cityId: 'lagos', trader, item }, ada)).ok, true);
    const offer = await post(f, 'haggle/offer', { cityId: 'lagos', trader, item, offer: priced(f, item, spec).fair, requestId: f.id() }, ada);
    assert.equal(talkOf(offer, item)!.state, 'deal');
    return post(f, 'haggle/buy', { cityId: 'lagos', trader, item, requestId: f.id() }, ada);
  };
  assert.equal((await buy('sade', 'ankara')).ok, true);
  // The same day: "You again? Last price." and only two offers.
  const again = await post(f, 'haggle/open', { cityId: 'lagos', trader: 'sade', item: 'indigo' }, ada);
  assert.equal(again.trader.memory, 'again');
  assert.equal(again.trader.talks.find((talk: Json) => talk.item === 'indigo').roundsLeft, 2);
  const pidginWarm = templatesOf('pidgin', 'warm', 'again').map((line) => line.split('{')[0]!.trim());
  assert.ok(pidginWarm.some((start) => again.said.startsWith(start)) && /last price/i.test(again.said), `said: ${again.said}`);
  assert.equal(again.said.includes('₦'), true, 'the last price is named');
  const indigo = await post(f, 'haggle/offer', { cityId: 'lagos', trader: 'sade', item: 'indigo', offer: priced(f, 'indigo').fair, requestId: f.id() }, ada);
  assert.equal(talkOf(indigo, 'indigo')!.state, 'deal');
  assert.equal((await post(f, 'haggle/buy', { cityId: 'lagos', trader: 'sade', item: 'indigo', requestId: f.id() }, ada)).ok, true);
  assert.equal((await buy('sade', 'adire')).ok, true);
  assert.equal((await post(f, 'haggle/open', { cityId: 'lagos', trader: 'sade', item: 'aso-oke' }, ada)).code, 'day_limit', `${BUYS_PER_DAY} buys a day`);
  assert.equal((await get(f, 'haggle/stalls?city=lagos', ada)).stalls.today.bought, 3);
  assert.equal((await cash(f, ada)) > 0, true);

  // The next day: three purchases make a regular, who opens a little lower and gives one more offer.
  f.advance(DAY);
  const regular = await post(f, 'haggle/open', { cityId: 'lagos', trader: 'sade', item: 'aso-oke' }, ada);
  assert.equal(regular.trader.memory, 'regular');
  const talk = talkOf(regular, 'aso-oke')!, aso = priced(f, 'aso-oke');
  assert.ok(talk.ask < aso.list && talk.ask >= aso.floor, 'a regular\'s opening ask is lower but never under the floor');
  assert.equal(talk.roundsLeft, HAGGLE.rounds + 1);
  assert.match(regular.said, /Ada/, 'a regular is called by name');
  assert.equal((await get(f, 'haggle/stalls?city=lagos', ada)).stalls.traders[1].memory, 'new', 'another trader does not know the person');
  // One purchase at the other trader, then a day later he remembers.
  assert.equal((await buy('emeka', 'cap', emeka)).ok, true);
  f.advance(DAY);
  assert.equal((await get(f, 'haggle/stalls?city=lagos', ada)).stalls.traders[1].memory, 'returning');
  assert.equal((await get(f, 'haggle/stalls?city=lagos', ada)).stalls.traders[0].memory, 'regular');

  // A deal that was held too long is gone; a purse that is too short is told so.
  const lapsed = await post(f, 'haggle/open', { cityId: 'lagos', trader: 'sade', item: 'adire' }, ada);
  assert.equal(lapsed.ok, true);
  await post(f, 'haggle/offer', { cityId: 'lagos', trader: 'sade', item: 'adire', offer: priced(f, 'adire').fair, requestId: f.id() }, ada);
  f.advance(HAGGLE.quoteMs + 1000);
  assert.equal((await post(f, 'haggle/buy', { cityId: 'lagos', trader: 'sade', item: 'adire', requestId: f.id() }, ada)).code, 'deal_lapsed');
  const restarted = await post(f, 'haggle/open', { cityId: 'lagos', trader: 'sade', item: 'adire' }, ada);
  assert.equal(talkOf(restarted, 'adire')!.deal, null);
  await post(f, 'haggle/offer', { cityId: 'lagos', trader: 'sade', item: 'adire', offer: priced(f, 'adire').list, requestId: f.id() }, ada);
  await place(f, ada, 'market', 5);
  const short = await post(f, 'haggle/buy', { cityId: 'lagos', trader: 'sade', item: 'adire', requestId: f.id() }, ada);
  assert.equal(short.code, 'short');
  assert.equal(await cash(f, ada), 5, 'nothing was taken');
  assert.equal(talkOf({ trader: (await get(f, 'haggle/stalls?city=lagos', ada)).stalls.traders[0] }, 'adire')!.state, 'deal', 'the held price waits');
});

test('a model may rephrase a verdict line within a small daily cap, and can change nothing but the words', async (t) => {
  const f = await setup(t), ada = await onboard(f, 'Ada');
  await place(f, ada, 'market', 50000);
  const asked: AskInput[] = [];
  let reply = '';
  const ask = async (input: AskInput): Promise<AskResult> => { asked.push(input); return { ok: true, text: reply, model: 'fake', provider: 'fake', free: true, usage: null, costMicro: 0 } as unknown as AskResult; };
  const service = haggleService(f.server.context, { ask });
  const session = await f.server.store.read((db) => Object.values(db.sessions).find((s) => s.publicId === ada.id)!);
  const body = { cityId: 'lagos', trader: 'sade', item: 'ankara' };
  const plan = () => f.server.store.read((db) => service.rephrasePlan(db, session, body, f.now()));
  await post(f, 'haggle/open', body, ada);
  assert.equal(await plan(), null, 'an opening line is never rephrased');
  const counter = async (offer: number) => post(f, 'haggle/offer', { ...body, offer, requestId: f.id() }, ada);
  const ankara = priced(f, 'ankara');
  const first = await counter(ankara.floor);
  const written = talkOf(first, 'ankara')!.lines.at(-1).text as string;
  const planned = (await plan())!;
  assert.deepEqual({ written: planned.written, kind: planned.kind, name: planned.name }, { written, kind: 'counter', name: 'Alhaja Sade' });
  // A reply with a price of its own is thrown away: the written line stands.
  reply = 'Ok my friend, ₦1,000 and it is yours today.';
  assert.equal(await service.rephraseAsk(planned), null);
  assert.equal(asked.length, 1);
  assert.equal(asked[0]!.carriesPlayerWords, false, 'no word of the person goes to the model');
  assert.match(asked[0]!.messages.map((m) => m.content).join(' '), /AI-played/);
  // A clean reply replaces the line, once, and counts against the day.
  const price = written.match(/₦[\d,]+/)![0];
  reply = `Hmm, you dey try o, ${price} na where we dey reach, my friend.`;
  const made = (await service.rephraseAsk(planned))!;
  assert.equal(made.text, reply);
  await f.server.store.transact((db) => { assert.equal(service.useRephrase(db, session, body, f.now(), made), true); });
  const shown = talkOf({ trader: (await get(f, 'haggle/stalls?city=lagos', ada)).stalls.traders[0] }, 'ankara')!;
  assert.equal(shown.lines.at(-1).text, reply);
  assert.equal(shown.ask, talkOf(first, 'ankara')!.ask, 'the price did not move');
  assert.equal(await plan(), null, 'a rephrased line is not rephrased again');
  await f.server.store.transact((db) => { assert.equal(service.useRephrase(db, session, body, f.now(), made), false, 'the line it was made from is gone'); });
  // The person's cap, then the switch.
  let used = 1;
  for (let n = 0; n < 6 && used < REPHRASE_PLAYER_DAY + 1; n++) {
    const next = await counter(ankara.floor + 10 * (n + 1));
    if (talkOf(next, 'ankara')!.state !== 'open') break;
    const p = await plan();
    if (!p) break;
    reply = `Fine fine, ${p.written.match(/₦[\d,]+/)?.[0] ?? ''} for you, my person, na so e be.`;
    const m = await service.rephraseAsk(p);
    if (!m) break;
    await f.server.store.transact((db) => { service.useRephrase(db, session, body, f.now(), m); });
    used += 1;
  }
  assert.equal(used, REPHRASE_PLAYER_DAY, `${REPHRASE_PLAYER_DAY} a day, then the written lines only`);
  const off = await setup(t, { haggleModel: false }), bola = await onboard(off, 'Bola');
  await place(off, bola, 'market', 5000);
  await post(off, 'haggle/open', body, bola);
  await post(off, 'haggle/offer', { ...body, offer: priced(off, 'ankara').floor, requestId: off.id() }, bola);
  const bolaSession = await off.server.store.read((db) => Object.values(db.sessions).find((s) => s.publicId === bola.id)!);
  assert.equal(await off.server.store.read((db) => haggleService(off.server.context, { ask }).rephrasePlan(db, bolaSession, body, off.now())), null, 'the switch is off');
});

test('the haggle is behind an admin switch', async (t) => {
  const f = await setup(t, { haggleOpen: false }), ada = await onboard(f, 'Ada');
  await place(f, ada, 'market', 5000);
  assert.equal((await post(f, 'haggle/open', { cityId: 'lagos', trader: 'sade', item: 'ankara' }, ada)).code, 'haggle_closed');
  assert.equal((await get(f, 'haggle/stalls?city=lagos', ada)).stalls.open, false);
});

test('the skit studio checks the words other people will read: tidied, never altered, refused when blocked or when they carry contact details', async (t) => {
  const f = await setup(t), ada = await onboard(f, 'Ada');
  const ok = await post(f, 'skit/check', { title: '  My   first skit ', captions: ['Hello  there', '', 'Bye'] }, ada);
  assert.deepEqual({ ok: ok.ok, title: ok.title, captions: ok.captions }, { ok: true, title: 'My first skit', captions: ['Hello there', '', 'Bye'] });
  assert.equal((await post(f, 'skit/check', { title: 'kys', captions: [] }, ada)).code, 'text_blocked');
  assert.equal((await post(f, 'skit/check', { title: 'ok', captions: ['call me on 08012345678'] }, ada)).code, 'contact_not_allowed');
  assert.equal((await post(f, 'skit/check', { title: 'ok', captions: ['visit www.example.com'] }, ada)).code, 'links_not_allowed');
  assert.equal((await post(f, 'skit/check', { title: 'ok', captions: Array.from({ length: 7 }, () => 'a') }, ada)).code, 'too_many_captions');
  for (let n = 0; n < 60; n++) await post(f, 'skit/check', { title: 'x', captions: [] }, ada);
  assert.equal((await post(f, 'skit/check', { title: 'x', captions: [] }, ada)).code, 'rate_limited', 'not a free word filter');
  const closed = await setup(t, { skitOpen: false }), bola = await onboard(closed, 'Bola');
  assert.equal((await post(closed, 'skit/check', { title: 'x', captions: [] }, bola)).code, 'skit_closed');
});

test('NYSC camp: off until an admin turns it on, Nigeria only, three weeks, one duty a day, paid once, and the passing-out card', async (t) => {
  const off = await setup(t), zed = await onboard(off, 'Zed');
  assert.equal((await post(off, 'nysc/join', { cityId: 'lagos', requestId: off.id() }, zed)).code, 'season_closed');
  assert.equal((await get(off, 'seasons?city=lagos', zed)).seasons.nysc.on, false);

  const f = await setup(t, { nyscOn: true, nyscBatch: '2026-C' }), ada = await onboard(f, 'Ada');
  assert.equal((await post(f, 'nysc/join', { cityId: 'accra', requestId: f.id() }, ada)).code, 'nigeria_only');
  const seasons = await get(f, 'seasons?city=lagos', ada);
  assert.deepEqual({ nigeria: seasons.seasons.nigeria, on: seasons.seasons.nysc.on, joined: seasons.seasons.nysc.joined }, { nigeria: true, on: true, joined: false });
  assert.equal((await get(f, 'seasons?city=accra', ada)).seasons.nigeria, false);
  assert.equal((await post(f, 'nysc/duty', { cityId: 'lagos', duty: 'documents', option: 'check', requestId: f.id() }, ada)).code, 'not_joined');
  const joinId = f.id();
  const joined = await post(f, 'nysc/join', { cityId: 'lagos', requestId: joinId }, ada);
  assert.equal(joined.ok, true);
  assert.equal(joined.nysc.camp.name, 'Iyana-Ipaja Orientation Camp');
  assert.ok(joined.nysc.platoon >= 1 && joined.nysc.platoon <= 12);
  assert.deepEqual(joined.nysc.stages.map((stage: Json) => [stage.id, stage.open]), [['registration', true], ['platoon', false], ['parade', false]]);
  assert.doesNotMatch(JSON.stringify(joined), /points/, 'the points never reach the browser');
  assert.equal((await post(f, 'nysc/join', { cityId: 'lagos', requestId: joinId }, ada)).duplicate, true);

  // A later stage is closed; a duty pays once; one a day.
  assert.equal((await post(f, 'nysc/duty', { cityId: 'lagos', duty: 'formation', option: 'name', requestId: f.id() }, ada)).code, 'stage_closed');
  assert.equal((await post(f, 'nysc/duty', { cityId: 'lagos', duty: 'documents', option: 'nonsense', requestId: f.id() }, ada)).code, 'unknown_duty');
  const start = await cash(f, ada), dutyId = f.id();
  const first = await post(f, 'nysc/duty', { cityId: 'lagos', duty: 'documents', option: 'check', requestId: dutyId }, ada);
  assert.equal(first.ok, true, first.reason);
  assert.equal(first.paid, DUTY_PAY);
  assert.equal(await cash(f, ada), start + DUTY_PAY);
  assert.equal(first.nysc.dutyToday, true);
  assert.match(first.nysc.stages[0].duties[0].result, /papers are in order/);
  assert.equal((await post(f, 'nysc/duty', { cityId: 'lagos', duty: 'documents', option: 'check', requestId: dutyId }, ada)).duplicate, true);
  assert.equal(await cash(f, ada), start + DUTY_PAY, 'a repeat pays nothing');
  assert.equal((await post(f, 'nysc/duty', { cityId: 'lagos', duty: 'medicals', option: 'honest', requestId: f.id() }, ada)).code, 'one_a_day');
  assert.equal((await post(f, 'nysc/pass-out', { cityId: 'lagos', requestId: f.id() }, ada)).code, 'not_yet');

  // Three weeks: every duty in its week, the best choice each time.
  for (let day = 1; day <= 22; day++) {
    f.advance(DAY);
    const view = (await get(f, 'seasons?city=lagos', ada)).seasons.nysc;
    const next = view.stages.filter((s: Json) => s.open).flatMap((s: Json) => s.duties).find((duty: Json) => !duty.done);
    if (next) {
      const done = await post(f, 'nysc/duty', { cityId: 'lagos', duty: next.id, option: DUTIES.find((d) => d.id === next.id)!.options.find((o) => o.points === 2)!.id, requestId: f.id() }, ada);
      assert.equal(done.ok, true, `${next.id}: ${done.reason}`);
    }
    if (day < 21) assert.equal((await post(f, 'nysc/pass-out', { cityId: 'lagos', requestId: f.id() }, ada)).ok, false);
  }
  const ready = (await get(f, 'seasons?city=lagos', ada)).seasons.nysc;
  assert.equal(ready.stages.every((stage: Json) => stage.done), true, 'all nine duties done');
  assert.equal(ready.passingOut, 'ready');
  assert.equal(ready.card, null);
  const passId = f.id(), beforePass = await cash(f, ada);
  const passed = await post(f, 'nysc/pass-out', { cityId: 'lagos', requestId: passId }, ada);
  assert.equal(passed.ok, true, passed.reason);
  assert.equal(passed.paid, PASS_OUT_PAY);
  assert.equal(await cash(f, ada), beforePass + PASS_OUT_PAY);
  assert.equal(passed.nysc.passingOut, 'done');
  assert.equal(passed.nysc.card.honour, 'Distinction');
  assert.equal(passed.nysc.card.name, 'Ada');
  assert.equal(passed.nysc.card.camp, 'Iyana-Ipaja Orientation Camp');
  assert.match(passed.nysc.card.passedOutDay, /^\d{4}-\d{2}-\d{2}$/);
  assert.equal((await post(f, 'nysc/pass-out', { cityId: 'lagos', requestId: f.id() }, ada)).paid, 0, 'passing out pays once');
  assert.equal(await cash(f, ada), beforePass + PASS_OUT_PAY);
  assert.equal(passed.nysc.earned, 9 * DUTY_PAY + PASS_OUT_PAY);

  // A person who skipped duties cannot pass out; and a new batch label lets everyone join again.
  const bola = await onboard(f, 'Bola');
  await post(f, 'nysc/join', { cityId: 'lagos', requestId: f.id() }, bola);
  f.advance(22 * DAY);
  assert.equal((await post(f, 'nysc/pass-out', { cityId: 'lagos', requestId: f.id() }, bola)).code, 'duties_left');
});

test('a season pays no more than the day\'s cap', async (t) => {
  const f = await setup(t, { nyscOn: true }), ada = await onboard(f, 'Ada');
  await post(f, 'nysc/join', { cityId: 'lagos', requestId: f.id() }, ada);
  await f.server.store.transact((db) => { const c = (db as Record<string, any>).minigames; c.days[ada.id] = { day: dayOf(f.now()), buys: 0, rephrased: 0, earned: SEASON_DAY_CAP - 120 }; });
  const start = await cash(f, ada);
  const done = await post(f, 'nysc/duty', { cityId: 'lagos', duty: 'documents', option: 'check', requestId: f.id() }, ada);
  assert.equal(done.ok, true);
  assert.equal(done.paid, 120, 'only what is left of the day\'s cap is paid');
  assert.equal(await cash(f, ada), start + 120);
});

test('JAMB season: questions arrive without answers, the server checks every answer and pays small prizes once, the mock is marked there, and the results card comes on day eight', async (t) => {
  const off = await setup(t), zed = await onboard(off, 'Zed');
  assert.equal((await post(off, 'jamb/join', { cityId: 'lagos', requestId: off.id() }, zed)).code, 'season_closed');

  const f = await setup(t, { jambOn: true, jambYear: '2027' }), ada = await onboard(f, 'Ada');
  assert.equal((await post(f, 'jamb/join', { cityId: 'accra', requestId: f.id() }, ada)).code, 'nigeria_only');
  assert.equal((await post(f, 'jamb/today', { cityId: 'lagos' }, ada)).code, 'not_joined');
  assert.equal((await post(f, 'jamb/join', { cityId: 'lagos', requestId: f.id() }, ada)).ok, true);
  const seedOf = (): Promise<string> => f.server.store.read((db) => (db as Record<string, any>).minigames.jamb[ada.id].seed);
  const answerDay = async (right: boolean): Promise<Json[]> => {
    const today = await post(f, 'jamb/today', { cityId: 'lagos' }, ada);
    assert.equal(today.ok, true, today.reason);
    const out: Json[] = [];
    for (const q of today.jamb.practice.questions as Json[]) {
      const answer = optionsOf(q.id, await seedOf())!.answer;
      out.push(await post(f, 'jamb/answer', { cityId: 'lagos', id: q.id, choice: right ? answer : (answer + 1) % 4, requestId: f.id() }, ada));
    }
    return out;
  };

  const today = await post(f, 'jamb/today', { cityId: 'lagos' }, ada);
  const questions = today.jamb.practice.questions as Json[];
  assert.equal(questions.length, 5);
  assert.deepEqual(questions.map((q) => q.subject).sort(), ['english', 'english', 'general', 'maths', 'maths']);
  assert.ok(questions.every((q) => q.options.length === 4 && Object.keys(q).sort().join() === 'id,options,subject,text'));
  assert.doesNotMatch(JSON.stringify(today), /"why"|"answer"|"correct"/, 'no answer is sent before it is chosen');
  assert.deepEqual((await post(f, 'jamb/today', { cityId: 'lagos' }, ada)).jamb.practice.questions.map((q: Json) => q.id), questions.map((q) => q.id), 'the same five all day');

  // A right answer pays once; a wrong one pays nothing and is told why; a question not of today is refused.
  const seed = await seedOf(), start = await cash(f, ada);
  const [q1, q2] = questions as [Json, Json];
  const right = optionsOf(q1.id, seed)!.answer, wrong = (optionsOf(q2.id, seed)!.answer + 1) % 4;
  const reqId = f.id();
  const a1 = await post(f, 'jamb/answer', { cityId: 'lagos', id: q1.id, choice: right, requestId: reqId }, ada);
  assert.equal(a1.ok, true, a1.reason);
  assert.deepEqual({ correct: a1.result.correct, paid: a1.result.paid, answer: a1.result.answer }, { correct: true, paid: PAY_PER_CORRECT, answer: right });
  assert.ok(a1.result.why.length > 8);
  assert.equal(await cash(f, ada), start + PAY_PER_CORRECT);
  assert.equal((await post(f, 'jamb/answer', { cityId: 'lagos', id: q1.id, choice: right, requestId: reqId }, ada)).duplicate, true);
  const again = await post(f, 'jamb/answer', { cityId: 'lagos', id: q1.id, choice: right, requestId: f.id() }, ada);
  assert.equal(again.result.paid, PAY_PER_CORRECT, 'the stored result is shown again');
  assert.equal(await cash(f, ada), start + PAY_PER_CORRECT, 'a question pays once');
  const a2 = await post(f, 'jamb/answer', { cityId: 'lagos', id: q2.id, choice: wrong, requestId: f.id() }, ada);
  assert.deepEqual({ correct: a2.result.correct, paid: a2.result.paid }, { correct: false, paid: 0 });
  const outsider = Array.from({ length: 120 }, (_, id) => id).find((id) => !questions.some((q) => q.id === id))!;
  assert.equal((await post(f, 'jamb/answer', { cityId: 'lagos', id: outsider, choice: 0, requestId: f.id() }, ada)).code, 'not_today');
  assert.equal((await post(f, 'jamb/answer', { cityId: 'lagos', id: questions[3]!.id, choice: 9, requestId: f.id() }, ada)).code, 'invalid_request');

  // The mock is locked until three different days of practice.
  assert.equal((await post(f, 'jamb/mock/start', { cityId: 'lagos', requestId: f.id() }, ada)).code, 'mock_locked');
  for (const q of questions.slice(2)) await post(f, 'jamb/answer', { cityId: 'lagos', id: q.id, choice: optionsOf(q.id, seed)!.answer, requestId: f.id() }, ada);
  for (let day = 1; day <= 2; day++) { f.advance(DAY); const results = await answerDay(true); assert.ok(results.every((r) => r.result.correct)); }
  const earnedPractice = await cash(f, ada) - start;
  assert.equal(earnedPractice, PAY_PER_CORRECT * (4 + 5 + 5), 'fifty a right answer, nothing for the wrong one');

  const ready = (await post(f, 'jamb/today', { cityId: 'lagos' }, ada)).jamb;
  assert.equal(ready.mock.state, 'ready');
  assert.equal(ready.streak, 3);
  assert.equal(ready.card, null, 'no results card before results day');
  const started = await post(f, 'jamb/mock/start', { cityId: 'lagos', requestId: f.id() }, ada);
  assert.equal(started.ok, true, started.reason);
  const mock = started.jamb.mock;
  assert.equal(mock.state, 'running');
  assert.equal(mock.questions.length, 20);
  assert.deepEqual([7, 7, 6], ['english', 'maths', 'general'].map((subject) => mock.questions.filter((q: Json) => q.subject === subject).length));
  assert.equal(mock.endsAt, f.now() + MOCK_MINUTES * 60_000);
  assert.doesNotMatch(JSON.stringify(mock), /"why"|"answer"|"correct"/, 'the paper carries no answers');
  const marks = mock.questions.map((q: Json, at: number) => (at < 15 ? optionsOf(q.id, seed)!.answer : (optionsOf(q.id, seed)!.answer + 1) % 4));
  const beforeMock = await cash(f, ada);
  const submitId = f.id();
  const marked = await post(f, 'jamb/mock/submit', { cityId: 'lagos', answers: marks, requestId: submitId }, ada);
  assert.equal(marked.ok, true, marked.reason);
  assert.deepEqual({ correct: marked.jamb.mock.result.correct, total: marked.jamb.mock.result.total, score: marked.jamb.mock.result.score, paid: marked.jamb.mock.result.paid }, { correct: 15, total: 20, score: 300, paid: MOCK_PAY });
  assert.equal(await cash(f, ada), beforeMock + MOCK_PAY);
  assert.equal(marked.jamb.mock.state, 'done');
  assert.equal((await post(f, 'jamb/mock/submit', { cityId: 'lagos', answers: marks, requestId: submitId }, ada)).duplicate, true);
  assert.equal((await post(f, 'jamb/mock/submit', { cityId: 'lagos', answers: marks, requestId: f.id() }, ada)).ok, true);
  assert.equal(await cash(f, ada), beforeMock + MOCK_PAY, 'the mock pays once');
  assert.equal((await post(f, 'jamb/mock/start', { cityId: 'lagos', requestId: f.id() }, ada)).jamb.mock.state, 'done', 'one mock a season');

  // Results day: the card comes on day eight (day index seven).
  assert.equal(marked.jamb.card, null);
  for (let day = 3; day <= 7; day++) f.advance(DAY);
  assert.equal((await post(f, 'jamb/today', { cityId: 'lagos' }, ada)).jamb.day, 7);
  const results = (await post(f, 'jamb/today', { cityId: 'lagos' }, ada)).jamb;
  assert.equal(results.resultsReady, true);
  assert.equal(results.card.score, 300);
  assert.equal(results.card.band, 'Good');
  assert.equal(results.card.name, 'Ada');
  assert.equal(results.card.practiceDays, 3);
  assert.equal(results.card.practiceCorrect, 14);
  assert.equal(results.card.practiceAnswered, 15);
  assert.ok(['english', 'maths', 'general'].includes(results.card.best));
  // After two weeks the season is over, the card stays.
  f.advance(8 * DAY);
  assert.equal((await post(f, 'jamb/today', { cityId: 'lagos' }, ada)).code, 'season_over');
  assert.equal((await get(f, 'seasons?city=lagos', ada)).seasons.jamb.card.score, 300);
});

test('a late mock counts nothing, a poor one is still paid a little, and a wrong answer sheet cannot make a score', async (t) => {
  const f = await setup(t, { jambOn: true }), ada = await onboard(f, 'Ada');
  await post(f, 'jamb/join', { cityId: 'lagos', requestId: f.id() }, ada);
  const seed = await f.server.store.read((db) => (db as Record<string, any>).minigames.jamb[ada.id].seed as string);
  for (let day = 0; day < 3; day++) {
    if (day) f.advance(DAY);
    const today = await post(f, 'jamb/today', { cityId: 'lagos' }, ada);
    await post(f, 'jamb/answer', { cityId: 'lagos', id: today.jamb.practice.questions[0].id, choice: 0, requestId: f.id() }, ada);
  }
  const mock = (await post(f, 'jamb/mock/start', { cityId: 'lagos', requestId: f.id() }, ada)).jamb.mock;
  f.advance((MOCK_MINUTES + 3) * 60_000);
  const sheet = mock.questions.map((q: Json) => optionsOf(q.id, seed)!.answer);
  const late = await post(f, 'jamb/mock/submit', { cityId: 'lagos', answers: sheet, requestId: f.id() }, ada);
  assert.equal(late.ok, true);
  assert.deepEqual({ correct: late.jamb.mock.result.correct, paid: late.jamb.mock.result.paid }, { correct: 0, paid: MOCK_PAY_LOW }, 'after the time and the grace nothing counts');
  // Garbage answers are scored as wrong, not trusted.
  const bola = await onboard(f, 'Bola');
  await post(f, 'jamb/join', { cityId: 'lagos', requestId: f.id() }, bola);
  for (let day = 0; day < 3; day++) { if (day) f.advance(DAY); const today = await post(f, 'jamb/today', { cityId: 'lagos' }, bola); await post(f, 'jamb/answer', { cityId: 'lagos', id: today.jamb.practice.questions[0].id, choice: 0, requestId: f.id() }, bola); }
  await post(f, 'jamb/mock/start', { cityId: 'lagos', requestId: f.id() }, bola);
  const junk = await post(f, 'jamb/mock/submit', { cityId: 'lagos', answers: ['a', 99, -1, null, 1.5, {}, ...Array(30).fill(0)], requestId: f.id() }, bola);
  assert.equal(junk.ok, true);
  assert.ok(junk.jamb.mock.result.correct <= 20 && junk.jamb.mock.result.score === Math.round((junk.jamb.mock.result.correct / 20) * 400));
});

test('erasure leaves nothing of the mini-games behind', async (t) => {
  const f = await setup(t, { nyscOn: true, jambOn: true }), ada = await onboard(f, 'Ada'), bola = await onboard(f, 'Bola');
  await place(f, ada, 'market', 5000);
  await post(f, 'haggle/open', { cityId: 'lagos', trader: 'sade', item: 'ankara' }, ada);
  await post(f, 'nysc/join', { cityId: 'lagos', requestId: f.id() }, ada);
  await post(f, 'jamb/join', { cityId: 'lagos', requestId: f.id() }, ada);
  await post(f, 'skit/check', { title: 'x', captions: [] }, ada);
  await post(f, 'nysc/join', { cityId: 'lagos', requestId: f.id() }, bola);
  await f.server.store.transact((db) => {
    const c = peekMinigames(db)!;
    for (const key of ['haggle', 'nysc', 'jamb', 'skits'] as const) assert.ok(c[key][ada.id], `${key} row exists before`);
    forgetMinigamesPlayers(db, new Set([ada.id]));
    for (const key of ['haggle', 'days', 'nysc', 'jamb', 'skits'] as const) assert.equal(c[key][ada.id], undefined, `${key} row is gone`);
    assert.ok(c.nysc[bola.id], 'another person\'s rows stay');
  });
});
