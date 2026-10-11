#!/usr/bin/env node
/**
 * Feature journey: the public shop link (docs/SHOWCASE.md, "The public link"). A seller shares a published shop; a stranger in a FRESH
 * browser context (no cookie, no storage) opens the link at 390x844, 320x568 and 1280x800, reads the page, checks the message
 * buttons, then taps "Step inside" and ends in the game as a guest with the shop open. One server, one Chrome, no outside request.
 *
 *   node --experimental-strip-types --no-warnings scripts/journeys/shoplink.ts --out <folder> [--port 4393] [--debug-port 4394]
 *
 * Operator work (the phone tier, the approval) uses the documented routes. The shop is written through the seller's own routes;
 * the share card and everything a stranger sees are the real UI. Writes an index.html beside the screenshots.
 */
import { writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { Browser, sleep } from './cdp.ts';
import { startLab } from './lab.ts';
import { Journey, arg, desktop, dismiss, gameShown, must, pageCall, phone, playNow, realErrors, sessionId, syncClock, text, visible } from './kit.ts';
import { shopPageHtml } from '../../server/showcase/page.ts';
import type { ShowcaseShop } from '../../src/types/showcase.ts';

const port = Number(arg('port', '4393')), debugPort = Number(arg('debug-port', '4394'));
const lab = await startLab(port);
const S = await Browser.launch(debugPort);          // the seller
const V = await Browser.second(debugPort, S);       // a stranger: a fresh context, nothing stored
const j = new Journey(arg('out'), 'shoplink');
const HOUR = 3600000;
const NAME = 'Ada Braids & Beauty';
const state: { url: string; path: string; token: string; shop: string } = { url: '', path: '', token: '', shop: '' };
for (const sig of ['SIGINT', 'SIGTERM'] as const) process.once(sig, () => { try { S.child.kill('SIGKILL'); } catch { /* gone */ } process.exit(130); });

const id = (): string => `${lab.now()}:${crypto.randomUUID()}`;
/** A JPEG made in the page (a gradient and circles), small enough for the 150 kB cap. */
const photo = (p: Browser, seed: number): Promise<string> => p.eval<string>(`(() => { const c = document.createElement('canvas'); c.width = 720; c.height = 540; const x = c.getContext('2d'); const g = x.createLinearGradient(0, 0, 720, 540); g.addColorStop(0, 'hsl(' + (${seed} * 70 % 360) + ',65%,62%)'); g.addColorStop(1, 'hsl(' + ((${seed} * 70 + 120) % 360) + ',55%,38%)'); x.fillStyle = g; x.fillRect(0, 0, 720, 540); for (let i = 0; i < 12; i++) { x.fillStyle = 'hsla(' + ((${seed} * 40 + i * 25) % 360) + ',80%,72%,0.5)'; x.beginPath(); x.arc((i * 137 + ${seed} * 53) % 720, (i * 91 + ${seed} * 31) % 540, 30 + (i * 13) % 70, 0, 7); x.fill(); } x.fillStyle = '#fff'; x.font = 'bold 54px sans-serif'; x.fillText('Braids ${seed}', 40, 100); return c.toDataURL('image/jpeg', 0.5).split(',')[1]; })()`);

interface Probe { h1: string; scrollW: number; clientW: number; scripts: number; cookie: string; buttons: { text: string; href: string; h: number; w: number }[]; minFont: number; imgsBroken: number; imgs: number; fine: boolean; title: string; transfer: number; resources: string[] }
const probe = (p: Browser): Promise<Probe> => p.eval(`(() => {
  const buttons = [...document.querySelectorAll('a.btn')].map((a) => { const r = a.getBoundingClientRect(); return { text: a.innerText.trim(), href: a.getAttribute('href') || '', h: Math.round(r.height), w: Math.round(r.width) }; });
  let min = 99; for (const el of document.querySelectorAll('main *')) { if (!el.childNodes.length || ![...el.childNodes].some((n) => n.nodeType === 3 && n.textContent.trim())) continue; min = Math.min(min, parseFloat(getComputedStyle(el).fontSize)); }
  const nav = performance.getEntriesByType('navigation')[0] || {};
  const imgs = [...document.images];
  return { h1: (document.querySelector('h1') || {}).innerText || '', scrollW: document.documentElement.scrollWidth, clientW: document.documentElement.clientWidth, scripts: document.scripts.length, cookie: document.cookie, buttons, minFont: min,
    imgs: imgs.length, imgsBroken: imgs.filter((i) => i.complete && i.naturalWidth === 0).length, fine: /You deal directly with the seller/.test(document.body.innerText), title: document.title, transfer: nav.transferSize || nav.encodedBodySize || 0,
    resources: performance.getEntriesByType('resource').map((e) => e.name.replace(location.origin, '') + ' ' + (e.transferSize || 0)) };
})()`);
const scrollTo = async (p: Browser, y: number): Promise<void> => { await p.eval(`window.scrollTo(0, ${y}); true`); await sleep(350); };
/** The page at three scroll positions: the top, the middle and the end. */
async function shots(p: Browser, label: string): Promise<void> {
  await scrollTo(p, 0); await j.shot(p, `${label}-top`);
  const total = await p.eval<number>(`document.documentElement.scrollHeight`), view = await p.eval<number>(`innerHeight`);
  if (total > view * 1.4) { await scrollTo(p, Math.round((total - view) / 2)); await j.shot(p, `${label}-middle`); }
  if (total > view * 1.1) { await scrollTo(p, total); await j.shot(p, `${label}-end`); }
  await scrollTo(p, 0);
}
function checkPage(label: string, r: Probe, detail: Record<string, unknown>): string[] {
  const problems: string[] = [];
  detail[label] = { h1: r.h1, scrollW: r.scrollW, clientW: r.clientW, scripts: r.scripts, minFont: r.minFont, buttons: r.buttons.map((b) => `${b.text} ${b.w}x${b.h}`), imgs: `${r.imgs - r.imgsBroken}/${r.imgs}`, transferBytes: r.transfer, resources: r.resources };
  if (!r.h1.includes(NAME)) problems.push(`${label}: heading is "${r.h1}"`);
  if (r.scrollW > r.clientW) problems.push(`${label}: sideways overflow ${r.scrollW} > ${r.clientW}`);
  if (r.scripts !== 0) problems.push(`${label}: ${r.scripts} script tags`);
  if (r.cookie) problems.push(`${label}: a cookie was set`);
  if (!r.fine) problems.push(`${label}: no "You deal directly with the seller" line`);
  if (r.imgsBroken) problems.push(`${label}: ${r.imgsBroken} pictures did not load`);
  if (r.buttons.some((b) => b.h < 44)) problems.push(`${label}: a button under 44 px high`);
  if (r.minFont < 13) problems.push(`${label}: text as small as ${r.minFont}px`);
  const chat = r.buttons.filter((b) => b.text === 'Message the seller');
  if (chat.length < 4) problems.push(`${label}: ${chat.length} message buttons, wanted the shop and three items`);
  for (const b of chat) {
    const href = b.href.replaceAll('&amp;', '&');
    if (!href.startsWith('https://wa.me/2348012345678?text=')) { problems.push(`${label}: message button href ${href.slice(0, 60)}`); continue; }
    const words = new URL(href).searchParams.get('text') ?? '';
    if (!words.includes(NAME)) problems.push(`${label}: the words do not name the shop: ${words}`);
  }
  const items = chat.slice(1).map((b) => new URL(b.href.replaceAll('&amp;', '&')).searchParams.get('text') ?? '');
  if (!(items.some((t) => t.includes('Knotless braids') && t.includes('₦25,000')) && items.some((t) => t.includes('Wash & set')))) problems.push(`${label}: the item buttons do not name the items: ${JSON.stringify(items)}`);
  if (!r.resources.every((line) => !/\.js\b|\/assets\//.test(line))) problems.push(`${label}: the page loaded game files: ${r.resources.filter((line) => /\.js\b|\/assets\//.test(line)).join(', ')}`);
  return problems;
}
async function openShopTab(p: Browser): Promise<void> {
  if (!(await visible(p, '.sc-app'))) {
    if (!(await visible(p, '.ph-appbtn'))) await p.click('[data-nav="phone"]');
    for (let i = 0; i < 3 && !(await visible(p, '.sc-app')); i++) { if (await visible(p, '.ph-appbtn', 'Services')) await p.click('.ph-appbtn', 'Services'); await p.waitFor(`!!document.querySelector('.sc-app')`, 6000, 'Services').catch(() => undefined); }
  }
  await p.waitFor(`!!document.querySelector('.sc-app')`, 8000, 'the Services app');
  for (let i = 0; i < 4; i++) { await sleep(900); if (await visible(p, '.sp-back')) { await p.click('.sp-back'); await sleep(600); } await p.click('.sc-tabs [role="tab"]', 'My shop'); await sleep(500); if (await p.eval<boolean>(`[...document.querySelectorAll('.sc-tabs [role="tab"]')].some((t) => t.getAttribute('aria-selected') === 'true' && /My shop/.test(t.innerText))`)) break; }
  await p.waitFor(`document.querySelector('[data-showcase-editor]') && !document.querySelector('[data-showcase-editor]').innerText.includes('Loading')`, 20000, 'the editor');
}

try {
  await desktop(S); await desktop(V);

  await j.run('0', 'Setup: a seller who may publish (account, adult, phone checked, a day old) writes a shop with three items', [S], async (detail) => {
    await playNow(S, lab.base, 'Ada Seller');
    await lab.signIn(S, 'seller@example.test'); await S.goto(lab.base + '/'); await gameShown(S); await dismiss(S);
    lab.advance(25 * HOUR); await syncClock(S, lab.offset());
    const sid = await sessionId(S);
    const tier = await lab.admin(`/api/admin/trust/players/${sid}/act`, { clientId: id(), action: 'verify', tier: 'phone', reason: 'journey: met in person' });
    must(tier['ok'] === true, `tier: ${JSON.stringify(tier).slice(0, 200)}`);
    const adult = await pageCall(S, '/api/growth/consent', { cityId: 'lagos', age: 'adult' }); must(adult.body?.ok === true, 'adult answer');
    const saved = await pageCall(S, '/api/showcase/mine', { clientId: id(), expectedRevision: 0, city: 'lagos', venue: 'market', name: NAME, category: 'salon', template: 'classic', colours: ['#b4541a', '#fff4e6'], sign: 'Braids today', logo: 'scissors',
      about: 'Knotless braids, wash and set, and honest advice for natural hair.\nWalk in, or message us first.', services: [{ label: 'Knotless braids', priceNaira: 25000, note: 'About four hours' }, { label: 'Wash & set', priceNaira: 6000, note: '' }, { label: 'Hair advice', priceNaira: 0, note: 'Free for first visits' }],
      hours: [{ open: '09:00', close: '18:00' }, { open: '09:00', close: '18:00' }, { open: '09:00', close: '18:00' }, { open: '09:00', close: '18:00' }, { open: '09:00', close: '18:00' }, { open: '10:00', close: '16:00' }, null],
      chat: { url: 'https://wa.me/2348012345678' }, pay: { url: 'https://paystack.com/pay/ada-braids-demo' } });
    must(saved.body?.ok === true, `save: ${JSON.stringify(saved.body).slice(0, 300)}`);
    state.shop = saved.body.id;
    detail['shop'] = state.shop;
  });

  await j.run('1', 'Seller: "Share my shop" before the shop is published says plainly what is still needed', [S], async (detail) => {
    await openShopTab(S);
    detail['needed'] = (await text(S, '[data-share]')).replace(/\s+/g, ' ');
    await j.shot(S, 'seller-share-needs-photos');
    must(/once it is published/i.test(String(detail['needed'])) && /Add at least 3 photos/.test(String(detail['needed'])), `the card says: ${detail['needed']}`);
    must(!(await visible(S, '[data-share-send], [data-share-copy-link]')), 'a share button is offered for an unpublished shop');
    for (const seed of [1, 2, 3]) { const up = await pageCall(S, '/api/showcase/mine/photos', { clientId: id(), type: 'image/jpeg', data: await photo(S, seed) }); must(up.body?.ok === true, `photo ${seed}: ${JSON.stringify(up.body).slice(0, 200)}`); }
    const sub = await pageCall(S, '/api/showcase/mine/submit', { clientId: id() }); must(sub.body?.status === 'review', `submit: ${JSON.stringify(sub.body)}`);
    const early = await pageCall(S, '/api/showcase/mine/share', { clientId: id() }); detail['shareWhileInReview'] = early.body?.error;
    must(early.body?.error === 'not_published', 'the server gave a link before approval');
  });

  await j.run('2', 'Operator approves; the seller sees the link, the ready-made message, and copies it', [S], async (detail) => {
    const trace = (what: string): void => console.log(`[shoplink]   ${new Date().toISOString().slice(11, 19)} ${what}`);
    trace('queue'); const queue = await lab.mod('/api/mod/showcase'); trace('queued'); must((queue['queue'] ?? []).length === 1, 'the shop is not in the operator queue');
    const done = await lab.mod('/api/mod/showcase', { action: 'approve', shop: state.shop }); trace('approved'); must(done['status'] === 'live', 'approve');
    await S.goto(lab.base + '/'); trace('loaded'); await gameShown(S); trace('game'); await dismiss(S); await syncClock(S, lab.offset()); trace('clock');
    await openShopTab(S); trace('editor');
    await S.waitFor(`!!document.querySelector('[data-share-url]')`, 15000, 'the share link');
    state.url = (await text(S, '[data-share-url]')).trim();
    detail['url'] = state.url; detail['message'] = (await text(S, '[data-share-message]')).trim();
    await j.shot(S, 'seller-share-live');
    await S.click('[data-share-copy-message]');
    await S.waitFor(`/copied/i.test((document.querySelector('[data-share-note]') || {}).innerText || '')`, 8000, 'the copy note');
    detail['note'] = (await text(S, '[data-share-note]')).trim();
    detail['hasSystemShare'] = await visible(S, '[data-share-send]');
    const u = new URL(state.url); state.path = u.pathname; state.token = state.path.slice(-8);
    must(u.origin === lab.base && /^\/shop\/ada-braids-beauty-[a-hjkmnp-z2-9]{8}$/.test(state.path), `the address is ${state.url}`);
    must(!state.url.includes('SC-') && String(detail['message']).includes(state.url), 'the message does not carry the link');
  });

  for (const [n, label, w, h] of [['3', 'phone 390x844', 390, 844], ['4', 'small phone 320x568', 320, 568], ['5', 'desktop 1280x800', 1280, 800]] as const) {
    await j.run(n, `A stranger in a fresh browser opens the link on a ${label}: the shop at once, no sign-up, no game files, message buttons filled in`, [V], async (detail) => {
      if (w >= 1000) await desktop(V, w, h); else await phone(V, w, h);
      await V.goto(state.url);
      await V.waitFor(`document.querySelector('h1')`, 30000, 'the shop page');
      await V.waitFor(`[...document.images].every((i) => i.complete)`, 30000, 'the pictures').catch(() => undefined);
      await sleep(400);
      const problems = checkPage('page', await probe(V), detail);
      await shots(V, `stranger-${w}`);
      detail['problems'] = problems; must(problems.length === 0, problems.join(' | '));
    });
  }

  await j.run('6', 'Empty and error states: a shop with no photos, no items and no hours (rendered from the same code), and an address that is not a shop', [V], async (detail) => {
    await phone(V, 390, 844);
    const bare: ShowcaseShop = { v: 1, id: 'SC-9', owner: 'x', city: 'lagos', venue: 'market', slot: 1, name: 'Quiet Corner', category: 'other', template: 'plain', colours: ['#3d4852', '#f1f3f5'], sign: 'Open soon', logo: 'star', about: 'A new shop. Message us to ask what we have.', services: [], hours: [null, null, null, null, null, null, null], chat: { kind: 'whatsapp', url: 'https://wa.me/2348012345678' }, pay: null, photos: [], status: 'live', revision: 1, createdAt: 1, updatedAt: 1 };
    const file = join(tmpdir(), `shoplink-bare-${process.pid}.html`);
    writeFileSync(file, shopPageHtml({ shop: bare, token: 'k3x9m2q7', city: 'Lagos', market: 'Market', checked: null, payNotice: null }, lab.base));
    await V.goto(`file://${file}`); await sleep(500);
    detail['bare'] = (await text(V, 'main')).replace(/\s+/g, ' ');
    await shots(V, 'empty-shop');
    must(/Nothing is listed yet/.test(String(detail['bare'])) && /Ask the seller when they are open/.test(String(detail['bare'])), 'the empty states are missing');
    const sideways = await V.eval<boolean>(`document.documentElement.scrollWidth > document.documentElement.clientWidth`); must(!sideways, 'the empty shop overflows sideways');
    await V.goto(`${lab.base}/shop/zzzzzzzz`);
    detail['gone'] = (await text(V, 'main')).replace(/\s+/g, ' ');
    const status = await V.eval<number>(`performance.getEntriesByType('navigation')[0].responseStatus || 0`); detail['goneStatus'] = status;
    await j.shot(V, 'not-available');
    must(/This shop is not available/.test(String(detail['gone'])) && (await visible(V, 'a.btn', 'Open Allworld')), 'the plain page is not shown');
    must(status === 404 || status === 0, `status ${status}`);
  });

  await j.run('7', 'Step inside: the stranger taps it, starts as a guest, and the shop is the first thing open in the game; no tour in the way', [V], async (detail) => {
    await phone(V, 390, 844);
    await V.goto(state.url); await V.waitFor(`document.querySelector('.inside .btn')`, 20000, 'Step inside');
    await V.click('.inside .btn', 'Step inside');
    await V.waitFor(`!!document.querySelector('[data-qs-name]')`, 60000, 'the start screen');
    detail['entryUrl'] = await V.eval<string>(`location.href`);
    await sleep(600); await j.shot(V, 'step-inside-start');
    await V.type('[data-qs-name]', 'Visitor Vera');
    await V.click('[data-key="play-now"]');
    await V.waitFor(`!!document.querySelector('.sp .shf-about') || !!document.querySelector('.sc-app')`, 90000, 'the shop in the game');
    await V.waitFor(`!!document.querySelector('.sp .shf-about')`, 30000, 'the shop page').catch(() => undefined);
    await V.waitFor(`[...document.querySelectorAll('.sp img')].every((i) => i.complete)`, 20000, 'pictures').catch(() => undefined);
    await sleep(1500);
    detail['shopText'] = (await text(V, '.sc-app')).replace(/\s+/g, ' ').slice(0, 300);
    detail['tourShowing'] = await V.eval<boolean>(`!!document.querySelector('[data-tour-layer]') && getComputedStyle(document.querySelector('[data-tour-layer]')).display !== 'none'`);
    detail['address'] = await V.eval<string>(`location.pathname + location.search`);
    await j.shot(V, 'step-inside-shop-open');
    must(/Ada Braids/.test(String(detail['shopText'])) && /Knotless braids/.test(String(detail['shopText'])), `the open shop is: ${detail['shopText']}`);
    must(!detail['tourShowing'], 'the tour is in front of the shop');
    must(detail['address'] === '/', `the address was not cleaned: ${detail['address']}`);
    // The visitor closes the shop and is standing in the world.
    await V.press('Escape', 'Escape', 27); await sleep(700); if (await visible(V, '.sc-app')) { await V.press('Escape', 'Escape', 27); await sleep(700); }
    detail['world'] = await V.eval<boolean>(`!!document.querySelector('.hud-cash')`);
    await j.shot(V, 'step-inside-world');
    must(detail['world'], 'no game screen after closing the shop');
  });
} catch (e) { console.log('ERR', e); }
finally {
  const code = j.finish({ shop: state.path }, { seller: realErrors(S), stranger: realErrors(V) });
  try {
    const files = (await import('node:fs')).readdirSync(arg('out')).filter((f) => f.endsWith('.png')).sort();
    const steps = j.steps.map((s) => `<tr><td>${s.step}</td><td>${s.status}</td><td>${s.name.replace(/</g, '&lt;')}</td></tr>`).join('');
    writeFileSync(join(arg('out'), 'index.html'), `<!doctype html><meta charset="utf-8"><title>Shop link journey</title><style>body{font:15px system-ui;margin:24px;max-width:1100px}table{border-collapse:collapse}td{border:1px solid #ccc;padding:4px 8px}figure{display:inline-block;margin:8px;vertical-align:top}img{max-width:300px;border:1px solid #ccc}</style><h1>Shop link journey</h1><table>${steps}</table>${files.map((f) => `<figure><a href="${f}"><img src="${f}" loading="lazy"></a><figcaption>${f}</figcaption></figure>`).join('')}`);
  } catch { /* the evidence page is a courtesy */ }
  try { V.close(); S.close(); } catch { /* closed */ }
  await lab.stop(); process.exit(code);
}
