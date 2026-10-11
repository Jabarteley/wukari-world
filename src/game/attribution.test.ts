// OWNER: growth — the cleaning of the utm_ words (src/game/attribution.ts).
import test from 'node:test';
import assert from 'node:assert/strict';
import { cleanSource, cleanSourceWord } from './attribution.ts';

test('a word is lower-cased and kept when it is only a-z, 0-9, _ and -', () => {
  assert.equal(cleanSourceWord('TikTok'), 'tiktok');
  assert.equal(cleanSourceWord(' Spring_Sale-2 '), 'spring_sale-2');
  assert.equal(cleanSourceWord('a'.repeat(40)), 'a'.repeat(40));
});

test('anything else, or nothing, is dropped to the fallback', () => {
  for (const bad of ['a'.repeat(41), 'two words', 'café', '<script>', 'a|b', '../x', '', '   ', null, undefined, 7, {}, ['tiktok']]) assert.equal(cleanSourceWord(bad), 'direct', String(bad));
  assert.equal(cleanSourceWord('', 'none'), 'none');
});

test('a visit has four cleaned words; a missing content word is none, the rest direct', () => {
  assert.deepEqual(cleanSource({ source: 'TikTok', medium: 'paid', campaign: 'Test1' }), { source: 'tiktok', medium: 'paid', campaign: 'test1', content: 'none' });
  assert.deepEqual(cleanSource(null), { source: 'direct', medium: 'direct', campaign: 'direct', content: 'none' });
  assert.deepEqual(cleanSource({ source: 'x y', medium: 5, campaign: 'ok', content: 'Video-A' }), { source: 'direct', medium: 'direct', campaign: 'ok', content: 'video-a' });
  // Only the four words are read: nothing else on the object comes through.
  assert.deepEqual(Object.keys(cleanSource({ source: 'a', playerId: 'p1', ip: '1.2.3.4' })), ['source', 'medium', 'campaign', 'content']);
});
