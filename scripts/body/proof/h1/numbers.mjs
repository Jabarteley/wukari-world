// @ts-nocheck -- offline build helper for the figure proof, run by hand; reads untyped JSON
// Collects the numbers of the packed figures: node numbers.mjs <models-dir> <game-body-dir> <out.json> [<previous-figure.glb>]
import { readFileSync, statSync, existsSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import * as THREE from 'three';
const [models, gameDir, out, previous] = process.argv.slice(2);
const read = (p) => { const b = readFileSync(p); return JSON.parse(b.subarray(20, 20 + b.readUInt32LE(12))); };
function worlds(p) {
  const d = read(p), nodes = d.nodes, par = new Map();
  nodes.forEach((n, i) => (n.children || []).forEach((c) => par.set(c, i)));
  const W = new Map();
  const get = (i) => { if (W.has(i)) return W.get(i); const n = nodes[i]; const m = n.matrix ? new THREE.Matrix4().fromArray(n.matrix) : new THREE.Matrix4().compose(new THREE.Vector3(...(n.translation || [0, 0, 0])), new THREE.Quaternion(...(n.rotation || [0, 0, 0, 1])), new THREE.Vector3(...(n.scale || [1, 1, 1]))); if (par.has(i)) m.premultiply(get(par.get(i))); W.set(i, m); return m; };
  const o = {}; for (const j of d.skins[0].joints) o[nodes[j].name] = { p: new THREE.Vector3().setFromMatrixPosition(get(j)), kids: (nodes[j].children || []).map((c) => nodes[c].name) };
  return o;
}
const facts = (p) => {
  const d = read(p), prim = d.meshes.flatMap((m) => m.primitives);
  const tris = prim.reduce((a, q) => a + d.accessors[q.indices].count / 3, 0);
  const images = (d.images || []).map((im) => { const bv = d.bufferViews[im.bufferView]; return bv.byteLength; });
  const joints = d.skins?.[0]?.joints.length ?? 0, targets = d.meshes[0].extras?.targetNames ?? [];
  return { bytes: statSync(p).size, triangles: Math.round(tris), drawCalls: prim.length, materials: d.materials.length, textureBytes: images, joints, shapeKeys: targets.length, animations: (d.animations || []).length };
};
const res = { figures: {}, restDirectionsDegrees: {} };
for (const who of ['man', 'woman']) {
  res.figures[who] = {};
  for (const lod of ['hero', 'crowd']) {
    const p = join(models, `${who}-${lod}.glb`), meta = JSON.parse(readFileSync(join(models, `${who}-${lod}.json`), 'utf8'));
    const f = facts(p); const maskFile = join(models, meta.mask), maskBytes = statSync(maskFile).size;
    res.figures[who][lod] = { ...f, maskBytes, totalBytesWithMask: f.bytes + maskBytes, height: meta.height, texturePx: lod === 'hero' ? 1024 : 512, maskPx: lod === 'hero' ? 512 : 256 };
  }
  const game = worlds(join(gameDir, `base-body-${who === 'man' ? 'male' : 'female'}.glb`)), mine = worlds(join(models, `${who}-hero.glb`));
  const rows = {};
  for (const n of ['upperarm_l', 'lowerarm_l', 'thigh_l', 'calf_l', 'foot_l']) { const k = game[n].kids[0]; rows[n] = +THREE.MathUtils.radToDeg(game[k].p.clone().sub(game[n].p).angleTo(mine[k].p.clone().sub(mine[n].p))).toFixed(1); }
  const hip = mine.thigh_l.p.y, headTop = JSON.parse(readFileSync(join(models, `${who}-hero.json`), 'utf8')).height;
  res.restDirectionsDegrees[who] = { ...rows, hipHeightOverHeight: +(hip / headTop).toFixed(3), gameHipHeightOverHeight: +(game.thigh_l.p.y / (JSON.parse(readFileSync(join(models, `${who}-hero.json`), 'utf8')).skeleton === 'male' ? 1.78 : 1.65)).toFixed(3) };
}
for (const hair of ['hair-gele', 'hair-braids', 'hair-cap']) { const p = join(models, `${hair}.glb`); if (existsSync(p)) res.figures[hair] = facts(p); }
if (previous && existsSync(previous)) { const f = facts(previous); const w = worlds(previous), g = worlds(join(gameDir, 'base-body-male.glb')); const rows = {}; for (const n of ['upperarm_l', 'lowerarm_l', 'thigh_l', 'calf_l', 'foot_l']) { const k = g[n].kids[0]; rows[n] = +THREE.MathUtils.radToDeg(g[k].p.clone().sub(g[n].p).angleTo(w[k].p.clone().sub(w[n].p))).toFixed(1); } res.previousManFigure = { ...f, restDirectionsDegrees: rows }; }
writeFileSync(out, JSON.stringify(res, null, 1)); console.log(JSON.stringify(res, null, 1));
