// Clicks through the roster creator with real input events: every card, every swatch and chip, Shuffle twenty times, every move and mood; reports page errors and takes screenshots.
//   node --experimental-strip-types scripts/body/proof/test-roster.ts <out-dir> <models-dir> --w 1280 --h 800 [--port 4561]
import { mkdirSync, writeFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { Browser, sleep } from '../../journeys/cdp.ts';
import { serveProof } from './serve.ts';
import { REPO } from './body-data.ts';

const args = process.argv.slice(2);
const opt = (n: string, d: string): string => { const i = args.indexOf(n); return i >= 0 ? args[i + 1]! : d; };
const out = resolve(args[0]!), models = resolve(args[1]!), port = Number(opt('--port', '4561')), VW = Number(opt('--w', '1280')), VH = Number(opt('--h', '800')), phone = VW < 700;
mkdirSync(out, { recursive: true });
const server = await serveProof(port, 'page-h5', join(REPO, 'scripts', 'body', 'proof', 'assets3'), models);
const b = await Browser.launch(port + 1);
const report: { clicked: number; shuffles: number; errors: string[]; broken: string[]; notes: string[] } = { clicked: 0, shuffles: 0, errors: [], broken: [], notes: [] };
const done = (): void => { b.close(); server.close(); };
const settle = async (ms = 700): Promise<void> => { await sleep(ms); for (let i = 0; i < 60; i++) { if (!(await b.eval<boolean>('window.__busy === true'))) break; await sleep(150); } };
try {
  await b.setViewport({ width: VW, height: VH, scale: phone ? 2 : 1, mobile: phone });
  await b.goto(`http://127.0.0.1:${port}/`);
  await b.waitFor("!!document.getElementById('shuffle') && /triangles/.test(document.getElementById('stats').textContent)", 180000, 'the creator');
  await b.eval(`window.__errs = []; addEventListener('error', (e) => window.__errs.push(String(e.message))); addEventListener('unhandledrejection', (e) => window.__errs.push('rejected: ' + String(e.reason && e.reason.message || e.reason)));`);
  const shot = async (n: string): Promise<void> => { await settle(500); await b.screenshot(join(out, `creator-${VW}-${n}.png`)); };
  const errs = async (w: string): Promise<void> => { for (const x of await b.eval<string[]>('window.__errs.splice(0)')) report.errors.push(`${w}: ${x}`); };
  await shot('start');
  const tap = async (label: string): Promise<boolean> => {
    const pt = await b.eval<{ x: number; y: number } | null>(`(() => { const bt = [...document.querySelectorAll('#panel button, #shuffle')].find((x) => (x.getAttribute('aria-label') || x.textContent) === ${JSON.stringify(label)}); if (!bt) return null; bt.scrollIntoView({ block: 'center' }); const r = bt.getBoundingClientRect(); return { x: r.left + r.width / 2, y: r.top + r.height / 2 }; })()`);
    if (!pt) return false; await b.tapAt(pt.x, pt.y); return true;
  };
  for (const sex of ['Man', 'Woman']) {
    await tap(sex); await settle(900);
    const cards = await b.eval<string[]>("[...document.querySelectorAll('#panel .card span:nth-child(2)')].map((e) => e.textContent)");
    for (const card of cards) {
      await tap(card); report.clicked++; await settle(1000); await errs(`card ${card}`);
      if (!/triangles/.test(await b.eval<string>("document.getElementById('stats').textContent"))) report.broken.push(`no figure after ${card}`);
      const labels = await b.eval<string[]>("[...document.querySelectorAll('#panel .sw, #panel .chip')].map((e) => e.getAttribute('aria-label') || e.textContent)");
      const seen = new Set<string>();
      for (const l of labels) { if (seen.has(l) && !l.startsWith('As made')) continue; seen.add(l); if (['Neutral', 'Happy', 'Uneasy', 'Talk', 'Blink', 'Turn left', 'Turn right', 'Face front'].includes(l)) continue; if (await tap(l)) { report.clicked++; await settle(l === 'Sit' || l === 'Dance' || l === 'Walk' || l === 'Jog' || l === 'Stand' ? 500 : 650); await errs(`${card} / ${l}`); } }
      await tap('Stand'); await settle(300);
    }
    await shot(`after-${sex.toLowerCase()}`);
  }
  for (let i = 0; i < 20; i++) { await tap('Shuffle'); report.shuffles++; await settle(900); await errs(`shuffle ${i + 1}`); if (i === 4) await shot('shuffle'); }
  for (const t of ['Walk', 'Sit', 'Dance', 'Jog', 'Stand', 'Happy', 'Uneasy', 'Talk', 'Blink', 'Neutral', 'Turn left', 'Turn right', 'Face front']) { await tap(t); await settle(600); await errs(t); report.clicked++; if (t === 'Sit' || t === 'Dance') await shot(t.toLowerCase()); }
  await b.eval("document.getElementById('panel').scrollTop = 400"); await shot('scrolled');
  if (await b.eval<boolean>("document.documentElement.scrollWidth > innerWidth + 1 || document.getElementById('panel').scrollWidth > document.getElementById('panel').clientWidth + 1")) report.broken.push('layout scrolls sideways');
  writeFileSync(join(out, `creator-report-${VW}.json`), JSON.stringify(report, null, 1)); console.log(JSON.stringify(report, null, 1));
} finally { done(); }
