#!/usr/bin/env node
/**
 * One player's session measured in a real browser: the first load on a slow phone, then every heavy screen in turn, several times
 * round, to find slow frames, drawing while nothing moves, and anything that is not let go of.
 *
 *   node --experimental-strip-types scripts/perf/session.ts --out <folder> [--label run] [--cycles 4] [--minutes 11]
 *        [--port 4653] [--debug-port 4654] [--software]
 *
 * It builds nothing (run `npm run build` first). It starts the built app (scripts/journeys/serve.ts, a fresh data folder, no outside
 * request) and ONE headless Chrome with the GPU on.
 *
 *   1. FIRST LOAD on a phone profile (390 by 844, CPU slowed four times, a 1.6 Mbit/s link): first paint, the entry page ready to
 *      use, blocking time, bytes fetched.
 *   2. A guest settles in (a home in Ikeja), on a 1440 by 900 desktop.
 *   3. ROUNDS: the venue with its crowd (still, then the camera dragged), the city map (still, zoomed, dragged), the phone and its
 *      list apps (time to open each), the shop, home, the street outside it. After each round, with the garbage collected: the JavaScript heap,
 *      DOM nodes, event listeners, canvases, and what the WebGL contexts still hold.
 *
 * "Draws while still" is the share of frames in which a WebGL context drew although nothing was touched: scenes draw on demand, so
 * a still screen should be near zero unless it shows something that moves by itself (people walking, traffic).
 * A headless browser has no display to wait for: the numbers compare builds on one computer, they do not promise a device.
 */
import { spawn } from 'node:child_process';
import type { ChildProcess } from 'node:child_process';
import { mkdirSync, mkdtempSync, readFileSync, readdirSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { Browser, sleep } from '../journeys/cdp.ts';
import { actionId, dismiss, gameShown, pageCall, toCreator } from '../journeys/kit.ts';

const argv = process.argv.slice(2);
const has = (name: string): boolean => argv.includes(`--${name}`);
const arg = (name: string, fallback?: string): string => {
  const at = argv.indexOf(`--${name}`), value = at >= 0 ? argv[at + 1] : fallback;
  if (value === undefined) throw new Error(`Missing --${name}`);
  return value;
};
const out = resolve(arg('out')), label = arg('label', 'session');
const port = Number(arg('port', '4653')), debugPort = Number(arg('debug-port', '4654')), cycles = Number(arg('cycles', '4')), minutes = Number(arg('minutes', '11'));
const base = `http://127.0.0.1:${port}`;
/** `--profile street` samples the CPU while a screen whose name holds the word is measured, and prints where the time went. */
const profileWord = has('profile') ? arg('profile') : null;
mkdirSync(out, { recursive: true });
const work = mkdtempSync(join(tmpdir(), 'perf-session-'));
const round = (value: number, places = 1): number => { const k = 10 ** places; return Math.round(value * k) / k; };

let server: ChildProcess | null = null, browser: Browser | null = null;
const serverLog: string[] = [];
async function startServer(): Promise<void> {
  const child = spawn(process.execPath, ['--experimental-strip-types', '--no-warnings', 'scripts/journeys/serve.ts', '--port', String(port), '--data', join(work, 'data'), '--cookie-file', join(work, 'founder.cookie')], { stdio: ['ignore', 'pipe', 'pipe'] });
  server = child;
  child.stdout!.on('data', (chunk) => serverLog.push(String(chunk)));
  child.stderr!.on('data', (chunk) => serverLog.push(String(chunk)));
  for (const end = Date.now() + 60000; Date.now() < end; await sleep(200)) {
    if (child.exitCode !== null) throw new Error(`The server stopped: ${serverLog.join('').slice(-400)}`);
    if (serverLog.join('').includes('journey server ready')) return;
  }
  throw new Error('The server did not start');
}
function cleanUp(): void {
  try { browser?.close(); } catch { /* gone */ }
  try { server?.kill('SIGTERM'); } catch { /* gone */ }
  try { rmSync(work, { recursive: true, force: true }); } catch { /* removed */ }
}
const started = Date.now();
const guard = setTimeout(() => { console.error('The run took over fourteen minutes; stopping.'); cleanUp(); process.exit(2); }, 14 * 60 * 1000);
guard.unref();
for (const signal of ['SIGINT', 'SIGTERM', 'SIGALRM'] as const) process.on(signal, () => { cleanUp(); process.exit(130); });

/** The page's stopwatch: frames, long tasks, which frames a WebGL context drew in, and what the contexts hold. Installed before the page's scripts. */
const PROBE = `(() => {
  if (window.__perf) return;
  const P = window.__perf = { frames: [], drew: [], long: [], t0: 0, drawn: null };
  (function tick(t) { P.frames.push(t); P.drew.push(P.drawn); P.drawn = null; if (P.frames.length > 60000) { P.frames.splice(0, 30000); P.drew.splice(0, 30000); } requestAnimationFrame(tick); })(performance.now());
  try { new PerformanceObserver((list) => { for (const e of list.getEntries()) P.long.push({ start: e.startTime, ms: e.duration }); }).observe({ type: 'longtask', buffered: true }); } catch {}
  const kinds = ['buffers', 'textures', 'programs', 'framebuffers', 'renderbuffers'], counts = new Map(), live = [];
  const entry = (gl) => { let e = counts.get(gl); if (!e) { e = { buffers: 0, textures: 0, programs: 0, framebuffers: 0, renderbuffers: 0 }; counts.set(gl, e); live.push(new WeakRef(gl)); } return e; };
  const pairs = [['createBuffer', 'deleteBuffer', 'buffers'], ['createTexture', 'deleteTexture', 'textures'], ['createProgram', 'deleteProgram', 'programs'], ['createFramebuffer', 'deleteFramebuffer', 'framebuffers'], ['createRenderbuffer', 'deleteRenderbuffer', 'renderbuffers']];
  for (const proto of [window.WebGLRenderingContext && WebGLRenderingContext.prototype, window.WebGL2RenderingContext && WebGL2RenderingContext.prototype]) {
    if (!proto) continue;
    for (const [make, drop, key] of pairs) { const m = proto[make], d = proto[drop]; if (!m || !d) continue; proto[make] = function () { const r = m.apply(this, arguments); if (r) entry(this)[key]++; return r; }; proto[drop] = function (o) { if (o) entry(this)[key]--; return d.apply(this, arguments); }; }
    for (const name of ['drawElements', 'drawArrays', 'drawElementsInstanced', 'drawArraysInstanced']) { const f = proto[name]; if (f) proto[name] = function () { const c = this.canvas, who = (c && (String(c.className || '').split(' ')[0] || c.id || (c.parentElement && String(c.parentElement.className).split(' ')[0]))) || 'offscreen'; if (!P.drawn) P.drawn = who; else if (!P.drawn.includes(who)) P.drawn += ',' + who; return f.apply(this, arguments); }; }
  }
  // Every WebGL context made, with where it was asked for: a context that is never let go of shows up here round after round.
  P.made = []; const seen = new WeakSet(), getContext = HTMLCanvasElement.prototype.getContext;
  HTMLCanvasElement.prototype.getContext = function (type) { const gl = getContext.apply(this, arguments); if (gl && String(type).startsWith('webgl') && !seen.has(this)) { seen.add(this); P.made.push({ at: Math.round(performance.now()), canvas: String(this.className || this.id || 'detached ' + this.width + 'x' + this.height), from: String(new Error().stack).split('\\n').slice(2, 7).map((line) => line.trim().split('/assets/').pop()).join(' < ') }); } return gl; };
  P.gl = () => { const total = Object.fromEntries(kinds.map((k) => [k, 0])); let contexts = 0; for (const ref of live) { const gl = ref.deref(); if (!gl || gl.isContextLost()) continue; contexts++; const e = counts.get(gl); for (const k of kinds) total[k] += e[k]; } return { ...total, contexts }; };
  P.begin = () => { P.t0 = performance.now(); };
  P.end = () => {
    const t1 = performance.now(), at = P.frames.map((t, i) => [t, P.drew[i]]).filter(([t]) => t >= P.t0 && t <= t1), gaps = at.slice(1).map(([t], i) => t - at[i][0]).slice(1).sort((a, b) => a - b);
    const long = P.long.filter((e) => e.start + e.ms >= P.t0 && e.start <= t1), r = (v) => Math.round(v * 10) / 10;
    return { seconds: (t1 - P.t0) / 1000, frames: gaps.length, fps: gaps.length ? r(gaps.length / (gaps.reduce((a, b) => a + b, 0) / 1000)) : 0, p95: r(gaps[Math.floor(gaps.length * 0.95)] || 0), worst: r(gaps[gaps.length - 1] || 0),
      over20: gaps.filter((g) => g > 20).length, drew: at.length ? r(at.filter(([, d]) => d).length / at.length * 100) : 0, drewBy: (() => { const by = {}; for (const [, d] of at) if (d) for (const who of d.split(',')) by[who] = (by[who] || 0) + 1; return Object.entries(by).map(([who, n]) => who + ' ' + Math.round(n / at.length * 100) + '%').join(', '); })(), longTasks: long.length, longestTask: r(Math.max(0, ...long.map((e) => e.ms))), blocking: r(long.reduce((sum, e) => sum + Math.max(0, e.ms - 50), 0)) };
  };
})()`;

interface Row { screen: string; what: string; seconds: number; fps: number; p95: number; worst: number; over20: number; frames: number; drew: number; drewBy: string; longTasks: number; longestTask: number; scriptMs: number; layoutMs: number }
interface Made { at: number; canvas: string; from: string }
interface Held { made: Made[]; round: number; heapMB: number; nodes: number; listeners: number; documents: number; canvases: number; gl: Record<string, number> }
const rows: Row[] = [], held: Held[] = [], opens: { app: string; ms: number; longest: number }[] = [], notes: string[] = [];

async function metrics(b: Browser): Promise<Record<string, number>> {
  const { metrics: list } = await b.send('Performance.getMetrics') as { metrics: { name: string; value: number }[] };
  return Object.fromEntries(list.map((item) => [item.name, item.value]));
}
interface Profile { nodes: { id: number; callFrame: { functionName: string; url: string; lineNumber: number; columnNumber: number } }[]; samples: number[]; timeDeltas: number[] }
/** The functions with the most time of their own in a CPU profile, each with the code at that place of the built file. */
function hottest(profile: Profile): string[] {
  const self = new Map<number, number>(), sources = new Map<string, string>();
  profile.samples.forEach((id, i) => self.set(id, (self.get(id) ?? 0) + (profile.timeDeltas[i] ?? 0)));
  const places = new Map<string, { ms: number; frame: Profile['nodes'][number]['callFrame'] }>();
  for (const node of profile.nodes) { const f = node.callFrame, key = `${f.functionName}|${f.url}|${f.lineNumber}|${f.columnNumber}`, entry = places.get(key) ?? { ms: 0, frame: f }; entry.ms += (self.get(node.id) ?? 0) / 1000; places.set(key, entry); }
  const code = (f: Profile['nodes'][number]['callFrame']): string => {
    const name = f.url.split('/').pop() ?? '';
    if (!/\.js$/.test(name)) return '';
    if (!sources.has(name)) { try { sources.set(name, readFileSync(join('dist', 'assets', name), 'utf8')); } catch { sources.set(name, ''); } }
    return (sources.get(name)!.split('\n')[f.lineNumber] ?? '').slice(f.columnNumber, f.columnNumber + 110).replace(/\s+/g, ' ');
  };
  return [...places.values()].filter((entry) => !['(idle)', '(program)'].includes(entry.frame.functionName)).sort((a, c) => c.ms - a.ms).slice(0, 14)
    .map((entry) => `${round(entry.ms)} ms  ${entry.frame.functionName || '(anonymous)'}  ${(entry.frame.url.split('/').pop() ?? '').replace(/-[0-9a-f]{7}\.js$/, '.js')}  ${code(entry.frame)}`);
}
async function measure(b: Browser, screen: string, what: string, body: () => Promise<void>): Promise<Row> {
  const before = await metrics(b);
  await b.eval(`window.__perf.begin()`);
  const profiling = profileWord !== null && `${screen} ${what}`.includes(profileWord);
  if (profiling) { await b.send('Profiler.enable'); await b.send('Profiler.setSamplingInterval', { interval: 250 }); await b.send('Profiler.start'); }
  await body();
  if (profiling) for (const line of hottest((await b.send('Profiler.stop') as { profile: Profile }).profile)) console.log(`      ${line}`);
  const page = await b.eval<Omit<Row, 'screen' | 'what' | 'scriptMs' | 'layoutMs'>>(`window.__perf.end()`), after = await metrics(b);
  const row: Row = { screen, what, ...page, seconds: round(page.seconds, 2), scriptMs: round(((after['ScriptDuration'] ?? 0) - (before['ScriptDuration'] ?? 0)) * 1000 / page.seconds), layoutMs: round(((after['LayoutDuration'] ?? 0) + (after['RecalcStyleDuration'] ?? 0) - (before['LayoutDuration'] ?? 0) - (before['RecalcStyleDuration'] ?? 0)) * 1000 / page.seconds) };
  rows.push(row);
  console.log(`  ${screen} · ${what}: ${row.fps} fps, p95 ${row.p95} ms, worst ${row.worst} ms, drew in ${row.drew}% of frames (${row.drewBy || 'nothing'}), ${row.longTasks} long (${row.longestTask} ms), script ${row.scriptMs} ms/s, style+layout ${row.layoutMs} ms/s`);
  return row;
}
async function paced(ms: number, everyMs: number, fire: (k: number) => Promise<unknown>): Promise<void> {
  const start = performance.now(), sent: Promise<unknown>[] = [];
  for (let i = 0; performance.now() - start < ms; i++) { sent.push(fire((performance.now() - start) / ms).catch(() => undefined)); const wait = start + (i + 1) * everyMs - performance.now(); if (wait > 0) await sleep(wait); }
  await Promise.allSettled(sent);
}
const visible = (selector: string): string => `[...document.querySelectorAll(${JSON.stringify(selector)})].some((e) => { const r = e.getBoundingClientRect(); return r.width > 2 && r.height > 2 && getComputedStyle(e).visibility !== 'hidden'; })`;
const still = (b: Browser, screen: string, seconds = 4): Promise<Row> => measure(b, screen, 'still', () => sleep(seconds * 1000));
async function dragged(b: Browser, screen: string, seconds = 3): Promise<Row> {
  const { width, height } = b.viewport, at = (k: number): { x: number; y: number } => ({ x: width * (0.5 + 0.12 * Math.sin(k * Math.PI * 4)), y: height * (0.45 + 0.06 * (Math.cos(k * Math.PI * 4) - 1)) });
  return measure(b, screen, 'dragged', async () => {
    await b.send('Input.dispatchMouseEvent', { type: 'mousePressed', ...at(0), button: 'left', clickCount: 1 });
    await paced(seconds * 1000, 16, (k) => b.send('Input.dispatchMouseEvent', { type: 'mouseMoved', ...at(k), button: 'left', buttons: 1 }));
    await b.send('Input.dispatchMouseEvent', { type: 'mouseReleased', ...at(1), button: 'left', clickCount: 1 });
    await sleep(300);
  });
}
const zoomed = (b: Browser, screen: string, seconds = 4): Promise<Row> => measure(b, screen, 'zoomed', async () => {
  await paced(seconds * 1000, 16, (k) => b.send('Input.dispatchMouseEvent', { type: 'mouseWheel', x: b.viewport.width / 2, y: b.viewport.height * 0.45, deltaX: 0, deltaY: Math.floor(k * 4) % 2 === 0 ? -20 : 20 }));
  await sleep(300);
});
const act = (b: Browser, type: string, payload?: object): Promise<{ status: number; body: { ok?: boolean; code?: string; state?: { location?: string; activeAction?: { remaining?: number } | null } } }> => pageCall(b, '/api/action', { actionId: actionId(), cityId: 'lagos', type, ...(payload ? { payload } : {}) });
/** Go to a place of the city and wait until the life is there and the page has heard. */
async function goTo(b: Browser, place: string): Promise<boolean> {
  const here = (await pageCall(b, '/api/life?city=lagos')).body?.state?.location;
  if (here === place) return true;
  const sent = await act(b, 'travel', { id: place, mode: 'okada' });
  if (sent.body?.ok === false) { notes.push(`travel to ${place} refused: ${sent.body.code}`); return false; }
  await sleep(((sent.body?.state?.activeAction?.remaining ?? 8) + 1.5) * 1000);
  for (let i = 0; i < 20; i++) { if ((await pageCall(b, '/api/life?city=lagos')).body?.state?.location === place) break; await sleep(700); }
  await sleep(2500);
  return (await pageCall(b, '/api/life?city=lagos')).body?.state?.location === place;
}
/** Close whatever panel is over the scene (the map, the phone), so the place itself is in front. */
async function toScene(b: Browser): Promise<void> {
  for (let i = 0; i < 3; i++) {
    const closed = await b.eval<boolean>(`(() => { const close = [...document.querySelectorAll('.ph-close, [data-ph-close], .map-close, [aria-label="Close"], [aria-label="Back to the map and the list"]')].find((e) => { const r = e.getBoundingClientRect(); return r.width > 2; }); const active = document.querySelector('[data-nav][aria-current], [data-nav].is-active, [data-nav][aria-pressed="true"]'); if (close) { close.click(); return true; } if (active) { active.click(); return true; } return false; })()`);
    await sleep(700);
    if (!closed || (await b.eval<boolean>(visible('.venue-scene, canvas.venue-scene')))) break;
  }
}
async function holding(b: Browser, at: number): Promise<Held> {
  await b.send('HeapProfiler.collectGarbage').catch(() => undefined);
  await sleep(400);
  await b.send('HeapProfiler.collectGarbage').catch(() => undefined);
  const m = await metrics(b);
  const made = await b.eval<Made[]>(`window.__perf.made.splice(0)`);
  const entry: Held = { made, round: at, heapMB: round((m['JSHeapUsedSize'] ?? 0) / 1048576), nodes: m['Nodes'] ?? 0, listeners: m['JSEventListeners'] ?? 0, documents: m['Documents'] ?? 0, canvases: await b.eval<number>(`document.querySelectorAll('canvas').length`), gl: await b.eval<Record<string, number>>(`window.__perf.gl()`) };
  held.push(entry);
  for (const item of made) console.log(`    context made: ${item.canvas} · ${item.from.slice(0, 330)}`);
  console.log(`  held after round ${at}: heap ${entry.heapMB} MB, ${entry.nodes} nodes, ${entry.listeners} listeners, ${entry.canvases} canvases, WebGL ${JSON.stringify(entry.gl)}`);
  return entry;
}

interface Load { firstPaintMs: number; readyMs: number; blockingMs: number; longestTask: number; requests: number; kilobytes: number; scriptKilobytes: number }
async function firstLoad(b: Browser): Promise<Load> {
  await b.setViewport({ width: 390, height: 844, scale: 2, mobile: true });
  await b.throttle(true);
  const startedAt = Date.now();
  await b.send('Page.navigate', { url: `${base}/` });
  await b.waitFor(`!!document.querySelector('[data-qs-name], [data-entry-creator]')`, 120000, 'the entry page');
  const readyMs = Date.now() - startedAt;
  await sleep(4000);
  const page = await b.eval<Omit<Load, 'readyMs'>>(`(() => { const paint = performance.getEntriesByType('paint').find((e) => e.name === 'first-contentful-paint'), res = performance.getEntriesByType('resource'), nav = performance.getEntriesByType('navigation')[0];
    const long = window.__perf.long; return { firstPaintMs: Math.round(paint ? paint.startTime : 0), blockingMs: Math.round(long.reduce((s, e) => s + Math.max(0, e.ms - 50), 0)), longestTask: Math.round(Math.max(0, ...long.map((e) => e.ms))), requests: res.length + 1,
      kilobytes: Math.round((res.reduce((s, e) => s + (e.transferSize || 0), 0) + (nav ? nav.transferSize : 0)) / 1024), scriptKilobytes: Math.round(res.filter((e) => /\\.js(\\?|$)/.test(e.name)).reduce((s, e) => s + (e.transferSize || 0), 0) / 1024) }; })()`);
  await b.throttle(false);
  return { ...page, readyMs };
}

async function settle(b: Browser): Promise<void> {
  await b.setViewport({ width: 1440, height: 900, scale: 1, mobile: false });
  await b.goto(`${base}/`);
  await toCreator(b); await sleep(600);
  await b.type('[data-qs-name]', 'Session Checker');
  await b.click('[data-key="play-now"]');
  await gameShown(b); await dismiss(b, 3000);
  await b.click('.hud-name');
  await b.click('[data-settle-notice] button', 'Settle in now');
  await b.waitFor(`document.querySelector('[data-cr-root]')?.dataset.step === 'spirit'`, 20000, 'the first settling step');
  await b.click('[data-key="primary"]');
  await b.waitFor(`document.querySelector('[data-cr-root]')?.dataset.step === 'home'`, 20000, 'the home step');
  for (let i = 0; i < 4; i++) { await b.click('[data-key="area:ikeja"]', undefined, 30000); if (await b.waitFor(`(() => { const n = document.querySelector('[data-key="primary"], [data-key="next"]'); return !!n && !n.disabled; })()`, 4000, 'Next').catch(() => false)) break; }
  await b.click('[data-key="primary"]');
  await b.waitFor(`document.querySelector('[data-cr-root]')?.dataset.step === 'ready'`, 20000, 'the last settling step');
  await b.click('[data-key="primary"]', 'Start your life');
  await b.waitFor(`(async () => { const m = await fetch('/api/life?city=lagos').then((r) => r.json()); return m.state.onboarding.done && !document.querySelector('[data-cr-root]'); })()`, 60000, 'the settled life');
  await gameShown(b); await dismiss(b, 3000);
  for (let i = 0; i < 3 && (await b.eval<boolean>(`!!document.querySelector('dialog.base-sheet[open]')`)); i++) { await b.eval(`[...document.querySelectorAll('dialog.base-sheet[open] button')].find((x) => x.innerText.trim() === '×' || /close/i.test(x.getAttribute('aria-label') ?? ''))?.click(); true`); await sleep(700); }
}

const APPS = ['messages', 'people', 'contacts', 'richlist', 'neighbours', 'politics', 'statement', 'bank', 'missions'];
async function phoneApps(b: Browser): Promise<void> {
  if (!(await b.eval<boolean>(`!!document.querySelector('.ph-pages')`))) { await b.eval(`document.querySelector('[data-nav="phone"]').click(); true`); await b.waitFor(`!!document.querySelector('.ph-pages')`, 15000, 'the phone'); await sleep(1200); }
  for (const app of APPS) {
    if (!(await b.eval<boolean>(`!!document.querySelector('[data-ph-app="${app}"]')`))) continue;
    const longBefore = await b.eval<number>(`window.__perf.long.length`), t0 = Date.now();
    await b.eval(`document.querySelector('[data-ph-app="${app}"]').click(); true`);
    const up = await b.waitFor(`(() => { const back = document.querySelector('.ph-back'); return !!back && back.getBoundingClientRect().width > 2 && !document.querySelector('.ph-app .is-loading, .ph-app [aria-busy="true"]'); })()`, 15000, `${app} to open`).then(() => true, () => false);
    const ms = Date.now() - t0;
    await sleep(900);
    const longest = await b.eval<number>(`Math.round(Math.max(0, ...window.__perf.long.slice(${longBefore}).map((e) => e.ms)))`);
    if (up) opens.push({ app, ms, longest }); else notes.push(`${app} did not open within 15 s`);
    await b.eval(`document.querySelector('.ph-back')?.click(); true`);
    await b.waitFor(`(() => { const back = document.querySelector('.ph-back'); return !back || back.getBoundingClientRect().width < 2; })()`, 8000, `${app} to close`).catch(() => undefined);
    await sleep(500);
    if (!(await b.eval<boolean>(`!!document.querySelector('.ph-pages')`))) { await b.eval(`document.querySelector('[data-nav="phone"]').click(); true`); await sleep(1200); }
  }
}
/** Open a phone app that shows a scene of its own (the street, the shop), measure it, and close it. */
async function sceneApp(b: Browser, app: string, screen: string): Promise<void> {
  if (!(await b.eval<boolean>(`!!document.querySelector('.ph-pages')`))) { await b.eval(`document.querySelector('[data-nav="phone"]').click(); true`); await b.waitFor(`!!document.querySelector('.ph-pages')`, 15000, 'the phone').catch(() => undefined); await sleep(1200); }
  if (!(await b.eval<boolean>(`!!document.querySelector('[data-ph-app="${app}"]')`))) { notes.push(`${screen}: no ${app} app on the phone`); return; }
  const canvasesBefore = await b.eval<number>(`document.querySelectorAll('canvas').length`);
  await b.eval(`document.querySelector('[data-ph-app="${app}"]').click(); true`);
  await sleep(5000);
  const canvases = await b.eval<string>(`[...document.querySelectorAll('canvas')].filter((c) => c.getBoundingClientRect().width > 2).map((c) => (String(c.className) || c.parentElement.className) + ' ' + c.width + 'x' + c.height).join(', ')`);
  if ((await b.eval<number>(`document.querySelectorAll('canvas').length`)) <= canvasesBefore) notes.push(`${screen}: opening ${app} added no canvas (visible: ${canvases})`);
  await still(b, screen, 3);
  await dragged(b, screen, 3);
  await b.eval(`(document.querySelector('[data-si-close]') || document.querySelector('.ph-back'))?.click(); true`);
  await sleep(1200);
}

let code = 0;
try {
  if (!readdirSync('dist').includes('index.html')) throw new Error('Build first: npm run build');
  await startServer();
  const b = browser = await Browser.launch(debugPort, has('software') ? [] : ['--use-angle=metal', '--enable-gpu', '--ignore-gpu-blocklist', '--enable-gpu-rasterization']);
  await b.send('Performance.enable');
  await b.send('Page.addScriptToEvaluateOnNewDocument', { source: PROBE });
  console.log('== first load, phone profile (CPU slowed four times, 1.6 Mbit/s)');
  const load = await firstLoad(b);
  console.log(`  first paint ${load.firstPaintMs} ms, entry page ready ${load.readyMs} ms, blocking ${load.blockingMs} ms (longest task ${load.longestTask} ms), ${load.requests} requests, ${load.kilobytes} kB (${load.scriptKilobytes} kB script)`);
  console.log('== settling a guest in');
  await settle(b);
  const renderer = await b.eval<string>(`(() => { const c = document.createElement('canvas'), gl = c.getContext('webgl2') || c.getContext('webgl'), e = gl && gl.getExtension('WEBGL_debug_renderer_info'); const r = gl ? String(gl.getParameter(e ? e.UNMASKED_RENDERER_WEBGL : gl.RENDERER)) : 'none'; gl && gl.getExtension('WEBGL_lose_context')?.loseContext(); return r; })()`);
  console.log(`  ${renderer}`);
  await holding(b, 0);
  for (let at = 1; at <= cycles && Date.now() - started < minutes * 60000; at++) {
    console.log(`== round ${at}`);
    const step = async (name: string, body: () => Promise<void>): Promise<void> => { try { await body(); } catch (error) { notes.push(`round ${at}, ${name}: ${error instanceof Error ? error.message.slice(0, 160) : String(error)}`); console.log(`  ${name}: NOT MEASURED (${notes.at(-1)})`); } };
    await step('venue', async () => { if (!(await goTo(b, 'park'))) throw new Error('the park was not reached'); await toScene(b); await sleep(1500); await still(b, 'venue (the park, with its crowd)'); await dragged(b, 'venue (the park, with its crowd)'); });
    await step('city map', async () => {
      await b.eval(`document.querySelector('[data-nav="map"]').click(); true`);
      await b.waitFor(`(() => { const c = document.querySelector('[data-map]'); return !!c && document.querySelectorAll('.m3-label').length > 0; })()`, 60000, 'the city map');
      await sleep(2500);
      await still(b, 'city map (Lagos)'); await zoomed(b, 'city map (Lagos)'); await dragged(b, 'city map (Lagos)');
    });
    await step('phone', async () => { await phoneApps(b); });
    await step('shop', async () => { await sceneApp(b, 'boutique', 'shop (the boutique)'); });
    await step('home', async () => { if (!(await goTo(b, 'home'))) throw new Error('home was not reached'); await toScene(b); await sleep(2500); await still(b, 'home'); await dragged(b, 'home'); });
    await step('street', async () => { const out = await act(b, 'home.door', { direction: 'outside' }); await sleep(2500); await b.eval(`fetch('/api/life?city=lagos')`); if ((await pageCall(b, '/api/life?city=lagos')).body?.state?.location !== 'neighbourhood') throw new Error(`the street was not reached (${out.body?.code ?? out.status})`); await toScene(b); await sleep(3500); await still(b, 'street (outside the house)'); await dragged(b, 'street (outside the house)'); });
    await holding(b, at);
    if (at === 1) await b.screenshot(join(out, `${label}-round1.png`)).catch(() => undefined);
  }
  const chunks = await b.eval<{ name: string; kB: number; ms: number }[]>(`performance.getEntriesByType('resource').filter((e) => /\\.js(\\?|$)/.test(e.name)).map((e) => ({ name: e.name.split('/').pop().replace(/-[0-9a-f]{7}\\.js$/, '.js'), kB: Math.round((e.decodedBodySize || 0) / 1024), ms: Math.round(e.duration) })).sort((a, c) => c.kB - a.kB).slice(0, 14)`);
  const report = { label, when: new Date().toISOString(), renderer, load, rows, opens, held, chunks, notes, consoleErrors: b.consoleErrors.slice(0, 12) };
  writeFileSync(join(out, `${label}.json`), JSON.stringify(report, null, 2));
  const lines = [`### ${label}: first load on the phone profile`, '', `First paint ${load.firstPaintMs} ms · entry page ready ${load.readyMs} ms · blocking time ${load.blockingMs} ms (longest task ${load.longestTask} ms) · ${load.requests} requests, ${load.kilobytes} kB (${load.scriptKilobytes} kB script)`, '',
    `### ${label}: screens (${renderer.replace(/ANGLE \(|\)$/g, '')}, 1440 by 900)`, '', '| screen | what | fps | p95 ms | worst ms | frames >20 ms | canvases that drew (share of frames) | tasks >50 ms (longest) | script ms/s | style+layout ms/s |', '| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |',
    ...rows.map((row) => `| ${row.screen} | ${row.what} | ${row.fps} | ${row.p95} | ${row.worst} | ${row.over20} of ${row.frames} | ${row.drewBy || 'none'} | ${row.longTasks} (${row.longestTask}) | ${row.scriptMs} | ${row.layoutMs} |`), '',
    '### phone apps: tap to open', '', '| app | ms to open | longest task ms |', '| --- | --- | --- |', ...opens.map((item) => `| ${item.app} | ${item.ms} | ${item.longest} |`), '',
    '### held after each round (garbage collected)', '', '| round | heap MB | DOM nodes | listeners | canvases | WebGL contexts | buffers | textures | programs |', '| --- | --- | --- | --- | --- | --- | --- | --- | --- |',
    ...held.map((item) => `| ${item.round} | ${item.heapMB} | ${item.nodes} | ${item.listeners} | ${item.canvases} | ${item.gl['contexts']} | ${item.gl['buffers']} | ${item.gl['textures']} | ${item.gl['programs']} |`), '',
    '### largest script chunks fetched', '', '| chunk | kB | ms |', '| --- | --- | --- |', ...chunks.map((item) => `| ${item.name} | ${item.kB} | ${item.ms} |`), '', ...(notes.length ? ['### not measured', '', ...notes.map((note) => `- ${note}`), ''] : [])];
  writeFileSync(join(out, `${label}.md`), lines.join('\n'));
  console.log(`\n${lines.join('\n')}`);
} catch (error) {
  code = 1;
  console.error(error instanceof Error ? error.stack : error);
  console.error(serverLog.join('').slice(-600));
} finally {
  clearTimeout(guard);
  cleanUp();
}
process.exit(code);
