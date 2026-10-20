import { defineConfig } from 'vite';
import vue from '@vitejs/plugin-vue';
import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('../../', import.meta.url));
export default defineConfig({
  root: `${root}src/wukari/preview`,
  plugins: [vue(), {
    name: 'wukari-local-dataset',
    configureServer(server) {
      server.middlewares.use('/dataset.json', async (_req, res) => {
        try {
          const bytes = await readFile(`${root}.cache/wukari/dataset.json`);
          res.setHeader('Content-Type', 'application/json'); res.setHeader('Cache-Control', 'no-store'); res.end(bytes);
        } catch {
          res.statusCode = 503; res.end('Run node scripts/wukari/import.ts --synthetic, or import recorded source data first.');
        }
      });
    },
  }],
  server: { host: '127.0.0.1', port: 5194, strictPort: true, fs: { allow: [root] } },
  build: { outDir: `${root}dist/wukari-preview`, emptyOutDir: true },
});
