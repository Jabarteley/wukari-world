import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';
import { gunzipSync } from 'node:zlib';
import { coverage } from './geometry-tools.ts';
import type { Box, P, Ring } from './geometry-tools.ts';
import type { Element } from './overpass.ts';
import { joinWays, selectChains, simplifyChain } from './road-chains.ts';
import type { RoadWay } from './road-chains.ts';
import { roadRows } from './road-rows.ts';
import type { RoadRowConfig } from './road-rows.ts';

// Port Moresby's road stage as the factory generated it (Geofabrik PNG 2026-10, run 38313119499): the recorded road ways (tags cut to
// highway and the name keys), the play and sea polygons the generator computed, the recipe's road knobs, and the 334 rows of
// src/game/cities/port-moresby/terrain.ts. An uncapped city: its rows must not change by a byte.
interface Fixture { play: Ring[][]; sea: Ring[][]; outlineBox: Box; cell: number; config: RoadRowConfig; elements: Element[]; rows: string[]; note: string }
const fixture = JSON.parse(gunzipSync(readFileSync(new URL('./fixtures/port-moresby-roads.json.gz', import.meta.url))).toString('utf8')) as Fixture;
const nameIn = (tags: Record<string, string> | undefined): string => (tags?.['name:en'] ?? tags?.['name:fr'] ?? tags?.name ?? '').replace(/\s+/g, ' ').trim();
const reach = coverage(fixture.play, fixture.outlineBox, fixture.cell);
const seaCover = fixture.sea.length ? coverage(fixture.sea, fixture.outlineBox, fixture.cell) : null;
const inSea = (p: P): boolean => Boolean(seaCover && seaCover(p, 0));
const sha = (rows: readonly string[]): string => createHash('sha256').update(rows.join('\n')).digest('hex');

/** Decode a row back to its quantised vertices. */
const vertices = (row: string): [number, number][] => {
  const [, , x0, y0, ...steps] = JSON.parse(row.trim().replace(/,$/, '')) as [string, number, number, number, ...number[]];
  const out: [number, number][] = [[x0, y0]];
  for (let i = 0; i + 1 < steps.length; i += 2) out.push([out.at(-1)![0] + steps[i]!, out.at(-1)![1] + steps[i + 1]!]);
  return out;
};
/** Kilometres of road, and row ends farther than about 100 m from any other row (ends the map cannot join to the network). */
const network = (rows: readonly string[]): { km: number; loose: number } => {
  const lines = rows.map(vertices), k = Math.cos(9.4 * Math.PI / 180), unit = 11.1 / 1000; // 0.0001 degree in km at Port Moresby
  const seg = (p: [number, number], a: [number, number], b: [number, number]): number => {
    const dx = (b[0] - a[0]) * k, dy = b[1] - a[1], px = (p[0] - a[0]) * k, py = p[1] - a[1], t = Math.max(0, Math.min(1, (px * dx + py * dy) / (dx * dx + dy * dy || 1)));
    return Math.hypot(px - dx * t, py - dy * t);
  };
  let km = 0, loose = 0;
  lines.forEach((line, i) => {
    km += line.slice(1).reduce((sum, p, j) => sum + Math.hypot((p[0] - line[j]![0]) * k, p[1] - line[j]![1]), 0) * unit;
    for (const end of [line[0]!, line.at(-1)!]) if (!lines.some((other, o) => o !== i && other.slice(1).some((p, j) => seg(end, other[j]!, p) <= 9))) loose += 1;
  });
  return { km, loose };
};

test('an uncapped city keeps its per-way rows byte for byte (Port Moresby fixture)', () => {
  assert.equal(sha(fixture.rows), '221d3ef52d4a31032bc4898265e6d39dc9033ba6a7fe05b084885a281524e208', 'fixture integrity');
  const result = roadRows(fixture.elements, fixture.config, reach, inSea, nameIn);
  assert.equal(result.chained, null);
  assert.deepEqual(result.rows, fixture.rows);
  assert.equal(result.note, fixture.note);
  assert.equal(result.points, 783);
});

test('a capped city is chained inside the same row cap and point budget, and its network holds together', () => {
  const config = { ...fixture.config, maxRoads: 100 };
  const result = roadRows(fixture.elements, config, reach, inSea, nameIn);
  assert.ok(result.chained, 'the 334 candidates overflow 100 rows');
  assert.ok(result.rows.length <= 100);
  assert.ok(result.points <= result.chained.perWayPoints, `${result.points} points within the per-way budget ${result.chained.perWayPoints}`);
  for (const row of result.rows) {
    const line = vertices(row);
    assert.ok(line.length >= 2);
    line.slice(1).forEach(([x, y], i) => assert.ok(x !== line[i]![0] || y !== line[i]![1], 'no zero-length step'));
  }
  assert.equal(result.points, result.rows.reduce((sum, row) => sum + vertices(row).length, 0));
  assert.deepEqual(roadRows(fixture.elements, config, reach, inSea, nameIn), result, 'deterministic');
  // The per-way rows at the same cap (the 100 longest single ways, major first) cover less road and leave more ends loose per kilometre.
  const perWay = network(roadRows(fixture.elements, { ...config, maxRoads: 1000 }, reach, inSea, nameIn).rows.slice(0, 100)), chained = network(result.rows);
  assert.ok(chained.km > perWay.km, `chained ${chained.km.toFixed(1)} km vs per-way ${perWay.km.toFixed(1)} km`);
  assert.ok(chained.loose / chained.km < perWay.loose / perWay.km, `loose ends per km: chained ${chained.loose}/${chained.km.toFixed(1)} vs per-way ${perWay.loose}/${perWay.km.toFixed(1)}`);
  assert.match(result.note, /joined end to end into \d+ chains/);
});

const way = (name: string, rank: number, ...points: P[]): RoadWay => ({ name, rank, points });

test('ways of one class and name join end to end at a shared node, straight on first', () => {
  const chains = joinWays([
    way('A', 2, [0, 0], [1, 0]),
    way('A', 2, [2, 0], [1, 0]),            // reversed piece, continues A
    way('A', 2, [1, 0], [1, 1]),            // a right-angle branch of the same name: not a continuation
    way('B', 2, [2, 0], [3, 0]),            // another name: stays apart
    way('A', 0, [2, 0], [3, 0.01]),         // another class: stays apart
  ]);
  assert.deepEqual(chains.map((c) => [c.name, c.rank, c.ways, c.points]), [
    ['A', 2, 2, [[0, 0], [1, 0], [2, 0]]],
    ['A', 2, 1, [[1, 0], [1, 1]]],
    ['B', 2, 1, [[2, 0], [3, 0]]],
    ['A', 0, 1, [[2, 0], [3, 0.01]]],
  ]);
});

test('a ring of joined ways and a closed way each stay one chain', () => {
  const ring = joinWays([way('R', 2, [0, 0], [1, 0], [1, 1]), way('R', 2, [1, 1], [0, 1], [0, 0])]);
  assert.equal(ring.length, 2, 'the joint at a right angle turns too sharply: two chains');
  const loop = joinWays([way('L', 2, [0, 0], [1, 0], [1, 1], [0, 0])]);
  assert.deepEqual(loop.map((c) => c.points.length), [4]);
});

test('simplification keeps the vertex where another road ends', () => {
  const line: P[] = [[0, 0], [1, 0.00001], [2, 0], [3, 0.00001], [4, 0]];
  assert.deepEqual(simplifyChain(line, new Set(), () => 0.001), [[0, 0], [4, 0]]);
  assert.deepEqual(simplifyChain(line, new Set(['3,0.00001']), () => 0.001), [[0, 0], [3, 0.00001], [4, 0]]);
});

test('a short connector is kept when both its ends meet kept roads, and the budgets hold', () => {
  const deg = 0.01; // about 1.1 km
  const ways = [
    way('North', 2, [0, deg], [5 * deg, deg]),
    way('South', 2, [0, 0], [5 * deg, 0]),
    way('Link', 3, [2 * deg, 0], [2 * deg, 0.004]),       // 0.44 km, dangling: dropped
    way('Cross', 3, [3 * deg, 0], [3 * deg, deg]),        // 1.1 km would pass anyway
    way('Joint', 3, [4 * deg, 0], [4 * deg, deg / 2]),
    way('Joint', 3, [4 * deg, deg / 2], [4 * deg, deg]),  // two short pieces of one street joined: 1.1 km
  ];
  const options = { minRoadKm: 0.7, maxRows: 10, maxPoints: 100, toleranceAt: () => 0.0001, runsOf: (line: P[]) => [line] };
  const all = selectChains(ways, options);
  assert.deepEqual(all.runs.map((r) => r.name).sort(), ['Cross', 'Joint', 'North', 'South']);
  // A 0.67 km rung between two kept roads, ending on their junction nodes, is kept as a connector.
  const bridged = selectChains([way('North', 2, [0, deg], [deg, deg], [5 * deg, deg]), way('Mid', 2, [0, 0.004], [deg, 0.004], [5 * deg, 0.004]), way('Rung', 3, [deg, 0.004], [deg, deg])], options);
  assert.deepEqual(bridged.runs.map((r) => r.name).sort(), ['Mid', 'North', 'Rung']);
  assert.equal(bridged.connectors, 1);
  const tight = selectChains(ways, { ...options, maxRows: 2 });
  assert.ok(tight.runs.length <= 2);
  const few = selectChains(ways, { ...options, maxPoints: 4 });
  assert.ok(few.points <= 4);
});
