import assert from 'node:assert/strict';
import test from 'node:test';
import { SHOP_TOKEN_ALPHABET, buyMessage, isShopToken, messageHref, priceWords, safeLink, shareMessage, shopEntryPath, shopPath, shopSlug, shopTokenOf } from './showcase-link.ts';
import { shopFrom } from '../game/go-links.ts';

const TOKEN = 'k3x9m2q7';

test('a shop address: a readable name and the token, and only the token finds the shop', () => {
  assert.equal(shopPath('Ada Braids & Beauty', TOKEN), '/shop/ada-braids-beauty-k3x9m2q7');
  assert.equal(shopPath('  ***  ', TOKEN), '/shop/k3x9m2q7', 'a name with no letters leaves the token alone');
  assert.equal(shopPath('Ṣọ́ọ̀pù Àdùn', TOKEN), '/shop/soopu-adun-k3x9m2q7', 'accents are dropped, not the letters');
  assert.equal(shopPath('🙂🙂🙂', TOKEN), '/shop/k3x9m2q7');
  assert.ok(shopSlug('x'.repeat(100)).length <= 30);
  for (const path of ['/shop/ada-braids-beauty-k3x9m2q7', '/shop/k3x9m2q7', '/shop/k3x9m2q7/', '/shop/old-name-k3x9m2q7']) assert.equal(shopTokenOf(path), TOKEN, path);
  for (const path of ['/shop/', '/shop/k3x9m2q', '/shop/k3x9m2q77', '/shop/ada-K3X9M2Q7', '/shop/ada-k3x9m2q0', '/shop/ada-k3x9m2ql', '/shop/../k3x9m2q7', '/shop/a/b-k3x9m2q7', '/shop/SC-1', '/shops/k3x9m2q7', '', null, 7]) assert.equal(shopTokenOf(path), null, String(path));
  assert.equal(isShopToken(TOKEN), true);
  assert.equal(isShopToken('SC-12'), false);
  assert.ok(![...'01ilo'].some((char) => SHOP_TOKEN_ALPHABET.includes(char)), 'no look-alike characters');
});

test('"Step inside" carries the token to the game, which reads back only a token', () => {
  assert.equal(shopEntryPath(TOKEN), '/?go=shop&shop=k3x9m2q7');
  assert.equal(shopFrom('?go=shop&shop=k3x9m2q7'), TOKEN);
  assert.equal(shopFrom('?shop=k3x9m2q7#x'), TOKEN);
  for (const bad of ['', '?shop=', '?shop=SC-1', '?shop=k3x9m2q7k3', '?shop=<script>', '?xshop=k3x9m2q7', null, 3]) assert.equal(shopFrom(bad), null, String(bad));
});

test('prices are the seller\'s own, with separators; zero asks for a price', () => {
  assert.equal(priceWords(5000), '₦5,000');
  assert.equal(priceWords(1234567), '₦1,234,567');
  assert.equal(priceWords(999), '₦999');
  assert.equal(priceWords(0), 'Ask for the price');
});

test('the first message names the shop and the item, and stays short for a long name, an emoji or an ampersand', () => {
  assert.equal(buyMessage('Ada Braids', { label: 'Knotless braids', priceNaira: 25000 }), 'Hello, I found Ada Braids on Allworld and I am interested in Knotless braids (₦25,000). Is it available?');
  assert.equal(buyMessage('Ada Braids'), 'Hello, I found Ada Braids on Allworld and I would like to know more.');
  assert.equal(buyMessage('Ada', { label: 'Free advice', priceNaira: 0 }), 'Hello, I found Ada on Allworld and I am interested in Free advice. Is it available?');
  const long = buyMessage('N'.repeat(500), { label: 'L'.repeat(500), priceNaira: 100 });
  assert.ok(long.length < 260, `${long.length}`);
  assert.ok(long.includes('…'));
  assert.ok(Array.from(buyMessage('🙂'.repeat(200))).every((char) => char.length >= 1));
  assert.equal(buyMessage('Tom & Jerry <b>', { label: 'Cake "big"', priceNaira: 1 }).includes('Tom & Jerry <b>'), true, 'the message is plain text; the page escapes it, the address encodes it');
  assert.equal(shareMessage('Ada Braids', 'https://play.example/shop/ada-braids-k3x9m2q7'), 'Ada Braids is open on Allworld. See what we offer and message us: https://play.example/shop/ada-braids-k3x9m2q7');
});

test('a chat link opens with the first words filled in, encoded', () => {
  const message = buyMessage('Tom & Jerry 🙂', { label: 'Cake & tea = 100%', priceNaira: 2500 });
  const href = messageHref('https://wa.me/2348012345678', message, 'x');
  assert.ok(href?.startsWith('https://wa.me/2348012345678?text='));
  const url = new URL(href ?? '');
  assert.equal(url.searchParams.get('text'), message, 'the words come back exactly');
  assert.ok(!(href ?? '').slice((href ?? '').indexOf('?') + 6).includes('&'), 'an ampersand in a name cannot start another parameter');
  assert.ok(!(href ?? '').includes(' '));
  // A text already in the seller's own link is replaced, other parameters stay.
  assert.equal(new URL(messageHref('https://wa.me/2348012345678?text=old&app_absent=1', 'hi') ?? '').searchParams.get('text'), 'hi');
  assert.equal(new URL(messageHref('https://wa.me/2348012345678?text=old&app_absent=1', 'hi') ?? '').searchParams.get('app_absent'), '1');
  // A messaging link that takes no text is opened as it is.
  assert.equal(messageHref('https://instagram.com/adabraids', 'hi'), 'https://instagram.com/adabraids');
  // A phone number and an e-mail address, built the way a seller's own link of that kind would be.
  assert.equal(messageHref('tel:+2348012345678', 'hi'), 'tel:+2348012345678');
  assert.equal(messageHref('mailto:ada@example.com', 'Hello & welcome', 'Ada Braids: Cake'), 'mailto:ada@example.com?subject=Ada%20Braids%3A%20Cake&body=Hello%20%26%20welcome');
  // A lone half of an emoji cannot be encoded: the link opens without the words rather than not at all.
  assert.equal(messageHref('https://wa.me/2348012345678', '\ud83d'), 'https://wa.me/2348012345678');
});

test('only https, tel and mailto are ever given to a visitor', () => {
  for (const good of ['https://wa.me/2348012345678', 'https://instagram.com/ada', 'tel:+2348012345678', 'tel:08012345678', 'mailto:ada@example.com']) assert.ok(safeLink(good), good);
  const bad = ['javascript:alert(1)', 'JaVaScRiPt:alert(1)', ' javascript:alert(1)', 'data:text/html,<script>alert(1)</script>', 'file:///etc/passwd', 'http://wa.me/1', 'ftp://x.example/1', 'vbscript:x', '//wa.me/1', 'wa.me/1', 'https://user:pass@wa.me/1', 'https://wa.me/1 onclick=x', 'https://wa.me/1"><script>', 'tel:+234<script>', 'tel:abc', 'mailto:a@b.c?cc=x@y.z', 'mailto:a@b.c,d@e.f', 'mailto:', 'https://', '', '  ', 7, null, undefined, `https://wa.me/${'a'.repeat(400)}`];
  for (const value of bad) assert.equal(safeLink(value), null, String(value));
  for (const value of bad) assert.equal(messageHref(value, 'hi'), null, String(value));
});
