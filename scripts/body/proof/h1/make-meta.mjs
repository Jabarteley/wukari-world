// @ts-nocheck -- offline build helper for the figure proof, run by hand; reads untyped JSON
// Writes the metadata the gallery page reads next to a packed figure: node make-meta.mjs <face.json> <joints-parts.json> <skeleton> <out.json> [mask-file] [skin-ref r,g,b]
import { readFileSync, writeFileSync } from 'node:fs';
const [face, parts, skeleton, out, mask, skinRef] = process.argv.slice(2);
const f = JSON.parse(readFileSync(face, 'utf8')), p = JSON.parse(readFileSync(parts, 'utf8'));
const meta = {
  height: p.height, skeleton, sourceRig: 'pro',
  eyes: { eyeL: [f.eyeL[0], f.eyeL[1]], eyeR: [f.eyeR[0], f.eyeR[1]], a: (f.eyeAL + f.eyeAR) / 2, b: (f.eyeBL + f.eyeBR) / 2, skin: f.skinCheek, iris: f.iris },
  skinRef: skinRef ? skinRef.split(',').map(Number) : f.skinCheek,
};
if (mask) meta.mask = mask;
writeFileSync(out, JSON.stringify(meta));
