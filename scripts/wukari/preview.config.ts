import { defineConfig } from 'vite';
import vue from '@vitejs/plugin-vue';
import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('../../', import.meta.url));
const mode = process.env.WUKARI_PREVIEW_MODE ?? 'boundary-context';
if (!['boundary-context', 'foundation'].includes(mode)) throw new Error('WUKARI_PREVIEW_MODE must be boundary-context or foundation');
export default defineConfig({
  root: `${root}src/wukari/preview`,
  plugins: [vue(), {
    name: 'wukari-local-dataset',
    configureServer(server) {
      const routes: Record<string, string> = {
        '/dataset.json': mode === 'foundation' ? '.cache/wukari/dataset.json' : 'data/wukari/verified/context.dataset.json',
        '/boundary.geojson': 'data/wukari/verified/wukari-adm2.geojson',
        '/coverage.json': 'data/wukari/verified/coverage.json',
        '/provenance.json': 'data/wukari/verified/provenance.json',
      };
      server.middlewares.use(async (req, res, next) => {
        const path = routes[new URL(req.url ?? '/', 'http://localhost').pathname];
        if (!path) { next(); return; }
        if (req.method !== 'GET' && req.method !== 'HEAD') { res.statusCode = 405; res.end(); return; }
        try {
          const bytes = await readFile(`${root}${path}`);
          res.setHeader('Content-Type', 'application/json'); res.setHeader('Cache-Control', 'no-store');
          res.setHeader('Content-Length', bytes.length); res.end(req.method === 'HEAD' ? undefined : bytes);
        } catch {
          res.statusCode = 503; res.end(mode === 'foundation' ? 'Generate the explicitly synthetic foundation fixture first.' : 'Verified context snapshot missing. Restore/reproduce data/wukari/verified; no synthetic fallback is served.');
        }
      });
    },
  }],
  server: { host: '127.0.0.1', port: 5194, strictPort: true, fs: { allow: [root] } },
  build: { outDir: `${root}dist/wukari-preview`, emptyOutDir: true },
});
