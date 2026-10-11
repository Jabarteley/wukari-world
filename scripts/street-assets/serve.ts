// Bundles the proof page and serves it with the packed models on a local port (default 4481).
//   node --experimental-strip-types scripts/street-assets/serve.ts <glb-dir> [--port 4481]
import { createServer } from 'node:http';
import type { Server } from 'node:http';
import { readFile } from 'node:fs/promises';
import { dirname, extname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { build } from 'esbuild';

const HERE = dirname(fileURLToPath(import.meta.url));
const TYPES: Record<string, string> = { '.html': 'text/html', '.js': 'text/javascript', '.glb': 'model/gltf-binary', '.png': 'image/png', '.jpg': 'image/jpeg', '.json': 'application/json' };

export async function serveProof(glbDir: string, port: number): Promise<Server> {
  const out = await build({
    entryPoints: [join(HERE, 'page', 'main.ts')], bundle: true, write: false, format: 'esm', target: 'es2022', minify: false, sourcemap: false,
    logLevel: 'error', define: { 'import.meta.vitest': 'undefined' },
  });
  const js = out.outputFiles[0]!.text;
  const html = await readFile(join(HERE, 'page', 'index.html'), 'utf8');
  const root = resolve(glbDir);
  const server = createServer(async (req, res) => {
    const url = new URL(req.url ?? '/', 'http://localhost');
    if (url.pathname === '/' || url.pathname === '/index.html') { res.setHeader('content-type', TYPES['.html']!); res.end(html); return; }
    if (url.pathname === '/page.js') { res.setHeader('content-type', TYPES['.js']!); res.end(js); return; }
    if (url.pathname.startsWith('/g/')) {
      const file = resolve(root, decodeURIComponent(url.pathname.slice(3)));
      if (file.startsWith(root)) {
        try { const data = await readFile(file); res.setHeader('content-type', TYPES[extname(file)] ?? 'application/octet-stream'); res.end(data); return; } catch { /* falls through */ }
      }
    }
    res.statusCode = 404; res.end('not found');
  });
  await new Promise<void>((done) => server.listen(port, '127.0.0.1', done));
  return server;
}
