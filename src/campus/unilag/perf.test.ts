import test from 'node:test';
import assert from 'node:assert/strict';
import { createCampusWalk } from './walk.ts';

test('the campus walk grid is a typed array, cheap to build, and defers its A* scratch memory', () => {
 const before = process.memoryUsage().arrayBuffers, started = performance.now();
 const walk = createCampusWalk(), elapsed = performance.now() - started;
 const grid = [...walk.grids.values()][0]!;
 assert.ok(grid.cells instanceof Uint8Array, 'occupancy is one byte per cell, not a JS array');
 assert.ok(grid.cells.length <= 1_500_000, `grid stays near 1.3M cells (${grid.cells.length})`);
 // Generous for a loaded CI box; the build is about 100 ms (it was about 800 ms before outline rasterisation).
 assert.ok(elapsed < 1000, `createCampusWalk took ${Math.round(elapsed)} ms`);
 const grown = process.memoryUsage().arrayBuffers - before;
 assert.ok(grown < grid.cells.byteLength + 3 * 1048576, `no eager A* scratch: grew ${(grown / 1048576).toFixed(1)} MB for a ${(grid.cells.byteLength / 1048576).toFixed(1)} MB grid`);
});
