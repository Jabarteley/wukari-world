import assert from 'node:assert/strict';
import { test } from 'node:test';
import { acquire, AcquisitionError, classify, sha256 } from '../../scripts/wukari/acquisition.ts';
import type { ResponseBytes, SourceRequest } from '../../scripts/wukari/acquisition.ts';
import { runAcquisition } from '../../scripts/wukari/acquire.ts';

const source: SourceRequest = { id: 'test-only', url: 'https://example.org/source', license: 'test-fixture', attribution: 'Synthetic test only', query: '[out:json];out;' };
const good = Buffer.from('{"version":0.6,"elements":[]}');
test('successful acquisition retains byte identity, attribution, query, dates and source-only status', async () => {
  const response = await acquire({ ...source, expected: { bytes: good.length, sha256: sha256(good) } }, { transport: async () => ({ status: 200, body: good }) });
  assert.equal(response.body, good); assert.equal(response.receipt.sha256, sha256(good));
  assert.equal(response.receipt.querySha256, sha256(source.query!)); assert.equal(response.receipt.license, 'test-fixture');
  assert.equal(response.receipt.fieldVerified, false); assert.equal(response.receipt.status, 'acquired');
  assert.ok(response.receipt.retrievedAt); assert.equal(response.receipt.attempts.length, 1);
});
test('retryable provider failures have bounded backoff and then succeed', async () => {
  const delays: number[] = []; let calls = 0;
  const result = await acquire(source, { transport: async () => ++calls < 3 ? { status: 502, body: Buffer.from('bad gateway') } : { status: 200, body: good }, sleep: async ms => { delays.push(ms); } });
  assert.deepEqual(delays, [1000, 2000]); assert.equal(result.receipt.attempts.length, 3);
});
test('proxy denial, provider access denial, TLS and bad checksum never retry', async () => {
  const cases: ResponseBytes[] = [
    { status: 0, body: Buffer.alloc(0), transportCode: 56, transportError: 'CONNECT tunnel failed, response 403' },
    { status: 403, body: Buffer.from('denied') }, { status: 406, body: Buffer.from('blocked') },
    { status: 0, body: Buffer.alloc(0), transportCode: 60, transportError: 'certificate verification failed' },
    { status: 200, body: Buffer.from('version https://git-lfs.github.com/spec/v1') },
  ];
  for (const response of cases) {
    let calls = 0;
    await assert.rejects(acquire({ ...source, expected: { bytes: good.length, sha256: sha256(good) } }, { transport: async () => { calls++; return response; }, sleep: async () => assert.fail('must not wait/retry') }), AcquisitionError);
    assert.equal(calls, 1);
  }
});
test('rate-limit Retry-After is honored; long, missing and malformed reset instructions stop retries', async () => {
  let calls = 0; const delays: number[] = [];
  await acquire(source, { transport: async () => ++calls === 1 ? { status: 429, body: good, retryAfter: '2' } : { status: 200, body: good }, sleep: async ms => { delays.push(ms); } });
  assert.deepEqual(delays, [2000]);
  for (const retryAfter of ['120', 'invalid', undefined]) {
    calls = 0;
    await assert.rejects(acquire(source, { transport: async () => { calls++; return { status: 429, body: good, retryAfter }; }, sleep: async () => assert.fail('must return rather than retry early') }), AcquisitionError);
    assert.equal(calls, 1);
  }
});
test('timeouts exhaust at three attempts and failures contain structured diagnostics', async () => {
  await assert.rejects(acquire(source, { transport: async () => ({ status: 0, body: Buffer.alloc(0), transportCode: 28, transportError: 'timeout' }), sleep: async () => {} }), error => {
    assert.ok(error instanceof AcquisitionError); assert.equal(error.receipt.attempts.length, 3);
    assert.equal(error.receipt.attempts[0]!.failure!.category, 'timeout'); assert.equal(error.receipt.sha256, null); assert.equal(error.receipt.verification, 'not-acquired'); return true;
  });
  assert.equal(classify({ status: 502, body: Buffer.alloc(0) })?.category, 'provider-unavailable');
});
test('malformed, partial, empty, oversized and credential-bearing sources fail closed', async () => {
  for (const body of [Buffer.alloc(0), Buffer.from('[]'), Buffer.from('<html>error</html>'), Buffer.from('{"remark":"timeout","elements":[]}')]) {
    await assert.rejects(acquire(source, { transport: async () => ({ status: 200, body }) }), AcquisitionError);
  }
  await assert.rejects(acquire({ ...source, maxBytes: 1 }, { transport: async () => ({ status: 200, body: good }) }), AcquisitionError);
  for (const url of ['http://example.org/a', 'https://user:password@example.org/a']) await assert.rejects(acquire({ ...source, url }));
  await assert.rejects(acquire({ ...source, license: '' }));
});
test('an unreviewed alternative endpoint is rejected before network or output creation', async () => {
  await assert.rejects(runAcquisition({ overpassEndpoint: 'https://example.org/unreviewed', download: async () => assert.fail('No request to an unreviewed endpoint') }), /documented public Overpass endpoint/);
});
