/** Select small original geographic studies from Phase 6; no download or importer changes. */
import { readFileSync, writeFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { contains, fromWorld, indexNodes, toWorld, wayPositions, type Dataset, type Position } from '../../src/wukari/geography.ts';
import { canStand, lineDistance, permittedForSimulation, type Feature, type Study } from '../../src/wukari/play/model.ts';

const input = '.cache/wukari/local-pbf-import-20261020/dataset.json', bytes = readFileSync(input);
const sha256 = (b: Uint8Array) => createHash('sha256').update(b).digest('hex');
if (sha256(bytes) !== '9dece439bd87b8f4883d7e42f3704275bf1102f98310d6e0cb09b181e3398750') throw new Error('Phase 6 aggregate hash differs; inspect source before selecting');
const data = JSON.parse(bytes.toString()) as Dataset, nodes = indexNodes(data.osm.elements);
const evidence = JSON.parse(readFileSync('data/wukari/phase7/sources.json', 'utf8'));
const city = nodes.get(501490428);
if (!city || city.tags?.name !== 'Wukari') throw new Error('Expected original Wukari place node');
const cityOrigin: Position = [city.lon!, city.lat!];
const inventories: Record<string, unknown> = {};
for (const [id, title, origin, halfSize] of [
  ['town', 'Wukari town · road study', cityOrigin, 380],
  ['fuw', 'FUW candidate vicinity · source review', evidence.candidateLocation as Position, 650],
] as const) {
  if (!contains(data.extents.lga.feature.geometry, origin)) throw new Error('Study origin outside verified LGA');
  const features: Feature[] = [];
  const westNorth = fromWorld(origin, -halfSize, -halfSize), eastSouth = fromWorld(origin, halfSize, halfSize);
  for (const e of data.osm.elements) {
    if (e.type !== 'way' || (!e.tags?.highway && (!e.tags?.building || e.tags.building === 'no'))) continue;
    const coordinates = wayPositions(e, data.osm.elements, nodes);
    if (!coordinates) continue;
    if (!coordinates.every(p => p[0] >= westNorth[0] && p[0] <= eastSouth[0] && p[1] >= eastSouth[1] && p[1] <= westNorth[1])) continue;
    const points = coordinates.map(p => toWorld(origin, p));
    if (!points.every(p => Math.abs(p.x) <= halfSize && Math.abs(p.z) <= halfSize)) continue;
    features.push({ id: e.id, nodes: e.nodes!, tags: e.tags ?? {}, coordinates, points, version: e.version, timestamp: e.timestamp,
      distanceM: lineDistance({ x: 0, z: 0 }, points), association: 'nearby-only; FUW ownership unverified' });
  }
  const roads = features.filter(f => f.tags.highway), buildings = features.filter(f => f.tags.building && f.tags.building !== 'no');
  const adjacency = new Map<number, Set<number>>();
  for (const road of roads) for (let i = 1; i < road.nodes.length; i++) {
    const a = road.nodes[i - 1]!, b = road.nodes[i]!;
    if (!adjacency.has(a)) adjacency.set(a, new Set()); if (!adjacency.has(b)) adjacency.set(b, new Set());
    adjacency.get(a)!.add(b); adjacency.get(b)!.add(a);
  }
  const components = new Map<number, number>(); let count = 0;
  for (const n of adjacency.keys()) {
    if (components.has(n)) continue;
    const queue = [n]; components.set(n, ++count);
    while (queue.length) for (const next of adjacency.get(queue.pop()!) ?? []) if (!components.has(next)) { components.set(next, count); queue.push(next); }
  }
  roads.forEach(r => { r.component = components.get(r.nodes[0]!); });
  const study: Study = { schemaVersion: 1, id, title, origin, halfSize, roads, buildings,
    sources: evidence.sources, candidates: id === 'fuw' ? [{ label: 'Reported FUW study location', position: origin, point: { x: 0, z: 0 }, confidence: evidence.confidence }, ...evidence.samples.map((p: { label: string; position: Position; confidence: string }) => ({ ...p, point: toWorld(origin, p.position) }))] : [],
    spawn: null, coverage: { roads: roads.length, buildings: buildings.length, components: count, sourceSha256: sha256(bytes), policy: 'Complete original ways wholly inside a source-centred display square. Crossing ways omitted without clipping. Square is a demonstration/study window, never a campus or town boundary.' } };
  // A software-reviewed virtual spawn is intentionally separate from physical/legal access.
  if (id === 'town') {
    const candidates = roads.filter(r => permittedForSimulation(r.tags)).flatMap(r => r.points.map((point, i) => ({ point, road: r, node: r.nodes[i]! })))
      .filter(c => Math.hypot(c.point.x, c.point.z) < halfSize * .88 && (adjacency.get(c.node)?.size ?? 0) >= 2 && canStand(c.point, study))
      .filter(c => !roads.some(r => ['trunk', 'primary', 'secondary', 'tertiary'].includes(r.tags.highway ?? '') && lineDistance(c.point, r.points) < 15))
      .map(c => ({ ...c, nearbyBuildings: buildings.filter(b => lineDistance(c.point, b.points) < 70).length }))
      .sort((a, b) => b.nearbyBuildings - a.nearbyBuildings || Math.hypot(a.point.x, a.point.z) - Math.hypot(b.point.x, b.point.z));
    const candidate = candidates[0];
    if (candidate) study.spawn = { point: candidate.point, nodeId: candidate.node, roadId: candidate.road.id, eligible: true,
      review: 'Virtual-only review: original road node, connected by shared references, no restrictive mapped tags/bridge/tunnel/ford, building clearance, bounded corridor, away from mapped major-road centre lines. Physical safety, legal/public access, traffic and ground conditions NOT verified.' };
  }
  const serialized = JSON.stringify(study) + '\n';
  writeFileSync(`data/wukari/phase7/${id}.json`, serialized);
  inventories[id] = { origin, halfSizeMetres: halfSize, sourceSha256: sha256(bytes), bytes: Buffer.byteLength(serialized), sha256: sha256(Buffer.from(serialized)),
    coverage: study.coverage, spawn: study.spawn,
    roads: roads.map(r => ({ id: `way/${r.id}`, tags: r.tags, distanceM: r.distanceM, component: r.component, nodes: r.nodes, association: r.association })),
    buildings: buildings.map(b => ({ id: `way/${b.id}`, tags: b.tags, distanceM: b.distanceM, association: b.association })) };
  console.log(JSON.stringify({ id, bytes: Buffer.byteLength(serialized), ...study.coverage, spawn: study.spawn }));
}
writeFileSync('docs/wukari/evidence/phase7-inventory.json', JSON.stringify(inventories, null, 2) + '\n');
