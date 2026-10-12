import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import type { Element } from './overpass.ts';
import type { Box } from './geometry-tools.ts';

export type ExtractLabel = 'places' | 'extras' | 'water' | 'landuse' | 'roads';
export interface RecordedAnswer { raw: string; sha256: string; elements: Element[] }
export interface ExtractSource { kind: 'geofabrik-pbf'; datasetUrl: string; datasetSha256: string; pbfHeaderTimestamp: string; adapterSha256: string }
export interface ExtractBundle { answers: Record<ExtractLabel, RecordedAnswer>; source: ExtractSource }
type ElementMember = NonNullable<Element['members']>[number];

const LABELS: readonly ExtractLabel[] = ['places', 'extras', 'water', 'landuse', 'roads'];
const BOXES: readonly ('play' | 'core' | 'outline' | 'wide')[] = ['play', 'core', 'outline', 'wide'];
const record = (value: unknown): value is Record<string, unknown> => Boolean(value) && typeof value === 'object' && !Array.isArray(value);
function fail(message: string): never { throw new Error(`PBF extract: ${message}`); }
const text = (value: unknown, path: string): string => typeof value === 'string' && value ? value : fail(`${path} must be a non-empty string`);
const integer = (value: unknown, path: string): number => Number.isSafeInteger(value) && Number(value) > 0 ? Number(value) : fail(`${path} must be a positive safe integer`);
const coordinate = (value: unknown, path: string, limit: number): number => typeof value === 'number' && Number.isFinite(value) && Math.abs(value) <= limit ? value : fail(`${path} is outside WGS84`);
const point = (value: unknown, path: string): { lat: number; lon: number } => record(value) ? { lat: coordinate(value.lat, `${path}.lat`, 90), lon: coordinate(value.lon, `${path}.lon`, 180) } : fail(`${path} must be a point`);
const geometry = (value: unknown, path: string, minimum: number): { lat: number; lon: number }[] => Array.isArray(value) && value.length >= minimum ? value.map((item, index) => point(item, `${path}[${index}]`)) : fail(`${path} must contain at least ${minimum} point(s)`);
const digest = (value: unknown, path: string): string => /^[0-9a-f]{64}$/.test(text(value, path)) ? String(value) : fail(`${path} must be a lowercase SHA-256`);
const tags = (value: unknown, path: string): Record<string, string> => {
  if (!record(value)) fail(`${path} must be an object`);
  const out: Record<string, string> = {};
  for (const [key, item] of Object.entries(value)) out[key] = typeof item === 'string' ? item : fail(`${path}.${key} must be a string`);
  return out;
};
const sameBox = (actual: unknown, expected: Box, path: string): void => {
  if (!Array.isArray(actual) || actual.length !== 4 || actual.some((value, index) => { const target = expected[index]; return typeof value !== 'number' || !Number.isFinite(value) || target === undefined || Math.abs(value - target) > 1e-9; })) fail(`${path} does not match the current recipe`);
};

function element(value: unknown, label: ExtractLabel, path: string): Element {
  if (!record(value)) fail(`${path} must be an object`);
  const id = integer(value.id, `${path}.id`), elementTags = tags(value.tags, `${path}.tags`), type = value.type;
  if (type === 'node') {
    if (label !== 'places' && label !== 'extras') fail(`${path}: nodes are not valid in ${label}`);
    return { type, id, tags: elementTags, ...point(value, path) };
  }
  if (type !== 'way' && type !== 'relation') fail(`${path}.type is unsupported`);
  if (label === 'places' || label === 'extras') return { type, id, tags: elementTags, center: point(value.center, `${path}.center`) };
  if (type === 'way') return { type, id, tags: elementTags, geometry: geometry(value.geometry, `${path}.geometry`, 2) };
  if (label === 'roads') fail(`${path}: roads must be ways`);
  if (!Array.isArray(value.members) || !value.members.length) fail(`${path}.members must be non-empty`);
  const members = value.members.map((member, index): ElementMember => {
    const memberPath = `${path}.members[${index}]`;
    if (!record(member)) fail(`${memberPath} must be an object`);
    const memberType = member.type;
    if (memberType === 'relation') fail(`${memberPath}: nested relation geometry is unsupported`);
    if (memberType !== 'node' && memberType !== 'way') fail(`${memberPath}.type is unsupported`);
    return { type: memberType, ref: integer(member.ref, `${memberPath}.ref`), role: typeof member.role === 'string' ? member.role : fail(`${memberPath}.role must be a string`), geometry: geometry(member.geometry, `${memberPath}.geometry`, memberType === 'way' ? 2 : 1) };
  });
  return { type, id, tags: elementTags, members };
}

function source(value: unknown, cityId: string, boxes: Record<'play' | 'core' | 'outline' | 'wide', Box>, path: string): ExtractSource {
  if (!record(value) || value.kind !== 'geofabrik-pbf') fail(`${path}.kind must be geofabrik-pbf`);
  if (value.cityId !== cityId) fail(`${path}.cityId does not match ${cityId}`);
  const datasetUrl = text(value.datasetUrl, `${path}.datasetUrl`);
  let url: URL;
  try { url = new URL(datasetUrl); } catch { fail(`${path}.datasetUrl is invalid`); }
  if (url.protocol !== 'https:' || url.hostname !== 'download.geofabrik.de' || !/^https:\/\/download\.geofabrik\.de\/[A-Za-z0-9._/-]+\.osm\.pbf$/.test(datasetUrl) || url.username || url.password || url.search || url.hash) fail(`${path}.datasetUrl must be a comment-safe official download.geofabrik.de .osm.pbf URL`);
  const pbfHeaderTimestamp = text(value.pbfHeaderTimestamp, `${path}.pbfHeaderTimestamp`);
  if (!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}Z$/.test(pbfHeaderTimestamp) || !Number.isFinite(Date.parse(pbfHeaderTimestamp)) || new Date(pbfHeaderTimestamp).toISOString().replace('.000Z', 'Z') !== pbfHeaderTimestamp) fail(`${path}.pbfHeaderTimestamp must be canonical UTC ISO-8601`);
  if (!record(value.boxes)) fail(`${path}.boxes must be an object`);
  for (const key of BOXES) sameBox(value.boxes[key], boxes[key], `${path}.boxes.${key}`);
  return { kind: 'geofabrik-pbf', datasetUrl, datasetSha256: digest(value.datasetSha256, `${path}.datasetSha256`), pbfHeaderTimestamp, adapterSha256: digest(value.adapterSha256, `${path}.adapterSha256`) };
}

export function loadPbfExtract(directory: string, cityId: string, boxes: Record<'play' | 'core' | 'outline' | 'wide', Box>): ExtractBundle {
  const answers: Record<ExtractLabel, RecordedAnswer | null> = { places: null, extras: null, water: null, landuse: null, roads: null };
  let common: ExtractSource | null = null;
  for (const label of LABELS) {
    const raw = readFileSync(join(directory, `${label}.json`), 'utf8'), parsed: unknown = JSON.parse(raw), path = `${label}.json`;
    if (!record(parsed) || parsed.version !== 1 || parsed.generator !== 'Allworld offline PBF adapter prototype' || !Array.isArray(parsed.elements)) fail(`${path} is not a v1 offline PBF extract`);
    const itemSource = source(parsed.source, cityId, boxes, `${path}.source`), identity = JSON.stringify(itemSource);
    if (common && JSON.stringify(common) !== identity) fail(`${path}.source does not match the other extract files`);
    common = itemSource;
    answers[label] = { raw, sha256: createHash('sha256').update(raw).digest('hex'), elements: parsed.elements.map((item, index) => element(item, label, `${path}.elements[${index}]`)) };
  }
  const { places, extras, water, landuse, roads } = answers;
  if (!places || !extras || !water || !landuse || !roads) fail('extract is incomplete');
  return { answers: { places, extras, water, landuse, roads }, source: common ?? fail('no extract files') };
}
