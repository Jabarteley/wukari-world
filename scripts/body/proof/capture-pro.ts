// Captures the isolated Pro trial. The supplied directory stays private and is only mounted at /m/ by the local proof server.
// node --experimental-strip-types scripts/body/proof/capture-pro.ts <out> <models> <prefix> --skeleton male [--port 4452] [--chrome-port 4453]
import { mkdirSync, readFileSync, statSync, writeFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { Browser } from '../../journeys/cdp.ts';
import { serveProof } from './serve.ts';
import { REPO } from './body-data.ts';

type Skeleton = 'male' | 'female';
interface Meta { height: number; skeleton: Skeleton; sourceRig: 'pro' }
const args = process.argv.slice(2);
const opt = (name: string, fallback?: string): string => { const at = args.indexOf(name), value = at >= 0 ? args[at + 1] : fallback; if (!value) throw new Error(`Missing ${name}`); return value; };
if (!args[0] || !args[1] || !args[2]) throw new Error('Usage: capture-pro.ts <out> <models> <prefix> --skeleton male|female');
const out = resolve(args[0]), models = resolve(args[1]), prefix = args[2], skeleton = opt('--skeleton') as Skeleton;
const port = Number(opt('--port', '4452')), chromePort = Number(opt('--chrome-port', '4453'));
if (!/^[a-z0-9][a-z0-9-]*$/.test(prefix) || !['male', 'female'].includes(skeleton)) throw new Error('Usage: capture-pro.ts <out> <models> <prefix> --skeleton male|female');
const files: Record<string, { bytes: number; meta: Meta }> = {};
for (const kind of ['hero', 'crowd'] as const) {
  const stem = `${prefix}-${kind}`, glb = join(models, `${stem}.glb`), meta = JSON.parse(readFileSync(join(models, `${stem}.json`), 'utf8')) as Meta;
  if (meta.sourceRig !== 'pro' || meta.skeleton !== skeleton || !Number.isFinite(meta.height) || meta.height <= 0) throw new Error(`${stem}: metadata does not select the requested ${skeleton} Pro skeleton`);
  files[kind] = { bytes: statSync(glb).size, meta };
}
mkdirSync(out, { recursive: true });
const server = await serveProof(port, 'page-pro', join(REPO, 'scripts', 'body', 'proof', 'assets3'), models);
const browser = await Browser.launch(chromePort);
const cleanup = (): void => { browser.close(); server.close(); };
process.once('SIGTERM', () => { cleanup(); process.exit(1); });
const sizes = [{ name: 'desktop', width: 1280, height: 800, mobile: false }, { name: 'phone390', width: 390, height: 844, mobile: true }, { name: 'phone320', width: 320, height: 568, mobile: true }] as const;
try {
  await browser.setViewport({ ...sizes[0], scale: 1 }); await browser.goto(`http://127.0.0.1:${port}/`); await browser.waitFor('!!window.proof', 30000, 'the Pro proof page');
  const call = (fn: string, ...values: unknown[]): Promise<unknown> => browser.eval(`window.proof.${fn}(${values.map((value) => JSON.stringify(value)).join(',')})`);
  await call('init', { prefix, skeleton });
  const shot = async (size: typeof sizes[number], name: string, spec: Record<string, unknown>): Promise<void> => {
    await browser.setViewport({ width: size.width, height: size.height, scale: 1, mobile: size.mobile });
    await call('setup', { width: size.width, height: size.height, ...spec }); await call('render');
    const file = join(out, `${size.name}-${name}.png`); await browser.screenshot(file); console.log('saved', file);
  };
  for (const size of sizes) {
    await shot(size, 'compare-idle-park', { kinds: ['today', 'hero', 'crowd'], pose: 'idle', view: 'tq' });
    await shot(size, 'compare-walk-park', { kinds: ['today', 'hero', 'crowd'], pose: 'walk', phase: 0.28, view: 'tq' });
  }
  await shot(sizes[0], 'compare-dance-park', { kinds: ['today', 'hero', 'crowd'], pose: 'dance', phase: 0.4, view: 'front' });
  for (const kind of ['today', 'hero', 'crowd']) await shot(sizes[0], `${kind}-sit-freedom-park-bench`, { kinds: [kind], pose: 'sit', phase: 0.5, view: 'tq', furniture: true });
  await shot(sizes[1], 'hero-sit-freedom-park-bench', { kinds: ['hero'], pose: 'sit', phase: 0.5, view: 'tq', furniture: true });
  const diagnostics = await call('diagnostics');
  writeFileSync(join(out, `${prefix}-numbers.json`), JSON.stringify({ files, diagnostics, captures: sizes.map(({ name, width, height }) => ({ name, width, height })) }, null, 2));
} finally { cleanup(); }
