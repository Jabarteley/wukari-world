// Takes screenshots of the diagnostic viewer.  node --experimental-strip-types scripts/body/proof/shoot-h1.ts <out-dir> <shots.json> <models-dir> [--page page-h1] [--port 4461]
import { mkdirSync, readFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { Browser } from '../../journeys/cdp.ts';
import { serveProof } from './serve.ts';
import { REPO } from './body-data.ts';

const args = process.argv.slice(2);
const opt = (n: string, d: string): string => { const i = args.indexOf(n); return i >= 0 ? args[i + 1]! : d; };
const [outArg, shotsArg, modelsArg] = args;
if (!outArg || !shotsArg || !modelsArg) throw new Error('usage: shoot-h1.ts <out> <shots.json> <models-dir>');
const page = opt('--page', 'page-h1'), port = Number(opt('--port', '4461')), cport = port + 1;
const out = resolve(outArg); mkdirSync(out, { recursive: true });
const shots = JSON.parse(readFileSync(shotsArg, 'utf8')) as { name: string; spec: Record<string, unknown> }[];
const server = await serveProof(port, page, join(REPO, 'scripts', 'body', 'proof', 'assets3'), resolve(modelsArg));
const browser = await Browser.launch(cport);
const done = (): void => { browser.close(); server.close(); };
process.once('SIGTERM', () => { done(); process.exit(1); });
try {
  await browser.setViewport({ width: 1280, height: 800, scale: 1, mobile: false });
  await browser.goto(`http://127.0.0.1:${port}/`); await browser.waitFor('!!window.h1', 30000, 'page');
  for (const s of shots) {
    const spec = { width: 1280, height: 800, ...s.spec } as { width: number; height: number };
    await browser.setViewport({ width: spec.width, height: spec.height, scale: 1, mobile: false });
    await browser.eval(`window.h1.show(${JSON.stringify(spec)}).then(()=>{window.h1.render();return 1})`);
    await browser.eval('window.h1.render()');
    const file = join(out, `${s.name}.png`); await browser.screenshot(file); console.log('saved', file);
  }
} finally { done(); }
