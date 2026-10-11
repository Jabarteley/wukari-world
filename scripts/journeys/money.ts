#!/usr/bin/env node
/**
 * Feature journey 1: requests for money in a direct chat. Two players (Ada and Bola) in two isolated browser contexts of ONE Chrome,
 * against the built app on a local loopback server with a fresh data folder (scripts/journeys/lab.ts). No outside request.
 *
 *   node --experimental-strip-types --no-warnings scripts/journeys/money.ts --out <folder> [--port 4391] [--debug-port 4392]
 *
 * Earning (the gift rule needs naira earned from work) is a real paid teaching shift of the game; its 40 seconds are passed by the lab
 * clock. The friend request is sent by the page's own route call and ACCEPTED in the Messages screen. Everything else is the real UI.
 * Exit code is not zero when a step fails.
 */
import { Browser, sleep } from './cdp.ts';
import { startLab } from './lab.ts';
import { Journey, actionId, arg, dismiss, desktop, gameShown, layoutProbe, life, must, pageCall, phone, playNow, realErrors, sessionId, syncClock, text, until, visible } from './kit.ts';

const port = Number(arg('port', '4391')), debugPort = Number(arg('debug-port', '4392'));
const lab = await startLab(port);
const a = await Browser.launch(debugPort);
const b = await Browser.second(debugPort, a);
const c = await Browser.second(debugPort, a); // Cara: a third player who is nobody's friend
const j = new Journey(arg('out'), 'money');
const naira = (n: number): string => `₦${n.toLocaleString('en-US')}`;
const HOUR = 3600000;
const ids: Record<string, string> = {};
/** Moves the lab clock and the two pages' own clocks together. */
const skip = async (ms: number): Promise<void> => { lab.advance(ms); await syncClock(a, lab.offset()); await syncClock(b, lab.offset()); };
/** Records every toast the page shows (they vanish in seconds), so a refusal text can be read afterwards. */
const watchToasts = (p: Browser): Promise<unknown> => p.eval(`window.__toasts = window.__toasts || []; if (!window.__toastWatch) { window.__toastWatch = new MutationObserver(() => { for (const t of document.querySelectorAll('.toast')) { const x = t.innerText.replace(/\\s+/g, ' ').trim(); if (x && window.__toasts.at(-1) !== x) window.__toasts.push(x); } }); window.__toastWatch.observe(document.body, { childList: true, subtree: true, characterData: true }); } true`);
const toasts = (p: Browser): Promise<string[]> => p.eval<string[]>(`window.__toasts || []`);
const clearToasts = (p: Browser): Promise<unknown> => p.eval(`window.__toasts = []; true`);
/** Opens the chat with the named friend (the open chat is kept when it already is that one). */
async function openChat(p: Browser, who: string): Promise<void> {
  await openMessages(p);
  if (await visible(p, '.messages-chat .messages-head')) { if ((await text(p, '.messages-chat .messages-head')).includes(who)) return; await p.click('.messages-back'); }
  for (let i = 0; i < 5 && !(await p.eval<boolean>(`document.querySelector('[role="tab"][aria-selected="true"]')?.innerText.includes('Chats')`)); i++) { await p.click('[role="tab"]', 'Chats'); await sleep(500); }
  if (await visible(p, '[data-conv]', who)) await p.click('[data-conv]', who);
  else {
    for (let i = 0; i < 3 && !(await visible(p, '#message-player-search')); i++) { await p.click('button', 'New message'); await sleep(800); }
    await p.type('#message-player-search', who);
    await sleep(500);
    await p.click('button', 'Find');
    await p.waitFor(`(() => { const rows = [...document.querySelectorAll('[aria-label="Players found"] > *')]; const row = rows.find((r) => r.innerText.includes(${JSON.stringify(who)})); const btn = row?.querySelector('button'); if (btn) btn.setAttribute('data-pick', 'yes'); return !!btn; })()`, 10000, `${who} in the search results`);
    await p.click('[data-pick="yes"]'); await p.eval(`document.querySelectorAll('[data-pick]').forEach((x) => x.removeAttribute('data-pick')); true`);
  }
  await p.waitFor(`document.querySelector('.messages-chat .messages-head') && document.querySelector('.messages-chat .messages-head').innerText.includes(${JSON.stringify(who)})`, 15000, `the chat with ${who}`);
  await watchToasts(p);
}
async function openForm(p: Browser): Promise<void> {
  if (!(await visible(p, '#message-request-amount'))) {
    if (!(await visible(p, '[data-chat="request-money"]'))) await p.click('.messages-kebab');
    await p.click('[data-chat="request-money"]');
  }
  await p.waitFor(`!!document.querySelector('#message-request-amount')`, 5000, 'the request form');
}
/** Fills and sends the form on the asker's page; returns the form's message (empty when the form closed). */
async function sendRequest(p: Browser, amount: string, note: string): Promise<string> {
  await openForm(p);
  await p.type('#message-request-amount', amount);
  await p.type('#message-request-note', note);
  await p.click('button', 'Send request');
  await sleep(300);
  await p.waitFor(`!document.querySelector('.messages-request') || (document.querySelector('#message-request-help')?.classList.contains('is-warn'))`, 10000, 'the form to close or refuse');
  return (await visible(p, '#message-request-help.is-warn')) ? await text(p, '#message-request-help') : '';
}
const cardsOf = (p: Browser): Promise<string[]> => p.eval<string[]>(`[...document.querySelectorAll('.bubble.is-request')].map((c) => c.dataset.requestState)`);
async function waitCard(p: Browser, n: number, state: string, what: string): Promise<void> {
  await p.waitFor(`(() => { const c = [...document.querySelectorAll('.bubble.is-request')]; return c.length === ${n} && c.at(-1).dataset.requestState === ${JSON.stringify(state)}; })()`, 15000, what);
}
async function askerAndPayerSee(state: string, n: number, what: string): Promise<void> { await waitCard(a, n, state, `Ada's card (${what})`); await waitCard(b, n, state, `Bola's card (${what})`); }
let confirmText = '', shotConfirm = false;
async function tapPay(p: Browser, double = false): Promise<void> {
  await p.click('.bubble.is-request:last-of-type .request-btn.is-primary', 'Pay');
  await p.waitFor(`!!document.querySelector('.request-confirm')`, 5000, 'the pay confirmation line');
  confirmText = await text(p, '.request-confirm');
  if (!shotConfirm) { shotConfirm = true; await j.shot(p, 'pay-confirm-line'); }
  const point = await p.locate('.request-btn.is-primary', 'Confirm');
  must(point, 'no Confirm button');
  await p.tapAt(point!.x, point!.y);
  if (double) await p.tapAt(point!.x, point!.y);
}
const cashOf = async (p: Browser): Promise<number> => (await life(p)).cash;
const card = (p: Browser): Promise<string> => p.eval<string>(`(() => { const cs = [...document.querySelectorAll('.bubble.is-request')]; return cs.length ? cs.at(-1).innerText.replace(/\\s+/g, ' ') : ''; })()`);
const cardState = (p: Browser): Promise<string> => p.eval<string>(`(() => { const cs = [...document.querySelectorAll('.bubble.is-request')]; return cs.length ? cs.at(-1).dataset.requestState : ''; })()`);
const cardButtons = (p: Browser): Promise<string[]> => p.eval<string[]>(`(() => { const cs = [...document.querySelectorAll('.bubble.is-request')]; return cs.length ? [...cs.at(-1).querySelectorAll('button')].map((x) => x.innerText.trim()) : []; })()`);
const cardCount = (p: Browser): Promise<number> => p.eval<number>(`document.querySelectorAll('.bubble.is-request').length`);

/** Opens the Messages app from the game screen. */
async function openMessages(p: Browser): Promise<void> {
  if (await visible(p, '.messages')) return;
  if (!(await visible(p, '.ph-appbtn'))) {
    // a reload brings back the panel that was open (for instance the statement): Escape is the app's way out of a panel
    const free = `(() => { const el = document.querySelector('[data-nav="phone"]'); if (!el) return false; const r = el.getBoundingClientRect(); const top = document.elementFromPoint(r.left + r.width / 2, r.top + r.height / 2); return !!top && (el === top || el.contains(top)); })()`;
    for (let i = 0; i < 5 && !(await p.eval<boolean>(free)); i++) { await p.press('Escape', 'Escape', 27); await sleep(600); }
    await p.click('[data-nav="phone"]');
  }
  // the home screen is still gliding in right after it opens: a press that lands too early is made again
  for (let tries = 0; tries < 3; tries++) {
    await sleep(600);
    await p.click('.ph-appbtn', 'Messages');
    if (await p.waitFor(`document.querySelector('.messages')`, 5000, 'the Messages app').catch(() => false)) break;
  }
  await p.waitFor(`document.querySelector('.messages')`, 15000, 'the Messages app');
}
async function earn(p: Browser): Promise<number> {
  const send = (action: object) => pageCall(p, '/api/action', { actionId: actionId(), cityId: 'lagos', ...action });
  must((await send({ type: 'apply-job', id: 'teaching' })).body?.code === 'applied', 'apply-job');
  await send({ type: 'spot', id: 'work' });
  must((await send({ type: 'activity', id: 'teaching-shift' })).body?.code === 'started', 'shift start');
  await skip(41000);
  await until(async () => (await life(p)).social.earned >= 3000, 20000, 'the shift pay');
  return (await life(p)).social.earned;
}


let cardsSoFar = 0;
for (const sig of ['SIGINT', 'SIGTERM'] as const) process.once(sig, () => { a.close(); try { a.child.kill('SIGKILL'); } catch { /* gone */ } process.exit(130); });
try {
  await desktop(a); await desktop(b);
  await j.run('0', 'Setup: two guests, a paid shift each, friendship accepted on screen', [a, b], async (detail) => {
    await playNow(a, lab.base, 'Ada'); await playNow(b, lab.base, 'Bola');
    ids['ada'] = await sessionId(a); ids['bola'] = await sessionId(b);
    detail['earnedAda'] = await earn(a); detail['earnedBola'] = await earn(b);
    const asked = await pageCall(a, '/api/social/friends/request', { to: ids['bola'], cityId: 'lagos' });
    must(asked.body?.code === 'requested', `friend request: ${JSON.stringify(asked.body)}`);
    await openMessages(b);
    await b.click('[role="tab"]', 'Updates');
    await b.click('button', 'Accept');
    await b.waitFor(`document.body.innerText.includes('now friends')`, 8000, 'the friends toast');
    detail['cashAda'] = await cashOf(a); detail['cashBola'] = await cashOf(b);
    await openChat(a, 'Bola'); await openChat(b, 'Ada');
  });

  await j.run('1a', 'A brand-new chat with a friend (no message yet): Chat options offer Send money AND Request money', [a], async (detail) => {
    detail['threadText'] = (await text(a, '.messages-thread')).replace(/\s+/g, ' ').slice(0, 120);
    const before = await pageCall(a, '/api/social/conversations');
    detail['conversationsBefore'] = (before.body?.conversations ?? []).filter((x: any) => x.with === ids['bola']).length;
    await a.click('.messages-kebab');
    await a.waitFor(`!!document.querySelector('.messages-manage')`, 5000, 'the chat options');
    detail['optionButtons'] = await a.eval<string[]>(`[...document.querySelectorAll('.messages-manage button')].map((x) => x.innerText.trim())`);
    must(await visible(a, '[data-chat="send-money"]'), 'No "Send money" in the empty chat');
    must(await visible(a, '[data-chat="request-money"]'), 'No "Request money" in a new, empty chat');
    await j.shot(a, 'empty-chat-options');
    await a.click('.messages-kebab');
  });
  await j.run('1b', 'A partner who is not a friend (Cara) gets Send money at most, never Request money', [a], async (detail) => {
    await playNow(c, lab.base, 'Cara');
    await openChat(a, 'Cara');
    await a.click('.messages-kebab');
    await a.waitFor(`!!document.querySelector('.messages-manage')`, 5000, 'the chat options');
    detail['optionButtons'] = await a.eval<string[]>(`[...document.querySelectorAll('.messages-manage button')].map((x) => x.innerText.trim())`);
    detail['requestButton'] = await visible(a, '[data-chat="request-money"]');
    await j.shot(a, 'non-friend-options');
    await a.click('.messages-kebab');
    // what a tap on it does for a non-friend
    detail['tapResult'] = 'not tried';
    if (detail['requestButton']) { await a.click('.messages-kebab'); await openForm(a); await a.type('#message-request-amount', '100'); await a.click('button', 'Send request'); await sleep(800); detail['tapResult'] = (await visible(a, '#message-request-help.is-warn')) ? await text(a, '#message-request-help') : 'no message'; await j.shot(a, 'non-friend-refusal'); await a.click('.messages-kebab'); }
    await openChat(a, 'Bola');
    must(!detail['requestButton'], 'a non-friend chat offers "Request money" (a tap is refused afterwards: ' + String(detail['tapResult']) + ')');
  });
  const cash0 = { ada: await cashOf(a), bola: await cashOf(b) };
  await j.run('1', 'Ada asks Bola for ₦500 ("Lunch"): an Open card for both, Pay/Decline vs Cancel request', [a, b], async (detail) => {
    await openForm(a);
    await j.shot(a, 'form-open');
    const refusal = await sendRequest(a, '500', 'Lunch');
    must(!refusal, `the form refused: ${refusal}`);
    cardsSoFar = 1;
    const conv = ((await pageCall(a, '/api/social/conversations')).body?.conversations ?? []).filter((x: any) => x.with === ids['bola']).length;
    detail['conversationsAfter'] = conv;
    must(conv === 1, 'the first request did not create the conversation');
    detail['chatHeadAfter'] = (await text(a, '.messages-chat .messages-head')).replace(/\s+/g, ' ');
    must(String(detail['chatHeadAfter']).includes('Bola'), 'the screen did not stay on / move to the chat with Bola');
    await askerAndPayerSee('open', 1, 'open');
    detail['adaCard'] = await card(a); detail['bolaCard'] = await card(b);
    detail['adaButtons'] = await cardButtons(a); detail['bolaButtons'] = await cardButtons(b);
    must(JSON.stringify(detail['adaButtons']) === JSON.stringify(['Cancel request']), `Ada's buttons: ${detail['adaButtons']}`);
    must(JSON.stringify(detail['bolaButtons']) === JSON.stringify(['Pay', 'Decline']), `Bola's buttons: ${detail['bolaButtons']}`);
    must(/500/.test(String(detail['bolaCard'])) && /Lunch/.test(String(detail['bolaCard'])), 'amount/note missing on the card');
    must(/You asked Bola/.test(String(detail['adaCard'])), `the asker's card does not say "You asked Bola": ${detail['adaCard']}`);
    must(/Ada asked you/.test(String(detail['bolaCard'])), `the friend's card does not say "Ada asked you": ${detail['bolaCard']}`);
  });

  await j.run('2', 'A second request while one is open: refused with a clear message, the form stays open', [a], async (detail) => {
    const refusal = await sendRequest(a, '300', 'Second');
    detail['formMessage'] = refusal; detail['toasts'] = await toasts(a);
    must(refusal, 'the form closed: no refusal shown');
    must(/already has a request|already have a request/i.test(refusal), `unclear refusal: ${refusal}`);
    must(await visible(a, '#message-request-amount'), 'the form did not stay open');
    must((await cardsOf(a)).length === 1, 'a second card appeared');
    await a.click('button', 'Cancel');
  });

  await j.run('3', 'Bola pays (confirm step): both show Paid with no buttons; cash -500/+500; statement shows it', [a, b], async (detail) => {
    await tapPay(b);
    detail['confirmText'] = confirmText;
    must(/to Ada\?/.test(confirmText), `the pay confirmation does not name Ada: ${confirmText}`);
    await j.shot(b, 'pay-confirm').catch(() => undefined);
    await askerAndPayerSee('paid', 1, 'paid');
    detail['adaButtons'] = await cardButtons(a); detail['bolaButtons'] = await cardButtons(b);
    must((detail['adaButtons'] as string[]).length + (detail['bolaButtons'] as string[]).length === 0, 'buttons remain on a paid card');
    const now = { ada: await cashOf(a), bola: await cashOf(b) };
    detail['ada'] = [cash0.ada, now.ada]; detail['bola'] = [cash0.bola, now.bola];
    must(now.ada === cash0.ada + 500 && now.bola === cash0.bola - 500, `cash did not move by 500 (${JSON.stringify(now)} from ${JSON.stringify(cash0)})`);
    detail['toasts'] = await toasts(b);
    // the statement (Bola)
    await b.click('.ph-close').catch(() => undefined);
    await b.click('.hud-cash');
    for (let tries = 0; tries < 4; tries++) {
      await sleep(700);
      await b.click('button', 'Statement');
      if (await b.waitFor(`!!document.querySelector('.statement-app')`, 4000, 'the statement').catch(() => false)) break;
    }
    await b.waitFor(`!!document.querySelector('.statement-app')`, 10000, 'the statement');
    const st = await text(b, '.statement-app');
    detail['statementText'] = st.replace(/\s+/g, ' ').slice(0, 400);
    await j.shot(b, 'statement');
    must(/500/.test(st) && /Ada/.test(st), 'the statement does not show the ₦500 gift to Ada');
    await b.goto(lab.base + '/'); await gameShown(b); await dismiss(b);
    await openChat(b, 'Ada');
  });

  await j.run('4', 'Decline, then cancel: Declined/Cancelled on both cards', [a, b], async (detail) => {
    must(!(await sendRequest(a, '200', 'Bus')), 'ask 1 refused');
    await askerAndPayerSee('open', 2, 'second open');
    await b.click('.request-btn', 'Decline');
    await askerAndPayerSee('declined', 2, 'declined');
    detail['declinedButtons'] = [await cardButtons(a), await cardButtons(b)];
    must(!(await sendRequest(a, '250', 'Data')), 'ask 2 refused');
    await askerAndPayerSee('open', 3, 'third open');
    await a.click('.request-btn', 'Cancel request');
    await askerAndPayerSee('cancelled', 3, 'cancelled');
    detail['states'] = [await cardsOf(a), await cardsOf(b)];
    detail['toastsAda'] = await toasts(a); detail['toastsBola'] = await toasts(b);
  });

  cardsSoFar = 3;
  await j.run('8', 'Reload both pages: cards keep their states (paid, declined, cancelled)', [a, b], async (detail) => {
    for (const p of [a, b]) { await p.goto(lab.base + '/'); await gameShown(p); await dismiss(p); }
    await openChat(a, 'Bola'); await openChat(b, 'Ada');
    await a.waitFor(`document.querySelectorAll('.bubble.is-request').length === 3`, 15000, 'three cards after the reload (Ada)');
    await b.waitFor(`document.querySelectorAll('.bubble.is-request').length === 3`, 15000, 'three cards after the reload (Bola)');
    detail['ada'] = await cardsOf(a); detail['bola'] = await cardsOf(b);
    must(JSON.stringify(detail['ada']) === '["paid","declined","cancelled"]' && JSON.stringify(detail['bola']) === '["paid","declined","cancelled"]', 'states differ after the reload');
  });

  await skip(25 * HOUR); // the request limits are per rolling day: a new day for the cap and double-tap checks
  const asked = async (amount: string, note: string): Promise<void> => { const r = await sendRequest(a, amount, note); must(!r, `refused: ${r}`); cardsSoFar += 1; await askerAndPayerSee('open', cardsSoFar, `open ${amount}`); };

  await j.run('5', 'Cap: Ada asks ₦2,600; Bola may only give ₦2,500 more: Pay refused with the gift wording, card stays Open', [a, b], async (detail) => {
    // the form's own bounds first
    const over = await sendRequest(a, '5001', '');
    detail['formOverMax'] = over; await j.shot(a, 'form-over-max');
    must(/largest amount/i.test(over), `the form did not bound the amount: "${over}"`);
    await a.click('button', 'Cancel');
    await asked('2600', 'Rent share');
    await clearToasts(b);
    await tapPay(b);
    await b.waitFor(`window.__toasts.some((t) => !/asked you/.test(t))`, 10000, 'a refusal toast').catch(() => undefined);
    detail['bolaToasts'] = await toasts(b);
    detail['state'] = await cardState(b);
    must(await cardState(b) === 'open' && await cardState(a) === 'open', 'the card did not stay open');
    must((detail['bolaToasts'] as string[]).some((t) => /earned|give|can only/i.test(t)), `the refusal does not use the gift wording: ${JSON.stringify(detail['bolaToasts'])}`);
    must((await cashOf(b)) === cash0.bola - 500, 'cash moved on a refused pay');
    await j.shot(b, 'refusal-toast');
    await a.click('.request-btn', 'Cancel request');
    await askerAndPayerSee('cancelled', cardsSoFar, 'cancelled again');
  });

  await j.run('6', 'Double-tap on Confirm: exactly one transfer', [a, b], async (detail) => {
    await asked('400', 'Taxi');
    const before = await life(b);
    await tapPay(b, true);
    await askerAndPayerSee('paid', cardsSoFar, 'paid');
    await sleep(1500);
    const after = await life(b);
    detail['bolaCash'] = [before.cash, after.cash];
    const lines = (after.ledger as any[]).filter((l) => l.amount === -400);
    detail['ledgerLines'] = lines.length;
    must(before.cash - after.cash === 400 && lines.length === 1, `Bola paid ${before.cash - after.cash} (${lines.length} ledger lines)`);
    const gifts = await b.eval<number>(`[...document.querySelectorAll('.messages-thread .bubble')].filter((x) => /gift|Sent|sent ₦/i.test(x.innerText) && !x.classList.contains('is-request')).length`);
    detail['giftLinesInThread'] = gifts;
    must((await cashOf(a)) === cash0.ada + 900, `Ada's cash is ${await cashOf(a)}, expected ${cash0.ada + 900}`);
  });

  /** Geometry of one control for a touch: inside the visible viewport and the topmost element at its centre. */
  const reach = (p: Browser, sel: string, wanted?: string): Promise<Record<string, unknown>> => p.eval(`(() => {
    const el = [...document.querySelectorAll(${JSON.stringify(sel)})].find((e) => ${wanted ? `e.innerText.includes(${JSON.stringify(wanted)})` : 'true'}); if (!el) return { found: false };
    const r = el.getBoundingClientRect(), top = document.elementFromPoint(Math.min(Math.max(r.left + r.width / 2, 0), innerWidth - 1), Math.min(Math.max(r.top + r.height / 2, 0), innerHeight - 1));
    return { found: true, top: Math.round(r.top), bottom: Math.round(r.bottom), h: Math.round(r.height), inViewNow: r.top >= 0 && r.bottom <= innerHeight, hitIsIt: !!top && (top === el || el.contains(top)) };
  })()`);
  const panelInfo = (p: Browser): Promise<Record<string, unknown>> => p.eval(`(() => {
    const m = document.querySelector('.messages-manage'), f = document.querySelector('.messages-foot'), pin = document.querySelector('.pinned');
    const box = (e) => e ? { h: Math.round(e.getBoundingClientRect().height), top: Math.round(e.getBoundingClientRect().top) } : null;
    return { viewportH: innerHeight, panel: box(m), panelScrolls: m ? m.scrollHeight > m.clientHeight + 1 : null, panelScrollTop: m ? Math.round(m.scrollTop) : null, composerShown: !!f && getComputedStyle(f).display !== 'none' && f.getBoundingClientRect().height > 1, composerBox: box(f),
      pinned: pin ? { ...box(pin), expanded: pin.querySelector('.pinned-toggle')?.getAttribute('aria-expanded'), text: pin.innerText.replace(/\\s+/g, ' ').slice(0, 80) } : null, threadH: Math.round(document.querySelector('.messages-thread')?.getBoundingClientRect().height ?? 0) };
  })()`);

  await j.run('9', 'Simulated phone 390x844 and 320x568: menu, request sheet fields and Send reachable; sheet closes on success, stays on refusal; composer stays; the pin bar and its sheet work', [a, b], async (detail) => {
    const sizes: [number, number][] = [[390, 844], [320, 568]];
    detail['sizes'] = {};
    const bad: string[] = [];
    const sheetInfo = (p: Browser): Promise<Record<string, unknown>> => p.eval(`(() => {
      const d = [...document.querySelectorAll('dialog[open]')].at(-1), body = d?.querySelector('.messages-sheet-body') ?? d, r = d?.getBoundingClientRect();
      return { open: !!d, top: r ? Math.round(r.top) : null, bottom: r ? Math.round(r.bottom) : null, h: r ? Math.round(r.height) : null, viewportH: innerHeight, scrolls: body ? body.scrollHeight > body.clientHeight + 1 : null, pageOverflowX: document.documentElement.scrollWidth > innerWidth + 1, closeBtn: (() => { const c = d?.querySelector('.base-sheet-close'); if (!c) return null; const q = c.getBoundingClientRect(), cs = getComputedStyle(c); return { x: Math.round(q.left), y: Math.round(q.top), w: Math.round(q.width), display: cs.display, vis: cs.visibility, op: cs.opacity, bg: cs.backgroundColor, color: cs.color }; })() };
    })()`);
    const scrollSheet = (p: Browser, end: boolean): Promise<unknown> => p.eval(`(() => { const d = [...document.querySelectorAll('dialog[open]')].at(-1); const t = d?.querySelector('.messages-request') ?? d; let e = t; while (e && e !== document.body) { if (e.scrollHeight > e.clientHeight + 1 && getComputedStyle(e).overflowY !== 'visible') { e.scrollTop = ${end ? '99999' : '0'}; } e = e.parentElement; } return true; })()`);
    for (const [w, h] of sizes) {
      await skip(25 * HOUR); // a new day for the request limits
      for (const p of [a, b]) await phone(p, w, h);
      await sleep(900);
      const out: Record<string, unknown> = {};
      (detail['sizes'] as Record<string, unknown>)[`${w}x${h}`] = out;
      await clearToasts(a);
      // 1. the chat itself, with its composer
      out['closedChat'] = await panelInfo(a);
      await j.shot(a, `phone${w}-chat-closed`);
      if (!(out['closedChat'] as any).composerShown) bad.push(`${w}: composer not shown in the open chat`);
      // 2. the menu
      await a.click('.messages-kebab'); await a.waitFor(`!!document.querySelector('.messages-manage')`, 5000, 'the chat menu');
      out['menu'] = await reach(a, '[data-chat="request-money"]'); await j.shot(a, `phone${w}-menu`);
      const m = out['menu'] as any; if (!m.found || !m.inViewNow || !m.hitIsIt) bad.push(`${w}: Request money in the menu is not reachable (${JSON.stringify(m)})`);
      await openForm(a); await sleep(400);
      // 3. the request sheet
      out['sheet'] = await sheetInfo(a);
      out['amountReach'] = await reach(a, '#message-request-amount'); out['noteReach'] = await reach(a, '#message-request-note'); out['sendReach'] = await reach(a, '.messages-request button', 'Send request');
      await j.shot(a, `phone${w}-form-open`);
      for (const [name, r] of [['amount', out['amountReach']], ['note', out['noteReach']], ['send', out['sendReach']]] as const) { const x = r as any; if (!x.found) bad.push(`${w}: ${name} control missing`); else if (!x.hitIsIt) bad.push(`${w}: ${name} control is covered or off screen (${JSON.stringify(x)})`); }
      await scrollSheet(a, true); await sleep(250);
      out['sendReachAfterScroll'] = await reach(a, '.messages-request button', 'Send request'); await j.shot(a, `phone${w}-form-scrolled-end`);
      const rs = out['sendReachAfterScroll'] as any; if (!rs.found || !rs.inViewNow || !rs.hitIsIt) bad.push(`${w}: Send request is not on screen after scrolling the sheet (${JSON.stringify(rs)})`);
      await scrollSheet(a, false);
      if ((out['sheet'] as any).pageOverflowX) bad.push(`${w}: the page scrolls sideways with the sheet open`);
      // 4. a refusal keeps the sheet open
      await a.type('#message-request-amount', '5001'); await a.click('button', 'Send request'); await sleep(900);
      out['refusal'] = { help: (await visible(a, '#message-request-help.is-warn')) ? await text(a, '#message-request-help') : '', formStillOpen: await visible(a, '#message-request-amount') };
      await j.shot(a, `phone${w}-refusal`);
      if (!(out['refusal'] as any).formStillOpen) bad.push(`${w}: the sheet closed on a refusal`);
      // 5. a good request closes it and the card shows
      await a.type('#message-request-amount', '300'); await a.type('#message-request-note', 'Lunch at the long-named buka by the market');
      out['form'] = await layoutProbe(a, '.messages-request');
      await a.click('button', 'Send request');
      const shown = await askerAndPayerSee('open', cardsSoFar + 1, 'phone open').then(() => true, () => false);
      out['cardAppeared'] = shown;
      out['sheetClosedWithinMs'] = await a.waitFor(`!document.querySelector('#message-request-amount')`, 8000, 'the request sheet to close').then(() => 1, () => -1);
      out['afterSend'] = await panelInfo(a);
      await j.shot(a, `phone${w}-after-send`);
      if (!shown) { bad.push(`${w}: request not sent (toasts ${JSON.stringify(await toasts(a))})`); continue; }
      cardsSoFar += 1;
      if (out['sheetClosedWithinMs'] === -1) bad.push(`${w}: sheet stayed open after a successful request`);
      if (!(out['afterSend'] as any).composerShown) bad.push(`${w}: composer did not return after the request`);
      await j.shot(b, `phone${w}-card-payer`);
      out['cardAsker'] = await layoutProbe(a, '.bubble.is-request:last-of-type'); out['cardPayer'] = await layoutProbe(b, '.bubble.is-request:last-of-type');
      out['cardTexts'] = [await card(a), await card(b)];
      out['cardClipped'] = await b.eval<unknown>(`(() => { const c = [...document.querySelectorAll('.bubble.is-request')].at(-1), r = c.getBoundingClientRect(); return { cardRight: Math.round(r.right), viewport: innerWidth, textOverflow: c.scrollWidth > c.clientWidth + 1, noteFull: c.innerText.includes('market') }; })()`);
      const cc = out['cardClipped'] as any; if (cc.textOverflow || cc.cardRight > cc.viewport) bad.push(`${w}: the request card is clipped (${JSON.stringify(cc)})`);
      if (w === 390) { await tapPay(b); await askerAndPayerSee('paid', cardsSoFar, 'paid on phone'); out['paidByTouch'] = true; await j.shot(b, `phone${w}-paid`);
        // pins when there ARE pins
        await a.type('.messages-chat textarea, .messages-chat input[placeholder="Message"]', 'pin me please'); await a.press('Enter', 'Enter', 13);
        await a.waitFor(`[...document.querySelectorAll('.bubble-wrap')].some((x) => x.innerText.includes('pin me please') && x.querySelector('.bubble-more'))`, 15000, 'the sent text message');
        await a.eval(`(() => { const t = [...document.querySelectorAll('.bubble-wrap')].filter((x) => x.innerText.includes('pin me please')).at(-1); t.querySelector('.bubble-more').scrollIntoView({ block: 'center' }); return true; })()`);
        const more = await a.eval<{ x: number; y: number }>(`(() => { const t = [...document.querySelectorAll('.bubble-wrap')].filter((x) => x.innerText.includes('pin me please')).at(-1), r = t.querySelector('.bubble-more').getBoundingClientRect(); return { x: r.left + r.width / 2, y: r.top + r.height / 2 }; })()`);
        await a.tapAt(more.x, more.y); await sleep(300);
        await a.click('.menu-item', 'Pin message');
        await a.waitFor(`!!document.querySelector('[data-chat="pinbar"]')`, 10000, 'the pin bar');
        out['pinbar'] = await reach(a, '[data-chat="pinbar"]'); await j.shot(a, `phone${w}-pinbar`);
      } else {
        out['pinbar'] = await reach(a, '[data-chat="pinbar"]'); await j.shot(a, `phone${w}-pinbar`);
        await a.click('[data-chat="pinbar"]'); await sleep(400);
        if (await visible(a, '.pinned-toggle') && (await a.eval<string>(`document.querySelector('.pinned-toggle').getAttribute('aria-expanded')`)) !== 'true') { await a.click('.pinned-toggle'); await sleep(300); }
        out['pinSheet'] = await sheetInfo(a); await j.shot(a, `phone${w}-pinned-open`);
        out['pinRowVisible'] = await visible(a, '.pinned-row');
        if (!out['pinRowVisible']) bad.push(`${w}: the pin row is not visible in the pins sheet`);
        else { await a.click('.pinned-row'); await sleep(500); await j.shot(a, `phone${w}-pin-preview`); out['pinPreviewShown'] = await visible(a, '.messages-pin-preview'); }
        await a.press('Escape', 'Escape', 27); await sleep(400);
        await b.click('.request-btn', 'Decline'); await askerAndPayerSee('declined', cardsSoFar, 'declined on phone'); out['declinedByTouch'] = true;
      }
      const pb = out['pinbar'] as any; if (!pb.found || !pb.hitIsIt) bad.push(`${w}: the pin bar is not reachable (${JSON.stringify(pb)})`);
    }
    for (const p of [a, b]) await desktop(p);
    for (const p of [a, b]) { await p.goto(lab.base + '/'); await gameShown(p); await dismiss(p); }
    await openChat(a, 'Bola'); await openChat(b, 'Ada'); await sleep(1500);
    cardsSoFar = (await cardsOf(a)).length;
    detail['problems'] = bad;
    must(bad.length === 0, bad.join(' | '));
  });

  await j.run('11', 'Server time decides Expired: page clock +2 h then -2 h against a lab clock 23 h / 25 h after the request', [a, b], async (detail) => {
    await skip(25 * HOUR);
    await asked('300', 'Skew');
    lab.advance(23 * HOUR);                       // the server is 23 h into the 24 h window
    await syncClock(a, lab.offset() + 2 * HOUR); await syncClock(b, lab.offset() + 2 * HOUR);  // pages 2 h AHEAD: they would read 25 h
    for (const p of [a, b]) { await p.goto(lab.base + '/'); await gameShown(p); await dismiss(p); }
    await openChat(a, 'Bola'); await openChat(b, 'Ada'); await sleep(1500);
    detail['pageAheadStates'] = [await cardState(a), await cardState(b)]; detail['pageAheadButtons'] = [await cardButtons(a), await cardButtons(b)];
    await j.shot(b, 'skew-plus2h-open');
    lab.advance(2 * HOUR);                        // the server is 25 h in: expired
    await syncClock(a, lab.offset() - 2 * HOUR); await syncClock(b, lab.offset() - 2 * HOUR);  // pages 2 h BEHIND: they would read 23 h
    for (const p of [a, b]) { await p.goto(lab.base + '/'); await gameShown(p); await dismiss(p); }
    await openChat(a, 'Bola'); await openChat(b, 'Ada'); await sleep(1500);
    detail['pageBehindStates'] = [await cardState(a), await cardState(b)]; detail['pageBehindButtons'] = [await cardButtons(a), await cardButtons(b)];
    detail['pageDateOffsetHours'] = (await b.eval<number>(`Date.now()`) - Date.now() - lab.offset()) / HOUR;
    await j.shot(b, 'skew-minus2h-expired');
    // restore the pages' clocks to the lab's
    await syncClock(a, lab.offset()); await syncClock(b, lab.offset());
    for (const p of [a, b]) { await p.goto(lab.base + '/'); await gameShown(p); await dismiss(p); }
    await openChat(a, 'Bola'); await openChat(b, 'Ada'); cardsSoFar = (await cardsOf(a)).length;
    must(detail['pageAheadStates']!.toString() === 'open,open', `with the page 2 h ahead the cards read ${detail['pageAheadStates']} (the server says open)`);
    must(detail['pageBehindStates']!.toString() === 'expired,expired', `with the page 2 h behind the cards read ${detail['pageBehindStates']} (the server says expired)`);
  });

  await j.run('10', 'Expiry: a request open for 24 h reads Expired on both cards, has no buttons, and the server refuses a late Pay', [a, b], async (detail) => {
    await skip(25 * HOUR); // the request-limit day again
    await asked('300', 'Old');
    await skip(25 * HOUR);
    // the open card ages on the page by itself (its clock ticks); a reload is the fallback and is reported
    const seen = await b.waitFor<string>(`[...document.querySelectorAll('.bubble.is-request')].at(-1)?.dataset.requestState === 'expired' ? 'expired' : ''`, 20000, 'the live card to read Expired').catch(() => 'open-after-20s');
    detail['liveStateBola'] = seen; detail['liveStateAda'] = await cardState(a);
    detail['liveButtonsBola'] = await cardButtons(b); detail['liveButtonsAda'] = await cardButtons(a);
    await j.shot(b, 'expired-live');
    // the server's own answer to a late Pay (a call the page could still make from a stale card)
    const conv = (await pageCall(b, '/api/social/conversations')).body?.conversations?.find((c: any) => c.with === ids['ada']);
    const thread = await pageCall(b, `/api/social/conversations/${encodeURIComponent(conv.id)}`);
    const req = (thread.body?.messages ?? []).filter((m: any) => m.request).at(-1)?.request;
    detail['serverView'] = { state: req?.state, payable: req?.payable };
    const late = await pageCall(b, '/api/social/money-requests/answer', { id: req?.id, op: 'pay', cityId: 'lagos', clientId: await b.eval<string>(`Date.now() + ':' + crypto.randomUUID()`) });
    detail['latePay'] = { status: late.status, code: late.body?.code, reason: late.body?.reason };
    detail['cashBola'] = await cashOf(b);
    for (const p of [a, b]) { await p.goto(lab.base + '/'); await gameShown(p); await dismiss(p); }
    await openChat(b, 'Ada'); await openChat(a, 'Bola');
    await b.waitFor(`document.querySelectorAll('.bubble.is-request').length > 0`, 15000, 'cards after the reload').catch(() => undefined); await sleep(800);
    detail['afterReloadBola'] = [await cardState(b), await card(b), await cardButtons(b)]; detail['afterReloadAda'] = [await cardState(a), await cardButtons(a)];
    await j.shot(b, 'expired-after-reload'); await j.shot(a, 'expired-asker');
    must(seen === 'expired', 'the open card did not turn Expired by itself on the page');
    must(late.body?.ok === false && /expired/i.test(String(late.body?.reason ?? late.body?.code)), `a late Pay was not refused as expired: ${JSON.stringify(late.body)}`);
    must(detail['afterReloadBola'] && (detail['afterReloadBola'] as any)[0] === 'expired' && (detail['afterReloadBola'] as any)[2].length === 0, 'after a reload the card is not an Expired card without buttons');
    cardsSoFar = (await cardsOf(a)).length;
  });

  await j.run('7', 'Block: Bola blocks Ada while a request is open: the open request ends', [a, b], async (detail) => {
    await skip(HOUR);
    await asked('350', 'Last one');
    await b.click('.messages-name');
    await b.waitFor(`!!document.querySelector('.social-btn.is-danger')`, 10000, 'the player card');
    await j.shot(b, 'player-card');
    await b.click('.social-btn.is-danger', 'Block');
    await sleep(1500);
    detail['bolaText'] = (await text(b)).replace(/\s+/g, ' ').slice(0, 300);
    await j.shot(b, 'after-block');
    const view = await pageCall(a, '/api/social/conversations');
    const conv = (view.body?.conversations ?? []).find((c: any) => c.with === ids['bola']);
    const thread = conv ? await pageCall(a, `/api/social/conversations/${encodeURIComponent(conv.id)}`) : null;
    const last = (thread?.body?.messages ?? []).filter((m: any) => m.request).at(-1)?.request;
    detail['serverState'] = last?.state ?? null;
    must(last && last.state !== 'open', `the request is still ${last?.state}`);
    await a.goto(lab.base + '/'); await gameShown(a); await dismiss(a);
    await openChat(a, 'Bola').catch((e) => { detail['adaOpen'] = String(e).slice(0, 120); });
    await a.waitFor(`document.querySelectorAll('.bubble.is-request').length > 0`, 10000, 'cards').catch(() => undefined); await sleep(800);
    detail['adaHead'] = (await text(a, '.messages-chat .messages-head')).replace(/\s+/g, ' ');
    detail['adaCardAfter'] = await card(a);
    await a.click('.messages-kebab').catch(() => undefined);
    detail['adaOptionsAfterBlock'] = await a.eval<string[]>(`[...document.querySelectorAll('.messages-manage button')].map((x) => x.innerText.trim())`);
    await j.shot(a, 'blocked-asker-options');
    if ((detail['adaOptionsAfterBlock'] as string[]).includes('Request money')) {
      await openForm(a); await a.type('#message-request-amount', '100'); await a.click('button', 'Send request'); await sleep(900);
      detail['blockedTapResult'] = (await visible(a, '#message-request-help.is-warn')) ? await text(a, '#message-request-help') : 'no message';
      await j.shot(a, 'blocked-asker-refusal');
    }
    must(!(detail['adaOptionsAfterBlock'] as string[]).includes('Request money'), 'a blocked partner still gets a Request money button (a tap says: ' + String(detail['blockedTapResult']) + ')');
  });

  j.notes.push('Expiry after 24 h: the server clock of the lab was moved with the page clocks moved the same amount (the app stamps request ids with the page clock), see step 10.');
} catch (e) { console.log('ERR', e); }
finally {
  const code = j.finish({ idAda: ids['ada'], idBola: ids['bola'] }, { ada: realErrors(a), bola: realErrors(b), cara: realErrors(c) });
  c.close(); b.close(); a.close(); await lab.stop(); process.exit(code);
}
