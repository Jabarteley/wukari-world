// OWNER: engine — cleanText must be idempotent so saved text reloads to the same shape.
import test from 'node:test';
import assert from 'node:assert/strict';
import { cleanText } from './util.ts';

const PIECES = ['a', 'Z', '7', ' ', ' ', '\n', '\t', '\u0000', ' ', ' ', '　', 'é', '🧑🏾', '…', '-', '—', '\r\n'];

/** A small deterministic generator, so a failure repeats. */
function rng(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

test('cleanText is idempotent for random strings and lengths', () => {
  const next = rng(20261014);
  for (let i = 0; i < 5000; i++) {
    const length = Math.floor(next() * 60);
    let text = '';
    for (let j = 0; j < length; j++) text += PIECES[Math.floor(next() * PIECES.length)];
    const max = Math.floor(next() * 40);
    const once = cleanText(text, max);
    assert.equal(cleanText(once, max), once, `max ${max}, input ${JSON.stringify(text)}`);
    assert.ok(once.length <= max, 'never longer than max');
    assert.equal(once, once.trim(), 'no space at either end');
  }
});

test('cleanText trims a space left at the cut (spaces, newlines and unicode spaces)', () => {
  assert.equal(cleanText('abc def', 4), 'abc');
  assert.equal(cleanText('abc def', 4), 'abc');
  assert.equal(cleanText('abc　def', 4), 'abc');
  assert.equal(cleanText('abc   def', 6), 'abc');
});

test('cleanText keeps what it kept before when the cut does not end in a space', () => {
  assert.equal(cleanText('  hello world  ', 80), 'hello world');
  assert.equal(cleanText('hello world', 5), 'hello');
  assert.equal(cleanText('a\u0000b\nc', 80), 'abc');
  assert.equal(cleanText('abc', 80), 'abc');
  assert.equal(cleanText('   ', 80, 'Fallback'), 'Fallback');
  assert.equal(cleanText(42, 80, 'Fallback'), 'Fallback');
});

test('the Atlas Cove Station ledger reason survives a reload unchanged', () => {
  const reason = 'Charter flight between Cape Town and Atlas Cove Station to Landing strip at the hut';
  assert.equal(reason.slice(0, 80).endsWith(' '), true, 'the 80th character is a space');
  const saved = cleanText(reason, 80, 'Adjustment');
  assert.equal(saved, 'Charter flight between Cape Town and Atlas Cove Station to Landing strip at the');
  assert.equal(cleanText(saved, 80, 'Adjustment'), saved);
});
