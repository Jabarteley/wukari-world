/**
 * What the game answers instead of an AI character (ai-intercept.ts): "are you an AI?", words of crisis, and the help lines per country.
 */
import { loadCityContent as preloadCityContent } from '../../src/game/cities/registry.ts';
await preloadCityContent('lagos');
import test from 'node:test';
import assert from 'node:assert/strict';
import { GENERAL_HELP, HELP, aiAnswer, asksIfAi, countryOfCity, crisisWords, helpText } from './ai-intercept.ts';

test('"are you an AI?" is read in English, Nigerian English and Pidgin, and ordinary questions are not', () => {
  for (const text of [
    'are you an AI?', 'Are you a bot', 'are u a real person?', 'are you human', 'r u a robot', 'is this a bot?', 'are you real?', 'Hey, are you real', 'am i talking to a real person', 'am I talking to a bot?',
    'bot or human?', 'human or bot', 'you be bot?', 'you be real person?', 'na person or bot?', 'is there a real person typing?', 'are you actually a real human', 'ARE YOU AI??', 'wait, are you an AI agent?',
    'who dey type this?', 'are you just a program', 'are you really a person?',
  ]) assert.equal(asksIfAi(text), true, text);
  for (const text of [
    'are you a real fan of the Eagles?', 'are you a person who likes jollof?', 'are you a good cook', 'what are you selling', 'are you open today', 'is this the real market', 'are you a student',
    'I am a real person and I need help with rent', 'do you like bots in games', 'the bot in my phone game is annoying', '', 'a'.repeat(300),
  ]) assert.equal(asksIfAi(text), false, text);
  assert.equal(asksIfAi(undefined), false);
});

test('the game\'s answer names the AI characters', () => {
  assert.match(aiAnswer(['Tola']), /^Tola is an AI agent/);
  assert.match(aiAnswer(['Tola', 'Ife']), /^Tola, Ife are AI agents/);
  assert.match(aiAnswer([]), /AI mark/);
});

test('crisis words: self-harm, being hurt and danger are read, jokes about games are not', () => {
  for (const text of [
    'I want to kill myself', 'i wanna die', 'i wan die', 'thinking about suicide', 'i feel suicidal', 'I am going to hurt myself', 'i want to end it all', 'no reason to live',
    'I dont want to live anymore', 'self harm', 'someone is hurting me', 'he beats me', 'my uncle is touching me', 'I am being abused', 'i was raped', 'he is going to kill me', 'I am not safe', 'im in danger', 'better off dead',
  ]) assert.equal(crisisWords(text), true, text);
  for (const text of [
    'I will kill this boss tonight', 'this game is killing me lol', 'my phone died', 'I want to die laughing', 'the danger zone song', 'they are hurting the sales', 'I am in trouble with the landlord rent',
    'beat the high score', 'hello', '', 'what is the safest route to Yaba',
  ]) assert.equal(crisisWords(text), false, text);
  assert.equal(crisisWords(undefined), false);
});

test('help lines: the six countries have their numbers and a source, an unknown one gets the general line', () => {
  assert.deepEqual(Object.keys(HELP).sort(), ['gb', 'gh', 'ke', 'ng', 'us', 'za']);
  for (const entry of Object.values(HELP)) { assert.ok(entry.lines.length >= 1 && entry.source.length > 10 && entry.name); }
  assert.match(helpText('ng'), /In Nigeria: Emergency: 112/);
  assert.match(helpText('gh'), /In Ghana: Emergency: 112/);
  assert.match(helpText('ke'), /1199/);
  assert.match(helpText('za'), /0800 567 567/);
  assert.match(helpText('gb'), /116 123/);
  assert.match(helpText('us'), /988/);
  for (const iso of ['ng', 'gh', 'ke', 'za', 'gb', 'us']) assert.ok(helpText(iso).endsWith(GENERAL_HELP));
  for (const unknown of [null, 'fr', '']) { const text = helpText(unknown); assert.ok(text.endsWith(GENERAL_HELP) && !/ In /.test(text.replace('In danger', '')), String(unknown)); }
  assert.match(helpText('NG'), /Nigeria/);
});

test('a city maps to its country', () => {
  assert.equal(countryOfCity('lagos'), 'ng');
  assert.equal(countryOfCity('nowhere'), null);
  assert.equal(countryOfCity(null), null);
  assert.equal(countryOfCity(undefined), null);
});
