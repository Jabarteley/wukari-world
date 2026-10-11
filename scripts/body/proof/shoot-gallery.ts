// Takes the gallery frames: node --experimental-strip-types scripts/body/proof/shoot-gallery.ts <out-dir> <shots.json> <models-dir> [--port 4471]
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { Browser } from '../../journeys/cdp.ts';
import { serveProof } from './serve.ts';
import { REPO } from './body-data.ts';

const args = process.argv.slice(2);
const opt = (n: string, d: string): string => { const i = args.indexOf(n); return i >= 0 ? args[i + 1]! : d; };
const [outArg, shotsArg, modelsArg] = args;
if (!outArg || !shotsArg || !modelsArg) throw new Error('usage: shoot-gallery.ts <out> <shots.json> <models-dir>');
const port = Number(opt('--port', '4471')), cport = port + 1, only = opt('--only', '');
const out = resolve(outArg); mkdirSync(out, { recursive: true });
const shots = (JSON.parse(readFileSync(shotsArg, 'utf8')) as { name: string; spec: Record<string, unknown> }[]).filter((s) => !only || s.name.startsWith(only));
const server = await serveProof(port, 'page-h1g', join(REPO, 'scripts', 'body', 'proof', 'assets3'), resolve(modelsArg));
const browser = await Browser.launch(cport);
const done = (): void => { browser.close(); server.close(); };
process.once('SIGTERM', () => { done(); process.exit(1); });
try {
  await browser.setViewport({ width: 1280, height: 800, scale: 1, mobile: false });
  await browser.goto(`http://127.0.0.1:${port}/`); await browser.waitFor('!!window.gal', 90000, 'gallery page');
  await browser.eval('window.gal.init().then(()=>1)');
  const facts: Record<string, unknown> = {};
  for (const s of shots) {
    const spec = { width: 1280, height: 800, ...s.spec } as { width: number; height: number };
    await browser.setViewport({ width: spec.width, height: spec.height, scale: 1, mobile: false });
    await browser.eval(`window.gal.setup(${JSON.stringify(spec)}).then(()=>{window.gal.render();return 1})`);
    await browser.eval('window.gal.render()');
    facts[s.name] = await browser.eval('window.gal.slotFacts()');
    const file = join(out, `${s.name}.png`); await browser.screenshot(file); console.log('saved', file);
  }
  writeFileSync(join(out, 'frame-facts.json'), JSON.stringify({ facts, models: await browser.eval('window.gal.diagnostics()') }, null, 1));
} finally { done(); }
