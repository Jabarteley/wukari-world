#!/usr/bin/env node
/**
 * A release check of a running Allworld, for the person shipping a release.
 *
 *   node --experimental-strip-types scripts/smoke.ts [origin]        (default http://127.0.0.1:5173)
 *   npm run smoke -- https://example.org
 *
 * Read-only apart from ONE guest session named "Zz Test" (and the one harmless action it takes), about a hundred requests in all,
 * well under every rate limit. In order:
 *   1. /api/health answers ok with a build id (printed)
 *   2. the page loads with its security headers, and every asset it references (and every script those import) answers 200
 *      with the right content type
 *   3. a guest session is made, its life loads, and the world pulse answers with `today` present and a world total at
 *      least as large as every city's count, with at least one city counted
 *   4. every open city's life route answers for a fresh guest, making the server load every immutable city payload
 *   5. a socket opens, is answered, sends the pulse counts frame, and starts a private game of Weave against a bot,
 *      making the server load and unpack the immutable dictionary
 *   6. one harmless action (choosing the spot the character already stands at) is accepted, and its repeated id answers
 *      as a duplicate
 *   7. the chunks of every open city (its rules or content, and its map) are fetched (built page only; the dev server has no such files)
 *
 * It prints one line per check and a short PASS summary, or one FAIL line and a non-zero exit code at the first failure.
 * Run against a built app (npm start, npm run start:worker) or a deployed origin. Against `npm run dev` the page is Vite's:
 * the security headers and the hashed chunks are not there, and those two checks say so and are skipped.
 */
import { randomUUID } from 'node:crypto';
import { WebSocket } from 'ws';
import { playableCityIds } from '../src/game/cities/registry.ts';
import type { ActionResponse, LifeResponse } from '../src/types/protocol.ts';

const origin = (process.argv[2] || 'http://127.0.0.1:5173').replace(/\/+$/, '');
const CITY = 'lagos';
const SESSION_NAME = 'Zz Test';
const started = Date.now();
let requests = 0, checks = 0;
let cookie = '';

class Failure extends Error {}
const fail = (message: string): never => { throw new Failure(message); };
const pass = (what: string, note = ''): void => { checks++; console.log(`ok    ${what}${note ? `  ${note}` : ''}`); };
const messageOf = (error: unknown): string => error instanceof Error ? error.message : String(error);
const pause = (ms: number): Promise<void> => new Promise(resolve => setTimeout(resolve, ms));

/** One request, counted; a refused or dropped connection is a failure with the address in it. */
async function get(path: string, init: RequestInit = {}): Promise<Response> {
  requests++;
  try {
    return await fetch(new URL(path, `${origin}/`), { redirect: 'manual', ...init, headers: { ...(cookie ? { Cookie: cookie } : {}), ...init.headers } });
  } catch (error) {
    return fail(`${path}: no answer from ${origin} (${messageOf(error)})`);
  }
}
async function json<T>(path: string, body?: unknown): Promise<{ status: number; body: T }> {
  const response = await get(path, body === undefined ? {} : { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
  const type = response.headers.get('content-type') ?? '';
  if (!type.startsWith('application/json')) fail(`${path}: answered ${response.status} with content type "${type}", not JSON`);
  return { status: response.status, body: await response.json() as T };
}

async function createGuest(name: string): Promise<{ cookie: string; session: { id: string; name: string } }> {
  requests++;
  const created = await fetch(new URL('/api/session', `${origin}/`), { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ name }) });
  if (created.status !== 200) fail(`POST /api/session answered ${created.status} ${await created.text()}`);
  const nextCookie = (created.headers.get('set-cookie') ?? '').split(';')[0] ?? '';
  if (!nextCookie) fail('POST /api/session set no cookie');
  const session = (await created.json() as { session: { id: string; name: string } }).session;
  if (session.name !== name) fail(`the session is named "${session.name}", not "${name}"`);
  return { cookie: nextCookie, session };
}

async function cityLife(city: string): Promise<{ status: number; body: LifeResponse & { error?: string } }> {
  const path = `/api/life?city=${encodeURIComponent(city)}`;
  let answer = await json<LifeResponse & { error?: string }>(path);
  if (answer.status === 503 && answer.body.error === 'city_content_unavailable') answer = await json<LifeResponse & { error?: string }>(path);
  return answer;
}

const TYPES: Record<string, RegExp> = {
  '.js': /^(text|application)\/javascript/, '.mjs': /^(text|application)\/javascript/, '.css': /^text\/css/, '.svg': /^image\/svg\+xml/, '.png': /^image\/png/,
  '.webmanifest': /^application\/(manifest\+json|json)/, '.json': /^application\/json/, '.woff2': /^font\/woff2/, '.glb': /^model\/gltf-binary/, '.ts': /^(text|application)\/(javascript|typescript)/,
};
const REQUIRED_HEADERS = ['content-security-policy', 'x-content-type-options', 'x-frame-options', 'referrer-policy'];

/** The path of an asset on this origin: absolute paths and same-origin addresses only. */
function localPath(ref: string): string | null {
  try { const url = new URL(ref, `${origin}/`); return url.origin === origin ? url.pathname : null; } catch { return null; }
}

async function checkHealth(): Promise<void> {
  const { status, body } = await json<{ ok?: boolean; build?: string }>('/api/health');
  if (status !== 200 || body.ok !== true) fail(`/api/health answered ${status} ${JSON.stringify(body)}`);
  if (typeof body.build !== 'string' || !body.build) fail('/api/health has no build id');
  pass('health', `build ${body.build}`);
}

/** Fetches the page and every asset it references; returns the text of the scripts it reached (the chunk names are in them). */
async function checkPage(): Promise<{ dev: boolean; scripts: string[] }> {
  const page = await get('/');
  if (page.status !== 200) fail(`/ answered ${page.status}`);
  if (!(page.headers.get('content-type') ?? '').startsWith('text/html')) fail(`/ has content type "${page.headers.get('content-type')}", not text/html`);
  const html = await page.text();
  const dev = html.includes('/@vite/client');
  if (dev) pass('page headers', 'skipped: the dev server serves its own page');
  else {
    const missing = REQUIRED_HEADERS.filter((name) => !page.headers.get(name));
    if (missing.length) fail(`/ is missing the headers ${missing.join(', ')}`);
    if (page.headers.get('x-content-type-options') !== 'nosniff') fail('/ does not send X-Content-Type-Options: nosniff');
    pass('page headers', REQUIRED_HEADERS.join(', '));
  }
  const refs = [...html.matchAll(/<(?:script|link)\b[^>]*\b(?:src|href)="([^"]+)"/g)].map((match) => localPath(match[1] as string)).filter((path): path is string => path !== null && /\.(js|css|svg|png|webmanifest|ts)$/.test(path) && !(dev && path.endsWith('.webmanifest')));
  const queue = [...new Set(refs)], seen = new Set<string>(), scripts: string[] = [];
  if (!queue.some((path) => /\.(js|ts)$/.test(path))) fail('the page references no script');
  for (let path = queue.shift(); path !== undefined; path = queue.shift()) {
    if (seen.has(path)) continue;
    seen.add(path);
    const asset = await get(path);
    const extension = path.slice(path.lastIndexOf('.'));
    if (asset.status !== 200) fail(`${path} answered ${asset.status}`);
    const type = asset.headers.get('content-type') ?? '';
    const expected = TYPES[extension];
    if (expected && !expected.test(type)) fail(`${path} has content type "${type}"`);
    if (!dev && asset.headers.get('x-content-type-options') !== 'nosniff') fail(`${path} does not send X-Content-Type-Options: nosniff`);
    if (/\.js$/.test(path) && !dev) {
      const text = await asset.text();
      scripts.push(text);
      // The scripts a script imports before it runs (./name.js in the same folder), and the two the first screen loads at once
      // after it: the rules (which hold Lagos and name every city's chunks) and the game shell.
      for (const match of text.matchAll(/(?:from|import)\s*["']\.\/([\w.-]+\.js)["']|import\(\s*["']\.\/((?:engine|startApp)-[\w-]+\.js)["']\s*\)/g)) queue.push(`${path.slice(0, path.lastIndexOf('/') + 1)}${match[1] ?? match[2]}`);
    } else await asset.arrayBuffer();
  }
  pass('page and assets', `${seen.size} files`);
  return { dev, scripts };
}

async function main(): Promise<void> {
  console.log(`Allworld smoke check of ${origin}`);
  await checkHealth();
  const { dev, scripts } = await checkPage();

  // A guest session: the cookie comes back on the answer that made it.
  const created = await createGuest(SESSION_NAME);
  cookie = created.cookie;
  const { session } = created;
  pass('guest session', `"${session.name}"`);

  const life = await cityLife(CITY);
  if (life.status !== 200 || typeof life.body.state?.cash !== 'number' || typeof life.body.state.spot !== 'string') fail(`GET /api/life answered ${life.status} without a life`);
  const state = life.body.state;
  pass('life', `in ${state.location}, spot ${state.spot}`);

  const cities = playableCityIds();
  const loaded: string[] = [];
  const primaryCookie = cookie;
  for (const [index, city] of cities.entries()) {
    if (city !== CITY) {
      // Session creation is limited per address before a cookie exists. Stay below sixty starts in any minute when the catalogue grows.
      await pause(1050);
      cookie = (await createGuest(`Zz City ${index + 1}`)).cookie;
    }
    const answer = await cityLife(city);
    if (answer.status !== 200 || !answer.body.state || answer.body.state.estate.city !== city) fail(`GET /api/life?city=${city} answered ${answer.status} without a life whose estate city is ${city}`);
    loaded.push(city);
    pass('server city content', city);
  }
  cookie = primaryCookie;
  pass('server city content total', `${loaded.length} cities`);

  const pulse = await json<{ online: number; visits: number; today: number; cities: Record<string, number> }>('/api/world/pulse');
  if (pulse.status !== 200) fail(`GET /api/world/pulse answered ${pulse.status} ${JSON.stringify(pulse.body)}`);
  const counts = Object.values(pulse.body.cities ?? {});
  if (typeof pulse.body.today !== 'number') fail('the pulse has no `today`');
  if (!counts.length || Math.max(...counts) < 1) fail('the pulse counts nobody in any city, though this guest is here');
  if (typeof pulse.body.online !== 'number' || pulse.body.online < Math.max(...counts)) fail(`the pulse says ${pulse.body.online} online, fewer than a city's ${Math.max(...counts)}`);
  pass('world pulse', `online ${pulse.body.online}, today ${pulse.body.today}, visits ${pulse.body.visits}, cities ${counts.length}`);

  await checkSocket();

  const id = `${Date.now()}:${randomUUID()}`;
  const body = { actionId: id, cityId: CITY, type: 'spot', payload: { id: state.spot } };
  const first = await json<ActionResponse>('/api/action', body);
  if (first.status !== 200 || typeof first.body.ok !== 'boolean' || typeof first.body.code !== 'string') fail(`POST /api/action answered ${first.status} ${JSON.stringify(first.body).slice(0, 200)}`);
  if (first.body.duplicate) fail('a new action id was answered as a duplicate');
  const again = await json<ActionResponse>('/api/action', body);
  if (again.status !== 200 || again.body.duplicate !== true) fail(`the repeated action id was not answered as a duplicate (${again.status} ${JSON.stringify(again.body).slice(0, 200)})`);
  if (again.body.code !== first.body.code) fail(`the repeat answered "${again.body.code}", the first "${first.body.code}"`);
  pass('action and its repeat', `"${first.body.code}", then duplicate`);

  if (dev) pass('city chunks', 'skipped: the dev server has no built chunks');
  else {
    let fetched = 0;
    const got = new Set<string>();
    // Every `city-...js` file name seen so far in the startup scripts and in each fetched body. Only the names are kept, never the bodies,
    // so the corpus is scanned once per file instead of once per city and loop turn (the full text of ~1,000 files ran the heap out).
    const seen = new Set<string>();
    const noteNames = (text: string): void => { for (const found of text.matchAll(/\bcity-[\w-]+\.js/g)) seen.add(found[0]); };
    // The page's startup scripts no longer name each city's chunks: they hold the ordered city index (id and name) and an equally long,
    // equally ordered table of the 8-hex content hashes of the rules files, and the loader builds `city-<id>-rules-<hash>.js` at run
    // time. Read both from the page's own scripts, rebuild the names the browser would ask for, and treat them as referenced.
    const source = scripts.join('\n');
    const indexIds = [...(/\[(?:\["[a-z0-9-]+","[^"\]]*"\],?){10,}\]/.exec(source)?.[0] ?? '').matchAll(/\["([a-z0-9-]+)","/g)].map((found) => found[1] as string);
    const hashes = [...(/\[(?:"[0-9a-f]{8}",?){10,}\]/.exec(source)?.[0] ?? '').matchAll(/"([0-9a-f]{8})"/g)].map((found) => found[1] as string);
    if (!indexIds.length || indexIds.length !== hashes.length) fail(`the page's city index has ${indexIds.length} rows but its rules table ${hashes.length}`);
    noteNames(source);
    for (const [row, id] of indexIds.entries()) seen.add(`city-${id}-rules-${hashes[row]}.js`);
    const fetchText = async (path: string, city?: string): Promise<string> => {
      const chunk = await get(path);
      if (chunk.status !== 200) fail(`${path} answered ${chunk.status}`);
      if (city && !TYPES['.js']?.test(chunk.headers.get('content-type') ?? '')) fail(`${path} has content type "${chunk.headers.get('content-type')}"`);
      return chunk.text();
    };
    for (const city of cities) {
      // A city's files name each other (its rules name its map, a recipe names its content), so follow the names from the page's scripts
      // until no new file of this city turns up. Lagos's rules may be part of the rules chunk the page loads.
      const kinds = new Set<string>(), own = new RegExp(`\\b(city-${city}-([a-z]+)-[\\w-]+\\.js)`);
      for (;;) {
        const todo: string[] = [];
        for (const name of seen) {
          const found = own.exec(name);
          if (!found || got.has(found[1] as string)) continue;
          got.add(found[1] as string); kinds.add(found[2] as string); todo.push(found[1] as string);
        }
        if (!todo.length) break;
        // A few at a time: the files are small and the page loads them together.
        for (let from = 0; from < todo.length; from += 8) {
          await Promise.all(todo.slice(from, from + 8).map(async (name) => {
            const body = await fetchText(`/assets/${name}`, city);
            fetched++;
            noteNames(body);
            // What the file imports before it runs may be where the city's other files are named.
            for (const needed of body.matchAll(/(?:from|import)\s*["']\.\/((?!city-)[\w.-]+\.js)["']/g)) {
              const other = needed[1] as string;
              if (got.has(other)) continue;
              got.add(other);
              noteNames(await fetchText(`/assets/${other}`));
            }
          }));
        }
      }
      if (!kinds.has('map')) fail(`no map chunk of ${city} is referenced by the page's scripts`);
      if (!kinds.has('content') && !kinds.has('rules') && city !== 'lagos') fail(`no rules or content chunk of ${city} is referenced by the page's scripts`);
    }
    pass('city chunks', `${fetched} files for ${cities.length} open cities`);
  }
  console.log(`PASS  ${checks} checks, ${requests} requests, ${((Date.now() - started) / 1000).toFixed(1)} s, ${origin}`);
}

/** Opens the socket as the browser does (same origin, the session cookie), asks for the counts, and reads what arrives first. */
async function checkSocket(): Promise<void> {
  const url = `${origin.replace(/^http/, 'ws')}/socket`;
  const ws = new WebSocket(url, { headers: { Origin: origin, Cookie: cookie } });
  const types: string[] = [];
  const heard: { pulse?: { online: number; today: number; cities: Record<string, number> }; weave?: boolean } = {};
  try {
    await new Promise<void>((resolve, reject) => {
      const timer = setTimeout(() => reject(new Failure(`the socket at ${url} did not finish its pulse and dictionary checks within 12 s (heard: ${types.join(', ') || 'nothing'})`)), 12000);
      ws.on('error', (error) => { clearTimeout(timer); reject(new Failure(`the socket at ${url} failed: ${error.message}`)); });
      ws.on('unexpected-response', (_request, response) => { clearTimeout(timer); reject(new Failure(`the socket at ${url} was refused with ${response.statusCode}`)); });
      ws.on('close', (code) => { clearTimeout(timer); reject(new Failure(`the socket closed (${code}) before the pulse counts arrived`)); });
      ws.on('open', () => {
        requests++;
        ws.send(JSON.stringify({ type: 'pulse-watch' }));
        ws.send(JSON.stringify({ type: 'table-sit', cityId: CITY, table: 'phone-weave' }));
      });
      ws.on('message', (data) => {
        const frame = JSON.parse(String(data)) as { type?: string; online?: number; today?: number; cities?: Record<string, number>; code?: string; table?: { id?: string; status?: string }; you?: number | null };
        types.push(String(frame.type));
        if (frame.type === 'error') { clearTimeout(timer); reject(new Failure(`the socket refused the release smoke frame (${frame.code ?? 'unknown error'})`)); return; }
        if (frame.type === 'pulse' && typeof frame.online === 'number' && typeof frame.today === 'number' && frame.cities) heard.pulse = { online: frame.online, today: frame.today, cities: frame.cities };
        if (frame.type === 'table-state' && frame.table?.id === 'phone-weave' && frame.you === 0 && frame.table.status === 'open') ws.send(JSON.stringify({ type: 'table-start', cityId: CITY, table: 'phone-weave', bots: 1 }));
        if (frame.type === 'table-state' && frame.table?.id === 'phone-weave' && frame.table.status === 'playing') heard.weave = true;
        if (heard.pulse && heard.weave) { clearTimeout(timer); resolve(); }
      });
    });
  } finally { ws.removeAllListeners(); ws.terminate(); }
  const pulse = heard.pulse;
  if (!pulse) return fail('no pulse counts arrived');
  const counts = Object.values(pulse.cities);
  if (!counts.length || Math.max(...counts) < 1) fail('the counts frame counts nobody, though this guest has a socket open');
  pass('socket', `frames: ${types.join(', ')}; online ${pulse.online}`);
  if (!heard.weave) return fail('the private Weave game did not start after loading the dictionary');
  pass('server dictionary', 'private Weave game started');
}

try { await main(); }
catch (error) {
  console.error(`FAIL  ${error instanceof Failure ? error.message : `unexpected: ${messageOf(error)}`}`);
  process.exitCode = 1;
}
