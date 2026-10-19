import { registerHooks } from 'node:module';
import { readFileSync, appendFileSync, existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { createHash } from 'node:crypto';
import { execFileSync } from 'node:child_process';
const root='/Users/anthonyakpan/work/joinallworld-story/';
const dir='/tmp/phase4-seed-correction-20261019-lg52i_y_/';
const baseline=process.env.PHASE4_BASELINE==='95';
const sha=s=>createHash('sha256').update(s).digest('hex');
registerHooks({load(url,context,next){
 if(!url.startsWith('file:'))return next(url,context);
 const path=fileURLToPath(url);
 if(!path.startsWith(root)||path.includes('/node_modules/')||! /\.(ts|js|json)$/.test(path))return next(url,context);
 const rel=path.slice(root.length), current=readFileSync(path);
 let source=current, original;
 if(baseline){
  original=execFileSync('git',['show','95a878bd:'+rel],{cwd:root,encoding:null,maxBuffer:16*1024*1024});
  source=original;
 }
 appendFileSync(dir+(baseline?'baseline':'current')+'-loaded-source.jsonl',JSON.stringify({pid:process.pid,path:rel,currentSha256:sha(current),loadedSha256:sha(source),baseline,overlaid:baseline&&!source.equals(current)})+'\n');
 if(rel==='src/scene/venue-scenes.ts'){
  let text=source.toString();
  const needle='const cost = runtimeHostCost(true), characterCalls = recipe ? measureRenderCost(group).characters.drawCalls : 0;';
  if(text.split(needle).length!==2)throw Error('admission marker mismatch');
  text=text.replace(needle,needle+' console.log("ADMISSION_DIAGNOSTIC "+JSON.stringify({placed:placed.length,mandatory:mandatory.length,cost,reservation:runtime.reservation,characterCalls,budget:runtimeBudget}));');
  return {format:'module-typescript',shortCircuit:true,source:text};
 }
 if(baseline)return {format:path.endsWith('.json')?'json':path.endsWith('.ts')?'module-typescript':'module',shortCircuit:true,source};
 return next(url,context);
}});
