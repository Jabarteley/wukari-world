// OWNER: spaces — the script sandbox's page (public/sandbox/, docs/SPACES-3D.md phase 4) is served with headers of its own: framed only
// by the game's page, no network, no pictures, no frames; and a worker from a blob is all it may make. The game's own page keeps its
// headers and still refuses to be framed.
import test from 'node:test';
import assert from 'node:assert/strict';
import { cp, mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fixture } from './test-fixture.ts';
import { isSandboxPath, SANDBOX_CONTENT_SECURITY_POLICY } from './security-headers.ts';

test('sandbox: its page and script are served with the sandbox policy; other paths are not', async (t) => {
  const dist = await mkdtemp(join(tmpdir(), 'sandbox-dist-'));
  t.after(() => rm(dist, { recursive: true, force: true }));
  await cp(new URL('../public/sandbox', import.meta.url), join(dist, 'sandbox'), { recursive: true });
  await writeFile(join(dist, 'index.html'), '<!doctype html><html><head><meta name="allworld-3d-assets" content="meshopt-glb"></head><body></body></html>');
  const f = await fixture(t, { distDir: dist } as never);
  for (const path of ['/sandbox/space.html', '/sandbox/space.js']) {
    const res = await fetch(f.base + path);
    assert.equal(res.status, 200, path);
    const csp = res.headers.get('content-security-policy') ?? '';
    assert.equal(csp, SANDBOX_CONTENT_SECURITY_POLICY);
    for (const part of ["connect-src 'none'", "frame-ancestors 'self'", 'worker-src blob:', "script-src 'self'", "img-src 'none'"]) assert.ok(csp.includes(part), `${path}: ${part}`);
    assert.equal(res.headers.get('x-frame-options'), 'SAMEORIGIN');
  }
  assert.match((await (await fetch(f.base + '/sandbox/space.js')).text()), /allow-scripts/);
  const page = await fetch(f.base + '/');
  assert.equal(page.headers.get('x-frame-options'), 'DENY', 'the game page itself is never framed');
  assert.ok(!(page.headers.get('content-security-policy') ?? '').includes("connect-src 'none'"));
  assert.equal(isSandboxPath('/sandbox/space.html'), true);
  assert.equal(isSandboxPath('/sandbox/../index.html'), false);
  assert.equal(isSandboxPath('/sandbox/other.html'), false);
});
