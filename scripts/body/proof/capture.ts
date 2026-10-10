// Drives the proof page in one headless Chrome (one local server, one browser) and saves the screenshots.
//   node --experimental-strip-types scripts/body/proof/capture.ts <out-dir> [--set quick|all] [--port 4350] [--chrome-port 4351]
import { mkdirSync, rmSync } from 'node:fs';
import { join } from 'node:path';
import { Browser, sleep } from '../../journeys/cdp.ts';
import { serveProof } from './serve.ts';

interface Proof { [k: string]: (...a: unknown[]) => unknown }
const args = process.argv.slice(2);
const opt = (n: string, d: string): string => { const i = args.indexOf(n); return i >= 0 ? args[i + 1]! : d; };
const out = args[0]!.startsWith('--') ? '/tmp/proof-shots' : args[0]!;
const port = Number(opt('--port', '4350')), chromePort = Number(opt('--chrome-port', '4351'));
const set = opt('--set', 'quick');

mkdirSync(out, { recursive: true });
const server = await serveProof(port);
const browser = await Browser.launch(chromePort);
const cleanup = (): void => { browser.close(); server.close(); };
process.once('SIGTERM', () => { cleanup(); process.exit(1); });
try {
  const desktop = { width: 1280, height: 800, scale: 1, mobile: false }, phone = { width: 390, height: 844, scale: 1, mobile: true };
  await browser.setViewport(desktop);
  await browser.goto(`http://127.0.0.1:${port}/`);
  await browser.waitFor('!!window.proof', 20000, 'the proof page');
  const call = (fn: string, ...a: unknown[]): Promise<unknown> => browser.eval(`window.proof.${fn}(${a.map((x) => JSON.stringify(x)).join(',')})`);
  const names = await call('allParts') as string[];
  await call('init', names);
  const shot = async (name: string, spec: Record<string, unknown>, after?: () => Promise<void>): Promise<void> => {
    const vp = browser.viewport;
    await call('setup', { width: vp.width, height: vp.height, ...spec });
    if (after) await after();
    await call('render');
    await browser.screenshot(join(out, `${name}.png`));
    console.log('saved', name);
  };
  if (set === 'debug') {
    await shot('dbg-a', { mode: 'single', look: 'woman-afro', view: 'head' });
    await shot('dbg-happy', { mode: 'single', look: 'woman-afro', view: 'face', mood: 'happy' }, async () => { await call('advance', 0.8); });
    await shot('dbg-aa', { mode: 'single', look: 'woman-afro', view: 'face', mood: 'neutral' }, async () => { await call('setViseme', 'aa', 0.9); await call('advance', 0.4); });
    await shot('dbg-unea', { mode: 'single', look: 'woman-afro', view: 'face', mood: 'uneasy' }, async () => { await call('advance', 1.0); });
    cleanup(); process.exit(0);
  }
  const looks = set === 'quick' ? ['woman-braids'] : ['woman-braids', 'man-lowcut', 'woman-afro', 'man-afro'];
  for (const look of looks) {
    await shot(`${look}-front`, { mode: 'compare', look, view: 'front' });
    await shot(`${look}-face`, { mode: 'compare', look, view: 'face' });
  }
} finally { cleanup(); }
void sleep; void rmSync;
