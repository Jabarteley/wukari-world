/**
 * OWNER: growth
 * THE PING MAIL: "Ada is waiting for you in Allworld" (docs/COMEBACK-MAIL.md, "Ping"), as a pure function of plain data:
 * { subject, text, html }. It is in the frame of every message (./frame.ts) with the picture of two people at a stall. One button, the join link. The
 * only thing fetched when it is read is that picture, a static file of the game itself, no pixel and no redirect that reports an opening: the only thing the server ever learns is
 * that the join link itself was used, by the signed-in player it was made for.
 *
 * Every value written into HTML is escaped. The two player-chosen values are display names, which passed the text filter;
 * a venue name comes from the game's own content and is escaped all the same.
 * The footer says why the mail was sent and carries three links that need no sign-in: stop e-mails about friends,
 * unsubscribe from everything, and the preferences in the game.
 */
import { goUrl } from '../../../src/game/go-links.ts';
import { STOP_WORDS } from '../../../src/game/comeback-words.ts';
import { PING, pingLine } from '../../../src/game/ping.ts';
import { BRAND, buttonRow, cardRow, esc, heading, originOf, paragraph, shell, softBox } from './frame.ts';
import type { Mail } from './templates.ts';

export interface PingMailInput {
  /** The friend who pinged: their display name. */
  from: string
  /** "at Freedom Park, Lagos" · "at home in Lagos" (src/game/ping.ts placeWords). */
  place: string
  /** The join link: `<origin>/j/<token>`. */
  joinUrl: string
  links: { origin: string; /** Stops e-mails about friends (one-click page). */ stopUrl: string; /** Unsubscribes from everything (the List-Unsubscribe address). */ unsubscribeUrl: string }
  contact?: string
  /** Where the address came from: it decides the sentence that says why the mail was sent. */
  source?: 'contact' | 'account'
}
interface PingParts {
  subject: string; preheader: string; tagline: string; heading: string; intro: string; land: string
  live: { title: string; text: string }
  button: { label: string; url: string }; fallback: string; safe: string
  why: string; stop: { label: string; url: string }; all: { label: string; url: string }; prefs: { label: string; url: string }; contact: string; origin: string
}

function pingLayout(m: PingParts): string {
  const link = (item: { label: string; url: string }) => `<a class="aw-muted" href="${esc(item.url)}" style="color:#56625b;text-decoration:underline">${esc(item.label)}</a>`;
  const body = [
    cardRow(`${heading(m.heading)}${paragraph(m.intro)}${paragraph(m.land, { strong: true })}`, '0 32px 10px'),
    buttonRow(m.button.label, m.button.url, m.fallback),
    softBox(m.live.title, m.live.text),
    cardRow(`<div class="aw-rule" style="border-top:1px solid #e3e8e4;font-size:0;line-height:0">&nbsp;</div><p class="aw-muted" style="margin:14px 0 0;color:#56625b;font-size:14px;line-height:1.5">${esc(m.safe)}</p>`, '0 32px 8px'),
  ].join('\n');
  return shell({ subject: m.subject, preheader: m.preheader, hero: m.origin ? { kind: 'ping', origin: m.origin } : undefined, tagline: m.tagline, body,
    foot: `${esc(m.why)}<br>${link(m.stop)} · ${link(m.all)} · ${link(m.prefs)}${m.contact ? `<br>${esc(m.contact)}` : ''}` });
}
const pingPlain = (m: PingParts): string => [m.heading, '', m.intro, m.land, '', `${m.button.label}: ${m.button.url}`, '', `${m.live.title}: ${m.live.text}`, '', m.safe, '',
  m.why, `${m.stop.label}: ${m.stop.url}`, `${m.all.label}: ${m.all.url}`, `${m.prefs.label}: ${m.prefs.url}`, ...(m.contact ? [m.contact] : [])].join('\n');

export function pingMail({ from, place, joinUrl, links, contact, source = 'contact' }: PingMailInput): Mail {
  const who = pingLine(from, 24) || 'A friend', where = pingLine(place, 120) || `in ${BRAND}`;
  const parts: PingParts = {
    subject: `${who} is waiting for you in ${BRAND}`,
    preheader: `${who} is ${where}. Join them and you land right there.`,
    tagline: 'The whole world, to live in',
    heading: `${who} is waiting for you`,
    intro: `${who} is in ${BRAND} right now, ${where}, and pinged you to come.`,
    land: `Press the button and you land right where ${who} is, ready to play and talk.`,
    live: { title: `Good for ${PING.liveMinutes} minutes`, text: `The invitation is live while ${who} is still in the game. If they have left when you arrive, the button simply opens ${BRAND} and you can send them a message.` },
    button: { label: `Join ${who}`, url: joinUrl },
    fallback: 'Or copy this address into your browser:',
    safe: 'The link was made for you and does not sign anybody in: you play as yourself, on a device where you already play or after you log in.',
    why: source === 'account'
      ? `You get this because ${who}, a friend of yours in ${BRAND}, pinged you, and your ${BRAND} account e-mails you about your friends. A friend’s ping reaches you at most ${PING.mail.recipientPerDay} times a day, never at night.`
      : `You get this because ${who}, a friend of yours in ${BRAND}, pinged you, and you asked ${BRAND} to e-mail you about your friends. A friend’s ping reaches you at most ${PING.mail.recipientPerDay} times a day, never at night.`,
    stop: { label: STOP_WORDS.friends, url: links.stopUrl },
    all: { label: 'Unsubscribe from everything', url: links.unsubscribeUrl },
    prefs: { label: 'Change what I get', url: goUrl(links.origin, 'touch') },
    contact: contact ?? '', origin: originOf(joinUrl),
  };
  return { subject: parts.subject, html: pingLayout(parts), text: pingPlain(parts) };
}
