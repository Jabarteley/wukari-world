// Takes frames of the character creator page: node --experimental-strip-types scripts/body/proof/shoot-h2.ts <out-dir> <shots.json> <models-dir> [--only prefix] [--port 4481]
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { Browser } from '../../journeys/cdp.ts';
import { serveProof } from './serve.ts';
import { REPO } from './body-data.ts';

const args = process.argv.slice(2);
const opt = (n: string, d: string): string => { const i = args.indexOf(n); return i >= 0 ? args[i + 1]! : d; };
const [outArg, shotsArg, modelsArg] = args;
if (!outArg || !shotsArg || !modelsArg) throw new Error('usage: shoot-h2.ts <out> <shots.json> <models-dir>');
const port = Number(opt('--port', '4481')), only = opt('--only', '');
const out = resolve(outArg); mkdirSync(out, { recursive: true });
const shots = (JSON.parse(readFileSync(shotsArg, 'utf8')) as { name: string; spec: Record<string, unknown> }[]).filter((s) => !only || s.name.startsWith(only));
const server = await serveProof(port, 'page-h2', join(REPO, 'scripts', 'body', 'proof', 'assets3'), resolve(modelsArg));
const browser = await Browser.launch(port + 1);
const done = (): void => { browser.close(); server.close(); };
process.once('SIGTERM', () => { done(); process.exit(1); });
try {
  await browser.setViewport({ width: 1280, height: 800, scale: 1, mobile: false });
  await browser.goto(`http://127.0.0.1:${port}/?shoot=1`); await browser.waitFor('!!window.h2', 120000, 'creator page');
  const facts: Record<string, unknown> = {};
  for (const s of shots) {
    const spec = { width: 1280, height: 800, ...s.spec } as { width: number; height: number; street?: { n: number; seed: number } };
    await browser.setViewport({ width: spec.width, height: spec.height, scale: 1, mobile: false });
    facts[s.name] = await browser.eval(spec.street ? `window.h2.street(${spec.street.n}, ${spec.street.seed}, ${spec.width}, ${spec.height}).then((r)=>{window.h2.render();return r})` : `window.h2.wall(${JSON.stringify(spec)}).then((r)=>{window.h2.render();return r})`);
    await browser.eval('window.h2.render()');
    const file = join(out, `${s.name}.png`); await browser.screenshot(file); console.log('saved', file);
  }
  writeFileSync(join(out, `frame-facts-${only || 'all'}.json`), JSON.stringify(facts));
} finally { done(); }
