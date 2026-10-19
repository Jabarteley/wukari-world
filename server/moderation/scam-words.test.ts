// OWNER: moderation — the scam warning's detector: lines that ask for money, a withdrawal, an account number or a code are flagged; ordinary game talk and
// warnings against scams are not. English, Nigerian English and Pidgin. Nothing here blocks a line: it is only the flag the recipient's banner reads.
import test from 'node:test';
import assert from 'node:assert/strict';
import { looksLikeScam } from './scam-words.ts';

const FLAGGED = [
  // the plan's own example, and the cash-out shapes
  'send me 5k make I help you withdraw',
  'I fit help you withdraw your millions, just send 2k',
  'Abeg make I help you cash out your naira',
  'I can withdraw it for you',
  'Your withdrawal is ready, pay the withdrawal fee',
  'Contact the withdrawal agent on this page',
  'unlock your millions today',
  'I will unlock your wallet for you',
  'Verify your account to receive your winnings',
  'claim your millions now',
  'your winnings are waiting',
  // turning game naira into real money
  'I buy game naira for real money',
  'Sell me your naira, I pay cash',
  'convert your naira to real cash',
  'swap your game money for dollars',
  // an ask for money, an account number or a code
  'please send me 5000 naira',
  'abeg dash me small money',
  'send money to my account',
  'drop your account number',
  'what is your account number',
  'send me the OTP you got',
  'give me the verification code',
  'send your pin',
  'the code sent to your phone, read it to me',
  'Wetin you dey wait for, send me airtime',
  // disguised
  'S e n d  m e  m o n e y', 'send me m0ney',
  'sennnd me 5k',
  'SEND ME ₦5,000',
];
const ORDINARY = [
  'good morning, anybody for a game of Ayo?',
  'I bought a danfo ticket for 500 naira',
  'The Square is full tonight',
  'who wants to run for governor this week',
  'my savings deposit matured, I took it out of the bank',
  'I did not get paid for the shift',
  'send me a friend request',
  'send me your location in the game',
  'meet me at the market',
  'the code for the mission is on the board',
  'I need a job, any hiring?',
  'send me the link to the recipe',
  'no worries, see you at the owambe',
  'how much is jollof here',
  'I earned 1200 naira today',
  '',
  '   ',
];
const WARNINGS = [
  'Game naira is never real money. Nobody can withdraw it for you.',
  'nobody can withdraw game naira',
  'you cannot withdraw naira, it is a scam',
  'never send your OTP to anybody',
  'do not share your code or pin',
  'no one can unlock your wallet',
];

test('scam words: flags a request for money, a withdrawal, an account number or a code', () => {
  for (const line of FLAGGED) assert.equal(looksLikeScam(line), true, line);
});
test('scam words: leaves ordinary game talk alone', () => {
  for (const line of ORDINARY) assert.equal(looksLikeScam(line), false, line);
});
test('scam words: a warning against scams is not a scam', () => {
  for (const line of WARNINGS) assert.equal(looksLikeScam(line), false, line);
});
test('scam words: "dont worry" does not turn an offer into a warning', () => {
  assert.equal(looksLikeScam('dont worry, I go help you withdraw'), true);
});
test('scam words: not a string, too short, or very long is safe', () => {
  for (const value of [undefined, null, 5, {}, 'ok']) assert.equal(looksLikeScam(value), false);
  assert.equal(looksLikeScam('hello '.repeat(5000)), false);
  assert.equal(looksLikeScam(`${'hello '.repeat(5000)} send me 5k`), false, 'only the first 1000 characters are read');
});
