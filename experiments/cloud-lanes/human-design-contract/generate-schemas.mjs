import { writeFileSync, readFileSync } from 'node:fs';
import { CONTROL_GROUPS, EXPRESSION_PRESETS, ANCHORS, REQUIRED_ANCHORS, SKELETON_ID } from './definitions.mjs';

const object = (properties, required = Object.keys(properties)) => ({ type: 'object', properties, required, additionalProperties: false });
const text = { type: 'string', maxLength: 128 };
const choice = (values) => ({ type: 'string', enum: values });
const scalar = { type: 'number', minimum: -1, maximum: 1 };
const unit = { type: 'number', minimum: 0, maximum: 1 };
const list = (items, maxItems) => ({ type: 'array', items, maxItems, uniqueItems: true });
const sha = { type: 'string', pattern: '^[a-f0-9]{64}$' };
const morphology = Object.fromEntries(Object.entries(CONTROL_GROUPS).map(([group, keys]) => [group, object(Object.fromEntries(keys.map((key) => [key, scalar])))]));
const expression = object({ preset: choice(['inherit', ...Object.keys(EXPRESSION_PRESETS)]), intensity: unit });
// Preserve original strings/indices and omission; the current game's normalizer still resolves these.
const legacyLook = object({
  ...Object.fromEntries(['body', 'hair', 'outfit', 'fabric', 'face', 'expression', 'gender', 'hairstyle'].map((key) => [key, text])),
  ...Object.fromEntries(['skin', 'hairColor', 'outfitColor', 'bottomsColor', 'skinTone', 'seed', 'id'].map((key) => [key, { type: ['string', 'number'], maxLength: 128 }])),
  accessories: list(text, 11), wearables: list(text, 23),
  appearance: object({ height: choice(['short', 'average', 'tall']), build: choice(['slim', 'average', 'broad']), ageAppearance: choice(['adult', 'mature', 'elder']) }, []),
}, []);
const envelope = (name, properties, description) => ({
  $schema: 'https://json-schema.org/draft/2020-12/schema',
  $id: `urn:allworld:experimental:human-design:${name}`,
  title: name, description, ...object(properties),
});
const schemas = {
  'human-design-v2.schema.json': envelope('save-v2', {
    schemaVersion: { type: 'integer', const: 2 }, legacyLook,
    design: object({ controlSpace: { type: 'string', const: 'legacy-relative-v1' }, morphology: object(morphology), expression }),
  }, 'Isolated proposal. All morphology values are residual normalized controls after legacy appearance. Zero preserves it. Ranges are authoring domains, not proven deformation limits. No inventory authority.'),
  'human-design-v1.schema.json': envelope('prototype-save-v1', {
    schemaVersion: { type: 'integer', const: 1 }, legacyLook,
    morphology: object({ ears: morphology.earLeft, nose: morphology.nose, face: morphology.face, body: morphology.body }), expression,
  }, 'Only a hypothetical earlier version of this experiment; never claimed to be a shipped Allworld save.'),
  'anchor-bindings-v1.schema.json': envelope('anchor-bindings-v1', {
    schemaVersion: { type: 'integer', const: 1 },
    frame: { type: 'string', const: 'body-metres-bind-y-up-z-forward' },
    slot: choice(Object.keys(REQUIRED_ANCHORS)),
    target: object({
      skeletonId: { type: 'string', const: SKELETON_ID }, bodySha256: sha,
      topologyId: { type: 'string', maxLength: 80, pattern: '^[a-z0-9][a-z0-9._@-]+$' },
      topologySha256: sha, anchorRevision: { type: 'integer', minimum: 1, maximum: 65535 },
      triangleCount: { type: 'integer', minimum: 1, maximum: 100000 },
    }),
    bindings: { type: 'array', minItems: 1, maxItems: 14, items: object({
      anchorId: choice(Object.keys(ANCHORS)), joint: choice([...new Set(Object.values(ANCHORS).map((a) => a.joint))]),
      triangle: { type: 'integer', minimum: 0, maximum: 99999 },
      barycentric: { type: 'array', minItems: 3, maxItems: 3, items: unit },
      normalOffsetMetres: { type: 'number', minimum: 0, maximum: 0.03 },
    }) },
  }, 'Surface anchors evaluated after morphology, then skinned with the body. Triangle order is pinned by topologySha256. Structural checks cannot prove geometry, garment fit, ownership or clearance.'),
};
for (const [path, schema] of Object.entries(schemas)) {
  const bytes = `${JSON.stringify(schema, null, 2)}\n`;
  const url = new URL(path, import.meta.url);
  if (process.argv.includes('--check')) {
    if (readFileSync(url, 'utf8') !== bytes) throw new Error(`Stale schema: ${path}`);
  } else writeFileSync(url, bytes);
}
console.log(`${Object.keys(schemas).length} schemas ${process.argv.includes('--check') ? 'match' : 'written'}`);
