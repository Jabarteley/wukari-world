/** Isolated proposal: no production imports, renderer, storage, clocks or network. */
import { readFileSync } from 'node:fs';

const freeze = (value) => {
  if (value && typeof value === 'object') { Object.values(value).forEach(freeze); Object.freeze(value); }
  return value;
};
const clone = (value) => structuredClone(value);
import { MAX_SAVE_BYTES, SKELETON_ID, CONTROL_GROUPS, EXPRESSION_PRESETS, CHANNELS, ANCHORS, REQUIRED_ANCHORS } from "./definitions.mjs";
export { MAX_SAVE_BYTES, SKELETON_ID, CONTROL_GROUPS, EXPRESSION_PRESETS, CHANNELS, ANCHORS, REQUIRED_ANCHORS };

export class ContractError extends Error {
  constructor(code, path, message) { super(`${path}: ${message}`); this.name = 'ContractError'; this.code = code; this.path = path; }
}
const fail = (code, path, message) => { throw new ContractError(code, path, message); };

/** Deliberately supports only keywords used by our checked-in schemas; unknown keywords fail. */
export function validateSchema(value, schema, path = '$') {
  const supported = new Set(['$schema', '$id', 'title', 'description', 'type', 'const', 'enum', 'minimum', 'maximum', 'maxLength', 'pattern', 'properties', 'required', 'additionalProperties', 'items', 'minItems', 'maxItems', 'uniqueItems']);
  for (const key of Object.keys(schema)) if (!supported.has(key)) fail('schema_keyword', path, key);
  const object = value !== null && typeof value === 'object' && !Array.isArray(value);
  const types = Array.isArray(schema.type) ? schema.type : [schema.type];
  if (!types.some((type) => type === undefined || (type === 'object' ? object
    : type === 'array' ? Array.isArray(value)
      : type === 'integer' ? Number.isSafeInteger(value)
        : type === 'number' ? typeof value === 'number' && Number.isFinite(value) : typeof value === type))) fail('type', path, `expected ${types.join('|')}`);
  if (Object.hasOwn(schema, 'const') && value !== schema.const) fail('const', path, 'wrong version or fixed identity');
  if (schema.enum && !schema.enum.includes(value)) fail('enum', path, 'unknown value');
  if (typeof value === 'number' && (value < (schema.minimum ?? -Infinity) || value > (schema.maximum ?? Infinity))) fail('range', path, 'outside contract range');
  if (typeof value === 'string' && ([...value].length > (schema.maxLength ?? Infinity) || (schema.pattern && !new RegExp(schema.pattern, 'u').test(value)))) fail('string', path, 'invalid string');
  if (object) {
    if (![Object.prototype, null].includes(Object.getPrototypeOf(value))) fail('type', path, 'expected plain JSON object');
    if (Object.getOwnPropertySymbols(value).length || Object.values(Object.getOwnPropertyDescriptors(value)).some((d) => d.get || d.set || !d.enumerable)) fail('type', path, 'expected enumerable data fields');
    for (const key of schema.required ?? []) if (!Object.hasOwn(value, key)) fail('required', `${path}.${key}`, 'missing');
    for (const key of Object.keys(value)) {
      if (!Object.hasOwn(schema.properties ?? {}, key)) {
        if (schema.additionalProperties === false) fail('unknown_field', `${path}.${key}`, 'unknown field');
      } else validateSchema(value[key], schema.properties[key], `${path}.${key}`);
    }
  }
  if (Array.isArray(value)) {
    if (value.length < (schema.minItems ?? 0) || value.length > (schema.maxItems ?? Infinity)) fail('length', path, 'wrong array length');
    if (schema.uniqueItems && new Set(value.map((x) => JSON.stringify(x))).size !== value.length) fail('duplicate', path, 'duplicate item');
    if (schema.items) value.forEach((item, index) => validateSchema(item, schema.items, `${path}[${index}]`));
  }
  return value;
}
const schema = (name) => freeze(JSON.parse(readFileSync(new URL(name, import.meta.url), 'utf8')));
export const SAVE_SCHEMA = schema('human-design-v2.schema.json');
export const V1_SCHEMA = schema('human-design-v1.schema.json');
export const ANCHOR_SCHEMA = schema('anchor-bindings-v1.schema.json');

function parse(text) {
  if (typeof text !== 'string' || Buffer.byteLength(text, 'utf8') > MAX_SAVE_BYTES) fail('size', '$', 'expected JSON text within 16384 bytes');
  try { return JSON.parse(text); } catch { return fail('json', '$', 'invalid JSON'); }
}
export function neutralDesign() {
  return {
    controlSpace: 'legacy-relative-v1',
    morphology: Object.fromEntries(Object.entries(CONTROL_GROUPS).map(([group, keys]) => [group, Object.fromEntries(keys.map((key) => [key, 0]))])),
    expression: { preset: 'inherit', intensity: 1 },
  };
}
export function createSave(legacyLook = {}) {
  validateSchema(legacyLook, SAVE_SCHEMA.properties.legacyLook);
  return { schemaVersion: 2, legacyLook: clone(legacyLook), design: neutralDesign() };
}
export function encodeSave(save) {
  validateSchema(save, SAVE_SCHEMA);
  const canonical = (value) => Array.isArray(value) ? value.map(canonical)
    : value !== null && typeof value === 'object'
      ? Object.fromEntries(Object.keys(value).sort().map((key) => [key, canonical(value[key])])) : value;
  const text = JSON.stringify(canonical(save));
  if (Buffer.byteLength(text, 'utf8') > MAX_SAVE_BYTES) fail('size', '$', 'save too large');
  return text;
}
export function readSave(text) { return validateSchema(parse(text), SAVE_SCHEMA); }

/** v0 = actual legacy Look. v1 = this lane's explicitly fictional earlier prototype envelope. */
export function migrateSave(text) {
  const input = parse(text);
  if (!input || typeof input !== 'object' || Array.isArray(input)) fail('type', '$', 'expected look/save object');
  if (!Object.hasOwn(input, 'schemaVersion')) return { save: createSave(input), fromVersion: 0, notices: ['Legacy look retained verbatim; neutral relative controls; existing seeded normalizer remains authoritative.'] };
  if (input.schemaVersion === 2) return { save: readSave(text), fromVersion: 2, notices: [] };
  if (input.schemaVersion !== 1) fail('unsupported_version', '$.schemaVersion', 'retain original bytes; do not overwrite with defaults');
  validateSchema(input, V1_SCHEMA);
  const save = createSave(input.legacyLook);
  const { ears, ...rest } = input.morphology;
  save.design.morphology = { earLeft: clone(ears), earRight: clone(ears), ...clone(rest) };
  save.design.expression = clone(input.expression);
  return { save: readSave(encodeSave(save)), fromVersion: 1, notices: ['Prototype v1 bilateral ears copied to both independent v2 ears.'] };
}

/** One control edit changes exactly one leaf, without implicit symmetry or preset selection. */
export function withControl(save, group, key, value) {
  readSave(encodeSave(save));
  if (!Object.hasOwn(CONTROL_GROUPS, group) || !CONTROL_GROUPS[group].includes(key)) fail('control', '$', 'unknown control');
  const next = clone(save);
  next.design.morphology[group][key] = value;
  return readSave(encodeSave(next));
}

/** UI-only clamping with an explicit receipt. Persisted/network reads remain strict. */
export function withClampedControl(save, group, key, value) {
  if (typeof value !== 'number' || !Number.isFinite(value)) fail('type', '$', 'expected finite slider input');
  const applied = Math.max(-1, Math.min(1, value));
  return { save: withControl(save, group, key, applied), applied, clamped: applied !== value };
}

/** Fresh channels every sample; transient blink/speech never enter the saved look. */
export function expressionChannels(expression, legacyExpression = 'smile', transient = {}) {
  validateSchema(expression, SAVE_SCHEMA.properties.design.properties.expression);
  validateSchema(transient, { type: 'object', properties: {
    ...Object.fromEntries(['blinkLeft', 'blinkRight', 'speechOpen', 'lipSeal', 'lipPucker', 'lipWide', 'sleeping'].map((key) => [key, { type: 'number', minimum: 0, maximum: 1 }])),
    gazeYaw: { type: 'number', minimum: -1, maximum: 1 }, gazePitch: { type: 'number', minimum: -1, maximum: 1 },
  }, additionalProperties: false });
  if (!['neutral', 'smile', 'grin'].includes(legacyExpression)) fail('expression', '$', 'pass the normalized legacy expression');
  const preset = expression.preset === 'inherit' ? ({ neutral: 'neutral', smile: 'soft-smile', grin: 'grin' }[legacyExpression]) : expression.preset;
  const channels = Object.fromEntries(CHANNELS.map((key) => [key, (EXPRESSION_PRESETS[preset][key] ?? 0) * expression.intensity]));
  const awake = 1 - (transient.sleeping ?? 0);
  for (const key of CHANNELS) channels[key] *= awake;
  channels.blinkLeft = Math.max(transient.blinkLeft ?? 0, transient.sleeping ?? 0);
  channels.blinkRight = Math.max(transient.blinkRight ?? 0, transient.sleeping ?? 0);
  channels.lipSeal = (transient.lipSeal ?? 0) * awake;
  channels.jawOpen = Math.max(channels.jawOpen, (transient.speechOpen ?? 0) * awake) * (1 - channels.lipSeal);
  const pucker = transient.lipPucker ?? 0, wide = transient.lipWide ?? 0;
  const lipTotal = Math.max(1, pucker + wide);
  channels.lipPucker = pucker / lipTotal * awake;
  channels.lipWide = wide / lipTotal * awake;
  channels.gazeYaw = (transient.gazeYaw ?? 0) * awake;
  channels.gazePitch = (transient.gazePitch ?? 0) * awake;
  return channels;
}

/** Structural binding check against a caller-supplied trusted immutable mesh identity. Not fit acceptance. */
export function readAnchorBindings(text, expectedTarget) {
  const packet = validateSchema(parse(text), ANCHOR_SCHEMA);
  validateSchema(expectedTarget, ANCHOR_SCHEMA.properties.target, '$expectedTarget');
  for (const key of Object.keys(expectedTarget)) if (packet.target[key] !== expectedTarget[key]) fail('target_mismatch', `$.target.${key}`, 'stale or incompatible binding');
  const seen = new Set();
  for (const binding of packet.bindings) {
    if (seen.has(binding.anchorId)) fail('duplicate_anchor', '$.bindings', binding.anchorId);
    seen.add(binding.anchorId);
    if (binding.joint !== ANCHORS[binding.anchorId].joint) fail('joint', '$.bindings', 'wrong attachment joint');
    if (!ANCHORS[binding.anchorId].slots.includes(packet.slot)) fail('slot', '$.bindings', 'anchor does not serve this slot');
    if (binding.triangle >= packet.target.triangleCount) fail('triangle', '$.bindings', 'outside pinned mesh');
    if (Math.abs(binding.barycentric.reduce((sum, value) => sum + value, 0) - 1) > 1e-8) fail('barycentric', '$.bindings', 'weights must sum to one');
  }
  for (const id of REQUIRED_ANCHORS[packet.slot]) if (!seen.has(id)) fail('anchor_missing', '$.bindings', id);
  return packet;
}
