import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, mkdir, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { fixture } from './test-fixture.ts';
import { sceneCataloguePage } from './scene-catalogue.ts';

test('catalogue addresses resolve only the three inspection entries', () => {
  for (const route of ['/county', '/cities', '/cities/scenes']) {
    for (const suffix of ['', '/', '/index.html']) assert.equal(sceneCataloguePage(route + suffix), route.slice(1) + '/index.html');
  }
  for (const route of ['/', '/county/else', '/cities/scenes/else', '/counties', '/cities//', '/cities/../index.html', '/__proto__']) assert.equal(sceneCataloguePage(route), null, route);
});

test('Node serves catalogue HTML with page security, revalidation and unchanged game links', async (t) => {
  const dist = await mkdtemp(join(tmpdir(), 'allworld-catalogue-host-'));
  t.after(() => rm(dist, { recursive: true, force: true }));
  await writeFile(join(dist, 'index.html'), '<!doctype html><title>The game</title><div id="app"></div>');
  for (const route of ['/county', '/cities', '/cities/scenes']) {
    const path = join(dist, route.slice(1), 'index.html');
    await mkdir(dirname(path), { recursive: true });
    await writeFile(path, `<!doctype html><meta name="allworld-3d-assets" content="true"><meta name="robots" content="noindex, nofollow"><title>World scene catalogue</title><div id="catalogue">${route}</div><script type="module" src="/assets/catalogue-test.js"></script>`);
  }
  const f = await fixture(t, { distDir: dist });
  for (const route of ['/county', '/cities', '/cities/scenes']) {
    for (const suffix of ['', '/', '/index.html']) {
      const response = await fetch(f.base + route + suffix + '?city=accra');
      assert.equal(response.status, 200);
      assert.match(await response.text(), new RegExp(`<div id="catalogue">${route}</div>`));
      assert.equal(response.headers.get('cache-control'), 'no-cache');
      assert.equal(response.headers.get('x-frame-options'), 'DENY');
      assert.equal(response.headers.get('set-cookie'), null);
      assert.match(response.headers.get('content-security-policy') ?? '', /script-src 'self'/);
      assert.match(response.headers.get('content-security-policy') ?? '', /img-src[^;]*blob:/);
      const head = await fetch(f.base + route + suffix, { method: 'HEAD' });
      assert.equal(head.status, 200);
      assert.equal(await head.text(), '');
      assert.equal(head.headers.get('cache-control'), 'no-cache');
    }
  }
  const game = await fetch(f.base + '/some/ordinary/game/link');
  assert.equal(game.status, 200);
  assert.match(await game.text(), /<div id="app"><\/div>/);
});

test('a missing catalogue build is a 404 rather than the game page', async (t) => {
  const dist = await mkdtemp(join(tmpdir(), 'allworld-catalogue-missing-'));
  t.after(() => rm(dist, { recursive: true, force: true }));
  await writeFile(join(dist, 'index.html'), '<!doctype html><div id="app">game</div>');
  const f = await fixture(t, { distDir: dist });
  const response = await fetch(f.base + '/cities/scenes?city=accra');
  assert.equal(response.status, 404);
  assert.equal(response.headers.get('cache-control'), 'no-store');
  assert.equal(await response.text(), 'Not found');
});
