import { test } from 'node:test';
import assert from 'node:assert/strict';
import { selectContained } from '../../scripts/wukari/review-local.ts';
import type { Boundary, OsmElement } from './geography.ts';
import { indexNodes, wayPositions } from './geography.ts';

test('shared node index resolves exact source geometry and still refuses missing references', () => {
  const elements: OsmElement[] = [{ type: 'node', id: 1, lon: 9.1234567, lat: 7.1234567 }, { type: 'node', id: 2, lon: 9.1234568, lat: 7.1234568 }];
  const nodes = indexNodes(elements), way: OsmElement = { type: 'way', id: 3, nodes: [1,2] };
  assert.deepEqual(wayPositions(way, elements, nodes), wayPositions(way, elements));
  assert.deepEqual(wayPositions(way, elements, nodes), [[9.1234567,7.1234567],[9.1234568,7.1234568]]);
  assert.equal(wayPositions({ ...way, nodes: [1,99] }, elements, nodes), null);
});

test('contained review preserves original roads and references, journals crossing and incomplete ways without clipping', () => {
  const boundary: Boundary = { type: 'Feature', properties: {}, geometry: { type: 'Polygon', coordinates: [[[0,0],[10,0],[10,10],[0,10],[0,0]]] } };
  const elements: OsmElement[] = [
    { type: 'node', id: 1, lon: 1, lat: 1 }, { type: 'node', id: 2, lon: 2, lat: 2 },
    { type: 'node', id: 3, lon: 11, lat: 2 },
    { type: 'way', id: 4, nodes: [1,2], tags: { highway: 'footway', name: 'SYNTHETIC UNIT TEST' } },
    { type: 'way', id: 5, nodes: [2,3], tags: { highway: 'service' } },
    { type: 'way', id: 6, nodes: [1,99] },
  ];
  const before = JSON.stringify(elements), result = selectContained(elements, boundary);
  assert.deepEqual(result.elements, [elements[0], elements[1], elements[3]]);
  assert.deepEqual(result.rejected.map(r => r.id), ['way/5','way/6']);
  assert.equal(JSON.stringify(elements), before);
});
