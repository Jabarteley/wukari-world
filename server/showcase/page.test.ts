// OWNER: showcase — the public shop page as text: what it says, what it leaves out, and that nothing a seller wrote can become markup.
import assert from 'node:assert/strict';
import test from 'node:test';
import { SHOWCASE } from '../../src/types/showcase.ts';
import type { ShowcaseShop } from '../../src/types/showcase.ts';
import { shopPageHtml, unavailablePageHtml } from './page.ts';

const TOKEN = 'k3x9m2q7', ORIGIN = 'https://play.example';
const shop = (over: Partial<ShowcaseShop> = {}): ShowcaseShop => ({
  v: 1, id: 'SC-7', owner: 'f3b1c2d4-aaaa-4bbb-8ccc-123456789abc', city: 'lagos', venue: 'balogun-market', slot: 3, name: 'Ada Braids', category: 'salon', template: 'classic', colours: ['#b4541a', '#fff4e6'], sign: 'Braids today', logo: 'scissors',
  about: 'Knotless braids and wigs.\nOpen six days.', services: [{ label: 'Knotless braids', priceNaira: 25000, note: 'Medium length' }, { label: 'Wig wash', priceNaira: 0, note: '' }],
  hours: [{ open: '09:00', close: '18:00' }, null, null, null, null, null, null], chat: { kind: 'whatsapp', url: 'https://wa.me/2348012345678' }, pay: null,
  photos: [{ id: 'p1', w: 800, h: 600, n: 1000, at: 1, approved: true, caption: 'Our chair' }, { id: 'p2', w: 640, h: 480, n: 1000, at: 1, approved: true }, { id: 'p3', w: 200, h: 200, n: 1000, at: 1, approved: true }],
  status: 'live', revision: 3, createdAt: 1, updatedAt: 2, pub: TOKEN, ...over,
});
const facts = (over: Partial<ShowcaseShop> = {}, more: { checked?: string | null; payNotice?: string | null } = {}) => ({ shop: shop(over), token: TOKEN, city: 'Lagos', market: 'Balogun Market', checked: more.checked ?? null, payNotice: more.payNotice ?? null });
const tag = (html: string, property: string): string => new RegExp(`<meta (?:property|name)="${property}" content="([^"]*)"`).exec(html)?.[1] ?? '';

test('the page carries the preview in its own HTML: title, description, address and the first photo', () => {
  const html = shopPageHtml(facts(), ORIGIN);
  assert.equal(tag(html, 'og:title'), 'Ada Braids — Allworld');
  assert.equal(tag(html, 'og:description'), 'Hair and salon in Lagos. Knotless braids and wigs. Open six days.');
  assert.equal(tag(html, 'og:url'), `${ORIGIN}/shop/ada-braids-${TOKEN}`);
  assert.equal(tag(html, 'og:image'), `${ORIGIN}/api/showcase/photo/p1`);
  assert.equal(tag(html, 'og:image:width'), '800');
  assert.equal(tag(html, 'twitter:image'), `${ORIGIN}/api/showcase/photo/p1`);
  assert.ok(html.includes(`<link rel="canonical" href="${ORIGIN}/shop/ada-braids-${TOKEN}">`));
  assert.ok(!/<script/i.test(html), 'no script at all');
});

test('no photo wide enough, or none at all: the site\'s own image is the preview', () => {
  const small = shopPageHtml(facts({ photos: [{ id: 'p3', w: 200, h: 200, n: 1, at: 1, approved: true }] }), ORIGIN);
  assert.equal(tag(small, 'og:image'), `${ORIGIN}/og/allworld.jpg`);
  const none = shopPageHtml(facts({ photos: [] }), ORIGIN);
  assert.equal(tag(none, 'og:image'), `${ORIGIN}/og/allworld.jpg`);
  assert.ok(none.includes('class="mark"'), 'a coloured mark with the first letter instead of a picture');
  assert.ok(!none.includes('<h2>Photos</h2>'));
  const hidden = shopPageHtml(facts({ photos: [{ id: 'hidden-photo', w: 800, h: 600, n: 1, at: 1, approved: true, hidden: true }, { id: 'unapproved-photo', w: 800, h: 600, n: 1, at: 1, approved: false }] }), ORIGIN);
  assert.ok(!hidden.includes('hidden-photo') && !hidden.includes('unapproved-photo'), 'a hidden or unapproved photo is never named');
});

test('shop text is user content: a name of "><script> and every other field are inert', () => {
  const nasty = '"><script>alert(1)</script>';
  const html = shopPageHtml(facts({ name: nasty, sign: nasty, about: `${nasty}\n<img src=x onerror=alert(2)>`, services: [{ label: nasty, priceNaira: 100, note: '<b onmouseover=x>' }], photos: [{ id: 'p1', w: 800, h: 600, n: 1, at: 1, approved: true, caption: nasty }] }, { checked: nasty, payNotice: nasty }), ORIGIN);
  assert.ok(!/<script/i.test(html), 'no tag was made');
  assert.ok(!html.includes(nasty), 'the raw text is nowhere');
  assert.ok(!/<img src=x/i.test(html) && !/<b onmouseover/i.test(html));
  assert.ok(html.includes('&quot;&gt;&lt;script&gt;'), 'the text is shown, as text');
  for (const property of ['og:title', 'og:description', 'twitter:title', 'og:image:alt']) assert.ok(!/[<>]/.test(tag(html, property)), property);
  // A colour that is not a colour does not reach the style attribute.
  const colours = shopPageHtml(facts({ colours: ['red;}</style><script>', '#12345'] }), ORIGIN);
  assert.ok(!colours.includes('</style><script>') && colours.includes('--c1:#1f3a5f;--c2:#f1f3f5'));
  // Nor does an origin that is not one.
  assert.ok(!shopPageHtml(facts(), 'https://x"><script>').includes('<script'));
});

test('buying: Message the seller on the shop and on every item, opening the seller\'s own chat with the words filled in', () => {
  const html = shopPageHtml(facts(), ORIGIN);
  const links = [...html.matchAll(/<a class="btn[^"]*" href="(https:\/\/wa\.me[^"]*)"([^>]*)>([^<]*)<\/a>/g)];
  assert.equal(links.length, 3, 'the shop and two items');
  for (const link of links) { assert.equal(link[3], 'Message the seller'); assert.ok(link[2]?.includes('target="_blank" rel="noopener noreferrer"')); }
  const decoded = links.map((link) => new URL((link[1] ?? '').replaceAll('&amp;', '&')).searchParams.get('text'));
  assert.equal(decoded[0], 'Hello, I found Ada Braids on Allworld and I would like to know more.');
  assert.equal(decoded[1], 'Hello, I found Ada Braids on Allworld and I am interested in Knotless braids (₦25,000). Is it available?');
  assert.equal(decoded[2], 'Hello, I found Ada Braids on Allworld and I am interested in Wig wash. Is it available?');
  assert.ok(html.includes('You deal directly with the seller.'));
  assert.ok(html.includes('₦25,000') && html.includes('Ask for the price'));
  assert.ok(!html.includes('Pay the seller'), 'no pay link, no pay button');
  const paid = shopPageHtml(facts({ pay: { kind: 'selar', url: 'https://selar.co/ada/tailoring' } }, { payNotice: 'Payment details changed recently' }), ORIGIN);
  assert.ok(paid.includes('href="https://selar.co/ada/tailoring" target="_blank" rel="noopener noreferrer">Pay the seller'));
  assert.ok(paid.includes('Payment details changed recently.'));
  // A stored link that is not https, tel or mailto is not given out, whatever got into the record.
  const bad = shopPageHtml(facts({ chat: { kind: 'whatsapp', url: 'javascript:alert(1)' }, pay: { kind: 'selar', url: 'data:text/html,x' } }), ORIGIN);
  assert.ok(!/javascript:|data:text/.test(bad));
  assert.ok(bad.includes('has not added a way to message them yet'));
});

test('a seller\'s phone number or e-mail link works the same way, with a subject for the e-mail', () => {
  const phone = shopPageHtml(facts({ chat: { kind: 'whatsapp', url: 'tel:+2348012345678' } }), ORIGIN);
  assert.ok(phone.includes('href="tel:+2348012345678">Message the seller'));
  const mail = shopPageHtml(facts({ chat: { kind: 'whatsapp', url: 'mailto:ada@example.com' } }), ORIGIN);
  assert.ok(mail.includes('href="mailto:ada@example.com?subject=Ada%20Braids&amp;body='));
});

test('what the page does not say: no player id, no coordinates, no counts, and "Step inside" leads to the game with the token', () => {
  const html = shopPageHtml(facts({}, { checked: 'Phone checked' }), ORIGIN);
  assert.ok(!html.includes('f3b1c2d4') && !html.includes('SC-7') && !html.includes('balogun-market'));
  assert.ok(!/\bonline\b|latitude|longitude/i.test(html));
  assert.ok(html.includes(`href="${ORIGIN}/?go=shop&amp;shop=${TOKEN}">Step inside`));
  assert.ok(html.includes('Phone checked'));
  assert.ok(html.length < 16000, `${html.length} bytes`);
});

test('a shop with no items or no hours says so plainly', () => {
  const html = shopPageHtml(facts({ services: [], hours: [null, null, null, null, null, null, null] }), ORIGIN);
  assert.ok(html.includes('Nothing is listed yet.') && html.includes('Ask the seller when they are open.'));
  assert.equal(SHOWCASE.photosMin, 3);
});

test('a shop that is not available gets a plain page with a way into the game, and tells crawlers nothing about a shop', () => {
  const html = unavailablePageHtml(ORIGIN);
  assert.ok(html.includes('<h1>This shop is not available</h1>'));
  assert.ok(html.includes(`<a class="btn" href="${ORIGIN}/">Open Allworld</a>`));
  assert.equal(tag(html, 'robots'), 'noindex, nofollow');
  assert.equal(tag(html, 'og:image'), `${ORIGIN}/og/allworld.jpg`);
  assert.ok(!/<script/i.test(html));
});
