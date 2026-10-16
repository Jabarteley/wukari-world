import { loadCityContent as preloadCityContent } from '../../src/game/cities/registry.ts';
await preloadCityContent('lagos');
// "Is your agent better than mine?" end to end against a real server (docs/AGENT-ARENA.md): a person makes a challenge in Settings and gets its card;
// another person's agent takes it through its key; both play; people watch the match in its arena room as spectators; the result is a card with
// both names and the AI marks, and a replay. The limits a day; a seven-day life challenge decided by the game's records.
import test from 'node:test';
import assert from 'node:assert/strict';
import { world, HOUR } from '../agents/test-world.ts';
import type { Json, Owner, World } from '../agents/test-world.ts';
import { TUNING } from '../growth/arena.ts';
import { ARENA, COLLECTION } from './book.ts';
import type { ArenaBook } from './book.ts';

const text = (value: unknown): string => JSON.stringify(value);
const bookOf = (w: World): Promise<ArenaBook> => w.stored((db) => JSON.parse(text((db as Record<string, unknown>)[COLLECTION] ?? null)) as ArenaBook);
const page = async (w: World, path: string): Promise<{ status: number; html: string }> => { const r = await fetch(`${w.f.base}${path}`); return { status: r.status, html: await r.text() }; };
async function agentOwner(w: World, subject: string, name: string, agent: string): Promise<{ owner: Owner; key: string; id: string }> {
  const owner = await w.owner(subject, name);
  const made = await w.makeAgentKey(owner, { mode: 'agent', name: 'arena', characterName: agent });
  assert.equal(made.status, 200, text(made));
  await w.tool(made.key, 'get_my_life');
  const id = await w.stored((db) => Object.values(db.sessions).find((s) => s.name === agent)?.publicId ?? '');
  return { owner, key: made.key, id };
}

test('a challenge runs end to end: made in Settings, a card, taken by another person\'s agent, played, watched in its room, a result card with both AI names', async (t) => {
  const speed = TUNING.speed;
  TUNING.speed = 40;
  t.after(() => { TUNING.speed = speed; });
  const w = await world(t);
  const ada = await agentOwner(w, 'Ada1', 'Ada', 'Robo Ada'), ben = await agentOwner(w, 'Ben1', 'Ben', 'Robo Ben');
  const fan = await w.guest('Fanta');

  // Ada makes the challenge for her agent in Settings and gets its card.
  const view = await w.json('/api/agents/arena', undefined, ada.owner.cookie) as unknown as Json & { agents: { id: string; name: string }[]; kinds: { kind: string; key: string }[] };
  assert.deepEqual(view.agents, [{ id: ada.id, name: 'Robo Ada' }]);
  assert.ok(view.kinds.some((k) => k.kind === 'game' && k.key === 'fight') && view.kinds.some((k) => k.kind === 'life' && k.key === 'stall'));
  const made = await w.post('/api/agents/arena/challenge', { agent: ada.id, kind: 'game', key: 'fight' }, ada.owner.cookie);
  assert.equal(made.status, 200, text(made));
  const code = String(made.code), cardPath = new URL(String(made.card), w.f.base).pathname;
  assert.match(code, /^c-[a-z0-9]{8}$/);
  assert.equal(cardPath, `/agents/challenge/${code}`);
  const open = await page(w, cardPath);
  assert.equal(open.status, 200);
  assert.match(open.html, /<title>Robo Ada \(AI\) challenges your AI agent: Fight<\/title>/);
  assert.match(open.html, /<meta property="og:title" content="Robo Ada \(AI\) challenges your AI agent: Fight">/);
  assert.ok(open.html.includes(`<pre>${code}</pre>`) && open.html.includes('challenge_take'));
  assert.ok(!/<script/i.test(open.html));
  assert.equal((await w.json(`/api/agents/arena/challenge/${code}`) as unknown as Json & { challenge: Json }).challenge.status, 'open');

  // Ada's own agent cannot take it; Ben's agent takes it through its key.
  assert.equal((await w.tool(ada.key, 'challenge_take', { code })).data.code, 'own_challenge');
  const taken = await w.tool(ben.key, 'challenge_take', { code });
  assert.equal(taken.ok, true, text(taken.data));
  const match = String(taken.data.match);
  assert.equal((await w.tool(ben.key, 'challenge_take', { code })).data.code, 'taken');

  // The first look starts the match and opens its room: a spectator watches it by its code, with no seat and no input.
  const first = await w.tool(ada.key, 'tournament_match', { match });
  assert.equal(first.ok, true, text(first.data));
  const watch = String(first.data.watch);
  const room = /[?&]table=(g-fight-[a-z0-9]{6})$/.exec(watch)?.[1];
  assert.ok(room, watch);
  const eye = await w.f.socket(fan);
  eye.ws.send(JSON.stringify({ type: 'arena-join', room }));
  let state = await eye.next() as Json;
  while (state.type !== 'arena-state') state = await eye.next() as Json;
  assert.deepEqual([state.status, state.you, state.driven, state.game], ['playing', null, true, 'fight']);
  assert.deepEqual((state.seats as Json[]).map((s) => [s.name, s.ai, s.bot]), [['Robo Ada', true, false], ['Robo Ben', true, false]]);
  eye.ws.send(JSON.stringify({ type: 'arena-input', room, i: 2 }));

  // "Agents playing now" on the Agent league page, with the watch link to the room.
  const league = await page(w, '/agents/league');
  assert.ok(league.html.includes(`Fight (challenge): Robo Ada <span class="tag">AI</span> v Robo Ben <span class="tag">AI</span> · <a href="/?table=${room}">Watch</a>`), league.html.slice(league.html.indexOf('Agents playing now'), league.html.indexOf('Agents playing now') + 400));
  const now = await w.json('/api/agents/arena/now') as unknown as Json & { playing: { label: string; watch: string; players: { name: string; ai: boolean }[] }[] };
  assert.deepEqual(now.playing.map((m) => [m.label, m.watch, m.players.map((p) => `${p.name}${p.ai ? ' (AI)' : ''}`)]), [['Fight', `/?table=${room}`, ['Robo Ada (AI)', 'Robo Ben (AI)']]]);

  // Both play: Ada's agent walks in and punches, Ben's stands still.
  let done: Json = {};
  for (let i = 0; i < 200 && done.status !== 'done'; i++) {
    w.f.advance(100);
    const look = (await w.tool(ada.key, 'tournament_match', { match })).data;
    if (look.status === 'done') { done = look; break; }
    const r = look.reading as { you: { x: number }; them: { x: number }; apart: number };
    const way = r.them.x > r.you.x ? 'right' : 'left';
    assert.equal((await w.tool(ada.key, 'tournament_move', { match, plan: r.apart > 70 ? [[way], [way, 'punch'], [way], [way, 'punch']] : [['punch'], [], ['punch'], []] })).ok, true);
    const idle = await w.tool(ben.key, 'tournament_move', { match, plan: [] });
    if (idle.ok) done = idle.data;
  }
  assert.equal(done.status, 'done', text(done));
  assert.equal((done.result as { winner: number }).winner, 0, text(done.result));

  // The watcher saw the game played, not just its end, and the room ends with the same result and keeps a replay.
  let snaps = 0, over: Json | null = null;
  for (let i = 0; i < 4000 && !over; i++) {
    const frame = await eye.next() as Json;
    if (frame.type === 'arena-snap') snaps += 1;
    if (frame.type === 'arena-state' && frame.status === 'over') over = frame;
  }
  assert.ok(snaps > 20, `snapshots seen: ${snaps}`);
  assert.ok(over, 'the room played the match out');
  assert.match(String((over.result as { text: string }).text), /Robo Ada/);
  assert.equal(typeof over.replay, 'string');
  for (let i = 0; i < 50 && !(await bookOf(w)).matches[match]?.replay; i++) await new Promise((resolve) => setTimeout(resolve, 20));
  const replay = (await bookOf(w)).matches[match]?.replay;
  assert.equal(replay, over.replay);
  const log = await w.json(`/api/arena/replay/${replay}`) as unknown as Json & { log: { result: { winners: number[] }; seats: { name: string; ai?: boolean }[] } };
  assert.deepEqual(log.log.result.winners, [0], 'the replay of the room has the match\'s winner');
  assert.deepEqual(log.log.seats.map((s) => [s.name, s.ai]), [['Robo Ada', true], ['Robo Ben', true]]);

  // The result card: both names, both AI marks, the result, the replay.
  const result = await page(w, cardPath);
  assert.match(result.html, /<title>Robo Ada \(AI\) beat Robo Ben \(AI\) at Fight\.<\/title>/);
  assert.match(result.html, /Robo Ada <span class="tag">AI<\/span> v Robo Ben <span class="tag">AI<\/span>/);
  assert.ok(result.html.includes(`/replay?replay=${replay}`));
  const status = await w.tool(ben.key, 'challenge_status', { code });
  assert.equal((status.data.challenge as Json).status, 'done');
  assert.equal(((status.data.challenge as Json).result as { text: string }).text, 'Robo Ada (AI) beat Robo Ben (AI) at Fight.');
  // A watched match page is never a place for input: the spectator's input changed nothing (Ada won by fighting, Ben stood still).
  assert.ok(!['no_show', 'no_answer'].includes(String((done.result as { reason: string }).reason)));
});

test('challenge limits: three made a day, five taken a day, an unknown code or a challenge that ran out is refused', async (t) => {
  const w = await world(t);
  const ada = await agentOwner(w, 'Ada1', 'Ada', 'Robo Ada'), ben = await agentOwner(w, 'Ben1', 'Ben', 'Robo Ben');
  const codes: string[] = [];
  for (let i = 0; i < ARENA.challenge.createPerDay; i++) { const made = await w.post('/api/agents/arena/challenge', { agent: ada.id, kind: 'game', key: 'chess' }, ada.owner.cookie); assert.equal(made.status, 200, text(made)); codes.push(String(made.code)); }
  const over = await w.post('/api/agents/arena/challenge', { agent: ada.id, kind: 'game', key: 'chess' }, ada.owner.cookie);
  assert.deepEqual([over.status, over.code], [409, 'daily_limit']);
  assert.equal((await w.tool(ada.key, 'challenge_make', { kind: 'game', key: 'chess' })).data.code, 'daily_limit', 'the agent and its person share the limit');
  assert.equal((await w.post('/api/agents/arena/challenge', { agent: ada.id, kind: 'game', key: 'poker' }, ada.owner.cookie)).code, 'invalid_challenge');
  assert.equal((await w.post('/api/agents/arena/challenge', { agent: ben.id, kind: 'game', key: 'chess' }, ada.owner.cookie)).error, 'unknown_agent');
  assert.equal((await w.tool(ben.key, 'challenge_take', { code: 'c-00000000' })).data.code, 'unknown_challenge');
  assert.equal((await page(w, '/agents/challenge/c-00000000')).status, 404);
  assert.equal((await page(w, '/agents/challenge/nope')).status, 404);
  w.f.advance(ARENA.challenge.expireMs + 1);
  assert.equal((await w.tool(ben.key, 'challenge_take', { code: codes[0] })).data.code, 'expired');
  const expired = await page(w, `/agents/challenge/${codes[0]}`);
  assert.match(expired.html, /ran out before anyone took it/);
  // A new Lagos day: three more.
  w.f.advance(24 * HOUR);
  assert.equal((await w.tool(ada.key, 'challenge_make', { kind: 'life', key: 'missions' })).ok, true);
});

test('a seven-day life challenge is decided by the game\'s own records', async (t) => {
  const w = await world(t);
  const ada = await agentOwner(w, 'Ada1', 'Ada', 'Robo Ada'), ben = await agentOwner(w, 'Ben1', 'Ben', 'Robo Ben');
  const made = await w.tool(ada.key, 'challenge_make', { kind: 'life', key: 'missions' });
  assert.equal(made.ok, true, text(made.data));
  const code = String(made.data.challenge);
  assert.equal((await w.tool(ben.key, 'challenge_take', { code })).ok, true);
  const bump = (id: string, by: number) => w.change((db) => { const m = Object.values(db.sessions).find((x) => x.publicId === id)?.cities?.lagos?.state?.missions; if (m) m.claimed += by; });
  await bump(ada.id, 4); await bump(ben.id, 1);
  const mid = await w.tool(ben.key, 'challenge_status', { code });
  assert.deepEqual(((mid.data.challenge as Json).life as Json).scores, [4, 1]);
  // The seven days end with no heartbeat for an hour (a host asleep): what Ben did after the end does not count.
  w.f.advance(ARENA.challenge.lifeMs + HOUR);
  await bump(ben.id, 10);
  const card = await page(w, `/agents/challenge/${code}`);
  assert.match(card.html, /<title>Robo Ada \(AI\) beat Robo Ben \(AI\) over seven days of most missions done: 4 to 1 missions\.<\/title>/);
  assert.match(card.html, /Robo Ada <span class="tag">AI<\/span> 4 · Robo Ben <span class="tag">AI<\/span> 1 missions/, 'what happened after the seven days does not count');
});

test('the join page is public, names every assistant, and never holds a key, even for an owner who has just made one', async (t) => {
  const w = await world(t);
  const ada = await w.owner('Ada1', 'Ada');
  const made = await w.makeAgentKey(ada);
  assert.equal(made.status, 200);
  for (const cookie of [undefined, ada.cookie]) {
    const r = await fetch(`${w.f.base}/agents/join`, cookie ? { headers: { Cookie: cookie } } : {});
    const html = await r.text();
    assert.equal(r.status, 200);
    for (const name of ['Claude', 'ChatGPT', 'Gemini', 'Cursor', 'VS Code', 'Any other assistant']) assert.ok(html.includes(name), name);
    assert.ok(html.includes(`${w.f.base}/mcp`) || html.includes('https://joinallworld.com/mcp'));
    assert.ok(!html.includes(made.key) && !/awk_[A-Za-z0-9_-]{43}/.test(html), 'no key, ever');
    assert.ok(html.includes('awk_YOUR_KEY') && html.includes('href="/sound?agents-join=1"'));
    assert.ok(!/<script/i.test(html));
  }
});

test('a table game through the keys: moves with `n` from the view, the server\'s clock for a turn not taken, a match page to watch', async (t) => {
  const w = await world(t);
  const ada = await agentOwner(w, 'Ada1', 'Ada', 'Robo Ada'), ben = await agentOwner(w, 'Ben1', 'Ben', 'Robo Ben');
  const made = await w.tool(ada.key, 'challenge_make', { kind: 'game', key: 'chess' });
  const code = String(made.data.challenge);
  const match = String((await w.tool(ben.key, 'challenge_take', { code })).data.match);
  const keys = [ada.key, ben.key];
  let moves = 0;
  for (let i = 0; i < 20 && moves < 4; i++) {
    for (const key of keys) {
      const view = (await w.tool(key, 'tournament_match', { match })).data as Json & { yourTurn: boolean; n: number; moves: string; view: { legal: { from: string; to: string }[] } };
      if (!view.yourTurn) continue;
      assert.match(view.moves, /t: "move"/);
      const legal = view.view.legal[0];
      assert.ok(legal);
      assert.equal((await w.tool(key, 'tournament_move', { match, move: { t: 'move', ...legal }, n: view.n + 1 })).data.code, 'stale_move');
      const played = await w.tool(key, 'tournament_move', { match, move: { t: 'move', ...legal }, n: view.n });
      assert.equal(played.ok, true, text(played.data));
      assert.equal(String(played.data.watch), `/agents/match/${match}`);
      moves += 1;
    }
  }
  assert.equal(moves, 4);
  const watching = await page(w, `/agents/match/${match}`);
  assert.match(watching.html, /Playing now, 4 moves so far/);
  assert.match(watching.html, /Robo Ada <span class="tag">AI<\/span> v Robo Ben <span class="tag">AI<\/span>/);
  // Nobody moves for longer than a turn: the server's clock decides (in chess, the side to move loses on time).
  w.f.advance(ARENA.turnMs + 1000);
  const card = await page(w, `/agents/challenge/${code}`);
  assert.match(card.html, /<title>Robo (Ada|Ben) \(AI\) beat Robo (Ada|Ben) \(AI\) at Chess\.<\/title>/);
  assert.match((await page(w, `/agents/match/${match}`)).html, /on time|time/i);
});
