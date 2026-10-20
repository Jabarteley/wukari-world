import { defineConfig } from 'vite';
import vue from '@vitejs/plugin-vue';
import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { resolve } from 'node:path';

const root = fileURLToPath(new URL('../../', import.meta.url));
const mode = process.env.WUKARI_PREVIEW_MODE ?? 'boundary-context';
if (!['boundary-context', 'foundation', 'offline'].includes(mode)) throw new Error('WUKARI_PREVIEW_MODE must be boundary-context, foundation or offline');
const offline = resolve(process.env.WUKARI_OFFLINE_DIR ?? `${root}.cache/wukari/offline`);
if (mode === 'offline' && !offline.startsWith(resolve(root, '.cache/wukari') + '/')) throw new Error('Offline directory must be under .cache/wukari');
export default defineConfig({
  root: `${root}src/wukari/preview`,
  plugins: [vue(), {
    name: 'wukari-local-dataset',
    configureServer(server) {
      const routes: Record<string, string> = {
        '/dataset.json': mode === 'offline' ? `${offline}/dataset.json` : mode === 'foundation' ? `${root}.cache/wukari/dataset.json` : `${root}data/wukari/verified/context.dataset.json`,
        '/boundary.geojson': `${root}data/wukari/verified/wukari-adm2.geojson`,
        '/coverage.json': mode === 'offline' ? `${offline}/coverage.json` : `${root}data/wukari/verified/coverage.json`,
        '/provenance.json': mode === 'offline' ? `${offline}/provenance.json` : `${root}data/wukari/verified/provenance.json`,
      };
      server.middlewares.use(async (req, res, next) => {
        const path = routes[new URL(req.url ?? '/', 'http://localhost').pathname];
        if (!path) { next(); return; }
        if (req.method !== 'GET' && req.method !== 'HEAD') { res.statusCode = 405; res.end(); return; }
        try {
          const bytes = await readFile(path);
          res.setHeader('Content-Type', 'application/json'); res.setHeader('Cache-Control', 'no-store');
          res.setHeader('Content-Length', bytes.length); res.end(req.method === 'HEAD' ? undefined : bytes);
        } catch {
          res.statusCode = 503; res.end(mode === 'foundation' ? 'Generate the explicitly synthetic foundation fixture first.' : 'Requested source dataset missing. Restore the verified context or run the offline importer; no synthetic fallback is served.');
        }
      });
    },
  }],
  server: { host: '127.0.0.1', port: 5194, strictPort: true, fs: { allow: [root] } },
  build: { outDir: `${root}dist/wukari-preview`, emptyOutDir: true },
});
