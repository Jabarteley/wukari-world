// OWNER: growth — the public privacy page: /privacy on the Node host, plain HTML, no script, the facts a store listing needs.
import test from 'node:test';
import assert from 'node:assert/strict';
import { fixture } from './test-fixture.ts';
import { privacyPageHtml } from './privacy-page.ts';

test('privacy page: served at /privacy, says what is stored and what never leaves the phone, links back, has no script', async (t) => {
  const f = await fixture(t, { env: {} });
  const res = await f.request('/privacy');
  assert.equal(res.status, 200);
  assert.match(res.headers.get('content-type') ?? '', /text\/html/);
  const html = await res.text();
  for (const words of ['<title>Privacy — Allworld</title>', 'never receives, stores or logs your position', 'Settings → Account', 'PostHog', 'Bachs', 'href="' + f.base + '/"']) assert.ok(html.includes(words), words);
  assert.equal(/<script/i.test(html), false, 'no script on the page');
  assert.equal(privacyPageHtml('https://joinallworld.com').includes('href="https://joinallworld.com/privacy"'), true, 'canonical on the live origin');
});
