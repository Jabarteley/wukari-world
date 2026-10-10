// Takes screenshots of the character proof page from a list of shots, in one headless Chrome and one local server.
//   node --experimental-strip-types scripts/body/proof/shots.ts <shots.json> <out-dir> [--assets <dir>] [--port 4350] [--chrome-port 4351]
// A shots file is a JSON array of { name, viewport: 'desktop' | 'phone', spec, calls?: [[method, ...args]], clip? }.
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { Browser } from '../../journeys/cdp.ts';
import { serveProof } from './serve.ts';

interface Shot { name: string; viewport?: 'desktop' | 'phone'; spec: Record<string, unknown>; calls?: unknown[][]; clip?: { x: number; y: number; width: number; height: number }; transparent?: boolean }
const args = process.argv.slice(2);
const opt = (n: string, d: string): string => { const i = args.indexOf(n); return i >= 0 ? args[i + 1]! : d; };
const [shotsFile, out] = args;
if (!shotsFile || !out) throw new Error('usage: shots.ts <shots.json> <out-dir> [--assets <dir>]');
const port = Number(opt('--port', '4350')), chromePort = Number(opt('--chrome-port', '4351'));
const shots = JSON.parse(readFileSync(shotsFile, 'utf8')) as Shot[];
mkdirSync(out, { recursive: true });
const server = await serveProof(port, 'page2', opt('--assets', '') || undefined);
const browser = await Browser.launch(chromePort);
const cleanup = (): void => { browser.close(); server.close(); };
process.once('SIGTERM', () => { cleanup(); process.exit(1); });
const VIEWPORTS = { desktop: { width: 1280, height: 800, scale: 1, mobile: false }, phone: { width: 390, height: 844, scale: 1, mobile: true } };
const numbers: Record<string, unknown> = {};
try {
  await browser.setViewport(VIEWPORTS.desktop);
  await browser.goto(`http://127.0.0.1:${port}/`);
  await browser.waitFor('!!window.proof', 30000, 'the proof page');
  const call = (fn: string, ...a: unknown[]): Promise<any> => browser.eval(`window.proof.${fn}(${a.map((x) => JSON.stringify(x)).join(',')})`);
  const parts = await call('allParts');
  await call('init', parts.n, parts.m);
  numbers['heights'] = await call('heights');
  for (const shot of shots) {
    const vp = VIEWPORTS[shot.viewport ?? 'desktop'];
    await browser.setViewport(vp);
    if (shot.transparent) await browser.send('Emulation.setDefaultBackgroundColorOverride', { color: { r: 0, g: 0, b: 0, a: 0 } });
    await call('setup', { width: vp.width, height: vp.height, ...shot.spec });
    for (const c of shot.calls ?? []) await call(String(c[0]), ...c.slice(1));
    await call('render');
    if (shot.spec['info']) numbers[shot.name] = await call('info');
    if (shot.clip) { const s = await browser.send('Page.captureScreenshot', { format: 'png', clip: { ...shot.clip, scale: 1 } }); writeFileSync(join(out, `${shot.name}.png`), Buffer.from(s.data, 'base64')); }
    else await browser.screenshot(join(out, `${shot.name}.png`));
    if (shot.transparent) await browser.send('Emulation.setDefaultBackgroundColorOverride', {});
    console.log('saved', shot.name);
    if (browser.consoleErrors.length) { console.log('page errors:', browser.consoleErrors.slice(0, 5).join(' | ')); browser.consoleErrors.length = 0; }
  }
  writeFileSync(join(out, 'shots-numbers.json'), JSON.stringify(numbers, null, 2));
} finally { cleanup(); }
