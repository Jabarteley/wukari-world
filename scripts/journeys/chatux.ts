#!/usr/bin/env node
/**
 * Chat flow capture: the whole Messages experience in a real browser, at three screen sizes, with the same screens saved under the
 * same names so two runs (before and after a change) can be laid side by side. Players: Ada (the one on screen), Bola (a second
 * browser, so there is presence and live delivery) and several friends made through the real routes. Local loopback server, fresh
 * data folder, no outside request (scripts/journeys/lab.ts). Phone sizes are a simulation (touch, 3x scale; one pass also with a
 * 4G-like network and a 4x slower CPU), not a phone.
 *
 *   node --experimental-strip-types --no-warnings scripts/journeys/chatux.ts --out <folder> --pass d1280|p390|p320 [--port 4391] [--debug-port 4392]
 *
 * A step that cannot be done is recorded as such and the run goes on; the tap counts of the main tasks go to taps-<pass>.json.
 */
import { writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { Browser, sleep } from './cdp.ts';
import { startLab } from './lab.ts';
import { arg, dismiss, layoutProbe, life, must, pageCall, actionId, playNow, sessionId, syncClock, text, until, visible } from './kit.ts';
import type { Lab } from './lab.ts';

const port = Number(arg('port', '4391')), debugPort = Number(arg('debug-port', '4392'));
const pass = arg('pass');
const out = arg('out');
const VIEWS: Record<string, { width: number; height: number; scale: number; mobile: boolean; slow: boolean }> = {
  d1280: { width: 1280, height: 800, scale: 1, mobile: false, slow: false },
  p390: { width: 390, height: 844, scale: 3, mobile: true, slow: false },
  p320: { width: 320, height: 568, scale: 3, mobile: true, slow: true },
};
const view = VIEWS[pass];
must(view, `unknown pass ${pass}`);
const DAY = 86400000;
const lab: Lab = await startLab(port, { CHAT_IMAGES: 'friends' });
const A = await Browser.launch(debugPort, ['--use-fake-ui-for-media-stream', '--use-fake-device-for-media-stream']);
const B = await Browser.second(debugPort, A);
console.log(`[${pass}] temp: ${A.profile} ${lab.dir}`);
const log: Record<string, unknown> = { pass, steps: [] as string[], notes: [] as string[], taps: {} as Record<string, number>, probes: {} as Record<string, unknown> };
const note = (text: string): void => { (log['notes'] as string[]).push(text); console.log(`[${pass}] note: ${text}`); };
const saveLog = (): void => writeFileSync(join(out, `log-${pass}.json`), JSON.stringify(log, null, 2));
for (const sig of ['SIGINT', 'SIGTERM'] as const) process.once(sig, () => { try { A.child.kill('SIGKILL'); } catch { /* gone */ } process.exit(130); });

// ---- helpers -----------------------------------------------------------------------------------------------------
let shotNo = 0;
/** One screenshot under the stable name of its scene. */
async function snap(id: string, p: Browser = A): Promise<void> {
  const file = `${pass}-${id}.png`;
  await p.screenshot(join(out, file)).catch(() => undefined);
  (log['steps'] as string[]).push(file);
  shotNo += 1;
}
/** Runs one scene; a failure is written down and does not stop the run. */
async function scene(id: string, body: () => Promise<void>): Promise<boolean> {
  try { await body(); console.log(`[${pass}] ${id} ok`); return true; } catch (error) {
    const reason = error instanceof Error ? error.message : String(error);
    note(`${id} FAILED: ${reason.slice(0, 300)}`);
    await snap(`${id}-FAILED`).catch(() => undefined);
    return false;
  }
}
/** Counts the touches a task needs (each tap on a control; typing is not counted). */
async function taps(name: string, body: () => Promise<void>): Promise<void> {
  const original = A.tapAt.bind(A);
  let count = 0;
  A.tapAt = async (x: number, y: number): Promise<void> => { count += 1; await original(x, y); };
  try { await body(); (log['taps'] as Record<string, number>)[name] = count; } catch (error) { (log['taps'] as Record<string, number>)[name] = -count; throw error; } finally { A.tapAt = original; }
}
const HERE = (selector: string, wanted?: string): Promise<boolean> => visible(A, selector, wanted);
const money = (n: number): string => `₦${n.toLocaleString('en-US')}`;
void money;

interface Guest { name: string; id: string; cookie: string }
async function guest(name: string): Promise<Guest> {
  const s = await lab.call('/api/session', { name });
  const cookie = s.setCookie as string;
  await lab.call('/api/life?city=lagos', undefined, cookie);
  const me = await lab.call('/api/session', undefined, cookie);
  return { name, id: me['session']?.id as string, cookie };
}
async function befriend(a: { id: string; cookie: string }, b: { id: string; cookie: string }): Promise<void> {
  const asked = await lab.call('/api/social/friends/request', { to: b.id, cityId: 'lagos' }, a.cookie);
  must(asked['code'] === 'requested', `friend request ${JSON.stringify(asked).slice(0, 200)}`);
  const answered = await lab.call('/api/social/friends/answer', { from: a.id, accept: true, cityId: 'lagos' }, b.cookie);
  must(answered.status === 200, `friend answer ${answered.status}`);
}
let cid = 0;
async function say(from: { cookie: string }, to: { id: string }, body: string): Promise<Record<string, any>> {
  cid += 1;
  const r = await lab.call('/api/social/messages', { to: to.id, body, clientId: `chatux-${Date.now()}-${cid}` }, from.cookie);
  must(r['ok'] === true, `say "${body.slice(0, 30)}": ${JSON.stringify(r).slice(0, 200)}`);
  return r;
}
const convOf = (a: { id: string }, b: { id: string }): string => `dm.${[a.id, b.id].sort().join('.')}`;
const skip = async (ms: number): Promise<void> => { lab.advance(ms); await syncClock(A, lab.offset()); await syncClock(B, lab.offset()); };

async function openPhone(): Promise<void> {
  if (await HERE('.ph-appbtn')) return;
  const free = `(() => { const el = document.querySelector('[data-nav="phone"]'); if (!el) return false; const r = el.getBoundingClientRect(); const top = document.elementFromPoint(r.left + r.width / 2, r.top + r.height / 2); return !!top && (el === top || el.contains(top)); })()`;
  for (let i = 0; i < 5 && !(await A.eval<boolean>(free)); i++) { await A.press('Escape', 'Escape', 27); await sleep(600); }
  await A.click('[data-nav="phone"]');
  await A.waitFor(`!!document.querySelector('.ph-appbtn')`, 10000, 'the phone home');
}
const MESSAGES = '.messages';
/** Presses a control by its text from the page itself (for a prompt a pointer cannot reach). */
const jsClick = (wanted: string): Promise<boolean> => A.eval<boolean>(`(() => { const b = [...document.querySelectorAll('button')].find((x) => x.innerText.trim() === ${JSON.stringify(wanted)} && x.getBoundingClientRect().width > 1); if (!b) return false; b.click(); return true; })()`);
/** Dismisses what a scene may have left on top (the call question, an open sheet). */
async function clearOverlays(): Promise<void> {
  await jsClick('Not now'); await sleep(300);
  for (let i = 0; i < 2 && (await A.eval<boolean>(`!!document.querySelector('dialog[open]')`)); i++) { await A.press('Escape', 'Escape', 27); await sleep(400); }
}
/** An app on the phone's home: scrolled to first (the pages glide), then pressed; tried again if the app did not open. */
async function appBtn(name: string): Promise<void> {
  for (let i = 0; i < 3; i++) {
    await A.eval(`[...document.querySelectorAll('.ph-appbtn')].find((e) => e.innerText.toLowerCase().includes(${JSON.stringify(name.toLowerCase())}))?.scrollIntoView({ block: 'center', inline: 'center' })`);
    await sleep(1100);
    await A.click('.ph-appbtn', name);
    await sleep(900);
    if (await A.eval<boolean>(`!document.querySelector('.ph-appbtn') || (document.querySelector('.ph-appbar')?.children.length ?? 0) > 0`)) return;
  }
}
async function openMessagesApp(): Promise<void> {
  if (await HERE(MESSAGES)) return;
  await clearOverlays();
  await openPhone();
  await appBtn('Messages');
  await A.waitFor(`!!document.querySelector('.messages')`, 15000, 'Messages');
  await sleep(500);
}
/** The control that closes whatever is on top of the game back to the map: Escape (as the app's own back). */
async function toGame(): Promise<void> {
  for (let i = 0; i < 6; i++) {
    const clear = await A.eval<boolean>(`!document.querySelector('.messages') && !document.querySelector('.ph-appbtn') && !!document.querySelector('.hud-cash')`);
    if (clear) return;
    await A.press('Escape', 'Escape', 27); await sleep(500);
  }
}
async function openChatFromList(who: string): Promise<void> {
  await openMessagesApp();
  if (await HERE('.messages-chat')) { if ((await text(A, '.messages-chat .messages-head')).includes(who)) return; await A.click('.messages-back'); }
  await A.click('[data-conv]', who);
  await A.waitFor(`document.querySelector('.messages-chat .messages-head')?.innerText.includes(${JSON.stringify(who)})`, 15000, `the chat with ${who}`);
  await sleep(500);
}
const field = '.messages-chat textarea[name="body"], .composer textarea';
async function typeInto(value: string): Promise<void> {
  await A.click(field);
  await A.eval(`(() => { const el = document.querySelector(${JSON.stringify(field)}); el.focus(); el.value = ''; el.dispatchEvent(new Event('input', { bubbles: true })); })()`);
  await A.send('Input.insertText', { text: value });
  await sleep(250);
}
async function pressEnter(): Promise<void> { await A.press('Enter', 'Enter', 13); }
async function send(): Promise<void> { await A.click('.composer-send, button[type="submit"][aria-label="Send"]'); }
const threadText = (): Promise<string> => text(A, '.messages-thread');
/** Scrolls the thread to its top or bottom. */
const scrollThread = (to: 'top' | 'bottom' | number): Promise<unknown> => A.eval(`(() => { const t = document.querySelector('.messages-thread'); t.scrollTop = ${to === 'top' ? 0 : to === 'bottom' ? 't.scrollHeight' : to}; })()`);

// ---- run ---------------------------------------------------------------------------------------------------------
let ada!: Guest;
try {
  await A.setViewport({ width: view!.width, height: view!.height, scale: view!.scale, mobile: view!.mobile });
  await B.setViewport({ width: 1100, height: 800, scale: 1, mobile: false });
  await A.throttle(false);

  await scene('01-home', async () => {
    await playNow(A, lab.base, 'Ada'); await playNow(B, lab.base, 'Bola');
    ada = { name: 'Ada', id: await sessionId(A), cookie: '' };
    await snap('01-home');
    if (view!.slow) await A.throttle(true);
  });
  const bola: Guest = { name: 'Bola', id: await sessionId(B), cookie: '' };
  // the page's own cookie is not readable from here: Bola's and Ada's calls from the script go through a page-side fetch
  const pageSay = (p: Browser, to: string, body: string): Promise<unknown> => pageCall(p, '/api/social/messages', { to, body, clientId: `px-${Date.now()}-${++cid}` });
  const pageDo = (p: Browser, path: string, body: unknown): Promise<{ status: number; body: any }> => pageCall(p, path, body);

  await scene('02-phone-home', async () => { await openPhone(); await snap('02-phone-home'); });
  await scene('03-list-empty', async () => { await openMessagesApp(); await snap('03-list-empty'); });
  await scene('04-find', async () => {
    await A.click('.messages-new');
    await A.type('#message-player-search', 'Bol');
    await A.click('button', 'Find');
    await A.waitFor(`document.querySelector('[aria-label="Players found"]')`, 10000, 'results');
    await snap('04-find');
    await A.click('.messages-new');
  });

  // Bola becomes Ada's friend through the real routes (page-side, with each page's own cookie).
  const asked = await pageDo(A, '/api/social/friends/request', { to: bola.id, cityId: 'lagos' });
  must(asked.body?.code === 'requested', 'friend request');
  await pageDo(B, '/api/social/friends/answer', { from: ada.id, accept: true, cityId: 'lagos' });
  await sleep(800);

  // friends made by the script
  const names = ['Chidi', 'Oluwatobiloba Adebayo-W', 'Dami', 'Efe', 'Funke', 'Gbemi', 'Hauwa', 'Ife'];
  const others: Guest[] = [];
  for (const name of names) others.push(await guest(name));
  for (const g of others) {
    // the friend asks Ada: the answer must be Ada's own, from her page
    const r = await lab.call('/api/social/friends/request', { to: ada.id, cityId: 'lagos' }, g.cookie);
    must(r['code'] === 'requested', `request from ${g.name}: ${JSON.stringify(r).slice(0, 120)}`);
    const a = await pageDo(A, '/api/social/friends/answer', { from: g.id, accept: true, cityId: 'lagos' });
    must(a.status === 200, `answer ${g.name}`);
  }
  const [chidi, long, dami, efe, funke, gbemi, hauwa, ife] = others as [Guest, Guest, Guest, Guest, Guest, Guest, Guest, Guest];

  await scene('05-list-friends-no-chat', async () => { await A.goto(lab.base + '/'); await dismiss(A, 3000); await openMessagesApp(); await snap('05-list-friends-no-chat'); });

  // From the People app to the chat: the row's Chat button, and the friend's card.
  const pickRow = (who: string, button: string): Promise<boolean> => A.eval<boolean>(`(() => { document.querySelectorAll('[data-pick]').forEach((e) => e.removeAttribute('data-pick')); const rows = [...document.querySelectorAll('.social-card, li, .social-row, div')].filter((e) => e.innerText && e.innerText.includes(${JSON.stringify(who)}) && e.querySelector('button') && e.innerText.length < 400); const row = rows.at(-1); const b = row && [...row.querySelectorAll('button')].find((x) => x.innerText.trim() === ${JSON.stringify(button)}); if (!b) return false; b.setAttribute('data-pick', '1'); return true; })()`);
  await scene('06-friend-card', async () => {
    await toGame(); await openPhone();
    await appBtn('People');
    await A.waitFor(`document.querySelector('.ph-appbar h2')?.innerText === 'People' && !!document.querySelector('.ph-appbody button')`, 10000, 'people');
    await sleep(900);
    await snap('06a-people');
    must(await pickRow('Bola', 'View'), 'no View on Bola row');
    await A.click('[data-pick]');
    await A.waitFor(`[...document.querySelectorAll('button')].some((b) => b.innerText.trim() === 'Chat')`, 8000, 'the card');
    await sleep(500);
    await snap('06-friend-card');
  });
  await scene('07-chat-empty', async () => {
    await A.click('button', 'Chat'); await A.waitFor(`!!document.querySelector('.messages-chat')`, 10000, 'the chat');
    await sleep(600);
    await snap('07-chat-empty');
  });
  await scene('07b-taps-from-home', async () => {
    await toGame();
    await taps('open-chat-from-home-via-people-row', async () => {
      await A.click('[data-nav="phone"]'); await appBtn('People'); await A.waitFor(`document.querySelector('.ph-appbar h2')?.innerText === 'People' && !!document.querySelector('.ph-appbody button')`, 10000, 'people'); await sleep(900);
      must(await pickRow('Bola', 'Chat'), 'no Chat on the row'); await A.click('[data-pick]');
      await A.waitFor(`!!document.querySelector('.messages-chat')`, 10000, 'the chat');
    });
    await sleep(400);
  });

  // One message each way, then the list with one chat.
  await scene('08-first-message', async () => {
    await typeInto('Hi Bola, are we still on for lunch?');
    await snap('08a-typed');
    await taps('send-message', async () => { await send(); });
    await A.waitFor(`document.querySelector('.messages-thread')?.innerText.includes('lunch')`, 10000, 'the sent message');
    await sleep(600);
    await snap('08-first-message');
  });
  await scene('09-list-one-chat', async () => {
    await A.click('.messages-back'); await sleep(600);
    await snap('09-list-one-chat');
  });

  // Seed history: old days and a long run, from the friends (script) and from Bola's page.
  await skip(2 * DAY);
  for (let i = 0; i < 3; i++) await pageSay(B, ada.id, ['Yes! Where?', 'I know a place on the Island, jollof and plantain.', 'Say 1pm?'][i]!);
  await skip(DAY);
  await pageSay(B, ada.id, 'Good morning Ada 🌞');
  await sleep(300);
  for (let i = 1; i <= 70; i++) { await pageSay(i % 3 === 0 ? A : B, i % 3 === 0 ? bola.id : ada.id, `Message number ${i} in a long conversation, enough text to wrap onto a second line on a small screen.`); if (i % 10 === 0) await sleep(150); }
  // the friends write to Ada: unread counts; one muted, one long name, one blocked
  await say(chidi, ada, 'Did you see the match last night?'); await say(chidi, ada, 'Unreal.'); await say(chidi, ada, 'Call me when you are free');
  await say(long, ada, 'Hello from a person with a very long display name, can you see all of it in your list?');
  await say(dami, ada, 'Sent you the notes ✅'); await say(efe, ada, '😂😂😂'); await say(funke, ada, 'Thanks for yesterday!!');
  await say(hauwa, ada, 'Please do not forget the meeting'); await say(ife, ada, 'See you at the market');
  await sleep(1500);
  const meNow = await pageDo(A, '/api/social/me', undefined);
  const convs: { id: string; with?: string }[] = (meNow.body?.conversations ?? []) as { id: string; with?: string }[];
  const mute = convs.find((c) => c.with === efe.id), block = convs.find((c) => c.with === hauwa.id);
  if (mute) await pageDo(A, `/api/social/conversations/${mute.id}/prefs`, { mute: true });
  if (convs.find((c) => c.with === dami.id)) await pageDo(A, `/api/social/conversations/${convs.find((c) => c.with === dami.id)!.id}/prefs`, { pin: true });
  void block;
  await pageDo(A, '/api/social/block', { id: hauwa.id, cityId: 'lagos' });
  await A.goto(lab.base + '/'); await dismiss(A, 3000);
  await sleep(500);
  await scene('10-home-unread', async () => { await toGame(); await snap('10-home-unread'); await openPhone(); await snap('10a-phone-unread'); });
  await scene('11-list-many', async () => { await openMessagesApp(); await sleep(600); await snap('11-list-many'); await scrollList(); await snap('11a-list-many-scrolled'); });
  async function scrollList(): Promise<void> { await A.eval(`(() => { const s = document.querySelector('.messages')?.closest('.ph-body, .panel, [data-scroll], .sheet-body') || document.scrollingElement; s && (s.scrollTop = 600); document.querySelector('[data-conv]:last-of-type')?.scrollIntoView({ block: 'end' }); })()`); await sleep(400); }
  await scene('12-list-updates', async () => { await A.click('[role="tab"]', 'Updates'); await sleep(500); await snap('12-list-updates'); await A.click('[role="tab"]', 'Chats'); });
  await scene('13-list-groups', async () => { await A.click('[role="tab"]', 'Groups'); await sleep(400); await snap('13-list-groups'); await A.click('[role="tab"]', 'Chats'); });

  // Open the long chat.
  await scene('14-chat-open', async () => {
    await taps('go-back-to-list', async () => { /* measured below */ });
    await taps('open-chat-from-list', async () => { await A.click('[data-conv]', 'Bola'); await A.waitFor(`document.querySelector('.messages-chat .messages-head')?.innerText.includes('Bola')`, 10000, 'chat'); });
    await sleep(900);
    await snap('14-chat-open');
    await scrollThread('top'); await sleep(900); await snap('14a-chat-scrolled-top');
    await scrollThread('bottom'); await sleep(600);
  });

  await scene('15-scroll-latest', async () => {
    await scrollThread(0); await sleep(700);
    await pageSay(B, ada.id, 'A message that arrives while you are reading old ones'); await sleep(1500);
    await snap('15-scroll-latest');
    const label = await A.eval<string>(`document.querySelector('.messages-latest')?.getAttribute('aria-label') ?? ''`);
    note(`jump button: "${label}"`);
    await A.click('.messages-latest'); await sleep(700);
  });

  await scene('16-composer-variants', async () => {
    await typeInto('A first line\nthen a second\nand a third line\nand a fourth line\nand a fifth line');
    await snap('16a-multiline');
    await A.eval(`(() => { const t = document.querySelector(${JSON.stringify(field)}); t.value=''; t.dispatchEvent(new Event('input',{bubbles:true})); })()`);
    await typeInto('Honestly this is a very long message that keeps going '.repeat(8));
    await snap('16b-long');
    await typeInto('Supercalifragilisticexpialidocious'.repeat(4));
    await snap('16c-longword');
    await typeInto('Call me on 08031234567 or https://example.com/offer');
    await snap('16d-filter-typed');
    await send(); await sleep(1200);
    await snap('16e-filter-refusal');
    const refusal = await A.eval<string>(`[...document.querySelectorAll('.toast, .messages-why, .composer-count, .bubble.is-failed')].map((e) => e.innerText.replace(/\\s+/g,' ').trim()).join(' | ')`);
    note(`refusal shown as: ${refusal}`);
    await A.eval(`(() => { const t = document.querySelector(${JSON.stringify(field)}); t.value=''; t.dispatchEvent(new Event('input',{bubbles:true})); })()`);
    await typeInto('😀 Emoji time 🎉🔥');
    await send(); await sleep(800); await snap('16f-emoji-sent');
  });

  await scene('17-receive-open', async () => {
    await pageSay(B, ada.id, 'Live message while the chat is open'); await sleep(1500);
    await snap('17-receive-open');
  });

  // message actions
  await scene('18-actions', async () => {
    const last = `.bubble-wrap:not(.is-mine) .bubble-more`;
    await taps('react', async () => {
      await A.eval(`document.querySelector('.bubble-wrap:not(.is-mine)').scrollIntoView({block:'center'})`);
      await A.click(last); await sleep(300);
      await snap('18a-actions-menu');
      await A.click('.menu-emoji[aria-label="React 👍"], .menu-emoji', undefined);
      await sleep(600);
    });
    await snap('18b-reacted');
    // reply
    await scrollThread('bottom'); await sleep(300);
    await A.click('.bubble-wrap:not(.is-mine) .bubble-more'); await A.click('.menu-item', 'Reply'); await sleep(300);
    await snap('18c-replying');
    await typeInto('Replying to that'); await send(); await sleep(900); await snap('18d-replied');
    // edit own
    await A.click('.bubble-wrap.is-mine .bubble-more'); await sleep(200); await A.click('.menu-item', 'Edit'); await sleep(400);
    await snap('18e-edit');
    await A.eval(`document.querySelector('.messages-foot')?.querySelector('button[aria-label="Cancel"], button')`);
  });
  await scene('19-pin-forward-delete', async () => {
    await A.press('Escape', 'Escape', 27); await sleep(300);
    if (await HERE('.messages-chat') === false) await openChatFromList('Bola');
    await scrollThread('bottom');
    await A.click('.bubble-wrap:not(.is-mine) .bubble-more'); await sleep(200);
    const pinnable = await HERE('.menu-item', 'Pin message');
    note(`pin offered: ${pinnable}`);
    await snap('19a-menu-full');
    if (pinnable) { await A.click('.menu-item', 'Pin message'); await sleep(1200); await snap('19b-pinned'); }
    else await A.press('Escape', 'Escape', 27);
  });

  await scene('20-chat-options', async () => {
    await taps('open-chat-options', async () => { await A.click('.messages-kebab'); await sleep(500); });
    await snap('20-chat-options');
    await A.click('.messages-kebab').catch(() => undefined); await sleep(300);
  });
  await scene('21-send-money', async () => {
    await taps('send-money', async () => {
      if (await HERE('[data-chat="attach"]')) await A.click('[data-chat="attach"]'); else await A.click('.messages-kebab');
      await sleep(500); await snap('21a-attach-or-options');
      await A.click('[data-chat="send-money"]'); await sleep(900);
    });
    await snap('21-send-money');
    await toGame(); await openChatFromList('Bola');
  });
  await scene('22-request-money', async () => {
    await taps('request-money', async () => {
      if (await HERE('[data-chat="attach"]')) await A.click('[data-chat="attach"]'); else await A.click('.messages-kebab');
      await sleep(400); await A.click('[data-chat="request-money"]'); await sleep(500);
    });
    await snap('22a-request-form');
    await A.type('#message-request-amount', '500'); await A.type('#message-request-note', 'Lunch');
    await snap('22b-request-filled');
    await A.click('button', 'Send request'); await sleep(1500);
    await snap('22-request-sent');
  });
  await scene('23-call', async () => {
    await taps('start-call', async () => { await A.click('.messages-chat .messages-head button[aria-label*="Call" i], .messages-head [data-call], .messages-head .call-btn, .messages-head button:not(.messages-back):not(.messages-kebab):not(.messages-name)'); await sleep(1500); });
    await snap('23-call');
    await clearOverlays();
  });
  await scene('24-report-block', async () => {
    await clearOverlays();
    if (!(await HERE('.messages-chat'))) await openChatFromList('Bola');
    await A.click('.messages-name'); await sleep(900);
    await snap('24a-profile-from-chat');
    const buttons = await A.eval<string[]>(`[...document.querySelectorAll('button')].map((b) => b.innerText.trim()).filter(Boolean)`);
    note(`profile buttons: ${buttons.join(' / ')}`);
    await A.press('Escape', 'Escape', 27); await sleep(500);
  });

  await scene('25-back-behaviour', async () => {
    await clearOverlays();
    if (!(await HERE('.messages-chat'))) await openChatFromList('Bola');
    await taps('back-to-list', async () => { await A.click('.messages-back'); });
    await sleep(500); await snap('25a-back-to-list');
    note(`after one back: list visible=${await HERE('[data-conv]')}`);
    await A.press('Escape', 'Escape', 27); await sleep(700);
    await snap('25b-escape-from-list');
    note(`after Escape from list: messages visible=${await HERE('.messages')}, phone home visible=${await HERE('.ph-appbtn')}`);
  });

  await scene('26-receive-closed', async () => {
    await toGame(); await sleep(400);
    await pageSay(B, ada.id, 'Message while Messages is closed'); await sleep(2000);
    await snap('26-receive-closed');
    const toast = await A.eval<string>(`[...document.querySelectorAll('.toast')].map((t) => t.innerText).join(' | ')`);
    note(`toast on arrival: ${toast}`);
    // tap the notification if there is one
    if (await HERE('.toast')) { await A.click('.toast').catch(() => undefined); await sleep(900); await snap('26a-after-toast-tap'); note(`toast tap went to chat: ${await HERE('.messages-chat')}`); }
  });

  await scene('27-keyboard', async () => {
    if (!(await HERE('.messages-chat'))) await openChatFromList('Bola');
    await A.click(field);
    if (view!.mobile) {
      await A.setViewport({ width: view!.width, height: Math.round(view!.height * 0.58), scale: view!.scale, mobile: true });
      await sleep(700); await snap('27-keyboard-open');
      const probe = await A.eval(`(() => { const f = document.querySelector('.messages-foot')?.getBoundingClientRect(); const h = document.querySelector('.messages-head')?.getBoundingClientRect(); const t = document.querySelector('.messages-thread')?.getBoundingClientRect(); return { vh: innerHeight, foot: f && [Math.round(f.top), Math.round(f.bottom)], head: h && [Math.round(h.top), Math.round(h.bottom)], thread: t && Math.round(t.height) }; })()`);
      note(`short viewport (keyboard) probe: ${JSON.stringify(probe)}`);
      await A.setViewport({ width: view!.width, height: view!.height, scale: view!.scale, mobile: true });
      await sleep(500);
    } else { note('keyboard emulation is for phone sizes only'); }
  });

  await scene('28-offline', async () => {
    await A.eval(`document.querySelector(${JSON.stringify(field)})?.focus()`);
    await A.send('Network.emulateNetworkConditions', { offline: true, latency: 0, downloadThroughput: 0, uploadThroughput: 0 });
    await sleep(1500);
    await typeInto('Sent while offline');
    await send(); await sleep(3500);
    await snap('28a-offline-sent');
    await A.send('Network.emulateNetworkConditions', { offline: false, latency: 0, downloadThroughput: -1, uploadThroughput: -1 });
    await sleep(2500); await snap('28b-back-online');
    const failedHere = await HERE('.bubble.is-failed');
    note(`failed bubble after offline send: ${failedHere}`);
    if (failedHere) { await A.click('.bubble.is-failed button', 'Retry').catch(() => undefined); await sleep(2000); await snap('28c-after-retry'); }
  });

  await scene('29-reload', async () => {
    await A.goto(lab.base + '/'); await dismiss(A, 3000); await sleep(1500);
    await snap('29-reload');
    note(`after reload: chat visible=${await HERE('.messages-chat')}, phone home visible=${await HERE('.ph-appbtn')}, messages=${await HERE('.messages')}`);
  });

  // picture and voice note
  await scene('30-picture', async () => {
    await clearOverlays();
    await openChatFromList('Bola');
    const hasButton = await HERE('[aria-label="Send a picture"]');
    note(`picture button visible: ${hasButton}`);
    await snap('30a-composer-pictures-on');
    // a picture from Bola, made in the page and sent through the real route
    const data = await B.eval<string>(`(() => { const c = document.createElement('canvas'); c.width = 320; c.height = 240; const g = c.getContext('2d'); const grad = g.createLinearGradient(0,0,320,240); grad.addColorStop(0,'#f0a040'); grad.addColorStop(1,'#2a7a5a'); g.fillStyle = grad; g.fillRect(0,0,320,240); g.fillStyle='#fff'; g.font='bold 36px sans-serif'; g.fillText('Lagos sunset', 40, 130); return c.toDataURL('image/jpeg', 0.85).split(',')[1]; })()`);
    const up = await pageDo(B, '/api/social/images', { to: ada.id, clientId: `pic-${Date.now()}`, type: 'image/jpeg', data, body: 'Look at this view' });
    note(`picture upload: ${up.status} ${JSON.stringify(up.body).slice(0, 100)}`);
    await sleep(2000); await scrollThread('bottom'); await sleep(800);
    await snap('30-picture');
    if (await HERE('.bubble-pic button, .bubble-pic img, .bubble-pic')) { await A.click('.bubble-pic button, .bubble-pic'); await sleep(800); await snap('30b-lightbox'); await A.press('Escape', 'Escape', 27); await sleep(300); }
  });
  await scene('31-voice', async () => {
    await clearOverlays();
    if (!(await HERE('.messages-chat'))) await openChatFromList('Bola');
    await scrollThread('bottom'); await sleep(300);
    const idleStart = '.voice-compose button, .composer-send.is-mic';
    note(`voice start control visible: ${await HERE(idleStart)}`);
    await snap('31a-voice-idle');
    await taps('record-voice-note', async () => { if (await HERE('.voice-compose button', 'Record')) await A.click('.voice-compose button', 'Record'); else await A.click('.composer-send.is-mic'); });
    await sleep(1800);
    await snap('31b-voice-recording');
    const stop = await A.eval<string[]>(`[...document.querySelectorAll('.voice-compose button')].map((b) => b.innerText.trim())`);
    note(`voice buttons while recording: ${stop.join(' / ')}`);
    await A.click('.voice-compose button', 'Stop'); await sleep(900);
    await snap('31c-voice-review');
    await A.click('.voice-compose button', 'Send'); await sleep(2500);
    await scrollThread('bottom'); await snap('31d-voice-sent');
  });

  // narrow-screen probe of the open chat
  (log['probes'] as Record<string, unknown>)['chat-layout'] = await layoutProbe(A, '.messages');
  await scene('32-failed-cleanup', async () => { await snap('32-final'); });

  // blocked / muted chats viewed
  await scene('33-muted-blocked', async () => {
    await A.click('.messages-back').catch(() => undefined); await sleep(500);
    await A.click('[data-conv]', 'Efe').catch(() => undefined); await sleep(700); await snap('33a-muted-chat');
    await A.click('.messages-back').catch(() => undefined); await sleep(400);
    note(`blocked friend's chat in list: ${await HERE('[data-conv]', 'Hauwa')}`);
    if (await HERE('[data-conv]', 'Hauwa')) { await A.click('[data-conv]', 'Hauwa'); await sleep(700); await snap('33b-blocked-chat'); }
  });
  await scene('34-group', async () => {
    await clearOverlays();
    await openMessagesApp();
    if (await HERE('.messages-chat')) { await A.click('.messages-back'); await sleep(500); }
    await A.click('button', 'New group'); await sleep(600); await snap('34-new-group');
  });
  await scene('35-a11y', async () => {
    await A.click('[data-conv]', 'Bola').catch(() => undefined); await sleep(600);
    const a11y = await A.eval(`(() => { const vis = (e) => { const r = e.getBoundingClientRect(); return r.width > 1 && r.height > 1; }; const small = [...document.querySelectorAll('.messages button, .messages input, .messages textarea, .messages [role=tab]')].filter(vis).filter((e) => { const r = e.getBoundingClientRect(); return r.width < 44 || r.height < 44; }).map((e) => (e.getAttribute('aria-label') || e.innerText || e.tagName).trim().slice(0, 24) + ' ' + Math.round(e.getBoundingClientRect().width) + 'x' + Math.round(e.getBoundingClientRect().height)); const unnamed = [...document.querySelectorAll('.messages button, .messages input, .messages textarea')].filter(vis).filter((e) => !(e.getAttribute('aria-label') || e.innerText || e.getAttribute('placeholder') || e.labels?.length)).map((e) => e.outerHTML.slice(0, 80)); const live = [...document.querySelectorAll('[aria-live]')].map((e) => e.className); return { small, unnamed, live }; })()`);
    (log['probes'] as Record<string, unknown>)['a11y'] = a11y;
  });
  // keyboard focus order in the open chat: tab through
  await scene('36-focus', async () => {
    const order: string[] = [];
    await A.eval(`document.activeElement?.blur?.(); document.querySelector('.messages-chat')?.scrollIntoView()`);
    for (let i = 0; i < 12; i++) { await A.press('Tab', 'Tab', 9); order.push(await A.eval<string>(`(() => { const e = document.activeElement; return e ? ((e.getAttribute('aria-label') || e.innerText || e.getAttribute('placeholder') || e.tagName) + '').replace(/\\s+/g, ' ').trim().slice(0, 30) : ''; })()`)); }
    (log['probes'] as Record<string, unknown>)['focus-order'] = order;
  });
} catch (error) {
  note(`ABORTED: ${error instanceof Error ? error.stack : String(error)}`);
} finally {
  saveLog();
  B.close(); A.close();
  try { await lab.stop(); } catch { /* stopped */ }
  console.log(`[${pass}] done, ${shotNo} screenshots`);
  process.exit(0);
}
void until; void life; void actionId; void befriend; void convOf;
