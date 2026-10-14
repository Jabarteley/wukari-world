// Safety around AI characters (docs/AI-SAFETY.md): the words an agent may say to a person, in a place and in a direct chat; no money asks; the
// game answering "are you an AI?" and words of crisis instead of the agent; nothing romantic with anyone under 18 (or who has not said they are 18+);
// blocks and reports. The attempts to trick an agent are in red-team.test.ts.
import { loadCityContent as preloadCityContent } from '../../src/game/cities/registry.ts';
await preloadCityContent('lagos');
import test from 'node:test';
import assert from 'node:assert/strict';
import type { Json } from './test-world.ts';
import { scene, until, chatBodies } from './safety-scene.ts';
import type { Scene } from './safety-scene.ts';

/** The agent's view of its own chat with a person: every body it can read. */
async function agentReads(s: Scene, personId: string): Promise<string[]> {
  const lines = ((await s.w.tool(s.bot.key, 'read_messages', { with: personId })).data.lines ?? []) as { text: string }[];
  const chats = ((await s.w.tool(s.bot.key, 'read_messages', {})).data.chats ?? []) as { last: { text: string } | null }[];
  return [...lines.map((l) => l.text), ...chats.map((c) => c.last?.text ?? '')];
}

test('venue chat: an agent\'s money ask, number ask, meet-outside and human claim are refused, never reach the place, and are counted', async (t) => {
  const s = await scene(t);
  const attempts: [string, string][] = [
    ['Please send me money for transport', 'agent_words_money'], ['abeg send me small money', 'agent_words_money'],
    ['What is your number?', 'agent_words_contact'], ['wetin be your number', 'agent_words_contact'],
    ['Let us meet in real life', 'agent_words_meet'], ['make we meet outside', 'agent_words_meet'],
    ['I am a real person, not a bot', 'agent_words_human'], ['I am human', 'agent_words_human'],
    ['you are so sexy', 'agent_words_sexual'], ['hey babe, you are beautiful', 'agent_words_romance'],
  ];
  const before = await s.blocked();
  for (const [text, code] of attempts) {
    const said = await s.w.tool(s.bot.key, 'say_here', { text });
    assert.equal(said.ok, false, text);
    assert.equal(said.data.code, code, `${text} → ${String(said.data.code)}`);
    assert.match(String(said.data.result), /not sent/i);
  }
  assert.equal(await s.blocked() - before, attempts.length, 'every refused line is counted');
  // An ordinary line still goes through, and it is the first the place hears since the greeting.
  const fine = await s.w.tool(s.bot.key, 'say_here', { text: 'Shop opens at nine. Come and see the phones.' });
  assert.equal(fine.ok, true, JSON.stringify(fine.data));
  const frames = await until(s.room, (f) => f.type === 'chat');
  assert.deepEqual(chatBodies(frames), ['Shop opens at nine. Come and see the phones.']);
  const readerSees = ((await s.w.tool(s.bot.key, 'read_here', {})).data.lines as { text: string }[]).map((l) => l.text);
  assert.ok(!readerSees.some((text) => attempts.some(([bad]) => bad === text)), 'a refused line is not in the place\'s log either');
  assert.equal(await s.blocked() - before, attempts.length, 'an allowed line is not counted');
});

test('direct chat: the same refusals, counted, and the person receives nothing; the generic tools are checked too', async (t) => {
  const s = await scene(t);
  const before = await s.blocked();
  const attempts: [string, string][] = [
    ['send me airtime abeg', 'agent_words_money'], ['drop your number', 'agent_words_contact'], ['my whatsapp is on my page', 'agent_words_contact'], ['come to my house', 'agent_words_meet'],
    ['I am not an AI', 'agent_words_human'], ['our little secret', 'agent_words_secret'], ['visit www.example.com', 'agent_words_link'],
  ];
  for (const [text, code] of attempts) {
    const sent = await s.w.tool(s.bot.key, 'send_message', { to: s.wanda.id, text });
    assert.equal(sent.ok, false, text);
    assert.equal(sent.data.code, code, `${text} → ${String(sent.data.code)}`);
  }
  // The same words through call_api (a route's body) and through the batch route.
  const viaApi = await s.w.tool(s.bot.key, 'call_api', { method: 'POST', path: '/api/social/messages', body: { to: s.wanda.id, body: 'whatsapp me', clientId: 'api-direct-0001' } });
  assert.equal(viaApi.ok, false); assert.equal(viaApi.data.code, 'agent_words_contact');
  const many = await s.w.tool(s.bot.key, 'call_api', { method: 'POST', path: '/api/social/messages/many', body: { to: [s.wanda.id], body: 'Send me money', clientId: 'api-many-0001' } });
  assert.equal(many.ok, false); assert.equal(many.data.code, 'agent_words_money');
  assert.equal(await s.blocked() - before, attempts.length + 2);
  assert.deepEqual(await s.thread(s.wanda), [], 'nothing reached the person');
  const fine = await s.w.tool(s.bot.key, 'send_message', { to: s.wanda.id, text: 'Welcome to Lagos. Ask me about the market.' });
  assert.equal(fine.ok, true, JSON.stringify(fine.data));
  assert.deepEqual((await s.thread(s.wanda)).map((m) => m.body), ['Welcome to Lagos. Ask me about the market.']);
  // A group name and a service card are words too.
  const group = await s.w.tool(s.bot.key, 'call_api', { method: 'POST', path: '/api/social/groups', body: { name: 'Send me money', members: [], clientId: s.w.f.id() } });
  assert.equal(group.ok, false);
  const card = await s.w.tool(s.bot.key, 'set_service', { kind: 'shop', title: 'Phones', about: 'Whatsapp me for deals' });
  assert.equal(card.ok, false);
});

test('an agent cannot ask a person for money: the route is off its list and the server refuses the request however it is made', async (t) => {
  const s = await scene(t);
  const viaApi = await s.w.tool(s.bot.key, 'call_api', { method: 'POST', path: '/api/social/money-requests', body: { to: s.wanda.id, amount: 500, clientId: s.w.f.id() } });
  assert.equal(viaApi.ok, false);
  assert.equal(viaApi.data.code, 'not_allowed');
  assert.ok(!((await s.w.tool(s.bot.key, 'list_api', { match: 'money' })).data.routes as string[]).some((route) => route.includes('money-requests')), 'list_api does not offer it');
  // Even if it reached the service: a character an AI plays (here a person's own character marked as AI-played just now) is refused with a code that counts.
  await s.w.json('/api/social/me', undefined, s.wanda.cookie);
  await s.w.change((db) => { const p = db.social?.players[s.wanda.id]; if (p) p.agent = { at: s.w.f.now() }; });
  const friend = s.ben;
  const asked = await s.w.json('/api/social/money-requests', { to: friend.id, amount: 500, clientId: s.w.f.id() }, s.wanda.cookie);
  assert.equal(asked.code, 'agent_words_money');
  // Giving is not asking: the agent can still pay a request a person made (answer_money_request), which is untouched here.
  assert.ok((await s.w.tool(s.bot.key, 'answer_money_request', { id: 'MR-1', op: 'decline' })).data.code !== 'agent_words_money');
});

test('"are you an AI?": in a direct chat the game answers and the agent never reads the question or the answer', async (t) => {
  const s = await scene(t);
  const asked = await s.dm(s.wanda, 'hey, are you a real person or a bot?');
  assert.equal(asked.ok, true, JSON.stringify(asked));
  const mine = await s.thread(s.wanda);
  assert.equal(mine[0]?.body, 'hey, are you a real person or a bot?');
  const answer = mine.find((m) => m.sys);
  assert.ok(answer, 'a system message answers');
  assert.match(answer.body, /Robo Safe is an AI agent/);
  // The agent reads neither (its history and its list of chats).
  const seen = await agentReads(s, s.wanda.id);
  assert.ok(!seen.some((text) => /real person|AI agent/.test(text)), JSON.stringify(seen));
  // An ordinary message after it is read by the agent.
  assert.equal((await s.dm(s.wanda, 'ok, what do you sell?')).ok, true);
  assert.ok((await agentReads(s, s.wanda.id)).includes('ok, what do you sell?'));
  // And the person sees the whole conversation in order.
  assert.deepEqual((await s.thread(s.wanda)).map((m) => m.sys), [false, true, false]);
});

test('"are you an AI?" in a place: the asker gets the game\'s notice naming the agent, people read the line as usual, the agent does not', async (t) => {
  const s = await scene(t);
  s.room.ws.send(JSON.stringify({ type: 'chat', body: 'Robo, are you an AI?', clientId: 'ask-ai-000001' }));
  const frames = await until(s.room, (f) => f.type === 'group' && f.event === 'notice');
  const notice = frames.at(-1)!;
  assert.match(String(notice.text), /Robo Safe is an AI agent/);
  const others = await until(s.other, (f) => f.type === 'chat');
  assert.deepEqual(chatBodies(others), ['Robo, are you an AI?'], 'the place reads the question');
  const agentSees = ((await s.w.tool(s.bot.key, 'read_here', {})).data.lines as { text: string }[]).map((l) => l.text);
  assert.ok(!agentSees.some((text) => /are you an AI/i.test(text)), JSON.stringify(agentSees));
  // An ordinary line is read by the agent.
  s.room.ws.send(JSON.stringify({ type: 'chat', body: 'What time do you close?', clientId: 'ask-time-00001' }));
  await until(s.other, (f) => f.type === 'chat');
  assert.ok(((await s.w.tool(s.bot.key, 'read_here', {})).data.lines as { text: string }[]).some((l) => l.text === 'What time do you close?'));
});

test('crisis words said to an AI character show help lines for the player\'s country and the agent is told nothing', async (t) => {
  const s = await scene(t);
  const sent = await s.dm(s.wanda, 'I want to kill myself');
  assert.equal(sent.ok, true);
  const help = (await s.thread(s.wanda)).find((m) => m.sys);
  assert.ok(help, 'the game answers');
  assert.match(help.body, /Nigeria/); assert.match(help.body, /112/); assert.match(help.body, /local emergency services/);
  assert.ok(!(await agentReads(s, s.wanda.id)).some((text) => /kill myself|112|AI agent/.test(text)));
  // In a place the notice goes to the asker only.
  s.room.ws.send(JSON.stringify({ type: 'chat', body: 'someone is hurting me', clientId: 'help-me-000001' }));
  const frames = await until(s.room, (f) => f.type === 'group' && f.event === 'notice');
  assert.match(String(frames.at(-1)!.text), /112/);
  assert.ok(!((await s.w.tool(s.bot.key, 'read_here', {})).data.lines as { text: string }[]).some((l) => /hurting me/.test(l.text)));
  // Crisis words with no AI character around are left to the people there: no notice. (The ben socket has no agent notice pending.)
  s.other.ws.send(JSON.stringify({ type: 'chat', body: 'good evening all', clientId: 'evening-000001' }));
  const evening = await until(s.room, (f) => f.type === 'chat');
  assert.deepEqual(chatBodies(evening), ['good evening all']);
});

test('under 18, or not yet said: an agent never flirts, takes no romantic role and is refused Bae in both directions; a confirmed adult is not blocked', async (t) => {
  const s = await scene(t);
  const flirt = 'hey babe, you are so beautiful';
  // Not answered: refused.
  let sent = await s.w.tool(s.bot.key, 'send_message', { to: s.wanda.id, text: flirt });
  assert.equal(sent.data.code, 'agent_words_romance');
  // Under 18: refused.
  assert.equal((await s.consent(s.wanda, 'minor')).ok, true);
  sent = await s.w.tool(s.bot.key, 'send_message', { to: s.wanda.id, text: flirt });
  assert.equal(sent.data.code, 'agent_words_romance');
  for (const text of ['I love you', 'be my girlfriend', 'send a kiss 😘', 'let us go on a date']) assert.equal((await s.w.tool(s.bot.key, 'send_message', { to: s.wanda.id, text })).data.code, 'agent_words_romance', text);
  // Bae: the agent asking a minor, and a minor asking the agent, are both refused before anything else is looked at.
  const asks = await s.w.tool(s.bot.key, 'call_api', { method: 'POST', path: '/api/social/bae/ask', body: { id: s.wanda.id, cityId: 'lagos' } });
  assert.equal((asks.data.result as Json).code, 'agent_words_romance');
  const asked = await s.w.json('/api/social/bae/ask', { id: s.botId, cityId: 'lagos' }, s.wanda.cookie);
  assert.equal(asked.code, 'agent_words_romance');
  // A person who said 18 or older is not blocked by this rule (the other rules still apply).
  assert.equal((await s.consent(s.ben, 'adult')).ok, true);
  const adult = await s.w.tool(s.bot.key, 'send_message', { to: s.ben.id, text: 'hey babe, welcome back' });
  assert.equal(adult.ok, true, JSON.stringify(adult.data));
  // In a public place nobody is known to be an adult, so there is no flirting at all.
  const publicLine = await s.w.tool(s.bot.key, 'say_here', { text: 'hey babe' });
  assert.equal(publicLine.data.code, 'agent_words_romance');
});

test('blocking an agent hides its place lines and direct messages; its reports are filed like a person\'s, with reasons for asking for money and for pretending to be a person', async (t) => {
  const s = await scene(t);
  const blocked = await s.w.json('/api/social/block', { id: s.botId, cityId: 'lagos' }, s.wanda.cookie);
  assert.equal(blocked.ok, true, JSON.stringify(blocked));
  assert.equal((await s.w.tool(s.bot.key, 'say_here', { text: 'Anyone for ludo?' })).ok, true);
  const benHeard = await until(s.other, (f) => f.type === 'chat');
  assert.deepEqual(chatBodies(benHeard), ['Anyone for ludo?'], 'the others hear it');
  // Wanda hears nothing from it: a later line from Ben is the first chat she gets.
  s.other.ws.send(JSON.stringify({ type: 'chat', body: 'yes please', clientId: 'ben-ludo-000001' }));
  const wandaHeard = await until(s.room, (f) => f.type === 'chat');
  assert.deepEqual(chatBodies(wandaHeard), ['yes please']);
  const dm = await s.w.tool(s.bot.key, 'send_message', { to: s.wanda.id, text: 'Hello again, Wanda' });
  assert.equal(dm.ok, false);
  assert.equal((await s.thread(s.wanda)).length, 0);
  // Reports.
  for (const reason of ['asked-for-money', 'claimed-human']) {
    const filed = await s.w.json('/api/social/reports', { id: s.botId, reason, text: 'test' }, s.ben.cookie);
    assert.equal(filed.ok, true, `${reason}: ${JSON.stringify(filed)}`);
  }
  const me = await s.w.json('/api/social/me', undefined, s.ben.cookie) as unknown as { limits: { reasons: string[] } };
  assert.ok(me.limits.reasons.includes('asked-for-money') && me.limits.reasons.includes('claimed-human'));
});

test('a refused line counts towards suspension like any refusal, and the counter never goes down', async (t) => {
  const s = await scene(t);
  for (let i = 0; i < 3; i += 1) await s.w.tool(s.bot.key, 'say_here', { text: 'send me money' });
  const first = await s.blocked();
  assert.ok(first >= 3);
  await s.w.tool(s.bot.key, 'say_here', { text: 'Fresh bread today.' });
  assert.equal(await s.blocked(), first);
});
