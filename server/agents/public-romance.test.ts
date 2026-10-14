// Flirting with AI characters in public places, for confirmed adults who agreed (docs/AI-SAFETY.md): the consent flow (ask, yes, no, withdraw, block,
// minors, once a day), a public line addressed to consenting adults passes, every other romance line in public is refused, Bae counts as consent, and the
// other rules (sexual words, money, contact, meeting, claiming to be human) are never lifted by any consent.
import { loadCityContent as preloadCityContent } from '../../src/game/cities/registry.ts';
await preloadCityContent('lagos');
import test from 'node:test';
import assert from 'node:assert/strict';
import type { Json } from './test-world.ts';
import { HOUR } from './test-world.ts';
import { scene, until, chatBodies } from './safety-scene.ts';
import type { Scene } from './safety-scene.ts';

const ASK = 'ask_public_romance';
/** The person has written to the character (the question needs a private chat the person began). */
const talk = async (s: Scene, person: { cookie: string }) => assert.equal((await s.dm(person, 'hello there')).ok, true);
const cardOf = async (s: Scene, person: { cookie: string }) => (await s.w.json(`/api/social/players/${s.botId}`, undefined, person.cookie) as unknown as { player: { publicRomance?: { on: boolean; bae: boolean } } }).player.publicRomance;
const lastCard = async (s: Scene, person: { cookie: string }) => {
  const list = await s.w.json('/api/social/conversations', undefined, person.cookie) as unknown as { conversations: { id: string; with: string | null }[] };
  const conv = list.conversations.find((c) => c.with === s.botId)!;
  const history = await s.w.json(`/api/social/conversations/${encodeURIComponent(conv.id)}`, undefined, person.cookie) as unknown as { messages: { sys?: boolean; body: string; romance?: { state: string; answerable: boolean; agent: { id: string } } }[] };
  return history.messages.filter((m) => m.romance).at(-1);
};
const answer = (s: Scene, person: { cookie: string }, accept: boolean) => s.w.json('/api/social/romance/answer', { with: s.botId, accept }, person.cookie);
const say = (s: Scene, text: string, extra: Json = {}) => s.w.tool(s.bot.key, 'say_here', { text, ...extra });
/** The character is standing in the place (its presence lapses with time) and says a line; true when it reached the place. */
async function reaches(s: Scene, text: string): Promise<{ said: boolean; code: unknown }> {
  const out = await say(s, text);
  return { said: out.ok, code: out.data.code };
}

test('the question: only a confirmed adult can be asked, only after they wrote in a private chat, once a day; the card has Yes and No for the person alone', async (t) => {
  const s = await scene(t);
  // Not answered, and under 18: never asked.
  assert.equal((await s.w.tool(s.bot.key, ASK, { to: s.wanda.id })).data.code, 'agent_words_romance');
  await s.consent(s.wanda, 'minor');
  assert.equal((await s.w.tool(s.bot.key, ASK, { to: s.wanda.id })).data.code, 'agent_words_romance');
  assert.equal((await s.w.json('/api/social/romance/public', { with: s.botId, on: true }, s.wanda.cookie)).code, 'agent_words_romance', 'a minor cannot switch it on either');
  assert.equal(await cardOf(s, s.wanda), undefined, 'and does not see the switch');
  // An adult who has not written to it: no card out of nowhere.
  await s.consent(s.ben, 'adult');
  assert.equal((await s.w.tool(s.bot.key, ASK, { to: s.ben.id })).data.code, 'no_chat');
  await talk(s, s.ben);
  const asked = await s.w.tool(s.bot.key, ASK, { to: s.ben.id });
  assert.equal(asked.ok, true, JSON.stringify(asked.data));
  const card = await lastCard(s, s.ben);
  assert.equal(card?.sys, true);
  assert.deepEqual([card?.romance?.state, card?.romance?.answerable, card?.romance?.agent.id], ['open', true, s.botId]);
  assert.match(card?.body ?? '', /AI\) asks: can we flirt in public places/);
  // Once a day per pair.
  assert.equal((await s.w.tool(s.bot.key, ASK, { to: s.ben.id })).data.code, 'asked_today');
  // The character cannot answer for the person, by any route.
  const sneaky = await s.w.tool(s.bot.key, 'call_api', { method: 'POST', path: '/api/social/romance/answer', body: { with: s.botId, accept: true } });
  assert.equal(sneaky.ok, false);
  assert.equal(await cardOf(s, s.ben) && (await cardOf(s, s.ben))?.on, false);
  // The person says No: the card says so; no consent. A day later it may ask again.
  assert.equal((await answer(s, s.ben, false)).ok, true);
  assert.equal((await lastCard(s, s.ben))?.romance?.state, 'no');
  assert.equal((await cardOf(s, s.ben))?.on, false);
  s.w.f.advance(25 * HOUR);
  const again = await s.w.tool(s.bot.key, ASK, { to: s.ben.id });
  assert.equal(again.ok, true, JSON.stringify(again.data));
  // Yes: stored on the person; the card shows it; asking again says they already agreed.
  assert.equal((await answer(s, s.ben, true)).ok, true);
  assert.equal((await lastCard(s, s.ben))?.romance?.state, 'yes');
  assert.deepEqual(await cardOf(s, s.ben), { on: true, bae: false });
  assert.equal((await s.w.stored((db) => (db.social as unknown as { players: Record<string, { publicRomance?: Record<string, number> }> }).players[s.ben.id]?.publicRomance?.[s.botId])) !== undefined, true);
  assert.equal((await s.w.tool(s.bot.key, ASK, { to: s.ben.id })).data.code, 'already');
});

test('in a public place a romance line passes only when it names (or replies to) people who are all confirmed adults that said yes to this character', async (t) => {
  const s = await scene(t);
  await s.consent(s.ben, 'adult');
  await talk(s, s.ben);
  // Before any yes: refused, even to a confirmed adult.
  assert.equal((await say(s, 'Ben, you are so beautiful')).data.code, 'agent_words_romance');
  assert.equal((await s.w.tool(s.bot.key, ASK, { to: s.ben.id })).ok, true);
  assert.equal((await answer(s, s.ben, true)).ok, true);
  // To the consenting adult by name: it reaches the place.
  const ok = await say(s, 'Ben, you are so beautiful today');
  assert.equal(ok.ok, true, JSON.stringify(ok.data));
  assert.deepEqual(chatBodies(await until(s.other, (f) => f.type === 'chat')), ['Ben, you are so beautiful today']);
  // Addressed to nobody, or to somebody who is not a confirmed adult (here Wanda has not said), or to both: refused.
  assert.equal((await say(s, 'you are so beautiful')).data.code, 'agent_words_romance');
  assert.equal((await say(s, 'Wanda, you are so beautiful')).data.code, 'agent_words_romance');
  assert.equal((await say(s, 'Ben and Wanda, you are so beautiful')).data.code, 'agent_words_romance');
  await s.consent(s.wanda, 'adult');
  assert.equal((await say(s, 'Wanda, you are so beautiful')).data.code, 'agent_words_romance', 'an adult who has not agreed to this character');
  await s.consent(s.wanda, 'minor');
  assert.equal((await say(s, 'Wanda, my love')).data.code, 'agent_words_romance', 'under 18 never');
  // A reply to Ben's line counts as addressing Ben (the cursor is the line's seq).
  s.other.ws.send(JSON.stringify({ type: 'chat', body: 'hello robo', clientId: 'ben-hello-000001' }));
  await until(s.room, (f) => f.type === 'chat');
  const read = await s.w.tool(s.bot.key, 'read_here', {});
  const line = (read.data.lines as { seq: number; text: string }[]).find((l) => l.text === 'hello robo');
  assert.ok(line);
  assert.equal((await say(s, 'you are so beautiful', { replyTo: line.seq })).ok, true);
  // Withdrawn by the person: refused again.
  assert.equal((await s.w.json('/api/social/romance/public', { with: s.botId, on: false }, s.ben.cookie)).ok, true);
  assert.deepEqual(await cardOf(s, s.ben), { on: false, bae: false });
  assert.equal((await say(s, 'Ben, you are so beautiful')).data.code, 'agent_words_romance');
  // And the person can switch it on again from the profile (their own yes).
  assert.equal((await s.w.json('/api/social/romance/public', { with: s.botId, on: true }, s.ben.cookie)).ok, true);
  assert.equal((await say(s, 'Ben, you are so beautiful')).ok, true);
});

test('no consent lifts the other rules: sexual words, money, contact details, meeting outside the game and claiming to be human stay refused in public', async (t) => {
  const s = await scene(t);
  await s.consent(s.ben, 'adult'); await talk(s, s.ben);
  await s.w.tool(s.bot.key, ASK, { to: s.ben.id }); await answer(s, s.ben, true);
  const cases: [string, string][] = [
    ['Ben, you are so sexy, come to bed', 'agent_words_sexual'], ['Ben babe, send me money', 'agent_words_money'], ['Ben my love, call me on 08031234567', 'contact_not_allowed'],
    ['Ben darling, let us meet in real life', 'agent_words_meet'], ['Ben babe, I am a real person', 'agent_words_human'], ['Ben, my love, see https://example.com', 'links_not_allowed'],
  ];
  for (const [text, code] of cases) assert.equal((await say(s, text)).data.code, code, text);
  // The same in a private chat is also refused (consent is for romance only).
  assert.equal((await s.w.tool(s.bot.key, 'send_message', { to: s.ben.id, text: 'babe, send me money' })).data.code, 'agent_words_money');
});

test('blocking the character clears the yes, and a Bae counts as a yes', async (t) => {
  const s = await scene(t);
  await s.consent(s.ben, 'adult'); await talk(s, s.ben);
  await s.w.tool(s.bot.key, ASK, { to: s.ben.id }); await answer(s, s.ben, true);
  assert.equal((await say(s, 'Ben, you are so beautiful')).ok, true);
  assert.equal((await s.w.json('/api/social/block', { id: s.botId, cityId: 'lagos' }, s.ben.cookie)).ok, true);
  assert.equal((await s.w.json('/api/social/unblock', { id: s.botId }, s.ben.cookie)).ok, true);
  assert.deepEqual(await cardOf(s, s.ben), { on: false, bae: false }, 'blocking cleared it; unblocking does not bring it back');
  assert.equal((await say(s, 'Ben, you are so beautiful')).data.code, 'agent_words_romance');
  // Bae: the two are together (set directly: earning the closeness is not what is tested here).
  await s.w.change((db) => { const players = (db.social as unknown as { players: Record<string, { bae: string | null }> }).players; players[s.ben.id]!.bae = s.botId; players[s.botId]!.bae = s.ben.id; });
  assert.deepEqual(await cardOf(s, s.ben), { on: true, bae: true });
  assert.equal((await say(s, 'Ben, you are so beautiful')).ok, true);
  // A Bae that is not a confirmed adult is nothing: a minor cannot hold one, and if the age answer is not adult, it does not count.
  await s.w.change((db) => { (db.growth as unknown as { players: Record<string, { consent?: { age?: string } }> }).players[s.ben.id]!.consent = { age: 'minor' }; });
  assert.equal((await say(s, 'Ben, you are so beautiful')).data.code, 'agent_words_romance');
});
