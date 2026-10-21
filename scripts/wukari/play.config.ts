import { defineConfig } from 'vite';
import vue from '@vitejs/plugin-vue';
import { fileURLToPath } from 'node:url';
import { resolve } from 'node:path';
const root = fileURLToPath(new URL('../../', import.meta.url));
export default defineConfig({
  root: resolve(root, 'src/wukari/play'), publicDir: resolve(root, 'data/wukari/phase81'),
  plugins: [vue()], server: { host: '127.0.0.1', port: 5196, strictPort: true, fs: { allow: [root] } },
  build: { outDir: resolve(root, 'dist/wukari-play'), emptyOutDir: true },
});
