// Clicks through the live creator with real input events: every button in every group, both ends of every slider (by click and by drag), Random twenty times,
// every move and mood; reports page errors and takes screenshots at 1280x800 and 390x844.
//   node --experimental-strip-types scripts/body/proof/test-creator.ts <out-dir> <models-dir> [--port 4493]
import { mkdirSync, writeFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { Browser, sleep } from '../../journeys/cdp.ts';
import { serveProof } from './serve.ts';
import { REPO } from './body-data.ts';

const args = process.argv.slice(2);
const opt = (n: string, d: string): string => { const i = args.indexOf(n); return i >= 0 ? args[i + 1]! : d; };
const VW = Number(opt('--w', '1280')), VH = Number(opt('--h', '800')), PHONE = opt('--phone', '1') === '1';
const out = resolve(args[0]!), models = resolve(args[1]!), port = Number(opt('--port', '4493'));
mkdirSync(out, { recursive: true });
const server = await serveProof(port, 'page-h2', join(REPO, 'scripts', 'body', 'proof', 'assets3'), models);
const b = await Browser.launch(port + 1);
const report: { clicked: number; sliders: number; random: number; errors: string[]; broken: string[]; notes: string[] } = { clicked: 0, sliders: 0, random: 0, errors: [], broken: [], notes: [] };
const done = (): void => { b.close(); server.close(); };
const settle = async (ms = 900): Promise<void> => { await sleep(ms); for (let i = 0; i < 40; i++) { const busy = await b.eval<boolean>('window.__busy === true'); if (!busy) break; await sleep(150); } };
try {
  await b.setViewport({ width: VW, height: VH, scale: 1, mobile: false });
  await b.goto(`http://127.0.0.1:${port}/`);
  await b.waitFor("!!document.querySelector('#random') && /triangles/.test(document.getElementById('stats').textContent)", 120000, 'the creator');
  await b.eval(`window.__errs = []; addEventListener('error', (e) => window.__errs.push(String(e.message))); addEventListener('unhandledrejection', (e) => window.__errs.push('rejected: ' + String(e.reason && e.reason.message || e.reason)));`);
  const shot = async (name: string): Promise<void> => { await settle(500); await b.screenshot(join(out, `${name}.png`)); };
  const errs = async (where: string): Promise<void> => { const e = await b.eval<string[]>('window.__errs.splice(0)'); for (const x of e) report.errors.push(`${where}: ${x}`); };
  const statsOf = (): Promise<string> => b.eval<string>("document.getElementById('stats').textContent");
  await shot(`creator-${VW}-start`);
  // every button, group by group (the panel is rebuilt after most clicks, so each one is found again by its group and label)
  const labels = await b.eval<{ group: string; text: string; sw: boolean; idx: number }[]>(`[...document.querySelectorAll('#panel .group')].flatMap((g) => { const h = g.querySelector('h2').textContent; return [...g.querySelectorAll('button')].map((bt, idx) => ({ group: h, text: bt.getAttribute('aria-label') || bt.textContent, sw: bt.classList.contains('sw'), idx })); })`);
  for (const l of labels) {
    const found = await b.eval<{ x: number; y: number } | null>(`(() => { const g = [...document.querySelectorAll('#panel .group')].find((x) => x.querySelector('h2').textContent === ${JSON.stringify(l.group)}); if (!g) return null; const bt = [...g.querySelectorAll('button')].find((x) => (x.getAttribute('aria-label') || x.textContent) === ${JSON.stringify(l.text)}); if (!bt) return null; bt.scrollIntoView({ block: 'center' }); const r = bt.getBoundingClientRect(); return { x: r.left + r.width / 2, y: r.top + r.height / 2 }; })()`);
    if (!found) { report.notes.push(`gone after earlier clicks: ${l.group} / ${l.text}`); continue; }
    await b.tapAt(found.x, found.y); report.clicked++; await settle(l.group === 'Move and mood' ? 500 : 800); await errs(`${l.group} / ${l.text}`);
    if (!/triangles/.test(await statsOf())) report.broken.push(`no figure after ${l.group} / ${l.text}`);
  }
  await shot(`creator-${VW}-after-clicks`);
  // sliders: click near each end, then drag across
  const nSliders = await b.eval<number>("document.querySelectorAll('#panel input[type=range]').length");
  for (let i = 0; i < nSliders; i++) {
    const r = await b.eval<{ x: number; y: number; w: number; label: string }>(`(() => { const s = document.querySelectorAll('#panel input[type=range]')[${i}]; s.scrollIntoView({ block: 'center' }); const r = s.getBoundingClientRect(); return { x: r.left, y: r.top + r.height / 2, w: r.width, label: s.getAttribute('aria-label') }; })()`);
    const before = await b.eval<string>(`document.querySelectorAll('#panel input[type=range]')[${i}].value`);
    await b.tapAt(r.x + 4, r.y); await sleep(500); await b.tapAt(r.x + r.w - 4, r.y); await sleep(500);
    await b.send('Input.dispatchMouseEvent', { type: 'mouseMoved', x: r.x + 4, y: r.y }); await b.send('Input.dispatchMouseEvent', { type: 'mousePressed', x: r.x + 4, y: r.y, button: 'left', clickCount: 1 });
    for (let k = 1; k <= 8; k++) await b.send('Input.dispatchMouseEvent', { type: 'mouseMoved', x: r.x + 4 + (r.w - 8) * k / 8, y: r.y, button: 'left', buttons: 1 });
    await b.send('Input.dispatchMouseEvent', { type: 'mouseReleased', x: r.x + r.w - 4, y: r.y, button: 'left', clickCount: 1 });
    await settle(900); const after = await b.eval<string>(`document.querySelectorAll('#panel input[type=range]')[${i}].value`);
    if (before === after) report.broken.push(`slider ${r.label} did not move`);
    report.sliders++; await errs(`slider ${r.label}`);
  }
  await shot(`creator-${VW}-after-sliders`);
  // Random twenty times
  const looks: string[] = [];
  for (let i = 0; i < 20; i++) { await b.click('#random'); await settle(1100); await errs(`random ${i + 1}`); report.random++; looks.push(await b.eval<string>("document.querySelector('.rec').textContent")); if (i === 5) await shot(`creator-${VW}-random`); }
  report.notes.push(`random looks distinct: ${new Set(looks).size} of 20`);
  // move and mood on one look
  for (const t of ['Walk', 'Sit', 'Dance', 'Jog', 'Stand', 'Happy', 'Uneasy', 'Talk', 'Blink', 'Neutral', 'Turn left', 'Turn right', 'Face front']) { await b.click('#panel button', t); await settle(700); await errs(t); report.clicked++; if (t === 'Sit' || t === 'Dance') await shot(`creator-${VW}-${t.toLowerCase()}`); }
  // a drag on the canvas turns the figure
  await b.send('Input.dispatchMouseEvent', { type: 'mousePressed', x: 400, y: 400, button: 'left', clickCount: 1 }); for (let k = 1; k <= 5; k++) await b.send('Input.dispatchMouseEvent', { type: 'mouseMoved', x: 400 + k * 40, y: 400, button: 'left', buttons: 1 }); await b.send('Input.dispatchMouseEvent', { type: 'mouseReleased', x: 600, y: 400, button: 'left', clickCount: 1 });
  await shot(`creator-${VW}-dragged`); await errs('canvas drag');
  if (!PHONE) { writeFileSync(join(out, `creator-test-report-${VW}.json`), JSON.stringify(report, null, 1)); console.log(JSON.stringify(report, null, 1)); done(); process.exit(0); }
  // the phone size
  await b.setViewport({ width: 390, height: 844, scale: 2, mobile: true }); await b.goto(`http://127.0.0.1:${port}/`);
  await b.waitFor("!!document.querySelector('#random') && /triangles/.test(document.getElementById('stats').textContent)", 120000, 'the creator on a phone');
  await b.eval(`window.__errs = []; addEventListener('error', (e) => window.__errs.push(String(e.message)));`);
  await shot('creator-390-start');
  await b.eval("document.getElementById('panel').scrollTop = 600"); await shot('creator-390-scrolled');
  await b.tapAt(...(Object.values((await b.locate('#panel button', 'Walk'))!) as [number, number])); await settle(900); await errs('phone walk');
  await b.tapAt(...(Object.values((await b.locate('#random'))!) as [number, number])); await settle(1200); await errs('phone random');
  await b.eval("document.getElementById('panel').scrollTop = 0"); await shot('creator-390-random');
  const overflow = await b.eval<boolean>("document.documentElement.scrollWidth > innerWidth + 1 || document.getElementById('panel').scrollWidth > document.getElementById('panel').clientWidth + 1");
  if (overflow) report.broken.push('phone layout scrolls sideways');
  await errs('phone');
  writeFileSync(join(out, 'creator-test-report.json'), JSON.stringify(report, null, 1)); console.log(JSON.stringify(report, null, 1));
} finally { done(); }
