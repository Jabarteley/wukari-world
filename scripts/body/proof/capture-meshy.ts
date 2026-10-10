// Drives page4 in one headless Chrome (one local server, one browser) and saves the screenshots and numbers.
//   node --experimental-strip-types scripts/body/proof/capture-meshy.ts <out-dir> <models-dir> [--set test|all|five|views|motion|face|size|numbers] [--port 4450] [--chrome-port 4451]
import { mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { Browser } from '../../journeys/cdp.ts';
import { serveProof } from './serve.ts';
import { REPO } from './body-data.ts';

const args = process.argv.slice(2);
const opt = (n: string, d: string): string => { const i = args.indexOf(n); return i >= 0 ? args[i + 1]! : d; };
const out = args[0]!, models = args[1]!;
const port = Number(opt('--port', '4450')), chromePort = Number(opt('--chrome-port', '4451'));
const set = opt('--set', 'test');
const want = (n: string): boolean => set === 'all' || set === n;
mkdirSync(out, { recursive: true });
const server = await serveProof(port, 'page4', join(REPO, 'scripts', 'body', 'proof', 'assets3'), models);
const browser = await Browser.launch(chromePort);
const cleanup = (): void => { browser.close(); server.close(); };
process.once('SIGTERM', () => { cleanup(); process.exit(1); });
const DESKTOP = { width: 1280, height: 800, scale: 1, mobile: false }, PHONE = { width: 390, height: 844, scale: 1, mobile: true };
const numbers: Record<string, unknown> = {};
try {
  await browser.setViewport(DESKTOP);
  await browser.goto(`http://127.0.0.1:${port}/`);
  await browser.waitFor('!!window.proof', 30000, 'the proof page');
  const call = (fn: string, ...a: unknown[]): Promise<any> => browser.eval(`window.proof.${fn}(${a.map((x) => JSON.stringify(x)).join(',')})`);
  await call('init');
  console.log('loaded', await call('loaded'));
  let prefix = 'd';
  const save = async (name: string, clip?: { x: number; y: number; width: number; height: number }): Promise<void> => {
    const file = join(out, `${prefix}-${name}.png`);
    if (clip) { const s = await browser.send('Page.captureScreenshot', { format: 'png', clip: { ...clip, scale: 1 } }); writeFileSync(file, Buffer.from(s.data, 'base64')); } else await browser.screenshot(file);
    console.log('saved', `${prefix}-${name}`);
  };
  const shot = async (name: string, spec: Record<string, unknown>, after?: () => Promise<void>): Promise<void> => {
    const vp = browser.viewport;
    await call('setup', { width: vp.width, height: vp.height, ...spec });
    if (after) await after();
    await call('render');
    await save(name);
  };
  const ALL = ['old', 'p3', 'ais', 'air'];
  if (set === 'test') {
    await shot('test-five', { mode: 'compare', kinds: ['old', 'p3', 'ais'], view: 'front' });
    await shot('test-tq-walk', { mode: 'compare', kinds: ['old', 'p3', 'ais'], view: 'tq', pose: 'walk', phase: 0.25 });
  }
  if (set === 'facefind') {
    for (const name of ['stylised', 'realistic']) {
      if (!(await call('loaded')).includes(`${name}-hero`)) continue;
      const j = await call('joints', name);
      const head = j['Head'] as number[];
      console.log(name, 'head joint', head);
      const rect = [head[0]! - 0.3, head[1]! - 0.05, head[0]! + 0.3, head[1]! + 0.55];
      await call('setup', { mode: 'single', kinds: ['ais'], width: 400, height: 400 });
      const url: string = await call('flatFace', name, rect, 1200);
      writeFileSync(join(out, `facefind-${name}.png`), Buffer.from(url.split(',')[1]!, 'base64'));
      writeFileSync(join(out, `facefind-${name}.json`), JSON.stringify({ rect, head }));
    }
  }
  void ALL; void want; void PHONE;
  writeFileSync(join(out, `numbers-${set}.json`), JSON.stringify(numbers, null, 2));
} finally { cleanup(); }
