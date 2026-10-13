import assert from 'node:assert/strict';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { buildPacket, canonical, HERE, sha } from './bridge.mjs';

const payload = await buildPacket();
payload.integrationSources = Object.fromEntries(['bridge.mjs', 'bridge.test.mjs', 'seal.mjs', 'pin_inputs.py'].map(name => {
  const bytes = readFileSync(join(HERE, name)); return [name, { bytes: bytes.length, sha256: sha(bytes) }];
}));
const bytes = Buffer.from(canonical(payload));
const digest = sha(bytes), name = `packets/${digest}.json`;
const lock = canonical({ schema: 'allworld-cloud-packet-lock-v1', path: name, bytes: bytes.length, sha256: digest });
if (process.argv[2] === '--write') {
  assert.ok(!existsSync(join(HERE, 'packet-lock.json')), 'Already sealed; create a new reviewed packet version');
  mkdirSync(join(HERE, 'packets'), { recursive: true });
  writeFileSync(join(HERE, name), bytes, { flag: 'wx' });
  writeFileSync(join(HERE, 'packet-lock.json'), lock, { flag: 'wx' });
} else {
  assert.equal(process.argv[2], '--check');
  assert.equal(readFileSync(join(HERE, 'packet-lock.json'), 'utf8'), lock);
  assert.deepEqual(readFileSync(join(HERE, name)), bytes);
}
console.log(JSON.stringify({ status: 'PASS', path: name, bytes: bytes.length, sha256: digest, productionAdmission: false }));
