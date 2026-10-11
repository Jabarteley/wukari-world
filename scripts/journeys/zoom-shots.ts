#!/usr/bin/env node
/**
 * Proof of the zoom ladder in a real browser: one settled player at home in Lagos zooms in to the district and the neighbourhood, out through
 * the city, Nigeria, Africa and the world, back down to another Nigerian city and a foreign city (as overviews), and home with "Find me".
 *
 *   node --experimental-strip-types scripts/journeys/zoom-shots.ts --out <folder> [--port 4431] [--debug-port 4432] [--sizes desktop,phone,small]
 *
 * It builds nothing (run `npm run build` first). It starts the built app (scripts/journeys/serve.ts, fresh data folder, no outside request) and ONE
 * headless Chrome, settles one guest through Sim > Profile, then for each size: screenshots at every level, the frames of every hand-over
 * (the browser's own screencast), the hint chips, the loading state under a slow network, frame pacing during each hand-over (page rAF gaps),
 * the JS heap and the live WebGL resources before and after repeated round trips. It writes numbers.json and an index.html gallery.
 * Everything is software-rendered headless: comparable between rows, not with a real phone.
 */
import { spawn } from 'node:child_process';
import type { ChildProcess } from 'node:child_process';
import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { Browser, sleep } from './cdp.ts';

const arg = (name: string, fallback?: string): string => {
  const at = process.argv.indexOf(`--${name}`);
  const value = at >= 0 ? process.argv[at + 1] : fallback;
  if (value === undefined) throw new Error(`Missing --${name}`);
  return value;
};
const out = resolve(arg('out'));
const port = Number(arg('port', '4431')), debugPort = Number(arg('debug-port', '4432'));
const sizes = arg('sizes', 'desktop,phone,small').split(',').filter(Boolean);
const base = `http://127.0.0.1:${port}`;
mkdirSync(out, { recursive: true });
const work = mkdtempSync(join(tmpdir(), 'zoomshots-'));
const dataDir = join(work, 'data'), cookieFile = join(work, 'founder.cookie');
const SIZE = { desktop: { width: 1280, height: 800, scale: 1, mobile: false }, phone: { width: 390, height: 844, scale: 2, mobile: true }, small: { width: 320, height: 568, scale: 2, mobile: true } } as const;

let server: ChildProcess | null = null;
const serverLog: string[] = [];
async function startServer(): Promise<void> {
  const child = spawn(process.execPath, ['--experimental-strip-types', '--no-warnings', 'scripts/journeys/serve.ts', '--port', String(port), '--data', dataDir, '--cookie-file', cookieFile], { stdio: ['ignore', 'pipe', 'pipe'] });
  server = child;
  console.log(`server pid ${child.pid}`);
  child.stdout!.on('data', (c) => serverLog.push(String(c)));
  child.stderr!.on('data', (c) => serverLog.push(String(c)));
  const end = Date.now() + 60000;
  while (Date.now() < end) {
    if (serverLog.join('').includes('journey server ready') && child.exitCode === null) return;
    if (child.exitCode !== null) throw new Error(`server stopped: ${serverLog.join('').slice(-400)}`);
    await sleep(200);
  }
  throw new Error('server not ready');
}
async function stopServer(): Promise<void> {
  const child = server;
  if (!child || child.exitCode !== null) return;
  await new Promise<void>((done) => { child.once('exit', () => done()); child.kill('SIGTERM'); setTimeout(() => { if (child.exitCode === null) child.kill('SIGKILL'); }, 20000).unref(); });
}

// ---- helpers -------------------------------------------------------------------------------------------------------------
const must = (c: unknown, m: string): void => { if (!c) throw new Error(m); };
const shownNow = (s: string): string => `[...document.querySelectorAll(${JSON.stringify(s)})].some((e) => { const r = e.getBoundingClientRect(); return r.width > 1 && r.height > 1 && getComputedStyle(e).visibility !== 'hidden'; })`;
async function dismiss(b: Browser, waitMs = 4000): Promise<void> {
  const end = Date.now() + waitMs;
  for (;;) {
    const p = await b.locate('button.tour-skip, button.is-quiet').catch(() => null);
    if (p) { await b.tapAt(p.x, p.y); await sleep(400); continue; }
    if (Date.now() > end) return;
    await sleep(250);
  }
}
const gameShown = (b: Browser): Promise<void> => b.waitFor(`!!document.querySelector('.hud-cash') && !document.querySelector('[data-cr-root]')`, 60000, 'the game screen');
async function chooseIkeja(b: Browser): Promise<void> {
  for (let t = 0; t < 4; t++) {
    await b.click('[data-key="area:ikeja"]', undefined, 30000);
    if (await b.waitFor(`(() => { const n = document.querySelector('[data-key="primary"], [data-key="next"]'); return !!n && !n.disabled; })()`, 4000, 'Next').catch(() => false)) return;
  }
  throw new Error('Ikeja did not unlock Next');
}
/** Play now, then settle through Sim > Profile into Ikeja, Lagos. */
async function settle(b: Browser): Promise<void> {
  await b.goto(base + '/');
  await b.waitFor(`!!document.querySelector('[data-qs-name]')`, 60000, 'the start screen');
  await sleep(600);
  await b.type('[data-qs-name]', 'Zoom Checker');
  await b.click('[data-key="play-now"]');
  await gameShown(b); await dismiss(b);
  await b.click('.hud-name');
  await b.click('.sim-link', 'Make this life yours');
  await b.waitFor(`document.querySelector('[data-cr-root]')?.dataset.step === 'spirit'`, 20000, 'spirit');
  await b.click('[data-key="primary"]');
  await b.waitFor(`document.querySelector('[data-cr-root]')?.dataset.step === 'home'`, 20000, 'home');
  await chooseIkeja(b);
  await b.click('[data-key="primary"]');
  await b.waitFor(`document.querySelector('[data-cr-root]')?.dataset.step === 'ready'`, 20000, 'ready');
  await b.click('[data-key="primary"]', 'Start your life');
  await b.waitFor(`(async () => { const m = await fetch('/api/life?city=lagos').then((r) => r.json()); return m.state.onboarding.done && !document.querySelector('[data-cr-root]'); })()`, 60000, 'settled');
  await gameShown(b); await dismiss(b);
}
const lifeCity = (b: Browser): Promise<string> => b.eval<string>(`fetch('/api/life?city=lagos').then((r) => r.json()).then((m) => m.state?.estate?.city ?? m.state?.location ?? '')`);

// ---- probes in the page --------------------------------------------------------------------------------------------------
const probe = {
  layer: `(() => { const w = document.querySelector('#map-scene'), c = document.querySelector('#city-scene'); const wv = !!w && (!w.hidden), cv = !!c && (!c.hidden); return wv ? 'world' : cv ? 'city' : 'none'; })()`,
  phase: `document.querySelector('#city-scene')?.parentElement?.dataset.ladder ?? ''`,
  chip: `(() => { const c = document.querySelector('.zl-chip'); return c && !c.hidden ? c.querySelector('.zl-text').textContent : ''; })()`,
  level: `(() => { const a = document.querySelector('#map-scene [data-atlas-levels]'); return a ? a.textContent.trim().replace(/\\s+/g, ' ') : ''; })()`,
  map: `document.querySelector('[data-map]')?.dataset.map ?? ''`,
  said: `document.querySelector('.zl-chip')?.parentElement?.querySelector('[role=status].ui-sr')?.textContent ?? ''`,
};
const read = async <T = string>(b: Browser, key: keyof typeof probe): Promise<T> => b.eval<T>(probe[key]);

/** Counts what the page's WebGL contexts hold (buffers, textures, programs): created minus deleted. Installed before the page's own scripts. */
const GL_COUNTER = `(() => {
  if (window.__gl) return;
  const kinds = ['buffers', 'textures', 'programs', 'framebuffers', 'renderbuffers'], counts = new Map(), live = [];
  window.__gl = true;
  const entry = (gl) => { let e = counts.get(gl); if (!e) { e = { buffers: 0, textures: 0, programs: 0, framebuffers: 0, renderbuffers: 0 }; counts.set(gl, e); live.push(new WeakRef(gl)); } return e; };
  const pairs = [['createBuffer', 'deleteBuffer', 'buffers'], ['createTexture', 'deleteTexture', 'textures'], ['createProgram', 'deleteProgram', 'programs'], ['createFramebuffer', 'deleteFramebuffer', 'framebuffers'], ['createRenderbuffer', 'deleteRenderbuffer', 'renderbuffers']];
  for (const proto of [WebGLRenderingContext.prototype, WebGL2RenderingContext.prototype]) for (const [make, drop, key] of pairs) {
    const m = proto[make], d = proto[drop]; if (!m || !d) continue;
    proto[make] = function () { const r = m.apply(this, arguments); if (r) entry(this)[key]++; return r; };
    proto[drop] = function (o) { if (o) entry(this)[key]--; return d.apply(this, arguments); };
  }
  /** What the contexts that are still alive hold (a lost context has let go of everything it made). */
  window.__glLive = () => { const total = Object.fromEntries(kinds.map((k) => [k, 0])); let contexts = 0; for (const ref of live) { const gl = ref.deref(); if (!gl || gl.isContextLost()) continue; contexts++; const e = counts.get(gl); for (const k of kinds) total[k] += e[k]; } return { ...total, contexts }; };
  window.__phases = []; new MutationObserver((list) => { for (const m of list) window.__phases.push({ phase: m.target.dataset.ladder, t: performance.now() + performance.timeOrigin }); }).observe(document, { attributes: true, attributeFilter: ['data-ladder'], subtree: true });
  window.__chips = []; setInterval(() => { const c = document.querySelector('.zl-chip'); const text = c && !c.hidden ? c.textContent.trim() : ''; if (text) window.__chips.push({ text, t: performance.now() + performance.timeOrigin }); }, 40);
  window.__frames = []; (function tick(t) { window.__frames.push(t); if (window.__frames.length > 20000) window.__frames.splice(0, 10000); requestAnimationFrame(tick); })(performance.now());
})()`;

// ---- input -----------------------------------------------------------------------------------------------------------------
let phone = false;
async function wheel(b: Browser, x: number, y: number, deltaY: number): Promise<void> {
  await b.send('Input.dispatchMouseEvent', { type: 'mouseWheel', x, y, deltaX: 0, deltaY });
}
/** A pinch: two fingers about (x, y), their span going from `a` to `b` pixels over `steps` moves. */
async function pinch(b: Browser, x: number, y: number, a: number, z: number, steps = 8, gap = 16): Promise<void> {
  const pts = (span: number) => [{ x: x - span / 2, y, id: 1 }, { x: x + span / 2, y, id: 2 }];
  await b.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: pts(a) });
  for (let i = 1; i <= steps; i++) { await b.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: pts(a + ((z - a) * i) / steps) }); await sleep(gap); }
  await b.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
}
/** One unit of "zoom in" or "zoom out" at a point: a wheel notch on a desktop, a short pinch on a phone. */
async function notch(b: Browser, dir: 'in' | 'out', x: number, y: number, scale = 1): Promise<void> {
  if (phone) await b.send('Emulation.setPageScaleFactor', { pageScaleFactor: 1 }).catch(() => undefined);
  if (!phone) { await wheel(b, x, y, (dir === 'in' ? -100 : 100) * scale); await sleep(40); return; }
  const span = 120;
  await pinch(b, x, y, dir === 'in' ? span : span * 1.6, dir === 'in' ? span * 1.6 : span, 6, 14);
}
const centre = (b: Browser): { x: number; y: number } => ({ x: b.viewport.width / 2, y: b.viewport.height * (phone ? 0.38 : 0.5) });

// ---- evidence ---------------------------------------------------------------------------------------------------------------
interface Shot { file: string; title: string; note: string; group: string }
const shots: Shot[] = [];
const numbers: Record<string, any> = { startedAt: new Date().toISOString(), sizes: {}, notes: [] as string[] };
let prefix = '';
async function shot(b: Browser, name: string, title: string, note = ''): Promise<void> {
  await sleep(500);
  await b.send('Emulation.setPageScaleFactor', { pageScaleFactor: 1 }).catch(() => undefined);
  const file = `${prefix}-${name}.png`;
  await b.screenshot(join(out, file));
  shots.push({ file, title, note, group: prefix });
  console.log(`shot ${file}`);
}
/** Frames of a hand-over from the browser's own screencast, as many as it yields; picks `count` spread over the transition. */
interface Cast { frames: { t: number; data: string }[]; stop(): Promise<void> }
async function castStart(b: Browser): Promise<Cast> {
  const frames: { t: number; data: string }[] = [];
  const onMessage = (event: MessageEvent): void => {
    const message = JSON.parse(String(event.data));
    if (message.method === 'Page.screencastFrame') {
      frames.push({ t: Date.now(), data: message.params.data });
      void b.send('Page.screencastFrameAck', { sessionId: message.params.sessionId }).catch(() => undefined);
    }
  };
  b.ws.addEventListener('message', onMessage);
  await b.send('Page.startScreencast', { format: 'jpeg', quality: 55, everyNthFrame: 1 });
  return { frames, async stop() { await b.send('Page.stopScreencast').catch(() => undefined); b.ws.removeEventListener('message', onMessage); } };
}
async function saveFrames(cast: Cast, name: string, title: string, from: number, count = 6, to = Infinity): Promise<number> {
  const inside = cast.frames.filter((f) => f.t >= from && f.t <= to);
  const pick = inside.length <= count ? inside : Array.from({ length: count }, (_, i) => inside[Math.round((i * (inside.length - 1)) / (count - 1))]!);
  pick.forEach((frame, i) => {
    const file = `${prefix}-${name}-f${i + 1}.jpg`;
    writeFileSync(join(out, file), Buffer.from(frame.data, 'base64'));
    shots.push({ file, title: `${title} (frame ${i + 1} of ${pick.length}, +${frame.t - inside[0]!.t} ms)`, note: '', group: `${prefix}-frames` });
  });
  return inside.length;
}
/** Worst and median gap between animation frames in a window, from the page's own rAF log. */
async function pacing(b: Browser, from: number, to: number): Promise<{ frames: number; worstMs: number; medianMs: number }> {
  const stamps = await b.eval<number[]>(`window.__frames.map((t) => t + performance.timeOrigin)`);
  const win = stamps.filter((t) => t >= from && t <= to);
  const gaps = win.slice(1).map((t, i) => t - win[i]!).sort((a, c) => a - c);
  return { frames: win.length, worstMs: Math.round((gaps.at(-1) ?? 0) * 10) / 10, medianMs: Math.round((gaps[Math.floor(gaps.length / 2)] ?? 0) * 10) / 10 };
}
async function heap(b: Browser): Promise<{ jsHeapMB: number; gl: Record<string, number>; canvases: number }> {
  await b.send('HeapProfiler.collectGarbage').catch(() => undefined);
  const usage = await b.send('Runtime.getHeapUsage');
  return { jsHeapMB: Math.round((usage.usedSize / 1048576) * 10) / 10, gl: await b.eval(`window.__glLive()`), canvases: await b.eval(`document.querySelectorAll('canvas').length`) };
}

/** Zoom out at the centre until `done()` is true; returns how many units it took. `hold` stops one unit before a hand-over would fire (for the hint chip). */
async function zoomUntil(b: Browser, dir: 'in' | 'out', done: () => Promise<boolean>, max = 60, at = centre(b), scale = 1): Promise<number> {
  for (let i = 0; i < max; i++) { if (await done()) return i; await notch(b, dir, at.x, at.y, scale); await sleep(30); }
  return max;
}
/** Zoom in on a labelled place, aiming again every few notches (the map moves under the pointer), until `done()`. */
async function zoomOnto(b: Browser, names: string[], done: () => Promise<boolean>, rounds = 60): Promise<void> {
  for (let round = 0; round < rounds; round++) {
    if (await done()) return;
    const target = await labelAt(b, ...names);
    if (!target) { await sleep(250); continue; }
    for (let i = 0; i < 3; i++) await notch(b, 'in', target.x, target.y, 1.4);
  }
}
/** From the atlas into the player's city: by zooming onto its label, or (a screen too small to label it) with the "Back to the city" chip. Says which. */
async function intoCity(b: Browser): Promise<string> {
  const inCity = async (): Promise<boolean> => (await read(b, 'phase')) !== 'idle' || (await read(b, 'layer')) === 'city';
  if (await labelAt(b, 'Lagos')) { await zoomOnto(b, ['Lagos'], inCity); return 'zoom'; }
  await b.click('[data-atlas-city]').catch(() => undefined);
  return 'chip';
}
/** One hand-over, measured: starts the screencast and the clock, runs `act`, waits for the host to be idle again, then reports frames and pacing. */
async function handover(b: Browser, name: string, title: string, act: () => Promise<void>, withCast = true): Promise<Record<string, unknown>> {
  const cast = withCast ? await castStart(b) : null, from = Date.now();
  await act();
  await b.waitFor(`document.querySelector('#city-scene')?.parentElement?.dataset.ladder === 'idle'`, 20000, 'the hand-over to end').catch(() => undefined);
  await sleep(300);
  const to = Date.now();
  await cast?.stop();
  const count = cast ? await saveFrames(cast, name, title, from) : 0;
  const timing = await pacing(b, from, to);
  // The cross-fade itself: from the moment the host says 'fading' to the moment it is idle again.
  const phases = await b.eval<{ phase: string; t: number }[]>(`window.__phases`);
  const fadeStart = phases.find((p) => p.t >= from && p.phase === 'fading'), idleAfter = fadeStart && phases.find((p) => p.t > fadeStart.t && p.phase === 'idle'), loadStart = phases.find((p) => p.t >= from && p.phase === 'loading');
  const fade = fadeStart && idleAfter ? { ...(await pacing(b, fadeStart.t, idleAfter.t)), ms: Math.round(idleAfter.t - fadeStart.t), waitBeforeFadeMs: loadStart ? Math.round(fadeStart.t - loadStart.t) : null } : null;
  const row = { ...timing, screencastFrames: count, ms: to - from, fade };
  console.log(`${name}: ${JSON.stringify(row)}`);
  return row;
}

// ---- the journey ---------------------------------------------------------------------------------------------------------------
async function openMap(b: Browser): Promise<void> {
  await b.goto(base + '/');
  await gameShown(b); await dismiss(b);
  // A reload may bring the Map back open (the page keeps what was showing): only press the tab when it is not.
  if (!(await b.eval<boolean>(shownNow('.map-levels-cur')))) await b.click('[data-nav="map"]');
  if (!(await b.waitFor<boolean>(shownNow('.map-handle') + ' || ' + shownNow('.map-levels-cur'), 8000, 'the map panel').catch(() => false))) {
    numbers.notes.push(`${prefix}: the touch tap on the Map tab did not open the map; opened with a scripted click`);
    await b.eval(`document.querySelector('[data-nav="map"]').click(); true`);
  }
  // A reload may bring the atlas back in front: go back to the city first.
  if (await b.eval<boolean>(shownNow('[data-atlas-levels]'))) { await b.click('.atlas-back, [data-atlas-city]').catch(() => undefined); await sleep(1500); }
  await b.waitFor(shownNow('.map-levels-cur') + ' && !document.querySelector("#city-scene").hidden', 30000, 'the city map on screen');
  await b.waitFor(`(() => { const c = document.querySelector('[data-map]'); return !!c && (c.dataset.map === '3d' || c.dataset.map === '2d') && document.querySelectorAll('.m3-label').length > 0; })()`, 120000, 'the city map to render');
  await sleep(2500);
}
async function labelAt(b: Browser, ...names: string[]): Promise<{ x: number; y: number; text?: string } | null> {
  return b.eval(`(() => { const names = ${JSON.stringify(names.map((n) => n.toLowerCase()))}; for (const name of names) { const el = [...document.querySelectorAll('#map-scene .atlas-label, #map-scene .atlas-marker')].find((e) => { const r = e.getBoundingClientRect(); return r.width > 1 && r.left >= 0 && r.right <= innerWidth && r.top > 100 && r.bottom < innerHeight - 60 && e.textContent.trim().toLowerCase().includes(name); }); if (el) { const r = el.getBoundingClientRect(); return { x: r.left + r.width / 2, y: r.top + r.height / 2, text: el.textContent.trim().slice(0, 30) }; } } return null; })()`);
}
/** Where the player's own marker is on the city map (the "You are here" label), or the middle of the free area. */
async function youAt(b: Browser): Promise<{ x: number; y: number }> {
  const at = await b.eval<{ x: number; y: number } | null>(`(() => { const el = [...document.querySelectorAll('#city-scene .m3-label')].find((e) => /you are here/i.test(e.textContent)); if (!el) return null; const r = el.getBoundingClientRect(); return { x: r.left + r.width / 2, y: r.bottom + 24 }; })()`);
  return at ?? centre(b);
}

async function journey(b: Browser, size: keyof typeof SIZE, throttled: boolean): Promise<void> {
  prefix = `${size}${throttled ? '-slow' : ''}`;
  phone = SIZE[size].mobile;
  const row: Record<string, any> = { viewport: SIZE[size], throttled, handovers: {}, errors: [] as string[] };
  numbers.sizes[prefix] = row;
  await b.setViewport(SIZE[size]);
  await b.throttle(false);
  await openMap(b);
  if (throttled) await b.throttle(true);
  const city0 = await lifeCity(b);
  row.cityBefore = city0;
  await shot(b, '01-city-home', 'Lagos, the opening view (at home)', 'The player is settled at home in Ikeja.');

  // 1. In: city -> district -> neighbourhood (zooming at the player's own marker), then the closest view and its hint.
  await b.click('[data-m3="me"]').catch(() => undefined);
  await sleep(1200);
  const here = await youAt(b);
  const said = (): Promise<string> => read(b, 'said');
  await zoomUntil(b, 'in', async () => /district/i.test(await said()), 40, here, 0.6);
  await sleep(1500); await shot(b, '02-district', 'Zoomed in: the district', await said());
  row.saidDistrict = await said();
  await zoomUntil(b, 'in', async () => /neighbourhood/i.test(await said()), 60, here, 0.6);
  await sleep(2500); await shot(b, '03-neighbourhood', 'Zoomed in further: the neighbourhood, with the houses', await said());
  row.saidNeighbourhood = await said();
  for (let i = 0; i < (phone ? 12 : 22); i++) await notch(b, 'in', here.x, here.y, 1);
  await sleep(300); await shot(b, '04-closest-hint', 'At the closest view, pushing on: the hint, and no hand-over', `chip: ${await read(b, 'chip')}`);
  row.closestChip = await read(b, 'chip');
  row.layerAtClosest = await read(b, 'layer');
  const mid = centre(b);

  // 2. Out: back through the city to its widest view; the hint near the limit; then the hand-over to Nigeria.
  await zoomUntil(b, 'out', async () => (await read(b, 'chip')).startsWith('Keep zooming'), 40, mid);
  await sleep(250); await shot(b, '05-near-limit-hint', 'Near the widest view of Lagos: the hint chip before anything changes', `chip: ${await read(b, 'chip')}`);
  await b.click('[data-m3="fit"]').catch(() => undefined);
  await sleep(900); await shot(b, '06-whole-city', 'Whole city (the button), for comparison');
  row.handovers.cityToNigeria = await handover(b, '07-city-to-nigeria', 'City to Nigeria', async () => { await zoomUntil(b, 'out', async () => (await read(b, 'phase')) !== 'idle' || (await read(b, 'layer')) === 'world', 40, mid, 1.4); });
  await sleep(1200); await shot(b, '08-nigeria', 'Nigeria (the states and the cities)', `level: ${await read(b, 'level')}`);
  row.levelAtNigeria = await read(b, 'level');
  row.layerAfterOut = await read(b, 'layer');

  // 3. Further out: Africa, the world; the hint at the end of the ladder.
  const world = centre(b);
  const level = (): Promise<string> => read(b, 'level');
  await zoomUntil(b, 'out', async () => /^africa/i.test(await level()), 30, world, 1.4);
  await sleep(1500); await shot(b, '09-africa', 'Africa', `level: ${await level()}`);
  await zoomUntil(b, 'out', async () => /^world/i.test(await level()), 30, world, 1.4);
  await sleep(1500); await shot(b, '10-world', 'The world', `level: ${await level()}`);
  for (let i = 0; i < 25; i++) await notch(b, 'out', world.x, world.y, 1.4);
  await sleep(300); await shot(b, '11-world-end-hint', 'The end of the ladder: the hint says so, nothing else happens', `chip: ${await read(b, 'chip')}`);
  row.worldEndChip = await read(b, 'chip');

  // 4. Back in: Africa, then Ghana (a foreign city) as an overview.
  await zoomUntil(b, 'in', async () => /^africa/i.test(await level()), 30, world, 1.4);
  await sleep(1200);
  /** Zoom in on a place the way a person does: aim at it, zoom a little, aim again (the map moves under the pointer), until its overview opens. */
  const aimAt = async (names: string[], tag: string): Promise<void> => {
    let overview = 0;
    for (let round = 0; round < 40 && overview < 3; round++) {
      const target = await labelAt(b, ...names);
      if (!target) { await sleep(300); if (round === 39) row.errors.push(`no label to aim at for ${tag} at this size`); continue; }
      if (round === 0) numbers.notes.push(`${prefix}: ${tag} target label: ${target.text}`);
      for (let i = 0; i < 3; i++) await notch(b, 'in', target.x, target.y, 1.4);
      if ((await read(b, 'chip')).includes('overview') || /from afar/.test(await read(b, 'said'))) overview += 1;
    }
    for (let i = 0; i < 4; i++) { const target = await labelAt(b, ...names); if (target) await notch(b, 'in', target.x, target.y, 1.4); }
  };
  await aimAt(['Accra', 'Ghana'], 'Accra');
  await sleep(600); row.accra = { chip: await read(b, 'chip'), sheet: await b.eval(`document.querySelector('#map-scene .atlas-sheet')?.textContent?.trim().slice(0, 80) ?? ''`), said: await read(b, 'said') };
  await sleep(900); await shot(b, '12-accra-overview', 'Zoomed in on Accra: an overview, the player is still in Lagos', `chip: ${row.accra.chip}`);
  await b.click('.atlas-close').catch(() => undefined); await sleep(500);
  row.cityAfterAccra = await lifeCity(b);

  // 5. Nigeria, then Ibadan (another Nigerian city) as an overview.
  await zoomUntil(b, 'out', async () => (await read(b, 'level')).length > 0 && /^africa/i.test(await level()), 30, world, 1.4);
  await b.click('[data-atlas-levels]').catch(() => undefined);
  await sleep(500); await shot(b, '13-level-dropdown', 'The level dropdown, open: it always shows where the zoom has taken you', `level: ${await level()}`);
  await b.click('[data-atlas-level="2"]').catch(() => undefined);
  await sleep(1800);
  await aimAt(['Ibadan', 'Oyo'], 'Ibadan');
  await sleep(600); row.ibadan = { chip: await read(b, 'chip'), sheet: await b.eval(`document.querySelector('#map-scene .atlas-sheet')?.textContent?.trim().slice(0, 80) ?? ''`), said: await read(b, 'said') };
  await sleep(900); await shot(b, '14-ibadan-overview', 'Zoomed in on Ibadan: its card as an overview, the player is still in Lagos', `chip: ${row.ibadan.chip}`);
  await b.click('.atlas-close').catch(() => undefined); await sleep(500);
  row.cityAfterIbadan = await lifeCity(b);

  // 6. Home: zoom in on Lagos from the atlas; the hand-over into the city map; then "Find me".
  await b.click('[data-atlas-levels]').catch(() => undefined);
  await b.click('[data-atlas-level="2"]').catch(() => undefined);
  await sleep(1500);
  row.handovers.nigeriaToCity = await handover(b, '15-nigeria-to-city', 'Nigeria to Lagos', async () => { row.nigeriaToCityBy = await intoCity(b); });
  await sleep(1500); await shot(b, '16-back-in-lagos', 'Back in the city map of Lagos', `layer: ${await read(b, 'layer')}`);
  await b.click('[data-m3="me"]').catch(() => undefined);
  await sleep(1200); await shot(b, '17-find-me', '"Find me": the player\'s own place', `layer: ${await read(b, 'layer')}`);
  row.cityAfter = await lifeCity(b);

  // 7. Round trips for memory: city → Nigeria → city, three times.
  const trips: any[] = [];
  trips.push({ n: 0, ...(await heap(b)) });
  for (let n = 1; n <= 3; n++) {
    if ((await read(b, 'layer')) !== 'city') { row.errors.push(`round trip ${n}: not in the city at the start`); break; }
    const mid2 = centre(b);
    await b.click('[data-m3="fit"]').catch(() => undefined); await sleep(500);
    const out2 = await handover(b, `rt${n}-out`, 'round trip out', async () => { await zoomUntil(b, 'out', async () => (await read(b, 'phase')) !== 'idle' || (await read(b, 'layer')) === 'world', 60, mid2, 1.4); }, false);
    await sleep(22000);   // the city map lets go of the GPU twenty seconds after the hand-over
    const atlas = await heap(b);
    const in2 = await handover(b, `rt${n}-in`, 'round trip in', async () => { row.roundTripInBy = await intoCity(b); }, false);
    await sleep(2500);
    trips.push({ n, layer: await read(b, 'layer'), out: out2, in: in2, atlasAfterRelease: atlas, ...(await heap(b)) });
  }
  row.roundTrips = trips;
  row.consoleErrors = b.consoleErrors.slice(-10);
  await b.throttle(false);
}

/** The simple (flat) map takes the same ladder; and a player who asked for less motion gets a short fade and no flight. */
async function simpleAndReduced(b: Browser): Promise<void> {
  prefix = 'desktop-extra'; phone = false;
  await b.setViewport(SIZE.desktop); await b.throttle(false);
  await openMap(b);
  const out2: Record<string, any> = {};
  numbers.extra = out2;
  await b.click('.cmap-switch');
  await b.waitFor(`document.querySelector('[data-map]')?.dataset.map === '2d'`, 60000, 'the simple map');
  await sleep(2500); await shot(b, '01-simple-map', 'The simple map, before zooming out');
  out2.simple = await handover(b, '02-simple-to-nigeria', 'Simple map to Nigeria', async () => { await zoomUntil(b, 'out', async () => (await read(b, 'phase')) !== 'idle' || (await read(b, 'layer')) === 'world', 80, centre(b), 1.4); });
  await sleep(1500); await shot(b, '03-simple-nigeria', 'The atlas, reached from the simple map', `level: ${await read(b, 'level')}`);
  out2.simpleLayer = await read(b, 'layer');
  await b.click('[data-atlas-city]').catch(() => undefined);
  await sleep(2500);
  out2.simpleBack = { layer: await read(b, 'layer'), map: await read(b, 'map') };
  await b.click('.cmap-switch').catch(() => undefined);
  await b.waitFor(`document.querySelector('[data-map]')?.dataset.map === '3d'`, 60000, '3D map again').catch(() => undefined);
  // Less motion: the preference is read when the maps start, so load the page again with it on.
  await b.send('Emulation.setEmulatedMedia', { features: [{ name: 'prefers-reduced-motion', value: 'reduce' }] });
  prefix = 'desktop-reduced';
  await openMap(b);
  await b.click('[data-m3="fit"]').catch(() => undefined); await sleep(600);
  out2.reduced = await handover(b, '01-city-to-nigeria', 'City to Nigeria with reduced motion', async () => { await zoomUntil(b, 'out', async () => (await read(b, 'phase')) !== 'idle' || (await read(b, 'layer')) === 'world', 80, centre(b), 1.4); });
  await sleep(1200); await shot(b, '02-nigeria', 'Reduced motion: Nigeria, reached with a short fade and no flight', `level: ${await read(b, 'level')}`);
  await b.send('Emulation.setEmulatedMedia', { features: [{ name: 'prefers-reduced-motion', value: 'no-preference' }] });
}

/** The loading state: a slow network and a map that was let go, so entering the city has to mount it again. */
async function loadingState(b: Browser): Promise<void> {
  prefix = 'phone-load'; phone = true;
  // Data Saver on: nothing is fetched or built ahead of need, so the hand-over has to wait for its map and says so.
  const saver = await b.send('Page.addScriptToEvaluateOnNewDocument', { source: "Object.defineProperty(navigator, 'connection', { value: { saveData: true, effectiveType: '4g' }, configurable: true })" });
  await b.setViewport(SIZE.phone); await b.throttle(false);
  await openMap(b);
  await b.throttle(true);
  const mid = centre(b);
  await b.click('[data-m3="fit"]').catch(() => undefined); await sleep(600);
  await zoomUntil(b, 'out', async () => (await read(b, 'layer')) === 'world', 60, mid, 1.4);
  await b.waitFor(`document.querySelector('#city-scene')?.parentElement?.dataset.ladder === 'idle'`, 20000, 'idle').catch(() => undefined);
  await sleep(22000);   // the city map lets go of the GPU twenty seconds after a hand-over
  const lagos = await labelAt(b, 'Lagos');
  const cast = await castStart(b), from = Date.now();
  let sawChip = '';
  const seen: string[] = [];
  await zoomOnto(b, ['Lagos'], async () => {
    const chip = await read(b, 'chip');
    if (/^Loading/.test(chip) && !sawChip) { sawChip = chip; const file = `${prefix}-01-loading-chip.png`; await b.screenshot(join(out, file)); shots.push({ file, title: 'A hand-over that has to wait for its map: the chip says what for (Data Saver on, 4x slower CPU, slow network)', note: chip, group: prefix }); }
    if (chip) seen.push(chip);
    return (await read(b, 'phase')) === 'idle' && (await read(b, 'layer')) === 'city';
  }, 90);
  await b.waitFor(`document.querySelector('#city-scene')?.parentElement?.dataset.ladder === 'idle'`, 30000, 'idle').catch(() => undefined);
  await cast.stop();
  const chips = await b.eval<{ text: string; t: number }[]>(`window.__chips.filter((c) => c.t >= ${from})`);
  const loading = chips.filter((c) => /^Loading/.test(c.text));
  if (loading.length) { const first = loading[0]!.t, last = loading.at(-1)!.t; await saveFrames(cast, '02-loading', 'Entering a city whose map was let go: the loading chip, then the fade', first - 150, 6, last + 900); sawChip = sawChip || loading[0]!.text; }
  else await saveFrames(cast, '02-remount', 'Entering a city whose map was let go', from, 6);
  numbers.loadingState = { chipSeen: sawChip, dataSaver: true, chips: [...new Set(chips.map((c) => c.text))], loadingChipMs: loading.length ? Math.round(loading.at(-1)!.t - loading[0]!.t) : 0 };
  await b.throttle(false);
  await b.send('Page.removeScriptToEvaluateOnNewDocument', { identifier: saver.identifier }).catch(() => undefined);
}

// ---- gallery ----------------------------------------------------------------------------------------------------------------------
function gallery(): void {
  const groups = new Map<string, Shot[]>();
  for (const item of shots) groups.set(item.group, [...(groups.get(item.group) ?? []), item]);
  const esc = (s: string): string => s.replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]!);
  const body = [...groups].map(([group, items]) => `<section><h2>${esc(group)}</h2><div class="g">${items.map((i) => `<figure><a href="${i.file}"><img loading="lazy" src="${i.file}" alt="${esc(i.title)}"></a><figcaption><b>${esc(i.title)}</b><br>${esc(i.note)}</figcaption></figure>`).join('')}</div></section>`).join('');
  writeFileSync(join(out, 'index.html'), `<!doctype html><meta charset="utf-8"><title>Zoom ladder, stage 1</title><style>body{font:14px system-ui;margin:20px;background:#f4f5f2;color:#1b2a22}h2{margin-top:32px}.g{display:flex;flex-wrap:wrap;gap:14px}figure{margin:0;max-width:340px}img{max-width:100%;border:1px solid #ccd;border-radius:6px;background:#fff}figcaption{font-size:12px;margin-top:4px}</style><h1>Zoom ladder, stage 1: evidence</h1><p>Headless software rendering; timings compare rows, not real phones. See numbers.json.</p>${body}`);
}

let browser: Browser | null = null;
try {
  await startServer();
  browser = await Browser.launch(debugPort);
  await browser.setViewport(SIZE.desktop);
  await settle(browser);
  await browser.send('Page.addScriptToEvaluateOnNewDocument', { source: GL_COUNTER }).catch(() => undefined);
  for (const size of sizes) {
    try { await journey(browser, size as keyof typeof SIZE, false); } catch (error) { numbers.sizes[size] = { ...(numbers.sizes[size] ?? {}), failed: String(error) }; console.error(`${size} failed:`, error); }
    if (size !== 'desktop') { try { await journey(browser, size as keyof typeof SIZE, true); } catch (error) { numbers.sizes[`${size}-slow`] = { ...(numbers.sizes[`${size}-slow`] ?? {}), failed: String(error) }; console.error(`${size} slow failed:`, error); } }
  }
  if (sizes.includes('desktop')) { try { await simpleAndReduced(browser); } catch (error) { numbers.extra = { ...(numbers.extra ?? {}), failed: String(error) }; console.error('extra failed:', error); } }
  if (sizes.includes('phone')) { try { await loadingState(browser); } catch (error) { numbers.loadingState = { failed: String(error) }; } }
} finally {
  writeFileSync(join(out, 'numbers.json'), JSON.stringify(numbers, null, 2));
  gallery();
  browser?.close();
  await stopServer();
  rmSync(work, { recursive: true, force: true });
}
