import assert from 'node:assert/strict';
import { test } from 'node:test';
import { isAcceptedDatasetUrl } from './pbf-extract.ts';

test('accepts official Geofabrik files', () => {
  assert.ok(isAcceptedDatasetUrl('https://download.geofabrik.de/africa/nigeria-261003.osm.pbf'));
  assert.ok(isAcceptedDatasetUrl('https://download.geofabrik.de/australia-oceania/pitcairn-islands-261013.osm.pbf'));
});

test('accepts exactly the extracts release asset pattern', () => {
  assert.ok(isAcceptedDatasetUrl('https://github.com/kromate/joinallworld/releases/download/extracts-20261014/osmfr-france-taaf-261013.osm.pbf'));
  assert.ok(isAcceptedDatasetUrl('https://github.com/kromate/joinallworld/releases/download/extracts-20261014/osmfr-jersey-261013.osm.pbf'));
});

test('rejects everything else', () => {
  const bad = [
    'http://download.geofabrik.de/africa/nigeria-261003.osm.pbf',
    'https://download.geofabrik.de/africa/nigeria-261003.osm.pbf?x=1',
    'https://github.com/kromate/joinallworld/releases/download/extracts-20261014/osmfr-jersey-261013.osm.pbf?token=1',
    'https://github.com/kromate/joinallworld/releases/download/extracts-20261014/osmfr-jersey-261013.osm.pbf#a',
    'https://github.com/kromate/joinallworld/releases/download/extracts-2026101/osmfr-jersey-261013.osm.pbf',
    'https://github.com/kromate/joinallworld/releases/download/v1/osmfr-jersey-261013.osm.pbf',
    'https://github.com/kromate/joinallworld/releases/download/extracts-20261014/osmfr-jersey.osm.pbf',
    'https://github.com/kromate/joinallworld/releases/download/extracts-20261014/sub/osmfr-jersey-261013.osm.pbf',
    'https://github.com/kromate/joinallworld/releases/download/extracts-20261014/../x-261013.osm.pbf',
    'https://github.com/other/joinallworld/releases/download/extracts-20261014/osmfr-jersey-261013.osm.pbf',
    'https://github.com/kromate/v1-allworld/releases/download/extracts-20261014/osmfr-jersey-261013.osm.pbf',
    'https://user@github.com/kromate/joinallworld/releases/download/extracts-20261014/osmfr-jersey-261013.osm.pbf',
    'https://example.com/osmfr-jersey-261013.osm.pbf',
    'not a url',
  ];
  for (const url of bad) assert.equal(isAcceptedDatasetUrl(url), false, url);
});
