// node ab.mjs <base> <prefix> <before:0|1>  — fixed views (steps-ab.mjs) on the life in $SID; with before=1 the served modules are patched back to the pre-fix code.
import { spawn } from 'node:child_process'; import { writeFileSync, mkdtempSync, readFileSync } from 'node:fs'; import { tmpdir } from 'node:os'; import { join } from 'node:path';
const [base, prefix, before] = process.argv.slice(2); const sid = process.env.SID;
const bin = '/Users/anthonyakpan/.cache/puppeteer/chrome-headless-shell/mac_arm-145.0.7632.77/chrome-headless-shell-mac-arm64/chrome-headless-shell';
const port = 9300 + Math.floor(Math.random() * 500);
const chrome = spawn(bin, [`--remote-debugging-port=${port}`, `--user-data-dir=${mkdtempSync(join(tmpdir(), 'pab-'))}`, '--use-angle=metal', '--enable-gpu', '--ignore-gpu-blocklist', '--hide-scrollbars', 'about:blank'], { stdio: 'ignore' });
const sleep = ms => new Promise(r => setTimeout(r, ms));
const pairs = JSON.parse(readFileSync('/tmp/allworld-hitch/char-pairs.json', 'utf8'));
let patched = {};
try {
  let targets; for (let i = 0; i < 50; i++) { try { targets = await (await fetch(`http://127.0.0.1:${port}/json`)).json(); break; } catch { await sleep(100); } }
  const ws = new WebSocket(targets.find(t => t.type === 'page').webSocketDebuggerUrl); await new Promise(r => ws.onopen = r);
  let id = 0; const pending = new Map(); ws.addEventListener('message', e => { const m = JSON.parse(e.data); if (m.id && pending.has(m.id)) { pending.get(m.id)(m.result ?? m.error); pending.delete(m.id); } });
  const cdp = (method, params = {}) => new Promise(r => { pending.set(++id, r); ws.send(JSON.stringify({ id, method, params })); });
  if (before === '1') {
    ws.addEventListener('message', async e => { const m = JSON.parse(e.data); if (m.method !== 'Fetch.requestPaused') return; const { requestId, request, responseStatusCode, responseHeaders } = m.params;
      const b = await cdp('Fetch.getResponseBody', { requestId }); let body = b.base64Encoded ? Buffer.from(b.body, 'base64').toString('utf8') : b.body; const url = request.url; let n = 0;
      if (url.includes('character-lab/runtime/characters.js')) for (const [cur, old] of pairs) { if (body.includes(cur)) { body = body.replace(cur, old); n++; } }
      else { n = body.split('warmup.hold(').length - 1; body = body.split('warmup.hold(').join('false && warmup.hold('); }
      patched[url.replace(/\?.*/, '').replace(base, '')] = n;
      await cdp('Fetch.fulfillRequest', { requestId, responseCode: responseStatusCode, responseHeaders, body: Buffer.from(body).toString('base64') }); });
    await cdp('Fetch.enable', { patterns: ['characters.js', 'venue-world.ts', 'street/host.ts', 'map3d/map3d.ts'].map(p => ({ urlPattern: `*${p}*`, requestStage: 'Response' })) });
  }
  const u = new URL(base);
  await cdp('Network.enable'); await cdp('Network.setCacheDisabled', { cacheDisabled: true }); await cdp('Network.setCookie', { name: 'sid', value: sid, domain: u.hostname, path: '/', httpOnly: true });
  await cdp('Runtime.enable'); await cdp('Page.enable');
  await cdp('Page.addScriptToEvaluateOnNewDocument', { source: `(() => { const WS = window.WebSocket; window.WebSocket = class extends WS { constructor(u, p) { super(u, p); if (String(p).includes('vite-hmr')) { const add = this.addEventListener.bind(this); this.addEventListener = (type, fn, o) => add(type, type === 'message' ? (ev => { if (/"type":"(full-reload|update|prune)"/.test(ev.data)) return; fn(ev); }) : fn, o); } } }; })()` });
  const run = async expr => { const r = await cdp('Runtime.evaluate', { expression: expr, awaitPromise: true, returnByValue: true }); if (r.exceptionDetails) console.log('eval error', r.exceptionDetails.exception?.description?.slice(0, 300)); return r.result?.value; };
  const shot = async name => { const r = await cdp('Page.captureScreenshot', { format: 'png' }); writeFileSync(`${prefix}-${name}.png`, Buffer.from(r.data, 'base64')); };
  const steps = (await import('/tmp/allworld-probes/steps-ab.mjs')).default;
  await cdp('Emulation.setDeviceMetricsOverride', { width: 1400, height: 800, deviceScaleFactor: 1, mobile: false });
  for (const s of steps) { if (s.size) await cdp('Emulation.setDeviceMetricsOverride', { width: s.size[0], height: s.size[1], deviceScaleFactor: 1, mobile: false }); if (s.nav) { await cdp('Page.navigate', { url: base + s.nav }); await sleep(3000); } if (s.js) { const v = await run(s.js); if (v !== undefined) console.log(s.name, JSON.stringify(v)?.slice(0, 200)); } await sleep(s.wait ?? 900); await shot(s.name); }
  console.log('patched', JSON.stringify(patched));
  ws.close();
} finally { chrome.kill(); }
