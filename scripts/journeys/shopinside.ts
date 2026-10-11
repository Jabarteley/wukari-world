#!/usr/bin/env node
/**
 * Feature journey: the 3D shop (docs/SHOWCASE.md, "The 3D shop"). Three sellers publish three shops (fashion with 8 items and photos, food
 * with 14 items, a repair shop with no items). For each shop, a FRESH guest opens the public link, taps "Step inside", starts as a guest and
 * is in the room. Captures at 1280x800, 390x844 and 320x568: the room on entry, a close view of the shelves, an item card, the counter card,
 * and for the food shop the arrow for the second page and the second page; for the empty shop the "Opening soon" stand. Also: the seller's
 * preview before and after publishing, "Step inside" from the Services app, and a link that is not a shop.
 *
 *   node --experimental-strip-types --no-warnings scripts/journeys/shopinside.ts --out <folder> [--port 4533] [--public-port 4531] [--debug-port 4532] [--only fashion,food] [--size 390x844] [--tag name] [--extras 0]
 *
 * With --public-port the pages are reached through a dev server on that port that proxies the API to --port (no build needed); without
 * it the built game in dist/ (or JOURNEY_DIST) is served by the lab itself. One server, one muted headless Chrome, no outside request.
 */
import { readFileSync, readdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { Browser, sleep } from './cdp.ts';
import { startLab } from './lab.ts';
import { Journey, arg, dismiss, gameShown, must, pageCall, playNow, realErrors, syncClock, text, visible } from './kit.ts';

const port = Number(arg('port', '4533')), publicPort = Number(arg('public-port', String(port))), debugPort = Number(arg('debug-port', '4532'));
const lab = await startLab(port, {}, publicPort);
const S = await Browser.launch(debugPort);          // the seller of the first shop, and where pictures are made
const tag = arg('tag', 'all'), extras = arg('extras', '1') === '1';
const j = new Journey(arg('out'), `shopinside-${tag}`);
const HOUR = 3600000;
const sizes = [['1280x800', 1280, 800, false], ['390x844', 390, 844, true], ['320x568', 320, 568, true]] as const;
for (const sig of ['SIGINT', 'SIGTERM'] as const) process.once(sig, () => { try { S.child.kill('SIGKILL'); } catch { /* gone */ } process.exit(130); });
const id = (): string => `${lab.now()}:${crypto.randomUUID()}`;
const WEEK = [{ open: '09:00', close: '18:00' }, { open: '09:00', close: '18:00' }, { open: '09:00', close: '18:00' }, { open: '09:00', close: '18:00' }, { open: '09:00', close: '18:00' }, { open: '10:00', close: '16:00' }, null];

interface Shop { key: string; email: string; seller: string; name: string; category: string; colours: [string, string]; sign: string; about: string; items: [string, number, string][]; photos: number; cookie: string; path: string; token: string; id: string }
const shops: Shop[] = [
  { key: 'fashion', email: 'ada@example.test', seller: 'Ada Seller', name: 'Ada Fashion House', category: 'tailor', colours: ['#8e2c48', '#f7e4ea'], sign: 'Made in Lagos', about: 'Ankara, lace and adire, cut to your size. Walk in, or message us first.', photos: 4, cookie: '', path: '', token: '', id: '',
    items: [['Ankara wrapper', 18000, 'Two yards, fast colours'], ['Lace blouse', 22500, ''], ['Agbada set', 85000, 'Three pieces, made to measure'], ['Kaftan', 31000, ''], ['Ankara skirt', 14500, ''], ['Adire scarf', 9000, 'Hand dyed'], ['Leather sandals', 16000, ''], ['Gele and cap', 12000, '']] },
  { key: 'food', email: 'nkechi@example.test', seller: 'Nkechi Seller', name: 'Mama Nkechi Kitchen', category: 'food', colours: ['#1f6f3f', '#fff1d6'], sign: 'Hot food daily', about: 'Home cooking for lunch, parties and small chops. Order ahead for big trays.', photos: 3, cookie: '', path: '', token: '', id: '',
    items: ['Jollof rice', 'Fried rice', 'Egusi soup', 'Pounded yam', 'Moi moi', 'Puff puff', 'Suya', 'Pepper soup', 'Akara', 'Fried plantain', 'Meat pie', 'Zobo drink', 'Chapman', 'Small chops tray'].map((n, at): [string, number, string] => [n, 1500 + at * 700, at % 4 === 0 ? 'Fresh today' : '']) },
  { key: 'services', email: 'tunde@example.test', seller: 'Tunde Seller', name: 'Tunde Phone Repair', category: 'repair', colours: ['#1f4e79', '#e6f0fa'], sign: 'Fixed while you wait', about: 'Screens, batteries and charging ports. Ask about your phone.', photos: 3, cookie: '', path: '', token: '', id: '', items: [] },
];

/** A JPEG made in the page (a gradient and shapes), small enough for the 150 kB cap. */
const photo = (seed: number, label: string): Promise<string> => S.eval<string>(`(() => { const c = document.createElement('canvas'); c.width = 720; c.height = 540; const x = c.getContext('2d'); const g = x.createLinearGradient(0, 0, 720, 540); g.addColorStop(0, 'hsl(' + (${seed} * 67 % 360) + ',65%,62%)'); g.addColorStop(1, 'hsl(' + ((${seed} * 67 + 110) % 360) + ',55%,36%)'); x.fillStyle = g; x.fillRect(0, 0, 720, 540); for (let i = 0; i < 9; i++) { x.fillStyle = 'hsla(' + ((${seed} * 41 + i * 30) % 360) + ',80%,75%,0.45)'; x.beginPath(); x.arc((i * 151 + ${seed} * 59) % 720, (i * 97 + ${seed} * 37) % 540, 40 + (i * 17) % 80, 0, 7); x.fill(); } x.fillStyle = '#fff'; x.font = 'bold 60px sans-serif'; x.fillText(${JSON.stringify(label)}, 36, 100); x.beginPath(); x.arc(360, 300, 110, 0, 7); x.fillStyle = 'rgba(255,255,255,0.85)'; x.fill(); return c.toDataURL('image/jpeg', 0.55).split(',')[1]; })()`);

async function setSize(b: Browser, w: number, h: number, mobile: boolean): Promise<void> { await b.setViewport({ width: w, height: h, scale: mobile ? 2 : 1, mobile }); }
/** Taps a grid of points over the canvas until `done` says a card opened; returns the point or null. */
async function scanTap(b: Browser, done: string): Promise<{ x: number; y: number } | null> {
  const box = await b.eval<{ w: number; h: number }>(`({ w: innerWidth, h: innerHeight })`);
  for (let row = 0; row < 14; row++) for (let col = 0; col < 12; col++) {
    const x = Math.round(((col + 0.5) / 12) * box.w), y = Math.round(80 + ((row + 0.5) / 14) * (box.h - 170));
    await b.tapAt(x, y); await sleep(70);
    if (await b.eval<boolean>(`!!document.querySelector('[data-si-card]')`)) {
      if (await b.eval<boolean>(`!!document.querySelector(${JSON.stringify(done)})`)) return { x, y };
      await b.click('[data-si-close]'); await sleep(150);
    } else if (done === '[data-si-page-changed]' && await b.eval<boolean>(`window.__pageChanged === true`)) return { x, y };
  }
  return null;
}
const probe = (b: Browser): Promise<{ culprits: string[]; overflow: boolean; smallest: number; shortButtons: string[]; cardBox: { top: number; bottom: number } | null; vw: number; vh: number }> => b.eval(`(() => {
  const root = document.querySelector('[data-shop-inside]'); const card = document.querySelector('[data-si-card]');
  let smallest = 99; const short = [];
  for (const el of (card || root).querySelectorAll('*')) { if (![...el.childNodes].some((n) => n.nodeType === 3 && n.textContent.trim())) continue; const cs = getComputedStyle(el); if (cs.display === 'none' || el.closest('.si-sr')) continue; smallest = Math.min(smallest, parseFloat(cs.fontSize)); }
  for (const el of (card || root).querySelectorAll('button, a')) { if (el.closest('.si-sr')) continue; const r = el.getBoundingClientRect(); if (r.width > 0 && r.height > 0 && r.height < 43.5) short.push((el.innerText || el.getAttribute('aria-label') || '').trim().slice(0, 30) + ' ' + Math.round(r.height)); }
  const r = card ? card.getBoundingClientRect() : null;
  const culprits = []; if (card) for (const el of card.querySelectorAll('*')) { const b = el.getBoundingClientRect(); if (b.width > 0 && b.right > r.right + 1) culprits.push(el.tagName + '.' + el.className + ' ' + Math.round(b.right) + '>' + Math.round(r.right)); }
  return { culprits: culprits.slice(0, 6), overflow: (card || root).scrollWidth > (card || root).clientWidth + 1, smallest, shortButtons: short, cardBox: r ? { top: Math.round(r.top), bottom: Math.round(r.bottom) } : null, vw: innerWidth, vh: innerHeight };
})()`);

try {
  await S.setViewport({ width: 1280, height: 800, scale: 1, mobile: false });
  await j.run('0', 'Setup: three sellers who may publish publish a fashion shop (8 items, 4 photos), a food shop (14 items) and a repair shop (no items)', [S], async (detail) => {
    // The first seller is this browser (it also shows the seller's own screens); the others are made over HTTP.
    await playNow(S, lab.base, shops[0]!.seller); await lab.signIn(S, shops[0]!.email); await S.goto(lab.base + '/'); await gameShown(S); await dismiss(S);
    for (const shop of shops.slice(1)) shop.cookie = await lab.account(shop.email, shop.seller);
    lab.advance(25 * HOUR); await syncClock(S, lab.offset());
    for (const shop of shops) {
      const call = (path: string, body?: unknown): Promise<Record<string, any>> => (shop.cookie ? lab.call(path, body, shop.cookie) : pageCall(S, path, body).then((r) => r.body ?? {}));
      const session = await call('/api/session'); const sid = session['session']?.id as string; must(sid, 'no session id');
      const tier = await lab.admin(`/api/admin/trust/players/${sid}/act`, { clientId: id(), action: 'verify', tier: 'phone', reason: 'journey: met in person' }); must(tier['ok'] === true, `tier: ${JSON.stringify(tier).slice(0, 200)}`);
      must((await call('/api/growth/consent', { cityId: 'lagos', age: 'adult' }))['ok'] === true, 'adult answer');
      const body = { city: 'lagos', venue: 'market', name: shop.name, category: shop.category, template: 'classic', colours: shop.colours, sign: shop.sign, logo: 'star', about: shop.about, hours: WEEK, chat: { url: `https://wa.me/23480${shops.indexOf(shop)}2345678` }, pay: { url: `https://paystack.com/pay/${shop.key}-demo` } };
      const saved = await call('/api/showcase/mine', { clientId: id(), expectedRevision: 0, ...body, services: shop.items.map(([label, priceNaira, note]) => ({ label, priceNaira, note })) });
      must(saved['ok'] === true, `save ${shop.key}: ${JSON.stringify(saved).slice(0, 300)}`);
      shop.id = saved['id'] as string;
      for (let seed = 1; seed <= shop.photos; seed++) { const up = await call('/api/showcase/mine/photos', { clientId: id(), type: 'image/jpeg', data: await photo(seed + shops.indexOf(shop) * 7, `${shop.key} ${seed}`) }); must(up['ok'] === true, `photo: ${JSON.stringify(up).slice(0, 200)}`); }
      // Every second item shows one of the shop's own photos.
      const mine = await call('/api/showcase/mine'); const ids = (mine['shop'].photos as { id: string }[]).map((p) => p.id);
      if (shop.items.length) {
        const again = await call('/api/showcase/mine', { clientId: id(), expectedRevision: mine['shop'].revision, ...body, services: shop.items.map(([label, priceNaira, note], at) => ({ label, priceNaira, note, ...(at % 2 === 0 ? { photo: ids[at % ids.length] } : {}) })) });
        must(again['ok'] === true, `save with photos: ${JSON.stringify(again).slice(0, 300)}`);
      }
      detail[shop.key] = { id: shop.id, items: shop.items.length, photos: ids.length };
    }
  });

  if (extras) await j.run('1', 'The seller\'s preview before publishing: "See my shop in 3D" from My shop shows the saved shop with a Preview mark', [S], async (detail) => {
    await S.setViewport({ width: 1280, height: 800, scale: 1, mobile: false });
    await S.goto(lab.base + '/'); await gameShown(S); await dismiss(S); await syncClock(S, lab.offset());
    if (!(await visible(S, '.ph-appbtn'))) await S.click('[data-nav="phone"]');
    for (let i = 0; i < 3 && !(await visible(S, '.sc-app')); i++) { if (await visible(S, '.ph-appbtn', 'Services')) await S.click('.ph-appbtn', 'Services'); await S.waitFor(`!!document.querySelector('.sc-app')`, 8000, 'Services').catch(() => undefined); }
    await S.waitFor(`!!document.querySelector('.sc-app')`, 8000, 'the Services app');
    await S.click('.sc-tabs [role="tab"]', 'My shop');
    await S.waitFor(`!!document.querySelector('[data-see-3d]')`, 30000, 'See my shop in 3D');
    await S.click('[data-see-3d]');
    await S.waitFor(`!!document.querySelector('[data-si-view="room"]')`, 90000, 'the room');
    await sleep(3500);
    detail['preview'] = await visible(S, '[data-si-preview]');
    await j.shot(S, 'seller-preview-room');
    must(detail['preview'] === true, 'no Preview mark');
    await S.click('[data-si-about]'); await sleep(1800);
    detail['previewCard'] = (await text(S, '[data-si-card]')).replace(/\s+/g, ' ').slice(0, 300);
    await j.shot(S, 'seller-preview-counter');
    must(!(await visible(S, '[data-si-report]')), 'a seller is offered a report of their own shop');
    await S.click('[data-si-exit]'); await sleep(700);
    detail['backInMyShop'] = await visible(S, '[data-showcase-editor]') || await visible(S, '.sc-app');
  });

  await j.run('2', 'Operator approves the three shops; each seller makes the public link', [S], async (detail) => {
    for (const shop of shops) {
      const sub = shop.cookie ? await lab.call('/api/showcase/mine/submit', { clientId: id() }, shop.cookie) : (await pageCall(S, '/api/showcase/mine/submit', { clientId: id() })).body;
      must(sub['status'] === 'review', `submit ${shop.key}: ${JSON.stringify(sub).slice(0, 200)}`);
      const done = await lab.mod('/api/mod/showcase', { action: 'approve', shop: shop.id }); must(done['status'] === 'live', `approve ${shop.key}`);
      const shared = shop.cookie ? await lab.call('/api/showcase/mine/share', { clientId: id() }, shop.cookie) : (await pageCall(S, '/api/showcase/mine/share', { clientId: id() })).body; must(shared['ok'] === true && shared['path'], `share ${shop.key}`);
      shop.path = shared['path'] as string; shop.token = shop.path.slice(-8);
      detail[shop.key] = lab.base + shop.path;
    }
  });

  const checks: string[] = [];
  const summary: Record<string, Record<string, unknown>> = {};
  const only = arg('only', ''), onlySize = arg('size', '');
  for (const shop of shops) for (const [label, w, h, mobile] of sizes) {
    if ((only && !only.split(',').includes(shop.key)) || (onlySize && !onlySize.split(',').includes(label))) continue;
    await j.run(`3-${shop.key}-${label}`, `A fresh guest opens ${shop.name}'s link at ${label}, taps "Step inside", and is in the 3D shop`, [], async (detail) => {
      const V = await Browser.second(debugPort, S);
      try {
        await setSize(V, w, h, mobile);
        await V.goto(lab.base + shop.path);
        await V.waitFor(`document.querySelector('.inside .btn')`, 30000, 'Step inside on the public page');
        const linkText = await text(V, 'main'); detail['pageHasLinks'] = /Message the seller/.test(linkText) && /Pay the seller/.test(linkText);
        await V.click('.inside .btn', 'Step inside');
        await V.waitFor(`!!document.querySelector('[data-qs-name]')`, 90000, 'the start screen');
        // The start screen offers a name already; on a very small screen its action bar covers the name field, so a name is typed only where the field can be reached.
        await sleep(500); await V.type('[data-qs-name]', 'Visitor Vera').catch(() => undefined); await V.click('[data-key="play-now"]');
        await V.waitFor(`!!document.querySelector('[data-si-view="room"]')`, 150000, 'the room');
        await sleep(4000);
        detail['address'] = await V.eval<string>(`location.pathname + location.search`);
        detail['drawn'] = await V.eval<boolean>(`(() => { const c = document.querySelector('[data-shop-inside] canvas'); return !!c && c.clientWidth > 100 && c.clientHeight > 100 })()`);
        await j.shot(V, `${shop.key}-${label}-1-entry`);
        // a close view of the shelves
        await V.click('[data-si-view="left"]'); await sleep(2200);
        await j.shot(V, `${shop.key}-${label}-2-shelves`);
        // an item card
        if (shop.items.length) {
          const hit = await scanTap(V, '[data-si-item-name]');
          must(hit, 'no item could be tapped on the shelves');
          await sleep(500);
          const open = await text(V, '[data-si-card]'); detail['itemCard'] = open.replace(/\s+/g, ' ').slice(0, 200);
          const href = await V.eval<string>(`(document.querySelector('[data-si-message]') || {}).href || ''`), pay = await V.eval<string>(`(document.querySelector('[data-si-pay]') || {}).href || ''`);
          detail['message'] = href.slice(0, 160); detail['pay'] = pay;
          const names = shop.items.map(([n]) => n);
          must(names.some((n) => open.includes(n)) && /₦/.test(open) || /Ask for the price/.test(open), `the card says: ${open.slice(0, 120)}`);
          must(href.startsWith('https://wa.me/') && decodeURIComponent(href).includes(shop.name), `message link: ${href}`);
          must(pay.startsWith('https://paystack.com/pay/'), `pay link: ${pay}`);
          must(/Allworld takes no orders and never holds or moves your money/.test(open), 'the deal line is missing');
          must(await visible(V, '[data-si-report]'), 'no way to report the shop');
          const p = await probe(V); detail['cardProbe'] = p;
          must(!p.overflow && p.shortButtons.length === 0 && p.smallest >= 11.5, `the card at ${label}: ${JSON.stringify(p)}`);
          await j.shot(V, `${shop.key}-${label}-3-item-card`);
          await V.click('[data-si-close]'); await sleep(300);
        }
        // the counter card
        await V.click('[data-si-view="counter"]'); await sleep(2200);
        await j.shot(V, `${shop.key}-${label}-4-counter-view`);
        const counter = await scanTap(V, '[data-si-shop-name]');
        must(counter, 'the counter or the shopkeeper could not be tapped');
        await sleep(400);
        detail['counterCard'] = (await text(V, '[data-si-card]')).replace(/\s+/g, ' ').slice(0, 300);
        must((await text(V, '[data-si-card]')).includes(shop.name) && /Opening hours|Mon/.test(await text(V, '[data-si-card]')), 'the counter card has no shop name or hours');
        const p2 = await probe(V); detail['counterProbe'] = p2; must(!p2.overflow && p2.shortButtons.length === 0, `the counter card at ${label}: ${JSON.stringify(p2)}`);
        await j.shot(V, `${shop.key}-${label}-5-counter-card`);
        await V.click('[data-si-close]'); await sleep(300);
        // the second page, by the arrow on the wall
        if (shop.items.length > 12) {
          await V.click('[data-si-view="room"]'); await sleep(1500);
          await V.eval(`document.querySelector('[data-shop-inside] canvas').focus(); true`);
          for (let i = 0; i < 8; i++) { await V.press('ArrowRight', 'ArrowRight', 39); await sleep(40); }
          for (let i = 0; i < 4; i++) { await V.press('ArrowUp', 'ArrowUp', 38); await sleep(40); }
          await sleep(700);
          detail['chipBefore'] = (await text(V, '[data-si-more]')).trim();
          await j.shot(V, `${shop.key}-${label}-6-page-arrow`);
          await V.eval(`window.__pageChanged = false; new MutationObserver(() => { window.__pageChanged = true }).observe(document.querySelector('[data-si-more]'), { childList: true, characterData: true, subtree: true }); true`);
          const arrow = await scanTap(V, '[data-si-page-changed]');
          must(arrow, 'the arrow on the wall could not be tapped');
          await sleep(600);
          detail['chipAfter'] = (await text(V, '[data-si-more]')).trim();
          must(detail['chipBefore'] !== detail['chipAfter'] && /2\/2/.test(String(detail['chipAfter'])), `the page did not change: ${detail['chipBefore']} -> ${detail['chipAfter']}`);
          await V.click('[data-si-view="room"]'); await sleep(1800);
          await j.shot(V, `${shop.key}-${label}-7-page-two`);
        }
        if (!shop.items.length) {
          detail['emptyHint'] = await visible(V, '[data-si-empty]');
          await V.click('[data-si-view="room"]'); await sleep(1500);
          await j.shot(V, `${shop.key}-${label}-6-opening-soon`);
          must(detail['emptyHint'] === true, 'no opening-soon line');
        }
        // leave: back in the game
        await V.click('[data-si-exit]'); await sleep(900);
        detail['backInGame'] = await V.eval<boolean>(`!!document.querySelector('.hud-cash') && !document.querySelector('[data-shop-room]')`);
        await j.shot(V, `${shop.key}-${label}-8-after-leaving`);
        must(detail['backInGame'], 'the room did not close into the game');
        must(detail['drawn'], 'the canvas was not drawn');
        checks.push(`${shop.key} ${label}: ok`);
        (summary[`${shop.key} ${label}`] ??= {}).errors = realErrors(V);
      } catch (error) { await j.shot(V, `${shop.key}-${label}-FAILED`).catch(() => ''); throw error; } finally { V.close(); }
    });
  }

  if (extras) await j.run('4', 'Step inside from the Services app: a fresh guest opens a shop page and the 3D room; Message the seller there asks for an account (it is released, not published)', [], async (detail) => {
    const V = await Browser.second(debugPort, S);
    try {
      await setSize(V, 390, 844, true);
      await V.goto(lab.base + '/'); await V.waitFor(`!!document.querySelector('[data-qs-name]')`, 90000, 'the start screen');
      await sleep(500); await V.type('[data-qs-name]', 'Visitor Vera'); await V.click('[data-key="play-now"]');
      await V.waitFor(`!!document.querySelector('.hud-cash') && !document.querySelector('[data-cr-root]')`, 120000, 'the game');
      await dismiss(V, 9000);
      const page = shops[0]!;
      if (!(await visible(V, '.ph-appbtn'))) await V.click('[data-nav="phone"]');
      for (let i = 0; i < 3 && !(await visible(V, '.sc-app')); i++) { if (await visible(V, '.ph-appbtn', 'Services')) await V.click('.ph-appbtn', 'Services'); await V.waitFor(`!!document.querySelector('.sc-app')`, 8000, 'Services').catch(() => undefined); }
      await V.waitFor(`!!document.querySelector('.sc-app')`, 8000, 'the Services app');
      await V.waitFor(`!!document.querySelector('.sc-hit')`, 30000, 'the list'); await V.click('.sc-hit', page.name);
      await V.waitFor(`!!document.querySelector('[data-step-inside]')`, 30000, 'Step inside on the shop page');
      await j.shot(V, 'services-shop-page');
      await V.click('[data-step-inside]');
      await V.waitFor(`!!document.querySelector('[data-si-view="room"]')`, 90000, 'the room'); await sleep(3500);
      await j.shot(V, 'services-room');
      await V.click('[data-si-about]'); await sleep(1800);
      await V.click('[data-si-message]'); await sleep(900);
      detail['note'] = (await text(V, '[data-si-card]')).replace(/\s+/g, ' ').slice(-260);
      await j.shot(V, 'services-message-needs-account');
      must(/Sign in to message or pay/.test(String(detail['note'])), `the card says: ${detail['note']}`);
      // A signed-in adult asks again: the link is released through the "leaving" sheet, which sits above the room.
      await lab.signIn(V, 'buyer@example.test');
      must((await pageCall(V, '/api/growth/consent', { cityId: 'lagos', age: 'adult' })).body?.ok === true, 'adult answer');
      await V.click('[data-si-message]'); await V.waitFor(`!!document.querySelector('[data-trust-leave]')`, 15000, 'the leaving sheet'); await sleep(600);
      detail['leaving'] = (await text(V, '[data-trust-leave]')).replace(/\s+/g, ' ').slice(0, 200);
      await j.shot(V, 'services-leaving-sheet');
      must(/leaving Allworld/i.test(String(detail['leaving'])), `the sheet says: ${detail['leaving']}`);
      await V.click('[data-trust-back]'); await sleep(500);
      await V.click('[data-si-exit]'); await sleep(900);
      detail['backOnShopPage'] = await visible(V, '[data-step-inside]');
      must(detail['backOnShopPage'], 'leaving did not bring the visitor back to the shop page');
    } finally { V.close(); }
  });

  if (extras) await j.run('5', 'A link that is not a shop: a fresh guest keeps the existing refusal, and a published shop that is hidden afterwards is refused too', [], async (detail) => {
    const V = await Browser.second(debugPort, S);
    try {
      await setSize(V, 390, 844, true);
      await V.goto(lab.base + '/shop/zzzzzzzz'); await sleep(500);
      detail['gonePage'] = (await text(V, 'main')).replace(/\s+/g, ' ');
      must(/This shop is not available/.test(String(detail['gonePage'])), 'the plain page is not shown');
      await V.goto(`${lab.base}/?go=shop&shop=zzzzzzzz`); await V.waitFor(`!!document.querySelector('[data-qs-name]')`, 90000, 'the start screen');
      await sleep(500); await V.type('[data-qs-name]', 'Visitor Vera'); await V.click('[data-key="play-now"]');
      await V.waitFor(`!!document.querySelector('[data-si-gone]')`, 120000, 'the refusal');
      detail['refusal'] = (await text(V, '[data-si-gone]')).replace(/\s+/g, ' ');
      await j.shot(V, 'not-a-shop');
      must(/not available/.test(String(detail['refusal'])), 'no refusal');
      await V.click('[data-si-gone] button'); await sleep(700);
      must(await visible(V, '.hud-cash'), 'the game is not there after the refusal');
    } finally { V.close(); }
  });
  j.notes.push(...checks);
} catch (e) { console.log('ERR', e); }
finally {
  const code = j.finish({ shops: shops.map((s) => ({ key: s.key, path: s.path })) }, { seller: realErrors(S) });
  try {
    const files = readdirSync(arg('out')).filter((f) => f.endsWith('.png')).sort();
    // One page for every run in the folder (a run is one tag): the steps of each, then every picture.
    const runs = readdirSync(arg('out')).filter((f) => /^shopinside-.*\.json$/.test(f)).sort().map((f) => JSON.parse(readFileSync(join(arg('out'), f), 'utf8')) as { feature: string; steps: { step: string; status: string; name: string }[] });
    const steps = runs.flatMap((run) => run.steps.map((s) => `<tr><td>${run.feature.replace('shopinside-', '')}</td><td>${s.step}</td><td>${s.status}</td><td>${s.name.replace(/</g, '&lt;')}</td></tr>`)).join('');
    writeFileSync(join(arg('out'), 'index.html'), `<!doctype html><meta charset="utf-8"><title>The 3D shop</title><style>body{font:15px system-ui;margin:24px;max-width:1300px}table{border-collapse:collapse}td{border:1px solid #ccc;padding:4px 8px}figure{display:inline-block;margin:8px;vertical-align:top}img{max-width:380px;border:1px solid #ccc}</style><h1>The 3D shop</h1><p>Every picture was taken from a real run: a seller published each shop, a fresh guest opened its public link and tapped Step inside. File names say the shop, the size and the view.</p><table><tr><th>run</th><th>step</th><th>result</th><th>what</th></tr>${steps}</table>${files.map((f) => `<figure><a href="${f}"><img src="${f}" loading="lazy"></a><figcaption>${f}</figcaption></figure>`).join('')}`);
  } catch { /* the evidence page is a courtesy */ }
  try { S.close(); } catch { /* closed */ }
  await lab.stop(); process.exit(code);
}
