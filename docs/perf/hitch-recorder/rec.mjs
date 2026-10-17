// Usage: node rec.mjs <base> <outPrefix> [throttle]   — scripted session with per-frame rAF log + Chrome trace.
import { spawn } from 'node:child_process'; import { writeFileSync, mkdtempSync, createWriteStream } from 'node:fs'; import { tmpdir } from 'node:os'; import { join } from 'node:path'; import { randomUUID } from 'node:crypto';
const [base = 'http://127.0.0.1:5191', prefix = '/tmp/allworld-hitch/run', thr = '1'] = process.argv.slice(2);
if (base.includes(':5190')) throw new Error('never 5190');
const throttle = +thr, TRACE = !process.env.NO_TRACE;
const bin = process.env.CHROME_BIN || '/Users/anthonyakpan/.cache/puppeteer/chrome-headless-shell/mac_arm-145.0.7632.77/chrome-headless-shell-mac-arm64/chrome-headless-shell';
const port = 9300 + Math.floor(Math.random() * 500);
const chrome = spawn(bin, [`--remote-debugging-port=${port}`, `--user-data-dir=${mkdtempSync(join(tmpdir(), 'phitch-'))}`, '--use-angle=metal', '--enable-gpu', '--ignore-gpu-blocklist', '--hide-scrollbars', 'about:blank'], { stdio: 'ignore' });
const sleep = ms => new Promise(r => setTimeout(r, ms));
const log = (...a) => console.log(new Date().toISOString().slice(11, 19), ...a);
try {
  const res = await fetch(base + '/api/session', { method: 'POST', headers: { 'Content-Type': 'application/json', Origin: base }, body: JSON.stringify({ name: 'Kunle' + Math.floor(Math.random() * 900), onboarding: true }) });
  const sid = res.headers.get('set-cookie').match(/sid=([^;]+)/)[1]; log('sid', sid);
  let srvOff = null; const act = async (type, payload) => { if (srvOff === null) { const l = await (await fetch(base + '/api/life?city=lagos', { headers: { Cookie: 'sid=' + sid } })).json(); srvOff = (l.serverTime ?? Date.now()) - Date.now(); } const r = await fetch(base + '/api/action', { method: 'POST', headers: { 'Content-Type': 'application/json', Origin: base, Cookie: 'sid=' + sid }, body: JSON.stringify({ actionId: (Date.now() + srvOff) + ':' + randomUUID(), cityId: 'lagos', type, payload }) }); return r.json(); };
  await fetch(base + '/api/life?city=lagos', { headers: { Cookie: 'sid=' + sid } });
  for (const [t, p] of [['onboarding.look', { look: { body: 'man', hair: 'low-cut', outfit: 'casual', fabric: 'plain', skin: 'skin-4', hairColor: 'black', outfitColor: 'blue', bottomsColor: 'navy' } }], ['onboarding.traits', { traits: ['musical', 'tech-bro-or-sis'] }], ['onboarding.dream', { dream: 'yaba-unicorn' }], ['onboarding.lottery', {}], ['onboarding.home', { lga: 'lagos-island', stay: true }]]) { const r = await act(t, p); if (!r.ok) log('onboard', t, r.code); }
  // Put the life outside home before the page loads, so 'load' lands in the neighbourhood.
  { const r = await act('travel', { id: 'home', mode: 'okada' }); log('travel home', r.ok, r.code || ''); for (let i = 0; i < 40; i++) { await sleep(1000); const l = await (await fetch(base + '/api/life?city=lagos', { headers: { Cookie: 'sid=' + sid } })).json(); if ((l.state ?? l).location === 'home') break; } const d = await act('home.door', { direction: 'outside' }); log('door out', d.ok, d.code || ''); }
  let targets; for (let i = 0; i < 50; i++) { try { targets = await (await fetch(`http://127.0.0.1:${port}/json`)).json(); break; } catch { await sleep(100); } }
  const ws = new WebSocket(targets.find(t => t.type === 'page').webSocketDebuggerUrl); await new Promise(r => ws.onopen = r);
  const bws = new WebSocket((await (await fetch(`http://127.0.0.1:${port}/json/version`)).json()).webSocketDebuggerUrl); await new Promise(r => bws.onopen = r);
  const mk = sock => { let id = 0; const pending = new Map(); sock.addEventListener('message', e => { const m = JSON.parse(e.data); if (m.id && pending.has(m.id)) { pending.get(m.id)(m.result ?? m.error); pending.delete(m.id); } }); return (method, params = {}) => new Promise(r => { pending.set(++id, r); sock.send(JSON.stringify({ id, method, params })); }); };
  const cdp = mk(ws), bcdp = mk(bws);
  const u = new URL(base);
  await cdp('Network.enable'); await cdp('Network.setCookie', { name: 'sid', value: sid, domain: u.hostname, path: '/', httpOnly: true });
  await cdp('Runtime.enable'); await cdp('Page.enable');
  ws.addEventListener('message', e => { const m = JSON.parse(e.data); if (m.method === 'Page.frameNavigated' && !m.params.frame.parentId) { log('NAVIGATED', m.params.frame.url); if (throttle > 1) cdp('Emulation.setCPUThrottlingRate', { rate: throttle }); } if (m.method === 'Runtime.consoleAPICalled' && process.env.PROBE && m.params.args[0]?.value?.startsWith?.(process.env.PROBE)) log('CONSOLE', m.params.args.map(x => x.value).join(' ')); if (m.method === 'Runtime.exceptionThrown') log('EXC', (m.params.exceptionDetails.exception?.description || m.params.exceptionDetails.text || '').slice(0, 300)); });
  await cdp('Emulation.setDeviceMetricsOverride', { width: 1280, height: 800, deviceScaleFactor: 1, mobile: false });
  if (throttle > 1) await cdp('Emulation.setCPUThrottlingRate', { rate: throttle });
  await cdp('Page.addScriptToEvaluateOnNewDocument', { source: `(() => {
    const WS = window.WebSocket; window.WebSocket = class extends WS { constructor(u, p) { super(u, p); if (String(p).includes('vite-hmr')) { const add = this.addEventListener.bind(this); this.addEventListener = (type, fn, o) => add(type, type === 'message' ? (ev => { if (/"type":"(full-reload|update|prune)"/.test(ev.data)) { console.timeStamp('hmr-dropped'); window.__hmrDropped = (window.__hmrDropped || 0) + 1; return; } fn(ev); }) : fn, o); } } };
    let saved = null; try { saved = JSON.parse(sessionStorage.getItem('__hitch') || 'null'); } catch {}
    const F = window.__frames = saved?.frames || []; const P = window.__phases = saved?.phases || ['load']; window.__phaseIx = P.length - 1; window.__loaf = saved?.loaf || []; window.__reloads = (saved?.reloads || []);
    if (saved) { window.__reloads.push(P[P.length - 1]); F.push(performance.now(), -1, P.length - 1, 0); }
    addEventListener('pagehide', () => { try { sessionStorage.setItem('__hitch', JSON.stringify({ frames: F, phases: P, loaf: window.__loaf, reloads: window.__reloads })); } catch {} });
    window.__setPhase = n => { P.push(n); window.__phaseIx = P.length - 1; console.timeStamp('phase:' + n + '@' + performance.now().toFixed(2)); };

    window.__sleep = ms => new Promise(r => setTimeout(r, ms));
    window.__act = async (type, payload) => { const l = await (await fetch('/api/life?city=lagos', { credentials: 'same-origin' })).json(); const off = (l.serverTime ?? Date.now()) - Date.now();
      return (await fetch('/api/action', { method: 'POST', credentials: 'same-origin', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ actionId: (Date.now() + off) + ':' + crypto.randomUUID(), cityId: 'lagos', type, payload }) })).json(); };
    window.__loc = () => fetch('/api/life?city=lagos', { credentials: 'same-origin' }).then(r => r.json()).then(l => (l.state ?? l).location);
    window.__waitLoc = async (want, n = 60) => { for (let i = 0; i < n; i++) { await __sleep(1000); if ((await __loc()) === want) return true; } return false; };
    window.__skip = async () => { for (let i = 0; i < 8; i++) { const b = [...document.querySelectorAll('button')].find(e => /skip tour|not now/i.test(e.textContent)); if (b) { b.click(); await __sleep(300); } else break; await __sleep(300); } };
    window.__clean = () => { const b = [...document.querySelectorAll('button')].find(e => /^Clean screen/.test(e.getAttribute('aria-label') || '')); if (b && b.getAttribute('aria-pressed') !== 'true') b.click(); };
    window.__vloc = () => window.__jaw?.venue?.diagnostics?.()?.location;
    window.__waitV = async (want, n = 60) => { for (let i = 0; i < n * 4; i++) { await __sleep(250); if (__vloc() === want) return true; } return false; };
    window.__stopped = async (n = 30) => { await __sleep(400); for (let i = 0; i < n * 4; i++) { const a = __jaw.venue.diagnostics().avatar; if (!a?.moving) return true; await __sleep(250); } return false; };
    window.__wander = async (ms, step = 12) => { const v = __jaw.venue, end = performance.now() + ms; let k = 0; const dirs = [[1,0],[0,1],[-1,0],[0,-1]]; while (performance.now() < end) { const p = v.diagnostics().avatar; const [dx, dz] = dirs[k++ % 4]; if (!v.walkTo(p.x + dx * step, p.z + dz * step)) { await __sleep(200); continue; } await __stopped(Math.max(1, (end - performance.now()) / 1000)); } };
    let drew = 0; for (const C of [window.WebGL2RenderingContext, window.WebGLRenderingContext]) { if (!C) continue; const clear = C.prototype.clear; C.prototype.clear = function (m) { if (this.canvas && this.canvas.width > 64) drew = 1; return clear.call(this, m); }; }
    let last = 0; const f = t => { const now = performance.now(); if (last) F.push(now, now - last, window.__phaseIx, drew); drew = 0; last = now; requestAnimationFrame(f); }; requestAnimationFrame(f);
    try { new PerformanceObserver(l => { for (const e of l.getEntries()) if (e.duration > 33) window.__loaf.push({ t: e.startTime, d: e.duration, ph: window.__phaseIx, block: e.blockingDuration, render: e.renderStart ? e.startTime + e.duration - e.renderStart : 0, style: e.styleAndLayoutStart ? e.startTime + e.duration - e.styleAndLayoutStart : 0, scripts: e.scripts.slice().sort((a, b) => b.duration - a.duration).slice(0, 4).map(s => ({ d: Math.round(s.duration), inv: s.invoker, fn: s.sourceFunctionName, url: (s.sourceURL || '').replace(location.origin, '') + ':' + s.sourceCharPosition, fl: Math.round(s.forcedStyleAndLayoutDuration) })) }); }).observe({ type: 'long-animation-frame', buffered: true }); } catch {}
  })()` });
  const run = async expr => { const r = await cdp('Runtime.evaluate', { expression: expr, awaitPromise: true, returnByValue: true }); if (r.exceptionDetails) log('eval error', r.exceptionDetails.exception?.description?.slice(0, 300)); return r.result?.value; };
  const shot = async name => { const r = await cdp('Page.captureScreenshot', { format: 'png' }); writeFileSync(`${prefix}-${name}.png`, Buffer.from(r.data, 'base64')); };
  let traceDone;
  if (TRACE) {
    const done = new Promise(r => traceDone = r);
    bws.addEventListener('message', e => { const m = JSON.parse(e.data); if (m.method === 'Tracing.tracingComplete') done.then; if (m.method === 'Tracing.tracingComplete') traceDone(m.params.stream); });
    traceDone.p = done;
    log('tracing start', JSON.stringify(await bcdp('Tracing.start', { transferMode: 'ReturnAsStream', traceConfig: { recordMode: 'recordAsMuchAsPossible', includedCategories: ['devtools.timeline', 'v8.execute', 'disabled-by-default-devtools.timeline', 'gpu', 'v8', 'disabled-by-default-v8.cpu_profiler', 'blink.user_timing'], excludedCategories: ['toplevel', 'toplevel.flow', 'mojom', 'cc', 'benchmark', 'disabled-by-default-devtools.timeline.frame'] } })));
  }
  const t0 = Date.now();
  await cdp('Page.navigate', { url: base + '/?diagnostics' });

  const ONLY = process.env.ONLY ? new RegExp(process.env.ONLY) : null; const phase = async (name, js) => { if (ONLY && !ONLY.test(name)) return; if (throttle > 1) await cdp('Emulation.setCPUThrottlingRate', { rate: throttle }); await run(`__setPhase(${JSON.stringify(name)})`); const tt = Date.now(); const v = js ? await run(js) : undefined; log('phase', name, ((Date.now() - tt) / 1000).toFixed(1) + 's', v === undefined ? '' : JSON.stringify(v).slice(0, 200)); await shot(name); return v; };
  // load: until the venue has rendered the neighbourhood and settles
  for (let i = 0; i < 60; i++) { await sleep(500); if (await run(`!!window.__setPhase`)) break; }
  if (throttle > 1) await cdp('Emulation.setCPUThrottlingRate', { rate: throttle }); // a new renderer process after the navigation does not keep the override
  if (throttle > 1) setInterval(() => cdp('Emulation.setCPUThrottlingRate', { rate: throttle }), 300).unref?.(); // the override is dropped now and then (a renderer swap): keep it on
  log('load', await run(`(async () => { await __waitV('neighbourhood', 60); await __sleep(3000); await __skip(); __clean(); await __sleep(2000); return __vloc(); })()`)); await shot('load');
  await phase('nbh-idle', `(async () => { await __sleep(4000); return __vloc(); })()`);
  await phase('nbh-walk', `(async () => { await __wander(20000); return __jaw.venue.diagnostics().avatar; })()`);
  if (process.env.SHORT) { await run(`__setPhase('end')`); } else {
  await phase('home-enter', `(async () => { const ok = __jaw.venue.walkHomeDoor(); const r = await __waitV('home', 30); if (!r) { await __act('home.door', { direction: 'inside' }); await __waitV('home', 20); } await __sleep(5000); return { ok, at: __vloc() }; })()`);
  await phase('home-exit', `(async () => { await __act('home.door', { direction: 'outside' }); const r = await __waitV('neighbourhood', 30); await __sleep(5000); return { r, at: __vloc() }; })()`);
  await phase('travel-venue', `(async () => { let t, id; for (id of (window.__venues || ['market', 'i-fitness', 'mosque', 'quilox'])) { t = await __act('travel', { id, mode: 'okada' }); if (t.ok) break; } if (!t.ok) return { fail: t.reason }; const r = await __waitV(id, 90); await __sleep(6000); await __skip(); __clean(); return { id, r, at: __vloc() }; })()`);
  await phase('venue-walk', `(async () => { await __wander(20000, 10); return __vloc(); })()`);
  await phase('map', `(async () => { try { __jaw.shell.open('map'); } catch (e) { return String(e); } await __sleep(6000); return __jaw.map ? 'map' : 'nomap'; })()`);
  await phase('map-close', `(async () => { try { __jaw.shell.close(); } catch (e) {} await __sleep(3000); return __vloc(); })()`);
  await phase('travel-home', `(async () => { await __act('travel', { id: 'home', mode: 'okada' }); await __waitLoc('home', 60); await __act('home.door', { direction: 'outside' }); const r = await __waitV('neighbourhood', 40); await __sleep(4000); await __skip(); return { r, at: __vloc() }; })()`);
  await phase('street-enter', `(async () => { const w = __jaw.venue.walkStreetGate(); const r = await __waitV('city-street', 60); await __sleep(6000); await __skip(); __clean(); return { w, r, at: __vloc() }; })()`);
  await phase('street-walk', `(async () => { const a = __jaw.venue.diagnostics().avatar; let moved = 0; for (const [dx, dz] of [[30,0],[0,30],[-30,0],[0,-30],[30,0]]) { if (moved >= 60) break; const p = __jaw.venue.diagnostics().avatar; if (!__jaw.venue.walkTo(p.x + dx, p.z + dz)) continue; await __stopped(30); const q = __jaw.venue.diagnostics().avatar; moved += Math.hypot(q.x - p.x, q.z - p.z); } return { moved: Math.round(moved), at: __vloc() }; })()`);
  await run(`__setPhase('end')`); }
  const data = await run(`({ stride: 4, frames: Array.from(window.__frames), phases: window.__phases, loaf: window.__loaf, reloads: window.__reloads })`);
  writeFileSync(`${prefix}-frames.json`, JSON.stringify(data));
  log('session', ((Date.now() - t0) / 1000).toFixed(0) + 's', 'frames', data.frames.length / 3);
  if (TRACE) {
    log('tracing end', JSON.stringify(await bcdp('Tracing.end'))); const stream = await traceDone.p; log('stream', stream); let tot = 0; const out = createWriteStream(`${prefix}-trace.json`);
    for (;;) { const r = await bcdp('IO.read', { handle: stream, size: 1 << 20 }); if (!r || r.code) { log('io err', JSON.stringify(r)); break; } out.write(r.base64Encoded ? Buffer.from(r.data, 'base64') : r.data); tot += r.data.length; if (tot % (64 << 20) < (1 << 20)) log('read', tot >> 20, 'MB'); if (r.eof) break; }
    await new Promise(r => out.end(r)); await bcdp('IO.close', { handle: stream }); log('trace written', tot >> 20, 'MB');
  }
  ws.close(); bws.close();
} finally { chrome.kill(); }
