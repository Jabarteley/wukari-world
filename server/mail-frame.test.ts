import test from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, statSync } from 'node:fs';
import { HERO, originOf } from './growth/email/frame.ts';
import { accountWelcomeMail, awayMail, build, confirmMail, weekMail, welcomeMail } from './growth/email/templates.ts';
import { comebackMail } from './growth/email/comeback.ts';
import { pingMail } from './growth/email/ping.ts';

const ORIGIN = 'https://play.example', U = `${ORIGIN}/e/unsub?t=abc`, S = `${ORIGIN}/e/unsub?t=stop`;
const digest = { subject: 'Your week in Lagos', greeting: 'Hi Ada.', lines: ['One', 'Two'], tasks: [{ text: 'Do a thing' }] };
const links = { origin: ORIGIN, stopUrl: S, unsubscribeUrl: U };
const kinds = {
  confirm: { mail: confirmMail({ name: 'Ada', confirmUrl: `${ORIGIN}/e/confirm?t=abc`, hours: 24 }), hero: 'confirm' },
  welcome: { mail: accountWelcomeMail({ name: 'Ada', playUrl: `${ORIGIN}/`, cities: ['Lagos', 'Accra'] }), hero: 'welcome' },
  optin: { mail: welcomeMail({ name: 'Ada', playUrl: `${ORIGIN}/`, unsubscribeUrl: U }), hero: 'welcome' },
  comeback: { mail: comebackMail({ plan: { type: 'need', key: 'k', need: 'hunger', go: 'needs' }, name: 'Ada', now: 0, links }), hero: 'home' },
  ping: { mail: pingMail({ from: 'Bola', place: 'at Freedom Park, Lagos', joinUrl: `${ORIGIN}/j/abc`, links }), hero: 'ping' },
  away: { mail: awayMail({ digest, playUrl: `${ORIGIN}/`, unsubscribeUrl: U }), hero: 'home' },
  week: { mail: weekMail({ digest, playUrl: `${ORIGIN}/`, unsubscribeUrl: U }), hero: 'home' },
  announcement: { mail: build('News', { heading: 'News', intro: 'A city opened.', button: { label: 'Open Allworld', url: `${ORIGIN}/` }, hero: 'update', foot: 'why', footText: 'why' }), hero: 'update' },
} as const;

test('every mail is one family: a picture of its own scene from the game’s own files, a table layout, a large button, nothing that tracks', () => {
  for (const [name, { mail, hero }] of Object.entries(kinds)) {
    const html = mail.html;
    assert.ok(Buffer.byteLength(html) < 60000, `${name}: small enough not to be clipped`);
    assert.match(html, /<meta charset="utf-8">/, `${name}: its characters are declared`);
    assert.match(html, /<meta name="color-scheme" content="light dark">/);
    assert.ok(!/<script|<form|<input|<iframe|<link|@import|@font-face|url\(|data:|http:\/\//i.test(html), `${name}: no script, form, web font, inline data or plain http`);
    const images = [...html.matchAll(/<img [^>]*>/g)].map((match) => match[0]);
    assert.equal(images.length, 1, `${name}: one picture`);
    assert.ok(images[0]?.includes(`src="${ORIGIN}/mail/${hero}-600.jpg" srcset="${ORIGIN}/mail/${hero}.jpg 2x" width="600" height="300" alt="`), `${name}: the ${hero} scene, at the public origin, with its size and a description`);
    assert.ok(images[0]?.includes('style="display:block;width:100%;max-width:600px;height:auto'), `${name}: a block that is fluid on a phone`);
    assert.ok(!/alt=""/.test(html), `${name}: the picture says what it shows`);
    assert.ok((html.match(/<table /g) ?? []).length === (html.match(/<table role="presentation"/g) ?? []).length, `${name}: layout tables only`);
    assert.match(html, /<a href="[^"]+" style="display:block;padding:16px 24px;[^"]*font-size:18px/, `${name}: one large button that is a link, so it works without images`);
    assert.ok(!/(\?|&)(utm_|track|open|pixel)=/i.test(html), `${name}: nothing reports an opening`);
    assert.ok(mail.text.length > 60 && !/<[a-z]/.test(mail.text), `${name}: a plain-text part that stands on its own`);
  }
});

test('the picture is left out, and the rest of the mail is whole, when no public origin is known', () => {
  const mail = build('News', { heading: 'News', intro: 'x', button: { label: 'Open', url: '/' }, hero: 'update', foot: 'f', footText: 'f' });
  assert.ok(!/<img /.test(mail.html) && mail.html.includes('>Open</a>'));
  assert.equal(originOf('javascript:alert(1)'), ''); assert.equal(originOf('https://play.example/a?b=1'), 'https://play.example');
});

test('a name is only ever text in the new frame', () => {
  const hostile = '<img src=x onerror=alert(1)>"\'&';
  for (const mail of [confirmMail({ name: hostile, confirmUrl: `${ORIGIN}/e/confirm?t=abc`, hours: 1 }), pingMail({ from: hostile, place: hostile, joinUrl: `${ORIGIN}/j/abc`, links }), comebackMail({ plan: { type: 'nudge', key: 'k', names: [hostile], newest: 0, go: 'people' }, name: hostile, now: 0, links })]) {
    assert.equal((mail.html.match(/<img /g) ?? []).length, 1, 'only the game’s own picture');
    assert.ok(!/<img src=x/.test(mail.html) && mail.html.includes('&lt;img'));
  }
});

test('each scene is a real file of the game, 1200x600 within about 90 kB, with a 600x300 fallback, in the static folder the release package ships', () => {
  for (const scene of Object.values(HERO)) {
    for (const [file, limit] of [[`${scene.file}.jpg`, 92000], [`${scene.file}-600.jpg`, 30000]] as const) {
      const path = new URL(`../public/mail/${file}`, import.meta.url);
      assert.ok(existsSync(path), file);
      assert.ok(statSync(path).size < limit, `${file} is ${statSync(path).size} bytes`);
    }
    assert.ok(scene.alt.length > 20 && scene.alt.length < 125);
  }
});
