// The read-only agent tool check_gist (docs/AGENTS.md, docs/GIST.md): an agent looks a claim up in the city's public gist before it repeats it.
import assert from 'node:assert/strict';
import test from 'node:test';
import { world } from './test-world.ts';
import { ROUTE_MODULES } from '../routes/index.ts';
import { gistService } from '../gist/ledger.ts';
import { TOOL_NAMES } from './tools-more.ts';
import type { RouteContext, RouteModule } from '../types.ts';

test('check_gist finds at most five matching public lines of the agent\'s city and the world, says plainly when there is none, and writes nothing', async (t) => {
  let grabbed: RouteContext | null = null;
  const module: RouteModule = (ctx) => { grabbed = ctx; return {}; };
  const w = await world(t, { routes: [...ROUTE_MODULES, module] });
  const ctx = grabbed as RouteContext | null;
  assert.ok(ctx && TOOL_NAMES.includes('check_gist'));
  const gist = gistService(ctx);
  const add = (city: string, text: string) => w.f.server.store.transact((db) => { gist.add(db, { city, kind: 'other', text }); });
  await add('lagos', 'Ada opened a food stall in Yaba');
  await add('lagos', 'A festival has started at the Park');
  await add('ibadan', 'Ada opened a food stall in Ibadan');
  await add('world', 'The Square is packed right now');
  for (let i = 0; i < 6; i++) await add('lagos', `Stall ${i} opened in Yaba`);
  const ada = await w.owner('Ada1', 'Ada');
  const made = await w.makeAgentKey(ada);
  assert.equal(made.status, 200);
  const listed = (await w.mcp(made.key, 'tools/list')).json.result as { tools: { name: string; description: string; annotations: { readOnlyHint?: boolean } }[] };
  const tool = listed.tools.find((item) => item.name === 'check_gist');
  assert.ok(tool, 'the tool is listed');
  assert.equal(tool.annotations.readOnlyHint, true);
  assert.match(tool.description, /BEFORE YOU REPEAT A CLAIM/, 'its description tells an agent to use it before repeating a claim');

  const before = JSON.stringify(await w.f.server.store.read((db) => (db as unknown as { gist: unknown }).gist));
  const stall = await w.tool(made.key, 'check_gist', { query: 'ada food stall' });
  assert.equal(stall.ok, true);
  assert.deepEqual((stall.data.items as { text: string }[]).map((item) => item.text), ['Ada opened a food stall in Yaba'], 'the other city\'s line is not found');
  const many = await w.tool(made.key, 'check_gist', { query: 'yaba' });
  assert.equal((many.data.items as unknown[]).length, 5, 'at most five');
  const square = await w.tool(made.key, 'check_gist', { query: 'square' });
  assert.equal(square.data.count, 1, 'the world\'s lines belong to every city');
  const none = await w.tool(made.key, 'check_gist', { query: 'the mayor resigned' });
  assert.equal(none.ok, true);
  assert.equal(none.data.code, 'not_found');
  assert.match(String(none.data.note), /Do not claim/);
  const latest = await w.tool(made.key, 'check_gist', {});
  assert.equal((latest.data.items as unknown[]).length, 5);
  assert.deepEqual(Object.keys((latest.data.items as object[])[0]!).sort(), ['at', 'minutesAgo', 'n', 'text', 'where']);
  assert.equal(JSON.stringify(await w.f.server.store.read((db) => (db as unknown as { gist: unknown }).gist)), before, 'a read-only tool changes nothing');
});
