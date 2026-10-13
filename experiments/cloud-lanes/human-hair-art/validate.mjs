import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import assert from 'node:assert/strict';
import validator from 'gltf-validator';
const dir=path.resolve(process.argv[2]);
const lane=path.dirname(new URL(import.meta.url).pathname);
assert(dir.startsWith(lane+'/'));
const result={status:'PASS',files:{}};
for(const file of fs.readdirSync(dir).filter(x=>x.endsWith('.glb'))){
 const bytes=fs.readFileSync(path.join(dir,file));
 const validation=await validator.validateBytes(new Uint8Array(bytes),{uri:file});
 assert.equal(validation.issues.numErrors,0,file+JSON.stringify(validation.issues));
 assert.equal(validation.issues.numWarnings,0,file+JSON.stringify(validation.issues));
 assert.equal(bytes.readUInt32LE(0),0x46546c67);assert.equal(bytes.readUInt32LE(8),bytes.length);
 const doc=JSON.parse(bytes.subarray(20,20+bytes.readUInt32LE(12)).toString());
 let triangles=0,vertices=0,primitives=0;
 for(const mesh of doc.meshes)for(const p of mesh.primitives){
  assert.equal(p.mode??4,4);triangles+=doc.accessors[p.indices].count/3;
  vertices+=doc.accessors[p.attributes.POSITION].count;primitives++;
 }
 assert(!doc.skins?.length && !doc.animations?.length);assert(!doc.images?.length);
 for(const m of doc.materials){assert.equal(m.alphaMode??'OPAQUE','OPAQUE');assert.equal(m.doubleSided??false,false)}
 const morphs=doc.meshes.map(m=>({mesh:m.name,targetNames:m.extras?.targetNames??[],targetsPerPrimitive:m.primitives.map(p=>p.targets?.length??0)}));
 for(const m of doc.meshes)for(const p of m.primitives)for(const t of p.targets??[])assert.equal(doc.accessors[t.POSITION].count,doc.accessors[p.attributes.POSITION].count);
 result.files[file]={bytes:bytes.length,sha256:crypto.createHash('sha256').update(bytes).digest('hex'),triangles,vertices,primitives,materialSlots:doc.materials.length,materials:doc.materials,skins:doc.skins?.length??0,morphTargets:morphs.reduce((s,m)=>s+Math.max(...m.targetsPerPrimitive),0),morphs,textures:0,validator:{errors:validation.issues.numErrors,warnings:validation.issues.numWarnings,infos:validation.issues.numInfos,messages:validation.issues.messages}};
}
fs.writeFileSync(path.join(dir,'decoded-validation.json'),JSON.stringify(result,null,2)+'\n');
console.log(JSON.stringify(Object.fromEntries(Object.entries(result.files).map(([name,v])=>[name,{bytes:v.bytes,triangles:v.triangles,primitives:v.primitives,validator:v.validator}]))));
