// /.well-known/assetlinks.json (server/site-files.ts, docs/STORE.md): the file Android reads to open the Play Store wrapper without a browser bar.
// Nothing false is published: a 404 (not the game's page) while PLAY_SIGNING_SHA256 is unset or is not a SHA-256 fingerprint, the JSON once it is set.
import test from 'node:test';
import assert from 'node:assert/strict';
import { fixture } from './test-fixture.ts';
import { PLAY_PACKAGE_NAME, PLAY_SIGNING_ENV, assetLinks, siteFile } from './site-files.ts';

const PRINT = Array.from({ length: 32 }, (_, i) => (i * 7 % 256).toString(16).padStart(2, '0').toUpperCase()).join(':');
const OTHER = Array.from({ length: 32 }, (_, i) => (255 - i).toString(16).padStart(2, '0').toUpperCase()).join(':');

test('assetLinks takes one or several SHA-256 fingerprints and nothing else', () => {
  assert.equal(PLAY_SIGNING_ENV, 'PLAY_SIGNING_SHA256');
  for (const setting of [undefined, '', '  ', 'REPLACE-WITH-PLAY-SHA256', PRINT.slice(0, -3), PRINT.replaceAll(':', ''), `${PRINT},nonsense`, `${PRINT}:AA`]) assert.equal(assetLinks(setting), null, String(setting));
  const one = JSON.parse(assetLinks(` ${PRINT.toLowerCase()} `) ?? 'null') as unknown;
  assert.deepEqual(one, [{ relation: ['delegate_permission/common.handle_all_urls'], target: { namespace: 'android_app', package_name: PLAY_PACKAGE_NAME, sha256_cert_fingerprints: [PRINT] } }]);
  const two = JSON.parse(assetLinks(`${PRINT}, ${OTHER},${PRINT}`) ?? 'null') as { target: { sha256_cert_fingerprints: string[] } }[];
  assert.deepEqual(two[0]?.target.sha256_cert_fingerprints, [PRINT, OTHER], 'both the upload key and the Play app signing key may be listed; a repeat is dropped');
  assert.equal(PLAY_PACKAGE_NAME, 'com.joinallworld.app');
});

test('siteFile answers assetlinks.json as a 404 file without the setting, so no host falls through to the game page', () => {
  assert.deepEqual(siteFile('/.well-known/assetlinks.json', ''), { type: 'application/json', body: '{"error":"not_found"}', status: 404 });
  const file = siteFile('/.well-known/assetlinks.json', '', PRINT);
  assert.deepEqual([file?.type, file?.status], ['application/json', undefined]);
  assert.equal(siteFile('/.well-known/assetlinks.json/', '', PRINT), undefined);
  assert.equal(siteFile('/.well-known/other.json', '', PRINT), undefined);
});

test('the Node host: 404 without PLAY_SIGNING_SHA256, the Digital Asset Links JSON with it', async (t) => {
  const without = await fixture(t, { env: {} });
  const missing = await fetch(`${without.base}/.well-known/assetlinks.json`);
  assert.deepEqual([missing.status, missing.headers.get('content-type'), await missing.json()], [404, 'application/json', { error: 'not_found' }]);

  const placeholder = await fixture(t, { env: { PLAY_SIGNING_SHA256: 'REPLACE-WITH-PLAY-SHA256' } });
  assert.equal((await fetch(`${placeholder.base}/.well-known/assetlinks.json`)).status, 404, 'a placeholder is never published');

  const withIt = await fixture(t, { env: { PLAY_SIGNING_SHA256: PRINT } });
  const found = await fetch(`${withIt.base}/.well-known/assetlinks.json`);
  assert.deepEqual([found.status, found.headers.get('content-type'), found.headers.get('x-content-type-options')], [200, 'application/json', 'nosniff']);
  assert.deepEqual(await found.json(), [{ relation: ['delegate_permission/common.handle_all_urls'], target: { namespace: 'android_app', package_name: 'com.joinallworld.app', sha256_cert_fingerprints: [PRINT] } }]);
  const head = await fetch(`${withIt.base}/.well-known/assetlinks.json`, { method: 'HEAD' });
  assert.deepEqual([head.status, await head.text()], [200, '']);
});
