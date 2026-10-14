// OWNER: social — when the friendship card is shown (src/app/features/social/friendOfferModel.ts): once per pair per game, "not now" for a day,
// once per pair per day after five minutes in voice.
import test from 'node:test';
import assert from 'node:assert/strict';
import { DAY_MS, FriendTimer, VOICE_TOGETHER_MS, cardLine, cleanMemory, freshMemory, markGameShown, markNotNow, markVoiceShown, namesOf, tableCard, voiceDue } from './friendOfferModel.ts';

const ada = { id: 'a', name: 'Ada' }, bola = { id: 'b', name: 'Bola' }, bot = { id: 'g', name: 'Guide', ai: true as const };
const T = 1_800_000_000_000;

test('a game’s card is shown once: the same match asked again (a reconnect) gives nothing, the next game gives it again', () => {
  const memory = freshMemory();
  assert.deepEqual(tableCard(memory, { match: 'm1', people: [ada, bola] }, T), [ada, bola]);
  markGameShown(memory, 'm1');
  assert.deepEqual(tableCard(memory, { match: 'm1', people: [ada, bola] }, T + 1000), []);
  assert.deepEqual(tableCard(memory, { match: 'm2', people: [ada] }, T + 2000), [ada]);
  assert.deepEqual([tableCard(memory, undefined, T), tableCard(memory, null, T), tableCard(memory, { match: 'm3', people: [] }, T)], [[], [], []]);
});

test('"Not now" keeps that person off the next card for a day, and only that person; it ends after a day', () => {
  const memory = freshMemory();
  markNotNow(memory, ['a'], T);
  assert.deepEqual(tableCard(memory, { match: 'm1', people: [ada, bola] }, T + DAY_MS - 1), [bola]);
  assert.deepEqual(tableCard(memory, { match: 'm2', people: [ada, bola] }, T + DAY_MS), [ada, bola]);
  assert.equal(voiceDue(memory, 'a', T + 60000), false, 'not now covers the voice offer too');
});

test('the voice offer is once per pair per day', () => {
  const memory = freshMemory();
  assert.equal(voiceDue(memory, 'a', T), true);
  markVoiceShown(memory, ['a'], T);
  assert.deepEqual([voiceDue(memory, 'a', T + DAY_MS - 1), voiceDue(memory, 'a', T + DAY_MS), voiceDue(memory, 'b', T)], [false, true, true]);
});

test('five minutes together in voice: each person once, a break starts the count again, a person who is not there never counts', () => {
  const timer = new FriendTimer();
  assert.deepEqual(timer.note(T, ['a', 'b']), []);
  assert.deepEqual(timer.note(T + VOICE_TOGETHER_MS - 1, ['a', 'b']), []);
  assert.deepEqual(timer.note(T + VOICE_TOGETHER_MS, ['a', 'b']), ['a', 'b']);
  assert.deepEqual(timer.note(T + VOICE_TOGETHER_MS + 60000, ['a', 'b']), [], 'once, however long they stay');
  assert.deepEqual(timer.note(T + VOICE_TOGETHER_MS + 61000, ['b']), []); // a leaves
  assert.deepEqual(timer.note(T + VOICE_TOGETHER_MS + 62000, ['a', 'b']), []); // a returns: the count starts again
  assert.deepEqual(timer.note(T + 2 * VOICE_TOGETHER_MS + 62000, ['a', 'b']), ['a']);
  assert.deepEqual(timer.note(T + 3 * VOICE_TOGETHER_MS, []), [], 'when the player leaves voice the list is empty');
  assert.deepEqual(timer.note(T + 3 * VOICE_TOGETHER_MS + 1, ['a']), [], 'and everyone starts again');
});

test('memory read back from storage keeps only what is the right shape and what is recent', () => {
  assert.deepEqual(cleanMemory('junk', T), freshMemory());
  assert.deepEqual(cleanMemory({ shown: ['m1', 5], notNow: { a: T - 1000, b: T - 2 * DAY_MS, c: 'x' }, voice: [] }, T), { shown: ['m1'], notNow: { a: T - 1000 }, voice: {} });
  const many = cleanMemory({ shown: Array.from({ length: 100 }, (_, i) => `m${i}`) }, T);
  assert.equal(many.shown.length, 40);
});

test('words: names are joined plainly, and an AI-played person is still a person to ask', () => {
  assert.equal(namesOf([ada]), 'Ada');
  assert.equal(namesOf([ada, bola]), 'Ada and Bola');
  assert.equal(namesOf([ada, bola, bot]), 'Ada, Bola and 1 more');
  assert.match(cardLine('table', [ada]), /played with Ada/);
  assert.match(cardLine('voice', [ada, bola]), /talking with Ada and Bola/);
});

test('the card gift is ₦5,000: inside one gift and the daily limits, and a player short of cash is told so plainly', async () => {
  const { GIFT_AMOUNT, giftShort, giftLabel } = await import('./friendOfferModel.ts');
  const { TRANSFER_LIMITS: L } = await import('../../../game/content/npcs.ts');
  assert.equal(GIFT_AMOUNT, 5000);
  assert.ok(GIFT_AMOUNT >= L.min && GIFT_AMOUNT <= L.maxPerTransfer && GIFT_AMOUNT <= L.dailyAmount && GIFT_AMOUNT <= L.dailyReceive);
  assert.equal(giftLabel(GIFT_AMOUNT), 'Send ₦5,000');
  assert.equal(giftShort(5000), null);
  assert.equal(giftShort(1200), 'You need ₦5,000 to send this gift. You have ₦1,200.');
});
