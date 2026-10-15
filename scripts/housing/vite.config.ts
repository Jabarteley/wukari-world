import { fileURLToPath } from 'node:url';
import { defineConfig } from 'vite';
const root=fileURLToPath(new URL('../../',import.meta.url));
export default defineConfig({root,publicDir:false,resolve:{alias:{'#city-loaders':root+'scripts/housing/city-loaders.ts'}},server:{host:'127.0.0.1',port:4435,strictPort:true,fs:{allow:[root,'/Users/anthonyakpan/Desktop/JoinAllworld']}},build:{outDir:'dist-housing',emptyOutDir:true,assetsInlineLimit:0,rollupOptions:{input:root+'housing-studio.html'}}});
