#!/usr/bin/env node
/**
 * THE STORAGE SWITCH, REHEARSED ON THE WORKER RUNTIME (docs/STORE-MIGRATION.md). The build that is live writes a store through its
 * own routes; this build then takes that store through the releases of the switch, exactly as they would run, and everything
 * is compared with a copy of the store that stayed on the live build.
 *
 *   node --experimental-strip-types scripts/store-switch-proof.ts --old <a checkout of the build that is live> \
 *        [--players 2000] [--sleepers 2000] [--agents 300] [--requests 4000] [--port 4671] [--out <folder for the report>] [--seed 1]
 *        [--only-stop]   steps 1 and 3 alone        [--lazy]   step 4 with changes held in memory as the live site holds them
 *
 * WHAT IT DOES
 *   1. SEED    the live build's Worker (Miniflare, persisted storage): players in several cities with lives, friends, messages with
 *              their receipts, a group, gifts, pings, civic check-ins and preferences, a party, growth records, and AI agents that
 *              sign themselves up and call tools until their audit trails are full. Three copies are kept of the result.
 *   2. TIME    on the first copy: this build with the release word `shadow` and the default step size. How long until every
 *              collection has its copy, how many steps, the largest one; then `entries`: how long the switch takes. Every
 *              collection is checked from the SQLite file itself (rows counted, a SHA-256 of the whole text, old against new).
 *   3. STOP    on the second copy: small steps, and the runtime killed (SIGKILL) again and again while it copies. Each time it is
 *              started again it must read what was there and go on; at the end every copy must equal its stored value.
 *   4. TURNS   the second copy then goes through release A and release B with the live build taking the object back between
 *              turns (the overlap of a deploy), while the third copy stays on the live build. A recorded mix of requests is sent
 *              to both, one request at a time; every answer is compared. Writes are sent twice with the same id now and then, so
 *              the receipts are compared too.
 *   5. END     both stores are read from their files and compared collection by collection, with the sessions, the receipts,
 *              the accounts and the wallet history.
 * Times of day and ids made during the run differ between two servers by nature: a number that is a time of this decade is
 * compared as "a time", the fractions of a point a life has not yet lost to the clock (`decay`) as "the clock", and an id neither
 * store had before the run by where it first appears. The turns run with every write durable at once unless `--lazy` is given:
 * what an object only holds in memory is lost when it is replaced, in any layout, and not at the same moments in two stores.
 */
import { mkdtemp, rm, readFile, cp, writeFile, readdir, mkdir } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
import { realpathSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { DatabaseSync } from 'node:sqlite';
import assert from 'node:assert/strict';
import { KEYED_SPECS, assembleText, splitText } from '../server/keyed.ts';
import { legacySeed } from '../server/testing/legacySeed.ts';

const root = resolve(fileURLToPath(new URL('..', import.meta.url)));
const args = process.argv.slice(2), option = (name: string, fallback: string): string => { const at = args.indexOf(`--${name}`); return at >= 0 ? args[at + 1] ?? fallback : fallback; };
const old = realpathSync(resolve(option('old', '.'))), PLAYERS = Number(option('players', '2000')), SLEEPERS = Number(option('sleepers', '2000')), AGENTS = Number(option('agents', '300')), REQUESTS = Number(option('requests', '4000'));
const PORT = Number(option('port', '4671')), outDir = args.includes('--out') ? resolve(option('out', '.')) : null;
const token = `proof-${createHash('sha256').update(String(process.pid) + String(Date.now())).digest('hex').slice(0, 32)}`;
const sleep = (ms: number): Promise<void> => new Promise((done) => setTimeout(done, ms));
const sha = (text: string | undefined): string | null => (text === undefined ? null : createHash('sha256').update(text).digest('hex').slice(0, 16));
/** A deterministic stream of numbers in [0, 1). */
function stream(seed: number): () => number {
  let s = seed >>> 0;
  return () => { s = (s + 0x6d2b79f5) >>> 0; let x = s; x = Math.imul(x ^ (x >>> 15), x | 1); x ^= x + Math.imul(x ^ (x >>> 7), x | 61); return ((x ^ (x >>> 14)) >>> 0) / 4294967296; };
}
const random = stream(Number(option('seed', '1')));
const hex = (n: number): string => Array.from({ length: n }, () => Math.floor(random() * 16).toString(16)).join('');
const uuid = (): string => `${hex(8)}-${hex(4)}-4${hex(3)}-8${hex(3)}-${hex(12)}`;
const report: Record<string, unknown> = { players: PLAYERS, agents: AGENTS };
const say = (line: string): void => console.log(line);

// ---- the two builds on the Worker runtime -------------------------------------------------------------------------------------
interface Mini { ready: Promise<URL>; dispose(): Promise<void> }
const require = createRequire(resolve(process.env['JOINALLWORLD_TOOLS'] || join(root, 'deploy/tooling'), 'package.json'));
const miniflare = require('miniflare') as { Miniflare: new (options: Record<string, unknown>) => Mini; convertV4MiniflareOptions(options: Record<string, unknown>): Record<string, unknown> };
const esbuild = require('esbuild') as { build(options: Record<string, unknown>): Promise<unknown> };
const work = await mkdtemp(join(tmpdir(), 'allworld-switch-proof-'));
async function bundle(repo: string, name: string): Promise<string> {
  const out = join(work, `${name}.mjs`);
  await esbuild.build({ entryPoints: [join(repo, 'deploy/cloudflare-worker.ts')], outfile: out, bundle: true, format: 'esm', platform: 'neutral', external: ['cloudflare:workers'], logLevel: 'error' });
  return readFile(out, 'utf8');
}
const SCRIPTS = { old: await bundle(old, 'old'), next: await bundle(root, 'next') };
type Build = 'old' | 'A' | 'B';
const BINDINGS: Record<Build, Record<string, string>> = { old: {}, A: { STORE_LAYOUT: 'shadow' }, B: { STORE_LAYOUT: 'entries' } };
const runtimes = (): number[] => execFileSync('ps', ['-axo', 'pid=,ppid=,comm=']).toString().split('\n').map((line) => line.trim().split(/\s+/)).filter((cols) => Number(cols[1]) === process.pid && (cols[2] ?? '').includes('workerd')).map((cols) => Number(cols[0]));
interface Host { base: string; build: Build; pid: number; logs: string[]; stop(): Promise<void>; kill(): Promise<void> }
async function start(dir: string, port: number, build: Build, extra: Record<string, string> = {}): Promise<Host> {
  const before = new Set(runtimes()), logs: string[] = [];
  const mf = new miniflare.Miniflare({ ...miniflare.convertV4MiniflareOptions({ name: 'allworld-proof', script: build === 'old' ? SCRIPTS.old : SCRIPTS.next, modules: true, compatibilityDate: '2026-10-01',
    durableObjects: { JOINALLWORLD: { className: 'JoinAllworldState', useSQLite: true } }, durableObjectsPersist: join(dir, 'storage'),
    bindings: { BUILD_ID: `proof-${build}`, MODERATOR_TOKEN: token, FOUNDER_EMAIL_SHA256: '', NEW_SESSIONS_PER_ADDRESS: '100000', ...BINDINGS[build], ...extra },
    // Each build is served its own city content (`npm run cities:assets && npm run words:assets` makes it in a checkout that has no built page).
    assets: { directory: join(build === 'old' ? old : root, 'dist'), binding: 'ASSETS', run_worker_first: true, routerConfig: { has_user_worker: true }, assetConfig: { not_found_handling: 'single-page-application' } } }),
    resourcePersistencePath: join(dir, 'storage'), host: '127.0.0.1', port, handleStructuredLogs: (entry: unknown) => { const text = typeof entry === 'string' ? entry : JSON.stringify(entry); if (text.includes('Store:')) logs.push(text.slice(0, 400)); } });
  await mf.ready;
  const pid = runtimes().find((id) => !before.has(id)) ?? 0;
  const gone = async (): Promise<void> => { for (let i = 0; i < 100; i += 1) { try { process.kill(pid, 0); await sleep(50); } catch { return; } } };
  return { base: `http://127.0.0.1:${port}`, build, pid, logs,
    stop: async () => { await mf.dispose(); await gone(); },
    kill: async () => { if (pid) { try { process.kill(pid, 'SIGKILL'); } catch { /* already gone */ } } await gone(); await mf.dispose().catch(() => undefined); } };
}
let operatorCalls = 0;
async function operator(host: Host, path: string, body?: object): Promise<Record<string, unknown>> {
  const address = `45.0.${(operatorCalls >> 5) & 255}.${1 + ((operatorCalls >> 13) & 200)}`; operatorCalls += 1;
  const response = await fetch(host.base + path, { method: body ? 'POST' : 'GET', headers: { authorization: `Bearer ${token}`, 'cf-connecting-ip': address, ...(body ? { 'content-type': 'application/json' } : {}) }, ...(body ? { body: JSON.stringify(body) } : {}) });
  return { status: response.status, ...(await response.json() as object) };
}

const counts: Record<string, Record<string, number>> = {};
const count = (kind: string, status: number | string): void => { const row = (counts[kind] ??= {}); row[String(status)] = (row[String(status)] ?? 0) + 1; };
// ---- requests as a page and an agent make them -----------------------------------------------------------------------------------
interface Player { id: string; cookie: string; ip: string; city: string; friends: string[] }
interface Agent { key: string; ip: string }
interface Ask { kind: string; who: number | null; /** The address a request with no player comes from. */ ip?: string; agent?: number; method: 'GET' | 'POST'; path: string; body?: unknown; /** The write this one repeats, id and all. */ again?: Ask }
interface Answer { status: number; json: unknown }
async function send(host: Host, ask: Ask, players: Player[], agents: Agent[]): Promise<Answer & { cookie?: string }> {
  const player = ask.who === null ? null : players[ask.who] ?? null, agent = ask.agent === undefined ? null : agents[ask.agent] ?? null;
  const headers: Record<string, string> = agent
    ? { 'content-type': 'application/json', accept: 'application/json, text/event-stream', 'cf-connecting-ip': agent.ip, ...(agent.key ? { authorization: `Bearer ${agent.key}` } : {}) }
    : { origin: host.base, 'cf-connecting-ip': player?.ip ?? ask.ip ?? '44.250.0.1', ...(ask.body !== undefined ? { 'content-type': 'application/json' } : {}), ...(player?.cookie ? { cookie: player.cookie } : {}) };
  // A connection the local runtime drops is not an answer: the same request is sent again (a write carries its id, so it is done once).
  let response: Response | undefined, text = '';
  for (let attempt = 0; ; attempt += 1) {
    try { response = await fetch(host.base + ask.path, { method: ask.method, headers, ...(ask.body !== undefined ? { body: JSON.stringify(ask.body) } : {}), signal: AbortSignal.timeout(120000) }); text = await response.text(); break; }
    catch (error) { count('connection dropped and sent again', ask.kind || 'request'); if (attempt >= 4) throw error; await sleep(200 * (attempt + 1)); }
  }
  let json: unknown = text;
  try { json = JSON.parse(text) as unknown; } catch { /* not JSON: compared as text */ }
  const cookie = response.headers.get('set-cookie')?.split(';')[0];
  return { status: response.status, json, ...(cookie ? { cookie } : {}) };
}
/** A write's id carries the time it was first sent; sent again (and sent to the other store) it carries the same one. */
function stamp(ask: Ask): void {
  if (ask.body === undefined) return;
  const text = JSON.stringify(ask.body);
  if (text.includes('@now:')) ask.body = JSON.parse(text.replaceAll('@now:', `${Date.now()}:`)) as unknown;
}
const tool = (agent: number, name: string, input: object = {}): Ask => ({ kind: `agent: ${name}`, who: null, agent, method: 'POST', path: name === 'create_agent_account' ? '/mcp?signup=1' : '/mcp', body: { jsonrpc: '2.0', id: 1, method: 'tools/call', params: { name, arguments: input } } });
const refusals: Record<string, string> = {}, samples: Record<string, boolean> = {};
async function pool<T>(items: T[], width: number, each: (item: T, index: number) => Promise<void>): Promise<void> {
  let next = 0;
  await Promise.all(Array.from({ length: width }, async () => { for (;;) { const at = next; next += 1; if (at >= items.length) return; await each(items[at] as T, at); } }));
}

/** The stored state the live build leaves: every kind of record the switch moves, at the scale asked for. */
async function seed(host: Host): Promise<{ players: Player[]; agents: Agent[]; convs: string[]; cities: string[] }> {
  const players: Player[] = [], agents: Agent[] = [], convs: string[] = [];
  const nobody: Player[] = [];
  const ask = async (kind: string, a: Ask): Promise<Answer & { cookie?: string }> => { const got = await send(host, { ...a, kind }, players.length ? players : nobody, agents); count(`seed: ${kind}`, got.status); if ((got.status !== 200 || (got.json as { ok?: boolean }).ok === false) && !refusals[kind]) refusals[kind] = JSON.stringify(got.json).slice(0, 200); if (process.env['PROOF_SAMPLES'] && !samples[kind]) { samples[kind] = true; say(`  sample ${kind}: ${JSON.stringify(got.json).slice(0, 260)}`); } return got; };
  // Which cities are open: asked of the server, so the seed follows the build.
  const probe = await send(host, { kind: 'probe', who: null, method: 'POST', path: '/api/session', body: { name: 'Probe' } }, nobody, agents);
  const probeCookie = probe.cookie ?? '';
  const wanted = ['lagos', 'abuja', 'ibadan', 'kano', 'port-harcourt', 'accra', 'nairobi', 'london'], cities: string[] = [];
  for (const city of wanted) { const r = await fetch(`${host.base}/api/life?city=${city}`, { headers: { origin: host.base, cookie: probeCookie, 'cf-connecting-ip': '44.250.0.2' } }); await r.arrayBuffer(); if (r.status === 200 && (city === 'lagos' || cities.length < 4)) cities.push(city); }
  if (!cities.includes('lagos')) cities.unshift('lagos');
  say(`  cities with lives: ${cities.join(', ')}`);
  const made: (Player | null)[] = Array.from({ length: PLAYERS }, () => null);
  await pool(made, 8, async (_, i) => {
    const ip = `44.${(i >> 16) & 255}.${(i >> 8) & 255}.${i & 255}`, city = i % 5 === 4 ? cities[1 + (i % Math.max(1, cities.length - 1))] ?? 'lagos' : 'lagos';
    const session = await send(host, { kind: 'session', who: 0, method: 'POST', path: '/api/session', body: { name: `Player ${i + 1}` } }, [{ id: '', cookie: '', ip, city, friends: [] }], agents);
    count('seed: session', session.status);
    const id = (session.json as { session?: { id?: string } }).session?.id;
    if (!id || !session.cookie) return;
    const player: Player = { id, cookie: session.cookie, ip, city, friends: [] };
    made[i] = player;
    const me = [player];
    for (const path of [`/api/life?city=${city}`, '/api/social/me', `/api/civic/pulse?city=${city}`]) count(`seed: ${path.split('?')[0]}`, (await send(host, { kind: 'x', who: 0, method: 'GET', path }, me, agents)).status);
    count('seed: growth hello', (await send(host, { kind: 'x', who: 0, method: 'POST', path: '/api/growth/hello', body: { cityId: city } }, me, agents)).status);
  });
  for (const player of made) if (player) players.push(player);
  say(`  ${players.length} players made`);
  // Friends: each player with the two before it. Messages with receipts: a few lines each way, some long threads.
  const index = players.map((_, i) => i);
  await pool(index, 6, async (i) => {
    for (const back of [1, 2]) {
      if (i - back < 0) continue;
      const a = players[i] as Player, b = players[i - back] as Player;
      const asked = await ask('friend request', { kind: '', who: i, method: 'POST', path: '/api/social/friends/request', body: { to: b.id, cityId: a.city } });
      const answered = await ask('friend answer', { kind: '', who: i - back, method: 'POST', path: '/api/social/friends/answer', body: { from: a.id, accept: true, cityId: b.city } });
      if (asked.status === 200 && answered.status === 200) { a.friends.push(b.id); b.friends.push(a.id); }
    }
  });
  await pool(index, 6, async (i) => {
    if (i === 0) return;
    const a = players[i] as Player, b = players[i - 1] as Player, lines = i % 40 === 0 ? 60 : 2 + (i % 5);
    for (let m = 0; m < lines; m += 1) {
      const got = await ask('message', { kind: '', who: m % 2 ? i - 1 : i, method: 'POST', path: '/api/social/messages', body: { to: (m % 2 ? a : b).id, body: `line ${m} \u{1F469}‍\u{1F4BB} from ${i}`, clientId: `${Date.now()}:${uuid()}` } });
      const conv = (got.json as { conv?: { id?: string } }).conv?.id;
      if (m === 0 && conv && i % 3 === 0) convs.push(conv);
    }
  });
  const crew = await ask('group', { kind: '', who: 0, method: 'POST', path: '/api/social/groups', body: { name: 'Crew', members: players.slice(1, 3).map((p) => p.id), clientId: `${Date.now()}:${uuid()}` } });
  const crewId = (crew.json as { conv?: { id?: string } }).conv?.id;
  if (crewId) { convs.push(crewId); for (let m = 0; m < 30; m += 1) await ask('group message', { kind: '', who: m % 3, method: 'POST', path: '/api/social/messages', body: { conv: crewId, body: `group line ${m}`, clientId: `${Date.now()}:${uuid()}` } }); }
  for (let i = 0; i + 1 < Math.min(players.length, 400); i += 7) await ask('gift', { kind: '', who: i + 1, method: 'POST', path: '/api/social/transfers', body: { to: (players[i] as Player).id, amount: 100 + (i % 9) * 50, cityId: (players[i + 1] as Player).city, clientId: `${Date.now()}:${uuid()}` } });
  for (let i = 0; i + 1 < Math.min(players.length, 300); i += 11) await ask('ping', { kind: '', who: i + 1, method: 'POST', path: '/api/social/ping', body: { to: (players[i] as Player).id, clientId: `${Date.now()}:${uuid()}` } });
  for (let i = 9; i < Math.min(players.length, 300); i += 23) await ask('block', { kind: '', who: i, method: 'POST', path: '/api/social/block', body: { id: (players[i - 5] as Player).id, cityId: (players[i] as Player).city } });
  // Civic and politics: preferences, a refresh of the city, votes and a party; whatever the rules refuse is counted, not hidden.
  await pool(index.filter((i) => i % 4 === 0), 6, async (i) => {
    const p = players[i] as Player;
    await ask('civic prefs', { kind: '', who: i, method: 'POST', path: '/api/civic/prefs', body: { directory: i % 8 === 0 } });
    await ask('action civic.refresh', { kind: '', who: i, method: 'POST', path: '/api/action', body: { actionId: `${Date.now()}:${uuid()}`, cityId: p.city, type: 'civic.refresh' } });
    if (i % 16 === 0) await ask('civic vote', { kind: '', who: i, method: 'POST', path: '/api/civic/gov/vote', body: { cityId: p.city, candidate: (players[0] as Player).id } });
    if (i % 12 === 0) await ask('growth share', { kind: '', who: i, method: 'POST', path: '/api/growth/share', body: { cityId: p.city, kind: 'invite' } });
    if (i % 20 === 0) await ask('growth referral', { kind: '', who: i, method: 'POST', path: '/api/growth/referral/link', body: { cityId: p.city } });
  });
  await ask('civic run', { kind: '', who: 0, method: 'POST', path: '/api/civic/gov/run', body: { cityId: 'lagos', slogan: 'A fair market for everyone', requestId: `${Date.now()}:${uuid()}` } });
  await ask('party found', { kind: '', who: 0, method: 'POST', path: '/api/politics/party/found', body: { cityId: 'lagos', name: 'Open Roads', motto: 'Every street counts', requestId: `${Date.now()}:${uuid()}` } });
  for (const path of ['/api/politics/overview?city=lagos', '/api/civic/gov?city=lagos', '/api/civic/boards?city=lagos']) await ask(path.split('?')[0] as string, { kind: '', who: 0, method: 'GET', path });
  // AI agents: each signs itself up, then calls tools until its audit trail is full.
  const set = await operator(host, '/api/mod/agents/settings', { createCap: AGENTS + 1000 });
  count('seed: agent settings', Number(set['status']));
  const slots: (Agent | null)[] = Array.from({ length: AGENTS }, () => null);
  const TOOLS: [string, object][] = [['get_my_life', {}], ['list_actions_here', {}], ['list_places', {}], ['list_people_here', {}], ['get_goals', {}], ['read_messages', {}], ['do_activity', { id: 'chill' }], ['list_friends', {}]];
  await pool(slots, 6, async (_, i) => {
    const ip = `46.${(i >> 16) & 255}.${(i >> 8) & 255}.${i & 255}`;
    const got = await send(host, tool(0, 'create_agent_account', { name: `Proof Agent ${i + 1}` }), players, [{ key: '', ip }]);
    const key = ((got.json as { result?: { structuredContent?: { key?: string } } }).result?.structuredContent?.key);
    count('seed: agent signup', typeof key === 'string' ? 'made' : `refused ${got.status}`);
    if (typeof key !== 'string') return;
    slots[i] = { key, ip };
    for (let call = 0; call < 24; call += 1) { const [name, input] = TOOLS[(i + call) % TOOLS.length] as [string, object]; const answer = await send(host, tool(0, name, input), players, [{ key, ip }]); count(`seed: agent ${name}`, (answer.json as { result?: { isError?: boolean } }).result?.isError === false ? 'ok' : `refused ${answer.status}`); }
  });
  for (const agent of slots) if (agent) agents.push(agent);
  say(`  ${agents.length} agents made`);
  return { players, agents, convs, cities };
}

/** The recorded mix: what open pages and running agents ask in a few minutes, writes included, some of them sent twice. */
function mix(players: Player[], agents: Agent[], convs: string[], n: number): Ask[] {
  const asks: Ask[] = [], sent: Ask[] = [];
  const pick = (): number => Math.floor(random() * players.length);
  const READS: [string, (p: Player, i: number) => string][] = [
    ['life', (p) => `/api/life?city=${p.city}`], ['social me', () => '/api/social/me'], ['conversations', () => '/api/social/conversations'], ['friends', () => '/api/social/friends'],
    ['civic pulse', (p) => `/api/civic/pulse?city=${p.city}`], ['world pulse', () => '/api/world/pulse'], ['rich list', (p) => `/api/civic/richlist?city=${p.city}`], ['neighbours', (p) => `/api/civic/neighbours?city=${p.city}`],
    ['boards', (p) => `/api/civic/boards?city=${p.city}`], ['politics', (p) => `/api/politics/overview?city=${p.city}`], ['government', (p) => `/api/civic/gov?city=${p.city}`], ['people', (p) => `/api/social/people?city=${p.city}`],
    ['search', (_, i) => `/api/social/search?q=${encodeURIComponent(`Player ${1 + (i % 97)}`)}`], ['a conversation', () => `/api/social/conversations/${encodeURIComponent(convs[Math.floor(random() * convs.length)] ?? 'none')}`], ['agents board', () => '/api/agents/board'],
  ];
  const TOOLS: [string, object][] = [['get_my_life', {}], ['list_actions_here', {}], ['list_places', {}], ['list_people_here', {}], ['get_goals', {}], ['read_messages', {}], ['do_activity', { id: 'chill' }], ['list_friends', {}], ['read_here', {}]];
  while (asks.length < n) {
    const r = random(), i = pick(), p = players[i] as Player;
    if (r < 0.34) { const [kind, path] = READS[Math.floor(random() * READS.length)] as [string, (p: Player, i: number) => string]; asks.push({ kind, who: i, method: 'GET', path: path(p, i) }); }
    else if (r < 0.5 && agents.length) { const [name, input] = TOOLS[Math.floor(random() * TOOLS.length)] as [string, object]; asks.push(tool(Math.floor(random() * agents.length), name, input)); }
    else if (r < 0.64 && p.friends.length) { const ask: Ask = { kind: 'message', who: i, method: 'POST', path: '/api/social/messages', body: { to: p.friends[Math.floor(random() * p.friends.length)], body: `mix line ${asks.length}`, clientId: `@now:${uuid()}` } }; asks.push(ask); sent.push(ask); }
    else if (r < 0.72) { const ask: Ask = { kind: 'action', who: i, method: 'POST', path: '/api/action', body: { actionId: `@now:${uuid()}`, cityId: p.city, type: 'civic.refresh' } }; asks.push(ask); sent.push(ask); }
    else if (r < 0.77) { const other = players[(i + 50 + Math.floor(random() * 40)) % players.length] as Player; asks.push({ kind: 'friend request', who: i, method: 'POST', path: '/api/social/friends/request', body: { to: other.id, cityId: p.city } }); }
    else if (r < 0.81 && p.friends.length) { const ask: Ask = { kind: 'gift', who: i, method: 'POST', path: '/api/social/transfers', body: { to: p.friends[0], amount: 50, cityId: p.city, clientId: `@now:${uuid()}` } }; asks.push(ask); sent.push(ask); }
    else if (r < 0.85) asks.push({ kind: 'growth hello', who: i, method: 'POST', path: '/api/growth/hello', body: { cityId: p.city } });
    else if (r < 0.88) asks.push({ kind: 'civic prefs', who: i, method: 'POST', path: '/api/civic/prefs', body: { directory: random() < 0.5 } });
    else if (r < 0.9) asks.push({ kind: 'new player', who: null, ip: `47.0.${(asks.length >> 8) & 255}.${asks.length & 255}`, method: 'POST', path: '/api/session', body: { name: `Late ${asks.length}` } });
    // The same write again, with the id it was first sent with: the receipt must answer, in both stores alike.
    else if (sent.length) { const first = sent[Math.floor(random() * sent.length)] as Ask; asks.push({ kind: `${first.kind}, sent again`, who: first.who, method: first.method, path: first.path, again: first }); }
  }
  return asks;
}

// ---- comparing two servers' words --------------------------------------------------------------------------------------------------
const UUID = /[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/g;
/** A value with the clock and the run's own new ids taken out of it (see the head of this file). */
function plain(value: unknown, known: Set<string>): string {
  const fresh = new Map<string, string>();
  const text = (s: string): string => s.replace(UUID, (id) => { if (known.has(id)) return id; let name = fresh.get(id); if (!name) { name = `<new id ${fresh.size + 1}>`; fresh.set(id, name); } return name; }).replace(/\b1[6-9]\d{11}\b/g, '<time>');
  const walk = (v: unknown): unknown => {
    if (typeof v === 'number') return Number.isFinite(v) && v > 1.6e12 && v < 2.2e12 ? '<time>' : v;
    if (typeof v === 'string') return text(v);
    if (Array.isArray(v)) return v.map(walk);
    // `decay` holds the fractions of a point of hunger, energy and fun not yet taken off: how far the clock had run when the life was last settled.
    if (v !== null && typeof v === 'object') return Object.fromEntries(Object.entries(v).map(([key, item]) => [text(key), key === 'decay' && item !== null && typeof item === 'object' ? '<clock>' : walk(item)]));
    return v;
  };
  return JSON.stringify(walk(value));
}
/**
 * The build that is live cuts a stored value longer than a row every 400,000 units, and a cut that falls inside a character outside
 * the basic plane (an emoji) leaves U+FFFD in its place (six of them under the Worker runtime, two under node:sqlite). This build does not (deploy/sqlite-store.ts cutAt). Two texts that
 * differ only there are told apart from texts that differ in what they say.
 */
const undamaged = (text: string): string => text.replace(/[\uD800-\uDBFF][\uDC00-\uDFFF]|\uFFFD{2,6}/g, '\u25A1');
/** Where two values first differ, as a path. */
function firstDifference(a: unknown, b: unknown, path = ''): string | null {
  if (JSON.stringify(a) === JSON.stringify(b)) return null;
  if (a !== null && b !== null && typeof a === 'object' && typeof b === 'object' && Array.isArray(a) === Array.isArray(b)) {
    const keys = [...new Set([...Object.keys(a), ...Object.keys(b)])];
    for (const key of keys) { const found = firstDifference((a as Record<string, unknown>)[key], (b as Record<string, unknown>)[key], `${path}/${key}`); if (found) return found; }
  }
  return `${path || '/'}: ${JSON.stringify(a)?.slice(0, 90)} | ${JSON.stringify(b)?.slice(0, 90)}`;
}

// ---- the store, read from its file ---------------------------------------------------------------------------------------------------
async function sqliteFile(dir: string): Promise<string> {
  const found: string[] = [];
  const walk = async (folder: string): Promise<void> => { for (const item of await readdir(folder, { withFileTypes: true })) { const full = join(folder, item.name); if (item.isDirectory()) await walk(full); else if (item.name.endsWith('.sqlite') && !item.name.includes('metadata')) found.push(full); } };
  await walk(join(dir, 'storage'));
  const withTables = found.filter((file) => { const db = new DatabaseSync(file); try { return (db.prepare("SELECT COUNT(*) AS n FROM sqlite_master WHERE name = 'collections'").get() as { n: number }).n === 1; } finally { db.close(); } });
  assert.equal(withTables.length, 1, `one store file in ${dir}`);
  return withTables[0] as string;
}
interface FileFacts { tables: Record<string, number>; legacy: Record<string, { chars: number; sha: string | null; entries: number }>; entries: Record<string, { rows: number; sha: string | null }>; other: Record<string, string | null>; meta: Record<string, string>; text: { legacy: Record<string, string | undefined>; entries: Record<string, string | undefined>; other: Record<string, string> }; sessions: Record<string, string>; receipts: { actions: string[]; once: string[] }; wallet: string[]; accounts: number }
async function facts(dir: string): Promise<FileFacts> {
  const db = new DatabaseSync(await sqliteFile(dir));
  try {
    const whole = (name: string): string | undefined => {
      const head = (db.prepare('SELECT value FROM collections WHERE name = ?').get(name) as { value: string } | undefined)?.value;
      if (head === undefined) return undefined;
      if (!/^\{"\$parts":\d{1,6}\}$/.test(head)) return head;
      return (db.prepare('SELECT value FROM collection_parts WHERE name = ? ORDER BY part').all(name) as { value: string }[]).map((row) => row.value).join('');
    };
    const tables: Record<string, number> = {};
    for (const name of ['sessions', 'action_receipts', 'once_receipts', 'archived_lives', 'accounts', 'account_devices', 'collections', 'collection_parts', 'entries', 'wallet_effects', 'store_meta']) tables[name] = (db.prepare(`SELECT COUNT(*) AS n FROM ${name}`).get() as { n: number }).n;
    const out: FileFacts = { tables, legacy: {}, entries: {}, other: {}, meta: Object.fromEntries((db.prepare('SELECT key, value FROM store_meta').all() as { key: string; value: string }[]).map((row) => [row.key, row.value])), text: { legacy: {}, entries: {}, other: {} }, sessions: {}, receipts: { actions: [], once: [] }, wallet: [], accounts: tables['accounts'] ?? 0 };
    for (const name of Object.keys(KEYED_SPECS)) {
      const legacy = whole(name), rootText = whole(`root:${name}`);
      out.text.legacy[name] = legacy;
      out.legacy[name] = { chars: legacy?.length ?? 0, sha: sha(legacy), entries: legacy === undefined ? 0 : splitText(name, legacy).maps.reduce((sum, map) => sum + map.entries.length, 0) };
      let assembled: string | undefined;
      if (rootText !== undefined) {
        const read = db.prepare('SELECT key, value FROM entries WHERE coll = ? AND map = ? ORDER BY ord');
        assembled = assembleText(rootText, (id) => (read.all(name, id) as { key: string; value: string }[]).map((row): [string, string] => {
          if (!/^\{"\$parts":\d{1,6}\}$/.test(row.value)) return [row.key, row.value];
          return [row.key, (db.prepare('SELECT value FROM collection_parts WHERE name = ? ORDER BY part').all(`entry:${name}\u0000${id}\u0000${row.key}`) as { value: string }[]).map((part) => part.value).join('')];
        }));
      }
      out.text.entries[name] = assembled;
      out.entries[name] = { rows: (db.prepare('SELECT COUNT(*) AS n FROM entries WHERE coll = ?').get(name) as { n: number }).n, sha: sha(assembled) };
    }
    for (const row of db.prepare("SELECT name FROM collections WHERE name NOT LIKE 'root:%' ORDER BY name").all() as { name: string }[]) if (!(row.name in KEYED_SPECS)) { const text = whole(row.name) as string; out.other[row.name] = sha(text); out.text.other[row.name] = text; }
    for (const row of db.prepare('SELECT public_id, value FROM sessions').all() as { public_id: string; value: string }[]) out.sessions[row.public_id] = row.value;
    out.receipts.actions = (db.prepare('SELECT sender, action_id, value FROM action_receipts ORDER BY sender, action_id').all() as { sender: string; action_id: string; value: string }[]).map((row) => `${row.sender}|${row.action_id}|${row.value}`);
    out.receipts.once = (db.prepare('SELECT sender, id, kind, value FROM once_receipts ORDER BY sender, id').all() as { sender: string; id: string; kind: string; value: string }[]).map((row) => `${row.sender}|${row.id}|${row.kind}|${row.value}`);
    out.wallet = (db.prepare('SELECT public_id, city_id, amount, balance_after, reason FROM wallet_effects ORDER BY seq').all() as Record<string, unknown>[]).map((row) => JSON.stringify(row));
    return out;
  } finally { db.close(); }
}
const brief = (f: FileFacts): object => ({ tables: f.tables, legacy: f.legacy, entries: f.entries, layout: f.meta['layout'] ?? null, by: f.meta['layout-by'] ?? null });
/** In one store: does every collection's per-entry copy equal its stored value, by count and by fingerprint? */
function copiesEqual(f: FileFacts): string[] {
  const bad: string[] = [];
  for (const name of Object.keys(KEYED_SPECS)) {
    const legacy = f.legacy[name], copy = f.entries[name];
    if (!legacy || !copy) continue;
    if (legacy.sha !== copy.sha) bad.push(`${name}: fingerprint ${String(legacy.sha)} against ${String(copy.sha)}`);
    if (legacy.entries !== copy.rows) bad.push(`${name}: ${legacy.entries} entries in the stored value, ${copy.rows} rows`);
  }
  return bad;
}
interface Status { requested: string; stored: string | null; shadow: { mismatches: number; errors: number; first: string[]; compared: number; checks: number }; release: { target: string | null; by: string | null; moving: string | null; pending: string[]; refusal: string | null; steps: { count: number; chars: number; rows: number; ms: number; switchMs: number | null; largest: unknown } }; collections: Record<string, { synced: boolean; legacyChars: number; entries: number; copied: unknown; error: string | null }> }
const status = async (host: Host): Promise<Status> => await operator(host, '/api/mod/store') as unknown as Status;
/** Ask ordinary things of the server until the store has nothing left to copy (the status itself moves nothing). */
async function untilCopied(host: Host, players: Player[]): Promise<{ ms: number; requests: number; slowest: number }> {
  const began = performance.now();
  let requests = 0, slowest = 0;
  for (;;) {
    const now = await status(host);
    if (now.release.pending.length === 0 && now.release.moving !== 'shadow') return { ms: Math.round(performance.now() - began), requests, slowest: Math.round(slowest) };
    const p = players[requests % 40 % players.length] as Player, t = performance.now();
    await send(host, { kind: 'life', who: requests % 40 % players.length, method: 'GET', path: `/api/life?city=${p.city}` }, players, []);
    slowest = Math.max(slowest, performance.now() - t); requests += 1;
    assert.ok(requests < 2000, `the copies were not finished: ${JSON.stringify(now.release)}`);
  }
}

/**
 * What a store a few weeks old holds and a run of a few minutes cannot make through the routes (the game's own rules refuse a gift,
 * a vote or a shop to a life that is minutes old): players who came and went, with their friendships, long conversations, gifts
 * waiting, shops, a second and third city and an election with its votes (server/testing/legacySeed.ts), put into the stored values
 * beside what the routes wrote; and receipts and wallet history for the lives that exist. Written the way the live layout stores them.
 */
async function age(dir: string, sleepers: number): Promise<{ added: Record<string, number>; receipts: number; wallet: number }> {
  const db = new DatabaseSync(await sqliteFile(dir)), CHUNK = 400000;
  try {
    const read = (name: string): string | undefined => {
      const head = (db.prepare('SELECT value FROM collections WHERE name = ?').get(name) as { value: string } | undefined)?.value;
      if (head === undefined || !/^\{"\$parts":\d{1,6}\}$/.test(head)) return head;
      return (db.prepare('SELECT value FROM collection_parts WHERE name = ? ORDER BY part').all(name) as { value: string }[]).map((row) => row.value).join('');
    };
    const write = (name: string, text: string): void => {
      db.prepare('DELETE FROM collection_parts WHERE name = ?').run(name);
      let head = text;
      if (text.length > CHUNK) { let parts = 0; for (let at = 0; at < text.length; at += CHUNK) { db.prepare('INSERT INTO collection_parts(name,part,value) VALUES(?,?,?)').run(name, parts, text.slice(at, at + CHUNK)); parts += 1; } head = `{"$parts":${parts}}`; }
      db.prepare('INSERT INTO collections(name,value) VALUES(?,?) ON CONFLICT(name) DO UPDATE SET value=excluded.value').run(name, head);
    };
    /** What the routes wrote stays as it is; what only the older store has is added beside it. */
    const merge = (mine: Record<string, unknown>, theirs: Record<string, unknown>, depth: number): void => {
      for (const [key, value] of Object.entries(theirs)) {
        const have = mine[key];
        if (have === undefined) mine[key] = value;
        else if (depth > 0 && have !== null && value !== null && typeof have === 'object' && typeof value === 'object' && !Array.isArray(have) && !Array.isArray(value)) merge(have as Record<string, unknown>, value as Record<string, unknown>, depth - 1);
      }
    };
    const { collections } = legacySeed({ players: sleepers, seed: 11, now: Date.now() - 3600000 });
    // A second and a third city, each with residents and an election of its own.
    const cities = (collections.civic as { cities: Record<string, { residents: Record<string, unknown> }> }).cities, first = Object.values(cities)[0];
    if (first) for (const [n, city] of ['abuja', 'ibadan'].entries()) if (!cities[city]) { const copy = JSON.parse(JSON.stringify(first)) as { residents: Record<string, unknown> }; copy.residents = Object.fromEntries(Object.entries(copy.residents).filter((_, i) => i % 3 === n)); cities[city] = copy; }
    const added: Record<string, number> = {};
    db.exec('BEGIN');
    for (const [name, value] of Object.entries(collections)) {
      const stored = read(name), mine = stored === undefined ? {} : JSON.parse(stored) as Record<string, unknown>;
      merge(mine, value as Record<string, unknown>, 4);
      const text = JSON.stringify(mine);
      write(name, text); added[name] = text.length - (stored?.length ?? 0);
    }
    const sessions = (db.prepare('SELECT public_id FROM sessions LIMIT 600').all() as { public_id: string }[]).map((row) => row.public_id);
    let receipts = 0, wallet = 0;
    for (const [i, id] of sessions.entries()) {
      for (let k = 0; k < 1 + (i % 4); k += 1) { const at = Date.now() - 600000 - k * 1000; db.prepare('INSERT OR IGNORE INTO once_receipts(sender,id,at,kind,value) VALUES(?,?,?,?,?)').run(id, `${at}:${uuid()}`, at, k % 2 ? 'gift' : 'run', JSON.stringify({ at, kind: k % 2 ? 'gift' : 'run', fp: hex(16), result: { ok: true, n: k } })); receipts += 1; }
      let balance = 5000;
      for (let k = 0; k < i % 5; k += 1) { balance += 250; db.prepare('INSERT INTO wallet_effects(public_id,city_id,operation_id,ordinal,at,amount,balance_after,reason,transfer_id) VALUES(?,?,?,?,?,?,?,?,?)').run(id, 'lagos', `op-${hex(12)}`, k, Date.now() - 500000 + k, 250, balance, 'wage', null); wallet += 1; }
    }
    db.exec('COMMIT');
    return { added, receipts, wallet };
  } finally { db.close(); }
}

// ---- the rehearsal -------------------------------------------------------------------------------------------------------------------
const dirs = { timing: join(work, 'timing'), moved: join(work, 'moved'), reference: join(work, 'reference') };
try {
  say(`1. SEED: the live build (${old.split('/').pop()}) writes a store`);
  let host = await start(dirs.moved, PORT, 'old');
  const began = performance.now();
  const world = await seed(host);
  await host.stop();
  const { players, agents } = world;
  const aged = SLEEPERS > 0 ? await age(dirs.moved, SLEEPERS) : null;
  if (aged) say(`  aged: ${SLEEPERS} players who came and went and two more cities put into the stored values (${Object.entries(aged.added).map(([name, chars]) => `${name} +${chars}`).join(', ')} characters), ${aged.receipts} receipts and ${aged.wallet} wallet rows for lives that exist`);
  const seeded = await facts(dirs.moved);
  report['seed'] = { aged, sleepers: SLEEPERS, seconds: Math.round((performance.now() - began) / 1000), requests: counts, cities: world.cities, ...brief(seeded) as object };
  say(`  seeded in ${Math.round((performance.now() - began) / 1000)}s: ${seeded.tables['sessions']} sessions, ${seeded.tables['action_receipts']} action receipts, ${seeded.tables['once_receipts']} other receipts, ${seeded.tables['wallet_effects']} wallet rows`);
  say(`  what the seed was answered: ${Object.entries(counts).map(([kind, row]) => `${kind.replace('seed: ', '')} ${Object.entries(row).map(([status, n]) => `${status}×${n}`).join(' ')}`).join(' · ')}`);
  for (const [kind, text] of Object.entries(refusals)) say(`  refused in the seed, ${kind}: ${text}`);
  for (const [name, row] of Object.entries(seeded.legacy)) if (row.chars) say(`  ${name}: ${row.chars} characters, ${row.entries} entries`);
  assert.equal(seeded.meta['layout'], undefined, 'the live build leaves the store in its own layout');
  await cp(dirs.moved, dirs.timing, { recursive: true }); await cp(dirs.moved, dirs.reference, { recursive: true });
  const known = new Set<string>([...players.map((p) => p.id), ...Object.keys(seeded.sessions)]);
  for (const text of [...Object.values(seeded.text.legacy), ...Object.values(seeded.text.other)]) for (const id of text?.match(UUID) ?? []) known.add(id);

  say('2. TIME: release A and release B on a copy, default step size');
  if (!args.includes('--only-stop')) {
  host = await start(dirs.timing, PORT, 'A');
  const copied = await untilCopied(host, players);
  const afterA = await status(host);
  const compareA = (await operator(host, '/api/mod/store/compare'))['collections'] as Record<string, { equal: boolean; legacyEntries: number; entryRows: number; legacyHash: string | null; entryHash: string | null; legacyChars: number }>;
  await host.stop();
  const fileA = await facts(dirs.timing);
  assert.equal(afterA.stored, 'shadow'); assert.equal(afterA.release.by, 'release');
  assert.ok(Object.values(compareA).every((row) => row.equal && row.legacyEntries === row.entryRows && row.legacyHash === row.entryHash), JSON.stringify(compareA));
  assert.deepEqual(copiesEqual(fileA), []);
  for (const name of Object.keys(KEYED_SPECS)) assert.equal(fileA.legacy[name]?.sha, seeded.legacy[name]?.sha, `${name}: the stored value is what the live build left`);
  say(`  release A: every copy made in ${copied.ms} ms over ${copied.requests} requests (slowest request ${copied.slowest} ms), ${afterA.release.steps.count} collections, ${afterA.release.steps.rows} rows, largest step ${JSON.stringify(afterA.release.steps.largest)}`);
  host = await start(dirs.timing, PORT, 'B');
  const t0 = performance.now();
  await send(host, { kind: 'life', who: 0, method: 'GET', path: `/api/life?city=${(players[0] as Player).city}` }, players, []);
  const firstB = Math.round(performance.now() - t0), afterB = await status(host);
  await host.stop();
  const fileB = await facts(dirs.timing);
  assert.equal(afterB.stored, 'entries'); assert.equal(afterB.requested, 'entries');
  for (const name of Object.keys(KEYED_SPECS)) { assert.equal(fileB.entries[name]?.sha, seeded.legacy[name]?.sha, `${name}: per entry it reads as the live build left it`); assert.equal(fileB.legacy[name]?.sha, seeded.legacy[name]?.sha, `${name}: the stored value of before is untouched`); }
  say(`  release B: switched in ${afterB.release.steps.switchMs} ms (the first request took ${firstB} ms); every collection reads per entry exactly as the live build left it`);
  report['timing'] = { releaseA: { ...copied, steps: afterA.release.steps, compare: compareA }, releaseB: { firstRequestMs: firstB, switchMs: afterB.release.steps.switchMs }, file: { afterA: brief(fileA), afterB: brief(fileB) } };
  }

  say('3. STOP: the runtime killed while it copies, again and again');
  const kills: object[] = [];
  // The moment of the kill is searched for: later while nothing was copied yet, earlier (on a fresh copy of the seeded store) when
  // everything was. A kill that lands with some copies made and some not is kept, and the next kill lands on what it left.
  let partial = 0, wait = 60, tooEarly = 0, tooLate = Infinity, before = -1;
  const total = Object.keys(KEYED_SPECS).length;
  for (let round = 0; round < 40 && partial < 6; round += 1) {
    host = await start(dirs.moved, PORT, 'A', { STORE_STEP_CHARS: '150000' });
    // Requests are on their way when the runtime is killed: nobody waits for them.
    for (let i = 0; i < 1 + (round % 8); i += 1) void send(host, { kind: 'life', who: i, method: 'GET', path: `/api/life?city=${(players[i] as Player).city}` }, players, []).catch(() => undefined);
    await sleep(wait);
    await host.kill();
    const cut = await facts(dirs.moved);
    const made = Object.keys(cut.meta).filter((key) => key.startsWith('synced:')).length;
    // Whatever was cut off, the stored values are what they were and every copy that is marked as made is whole.
    for (const name of Object.keys(KEYED_SPECS)) { assert.equal(cut.legacy[name]?.sha, seeded.legacy[name]?.sha, `round ${round}: ${name} stored value`); if (cut.meta[`synced:${name}`]) assert.equal(cut.entries[name]?.sha, cut.legacy[name]?.sha, `round ${round}: the copy of ${name}`); }
    // A collection named in a `copying:` row was being copied when the kill came (the row is written first and removed with the copy).
    const during = Object.entries(cut.meta).filter(([key]) => key.startsWith('copying:')).map(([key, tries]) => `${key.slice(8)} (try ${tries})`);
    kills.push({ round, afterMs: wait, copiesMade: made, cutOffWhileCopying: during, layout: cut.meta['layout'] ?? null });
    say(`  killed ${wait} ms after its start (round ${round}): ${made} of ${total} copies marked as made${during.length ? `, cut off while copying ${during.join(', ')}` : ''}, layout written down: ${cut.meta['layout'] ?? 'none'}`);
    if (made > 0 && made < total && cut.meta['layout'] === undefined) { partial += 1; if (made === before) break; before = made; continue; }
    if (made === 0) { tooEarly = Math.max(tooEarly, wait); wait = tooLate === Infinity ? wait * 2 : Math.round((tooEarly + tooLate) / 2); continue; }
    // Everything was copied before the kill: take the seeded store again and kill sooner.
    tooLate = Math.min(tooLate, wait); wait = Math.round((tooEarly + tooLate) / 2);
    if (tooLate - tooEarly < 3) break;
    await rm(dirs.moved, { recursive: true, force: true }); await cp(dirs.reference, dirs.moved, { recursive: true });
  }
  host = await start(dirs.moved, PORT, 'A', { STORE_STEP_CHARS: '150000' });
  // A collection whose copy was cut off twice is not tried a third time unasked (the guard against a copy that takes the object
  // down at every start): the operator asks for it, as the runbook says.
  await send(host, { kind: 'life', who: 0, method: 'GET', path: `/api/life?city=${(players[0] as Player).city}` }, players, []);
  const leftAlone = Object.entries((await status(host)).collections).filter(([, c]) => /cut off/.test(c.error ?? '')).map(([name]) => name);
  if (leftAlone.length) { const asked = await operator(host, '/api/mod/store/migrate', { collections: leftAlone }); assert.equal(asked['status'], 200, JSON.stringify(asked).slice(0, 300)); say(`  ${leftAlone.join(', ')}: cut off twice, left alone by the store, copied when the operator asked`); await host.stop(); host = await start(dirs.moved, PORT, 'A', { STORE_STEP_CHARS: '150000' }); }
  const resumed = await untilCopied(host, players);
  const afterStop = await status(host);
  await host.stop();
  const fileStop = await facts(dirs.moved);
  assert.equal(afterStop.stored, 'shadow'); assert.equal(afterStop.shadow.mismatches, 0); assert.equal(afterStop.shadow.errors, 0);
  assert.deepEqual(copiesEqual(fileStop), []);
  for (const name of Object.keys(KEYED_SPECS)) assert.equal(fileStop.legacy[name]?.sha, seeded.legacy[name]?.sha, `${name}: nothing was lost to the kills`);
  // The lives asked for while copying were settled by those requests, as any request settles a life; every other life is byte for byte what it was.
  const asked = new Set(players.slice(0, 40).map((p) => p.id));
  const untouched = Object.entries(seeded.sessions).filter(([id]) => !asked.has(id));
  const same = untouched.filter(([id, value]) => fileStop.sessions[id] === value).length;
  assert.deepEqual(fileStop.receipts, seeded.receipts, 'every receipt is what it was');
  assert.equal(Object.keys(fileStop.sessions).length, Object.keys(seeded.sessions).length);
  say(`  started again: finished in ${resumed.ms} ms over ${resumed.requests} requests; every copy equals its stored value, every receipt is byte for byte what the live build left, and ${same} of ${untouched.length} lives nobody asked for are byte for byte the same`);
  report['stop'] = { kills, killedWithCopiesHalfMade: partial, leftToTheOperator: leftAlone, resumed, livesUntouched: [same, untouched.length], file: brief(fileStop) };

  if (args.includes('--only-stop')) { if (outDir) { await mkdir(outDir, { recursive: true }); await writeFile(join(outDir, 'report-stop.json'), JSON.stringify(report, null, 1)); } process.exit(0); }
  say(`4. TURNS: ${REQUESTS} recorded requests to the moved store and to the store that stayed on the live build`);
  const asks = mix(players, agents, world.convs, REQUESTS);
  const turns: Build[] = ['A', 'old', 'A', 'old', 'A', 'B', 'A', 'old', 'B', 'old', 'B', 'B'];
  const DURABLE: Record<string, string> = args.includes('--lazy') ? {} : { SLEEP_BETWEEN_BEATS: '1' };
  const differences: { n: number; turn: number; build: Build; kind: string; where: string }[] = [], perTurn: object[] = [], byKind: Record<string, { asked: number; equal: number; ok: number }> = {};
  const late = { moved: new Map<number, string>(), reference: new Map<number, string>() };
  let n = 0, remedies = 0, damagedAnswers = 0;
  const damaged: string[] = [];
  for (const [turn, build] of turns.entries()) {
    // Both objects are replaced at the same moments, so what an object only held in memory is lost on both sides alike.
    host = await start(dirs.moved, PORT, build, DURABLE);
    const reference = await start(dirs.reference, PORT + 1, 'old', DURABLE);
    const slice = asks.slice(Math.floor(turn * asks.length / turns.length), Math.floor((turn + 1) * asks.length / turns.length));
    let equal = 0;
    for (const ask of slice) {
      n += 1;
      if (ask.again) ask.body = ask.again.body; else stamp(ask);
      const [mine, theirs] = await Promise.all([send(host, ask, players, agents), send(reference, ask, players, agents)]);
      if (ask.kind === 'new player') { if (mine.cookie) late.moved.set(n, mine.cookie); if (theirs.cookie) late.reference.set(n, theirs.cookie); }
      // The two builds do not open the same cities: a list of every city is compared over the cities both know.
      if (ask.kind === 'world pulse') {
        const [x, y] = [(mine.json as { cities?: Record<string, unknown> }).cities, (theirs.json as { cities?: Record<string, unknown> }).cities];
        if (x && y) { for (const key of Object.keys(x)) if (!(key in y)) delete x[key]; for (const key of Object.keys(y)) if (!(key in x)) delete y[key]; }
      }
      const a = plain({ status: mine.status, json: mine.json }, known), b = plain({ status: theirs.status, json: theirs.json }, known);
      const row = (byKind[ask.kind] ??= { asked: 0, equal: 0, ok: 0 });
      row.asked += 1; if (mine.status === 200) row.ok += 1;
      if (a === b) { equal += 1; row.equal += 1; }
      else if (undamaged(a) === undamaged(b)) { damagedAnswers += 1; equal += 1; row.equal += 1; }
      else differences.push({ n, turn, build, kind: ask.kind, where: firstDifference(JSON.parse(a), JSON.parse(b)) ?? '?' });
    }
    const now = await status(host).catch(() => null);
    perTurn.push({ turn, build, requests: slice.length, equal, layout: now?.requested ?? null, stored: now?.stored ?? null, pending: now?.release?.pending?.length ?? null, mismatches: now?.shadow.mismatches ?? null });
    say(`  turn ${turn} (${build === 'old' ? 'the live build' : `release ${build}`}): ${equal} of ${slice.length} answers equal · the store names ${now?.stored ?? 'no layout'}${now?.shadow ? ` · mismatches ${now.shadow.mismatches}` : ''}`);
    if (now && build !== 'old' && (now.shadow.mismatches > 0 || now.shadow.errors > 0) && !(turn > 0 && turns[turn - 1] === 'old' && now.shadow.errors === 0 && now.stored === 'shadow')) {
      await host.stop(); await reference.stop();
      if (process.env['PROOF_KEEP']) { await cp(dirs.moved, process.env['PROOF_KEEP'], { recursive: true }); say(`  the store was kept in ${process.env['PROOF_KEEP']}`); }
      assert.fail(`shadow found a difference in turn ${turn}: ${JSON.stringify(now.shadow)} ${JSON.stringify(host.logs.slice(-5))}`);
    }
    await host.stop(); await reference.stop();
    // While the store is in shadow, its file is read after every turn: each copy must equal its stored value, whichever build held the object.
    const file = await facts(dirs.moved);
    if (file.meta['layout'] === 'shadow') {
      const bad = copiesEqual(file);
      let serious = 0;
      if (bad.length) {
        for (const name of Object.keys(KEYED_SPECS)) {
          const legacy = file.text.legacy[name], copy = file.text.entries[name];
          if (legacy === undefined || copy === undefined || legacy === copy) continue;
          const a = new Map(splitText(name, legacy).maps.flatMap((map) => map.entries.map(([key, text]): [string, string] => [`${map.id}/${key}`, text])));
          const b = new Map(splitText(name, copy).maps.flatMap((map) => map.entries.map(([key, text]): [string, string] => [`${map.id}/${key}`, text])));
          for (const [key, text] of a) { const other = b.get(key); if (other !== text) { if (other !== undefined && undamaged(other) === undamaged(text)) { damaged.push(`turn ${turn} (${build}): ${name}/${key}`); continue; } serious += 1; let at = 0; while (other !== undefined && at < text.length && text[at] === other[at]) at += 1; say(`    ${name}/${key}: stored value …${text.slice(Math.max(0, at - 80), at + 160)}… | copy ${other === undefined ? 'has no such entry' : `…${other.slice(Math.max(0, at - 80), at + 160)}…`}`); } }
          for (const key of b.keys()) if (!a.has(key)) { serious += 1; say(`    ${name}/${key}: only in the copy`); }
          if ([...a.keys()].join('|') !== [...b.keys()].join('|')) { serious += 1; say(`    ${name}: the order of the entries differs`); }
        }
        if (serious > 0 || build !== 'old') assert.fail(`after turn ${turn} (${build}) a copy differs from its stored value: ${bad.join('; ')}`);
        // The live build damaged a character in the stored value while it held the object (the copy has the character whole). The stored
        // value is the truth in shadow, so the operator makes the copies afresh, as the runbook says, and the finding is cleared.
        say(`  after turn ${turn} the live build had cut a character in two in a stored value; the copies are made afresh (POST /api/mod/store/migrate)`);
        const fix = await start(dirs.moved, PORT, 'A', DURABLE);
        const remade = await operator(fix, '/api/mod/store/migrate', {});
        assert.equal(remade['status'], 200, JSON.stringify(remade).slice(0, 300));
        const cleared = await status(fix);
        assert.equal(cleared.shadow.mismatches, 0); assert.equal(cleared.release.pending.length, 0);
        await fix.stop();
        assert.deepEqual(copiesEqual(await facts(dirs.moved)), []);
        remedies += 1;
      }
    }
  }
  const where: Record<string, number> = {};
  for (const d of differences) { const key = `${d.kind}: ${d.where.split(': ')[0]?.replace(UUID, '<id>').replace(/\/\d+/g, '/#').replace(/[0-9a-f]{64}/g, '<key>')}`; where[key] = (where[key] ?? 0) + 1; }
  report['turns'] = { requests: asks.length, perTurn, byKind, differences: differences.length, equalButForDamagedCharacters: damagedAnswers, liveBuildDamage: damaged, copiesMadeAfresh: remedies, where, first: differences.slice(0, 40), durableAtOnce: !args.includes('--lazy') };
  if (outDir) { await mkdir(outDir, { recursive: true }); await writeFile(join(outDir, 'requests.json'), JSON.stringify(asks.map((ask) => ({ kind: ask.kind, method: ask.method, path: ask.path, body: ask.body ?? null })), null, 0)); }

  say('5. END: both stores read from their files');
  const moved = await facts(dirs.moved), stayed = await facts(dirs.reference);
  assert.equal(moved.meta['layout'], 'entries'); assert.equal(moved.meta['layout-by'], 'release'); assert.equal(stayed.meta['layout'], undefined);
  const end: Record<string, { equal: boolean; where?: string | null; moved: unknown; stayed: unknown }> = {};
  for (const name of Object.keys(KEYED_SPECS)) {
    const a = moved.text.entries[name], b = stayed.text.legacy[name];
    // The public record signs each entry over its text and its time: two servers that wrote the same record a moment apart hold different digests.
    const timed = (text: string): string => (name === 'records' ? text.replace(/\b[0-9a-f]{64}\b/g, '<digest of a timed entry>') : text);
    const pa = timed(a === undefined ? 'null' : plain(JSON.parse(a), known)), pb = timed(b === undefined ? 'null' : plain(JSON.parse(b), known));
    end[name] = { equal: pa === pb || undamaged(pa) === undamaged(pb), ...(pa === pb ? {} : undamaged(pa) === undamaged(pb) ? { where: 'only in characters the live build cut in two' } : { where: firstDifference(JSON.parse(pa), JSON.parse(pb)) }), moved: { rows: moved.entries[name]?.rows, sha: moved.entries[name]?.sha }, stayed: { entries: stayed.legacy[name]?.entries, sha: stayed.legacy[name]?.sha } };
  }
  for (const name of new Set([...Object.keys(moved.text.other), ...Object.keys(stayed.text.other)])) {
    const a = moved.text.other[name], b = stayed.text.other[name];
    const pa = a === undefined ? 'null' : plain(JSON.parse(a), known), pb = b === undefined ? 'null' : plain(JSON.parse(b), known);
    end[`(whole) ${name}`] = { equal: pa === pb, ...(pa === pb ? {} : { where: firstDifference(JSON.parse(pa), JSON.parse(pb)) }), moved: sha(a), stayed: sha(b) };
  }
  const lives = (f: FileFacts): Map<string, string> => new Map(Object.entries(f.sessions).filter(([id]) => known.has(id)).map(([id, value]) => [id, plain(JSON.parse(value), known)]));
  const la = lives(moved), lb = lives(stayed);
  let livesEqual = 0; const lifeDifferences: Record<string, number> = {};
  for (const [id, value] of la) { if (lb.get(id) === value) livesEqual += 1; else { const key = (firstDifference(JSON.parse(value), JSON.parse(lb.get(id) ?? 'null')) ?? '?').split(': ')[0] as string; lifeDifferences[key] = (lifeDifferences[key] ?? 0) + 1; } }
  const receiptSet = (rows: string[]): string => sha(rows.map((row) => plain(row, known)).sort().join('\n')) as string;
  report['end'] = { collections: end, lives: { compared: la.size, equal: livesEqual, first: lifeDifferences }, tables: { moved: moved.tables, stayed: stayed.tables },
    receipts: { actionsEqual: receiptSet(moved.receipts.actions) === receiptSet(stayed.receipts.actions), onceEqual: receiptSet(moved.receipts.once) === receiptSet(stayed.receipts.once), actions: [moved.receipts.actions.length, stayed.receipts.actions.length], once: [moved.receipts.once.length, stayed.receipts.once.length] },
    wallet: { equal: sha(moved.wallet.join('\n')) === sha(stayed.wallet.join('\n')), rows: [moved.wallet.length, stayed.wallet.length] } };
  for (const [name, row] of Object.entries(end)) say(`  ${name}: ${row.equal ? `equal${row.where ? ` (${row.where})` : ''}` : `DIFFERS at ${row.where}`}`);
  if (livesEqual < la.size) say(`  lives differ at: ${JSON.stringify(lifeDifferences)}`);
  say(`  lives: ${livesEqual} of ${la.size} equal · action receipts ${moved.receipts.actions.length}/${stayed.receipts.actions.length} · other receipts ${moved.receipts.once.length}/${stayed.receipts.once.length} · wallet rows ${moved.wallet.length}/${stayed.wallet.length}`);
  if (damagedAnswers || damaged.length) say(`  the live build cut a character in two ${damaged.length} time(s) in the moved store while it held the object (${remedies} time(s) the copies were made afresh); ${damagedAnswers} answers differ only in such a character`);
  say(`  answers: ${asks.length - differences.length} of ${asks.length} equal${differences.length ? `; where they differ:\n${Object.entries(where).sort((a, b) => b[1] - a[1]).slice(0, 25).map(([key, times]) => `    ${times}× ${key}`).join('\n')}` : ''}`);
  if (outDir) { await writeFile(join(outDir, 'report.json'), JSON.stringify(report, null, 1)); say(`report: ${join(outDir, 'report.json')}`); }
} finally {
  await rm(work, { recursive: true, force: true }).catch(() => undefined);
}
process.exit(0);
