// OWNER: growth — the public money page: /money on the Node host, plain HTML, no script; it says game naira is never real money, what real money exists and who holds it.
import test from 'node:test';
import assert from 'node:assert/strict';
import { fixture } from './test-fixture.ts';
import { moneyPageHtml } from './money-page.ts';
import { privacyPageHtml } from './privacy-page.ts';

test('money page: served at /money, says game naira is never real money, names the real-money features and Bachs, tells how to report, links back, has no script', async (t) => {
  const f = await fixture(t, { env: {} });
  const res = await f.request('/money');
  assert.equal(res.status, 200);
  assert.match(res.headers.get('content-type') ?? '', /text\/html/);
  const html = await res.text();
  for (const words of ['<title>Money — Allworld</title>', 'game naira is never real money', 'nobody can withdraw it', 'Business boosts', 'Tickets and gig pay', 'The creator pool', 'Allworld never holds your money', 'Bachs', 'Report', 'OTP', 'href="' + f.base + '/"', 'href="' + f.base + '/privacy"']) assert.ok(html.includes(words), words);
  assert.equal(/<script/i.test(html), false, 'no script on the page');
  assert.equal(moneyPageHtml('https://joinallworld.com').includes('href="https://joinallworld.com/money"'), true, 'canonical on the live origin');
});

test('money page: the privacy page links to it', () => {
  assert.equal(privacyPageHtml('https://joinallworld.com').includes('href="https://joinallworld.com/money"'), true);
});
