// @ts-nocheck -- offline build helper
// Writes the two small description files the creator page reads next to the part files, with every position in the glTF frame (x to the character's left, y up, z forward).
//   node make-part-meta.mjs <work> <name> <male|female> <out-dir> <outfit label> [--ring cx,cy,rx,ry (blender frame)] [--tint 0|1]
import { readFileSync, writeFileSync, statSync } from 'node:fs';
const [work, name, sex, out, label, ...rest] = process.argv.slice(2);
const opt = (n) => { const i = rest.indexOf(n); return i >= 0 ? rest[i + 1] : undefined; };
const J = (p) => JSON.parse(readFileSync(p, 'utf8'));
const seam = J(`${work}/${name}-seam.json`), face = J(`${work}/${name}-face.json`), hi = J(`${work}/${name}-headinfo.json`);
const hr = J(`${work}/${name}-head-regions.json`), br = J(`${work}/${name}-body-regions.json`), pj = J(`${work}/${name}-body-pj.json`);
let ring = seam.ring; if (opt('--ring')) { const [cx, cy, rx, ry] = opt('--ring').split(',').map(Number); ring = { cx, cy, rx, ry }; }
const R = (a) => a.map((v) => +v.toFixed(4));
const g = (p) => [p[0], p[1]];   // landmark pairs are already (x, up)
const cut = seam.cut;
const common = { sex, cutY: cut, ring: { cx: +ring.cx.toFixed(4), cz: +(-ring.cy).toFixed(4), rx: +ring.rx.toFixed(4), rz: +ring.ry.toFixed(4) } };
const head = { id: `${name}-head`, ...common, file: `${name}-head.glb`, mask: `${name}-head-mask.png`, chinY: +hi.chin.toFixed(4), crownY: +hi.crown.toFixed(4), headDown: seam.headDown,
  box: { xmin: +hi.xmin.toFixed(4), xmax: +hi.xmax.toFixed(4), zmin: +(-hi.ymax).toFixed(4), zmax: +(-hi.ymin).toFixed(4) },
  eyes: { eyeL: R(face.eyeL), eyeR: R(face.eyeR), a: +((face.eyeAL + face.eyeAR) / 2).toFixed(4), b: +((face.eyeBL + face.eyeBR) / 2).toFixed(4), skin: R(face.skinCheek), iris: face.iris },
  browL: R(face.browL), browR: R(face.browR), mouth: R(face.mouth), refSkin: R(hr.refSkin) };
const body = { id: `${name}-body`, ...common, file: `${name}-body.glb`, mask: `${name}-body-mask.png`, label, tintable: opt('--tint') !== '0', bodyUp: seam.bodyUp,
  refs: { skin: R(br.skinRef), top: br.refTop && !rest.includes('--no-top') ? R(br.refTop) : null, bottom: br.refBottom && !rest.includes('--no-bottom') ? R(br.refBottom) : null, shoes: br.refShoes ? R(br.refShoes) : null }, height: +pj.height.toFixed(4) };
writeFileSync(`${out}/${name}-head.json`, JSON.stringify(head)); writeFileSync(`${out}/${name}-body.json`, JSON.stringify(body));
console.log('meta', name, JSON.stringify(head.ring), 'chin', head.chinY, 'cut', cut);
