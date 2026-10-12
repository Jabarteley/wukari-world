#!/usr/bin/env node
/**
 * The atlas (world, Africa, Nigeria) measured in a real browser, as a table that can be rerun before a release.
 *
 *   node --experimental-strip-types scripts/perf/atlas.ts --out <folder> [--label after] [--port 4651] [--debug-port 4652]
 *        [--sizes ultrawide@1,ultrawide@2,desktop@1,desktop@2,phone@2] [--trace] [--profile] [--software]
 *   node --experimental-strip-types scripts/perf/atlas.ts --table <before.json> <after.json>
 *
 * It builds nothing (run `npm run build` first). It starts the built app (scripts/journeys/serve.ts, a fresh data folder, no outside
 * request) and ONE headless Chrome with the GPU on, makes one guest, opens the Map at the World level and plays the same actions at each
 * size: a continuous zoom in and out over Africa for five seconds, a drag, a hover sweep, ten countries clicked in turn on the map and
 * ten in the list, the list scrolled, and a name typed into the search box. A phone row is touch input with the CPU slowed four times.
 *
 * Per action it reports the frame rate, the 95th-percentile and worst frame (after the first), tasks over 50 ms, script and
 * style-and-layout time, draws per frame, and the input-to-next-frame time of each click and key. `--trace` adds the GPU process's
 * time from a DevTools trace (saved, gzipped, beside the numbers); `--profile` adds the functions that took the most time.
 *
 * A headless browser has no display to wait for, so these numbers compare one build with another on one computer; they are not a
 * promise about a particular screen. `--software` runs without the GPU (the slowest case, and what a CI machine has).
 */
import { spawn } from 'node:child_process';
import type { ChildProcess } from 'node:child_process';
import { mkdirSync, mkdtempSync, readFileSync, readdirSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { gzipSync } from 'node:zlib';
import { Browser, sleep } from '../journeys/cdp.ts';
import { dismiss, gameShown, toCreator } from '../journeys/kit.ts';

const argv = process.argv.slice(2);
const has = (name: string): boolean => argv.includes(`--${name}`);
const arg = (name: string, fallback?: string): string => {
  const at = argv.indexOf(`--${name}`), value = at >= 0 ? argv[at + 1] : fallback;
  if (value === undefined) throw new Error(`Missing --${name}`);
  return value;
};

// ---- what a run writes -----------------------------------------------------------------------------------------------------
interface Frames { frames: number; fps: number; p95: number; worst: number; over20: number; over33: number }
interface Latency { type: string; handler: number; toFrame: number; what?: string }
interface ActionRow {
  action: string; seconds: number; inputs: number; frames: Frames; renders: number;
  longTasks: number; longestTask: number; scriptMs: number; layoutMs: number; styleMs: number; taskMs: number; layouts: number; styles: number;
  latencies: Latency[]; heapMB: number; gpuMs?: number; top?: string[];
}
interface SizeRow {
  size: string; width: number; height: number; ratio: number; throttle: number; renderer: string;
  canvas: { width: number; height: number; pixels: number }; firstOpenMs: number; firstOpenLongest: number;
  calls: number; triangles: number; nodes: number; labels: number; rows: number; restyledPerFrame: number; actions: ActionRow[];
}
interface Report { label: string; when: string; chrome: string; gpu: boolean; sizes: SizeRow[] }

const round = (value: number, places = 1): number => { const k = 10 ** places; return Math.round(value * k) / k; };
const worstLatency = (row: ActionRow | undefined): number => (row?.latencies.length ? Math.max(...row.latencies.map((item) => item.toFrame)) : 0);
const medianLatency = (row: ActionRow | undefined): number => { const list = (row?.latencies ?? []).map((item) => item.toFrame).sort((a, b) => a - b); return list.length ? list[Math.floor(list.length / 2)]! : 0; };

/** The table: one line per size and action. With two reports, the first is "before". */
function table(reports: Report[]): string {
  const lines: string[] = [];
  const head = '| size | action | fps | p95 ms | worst ms | frames >20 ms | tasks >50 ms (longest) | script ms/s | style+layout ms/s | input to frame: median / worst ms |';
  for (const report of reports) {
    lines.push(`### ${report.label} (${report.gpu ? 'GPU' : 'software'}; ${report.chrome})`, '');
    lines.push('| size | renderer | canvas | draws | triangles | DOM nodes | labels | list rows | labels restyled per frame | first open ms (longest task) |', '| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |');
    for (const size of report.sizes) lines.push(`| ${size.size}${size.throttle > 1 ? ` cpu/${size.throttle}` : ''} | ${size.renderer.replace(/ANGLE \(|\)$/g, '').slice(0, 44)} | ${size.canvas.width}x${size.canvas.height} = ${round(size.canvas.pixels / 1e6)} MP | ${size.calls} | ${size.triangles} | ${size.nodes} | ${size.labels} | ${size.rows} | ${size.restyledPerFrame} | ${size.firstOpenMs} (${size.firstOpenLongest}) |`);
    lines.push('', head, '| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |');
    for (const size of report.sizes) for (const row of size.actions) {
      lines.push(`| ${size.size}${size.throttle > 1 ? ` cpu/${size.throttle}` : ''} | ${row.action} | ${row.frames.fps} | ${row.frames.p95} | ${row.frames.worst} | ${row.frames.over20} of ${row.frames.frames} | ${row.longTasks} (${row.longestTask}) | ${round(row.scriptMs / row.seconds)} | ${round((row.layoutMs + row.styleMs) / row.seconds)} | ${row.latencies.length ? `${medianLatency(row)} / ${worstLatency(row)}` : ''}${row.gpuMs === undefined ? '' : ` (GPU ${round(row.gpuMs / row.seconds)} ms/s)`} |`);
    }
    lines.push('');
  }
  if (reports.length === 2) {
    const [before, after] = reports as [Report, Report];
    lines.push(`### ${before.label} against ${after.label}`, '', '| size | action | fps | worst frame ms | longest task ms | script ms/s | input to frame worst ms |', '| --- | --- | --- | --- | --- | --- | --- |');
    for (const size of after.sizes) {
      const was = before.sizes.find((item) => item.size === size.size);
      for (const row of size.actions) {
        const old = was?.actions.find((item) => item.action === row.action);
        if (!old) continue;
        lines.push(`| ${size.size} | ${row.action} | ${old.frames.fps} → ${row.frames.fps} | ${old.frames.worst} → ${row.frames.worst} | ${old.longestTask} → ${row.longestTask} | ${round(old.scriptMs / old.seconds)} → ${round(row.scriptMs / row.seconds)} | ${old.latencies.length ? `${worstLatency(old)} → ${worstLatency(row)}` : ''} |`);
      }
    }
    lines.push('');
  }
  return lines.join('\n');
}

if (has('table')) {
  const files = argv.slice(argv.indexOf('--table') + 1).filter((item) => !item.startsWith('--'));
  console.log(table(files.map((file) => JSON.parse(readFileSync(file, 'utf8')) as Report)));
  process.exit(0);
}

const out = resolve(arg('out')), label = arg('label', 'run');
const port = Number(arg('port', '4651')), debugPort = Number(arg('debug-port', '4652'));
const base = `http://127.0.0.1:${port}`;
const software = has('software'), tracing = has('trace'), profiling = has('profile');
const SHAPES: Record<string, { width: number; height: number; mobile: boolean }> = { ultrawide: { width: 3440, height: 1440, mobile: false }, desktop: { width: 1920, height: 1080, mobile: false }, phone: { width: 390, height: 844, mobile: true } };
const wanted = arg('sizes', 'ultrawide@1,ultrawide@2,desktop@1,desktop@2,phone@2').split(',').filter(Boolean);
mkdirSync(out, { recursive: true });
const work = mkdtempSync(join(tmpdir(), 'perf-atlas-'));

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
// A run that hangs must not hold the browser and the port: fifteen minutes is far more than it needs.
const guard = setTimeout(() => { console.error('The run took over fifteen minutes; stopping.'); cleanUp(); process.exit(2); }, 15 * 60 * 1000);
guard.unref();
for (const signal of ['SIGINT', 'SIGTERM', 'SIGALRM'] as const) process.on(signal, () => { cleanUp(); process.exit(130); });

// ---- the page's own stopwatch, installed before the page's scripts ----------------------------------------------------------------
const PROBE = `(() => {
  if (window.__perf) return;
  const P = window.__perf = { frames: [], long: [], lat: [], t0: 0, restyled: 0, counting: null };
  (function tick(t) { P.frames.push(t); if (P.frames.length > 40000) P.frames.splice(0, 20000); requestAnimationFrame(tick); })(performance.now());
  try { new PerformanceObserver((list) => { for (const e of list.getEntries()) P.long.push({ start: e.startTime, ms: e.duration }); }).observe({ type: 'longtask', buffered: true }); } catch {}
  // Input to the next frame: stamped when the event was made, again when every listener has run, and after the frame that follows.
  for (const type of ['pointerup', 'click', 'input']) {
    let open = null;
    window.addEventListener(type, (e) => { open = { type, t0: e.timeStamp || performance.now(), h0: performance.now() }; }, true);
    window.addEventListener(type, () => { const entry = open; open = null; if (!entry) return; entry.handler = performance.now() - entry.h0; requestAnimationFrame(() => { const ch = new MessageChannel(); ch.port1.onmessage = () => { entry.toFrame = performance.now() - entry.t0; P.lat.push(entry); }; ch.port2.postMessage(0); }); });
  }
  P.begin = () => { P.t0 = performance.now(); P.lat.length = 0; };
  P.end = () => {
    const t1 = performance.now(), stamps = P.frames.filter((t) => t >= P.t0 && t <= t1), gaps = stamps.slice(1).map((t, i) => t - stamps[i]).slice(1).sort((a, b) => a - b);
    const long = P.long.filter((e) => e.start + e.ms >= P.t0 && e.start <= t1);
    const r = (v) => Math.round(v * 10) / 10;
    return { seconds: (t1 - P.t0) / 1000, frames: { frames: gaps.length, fps: gaps.length ? r(gaps.length / (gaps.reduce((a, b) => a + b, 0) / 1000)) : 0, p95: r(gaps[Math.floor(gaps.length * 0.95)] || 0), worst: r(gaps[gaps.length - 1] || 0), over20: gaps.filter((g) => g > 20).length, over33: gaps.filter((g) => g > 33.4).length },
      longTasks: long.length, longestTask: r(Math.max(0, ...long.map((e) => e.ms))), latencies: P.lat.map((e) => ({ type: e.type, handler: r(e.handler || 0), toFrame: r(e.toFrame || 0) })) };
  };
  // How many label elements have their style written in a frame (asked for only in its own short pass).
  P.count = (on) => {
    if (!on) { const c = P.counting; P.counting = null; if (!c) return 0; c.observer.disconnect(); const frames = P.frames.filter((t) => t >= c.t0).length; return frames ? Math.round((c.n / frames) * 10) / 10 : 0; }
    const host = document.querySelector('#map-scene .atlas-labels'); if (!host) return 0;
    const c = P.counting = { n: 0, t0: performance.now(), observer: new MutationObserver((list) => { c.n += list.length; }) };
    c.observer.observe(host, { attributes: true, attributeFilter: ['style'], subtree: true });
    return 0;
  };
})()`;

const ATLAS = `window.__atlas`;
const shownNow = (selector: string): string => `[...document.querySelectorAll(${JSON.stringify(selector)})].some((e) => { const r = e.getBoundingClientRect(); return r.width > 1 && r.height > 1 && getComputedStyle(e).visibility !== 'hidden'; })`;
const settled = `(() => { const d = ${ATLAS}?.diagnostics(); return !!d && d.levelId === 'world' && !d.loading && !d.fading && !d.loop; })()`;

/** Sends something every `everyMs` for `ms`, at the pace of an input device: it does not wait for the page to answer one before the next. */
async function paced(ms: number, everyMs: number, fire: (i: number, k: number) => Promise<unknown>): Promise<number> {
  const start = performance.now(), sent: Promise<unknown>[] = [];
  let i = 0;
  while (performance.now() - start < ms) {
    sent.push(fire(i, (performance.now() - start) / ms).catch(() => undefined));
    i += 1;
    const wait = start + i * everyMs - performance.now();
    if (wait > 0) await sleep(wait);
  }
  await Promise.allSettled(sent);
  return i;
}

const METRICS = ['ScriptDuration', 'LayoutDuration', 'RecalcStyleDuration', 'TaskDuration', 'LayoutCount', 'RecalcStyleCount', 'JSHeapUsedSize'] as const;
async function metrics(b: Browser): Promise<Record<string, number>> {
  const { metrics: list } = await b.send('Performance.getMetrics') as { metrics: { name: string; value: number }[] };
  return Object.fromEntries(list.filter((item) => (METRICS as readonly string[]).includes(item.name)).map((item) => [item.name, item.value]));
}

interface TraceEvent { name: string; ph: string; ts: number; dur?: number; pid: number; tid: number; cat?: string; args?: { name?: string } }
/** Records a DevTools trace around `body`; returns the GPU process's busy time and saves the trace. */
async function traced(b: Browser, file: string, body: () => Promise<void>): Promise<number> {
  const events: TraceEvent[] = [];
  let done: (() => void) | null = null;
  const finished = new Promise<void>((resolveIt) => { done = resolveIt; });
  const onMessage = (event: MessageEvent): void => {
    const message = JSON.parse(String(event.data)) as { method?: string; params?: { value?: TraceEvent[] } };
    if (message.method === 'Tracing.dataCollected') events.push(...(message.params?.value ?? []));
    else if (message.method === 'Tracing.tracingComplete') done?.();
  };
  b.ws.addEventListener('message', onMessage);
  await b.send('Tracing.start', { transferMode: 'ReportEvents', traceConfig: { includedCategories: ['devtools.timeline', 'disabled-by-default-devtools.timeline', 'disabled-by-default-devtools.timeline.frame', 'gpu', 'viz', 'toplevel', 'v8.execute', 'blink.user_timing', 'latencyInfo'] } });
  await body();
  await b.send('Tracing.end');
  await finished;
  b.ws.removeEventListener('message', onMessage);
  writeFileSync(file, gzipSync(JSON.stringify({ traceEvents: events })));
  const gpuThreads = new Set(events.filter((event) => event.ph === 'M' && event.name === 'thread_name' && event.args?.name === 'CrGpuMain').map((event) => `${event.pid}:${event.tid}`));
  // The GPU main thread's top-level tasks: what the GPU process spent, whatever asked for it.
  return round(events.filter((event) => event.ph === 'X' && gpuThreads.has(`${event.pid}:${event.tid}`) && /RunTask$/.test(event.name)).reduce((sum, event) => sum + (event.dur ?? 0), 0) / 1000);
}

interface ProfileNode { id: number; callFrame: { functionName: string; url: string; lineNumber: number; columnNumber: number }; children?: number[] }
/** Samples the page's CPU around `body`; returns the functions with the most self time, each with the code at that place of the built file. */
async function profiled(b: Browser, body: () => Promise<void>): Promise<string[]> {
  await b.send('Profiler.enable'); await b.send('Profiler.setSamplingInterval', { interval: 250 });
  await b.send('Profiler.start');
  await body();
  const { profile } = await b.send('Profiler.stop') as { profile: { nodes: ProfileNode[]; samples: number[]; timeDeltas: number[] } };
  const self = new Map<number, number>();
  profile.samples.forEach((id, i) => self.set(id, (self.get(id) ?? 0) + (profile.timeDeltas[i] ?? 0)));
  const byPlace = new Map<string, { ms: number; node: ProfileNode }>();
  for (const node of profile.nodes) {
    const key = `${node.callFrame.functionName}|${node.callFrame.url}|${node.callFrame.lineNumber}|${node.callFrame.columnNumber}`, entry = byPlace.get(key) ?? { ms: 0, node };
    entry.ms += (self.get(node.id) ?? 0) / 1000; byPlace.set(key, entry);
  }
  const sources = new Map<string, string>();
  const snippet = (node: ProfileNode): string => {
    const name = node.callFrame.url.split('/').pop() ?? '';
    if (!name || !/\.js$/.test(name)) return '';
    if (!sources.has(name)) { try { sources.set(name, readFileSync(join('dist', 'assets', name), 'utf8')); } catch { sources.set(name, ''); } }
    const line = sources.get(name)!.split('\n')[node.callFrame.lineNumber] ?? '';
    return line.slice(node.callFrame.columnNumber, node.callFrame.columnNumber + 110).replace(/\s+/g, ' ');
  };
  return [...byPlace.values()].filter((entry) => !['(idle)', '(program)'].includes(entry.node.callFrame.functionName)).sort((a, c) => c.ms - a.ms).slice(0, 14)
    .map((entry) => `${round(entry.ms)} ms  ${entry.node.callFrame.functionName || '(anonymous)'}  ${(entry.node.callFrame.url.split('/').pop() ?? '').replace(/-[0-9a-f]{8}\.js$/, '.js')}  ${snippet(entry.node)}`);
}

async function measure(b: Browser, size: SizeRow, action: string, body: () => Promise<number>, heavy = false): Promise<ActionRow> {
  await sleep(500);
  let inputs = 0, gpuMs: number | undefined, top: string[] | undefined;
  const before = await metrics(b);
  await b.eval(`window.__perf.begin()`);
  const run = async (): Promise<void> => { inputs = await body(); await sleep(250); };
  if (tracing && heavy) gpuMs = await traced(b, join(out, `${label}-${size.size.replace('@', '-x')}-${action.replace(/\W+/g, '-')}.trace.json.gz`), run);
  else if (profiling && heavy) top = await profiled(b, run);
  else await run();
  const page = await b.eval<{ seconds: number; frames: Frames; longTasks: number; longestTask: number; latencies: Latency[] }>(`window.__perf.end()`);
  const after = await metrics(b), delta = (name: typeof METRICS[number]): number => (after[name] ?? 0) - (before[name] ?? 0);
  const renders = await b.eval<number>(`${ATLAS}.diagnostics().renderCount`);
  const row: ActionRow = { action, seconds: round(page.seconds, 2), inputs, frames: page.frames, renders, longTasks: page.longTasks, longestTask: page.longestTask,
    scriptMs: round(delta('ScriptDuration') * 1000), layoutMs: round(delta('LayoutDuration') * 1000), styleMs: round(delta('RecalcStyleDuration') * 1000), taskMs: round(delta('TaskDuration') * 1000), layouts: delta('LayoutCount'), styles: delta('RecalcStyleCount'),
    latencies: page.latencies, heapMB: round((after['JSHeapUsedSize'] ?? 0) / 1048576), ...(gpuMs === undefined ? {} : { gpuMs }), ...(top ? { top } : {}) };
  console.log(`  ${action}: ${row.frames.fps} fps, p95 ${row.frames.p95} ms, worst ${row.frames.worst} ms, ${row.longTasks} long (${row.longestTask} ms), script ${round(row.scriptMs / row.seconds)} ms/s, style+layout ${round((row.layoutMs + row.styleMs) / row.seconds)} ms/s${row.latencies.length ? `, input to frame ${medianLatency(row)} / ${worstLatency(row)} ms` : ''}${gpuMs === undefined ? '' : `, GPU ${round(gpuMs / row.seconds)} ms/s`}`);
  for (const line of top ?? []) console.log(`      ${line}`);
  size.actions.push(row);
  return row;
}

/** Places to click, as longitude and latitude: open countries and ones that are coming soon. The country that opens a level of its own is left out. */
const PLACES: [string, number, number][] = [['Iran', 54, 32.5], ['Brazil', -52, -10], ['Canada', -106, 58], ['Russia', 96, 62], ['India', 79, 22], ['Australia', 134, -25], ['China', 103, 35], ['Algeria', 2.6, 28], ['Argentina', -65, -35], ['Kazakhstan', 67, 48], ['United States', -100, 40], ['Mexico', -102, 24], ['Saudi Arabia', 45, 24], ['Mongolia', 104, 46.5], ['Congo', 23, -3], ['Libya', 17.5, 27], ['Sudan', 30, 16], ['Peru', -75, -10], ['Egypt', 29.5, 26.5], ['South Africa', 24, -30]];

async function runSize(b: Browser, spec: string, first: boolean): Promise<SizeRow> {
  const [shapeName = 'desktop', ratioText = '1'] = spec.split('@'), shape = SHAPES[shapeName], ratio = Number(ratioText);
  if (!shape) throw new Error(`Unknown size ${spec}`);
  const throttle = shape.mobile ? 4 : 1;
  console.log(`\n== ${spec}${throttle > 1 ? ` (touch, CPU slowed ${throttle} times)` : ''}`);
  await b.setViewport({ width: shape.width, height: shape.height, scale: ratio, mobile: shape.mobile });
  await b.send('Emulation.setCPUThrottlingRate', { rate: 1 });
  if (first) {
    await b.goto(`${base}/?diagnostics`);
    await toCreator(b); await sleep(600);
    await b.type('[data-qs-name]', 'Atlas Checker');
    await b.click('[data-key="play-now"]');
  } else await b.goto(`${base}/?diagnostics`);
  await gameShown(b); await dismiss(b, 3000);
  if (!(await b.eval<boolean>(shownNow('.map-levels-cur') + ' || ' + shownNow('[data-atlas-levels]')))) await b.click('[data-nav="map"]', undefined, 10000).catch(() => b.eval(`document.querySelector('[data-nav="map"]').click(); true`));
  await b.waitFor(shownNow('.map-levels-cur') + ' || ' + shownNow('[data-atlas-levels]'), 30000, 'the map panel');
  await sleep(1500);
  await b.send('Emulation.setCPUThrottlingRate', { rate: throttle });
  // First open: from choosing "World" to the world drawn and still.
  const longBefore = await b.eval<number>(`window.__perf.long.length`), opened = Date.now();
  if (await b.eval<boolean>(shownNow('[data-atlas-levels]'))) { await b.click('[data-atlas-levels]'); await b.click('[data-atlas-level="0"]'); }
  else { await b.click('.map-levels-cur'); await b.click('[data-map-level="world"]'); }
  await b.waitFor(settled, 60000, 'the world level, drawn and still');
  const firstOpenMs = Date.now() - opened, firstOpenLongest = await b.eval<number>(`Math.round(Math.max(0, ...window.__perf.long.slice(${longBefore}).map((e) => e.ms)))`);
  await b.eval(`${ATLAS}.select(null); true`);
  await sleep(800);
  const facts = await b.eval<{ renderer: string; canvas: { width: number; height: number }; calls: number; triangles: number; nodes: number; labels: number; rows: number }>(`(() => {
    const scratch = document.createElement('canvas'), gl = scratch.getContext('webgl2') || scratch.getContext('webgl'), ext = gl && gl.getExtension('WEBGL_debug_renderer_info');
    const renderer = gl ? String(gl.getParameter(ext ? ext.UNMASKED_RENDERER_WEBGL : gl.RENDERER)) : 'none'; gl && gl.getExtension('WEBGL_lose_context')?.loseContext();
    const canvas = document.querySelector('#map-scene .atlas-canvas'), d = ${ATLAS}.diagnostics();
    return { renderer, canvas: { width: canvas.width, height: canvas.height }, calls: d.calls, triangles: d.triangles, nodes: document.querySelectorAll('*').length, labels: document.querySelectorAll('#map-scene .atlas-label').length, rows: document.querySelectorAll('#map-scene .atlas-row').length };
  })()`);
  const size: SizeRow = { size: spec, width: shape.width, height: shape.height, ratio, throttle, renderer: facts.renderer, canvas: { ...facts.canvas, pixels: facts.canvas.width * facts.canvas.height }, firstOpenMs, firstOpenLongest,
    calls: facts.calls, triangles: facts.triangles, nodes: facts.nodes, labels: facts.labels, rows: facts.rows, restyledPerFrame: 0, actions: [] };
  console.log(`  ${facts.renderer}; canvas ${facts.canvas.width}x${facts.canvas.height}; ${facts.calls} draws, ${facts.triangles} triangles; ${facts.nodes} nodes, ${facts.labels} labels, ${facts.rows} list rows; first open ${firstOpenMs} ms (longest task ${firstOpenLongest} ms)`);

  const africa = await b.eval<{ x: number; y: number }>(`(() => { const at = ${ATLAS}.screenOf(20, 3), box = document.querySelector('#map-scene').getBoundingClientRect(); return { x: box.left + at.x, y: box.top + at.y }; })()`);
  const fit = async (): Promise<void> => { await b.eval(`${ATLAS}.goLevel(0); true`); await b.waitFor(settled, 20000, 'the world level again'); };
  const wheel = (x: number, y: number, deltaY: number): Promise<unknown> => b.send('Input.dispatchMouseEvent', { type: 'mouseWheel', x, y, deltaX: 0, deltaY });
  const touch = (type: string, points: { x: number; y: number; id: number }[]): Promise<unknown> => b.send('Input.dispatchTouchEvent', { type, touchPoints: points });
  const pair = (span: number): { x: number; y: number; id: number }[] => [{ x: africa.x - span / 2, y: africa.y, id: 1 }, { x: africa.x + span / 2, y: africa.y, id: 2 }];
  // In for a quarter of the time, out for a quarter, twice: the levels change under the pointer on the way, as they do for a player.
  const zoom = async (ms: number): Promise<number> => {
    if (!shape.mobile) return paced(ms, 16, (_, k) => wheel(africa.x, africa.y, Math.floor(k * 4) % 2 === 0 ? -24 : 24));
    await touch('touchStart', pair(90));
    const sent = await paced(ms, 16, (_, k) => { const phase = (k * 4) % 2, span = 90 + 190 * (phase < 1 ? phase : 2 - phase); return touch('touchMove', pair(span)); });
    await touch('touchEnd', []);
    return sent;
  };

  // How many labels are restyled in a frame: a short pass of its own, so the count does not weigh on the timed ones.
  await b.eval(`window.__perf.count(true)`);
  await zoom(1000);
  size.restyledPerFrame = await b.eval<number>(`window.__perf.count(false)`);
  await fit();

  await measure(b, size, 'zoom in and out, 5 s', () => zoom(5000), true);
  await fit();
  await measure(b, size, 'drag, 3 s', async () => {
    const at = (k: number): { x: number; y: number } => ({ x: africa.x + Math.sin(k * Math.PI * 4) * shape.width * 0.12, y: africa.y + (Math.cos(k * Math.PI * 4) - 1) * shape.height * 0.08 });
    if (shape.mobile) { await touch('touchStart', [{ ...at(0), id: 1 }]); const n = await paced(3000, 16, (_, k) => touch('touchMove', [{ ...at(k), id: 1 }])); await touch('touchEnd', []); return n; }
    await b.send('Input.dispatchMouseEvent', { type: 'mousePressed', ...at(0), button: 'left', clickCount: 1 });
    const n = await paced(3000, 16, (_, k) => b.send('Input.dispatchMouseEvent', { type: 'mouseMoved', ...at(k), button: 'left', buttons: 1 }));
    await b.send('Input.dispatchMouseEvent', { type: 'mouseReleased', ...at(1), button: 'left', clickCount: 1 });
    return n;
  });
  await fit();
  if (!shape.mobile) await measure(b, size, 'hover across countries, 3 s', () => paced(3000, 16, (_, k) => b.send('Input.dispatchMouseEvent', { type: 'mouseMoved', x: shape.width * (0.3 + 0.5 * k), y: shape.height * (0.42 + 0.12 * Math.sin(k * 20)) })));

  // Ten countries in turn on the map: each press is timed to the frame after its card is drawn.
  const spots = await b.eval<{ name: string; x: number; y: number }[]>(`(() => { const box = document.querySelector('#map-scene').getBoundingClientRect(), canvas = document.querySelector('#map-scene .atlas-canvas');
    return ${JSON.stringify(PLACES)}.map(([name, lon, lat]) => { const at = ${ATLAS}.screenOf(lon, lat), hit = ${ATLAS}.pick(lon, lat); return { name: hit ? hit.name : '', id: hit ? hit.id : '', x: box.left + at.x, y: box.top + at.y }; })
      .filter((spot) => spot.name && spot.id !== 'ng' && document.elementFromPoint(spot.x, spot.y) === canvas).slice(0, 10); })()`);
  await measure(b, size, `click ${spots.length} countries on the map`, async () => {
    for (const [i, spot] of spots.entries()) {
      await b.tapAt(spot.x, spot.y);
      await b.waitFor(`window.__perf.lat.filter((e) => e.type === 'pointerup' && e.toFrame).length > ${i} && (document.querySelector('#map-scene .atlas-sheet h2')?.textContent ?? '') !== ''`, 5000, `the card of ${spot.name}`).catch(() => undefined);
      await sleep(350);
    }
    return spots.length;
  }, true);
  size.actions.at(-1)!.latencies = size.actions.at(-1)!.latencies.filter((item) => item.type === 'pointerup');
  await b.eval(`${ATLAS}.select(null); true`);
  await fit();

  // The list: on a narrow screen it is behind "Find a place".
  if (!(await b.eval<boolean>(shownNow('#map-scene .atlas-row')))) { await b.click('[data-atlas-list]').catch(() => undefined); await sleep(500); }
  const list = await b.eval<{ x: number; y: number } | null>(`(() => { const el = document.querySelector('#map-scene .atlas-list'); if (!el) return null; const r = el.getBoundingClientRect(); return r.height > 40 ? { x: r.left + r.width / 2, y: r.top + r.height / 2 } : null; })()`);
  if (list) {
    await measure(b, size, 'scroll the list, 3 s', async () => {
      if (!shape.mobile) return paced(3000, 16, (_, k) => wheel(list.x, list.y, k < 0.5 ? 60 : -60));
      let n = 0;
      for (let pass = 0; pass < 3; pass++) { await touch('touchStart', [{ x: list.x, y: list.y + 120, id: 1 }]); n += await paced(900, 16, (_, k) => touch('touchMove', [{ x: list.x, y: list.y + 120 - 240 * k, id: 1 }])); await touch('touchEnd', []); }
      return n;
    });
    await measure(b, size, 'type a name in the search box', async () => {
      await b.click('#map-scene [data-atlas-search]');
      const word = 'united king';
      for (const letter of word) { await b.send('Input.insertText', { text: letter }); await sleep(90); }
      return word.length;
    }, true);
    size.actions.at(-1)!.latencies = size.actions.at(-1)!.latencies.filter((item) => item.type === 'input');
    await b.eval(`(() => { const el = document.querySelector('#map-scene [data-atlas-search]'); el.value = ''; el.dispatchEvent(new Event('input', { bubbles: true })); return true; })()`);
    await sleep(300);
    const ids = await b.eval<string[]>(`[...document.querySelectorAll('#map-scene [data-atlas-pick]')].map((e) => e.dataset.atlasPick).filter((id) => id !== 'country:ng').filter((_, i) => i % 23 === 3).slice(0, 10)`);
    await measure(b, size, `click ${ids.length} countries in the list`, async () => {
      for (const id of ids) {
        await b.eval(`(() => { const el = document.querySelector('#map-scene [data-atlas-pick="${id}"]'); el?.scrollIntoView({ block: 'center' }); el?.click(); return true; })()`);
        await sleep(450);
        // A row flies to its country, which can change the level and so the list: back out to the world for the next one.
        await fit();
        if (shape.mobile && !(await b.eval<boolean>(shownNow('#map-scene .atlas-row')))) { await b.eval(`${ATLAS}.select(null); document.querySelector('#map-scene [data-atlas-list]')?.click(); true`); await sleep(350); }
      }
      return ids.length;
    }, true);
    size.actions.at(-1)!.latencies = size.actions.at(-1)!.latencies.filter((item) => item.type === 'click');
  }
  await b.eval(`${ATLAS}.select(null); true`);
  if (ratio === 1) await b.screenshot(join(out, `${label}-${spec.replace('@', '-x')}.png`)).catch(() => undefined);
  await b.send('Emulation.setCPUThrottlingRate', { rate: 1 });
  return size;
}

let code = 0;
try {
  if (!readdirSync('dist').includes('index.html')) throw new Error('Build first: npm run build');
  await startServer();
  browser = await Browser.launch(debugPort, software ? [] : ['--use-angle=metal', '--enable-gpu', '--ignore-gpu-blocklist', '--enable-gpu-rasterization']);
  await browser.send('Performance.enable');
  await browser.send('Page.addScriptToEvaluateOnNewDocument', { source: PROBE });
  const version = await browser.send('Browser.getVersion') as { product: string };
  const report: Report = { label, when: new Date().toISOString(), chrome: version.product, gpu: !software, sizes: [] };
  for (const [index, spec] of wanted.entries()) {
    report.sizes.push(await runSize(browser, spec, index === 0));
    writeFileSync(join(out, `${label}.json`), JSON.stringify(report, null, 2));
  }
  if (!software && report.sizes.some((size) => /swiftshader|llvmpipe|software/i.test(size.renderer))) console.error('WARNING: the browser drew in software although the GPU was asked for; these are not GPU numbers.');
  const text = table([report]);
  writeFileSync(join(out, `${label}.md`), text);
  console.log(`\n${text}`);
  if (browser.consoleErrors.length) console.log(`console errors: ${browser.consoleErrors.slice(0, 5).join(' | ')}`);
} catch (error) {
  code = 1;
  console.error(error instanceof Error ? error.stack : error);
  console.error(serverLog.join('').slice(-600));
} finally {
  clearTimeout(guard);
  cleanUp();
}
process.exit(code);
