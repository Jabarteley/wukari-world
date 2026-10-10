// Bundles the proof page and serves it with the body assets on a local port (default 4350). Nothing here touches the game build.
//   node --experimental-strip-types scripts/body/proof/serve.ts [--port 4350]
import { createServer } from 'node:http';
import type { Server } from 'node:http';
import { readFile } from 'node:fs/promises';
import { extname, join, resolve } from 'node:path';
import { build } from 'esbuild';
import { REPO } from './body-data.ts';

const TYPES: Record<string, string> = { '.html': 'text/html', '.js': 'text/javascript', '.glb': 'model/gltf-binary', '.png': 'image/png', '.jpg': 'image/jpeg', '.css': 'text/css', '.json': 'application/json' };

export async function bundlePage(page = 'page'): Promise<string> {
  const out = await build({
    entryPoints: [join(REPO, 'scripts', 'body', 'proof', page, 'main.ts')], bundle: true, write: false, format: 'esm', target: 'es2022', minify: false, sourcemap: false,
    logLevel: 'error', define: { 'import.meta.vitest': 'undefined' },
    alias: { '@proof-assets': join(REPO, 'scripts', 'body', 'proof', 'assets') },
  });
  return out.outputFiles[0]!.text;
}

export async function serveProof(port: number, page = 'page', assets2 = join(REPO, 'scripts', 'body', 'proof', 'assets2')): Promise<Server> {
  const js = await bundlePage(page);
  const html = await readFile(join(REPO, 'scripts', 'body', 'proof', page, 'index.html'), 'utf8');
  const roots: [string, string][] = [['/body/', join(REPO, 'src', 'scene', 'body', 'assets')], ['/a/', join(REPO, 'scripts', 'body', 'proof', 'assets')], ['/n/', assets2]];
  const server = createServer(async (req, res) => {
    const url = new URL(req.url ?? '/', 'http://localhost');
    if (url.pathname === '/' || url.pathname === '/index.html') { res.setHeader('content-type', TYPES['.html']!); res.end(html); return; }
    if (url.pathname === '/page.js') { res.setHeader('content-type', TYPES['.js']!); res.end(js); return; }
    for (const [prefix, dir] of roots) {
      if (url.pathname.startsWith(prefix)) {
        const file = resolve(dir, decodeURIComponent(url.pathname.slice(prefix.length)));
        if (!file.startsWith(dir)) break;
        try { const data = await readFile(file); res.setHeader('content-type', TYPES[extname(file)] ?? 'application/octet-stream'); res.end(data); return; } catch { break; }
      }
    }
    res.statusCode = 404; res.end('not found');
  });
  await new Promise<void>((done) => server.listen(port, '127.0.0.1', done));
  return server;
}

if (process.argv[1]?.endsWith('serve.ts')) {
  const at = process.argv.indexOf('--port');
  const port = at >= 0 ? Number(process.argv[at + 1]) : 4350;
  const pageAt = process.argv.indexOf('--page');
  const dirAt = process.argv.indexOf('--assets');
  await serveProof(port, pageAt >= 0 ? process.argv[pageAt + 1] : 'page', dirAt >= 0 ? process.argv[dirAt + 1] : undefined);
  console.log(`proof page on http://127.0.0.1:${port}/`);
}
