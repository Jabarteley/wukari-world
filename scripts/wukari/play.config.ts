import {defineConfig} from 'vite';
import vue from '@vitejs/plugin-vue';
import {fileURLToPath} from 'node:url';
import {readFileSync} from 'node:fs';
import {resolve} from 'node:path';
const root=fileURLToPath(new URL('../../',import.meta.url));
const files:Record<string,string>={'town9.json':'data/wukari/phase9/town9.json','places9.json':'data/wukari/phase9/places9.json','phase9-data.md':'data/wukari/phase9/README.md','town10.json':'data/wukari/phase10/town10.json'};
Object.assign(files,{'fuw-play.json':'data/wukari/phase10c/fuw-play.json','fuw-play-data.md':'data/wukari/phase10c/README.md','fuw-osm.json':'data/wukari/phase10b/fuw-osm.json','fuw-open.json':'data/wukari/phase10b/fuw-open.json','fuw-data.md':'data/wukari/phase10b/README.md','places10b.json':'data/wukari/phase10b/places10b.json'});
export default defineConfig({
 root:resolve(root,'src/wukari/play'),publicDir:resolve(root,'data/wukari/phase81'),
 plugins:[vue(),{name:'wukari-local-data',configureServer(server){server.middlewares.use((req,res,next)=>{const name=req.url?.split('?')[0]?.slice(1),path=files[name??''];if(!path)return next();res.setHeader('Content-Type',name?.endsWith('.md')?'text/plain; charset=utf-8':'application/json');res.end(readFileSync(resolve(root,path)));});},generateBundle(){for(const [file,path]of Object.entries(files))this.emitFile({type:'asset',fileName:file,source:readFileSync(resolve(root,path))});}}],
 server:{host:'127.0.0.1',port:5196,strictPort:true,fs:{allow:[root]}},build:{outDir:resolve(root,'dist/wukari-play'),emptyOutDir:true}
});
