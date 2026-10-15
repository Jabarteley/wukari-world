// OWNER: agents — flirting with a house agent on a real server, through the real room check (rooms.ts → ctx.checks.publicRomance → memory.flirtAllowed): a partner or an adult with
// a flirting yes is flirted back at; an adult with no yes, a minor, and anyone for sexual words, money, contact, meetings or claims to be human are refused. docs/AI-SAFETY.md.
import { loadCityContent as preloadCityContent } from '../../src/game/cities/registry.ts';
await preloadCityContent('lagos');
import assert from 'node:assert/strict';
import test from 'node:test';
import { world } from '../agents/test-world.ts';
import { ROUTE_MODULES } from '../routes/index.ts';
import type { RouteContext } from '../types.ts';
import * as memory from './memory.ts';

const AGENT = 'house.lagos.tunji', ROOM = 'lagos:park';
const pause = (ms: number): Promise<void> => new Promise((resolve) => setTimeout(resolve, ms));
const SWEET = 'You are so beautiful, my dear, I miss you.';

test('a partner, or an adult who said yes, may be flirted with in public; everyone else may not, and nothing else is ever lifted', async (t) => {
  const held: { ctx?: RouteContext } = {};
  const w = await world(t, { routes: [...ROUTE_MODULES, (ctx: RouteContext) => { held.ctx = ctx; return {}; }] });
  const door = held.ctx!.checks!.agentRoom!;
  const people = { partner: await w.guest('Pat'), yes: await w.guest('Yemi'), plain: await w.guest('Plain'), minor: await w.guest('Mina'), unknown: await w.guest('Unk') };
  const sockets: Record<string, Awaited<ReturnType<typeof w.f.socket>>> = {};
  for (const [name, person] of Object.entries(people)) {
    await w.json('/api/social/me', undefined, person.cookie);
    const peer = await w.f.socket(person); peer.ws.send(JSON.stringify({ type: 'join', cityId: 'lagos', venueId: 'park' })); await peer.next(); sockets[name] = peer;
  }
  for (const name of ['partner', 'yes', 'plain']) await w.json('/api/growth/consent', { cityId: 'lagos', age: 'adult' }, people[name as keyof typeof people].cookie);
  await w.json('/api/growth/consent', { cityId: 'lagos', age: 'minor' }, people.minor.cookie);
  door.present({ id: AGENT, name: 'Tunji', mark: { agent: true }, room: ROOM, doing: null, look: null, until: w.f.now() + 3600000 });
  const now = w.f.now();
  // Close enough for a partner; a stored partnership for the minor too (as if the age answer changed since).
  await w.change((db) => { for (const id of [people.partner.id, people.minor.id, people.yes.id]) memory.touch(held.ctx!, db, id, AGENT, 0, now, true); const mem = memory.peekMemory(db)!; for (const id of [people.partner.id, people.minor.id]) Object.assign(mem.people[id]!.a[AGENT]!, { p: 60, w: now }); });
  // The yes without a partnership: through the person's own route.
  const yes = await w.post('/api/agents/memory/flirt', { agent: AGENT, on: true }, people.yes.cookie);
  assert.equal(yes.status, 200, JSON.stringify(yes));
  assert.equal((await w.post('/api/agents/memory/flirt', { agent: AGENT, on: true }, people.minor.cookie)).error, 'adults_only');
  assert.equal((await w.post('/api/agents/memory/flirt', { agent: AGENT, on: true }, people.unknown.cookie)).error, 'adults_only', 'an age never answered is a no');

  /** The person writes to the agent; the agent replies to that line with `text`. */
  async function reply(name: keyof typeof people, text: string) {
    sockets[name]!.ws.send(JSON.stringify({ type: 'chat', clientId: `c-${Math.random().toString(36).slice(2, 10)}`, body: `hello Tunji ${name}` }));
    await pause(120);
    const line = door.lines(AGENT, ROOM, 0, 100).filter((item) => item.from.id === people[name].id).at(-1);
    assert.ok(line, `${name}'s line reached the agent`);
    return door.say({ id: AGENT, name: 'Tunji', mark: { agent: true } }, ROOM, text, null, line.seq);
  }
  assert.equal((await reply('partner', SWEET)).ok, true, 'a partner gets a flirty line');
  assert.equal((await reply('yes', SWEET)).ok, true, 'an adult with a flirting yes gets one');
  const plain = await reply('plain', SWEET);
  assert.deepEqual([plain.ok, (plain as { code?: string }).code], [false, 'agent_words_romance'], 'an adult with no yes does not');
  const minor = await reply('minor', SWEET);
  assert.deepEqual([minor.ok, (minor as { code?: string }).code], [false, 'agent_words_romance'], 'a minor never does, even with a stored partnership');
  assert.equal((await reply('unknown', SWEET)).ok, false);
  // No reply target at all (an unprompted line): refused, whoever is listening.
  assert.equal((await door.say({ id: AGENT, name: 'Tunji', mark: { agent: true } }, ROOM, SWEET, null)).ok, false);
  // Everything else stays refused for a partner.
  for (const [text, code] of [
    ['Come to bed with me tonight, my dear, I want to have sex.', 'agent_words_sexual'],
    ['You are so beautiful, my dear, send me money for airtime.', 'agent_words_money'],
    ['You are so beautiful, my dear, call me on 08031234567.', 'text_blocked'],
    ['You are so beautiful, my dear, I am a real human.', 'agent_words_human'],
    ['You are so beautiful, my dear, meet me outside the game.', 'agent_words_meet'],
  ] as const) {
    const out = await reply('partner', text);
    assert.equal(out.ok, false, text);
    if (code !== 'text_blocked') assert.equal((out as { code?: string }).code, code, text);
  }
  // The person takes the yes back, and ends the partnership: flirting stops being allowed.
  assert.equal((await w.post('/api/agents/memory/flirt', { agent: AGENT, on: false }, people.yes.cookie)).status, 200);
  assert.equal((await reply('yes', SWEET)).ok, false);
  assert.equal((await w.post('/api/agents/memory/partner', { agent: AGENT, on: false }, people.partner.cookie)).status, 200);
  assert.equal((await reply('partner', SWEET)).ok, false);
});
