#!/usr/bin/env node
/**
 * Feature journey 3: showcase shops (docs/SHOWCASE.md). A seller, an adult buyer and a guest, each in an isolated browser context of ONE
 * Chrome, against the built app on a local loopback server (scripts/journeys/lab.ts: fresh data, stand-in sign-in, an operator token
 * made up for the run, and a clock that is moved 25 h so a new account passes the 24-hour wait). No outside request is made.
 *
 *   node --experimental-strip-types --no-warnings scripts/journeys/showcase.ts --out <folder> [--port 4391] [--debug-port 4392]
 *
 * Operator work (the phone tier, the approval) is made with the documented routes; everything a seller or a buyer does is the real UI.
 * Test photos are made in the page (canvas to JPEG) and given to the real file input. Exit code is not zero when a step fails.
 */
import { writeFileSync } from 'node:fs';
import { crc32, deflateSync } from 'node:zlib';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { Browser, sleep } from './cdp.ts';
import { startLab } from './lab.ts';
import { Journey, arg, desktop, dismiss, gameShown, layoutProbe, must, pageCall, phone, playNow, realErrors, sessionId, syncClock, text, visible } from './kit.ts';

const port = Number(arg('port', '4391')), debugPort = Number(arg('debug-port', '4392'));
const lab = await startLab(port);
const S = await Browser.launch(debugPort);          // the seller
const B = await Browser.second(debugPort, S);       // the adult buyer
const G = await Browser.second(debugPort, S);       // the guest
const j = new Journey(arg('out'), 'showcase');
const HOUR = 3600000;
const CHAT = 'https://wa.me/2348012345678', PAY = 'https://paystack.com/pay/ada-braids-demo', PAY2 = 'https://paystack.com/pay/ada-braids-new', PAY3 = 'https://paystack.com/pay/ada-braids-third';
const ids: Record<string, string> = {};
for (const sig of ['SIGINT', 'SIGTERM'] as const) process.once(sig, () => { try { S.child.kill('SIGKILL'); } catch { /* gone */ } process.exit(130); });

async function openServices(p: Browser): Promise<void> {
  if (await visible(p, '.sc-app')) return;
  if (!(await visible(p, '.ph-appbtn'))) await p.click('[data-nav="phone"]');
  for (let i = 0; i < 3 && !(await visible(p, '.sc-app')); i++) {
    if (await visible(p, '.ph-appbtn', 'Services')) await p.click('.ph-appbtn', 'Services');
    await p.waitFor(`!!document.querySelector('.sc-app')`, 6000, 'the Services app').catch(() => undefined);
  }
  await p.waitFor(`!!document.querySelector('.sc-app')`, 8000, 'the Services app');
}
async function tab(p: Browser, name: string): Promise<void> {
  // the app slides in when it opens: a tap during the slide can miss, so wait for it to settle and check the tab took
  for (let i = 0; i < 4; i++) {
    await sleep(900); await p.click('.sc-tabs [role="tab"]', name); await sleep(500);
    if (await p.eval<boolean>(`[...document.querySelectorAll('.sc-tabs [role="tab"]')].some((t) => t.getAttribute('aria-selected') === 'true' && t.innerText.includes(${JSON.stringify(name)}))`)) return;
  }
}
/** Sets a form control by its label text inside the editor, the way typing would (real key input for text). */
async function fill(p: Browser, label: string, value: string, scope = '.se'): Promise<void> {
  const sel = await p.eval<string>(`(() => { const l = [...document.querySelectorAll(${JSON.stringify(scope)} + ' label')].find((x) => x.childNodes[0] && x.childNodes[0].textContent.trim().startsWith(${JSON.stringify(label)})); if (!l) return ''; const c = l.querySelector('input,textarea,select'); c.setAttribute('data-fill', '1'); return '[data-fill="1"]'; })()`);
  must(sel, `no field labelled "${label}"`);
  await p.type(sel, value);
  await p.eval(`document.querySelector('[data-fill]')?.removeAttribute('data-fill'); true`);
}
const note = (p: Browser): Promise<string> => p.eval<string>(`(document.querySelector('[data-note]') || {}).innerText || ''`);
const statusLine = (p: Browser): Promise<string> => p.eval<string>(`(document.querySelector('[data-status]') || {}).innerText || ''`);
async function clickText(p: Browser, selector: string, label: string): Promise<void> { await p.click(selector, label); }
async function saveShop(p: Browser): Promise<string> {
  const before = await note(p);
  await p.eval(`window.__noteSeen = ''; true`);
  await p.click('.se-form button.is-primary');
  await p.waitFor(`(() => { const n = (document.querySelector('[data-note]') || {}).innerText || ''; return n && n !== ${JSON.stringify(before)} || (n && n === ${JSON.stringify(before)} && false); })()`, 12000, 'a note after Save').catch(() => undefined);
  await sleep(600);
  return note(p);
}
/** A real photo made in the page: a gradient with shapes, as a JPEG file on disk (name given), by seed. */
async function makePhoto(p: Browser, file: string, seed: number): Promise<string> {
  const url = await p.eval<string>(`(() => { const seed = ${seed}; const c = document.createElement('canvas'); c.width = 900; c.height = 700; const x = c.getContext('2d'); const g = x.createLinearGradient(0, 0, 900, 700); g.addColorStop(0, 'hsl(' + (seed * 70 % 360) + ',70%,60%)'); g.addColorStop(1, 'hsl(' + ((seed * 70 + 120) % 360) + ',60%,35%)'); x.fillStyle = g; x.fillRect(0, 0, 900, 700); for (let i = 0; i < 18; i++) { x.fillStyle = 'hsla(' + ((seed * 40 + i * 25) % 360) + ',80%,70%,0.55)'; x.beginPath(); x.arc((i * 137 + seed * 53) % 900, (i * 91 + seed * 31) % 700, 40 + (i * 13) % 90, 0, 7); x.fill(); } x.fillStyle = '#fff'; x.font = 'bold 64px sans-serif'; x.fillText('Braids ' + seed, 60, 120); return c.toDataURL('image/jpeg', 0.82); })()`);
  const path = join(tmpdir(), file);
  writeFileSync(path, Buffer.from(url.split(',')[1]!, 'base64'));
  return path;
}
/** Gives files to the editor's real file input. */
async function giveFiles(p: Browser, files: string[]): Promise<void> {
  const doc = await p.send('DOM.getDocument', { depth: 1 });
  const found = await p.send('DOM.querySelector', { nodeId: doc.root.nodeId, selector: '.pm input[type=file], #se-s-photos input[type=file]' });
  must(found.nodeId, 'no file input in the editor');
  await p.send('DOM.setFileInputFiles', { nodeId: found.nodeId, files });
}
const tmpFiles: string[] = [];
/** A real PNG of random pixels (so it cannot be shrunk below the cap), made without a library. */
function noisePng(w: number, h: number): Buffer {
  const chunk = (type: string, data: Buffer): Buffer => { const len = Buffer.alloc(4); len.writeUInt32BE(data.length); const body = Buffer.concat([Buffer.from(type), data]); const crc = Buffer.alloc(4); crc.writeUInt32BE(crc32(body)); return Buffer.concat([len, body, crc]); };
  const head = Buffer.alloc(13); head.writeUInt32BE(w, 0); head.writeUInt32BE(h, 4); head[8] = 8; head[9] = 2;
  const raw = Buffer.alloc((w * 3 + 1) * h); let seed = 12345;
  for (let i = 0; i < raw.length; i++) { seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0; raw[i] = seed >>> 24; }
  for (let y = 0; y < h; y++) raw[y * (w * 3 + 1)] = 0;
  return Buffer.concat([Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]), chunk('IHDR', head), chunk('IDAT', deflateSync(raw, { level: 0 })), chunk('IEND', Buffer.alloc(0))]);
}


// ---------------------------------------------------------------------------------------------------------------------------------
// the second run (features2): the reworked editor, shop page and directory
// ---------------------------------------------------------------------------------------------------------------------------------
const S2 = await Browser.second(debugPort, S);      // seller two (tech, Bold)
const S3 = await Browser.second(debugPort, S);      // seller three (food, Fresh)
const field = async (p: Browser, name: string, value: string): Promise<void> => { const sel = `#se-f-${name}`; must(await p.eval<boolean>(`!!document.querySelector(${JSON.stringify(sel)})`), `no field "${name}" in the editor`); await p.type(sel, value); };
const pick = (p: Browser, name: string, value: string): Promise<unknown> => p.eval(`(() => { const s = document.querySelector('#se-f-${name}'); s.value = ${JSON.stringify(value)}; s.dispatchEvent(new Event('change', { bubbles: true })); return s.value; })()`);
const formState = (p: Browser): Promise<{ note: string; errors: { id: string; text: string; inView: boolean }[]; focusId: string; focusInside: boolean; focusInView: boolean; summary: string; stale: boolean; staleText: string }> => p.eval(`(() => {
  const ae = document.activeElement, r = ae && ae.getBoundingClientRect && ae.getBoundingClientRect();
  return { note: (document.querySelector('[data-note]') || {}).innerText || '', errors: [...document.querySelectorAll('.se .fr-error, .se .se-day-error')].map((e) => { const b = e.getBoundingClientRect(); return { id: e.id, text: e.innerText.trim(), inView: b.top >= 0 && b.bottom <= innerHeight && b.left >= 0 && b.right <= innerWidth }; }),
    focusId: ae ? (ae.id || ae.tagName) : '', focusInside: !!(ae && ae.closest && ae.closest('.se')), focusInView: !!r && r.top >= 0 && r.bottom <= innerHeight, summary: (document.querySelector('#se-summary') || {}).innerText || '', stale: !!document.querySelector('.se-stale'), staleText: (document.querySelector('.se-stale') || {}).innerText || '' };
})()`);
async function save(p: Browser): Promise<Awaited<ReturnType<typeof formState>>> {
  await p.eval(`document.querySelector('[data-note]') && (document.querySelector('[data-note]').dataset.before = 1); true`);
  await p.click('.se-save button.is-primary');
  await sleep(500);
  await p.waitFor(`!document.querySelector('.se-save .is-loading')`, 15000, 'Save to finish').catch(() => undefined);
  await sleep(500);
  return formState(p);
}
const editorReady = (p: Browser): Promise<unknown> => p.waitFor(`document.querySelector('[data-showcase-editor]') && !document.querySelector('[data-showcase-editor]').innerText.includes('Loading')`, 20000, 'the editor');
const photoIds = (p: Browser): Promise<string[]> => p.eval(`[...document.querySelectorAll('.pm-item[data-photo]')].map((x) => x.dataset.photo)`);
async function addPhotos(p: Browser, seeds: number[], tag: string): Promise<void> {
  for (const seed of seeds) {
    const have = (await photoIds(p)).length;
    const f = await makePhoto(p, `${tag}-${seed}.jpg`, seed); tmpFiles.push(f);
    await giveFiles(p, [f]); await p.waitFor(`document.querySelectorAll('.pm-item[data-photo]').length >= ${have + 1}`, 30000, `photo ${seed} of ${tag}`);
  }
}
async function openShop(p: Browser, name: string): Promise<void> {
  if (await visible(p, '.sp-back')) { await p.click('.sp-back'); await sleep(700); }
  await p.waitFor(`document.querySelectorAll('.sc-hit').length >= 1`, 20000, 'the directory');
  await p.click('.sc-hit', name);
  await p.waitFor(`!!document.querySelector('.sp .shf-about')`, 20000, 'the shop page');
  await p.waitFor(`[...document.querySelectorAll('.pg img')].every((i) => i.complete && i.naturalWidth > 0)`, 20000, 'the shop photos').catch(() => undefined);
  await sleep(300);
}
/** One page's clock (Date only) set so that Lagos reads `hh`:00 within the next 24 hours of lab time. */
async function lagosHour(p: Browser, hh: number): Promise<{ lagosDay: number; hour: number }> {
  const nowLab = Date.now() + lab.offset(); const d = new Date(nowLab);
  let t = Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate(), hh - 1, 0);
  if (t < nowLab - 12 * HOUR) t += 24 * HOUR; if (t > nowLab + 12 * HOUR) t -= 24 * HOUR;
  await syncClock(p, t - Date.now());
  return { lagosDay: (new Date(t + HOUR).getUTCDay() + 6) % 7, hour: hh };
}
async function buildShop(p: Browser, email: string, owner: string, spec: { name: string; sign: string; category: string; template: string; about: string; service: string; price: string; seeds: number[] }): Promise<string> {
  await lab.signIn(p, email); await p.goto(lab.base + '/'); await gameShown(p); await dismiss(p); await syncClock(p, lab.offset());
  const sid = await sessionId(p);
  const tier = await lab.admin(`/api/admin/trust/players/${sid}/act`, { clientId: `${lab.now()}:${crypto.randomUUID()}`, action: 'verify', tier: 'phone', reason: 'journey: met in person' });
  must(tier['ok'] === true, `tier for ${owner}`);
  await openServices(p); for (let i = 0; i < 3 && !(await visible(p, '[data-showcase-editor]')); i++) { await tab(p, 'My shop'); await sleep(1200); } await editorReady(p);
  await p.click('.se-block button', 'I am 18'); await p.waitFor(`!document.querySelector('.se-block')`, 10000, 'adult answer');
  await p.click('.se-choices[aria-label="Style"] label', spec.template);
  await field(p, 'name', spec.name); await field(p, 'sign', spec.sign); await pick(p, 'category', spec.category); await field(p, 'about', spec.about);
  await field(p, 'service-0-label', spec.service); await field(p, 'service-0-price', spec.price); await field(p, 'chat', CHAT);
  const s = await save(p); must(/Saved/.test(s.note), `${owner}: save said "${s.note}" ${JSON.stringify(s.errors)}`);
  await addPhotos(p, spec.seeds, owner.replace(/\W/g, ''));
  await p.click('.se-actions button', 'Send for review'); await p.waitFor(`/review/i.test((document.querySelector('[data-status]')||{}).innerText||'')`, 15000, 'waiting banner');
  return sid;
}
const setWide = async (p: Browser, on: boolean): Promise<boolean> => { const is = await p.eval<boolean>(`!!document.querySelector('.ph.is-wide')`); if (is !== on) { const shown = await visible(p, '.ph-wide'); if (shown) { await p.click('.ph-wide').catch(() => undefined); await sleep(700); } if ((await p.eval<boolean>(`!!document.querySelector('.ph.is-wide')`)) !== on && shown) { await p.eval(`document.querySelector('.ph-wide').click(); true`); await sleep(700); } } return p.eval<boolean>(`!!document.querySelector('.ph.is-wide')`); };
const approveAll = async (): Promise<number> => { const q = await lab.mod('/api/mod/showcase'); let n = 0; for (const s of (q['queue'] ?? [])) { await lab.mod('/api/mod/showcase', { action: 'approve', shop: s.id }); n++; } return n; };
const widthProbe = (p: Browser, sel: string): Promise<{ n: number; overflowing: string[]; maxRight: number; vw: number }> => p.eval(`(() => { const vw = document.documentElement.clientWidth; const els = [...document.querySelectorAll(${JSON.stringify(sel)} + ', ' + ${JSON.stringify(sel)} + ' *')].filter((e) => { const r = e.getBoundingClientRect(); return r.width > 0 && r.height > 0; }); const inScroller = (e) => { for (let n = e.parentElement; n && n !== document.body; n = n.parentElement) { const o = getComputedStyle(n).overflowX; if ((o === 'auto' || o === 'scroll') && n.scrollWidth > n.clientWidth + 1) return true; } return false; }; const bad = els.filter((e) => (e.getBoundingClientRect().right > vw + 0.5 || e.getBoundingClientRect().left < -0.5) && !inScroller(e)); return { n: els.length, overflowing: bad.slice(0, 6).map((e) => e.tagName + '.' + String(e.className).slice(0, 30) + ' ' + Math.round(e.getBoundingClientRect().left) + '-' + Math.round(e.getBoundingClientRect().right)), maxRight: Math.round(Math.max(0, ...els.map((e) => e.getBoundingClientRect().right))), vw }; })()`);

try {
  await desktop(S); await desktop(B); await desktop(G); await desktop(S2); await desktop(S3);

  await j.run('0', 'Setup: three sellers, a buyer and a guest (stand-in sign-in), 25 h pass, operator sets the phone tier of seller one', [S, B], async (detail) => {
    for (const [p, n] of [[S, 'Ada Braids'], [B, 'Buyer Bola'], [G, 'Guest Gbenga'], [S2, 'Tunde Tech'], [S3, 'Chidi Kitchen']] as [Browser, string][]) await playNow(p, lab.base, n);
    ids['seller'] = await sessionId(S); ids['buyer'] = await sessionId(B);
    await lab.signIn(S, 'seller@example.test'); await lab.signIn(B, 'buyer@example.test'); await lab.signIn(S2, 'seller2@example.test'); await lab.signIn(S3, 'seller3@example.test');
    for (const p of [S, B, S2, S3]) { await p.goto(lab.base + '/'); await gameShown(p); await dismiss(p); }
    ids['seller'] = await sessionId(S); ids['buyer'] = await sessionId(B);
    lab.advance(25 * HOUR);
    for (const p of [S, B, G, S2, S3]) await syncClock(p, lab.offset());
    const tier = await lab.admin(`/api/admin/trust/players/${ids['seller']}/act`, { clientId: `${lab.now()}:${crypto.randomUUID()}`, action: 'verify', tier: 'phone', reason: 'journey: met in person' });
    detail['tier'] = { status: tier.status, ok: tier['ok'] };
    must(tier['ok'] === true, `the phone tier was not set: ${JSON.stringify(tier).slice(0, 200)}`);
  });

  await j.run('1', 'Directory empty state (no shops yet) and the loading state; Services icon on the phone home screen; seller sees the adult question first', [S, B], async (detail) => {
    // loading state: a throttled page, the directory's skeleton caught while it fetches
    await phone(B, 390, 844); await B.goto(lab.base + '/'); await gameShown(B); await dismiss(B);
    await B.click('[data-nav="phone"]'); await B.waitFor(`!!document.querySelector('.ph-appbtn')`, 10000, 'the phone home');
    detail['homeIcon'] = await B.eval<unknown>(`(() => { const b = [...document.querySelectorAll('.ph-appbtn')].find((x) => /Services/.test(x.innerText)); if (!b) return null; const r = b.getBoundingClientRect(), ic = b.querySelector('svg, img, .ph-ico, [class*=icon]'); const i = ic && ic.getBoundingClientRect(); return { label: b.innerText.trim(), w: Math.round(r.width), h: Math.round(r.height), iconBox: i ? [Math.round(i.width), Math.round(i.height)] : null, iconTag: ic ? ic.tagName : null }; })()`);
    await j.shot(B, 'phone-home-services-icon');
    await B.eval(`window.__sawLoading = false; new MutationObserver(() => { if (document.querySelector('[aria-label="Loading shops"]')) window.__sawLoading = true; }).observe(document.body, { childList: true, subtree: true }); true`);
    await B.click('.ph-appbtn', 'Services');
    const loadingShot = await B.waitFor(`!!document.querySelector('[aria-label="Loading shops"]')`, 4000, 'the loading skeleton').then(() => true, () => false);
    if (loadingShot) await j.shot(B, 'directory-loading');
    await B.waitFor(`!!document.querySelector('.sc-app')`, 15000, 'Services');
    await sleep(2500);
    detail['sawLoading'] = (await B.eval<boolean>(`window.__sawLoading`)) || loadingShot;
    detail['emptyText'] = (await text(B, '.sc-app')).replace(/\s+/g, ' ').slice(0, 500);
    await j.shot(B, 'directory-no-shops');
    detail['emptyButton'] = await visible(B, '.sc-app button', 'Open My shop');
    await B.eval(`true`); await desktop(B);
    await B.goto(lab.base + '/'); await gameShown(B); await dismiss(B);
    must(/Services/.test(String((detail['homeIcon'] as any)?.label ?? '')), 'no Services icon on the phone home screen');
    must(/No shops here yet/i.test(String(detail['emptyText'])) && detail['emptyButton'], 'the no-shops empty state is missing its title or its button');
    must(detail['sawLoading'], 'the loading skeleton was never seen (it may be too quick; see the screenshot list)');
    await openServices(S); await tab(S, 'My shop'); await editorReady(S);
    detail['blockedText'] = (await text(S, '.se-block')).replace(/\s+/g, ' ');
    await j.shot(S, 'my-shop-blocked');
    must(/18|adult/i.test(String(detail['blockedText'])), 'no adult question shown');
    await S.click('.se-block button', 'I am 18'); await S.waitFor(`!document.querySelector('.se-block')`, 10000, 'the block to clear');
  });

  await j.run('2', 'Editor: six steps with a jump bar; template, colours and logo change the preview', [S], async (detail) => {
    const steps = await S.eval<string[]>(`[...document.querySelectorAll('.se-steps button')].map((x) => x.innerText.replace(/\\s+/g, ' ').trim())`);
    detail['steps'] = steps; must(steps.length === 6, `${steps.length} steps in the jump bar`);
    const jumps: Record<string, number> = {};
    for (const [at, name] of steps.entries()) { await S.click('.se-steps button', name.replace(/^\d+\s*/, '')); await sleep(1800); const ids6 = ['look', 'about', 'services', 'hours', 'photos', 'contact']; jumps[name] = await S.eval<number>(`Math.round(document.querySelector('#se-s-${ids6[at]}').getBoundingClientRect().top)`); }
    detail['sectionTopAfterJump'] = jumps;
    await S.click('.se-steps button', steps[0]!.replace(/^\d+\s*/, '')); await sleep(400);
    const sf = () => S.eval<{ bg: string; text: string; layout: string }>(`(() => { const c = document.querySelector('.se [data-storefront]'); return { bg: c.style.getPropertyValue('--sf-bg'), text: c.innerText.replace(/\\s+/g, ' '), layout: c.className }; })()`);
    const first = await sf();
    await S.click('.se-choices[aria-label="Style"] label', 'Bold'); const bold = await sf(); await j.shot(S, 'template-bold');
    await S.click('.se-choices[aria-label="Style"] label', 'Night'); const night = await sf();
    await S.click('.se-choices[aria-label="Style"] label', 'Fresh'); const fresh = await sf();
    await S.click('.se-choices[aria-label="Style"] label', 'Classic');
    await S.click('.se-choices[aria-label="Logo"] label[title="Scissors"]');
    detail['previews'] = { first, bold, night, fresh };
    must(first.bg !== bold.bg && bold.bg !== night.bg && night.bg !== fresh.bg, 'the colours did not change with the template');
    must(first.layout !== bold.layout, 'the layout class did not change with the template');
    must(/✂/.test((await sf()).text), 'the chosen logo is not on the preview');
    await S.eval(`(() => { const i = document.querySelectorAll('.se-colours input[type=color]')[0]; i.value = '#aa3300'; i.dispatchEvent(new Event('input', { bubbles: true })); return true; })()`);
    must((await sf()).bg === '#aa3300', 'the sign colour did not change the preview');
    must(Object.values(jumps).every((t) => t < 400), `a jump left its section far from the top: ${JSON.stringify(jumps)}`);
  });

  await j.run('3', 'Editor: fill sign, about, two services, hours, chat and pay links; save', [S], async (detail) => {
    await field(S, 'name', 'Ada Braids'); await field(S, 'sign', 'Braids by Ada');
    await field(S, 'about', 'Neat knotless braids and natural hair care since 2019. Come to the market and ask for the Ada stall.');
    await field(S, 'service-0-label', 'Knotless braids'); await field(S, 'service-0-price', '25000'); await field(S, 'service-0-note', 'About four hours');
    await S.click('button', 'Add a service');
    await S.waitFor(`!!document.querySelector('#se-f-service-1-label')`, 5000, 'the second service');
    await field(S, 'service-1-label', 'Wash and set'); await field(S, 'service-1-price', '6000');
    await field(S, 'chat', CHAT); await field(S, 'pay', PAY);
    await S.eval(`document.querySelector('#se-s-look').scrollIntoView(); true`); await j.shot(S, 'form-filled-top');
    const s = await save(S); detail['afterSave'] = { note: s.note, errors: s.errors };
    detail['status'] = await statusLine(S);
    must(/Saved/.test(s.note), `no confirmation after Save: ${s.note} ${JSON.stringify(s.errors)}`);
    await S.eval(`document.querySelector('#se-s-contact').scrollIntoView({ block: 'end' }); true`); await j.shot(S, 'after-save');
  });

  await j.run('4', 'Refusals beside the field: phone number and web link in the text, bad pay host, empty name; focus moves to the first problem; summary by Save', [S], async (detail) => {
    const out: Record<string, unknown> = {};
    const about = await S.eval<string>(`document.querySelector('#se-f-about').value`);
    const refuse = async (key: string, shot: string, setup: () => Promise<void>, want: string): Promise<void> => {
      await setup(); const s = await save(S);
      out[key] = { errors: s.errors, focusId: s.focusId, focusInView: s.focusInView, summary: s.summary.replace(/\s+/g, ' '), note: s.note };
      await j.shot(S, shot);
      must(s.errors.some((e) => e.id === `se-e-${want}`), `${key}: no refusal beside the "${want}" field (${JSON.stringify(s.errors)})`);
      must(s.focusId === `se-f-${want}`, `${key}: focus is on "${s.focusId}", not the "${want}" field`);
      must(s.summary.length > 0, `${key}: no summary by Save`);
    };
    await refuse('phoneInAbout', 'refuse-phone', () => field(S, 'about', 'Call me on 0801 234 5678 for braids at the market.'), 'about');
    await refuse('linkInAbout', 'refuse-link', () => field(S, 'about', 'See my work at www.adabraids.com and book there.'), 'about');
    await field(S, 'about', about);
    await refuse('badPayHost', 'refuse-pay-host', () => field(S, 'pay', 'https://evil-pay.example.com/ada'), 'pay');
    await field(S, 'pay', PAY);
    await refuse('emptyName', 'refuse-empty-name', () => field(S, 'name', ''), 'name');
    await field(S, 'name', 'Ada Braids');
    const ok = await save(S); out['saveGood'] = ok.note; must(/Saved/.test(ok.note) && ok.errors.length === 0 && ok.summary === '', `a valid Save still shows problems: ${ok.note} ${JSON.stringify(ok.errors)}`);
    detail['refusals'] = out;
  });

  await j.run('5', 'Photos: styled picker, upload five, fewer than 3 cannot be sent, unusable files refused', [S], async (detail) => {
    await S.eval(`document.querySelector('#se-s-photos').scrollIntoView(); true`);
    detail['pickerBefore'] = (await text(S, '#se-s-photos')).replace(/\s+/g, ' ').slice(0, 300);
    await j.shot(S, 'photos-empty');
    detail['pickerStyled'] = await S.eval<unknown>(`(() => { const i = document.querySelector('.pm input[type=file], #se-s-photos input[type=file]'); const l = i && (i.closest('label') || document.querySelector('label[for="' + i.id + '"]')); const b = l || [...document.querySelectorAll('#se-s-photos button')].find((x) => /photo|add|choose/i.test(x.innerText)); const r = b && b.getBoundingClientRect(); return { inputHidden: !!i && (getComputedStyle(i).display === 'none' || i.getBoundingClientRect().width < 2 || getComputedStyle(i).opacity === '0' || i.classList.contains('sr-only') || getComputedStyle(i).position === 'absolute'), pickerText: b ? b.innerText.trim() : null, pickerBox: r ? [Math.round(r.width), Math.round(r.height)] : null, accept: i && i.accept, multiple: i && i.multiple }; })()`);
    await addPhotos(S, [1, 2], 'a');
    detail['sendWith2'] = await visible(S, '.se-actions button', 'Send for review');
    const direct = await pageCall(S, '/api/showcase/mine/submit', { clientId: `${lab.now()}:${crypto.randomUUID()}` });
    detail['directSubmitWith2'] = { status: direct.status, body: direct.body };
    await j.shot(S, 'two-photos');
    const txt = join(tmpdir(), 'not-a-photo.txt'); writeFileSync(txt, 'hello'); tmpFiles.push(txt);
    await giveFiles(S, [txt]); await S.waitFor(`!!document.querySelector('.pm-error')`, 8000, 'the refusal of a text file').catch(() => undefined);
    detail['textFile'] = await S.eval<string>(`(document.querySelector('.pm-error') || {}).innerText || ''`); await j.shot(S, 'text-file-refused');
    await S.eval(`document.querySelectorAll('.pm-item.is-failed button').forEach((b) => b.click()); true`);
    const beforeIds = await photoIds(S), before5 = beforeIds.length;
    const big = join(tmpdir(), 'huge-noise.png'); const png = noisePng(1800, 1800); writeFileSync(big, png); tmpFiles.push(big);
    await giveFiles(S, [big]); await sleep(1500);
    await S.waitFor(`!document.querySelector('.pm-item.is-pending:not(.is-failed)')`, 60000, 'the huge picture to be handled').catch(() => undefined);
    detail['hugePicture'] = { error: await S.eval<string>(`(document.querySelector('.pm-error') || {}).innerText || ''`), photos: (await photoIds(S)).length };
    await j.shot(S, 'huge-photo');
    await S.eval(`document.querySelectorAll('.pm-item.is-failed button').forEach((b) => b.click()); true`);
    const kept = await photoIds(S); detail['hugeKept'] = kept.length > before5 ? kept.find((x) => !beforeIds.includes(x)) : null;
    if (detail['hugeKept']) { await S.click(`.pm-item[data-photo="${detail['hugeKept']}"] button[aria-label^="Remove photo"]`); await sleep(1500); }
    const over = await pageCall(S, '/api/showcase/mine/photos', { clientId: `${lab.now()}:${crypto.randomUUID()}`, type: 'image/jpeg', data: 'A'.repeat(300000) });
    detail['serverOversize'] = { status: over.status, body: over.body };
    await addPhotos(S, [3, 4, 5], 'b');
    detail['photos'] = (await photoIds(S)).length;
    must(detail['sendWith2'] === false, 'Send for review is offered with 2 photos');
    must(String(detail['textFile']).length > 0, 'a text file was not refused where the photos are');
  });

  await j.run('6', 'Photos: icon tools with accessible names, Cover, Earlier, Later; a caption with a phone number is refused ON that photo with focus there; Remove', [S], async (detail) => {
    const ids0 = await photoIds(S); detail['order0'] = ids0;
    const q = (id: string, what: string): string => `.pm-item[data-photo="${id}"] ${what}`;
    await S.eval(`document.querySelector('#se-s-photos').scrollIntoView(); true`);
    detail['tools'] = await S.eval<any[]>(`[...document.querySelectorAll('.pm-tool')].map((b) => ({ name: b.getAttribute('aria-label') || '', text: b.innerText.trim(), icon: !!b.querySelector('svg, img, [class*=icon]'), w: Math.round(b.getBoundingClientRect().width), h: Math.round(b.getBoundingClientRect().height) }))`);
    await S.click(q(ids0[2]!, 'button[aria-label$="the cover"]')); await S.waitFor(`document.querySelector('.pm-item[data-photo]').dataset.photo === ${JSON.stringify(ids0[2])}`, 10000, 'the cover to change');
    const ids1 = await photoIds(S); detail['afterCover'] = ids1; await j.shot(S, 'photos-after-cover');
    await S.click(q(ids1[1]!, 'button[title="Earlier"]')); await S.waitFor(`document.querySelector('.pm-item[data-photo]').dataset.photo === ${JSON.stringify(ids1[1])}`, 10000, 'Earlier');
    const ids2 = await photoIds(S); detail['afterEarlier'] = ids2;
    await S.click(q(ids2[0]!, 'button[title="Later"]')); await S.waitFor(`document.querySelector('.pm-item[data-photo]').dataset.photo !== ${JSON.stringify(ids2[0])}`, 10000, 'Later');
    const ids3 = await photoIds(S); detail['afterLater'] = ids3;
    const id = ids3[0]!, cap = q(id, '.pm-capin');
    await S.type(cap, 'Call 0801 234 5678 to book'); await S.press('Tab', 'Tab', 9); await sleep(1500);
    detail['phoneCaption'] = await S.eval<unknown>(`(() => { const e = document.querySelector(${JSON.stringify(q(id, '.pm-error'))}); const r = e && e.getBoundingClientRect(); const ae = document.activeElement; return { errorOnCard: e ? e.innerText : null, errorInView: !!r && r.top >= 0 && r.bottom <= innerHeight, focusId: ae ? ae.id : '', expectedFocus: 'se-cap-' + ${JSON.stringify(id)}, invalid: document.querySelector(${JSON.stringify(cap)}).getAttribute('aria-invalid') }; })()`);
    detail['serverCaptionsAfterPhone'] = await S.eval<string>(`(async () => { const r = await fetch('/api/showcase/mine').then((x) => x.json()); return JSON.stringify((r.shop?.photos || r.mine?.shop?.photos || []).map((p) => p.caption || '')); })()`);
    await j.shot(S, 'caption-phone-refused-on-card');
    await S.type(cap, 'Knotless braids, medium'); await S.press('Tab', 'Tab', 9); await sleep(1500);
    detail['goodCaption'] = { errorGone: !(await visible(S, q(id, '.pm-error'))), serverCaptions: await S.eval<string>(`(async () => { const r = await fetch('/api/showcase/mine').then((x) => x.json()); return JSON.stringify((r.shop?.photos || r.mine?.shop?.photos || []).map((p) => p.caption || '')); })()`) };
    const last = ids3.at(-1)!; await S.click(q(last, 'button[aria-label^="Remove photo"]')); await sleep(1500);
    detail['afterRemove'] = (await photoIds(S)).length; await j.shot(S, 'photos-after-remove');
    await addPhotos(S, [6], 'c'); detail['coverId'] = (await photoIds(S))[0];
    const pc = detail['phoneCaption'] as any;
    must((detail['tools'] as any[]).length > 0 && (detail['tools'] as any[]).every((t) => t.name.length > 3), `a photo tool has no accessible name: ${JSON.stringify(detail['tools']).slice(0, 300)}`);
    must(ids1[0] === ids0[2] && ids2[0] === ids1[1] && ids3[0] !== ids2[0], 'Cover / Earlier / Later did not reorder');
    must(pc.errorOnCard && /phone/i.test(pc.errorOnCard) && pc.errorInView, `the caption refusal is not on the photo's card: ${JSON.stringify(pc)}`);
    must(pc.focusId === pc.expectedFocus, `focus is on "${pc.focusId}", not on the caption of that photo`);
    must(!/0801 234 5678/.test(String(detail['serverCaptionsAfterPhone'])) && (detail['goodCaption'] as any).errorGone, 'a refused caption was kept, or the error stayed after a good caption');
    must(detail['afterRemove'] === ids3.length - 1, 'Remove did not remove');
  });
  await j.run('7', 'Send for review; the banner says it is waiting; the editor stays usable', [S], async (detail) => {
    await S.click('.se-actions button', 'Send for review');
    await S.waitFor(`/review/i.test((document.querySelector('[data-status]')||{}).innerText||'')`, 15000, 'the waiting banner');
    detail['status'] = await statusLine(S); detail['note'] = await note(S);
    await S.eval(`document.querySelector('[data-showcase-editor]').scrollIntoView(); true`); await j.shot(S, 'waiting-top');
  });

  await j.run('8', 'Operator approves while the editor is open; Save afterwards gives no "changed somewhere else" refusal', [S], async (detail) => {
    const queue = await lab.mod('/api/mod/showcase');
    const shop = (queue['queue'] ?? queue['shops'] ?? [])[0]; must(shop?.id, 'the shop is not in the operator queue');
    ids['shop'] = shop.id;
    const approved = await lab.mod('/api/mod/showcase', { action: 'approve', shop: shop.id }); detail['approve'] = approved;
    must(approved.status === 'live' || approved['ok'] === true, `approve answered ${JSON.stringify(approved).slice(0, 160)}`);
    // the editor has been open since before the approval: change the about text a little (not a name or link) and Save
    await field(S, 'about', 'Neat knotless braids and natural hair care since 2019. Come to the market and ask for the Ada stall. Walk-ins welcome.');
    const s = await save(S); detail['afterApprovalSave'] = { note: s.note, stale: s.stale, staleText: s.staleText, errors: s.errors, status: await statusLine(S) };
    await j.shot(S, 'stale-editor-save');
    must(!s.stale && /Saved/.test(s.note), `Save after the operator approval: stale=${s.stale} note="${s.note}" errors=${JSON.stringify(s.errors)}`);
  });

  await j.run('9', 'A genuine conflict in a second tab: the banner quotes the other change; "Load the latest, keep mine" and "Use the other version" each do what they say', [S], async (detail) => {
    const created = await (await fetch(`http://127.0.0.1:${debugPort}/json/new?about:blank`, { method: 'PUT' })).json() as { id: string };
    const T = await Browser.attach(debugPort, S.child, S.profile, created.id); T.shared = true;
    const openEditor = async (): Promise<void> => { try { await T.send('Page.bringToFront'); await T.goto(lab.base + '/'); await gameShown(T); await dismiss(T); await openServices(T); await sleep(1200); await tab(T, 'My shop'); await editorReady(T); } catch (e) { await j.shot(T, 'second-tab-failure').catch(() => undefined); detail['secondTabText'] = (await text(T).catch(() => '')).replace(/\s+/g, ' ').slice(0, 300); throw e; } };
    try {
      await desktop(T); await syncClock(T, lab.offset());
      await field(S, 'about', 'First tab says something different about the shop.');   // unsaved, made before the second tab saves
      await openEditor();
      await field(T, 'about', 'Second tab says: knotless braids, twists and care. Ask for Ada.');
      const t2 = await save(T); must(/Saved/.test(t2.note), `the second tab could not save: ${t2.note}`); await j.shot(T, 'conflict-second-tab');
      await S.send('Page.bringToFront'); await sleep(800);
      const s1 = await save(S);
      detail['banner1'] = { note: s1.note, stale: s1.stale, text: s1.staleText.replace(/\s+/g, ' '), buttons: await S.eval<string[]>(`[...document.querySelectorAll('.se-stale button')].map((b) => b.innerText.trim())`) };
      await S.eval(`document.querySelector('.se-stale')?.scrollIntoView({ block: 'center' }); true`); await j.shot(S, 'conflict-banner');
      must(s1.stale && /Second tab says/.test(s1.staleText), `the banner does not quote the other change: ${JSON.stringify(detail['banner1'])}`);
      await S.click('.se-stale button', 'keep mine'); await sleep(1200);
      const k = await formState(S); detail['afterKeepMine'] = { aboutNow: await S.eval<string>(`document.querySelector('#se-f-about').value`), staleGone: !k.stale, note: k.note };
      must(!k.stale && /First tab says/.test(String((detail['afterKeepMine'] as any).aboutNow)), `"Load the latest, keep mine" did not keep mine / clear the banner: ${JSON.stringify(detail['afterKeepMine'])}`);
      const k2 = await save(S); must(/Saved/.test(k2.note) && !k2.stale, `Save after keep mine: ${k2.note}`);
      // round two: the other tab changes it again (fresh), this tab has an unsaved edit; "Use the other version" takes theirs
      await field(S, 'about', 'First tab again, a different line.');   // unsaved edit first, then the other tab saves
      await openEditor(); await field(T, 'about', 'Second tab again: twists, locs and care. Ask for Ada.'); const t3 = await save(T); must(/Saved/.test(t3.note), 'second tab round two');
      await S.send('Page.bringToFront'); await sleep(500);
      const s3 = await save(S); must(s3.stale, 'no conflict banner in round two');
      await S.click('.se-stale button', 'other version'); await sleep(1200);
      const o = await formState(S); detail['afterUseOther'] = { aboutNow: await S.eval<string>(`document.querySelector('#se-f-about').value`), staleGone: !o.stale, note: o.note };
      await j.shot(S, 'conflict-after-use-other');
      must(!o.stale && /Second tab again/.test(String((detail['afterUseOther'] as any).aboutNow)), `"Use the other version" did not take the other text: ${JSON.stringify(detail['afterUseOther'])}`);
    } finally { T.close(); try { await fetch(`http://127.0.0.1:${debugPort}/json/close/${created.id}`); } catch { /* closed */ } }
  });
  await j.run('10', 'Two more shops (Tunde Tech: Bold, tech; Chidi Kitchen: Fresh, food) made through the real editor and approved', [S2, S3], async (detail) => {
    ids['s2'] = await buildShop(S2, 'seller2@example.test', 'Tunde Tech', { name: 'Tunde Tech Fix', sign: 'Phones fixed fast', category: 'tech', template: 'Bold', about: 'Screen swaps, batteries and unlocking for every common phone. Honest quotes before any work starts.', service: 'Screen replacement', price: '18000', seeds: [11, 12, 13] });
    ids['s3'] = await buildShop(S3, 'seller3@example.test', 'Chidi Kitchen', { name: 'Chidi Kitchen', sign: 'Jollof and small chops', category: 'food', template: 'Fresh', about: 'Party jollof, small chops and puff puff for events of every size. Order two days ahead.', service: 'Party jollof tray', price: '35000', seeds: [21, 22, 23] });
    detail['approved'] = await approveAll();
    const dir = await lab.call('/api/showcase/directory'); detail['directoryCount'] = (dir['shops'] ?? []).length;
    must(detail['directoryCount'] === 3, `${detail['directoryCount']} shops live`);
  });

  await j.run('11', 'Buyer directory: three shopfront cards (Classic salon, Bold tech, Fresh food); cover on the card; filters, search, the "no matches" state with a clear button', [B], async (detail) => {
    await B.goto(lab.base + '/'); await gameShown(B); await dismiss(B); await openServices(B); await sleep(800);
    if (await visible(B, '.sp-back')) { detail['restoredOnShopPage'] = true; await B.click('.sp-back'); }
    await B.waitFor(`document.querySelectorAll('.sc-hit').length >= 3`, 20000, 'three shops in the directory');
    await B.eval(`document.querySelectorAll('.sc-hit').forEach((c) => c.scrollIntoView({ block: 'center' })); true`); await sleep(1500); await B.eval(`document.querySelectorAll('.sc-hit')[0].scrollIntoView({ block: 'start' }); true`); await sleep(500); await j.shot(B, 'directory-three');
    detail['cards'] = await B.eval<unknown>(`[...document.querySelectorAll('.sc-hit')].map((c) => { const sf = c.querySelector('[data-storefront]'), img = c.querySelector('.sf-cover'); return { text: c.innerText.replace(/\\s+/g, ' ').slice(0, 140), layout: sf.className, bg: sf.style.getPropertyValue('--sf-bg'), cover: img ? img.getAttribute('src') : null, coverLoaded: img ? img.complete && img.naturalWidth > 0 : null }; })`);
    const ada = await lab.call('/api/showcase/mine', undefined, lab.founder).catch(() => null);
    detail['coverOfAda'] = (await S.eval<string>(`(async () => { const r = await fetch('/api/showcase/mine').then((x) => x.json()); const p = (r.shop || (r.mine && r.mine.shop) || {}).photos || []; return p[0] ? p[0].id : ''; })()`));
    const setSel = async (label: string, value: string) => { await B.eval(`(() => { const s = [...document.querySelectorAll('.sc-filters label')].find((l) => l.innerText.startsWith(${JSON.stringify(label)})).querySelector('select'); s.value = ${JSON.stringify(value)}; s.dispatchEvent(new Event('change', { bubbles: true })); })()`); await sleep(1000); };
    const count = (): Promise<number> => B.eval<number>(`document.querySelectorAll('.sc-hit').length`);
    await setSel('Kind', 'tech'); detail['techCount'] = await count(); await j.shot(B, 'filter-tech');
    await setSel('Kind', 'salon'); detail['salonCount'] = await count();
    await setSel('Kind', 'food'); detail['foodCount'] = await count();
    await setSel('Kind', ''); await setSel('Where', 'here'); detail['hereCount'] = await count();
    await B.type('.sc-filters input[type=search]', 'braids'); await B.click('.sc-filters button', 'Search'); await sleep(1000); detail['searchHit'] = await count();
    await B.type('.sc-filters input[type=search]', 'plumber'); await B.click('.sc-filters button', 'Search'); await sleep(1000); detail['searchMiss'] = await count();
    detail['noMatchText'] = (await text(B, '.sc-app')).replace(/\s+/g, ' ').slice(-220);
    await j.shot(B, 'no-matches-with-clear');
    detail['clearButton'] = await visible(B, '.sc-app button', 'Clear the search');
    if (detail['clearButton']) { await B.click('.sc-app button', 'Clear the search'); await sleep(1200); detail['afterClear'] = await count(); }
    const layouts = new Set((detail['cards'] as any[]).map((c) => c.layout.replace(/\s*is-(header|card|small)\b/g, '')));
    must(detail['techCount'] === 1 && detail['salonCount'] === 1 && detail['foodCount'] === 1 && detail['hereCount'] === 3 && detail['searchHit'] === 1 && detail['searchMiss'] === 0, `filters/search: ${JSON.stringify(detail)}`);
    must(detail['clearButton'] && detail['afterClear'] === 3, 'the "no matches" state has no working clear button');
    must((detail['cards'] as any[]).length === 3 && new Set((detail['cards'] as any[]).map((c) => c.bg)).size === 3, 'the three cards do not look different (colours)');
    must((detail['cards'] as any[]).every((c) => c.cover && c.coverLoaded), 'a card has no loaded cover photo');
    must(String((detail['cards'] as any[]).find((c) => /Ada Braids/.test(c.text))?.cover ?? '').includes(String(detail['coverOfAda'])), 'the directory card of Ada does not show her cover photo');
  });

  await j.run('12', 'Services here: from a market venue (the buyer travels to the market, opens the venue, taps "Services here")', [B], async (detail) => {
    const lagosH = new Date(lab.now() + HOUR).getUTCHours(); if (lagosH < 7 || lagosH > 18) { lab.advance(((12 - lagosH + 24) % 24) * HOUR); await syncClock(B, lab.offset()); await syncClock(G, lab.offset()); await syncClock(S, lab.offset()); }
    const send = (action: object) => pageCall(B, '/api/action', { actionId: `${lab.now()}:${crypto.randomUUID()}`, cityId: 'lagos', ...action });
    await B.press('Escape', 'Escape', 27); await B.goto(lab.base + '/'); await gameShown(B); await dismiss(B);
    const fund = await lab.admin(`/api/admin/players/${ids['buyer']}/act`, { clientId: `${lab.now()}:${crypto.randomUUID()}`, action: 'credit', amount: 5000, reason: 'journey' }).catch((e) => ({ error: String(e) }));
    detail['fund'] = { status: fund.status };
    const trip = await send({ type: 'travel', id: 'market', mode: 'okada' }); detail['travel'] = { status: trip.status, code: trip.body?.code, reason: trip.body?.reason };
    lab.advance(3 * HOUR); await syncClock(B, lab.offset()); await syncClock(G, lab.offset());
    await B.goto(lab.base + '/'); await gameShown(B); await dismiss(B);
    detail['location'] = (await pageCall(B, '/api/life?city=lagos')).body?.state?.location ?? null;
    for (let i = 0; i < 4 && (await visible(B, '.ph-appbtn, .sc-app, .ph')); i++) { await B.press('Escape', 'Escape', 27); await sleep(700); }
    await B.waitFor(`!!document.querySelector('[data-nav="venue"], [data-nav="place"], .hud-place')`, 8000, 'a venue entry in the HUD').catch(() => undefined);
    detail['navs'] = await B.eval<string[]>(`[...document.querySelectorAll('[data-nav]')].map((x) => x.getAttribute('data-nav'))`);
    await j.shot(B, 'at-market');
    for (const nav of ['venue', 'place']) { if (!(await visible(B, '[data-services]')) && await visible(B, `[data-nav="${nav}"]`)) { await B.click(`[data-nav="${nav}"]`); await sleep(800); } }
    detail['servicesButton'] = await visible(B, '[data-services]');
    await j.shot(B, 'venue-panel');
    must(detail['servicesButton'], `no "Services here" button (location ${detail['location']}, travel ${JSON.stringify(detail['travel'])})`);
    await B.click('[data-services]'); await B.waitFor(`!!document.querySelector('.sc-app')`, 10000, 'Services opened from the market');
    await B.waitFor(`document.querySelectorAll('.sc-hit').length >= 1 || !!document.querySelector('.sc-chip')`, 15000, 'the list');
    detail['chip'] = (await text(B, '.sc-app')).replace(/\s+/g, ' ').slice(0, 260); detail['hits'] = await B.eval<number>(`document.querySelectorAll('.sc-hit').length`);
    await j.shot(B, 'services-here');
    must(/this market/i.test(String(detail['chip'])) && detail['hits'] === 3, `services here: chip/hits ${detail['hits']} ${detail['chip']}`);
    await B.click('.sc-chip button', 'Show the whole city'); await sleep(800);
  });

  await j.run('13', 'Shop page at 1280x800: header and sign, open/closed now (clock moved to a closed and an open Lagos hour), week with today, services alignment and the single price line', [B], async (detail) => {
    await B.setViewport({ width: 1280, height: 800, scale: 1, mobile: false });
    await sleep(600); await openShop(B, 'Ada Braids');
    await j.shot(B, 'shop-panel-default-top');
    detail['wideOn'] = await setWide(B, true); await sleep(500); await j.shot(B, 'shop-wide-top');
    detail['pageText'] = (await text(B, '.sp')).replace(/\s+/g, ' ');
    detail['priceNoteCount'] = (detail['pageText'] as string).split('Seller’s price, paid outside Allworld').length - 1;
    detail['priceRights'] = await B.eval<number[]>(`[...document.querySelectorAll('.shf-price')].map((e) => Math.round(e.getBoundingClientRect().right))`);
    detail['priceTops'] = await B.eval<unknown>(`[...document.querySelectorAll('.shf-list li')].map((li) => { const w = li.querySelector('.shf-what').getBoundingClientRect(), p = li.querySelector('.shf-price').getBoundingClientRect(); return [Math.round(w.top), Math.round(p.top)]; })`);
    detail['header'] = await B.eval<unknown>(`(() => { const sf = document.querySelector('.sp [data-storefront]'); const r = sf.getBoundingClientRect(); return { h: Math.round(r.height), w: Math.round(r.width), text: sf.innerText.replace(/\\s+/g, ' '), layout: sf.className }; })()`);
    detail['todayLines'] = await B.eval<string[]>(`[...document.querySelectorAll('.shf-week li.is-today')].map((e) => e.innerText.replace(/\\s+/g, ' '))`);
    detail['badge'] = await text(B, '.shf-who');
    await B.eval(`document.querySelector('.shf-week').scrollIntoView({ block: 'center' }); true`); await j.shot(B, 'shop-wide-hours');
    const times: Record<string, unknown> = {};
    for (const hh of [3, 12]) {
      const when = await lagosHour(B, hh);
      await openShop(B, 'Ada Braids');
      times[`lagos${hh}`] = { ...when, now: await text(B, '.shf-now'), today: await B.eval<string[]>(`[...document.querySelectorAll('.shf-week li.is-today')].map((e) => e.innerText.replace(/\\s+/g, ' '))`), badgeOnCard: (await text(B, '.sp [data-storefront]')).replace(/\\s+/g, ' ').slice(-90) };
      await B.eval(`document.querySelector('.shf-now').scrollIntoView({ block: 'center' }); true`); await j.shot(B, `shop-clock-lagos-${hh}h`);
    }
    detail['times'] = times; await syncClock(B, lab.offset());
    for (const [k, v] of Object.entries(times) as [string, any][]) {
      const open = v.lagosDay < 6 ? (v.hour >= 9 && v.hour < 18) : false;
      must(open ? /open now/i.test(v.now) : /opens|closed/i.test(v.now) && !/open now/i.test(v.now), `${k}: Lagos weekday ${v.lagosDay}: expected ${open ? 'open' : 'closed'}, the page says "${v.now}"`);
      must(v.today.length === 1, `${k}: ${v.today.length} days highlighted as today`);
    }
    must(detail['priceNoteCount'] === 1, `the seller's price line appears ${detail['priceNoteCount']} times`);
    const rights = detail['priceRights'] as number[]; must(rights.length >= 2 && Math.max(...rights) - Math.min(...rights) <= 1, `prices are not right-aligned: ${rights}`);
    must((detail['todayLines'] as string[]).length === 1, 'today is not highlighted once in the week');
  });

  await j.run('14', 'Photo viewer: next/previous by button and arrow keys; Escape closes ONLY the viewer and focus returns to the thumbnail; Escape again leaves the shop page for the list; only then Escape closes the app', [B], async (detail) => {
    await B.setViewport({ width: 1280, height: 800, scale: 1, mobile: false }); await syncClock(B, lab.offset()); await openShop(B, 'Ada Braids'); await setWide(B, true);
    detail['gallery'] = await B.eval<unknown>(`(() => { const c = document.querySelector('.pg-cover'), r = document.querySelector('.pg-row'); const cr = c.getBoundingClientRect(); return { coverBox: [Math.round(cr.width), Math.round(cr.height)], thumbs: r ? r.querySelectorAll('li').length : 0, coverSrc: c.querySelector('img').getAttribute('src') }; })()`);
    await B.eval(`document.querySelector('.pg').scrollIntoView(); true`); await j.shot(B, 'shop-gallery');
    const counter = (): Promise<string> => B.eval<string>(`(document.querySelector('.pg-cap span') || {}).innerText || ''`);
    detail['thumbLabel'] = await B.eval<string>(`document.querySelector('.pg-row li button').getAttribute('aria-label')`);
    await B.click('.pg-row li button'); await B.waitFor(`!!document.querySelector('.pg-view')`, 8000, 'the viewer'); await sleep(500);
    detail['c0'] = await counter(); await j.shot(B, 'lightbox-open');
    await B.click('.pg-nav button', 'Next'); await sleep(300); detail['afterNextButton'] = await counter();
    await B.click('.pg-nav button', 'Previous'); await sleep(300); detail['afterPrevButton'] = await counter();
    await B.press('ArrowRight', 'ArrowRight', 39); await sleep(300); detail['afterArrowRight'] = await counter();
    await B.press('ArrowLeft', 'ArrowLeft', 37); await sleep(300); detail['afterArrowLeft'] = await counter();
    await B.press('Escape', 'Escape', 27); await sleep(700);
    detail['esc1'] = { viewerClosed: !(await visible(B, '.pg-view')), shopShown: await visible(B, '.sp .shf-about'), appShown: await visible(B, '.sc-app'), focusLabel: await B.eval<string>(`(document.activeElement && (document.activeElement.getAttribute('aria-label') || document.activeElement.className)) + ''`) };
    await j.shot(B, 'esc1-after-viewer');
    await B.press('Escape', 'Escape', 27); await sleep(900);
    detail['esc2'] = { listShown: await visible(B, '.sc-list, .sc-hit'), shopGone: !(await visible(B, '.sp .shf-about')), appShown: await visible(B, '.sc-app') };
    await j.shot(B, 'esc2-after-shop');
    await B.press('Escape', 'Escape', 27); await sleep(900);
    detail['esc3'] = { appShown: await visible(B, '.sc-app'), homeShown: await visible(B, '.ph-appbtn') };
    await j.shot(B, 'esc3-after-list');
    must(String(detail['c0']).match(/(\d+) of/)![1] === '2' && /3 of/.test(String(detail['afterNextButton'])) && /2 of/.test(String(detail['afterPrevButton'])) && /3 of/.test(String(detail['afterArrowRight'])) && /2 of/.test(String(detail['afterArrowLeft'])), `viewer navigation: ${JSON.stringify(detail)}`);
    must(String((detail['gallery'] as any).coverSrc).includes(String(await S.eval<string>(`(async () => { const r = await fetch('/api/showcase/mine').then((x) => x.json()); const p = (r.shop || (r.mine && r.mine.shop) || {}).photos || []; return p[0] ? p[0].id : ''; })()`))), 'the gallery does not show the seller\'s cover first');
    const e1 = detail['esc1'] as any, e2 = detail['esc2'] as any, e3 = detail['esc3'] as any;
    must(e1.viewerClosed && e1.shopShown && e1.appShown, `Escape 1: ${JSON.stringify(e1)}`);
    must(e1.focusLabel === detail['thumbLabel'], `Escape 1: focus is on "${e1.focusLabel}", not the thumbnail "${detail['thumbLabel']}"`);
    must(e2.listShown && e2.shopGone && e2.appShown, `Escape 2: ${JSON.stringify(e2)}`);
    must(!e3.appShown && e3.homeShown, `Escape 3: ${JSON.stringify(e3)}`);
  });
  await j.run('15', 'Buyer: adult prompt inside the bar, then Chat and Pay open the leaving sheet that names the destination and the safety line', [B], async (detail) => {
    if (!(await visible(B, '.sp-bar'))) { await openServices(B); await openShop(B, 'Ada Braids'); detail['reopened'] = true; }
    await B.eval(`window.__opened = []; window.open = (...a) => { window.__opened.push(a); return null; }; true`);
    await B.eval(`document.querySelector('.sp-bar').scrollIntoView(); true`);
    await B.click('.sp-bar button[aria-label="Chat with the seller"]'); await sleep(900);
    const out: Record<string, unknown> = {};
    out['promptInBar'] = await B.eval<string>(`(document.querySelector('.sp-bar .sp-msg') || {}).innerText || ''`);
    out['promptShape'] = await B.eval<unknown>(`(() => { const m = document.querySelector('.sp-bar .sp-msg'); if (!m) return null; const r = m.getBoundingClientRect(); return { h: Math.round(r.height), buttons: [...m.querySelectorAll('button')].map((b) => b.innerText.trim()), text: (m.querySelector('.sp-status') || {}).innerText || '' }; })()`);
    await j.shot(B, 'bar-adult-prompt');
    if (await visible(B, '.sp-bar button', 'I am 18')) { await B.click('.sp-bar button', 'I am 18'); await sleep(900); await B.click('.sp-bar button[aria-label="Chat with the seller"]'); }
    await B.waitFor(`!!document.querySelector('[data-trust-leave]')`, 10000, 'the leaving sheet'); await sleep(600);
    out['chatSheet'] = (await text(B, '[data-trust-leave]')).replace(/\s+/g, ' '); await j.shot(B, 'leaving-chat');
    await B.click('[data-trust-leave] button', 'Continue'); out['opened'] = await B.eval<unknown>(`window.__opened`); await sleep(500);
    await B.click('.sp-bar button[aria-label="Pay the seller"]'); await B.waitFor(`!!document.querySelector('[data-trust-leave]')`, 10000, 'the pay sheet'); await sleep(600);
    out['paySheet'] = (await text(B, '[data-trust-leave]')).replace(/\s+/g, ' '); await j.shot(B, 'leaving-pay');
    await B.click('[data-trust-leave] button', 'Continue'); out['openedAfterPay'] = await B.eval<unknown>(`window.__opened`);
    detail['sheets'] = out;
    must((out['promptShape'] as any)?.buttons?.length === 1 && /18/.test((out['promptShape'] as any).buttons[0]), `the 18+ prompt is not one line with one action: ${JSON.stringify(out['promptShape'])}`);
    must(/18/.test(String(out['promptInBar'])), `no 18+ prompt inside the bar before the first Chat: "${out['promptInBar']}"`);
    must(String(out['chatSheet']).includes('wa.me') && /safe|pay|money|careful|trust/i.test(String(out['chatSheet'])), 'the chat sheet does not name wa.me and show a safety line');
    must(String(out['paySheet']).includes('paystack.com'), 'the pay sheet does not name the destination');
    const opened = out['openedAfterPay'] as any[][];
    must(opened.length === 2 && opened[0]![0] === CHAT && opened[1]![0] === PAY && String(opened[0]![2]).includes('noopener'), 'Continue did not open the two links in a new tab with noopener');
  });

  await j.run('16', 'Guest: browse and open the shop; Chat/Pay ask to sign in inside the bar; no link in any payload', [G], async (detail) => {
    await openServices(G); await G.waitFor(`document.querySelectorAll('.sc-hit').length >= 1`, 15000, 'the directory as a guest');
    await openShop(G, 'Ada Braids');
    await G.click('.sp-bar button[aria-label="Chat with the seller"]'); await sleep(1500);
    detail['barText'] = await G.eval<string>(`(document.querySelector('.sp-bar') || {}).innerText || ''`); await j.shot(G, 'guest-chat');
    await G.click('.sp-bar button[aria-label="Pay the seller"]').catch(() => undefined); await sleep(1200); await j.shot(G, 'guest-pay');
    detail['leavingSheet'] = await visible(G, '[data-trust-leave]');
    detail['signInInBar'] = await visible(G, '.sp-bar button', 'Sign in');
    const leaked: string[] = [];
    for (const [who, p] of [['guest', G], ['buyer', B]] as const) for (const r of p.requests.filter((x) => x.url.includes('/api/showcase/') && !x.url.includes('/photo/') && !x.url.includes('/go'))) { const body = (await p.responseBody(r.requestId)) ?? ''; if (/wa\.me|paystack|https?:\/\//i.test(body)) leaked.push(`${who} ${r.method} ${r.url.replace(lab.base, '')}`); }
    detail['payloadsWithUrls'] = leaked;
    const dir = await lab.call('/api/showcase/directory'), one = await lab.call(`/api/showcase/${ids['shop']}`);
    detail['anonymousDirectoryHasLink'] = /wa\.me|paystack/.test(JSON.stringify(dir)); detail['anonymousShopHasLink'] = /wa\.me|paystack/.test(JSON.stringify(one));
    const go = await lab.call(`/api/showcase/${ids['shop']}/go`, { clientId: `${lab.now()}:${crypto.randomUUID()}`, kind: 'chat' });
    detail['anonymousGo'] = { status: go.status, error: go['error'], hasUrl: /wa\.me/.test(JSON.stringify(go)) };
    must(!detail['leavingSheet'], 'a guest got the leaving sheet');
    must(leaked.length === 0 && !detail['anonymousDirectoryHasLink'] && !detail['anonymousShopHasLink'] && !(detail['anonymousGo'] as any).hasUrl, 'a link appears where it must not');
    must(detail['signInInBar'], 'no sign-in prompt inside the bar for the guest');
  });

  await j.run('17', 'Directory refreshes without a reload (on focus, via Refresh, on returning to the list, by itself within about a minute); a pay-link change leaves it, and after approval the notice shows', [S, B], async (detail) => {
    const hits = (): Promise<number> => B.eval<number>(`document.querySelectorAll('.sc-hit').length`);
    const dirCount = async (): Promise<number> => ((await lab.call('/api/showcase/directory'))['shops'] ?? []).length;
    await B.goto(lab.base + '/'); await gameShown(B); await dismiss(B); await openServices(B); await sleep(800);
    if (await visible(B, '.sp-back')) { detail['restoredOnShopPage'] = true; await B.click('.sp-back'); }
    await B.waitFor(`document.querySelectorAll('.sc-hit').length >= 3`, 20000, 'three shops'); await j.shot(B, 'refresh-before');
    // the seller changes the pay link: the shop leaves the directory
    await field(S, 'pay', PAY2); const s1 = await save(S); detail['note'] = s1.note; detail['status'] = await statusLine(S);
    detail['serverCountAfterEdit'] = await dirCount();
    await S.eval(`document.querySelector('[data-status]').scrollIntoView({ block: 'center' }); true`); await j.shot(S, 'edit-pay-review');
    const queue = await lab.mod('/api/mod/showcase'); must((queue['queue'] ?? []).some((x: any) => x.id === ids['shop']), 'the changed shop is not back in the queue');
    must(detail['serverCountAfterEdit'] === 2, `${detail['serverCountAfterEdit']} shops in the directory after a pay link change`);
    detail['hitsRightAfter'] = await hits();
    // (a) on focus (the list is older than 15 s)
    await sleep(16000); await B.eval(`window.dispatchEvent(new Event('focus')); true`);
    detail['focusRefresh'] = await B.waitFor(`document.querySelectorAll('.sc-hit').length === 2`, 8000, 'focus refresh').then(() => true, () => false); await j.shot(B, 'refresh-after-focus');
    // (b) the Refresh button
    await lab.mod('/api/mod/showcase', { action: 'approve', shop: ids['shop'] }); await sleep(300);
    detail['refreshButton'] = await B.eval<unknown>(`(() => { const b = [...document.querySelectorAll('.sc-head button')].find((x) => /Refresh/.test(x.innerText)); return b ? { text: b.innerText.trim(), aria: b.getAttribute('aria-label') } : null; })()`);
    await B.click('.sc-head button', 'Refresh'); detail['refreshClick'] = await B.waitFor(`document.querySelectorAll('.sc-hit').length === 3`, 8000, 'Refresh button').then(() => true, () => false);
    // (c) returning to the list from a shop page
    await field(S, 'pay', PAY3); await save(S); detail['serverCountAfterSecondEdit'] = await dirCount();
    await sleep(16000); await B.click('.sc-hit', 'Tunde'); await B.waitFor(`!!document.querySelector('.sp .shf-about')`, 15000, 'a shop'); await B.click('.sp-back');
    detail['backRefresh'] = await B.waitFor(`document.querySelectorAll('.sc-hit').length === 2`, 10000, 'refresh on return to the list').then(() => true, () => false); await j.shot(B, 'refresh-after-back');
    // (d) by itself within about a minute
    await lab.mod('/api/mod/showcase', { action: 'approve', shop: ids['shop'] });
    const t0 = Date.now(); detail['pollRefreshMs'] = await B.waitFor(`document.querySelectorAll('.sc-hit').length === 3`, 90000, 'the automatic refresh').then(() => Date.now() - t0, () => -1);
    await openShop(B, 'Ada Braids'); await B.waitFor(`!!document.querySelector('.sp-warn')`, 8000, 'the payment notice').catch(() => undefined);
    detail['notice'] = (await text(B, '.sp-warn').catch(() => '')) || '';
    await B.eval(`document.querySelector('.sp-warn')?.scrollIntoView({ block: 'center' }); true`); await j.shot(B, 'pay-notice');
    must(detail['hitsRightAfter'] === 3 || detail['hitsRightAfter'] === 2, 'unexpected list count');
    must(detail['focusRefresh'], 'the directory did not refresh on focus'); must(detail['refreshClick'], 'the Refresh button did not refresh the list');
    must(detail['backRefresh'], 'the list did not refresh on returning from a shop'); must((detail['pollRefreshMs'] as number) >= 0, 'the directory did not refresh by itself within 90 s');
    must(/Payment details changed recently/.test(String(detail['notice'])), 'no "Payment details changed recently" notice');
  });
  await j.run('18', 'No provider name in the showcase UI (the destination site on the leaving sheet excepted)', [B], async (detail) => {
    const names = /whatsapp|paystack|flutterwave|telegram|wa\.me|facebook|instagram/i; const hits: string[] = [];
    if (names.test(await text(B, '.sp'))) hits.push('shop page');
    await B.click('.sp-back'); await sleep(500);
    if (names.test(await text(B, '.sc-app'))) hits.push('directory');
    const edText = await text(S, '[data-showcase-editor]'); const m = edText.match(names); if (m) hits.push(`editor: ${m[0]}`);
    const ph = await S.eval<string[]>(`[...document.querySelectorAll('.se input, .se textarea')].map((e) => (e.placeholder || '') + '|' + (e.getAttribute('aria-label') || '')).filter((x) => /whatsapp|paystack|flutterwave|telegram/i.test(x))`);
    if (ph.length) hits.push(`placeholders: ${ph}`);
    detail['hits'] = hits; must(hits.length === 0, `a provider name appears: ${hits.join('; ')}`);
  });

  await j.run('19', 'Editor preview beside the form at the wide panel (702 px editor) and the 780 px state; the Edit/Preview toggle on the narrow panel', [S], async (detail) => {
    const probe = (): Promise<any> => S.eval(`(() => { const e = document.querySelector('.se-edit').getBoundingClientRect(), p = document.querySelector('.se-preview'), r = p.getBoundingClientRect(), g = document.querySelector('.se-grid').getBoundingClientRect(); const inp = document.querySelector('#se-f-name'); return { gridWidth: Math.round(g.width), editBox: [Math.round(e.left), Math.round(e.right)], previewBox: [Math.round(r.left), Math.round(r.right), Math.round(r.top), Math.round(r.bottom)], previewVisible: getComputedStyle(p).display !== 'none' && r.width > 50, toggleShown: getComputedStyle(document.querySelector('.se-toggle')).display !== 'none', previewSticky: getComputedStyle(p).position, nameFieldWidth: inp ? Math.round(inp.getBoundingClientRect().width) : null, vw: innerWidth, hscroll: document.documentElement.scrollWidth > innerWidth }; })()`);
    const sizes: Record<string, unknown> = {};
    for (const [label, w, h, wide] of [['1280-narrow-panel', 1280, 800, false], ['1280-wide-panel', 1280, 800, true], ['900-wide-panel', 900, 800, true], ['1100-wide-panel', 1100, 800, true]] as [string, number, number, boolean][]) {
      await S.setViewport({ width: w, height: h, scale: 1, mobile: false }); await sleep(700);
      const on = await setWide(S, wide); await sleep(600);
      await S.eval(`document.querySelector('#se-s-look').scrollIntoView(); true`); await sleep(400);
      const o = await probe(); o.wideOn = on; sizes[label] = o; await j.shot(S, `editor-${label}`);
      await S.eval(`document.querySelector('#se-s-hours').scrollIntoView(); true`); await sleep(400);
      o.previewStillVisibleAtHours = await S.eval<boolean>(`(() => { const r = document.querySelector('.se-preview').getBoundingClientRect(); return r.width > 50 && r.bottom > 80 && r.top < innerHeight; })()`);
      await j.shot(S, `editor-${label}-hours`);
    }
    detail['sizes'] = sizes;
    const p: Record<string, any> = sizes as any;
    must(p['1280-wide-panel'].previewVisible && p['1280-wide-panel'].previewBox[0] >= p['1280-wide-panel'].editBox[1] - 4, `at 1280 (wide panel) the preview is not beside the form: ${JSON.stringify(p['1280-wide-panel'])}`);
    must(p['900-wide-panel'].previewVisible && p['900-wide-panel'].previewBox[0] >= p['900-wide-panel'].editBox[1] - 4, `at 900 (wide panel) the preview is not beside the form: ${JSON.stringify(p['900-wide-panel'])}`);
    must(p['1280-narrow-panel'].toggleShown && !p['1280-narrow-panel'].previewVisible, 'on the narrow panel the Edit/Preview toggle is not what shows');
    must(!p['1280-wide-panel'].hscroll && !p['900-wide-panel'].hscroll, 'horizontal scroll in the editor');
    await setWide(S, false); await desktop(S);
  });
  await j.run('20', 'Simulated phone 390x844 and 320x568: toggle, compact hours (checkbox and day on one line, same-hours button), refusal with focus and no duplicated hint, photo cards, Preview = shop page, directory, shop page with the solid bar and "Report this shop" visible, one-line prompts, Chat/Pay on one line', [S, B], async (detail) => {
    const res: Record<string, unknown> = {};
    await setWide(B, false); await setWide(S, false); await setWide(G, false);
    for (const [w, h] of [[390, 844], [320, 568]] as [number, number][]) {
      for (const p of [S, B]) await phone(p, w, h);
      await sleep(900);
      const out: Record<string, unknown> = {};
      await S.eval(`document.querySelector('[data-showcase-editor]').scrollIntoView(); true`); await j.shot(S, `phone${w}-editor-top`);
      out['editorTop'] = await layoutProbe(S, '[data-showcase-editor]');
      out['toggle'] = await S.eval<unknown>(`(() => { const t = document.querySelector('.se-toggle'); const r = t.getBoundingClientRect(); return { shown: getComputedStyle(t).display !== 'none' && r.width > 50, box: [Math.round(r.width), Math.round(r.height)] }; })()`);
      // --- hours
      await S.click('.se-steps button', 'Hours'); await sleep(1500);
      await S.eval(`document.querySelector('#se-s-hours').scrollIntoView(); true`); await sleep(300); await j.shot(S, `phone${w}-hours-a`);
      out['hours'] = await widthProbe(S, '#se-s-hours');
      out['hoursRows'] = await S.eval<unknown>(`[...document.querySelectorAll('.se-day')].map((d) => { const r = d.getBoundingClientRect(), cb = d.querySelector('input[type=checkbox]'), lab = d.querySelector('.se-open span'); const c = cb.getBoundingClientRect(), l = lab.getBoundingClientRect(); return { h: Math.round(r.height), checkboxSameLine: Math.abs((c.top + c.height / 2) - (l.top + l.height / 2)) < 10, right: Math.round(r.right) }; })`);
      out['hoursSectionHeight'] = await S.eval<number>(`Math.round(document.querySelector('#se-s-hours').getBoundingClientRect().height)`);
      await S.eval(`[...document.querySelectorAll('.se-day')].at(-1).scrollIntoView({ block: 'end' }); true`); await j.shot(S, `phone${w}-hours-b`);
      // same hours for every day
      await S.eval(`(() => { const ins = document.querySelectorAll('.se-day')[0].querySelectorAll('input[type=time]'); const set = (i, v) => { i.value = v; i.dispatchEvent(new Event('input', { bubbles: true })); }; set(ins[0], '08:00'); set(ins[1], '17:00'); return true; })()`);
      await S.click('.se-same'); await sleep(500);
      out['sameHours'] = await S.eval<unknown>(`[...document.querySelectorAll('.se-day')].map((d) => { const ins = [...d.querySelectorAll('input[type=time]')]; return { open: d.querySelector('input[type=checkbox]').checked, from: ins[0] ? ins[0].value : null, to: ins[1] ? ins[1].value : null }; })`);
      await j.shot(S, `phone${w}-hours-same`);
      // --- refusal and hint duplication
      await field(S, 'about', 'Call me on 0801 234 5678 now.');
      const bad = await save(S); out['refusal'] = { errors: bad.errors, focusId: bad.focusId, focusInView: bad.focusInView, summary: bad.summary.replace(/\s+/g, ' ') };
      out['hintVsError'] = await S.eval<unknown>(`(() => { const h = document.querySelector('#se-h-about'), e = document.querySelector('#se-e-about'); const vis = (x) => !!x && x.getBoundingClientRect().height > 1 && getComputedStyle(x).display !== 'none'; return { hintVisible: vis(h), hint: h ? h.innerText : '', error: e ? e.innerText : '', same: !!h && !!e && vis(h) && h.innerText.trim() === e.innerText.trim() }; })()`);
      await j.shot(S, `phone${w}-refusal-focus`);
      await S.eval(`document.querySelector('#se-summary')?.scrollIntoView({ block: 'center' }); true`); await j.shot(S, `phone${w}-refusal-summary`);
      out['refusalChecks'] = { errorBeside: bad.errors.some((e) => e.id === 'se-e-about'), focusOnAbout: bad.focusId === 'se-f-about', summary: bad.summary.length > 0 };
      await field(S, 'about', 'Neat knotless braids and natural hair care since 2019.'); out['saveAfter'] = (await save(S)).note;
      // --- photos
      await S.eval(`document.querySelector('#se-s-photos').scrollIntoView(); true`); await sleep(300); await j.shot(S, `phone${w}-editor-photos`);
      out['photos'] = await widthProbe(S, '#se-s-photos');
      out['photoTools'] = await S.eval<unknown>(`[...document.querySelectorAll('.pm-tool')].slice(0, 4).map((b) => ({ name: b.getAttribute('aria-label'), w: Math.round(b.getBoundingClientRect().width), h: Math.round(b.getBoundingClientRect().height) }))`);
      // --- preview toggle
      await S.eval(`document.querySelector('.se-toggle').scrollIntoView(); true`); await S.click('.se-toggle button', 'Preview my shop'); await sleep(700);
      await j.shot(S, `phone${w}-preview-top`);
      out['previewText'] = (await text(S, '.se-preview')).replace(/\s+/g, ' '); out['previewProbe'] = await widthProbe(S, '.se-preview');
      await S.eval(`document.querySelector('.se-preview').scrollIntoView({ block: 'end' }); true`); await j.shot(S, `phone${w}-preview-bottom`);
      await S.click('.se-toggle button', 'Edit'); await sleep(400);
      // --- directory and shop page
      await B.click('.sp-back').catch(() => undefined);
      await B.waitFor(`document.querySelectorAll('.sc-hit').length >= 3`, 20000, 'directory');
      await B.eval(`document.querySelector('.sc-app').scrollIntoView(); true`); await j.shot(B, `phone${w}-directory`);
      out['directory'] = await widthProbe(B, '.sc-app');
      await B.eval(`document.querySelectorAll('.sc-hit')[1].scrollIntoView({ block: 'center' }); true`); await j.shot(B, `phone${w}-directory-cards`);
      await openShop(B, 'Ada Braids');
      await j.shot(B, `phone${w}-shop-top`);
      out['back'] = await B.eval<unknown>(`(() => { const b = document.querySelector('.sp-back'), r = b.getBoundingClientRect(); return { box: [Math.round(r.width), Math.round(r.height)], text: b.innerText.trim(), aria: b.getAttribute('aria-label') }; })()`);
      out['shop'] = await widthProbe(B, '.sp');
      await B.eval(`[...document.querySelectorAll('.sp .ui-button')].find((x) => /Report this shop/.test(x.innerText)).scrollIntoView({ block: 'end' }); true`); await sleep(700); await j.shot(B, `phone${w}-shop-bottom-bar`);
      out['bar'] = await B.eval<unknown>(`(() => { const bar = document.querySelector('.sp-bar'), r = bar.getBoundingClientRect(), cs = getComputedStyle(bar), card = document.querySelector('.shf-card').getBoundingClientRect(); const report = [...document.querySelectorAll('.sp .ui-button')].find((x) => /Report this shop/.test(x.innerText)), rr = report.getBoundingClientRect(); const top = document.elementFromPoint(rr.left + rr.width / 2, rr.top + rr.height / 2); const home = document.querySelector('.ph-homebar'), hb = home && home.getBoundingClientRect(); const m = /rgba?\\(([^)]*)\\)/.exec(cs.backgroundColor); const parts = m ? m[1].split(',').map(Number) : []; return { position: cs.position, background: cs.backgroundColor, opaque: parts.length < 4 || parts[3] === 1, backdrop: cs.backdropFilter, barLeft: Math.round(r.left), barRight: Math.round(r.right), cardLeft: Math.round(card.left), cardRight: Math.round(card.right), barTop: Math.round(r.top), barBottom: Math.round(r.bottom), vh: innerHeight, homeBarTop: hb ? Math.round(hb.top) : null, reportBottom: Math.round(rr.bottom), reportFullyVisible: rr.bottom <= r.top + 1 && rr.top >= 0, reportHit: !!top && (top === report || report.contains(top)), buttons: [...bar.querySelectorAll('button')].map((b) => [b.innerText.trim(), Math.round(b.getBoundingClientRect().height), Math.round(b.getBoundingClientRect().width)]) }; })()`);
      await B.eval(`window.__opened = []; window.open = (...a) => { window.__opened.push(a); return null; }; true`);
      await B.click('.sp-bar button[aria-label="Chat with the seller"]'); await B.waitFor(`!!document.querySelector('[data-trust-leave]')`, 10000, 'sheet'); await sleep(700);
      await j.shot(B, `phone${w}-leaving`); out['sheet'] = await layoutProbe(B, '[data-trust-leave]');
      out['sheetContinueReachable'] = await B.eval<boolean>(`(() => { const b = [...document.querySelectorAll('[data-trust-leave] button')].find((x) => /Continue/.test(x.innerText)); if (!b) return false; b.scrollIntoView({ block: 'center' }); const r = b.getBoundingClientRect(); const top = document.elementFromPoint(r.left + r.width / 2, r.top + r.height / 2); return r.bottom <= innerHeight + 1 && (top === b || b.contains(top)); })()`);
      await B.click('[data-trust-leave] button', 'Continue'); out['openedByTouch'] = await B.eval<unknown>(`window.__opened.length`);
      // the guest's bar with its prompt
      await phone(G, w, h); await sleep(500); await openShop(G, 'Ada Braids').catch(() => undefined);
      await G.click('.sp-bar button[aria-label="Chat with the seller"]').catch(() => undefined); await sleep(900); await j.shot(G, `phone${w}-guest-bar-prompt`);
      out['guestBar'] = await G.eval<unknown>(`(() => { const b = document.querySelector('.sp-bar'); if (!b) return null; const r = b.getBoundingClientRect(), m = b.querySelector('.sp-msg'), mr = m && m.getBoundingClientRect(); return { text: b.innerText.replace(/\\s+/g, ' '), top: Math.round(r.top), bottom: Math.round(r.bottom), h: Math.round(r.height), vh: innerHeight, promptH: mr ? Math.round(mr.height) : null, promptButtons: m ? [...m.querySelectorAll('button')].map((x) => x.innerText.trim()) : [] }; })()`);
      await B.click('.sp-back').catch(() => undefined);
      res[`${w}x${h}`] = out;
    }
    detail['sizes'] = res;
    for (const p of [S, B, G]) await desktop(p);
    const problems: string[] = [];
    for (const [k, v] of Object.entries(res) as [string, any][]) {
      if (!v.toggle.shown) problems.push(`${k}: no Edit/Preview toggle`);
      if (v.hours.overflowing.length) problems.push(`${k}: hours overflow ${v.hours.overflowing.join(', ')}`);
      if (!v.hoursRows.every((r: any) => r.checkboxSameLine)) problems.push(`${k}: a day's checkbox is not on the same line as its name`);
      if (!v.sameHours.slice(1, 6).every((r: any) => r.open && r.from === '08:00' && r.to === '17:00')) problems.push(`${k}: "Use Monday's hours for every day" did not set Tuesday to Saturday: ${JSON.stringify(v.sameHours)}`);
      if (!v.refusalChecks.errorBeside || !v.refusalChecks.focusOnAbout || !v.refusalChecks.summary) problems.push(`${k}: refusal ${JSON.stringify(v.refusalChecks)}`);
      if (v.hintVsError.same) problems.push(`${k}: the hint text is repeated as the error`);
      if (!v.bar.opaque) problems.push(`${k}: the Chat/Pay bar is not solid (${v.bar.background})`);
      if (Math.abs(v.bar.barLeft - v.bar.cardLeft) > 3 || Math.abs(v.bar.barRight - v.bar.cardRight) > 3) problems.push(`${k}: the bar (${v.bar.barLeft}-${v.bar.barRight}) is not aligned to the cards (${v.bar.cardLeft}-${v.bar.cardRight})`);
      if (!v.bar.reportFullyVisible || !v.bar.reportHit) problems.push(`${k}: "Report this shop" is not fully visible/tappable at the end of the page (bottom ${v.bar.reportBottom}, bar top ${v.bar.barTop})`);
      if (v.bar.buttons.some((b: any) => b[1] > 56)) problems.push(`${k}: a bar button wraps to two lines ${JSON.stringify(v.bar.buttons)}`);
      if (v.bar.homeBarTop !== null && v.bar.barBottom > v.bar.homeBarTop + 1) problems.push(`${k}: the bar is below the home bar`);
      if (!v.guestBar || v.guestBar.promptH === null || v.guestBar.promptH > 48 || v.guestBar.promptButtons.length !== 1) problems.push(`${k}: the guest prompt is not one line with one action ${JSON.stringify(v.guestBar)}`);
      if (!v.sheetContinueReachable) problems.push(`${k}: Continue not reachable`);
      for (const area of ['shop', 'directory', 'photos', 'previewProbe']) if (v[area].overflowing.length) problems.push(`${k}: ${area} overflow ${v[area].overflowing.join(', ')}`);
      if (!/Braids by Ada|Ada Braids/.test(v.previewText) || !/Knotless braids/.test(v.previewText) || !/₦25,000/.test(v.previewText)) problems.push(`${k}: the preview lacks the shop's content`);
    }
    detail['problems'] = problems; must(problems.length === 0, problems.join(' | '));
  });
} catch (e) { console.log('ERR', e); }
finally {
  const code = j.finish({ ids }, { seller: realErrors(S), buyer: realErrors(B), guest: realErrors(G), seller2: realErrors(S2), seller3: realErrors(S3) });
  try { S3.close(); S2.close(); G.close(); B.close(); S.close(); } catch { /* closed */ }
  await lab.stop(); process.exit(code);
}
