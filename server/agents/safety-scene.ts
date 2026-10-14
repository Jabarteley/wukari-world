/**
 * TEST SUPPORT for the AI-safety tests (safety.test.ts, red-team.test.ts): two people with sockets in a Lagos venue and an AI character standing there.
 * Nothing in the running game imports this file.
 */
import assert from 'node:assert/strict';
import { world, agentKeys } from './test-world.ts';
import type { Json } from './test-world.ts';
import type { TestContext } from 'node:test';
import type { TestSocket } from '../test-fixture.ts';

/** A client frame type, kept out of a `type: '…'` literal so the frame-type census (src/types/protocol.test.ts) does not read this support file as the server building a frame. */
const JOIN = 'join';
export type Frame = Json & { type: string };
/** Frames from a socket until one matches (earlier ones are returned too, in order). */
export async function until(peer: TestSocket, match: (frame: Frame) => boolean): Promise<Frame[]> {
  const seen: Frame[] = [];
  for (let i = 0; i < 40; i += 1) { const frame = await peer.next() as unknown as Frame; seen.push(frame); if (match(frame)) return seen; }
  throw new Error(`no matching frame in ${JSON.stringify(seen.map((f) => f.type))}`);
}
export const chatBodies = (frames: Frame[]): string[] => frames.filter((f) => f.type === 'chat').map((f) => String(f.body));

/** A person in the Lagos start venue with a socket, a second person, and an AI character standing there. */
export async function scene(t: TestContext) {
  const w = await world(t);
  const wanda = await w.guest('Wanda'), ben = await w.guest('Ben');
  const here = ((await w.json('/api/life?city=lagos', undefined, wanda.cookie)).state as { location: string }).location;
  for (const person of [wanda, ben]) await w.json('/api/social/me', undefined, person.cookie);
  const room = await w.f.socket(wanda), other = await w.f.socket(ben);
  for (const peer of [room, other]) { peer.ws.send(JSON.stringify({ type: JOIN, cityId: 'lagos', venueId: here })); await peer.next(); }
  const bot = await w.signup('Robo Safe');
  const botId = await w.stored((db) => Object.values(db.sessions).find((s) => s.name === 'Robo Safe')?.publicId ?? '');
  const warm = await w.tool(bot.key, 'say_here', { text: 'Hello, I am an AI.' });
  assert.equal(warm.ok, true, JSON.stringify(warm.data));
  await until(room, (f) => f.type === 'chat'); await until(other, (f) => f.type === 'chat');
  /** The agent's counter of lines the AI rules refused. */
  const blocked = (): Promise<number> => w.stored((db) => agentKeys(db).reduce((sum, key) => sum + Number(key.blocked ?? 0), 0));
  const consent = (device: { cookie: string }, age: 'adult' | 'minor') => w.json('/api/growth/consent', { cityId: 'lagos', age }, device.cookie);
  /** What a person has in a direct chat with the agent, as text. */
  async function thread(person: { cookie: string; id: string }): Promise<{ from: string | null; body: string; sys: boolean }[]> {
    const list = await w.json('/api/social/conversations', undefined, person.cookie) as unknown as { conversations: { id: string; with: string | null }[] };
    const conv = list.conversations.find((c) => c.with === botId);
    if (!conv) return [];
    const history = await w.json(`/api/social/conversations/${encodeURIComponent(conv.id)}`, undefined, person.cookie) as unknown as { messages: { from: { name: string } | null; body: string; sys?: boolean }[] };
    return history.messages.map((m) => ({ from: m.from?.name ?? null, body: m.body, sys: m.sys === true }));
  }
  const dm = (person: { cookie: string }, body: string) => w.json('/api/social/messages', { to: botId, body, clientId: `c-${Math.random().toString(36).slice(2, 12)}` }, person.cookie);
  return { w, wanda, ben, room, other, bot, botId, blocked, consent, thread, dm };
}
export type Scene = Awaited<ReturnType<typeof scene>>;
