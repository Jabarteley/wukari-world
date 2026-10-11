// @ts-nocheck -- offline build helper
// Description of one whole character file for the roster page: node make-whole-meta.mjs <face.json> <pj.json> <regions.json> <skeleton> <out.json> <mask-file>
import { readFileSync, writeFileSync } from 'node:fs';
const [face, pj, regions, skeleton, out, mask] = process.argv.slice(2);
const f = JSON.parse(readFileSync(face, 'utf8')), p = JSON.parse(readFileSync(pj, 'utf8')), r = JSON.parse(readFileSync(regions, 'utf8'));
const R = (a) => (a ? a.map((v) => +v.toFixed(4)) : null);
writeFileSync(out, JSON.stringify({ height: p.height, skeleton, sourceRig: 'pro', mask,
  eyes: { eyeL: R(f.eyeL), eyeR: R(f.eyeR), a: +((f.eyeAL + f.eyeAR) / 2).toFixed(4), b: +((f.eyeBL + f.eyeBR) / 2).toFixed(4), skin: R(f.skinCheek), iris: f.iris },
  refs: { skin: R(r.skinRef), top: R(r.refTop), bottom: R(r.refBottom), shoes: R(r.refShoes) }, counts: { top: r.countTop, bottom: r.countBottom, shoes: r.countShoes, skin: r.countSkin } }));
