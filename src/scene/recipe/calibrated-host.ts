/** Offline adoption of the accepted real-render calibration; never imported by the game. */
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { assertExpectedOuterCalibration, readOuterCalibration } from './measure-outer-host.ts';
import type { OuterCalibration } from './measure-outer-host.ts';

interface AcceptedCalibration {
  schema: 'allworld-accepted-outer-host-calibration'; version: 1;
  sourceReport: { path: string; sha256: string }; three: string;
  sourcePins: Record<string, { sha256: string; bytes: number }>;
  calibration: OuterCalibration;
}
export const CALIBRATION_FIXTURE = 'src/scene/recipe/fixtures/outer-host-calibration.json';
const root = new URL('../../../', import.meta.url);
const sha256 = (bytes: Uint8Array) => createHash('sha256').update(bytes).digest('hex');
export async function acceptedOuterCalibration() {
  const raw = await readFile(new URL(CALIBRATION_FIXTURE, root));
  const value: AcceptedCalibration = JSON.parse(raw.toString('utf8'));
  assert.equal(value.schema, 'allworld-accepted-outer-host-calibration'); assert.equal(value.version, 1);
  assert.equal(value.three, '180');
  const groundDraw = value.calibration.frame.draws.find(draw => draw.name === 'ground'); assert.ok(groundDraw);
  const parsed = readOuterCalibration(value.calibration.frame, groundDraw.objectId, value.calibration.ground.triangles);
  assert.deepEqual(parsed, value.calibration); assertExpectedOuterCalibration(parsed);
  // Revalidate the exact eleven-source witness before any allowance is used.
  assert.equal(Object.keys(value.sourcePins).length, 11);
  for (const [path, pin] of Object.entries(value.sourcePins)) {
    assert.ok(!path.startsWith('/') && path.split('/').every(part => part && part !== '..' && part !== '.'));
    const bytes = await readFile(new URL(path, root));
    assert.equal(bytes.length, pin.bytes, `calibration input length changed: ${path}`);
    assert.equal(sha256(bytes), pin.sha256, `calibration input changed: ${path}`);
  }
  return { calibration: parsed, sourceReport: value.sourceReport, three: value.three,
    sourcePins: [{ path: CALIBRATION_FIXTURE, sha256: sha256(raw) }, ...Object.entries(value.sourcePins).map(([path, pin]) => ({ path, sha256: pin.sha256 }))] };
}
