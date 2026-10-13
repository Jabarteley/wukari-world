import { readFileSync, writeFileSync } from 'node:fs';
import { createSave, withControl, encodeSave, REQUIRED_ANCHORS, ANCHORS, SKELETON_ID } from './contract.mjs';

const looks = [
  ['woman', 'braids', 'short', 'broad', 'adult', 'kaftan', 'kaftan'],
  ['man', 'locs', 'tall', 'slim', 'elder', 'casual', 'neck-scarf'],
  ['woman', 'lowcut', 'average', 'average', 'mature', 'office', 'wristwatch'],
  ['man', 'afro', 'short', 'average', 'mature', 'kaftan', 'turban'],
  ['woman', 'twists', 'tall', 'broad', 'elder', 'casual', 'hijab-drape'],
  ['man', 'bald', 'average', 'broad', 'adult', 'agbada', 'agbada'],
  ['woman', 'cornrows', 'average', 'slim', 'adult', 'casual', 'sandals'],
];
const fixtures = {};
const index = {
  schemaVersion: 1,
  provenance: 'Original fictional parameter combinations authored in this isolated lane. No real-person reference, photo, scan, inferred race, nationality, health or identity. Adult cosmetic presentation only.',
  semantics: 'Equal, editable starting points; none is an ideal or demographic average. Internal body keys select the existing mesh, not a person’s gender. Skin/hair, morphology, clothes and expression are independent.',
  presets: [],
};
looks.forEach(([body, hair, height, build, ageAppearance, outfit, wearable], i) => {
  let save = createSave({
    body, hair, outfit, fabric: ['plain', 'ankara', 'adire', 'asooke'][i % 4],
    skin: `skin-${i + 1}`, hairColor: ['black', 'brown', 'softblack'][i % 3],
    outfitColor: ['blue', 'cream', 'teal'][i % 3], bottomsColor: 'navy',
    accessories: [], wearables: [wearable], appearance: { height, build, ageAppearance },
  });
  const sign = i % 2 ? -1 : 1;
  for (const [group, key, value] of [
    ['earLeft', 'protrusion', sign * 0.3], ['earRight', 'protrusion', sign * 0.15],
    ['earLeft', 'lobeLength', (i - 3) / 10], ['nose', 'alarWidth', (3 - i) / 5],
    ['nose', 'projection', sign * 0.25], ['face', 'jawWidth', (i - 3) / 6],
    ['face', 'eyeSpacing', -sign * 0.2], ['face', 'lipFullness', (i - 3) / 7],
    ['body', 'shoulderWidth', sign * 0.2], ['body', 'hipWidth', -sign * 0.2],
    ['body', 'abdominalFullness', (3 - i) / 7],
  ]) save = withControl(save, group, key, value);
  save.design.expression = { preset: ['neutral', 'soft-smile', 'grin', 'focus', 'concern', 'surprise', 'inherit'][i], intensity: 1 };
  const id = `fictional-${String(i + 1).padStart(2, '0')}`;
  fixtures[`${id}.json`] = JSON.parse(encodeSave(save));
  index.presets.push({ id, file: `${id}.json`, label: `Fictional study ${i + 1}`, reviewStatus: 'parameters-only; unrendered; no fit or realism acceptance' });
});
fixtures['index.json'] = index;
fixtures['legacy-v0.json'] = {
  body: 'woman', hair: 'braids', outfit: 'office', fabric: 'plain', skin: 'skin-7',
  hairColor: 'black', outfitColor: 'blue', bottomsColor: 'navy',
  face: 'round', expression: 'grin', accessories: ['glasses'], wearables: ['wristwatch'],
  appearance: { height: 'tall', build: 'broad', ageAppearance: 'elder' },
};
const first = fixtures['fictional-01.json'];
fixtures['prototype-v1.json'] = {
  schemaVersion: 1, legacyLook: first.legacyLook,
  morphology: { ears: first.design.morphology.earLeft, nose: first.design.morphology.nose, face: first.design.morphology.face, body: first.design.morphology.body },
  expression: first.design.expression,
};
// Synthetic four-triangle fixture; neither these hashes nor bindings refer to an actual body.
fixtures['synthetic-hair-bindings.json'] = {
  schemaVersion: 1, frame: 'body-metres-bind-y-up-z-forward', slot: 'hair',
  target: { skeletonId: SKELETON_ID, bodySha256: 'a'.repeat(64), topologyId: 'synthetic-four-triangles@1', topologySha256: 'b'.repeat(64), anchorRevision: 1, triangleCount: 4 },
  bindings: REQUIRED_ANCHORS.hair.map((anchorId, i) => ({ anchorId, joint: ANCHORS[anchorId].joint, triangle: i, barycentric: [0.2, 0.3, 0.5], normalOffsetMetres: 0.002 })),
};
for (const [name, data] of Object.entries(fixtures)) {
  const bytes = `${JSON.stringify(data, null, 2)}\n`, url = new URL(`fixtures/${name}`, import.meta.url);
  if (process.argv.includes('--check')) {
    if (readFileSync(url, 'utf8') !== bytes) throw new Error(`Stale fixture ${name}`);
  } else writeFileSync(url, bytes);
}
console.log(`${Object.keys(fixtures).length} fixtures ${process.argv.includes('--check') ? 'match' : 'written'}`);
