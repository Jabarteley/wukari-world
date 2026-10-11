// Writes transparent portraits and figure thumbnails of every character and outfit: node --experimental-strip-types scripts/body/proof/shoot-portraits.ts <out-dir> <models-dir> <roster.json> [--port 4591]
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { Browser } from '../../journeys/cdp.ts';
import { serveProof } from './serve.ts';
import { REPO } from './body-data.ts';
const args = process.argv.slice(2);
const out = resolve(args[0]!), models = resolve(args[1]!), roster = JSON.parse(readFileSync(args[2]!, 'utf8')) as Record<string, { outfits: number }>;
const port = Number(args.includes('--port') ? args[args.indexOf('--port') + 1] : 4591);
mkdirSync(out, { recursive: true });
const server = await serveProof(port, 'page-h5', join(REPO, 'scripts', 'body', 'proof', 'assets3'), models);
const b = await Browser.launch(port + 1);
try {
  await b.setViewport({ width: 600, height: 700, scale: 1, mobile: false });
  await b.goto(`http://127.0.0.1:${port}/?shoot=1`); await b.waitFor('!!window.h5', 180000, 'page');
  for (const [id, c] of Object.entries(roster)) for (let k = 0; k <= c.outfits; k++) for (const [kind, w, h, name] of [['head', 256, 256, 'portrait'], ['figure', 160, 320, 'figure']] as const) {
    const url = await b.eval<string>(`window.h5.portrait({id:${JSON.stringify(id)},outfit:${k}}, ${JSON.stringify(kind)}, ${w}, ${h})`);
    writeFileSync(join(out, `${name}-${id}-o${k}.png`), Buffer.from(url.split(',')[1]!, 'base64')); console.log('saved', name, id, k);
  }
} finally { b.close(); server.close(); }
