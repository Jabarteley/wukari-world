#!/usr/bin/env node
/**
 * Community panel captures: several players of one local lab stand in the same Lagos venue (Freedom Park) and the panel of the first one
 * is photographed in every state a player meets: alone, with others, with someone in voice, in voice muted and unmuted, with chat (long
 * lines and a refused line), disconnected, with a short screen (the keyboard up) and at home. No outside request.
 *
 *   node --experimental-strip-types --no-warnings scripts/journeys/community.ts --out <folder> [--port 4371] [--debug-port 4372]
 *
 * Every state is saved at 1280x800 and at the simulated phone sizes 390x844 and 320x568 (touch, 3x): <state>-1280.png, -390.png, -320.png.
 * Chrome runs muted, with a fake microphone that is granted by the flags. Exit code is not zero when a step fails.
 */
import { Browser, sleep } from './cdp.ts';
import { startLab } from './lab.ts';
import { Journey, arg, dismiss, gameShown, layoutProbe, must, pageCall, playNow, realErrors, sessionId, syncClock, text, visible } from './kit.ts';

const port = Number(arg('port', '4371')), debugPort = Number(arg('debug-port', '4372'));
const lab = await startLab(port);
const A = await Browser.launch(debugPort, ['--use-fake-ui-for-media-stream', '--use-fake-device-for-media-stream']);
const others: Browser[] = [];
const j = new Journey(arg('out'), 'community');
const HOUR = 3600000;
const names = ['Sunny Kemi', 'Bola Adeyemi', 'Chidi Okafor', 'Dayo Bello'];
const pages: Browser[] = [A];
const ids: string[] = [];
/** One more player opens the game (in the park, where a new life starts) and their panel. */
async function arrive(p: Browser): Promise<void> {
  lab.advance(HOUR);
  for (const q of pages) await syncClock(q, lab.offset());
  await p.goto(lab.base + '/'); await gameShown(p); await dismiss(p); await openCommunity(p);
}
for (const sig of ['SIGINT', 'SIGTERM'] as const) process.once(sig, () => { try { A.child.kill('SIGKILL'); } catch { /* gone */ } process.exit(130); });

const SIZES = [{ tag: '1280', width: 1280, height: 800, scale: 1, mobile: false }, { tag: '390', width: 390, height: 844, scale: 3, mobile: true }, { tag: '320', width: 320, height: 568, scale: 3, mobile: true }];
const probes: Record<string, unknown> = {};
async function snap(name: string, scope = '#community-panel'): Promise<void> {
  for (const size of SIZES) {
    await A.setViewport(size);
    await sleep(600);
    await A.screenshot(`${j.out}/${name}-${size.tag}.png`);
    probes[`${name}-${size.tag}`] = await layoutProbe(A, scope).catch(() => null);
  }
  await A.setViewport(SIZES[0]!);
  await sleep(300);
}
async function openCommunity(p: Browser): Promise<void> {
  if (await visible(p, '#community-panel')) return;
  for (let i = 0; i < 4 && !(await visible(p, '#community-panel')); i++) {
    // The venue card's chat button opens it (the phone's Community icon does the same).
    await p.eval(`(document.querySelector('[aria-label="Open community chat"]') || document.querySelector('[data-community]'))?.click()`);
    await sleep(1200);
  }
  await p.waitFor(`!!document.querySelector('#community-panel [data-community-panel]')`, 20000, 'the community panel');
}
const closeCommunity = async (p: Browser): Promise<void> => { if (await visible(p, '#community-close')) await p.click('#community-close'); await sleep(300); };
async function send(p: Browser, body: string): Promise<void> {
  await p.eval(`(() => { const f = document.querySelector('#community-message'); f.focus(); })()`);
  await p.send('Input.insertText', { text: body });
  await p.click('.community-compose button');
  await sleep(700);
}
const lines = (p: Browser): Promise<string[]> => p.eval(`[...document.querySelectorAll('.community-messages li')].map((x) => x.innerText.replace(/\\s+/g, ' ').trim())`);

// Every room socket of the first player is remembered and what it sends is logged, so a drop and a key press can be checked.
await A.send('Page.addScriptToEvaluateOnNewDocument', { source: `(() => { const R = window.WebSocket; window.__sockets = []; window.__sent = []; window.WebSocket = new Proxy(R, { construct(t, a) { const url = window.__wsBlock ? String(a[0]).replace(/\\/[^/?]*(\\?|$)/, '/__refused$1') : a[0]; const s = new t(url, ...a.slice(1)); window.__sockets.push(s); const send = s.send.bind(s); s.send = (d) => { try { window.__sent.push(JSON.parse(d)); } catch { /* not JSON */ } return send(d); }; return s; } }); })();` });

try {
  await j.run('0', 'Setup: four players, all travel to Freedom Park', [A], async (detail) => {
    await A.setViewport(SIZES[0]!);
    await playNow(A, lab.base, names[0]!);
    for (const name of names.slice(1)) { const p = await Browser.second(debugPort, A); await p.setViewport(SIZES[0]!); await playNow(p, lab.base, name); others.push(p); pages.push(p); }
    for (const p of pages) ids.push(await sessionId(p));
    for (const [i, p] of pages.entries()) {
      const fund = await lab.admin(`/api/admin/players/${ids[i]}/act`, { clientId: `${lab.now()}:${crypto.randomUUID()}`, action: 'credit', amount: 5000, reason: 'journey' });
      detail[`fund${i}`] = fund.status;
    }
    // Only the first player goes to the park now, so the first captures are truly alone; the others are sent later (arrive()).
    // A new life starts in the park: the others leave the page (and so the room) until they arrive.
    for (const p of others) await p.goto('about:blank');
    // A is photographed alone first: the others go to the park a little later (they are reloaded after the first captures).
    await A.goto(lab.base + '/'); await gameShown(A); await dismiss(A);
    detail['location'] = (await pageCall(A, '/api/life?city=lagos')).body?.state?.location ?? null;
    must(detail['location'] === 'park', `the first player is at ${detail['location']}`);
  });

  await j.run('1', 'Alone in the room', [A], async (detail) => {
    await openCommunity(A);
    await A.waitFor(`document.querySelector('#community-panel')?.innerText.includes('Connected')`, 20000, 'Connected');
    await sleep(1200);
    detail['text'] = await text(A, '#community-panel');
    await snap('01-alone');
  });

  await j.run('2', 'A second player arrives: two in the room', [A], async (detail) => {
    await arrive(others[0]!);
    await A.waitFor(`document.querySelector('#community-panel')?.innerText.includes('Bola')`, 30000, 'the second player in the list');
    await sleep(800);
    detail['text'] = await text(A, '#community-panel');
    await snap('02-two-players');
  });

  await j.run('3', 'Four players in the room', [A], async (detail) => {
    for (const p of others.slice(1)) await arrive(p);
    await A.waitFor(`document.querySelector('#community-panel')?.innerText.includes('Dayo')`, 30000, 'the fourth player in the list');
    await sleep(800);
    detail['text'] = await text(A, '#community-panel');
    await snap('03-four-players');
  });

  await j.run('4', 'Someone else is in voice, I am not', [A], async (detail) => {
    await others[0]!.click('.community-join-voice');
    await A.waitFor(`/in voice/i.test(document.querySelector('#community-panel')?.innerText || '')`, 30000, 'a person in voice');
    await sleep(800);
    detail['text'] = await text(A, '#community-panel');
    await snap('04-other-in-voice');
  });

  await j.run('5', 'I join voice (muted), then unmute', [A], async (detail) => {
    await A.click('.community-join-voice');
    await A.waitFor(`!!document.querySelector('.community-mute')`, 30000, 'the mute button');
    await sleep(1500);
    detail['mutedText'] = await text(A, '#community-panel');
    await snap('05-me-voice-muted');
    await A.click('.community-mute');
    await sleep(1200);
    detail['unmutedText'] = await text(A, '#community-panel');
    await snap('06-me-voice-unmuted');
  });

  await j.run('6', 'Room chat: lines from both sides, a long one, a refused one', [A], async (detail) => {
    await send(others[0]!, 'Hello Sunny, welcome to the park!');
    await send(A, 'Hi Bola. Is the food stall open today?');
    await send(others[1]!, 'Yes it is, the suya is really good, and the zobo is cold, and there is also a small group playing football near the amphitheatre this afternoon if you want to join us for a game later on');
    await send(A, 'Great, see you all there');
    await A.waitFor(`document.querySelectorAll('.community-messages li').length >= 4`, 20000, 'four chat lines');
    detail['lines'] = await lines(A);
    await snap('07-chat');
    await send(A, 'call me on 08012345678');
    await sleep(600);
    detail['refusalText'] = await text(A, '#community-panel');
    await snap('08-chat-refused');
  });

  await j.run('7', 'Short screen (the keyboard up), phone sizes', [A], async (detail) => {
    for (const size of [{ tag: 'kb390', width: 390, height: 440, scale: 3, mobile: true }, { tag: 'kb320', width: 320, height: 300, scale: 3, mobile: true }]) {
      await A.setViewport(size); await sleep(500);
      await A.eval(`document.querySelector('#community-message').focus()`);
      await sleep(500);
      await A.screenshot(`${j.out}/09-keyboard-${size.tag}.png`);
      const r = await A.eval<{ composerBottom: number; vh: number }>(`(() => { const r = document.querySelector('.community-compose').getBoundingClientRect(); return { composerBottom: r.bottom, vh: innerHeight }; })()`);
      detail[size.tag] = r;
    }
    await A.setViewport(SIZES[0]!);
  });

  await j.run('7b', 'Keys: Shift+Enter makes a line, Enter sends; an arrow key on the pad walks', [A], async (detail) => {
    const key = (k: string, code: string, vk: number, modifiers = 0, text?: string) => A.send('Input.dispatchKeyEvent', { type: text ? 'keyDown' : 'rawKeyDown', key: k, code, windowsVirtualKeyCode: vk, modifiers, ...(text ? { text } : {}) }).then(() => A.send('Input.dispatchKeyEvent', { type: 'keyUp', key: k, code, windowsVirtualKeyCode: vk, modifiers }));
    await A.eval(`document.querySelector('#community-message').focus()`);
    await A.send('Input.insertText', { text: 'first line' });
    await key('Enter', 'Enter', 13, 8, '\r');
    await A.send('Input.insertText', { text: 'second line' });
    detail['draft'] = await A.eval<string>(`document.querySelector('#community-message').value`);
    must(String(detail['draft']).includes('\n'), 'Shift+Enter did not make a new line');
    await key('Enter', 'Enter', 13);
    await sleep(800);
    detail['afterEnter'] = await A.eval<string>(`document.querySelector('#community-message').value`);
    must(detail['afterEnter'] === '', 'Enter did not send');
    detail['sentChat'] = await A.eval<unknown[]>(`window.__sent.filter((m) => m.type === 'chat').map((m) => m.body)`);
    const moves = await A.eval<number>(`window.__sent.filter((m) => m.type === 'move').length`);
    await A.eval(`document.querySelector('.community-west').focus()`);
    await key('ArrowLeft', 'ArrowLeft', 37);
    await sleep(900);
    const after = await A.eval<number>(`window.__sent.filter((m) => m.type === 'move').length`);
    detail['moves'] = [moves, after];
    must(after > moves, 'the arrow key did not walk');
    detail['sendDisabledWhenEmpty'] = await A.eval<boolean>(`document.querySelector('.community-send').disabled`);
    must(detail['sendDisabledWhenEmpty'], 'Send is enabled with nothing typed');
  });

  await j.run('8', 'Disconnected: the room socket is dropped and not allowed back', [A], async (detail) => {
    await A.eval(`window.__wsBlock = true; window.__sockets.forEach((x) => x.close()); true`);
    await sleep(2500);
    detail['text'] = await text(A, '#community-panel');
    await snap('10-disconnected');
    await A.eval(`window.__wsBlock = false; true`);
  });

  await j.run('9', 'At home: no room', [A], async (detail) => {
    await A.goto(lab.base + '/'); await gameShown(A); await dismiss(A);
    const home = await pageCall(A, '/api/action', { actionId: `${lab.now()}:${crypto.randomUUID()}`, cityId: 'lagos', type: 'travel', id: 'home', mode: 'okada' });
    detail['trip'] = home.status;
    lab.advance(3 * HOUR); await syncClock(A, lab.offset());
    await A.goto(lab.base + '/'); await gameShown(A); await dismiss(A);
    await sleep(800);
    await A.eval(`(document.querySelector('[aria-label="Open community chat"]') || document.querySelector('[data-community]'))?.click()`);
    await sleep(1500);
    detail['panelShown'] = await visible(A, '#community-panel');
    detail['body'] = (await text(A, 'body')).slice(0, 300);
    await A.screenshot(`${j.out}/11-home-1280.png`);
  });
} finally {
  const code = j.finish({ probes }, { A: realErrors(A) });
  for (const p of [...others, A]) p.close();
  await lab.stop();
  process.exit(code);
}
