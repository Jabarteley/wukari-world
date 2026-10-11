// The commands of open mode (docs/DEVELOPING.md, "Open mode: play without the gates").
//
//   npm run start:open                       the built game on 127.0.0.1:3001 (or PORT), local data in .data-open
//   npm run dev:fund -- "<name>" [amount]    top a local player's lives up to the open-mode amount, or add `amount` naira
//   npm run dev:seed                         make a few local players (cities and friends of the local players)
//   ... -- --url http://127.0.0.1:5173       which running open-mode server (default: 5173, then 3001)
//
// Fund and seed talk to a server that is already running in open mode, over loopback only; they never change a normal one
// (the routes do not exist there). Nothing here reads a settings file.
import { spawn } from 'node:child_process';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const args = process.argv.slice(2);
const command = args.shift() ?? '';
const urlAt = args.indexOf('--url');
const given = urlAt >= 0 ? args.splice(urlAt, 2)[1] : undefined;
const fail = (message: string): never => { console.error(message); process.exit(1); };

if (command === 'start') {
  const env = { ...process.env, ALLWORLD_OPEN_DEV: '1', DATA_DIR: process.env.DATA_DIR || resolve(root, '.data-open') };
  const child = spawn(process.execPath, ['--experimental-strip-types', resolve(root, 'server/server.ts')], { cwd: root, env, stdio: 'inherit' });
  for (const signal of ['SIGINT', 'SIGTERM'] as const) process.once(signal, () => { child.kill(signal); });
  child.once('exit', (code) => process.exit(code ?? 0));
} else if (command === 'fund' || command === 'seed') {
  const candidates = given ? [given] : ['http://127.0.0.1:5173', `http://127.0.0.1:${process.env.PORT || 3001}`];
  const loopback = (value: string): boolean => { try { return ['127.0.0.1', 'localhost', '[::1]'].includes(new URL(value).hostname); } catch { return false; } };
  const asked = async (base: string, path: string, body?: object): Promise<Response> => fetch(base + path, { method: body ? 'POST' : 'GET', headers: { Origin: base, ...(body ? { 'Content-Type': 'application/json' } : {}) }, ...(body ? { body: JSON.stringify(body) } : {}), signal: AbortSignal.timeout(15000) });
  let found = '';
  for (const base of candidates) {
    if (!loopback(base)) fail(`${base} is not a localhost address: open-mode commands only talk to this machine.`);
    try { const state = await (await asked(base, '/api/account/open-dev')).json() as { openDev?: unknown }; if (state.openDev === true) { found = base; break; } } catch { /* not running here */ }
  }
  if (!found) fail('No open-mode server answered. Start one first: npm run dev:open (or npm run start:open), then run this again.');
  const body: Record<string, unknown> = {};
  if (command === 'fund') {
    const [name, amount] = args;
    if (!name) fail('Say whose money to top up: npm run dev:fund -- "<name>" [amount]');
    body.name = name;
    if (amount !== undefined) { if (!/^\d{1,12}$/.test(amount) || Number(amount) < 1) fail('The amount is a whole number of naira above zero.'); body.amount = Number(amount); }
  }
  const response = await asked(found, `/api/account/open-dev/${command}`, body);
  const answer = await response.json().catch(() => ({})) as Record<string, unknown>;
  if (!response.ok) fail(`Refused (${response.status}): ${String(answer.reason ?? answer.error ?? 'no reason given')}`);
  console.log(JSON.stringify(answer, null, 2));
} else fail('Usage: scripts/open-dev.ts start | fund "<name>" [amount] | seed   (use the npm run start:open / dev:fund / dev:seed commands)');
