import { defineConfig } from 'vite';
import vue from '@vitejs/plugin-vue';
import { fileURLToPath } from 'node:url';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
const root = fileURLToPath(new URL('../../', import.meta.url));
export default defineConfig({
  root: resolve(root, 'src/wukari/play'), publicDir: resolve(root, 'data/wukari/phase81'),
  plugins: [vue(),{name:'wukari-town9-data',configureServer(server){server.middlewares.use((req,res,next)=>{const file=req.url?.split('?')[0]?.slice(1);if(!['town9.json','places9.json','phase9-data.md'].includes(file??''))return next();res.setHeader('Content-Type',file==='phase9-data.md'?'text/plain; charset=utf-8':'application/json');res.end(readFileSync(resolve(root,'data/wukari/phase9',file==='phase9-data.md'?'README.md':file!)));});},generateBundle(){this.emitFile({type:'asset',fileName:'phase9-data.md',source:readFileSync(resolve(root,'data/wukari/phase9/README.md'))});for(const file of ['town9.json','places9.json'])this.emitFile({type:'asset',fileName:file,source:readFileSync(resolve(root,'data/wukari/phase9',file))});}}], server: { host: '127.0.0.1', port: 5196, strictPort: true, fs: { allow: [root] } },
  build: { outDir: resolve(root, 'dist/wukari-play'), emptyOutDir: true },
});
