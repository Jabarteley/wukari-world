#!/usr/bin/env node
/**
 * Settle-in journey (round four): a fresh guest via "Play now" meets every place that says "settle in" (the standing home-screen entry,
 * the Local government sheet, the travel card, a refusal toast, the hints), finishes (or leaves) the settle screen and must land back on the
 * sheet they came from. Then a settled player must never see the entry, the hints or the buttons, and opens and closes the common
 * panels (Messages, Bank, Map, Community, a venue) without a console error or a blank panel. Local loopback server, no outside request.
 *
 *   node --experimental-strip-types --no-warnings scripts/journeys/settle.ts --out <folder> [--port 4391] [--debug-port 4392]
 */
import { Browser, sleep } from './cdp.ts';
import { startLab } from './lab.ts';
import { Journey, arg, desktop, gameShown, must, phone, playNow, realErrors, text, until, visible } from './kit.ts';

const lab = await startLab(Number(arg('port', '4391')));
const root = await Browser.launch(Number(arg('debug-port', '4392')));
const j = new Journey(arg('out'), 'settle');
const debugPort = Number(arg('debug-port', '4392'));
const pages: Browser[] = [];
for (const sig of ['SIGINT', 'SIGTERM'] as const) process.once(sig, () => { try { root.child.kill('SIGKILL'); } catch { /* gone */ } process.exit(130); });

/** The guide's tour covers the screen on a phone: skip it when it shows. */
async function skipTour(p: Browser): Promise<void> {
  for (let i = 0; i < 4; i++) {
    const shown = await p.eval<boolean>(`[...document.querySelectorAll('button')].some((b) => /Skip tour/i.test(b.innerText) && b.getBoundingClientRect().width > 1)`);
    if (!shown) { await sleep(600); continue; }
    await p.click('button', 'Skip tour'); await sleep(800);
  }
}
/** A new guest in an isolated context (the first uses the launch page). */
async function guest(name: string, size?: [number, number]): Promise<Browser> {
  const p = pages.length === 0 ? root : await Browser.second(debugPort, root);
  pages.push(p);
  if (size) await phone(p, size[0], size[1]); else await desktop(p);
  await playNow(p, lab.base, name); await skipTour(p);
  return p;
}
const settleUi = (p: Browser): Promise<{ entry: boolean; notices: number; buttons: number; toastButtons: number }> => p.eval(`(() => { const v = (e) => e.getBoundingClientRect().width > 1 && e.getBoundingClientRect().height > 1; return { entry: [...document.querySelectorAll('[data-settle-entry]')].some(v), notices: [...document.querySelectorAll('[data-settle-notice]')].filter(v).length, buttons: [...document.querySelectorAll('button')].filter((b) => v(b) && /Settle in now/.test(b.innerText)).length, toastButtons: [...document.querySelectorAll('.toast button')].filter((b) => /Settle in now/.test(b.innerText)).length }; })()`);
const toasts = (p: Browser): Promise<string[]> => p.eval(`[...document.querySelectorAll('.toast')].map((t) => t.innerText.replace(/\\s+/g, ' ').trim())`);
async function openLga(p: Browser): Promise<string> {
  if (!(await p.eval<boolean>(`!!document.querySelector('.m3-lga')`))) { await p.click('[data-nav="map"]'); await p.waitFor(`!!document.querySelector('.m3-lga')`, 30000, 'the city map with its local governments'); await sleep(1500); }
  await p.eval(`document.querySelector('.m3-lga').click(); true`);
  await p.waitFor(`!!document.querySelector('[data-lga-card]') && [...document.querySelectorAll('[data-lga-card]')].some((e) => e.getBoundingClientRect().width > 1)`, 15000, 'the Local government sheet'); await sleep(600);
  return p.eval<string>(`(() => { const t = [...document.querySelectorAll('h2, h3, .base-sheet-title, [class*=sheet] b')].map((e) => e.innerText.trim()).filter((x) => x && !/Local government|Settle|Live here/i.test(x))[0]; return t || ''; })()`);
}
const bannerProbe = (p: Browser): Promise<Record<string, unknown>> => p.eval(`(() => {
  const n = [...document.querySelectorAll('[data-settle-notice]')].find((e) => e.getBoundingClientRect().width > 1); if (!n) return { found: false };
  const r = n.getBoundingClientRect(), para = n.querySelector('p'), btn = n.querySelector('button'), br = btn.getBoundingClientRect();
  const top = document.elementFromPoint(br.left + br.width / 2, br.top + br.height / 2);
  const lh = parseFloat(getComputedStyle(para).lineHeight) || 18;
  return { found: true, box: [Math.round(r.left), Math.round(r.top), Math.round(r.width), Math.round(r.height)], text: para.innerText, textClipped: para.scrollHeight > para.clientHeight + 1 || n.scrollWidth > n.clientWidth + 1, lines: Math.round(para.getBoundingClientRect().height / lh), withinViewport: r.left >= 0 && r.right <= innerWidth, button: btn.innerText.trim(), buttonBox: [Math.round(br.width), Math.round(br.height)], buttonTappable: !!top && (top === btn || btn.contains(top)), buttonOnScreen: br.bottom <= innerHeight && br.top >= 0 };
})()`);
/** Taps the primary footer button of the settle screen and reports what it is. */
async function crStep(p: Browser): Promise<{ step: string; primary: string }> {
  return p.eval(`(() => { const r = document.querySelector('[data-cr-root]'); const bs = [...r.querySelectorAll('button')].filter((b) => b.getBoundingClientRect().width > 1 && !b.disabled); const go = bs.reverse().find((b) => /^(Next|Start|Settle|Finish|Done|Save|Continue|Make)/i.test(b.innerText.trim())); if (go) go.setAttribute('data-go', '1'); return { step: r.dataset.step || '', primary: go ? go.innerText.trim() : '' }; })()`);
}
async function finishSettling(p: Browser, detail: Record<string, unknown>, areaHint = ''): Promise<void> {
  await p.waitFor(`!!document.querySelector('[data-cr-root]')`, 20000, 'the settle screen'); await sleep(2500);
  const seen: string[] = [];
  for (let i = 0; i < 8; i++) {
    if (!(await p.eval<boolean>(`!!document.querySelector('[data-cr-root]')`))) break;
    const step = await p.eval<string>(`document.querySelector('[data-cr-root]').dataset.step || ''`);
    if (step === 'home') {
      const key = await p.eval<string>(`(() => { const ks = [...document.querySelectorAll('[data-key^="area:"]')].map((e) => e.getAttribute('data-key')); const hint = ${JSON.stringify(areaHint.toLowerCase().replace(/[^a-z]+/g, '-'))}; return (hint && ks.find((k) => k.endsWith(hint))) || 'area:random'; })()`);
      await p.eval(`document.querySelector('[data-key="${key}"]').click(); true`); await sleep(1200);
      detail['areaChosen'] = key;
    }
    const s = await crStep(p); seen.push(`${s.step}:${s.primary}`);
    if (!s.primary) { await sleep(1500); continue; }
    await p.eval(`document.querySelector('[data-go="1"]').click(); true`); await sleep(2500);
  }
  detail['creatorSteps'] = seen;
  await p.waitFor(`!document.querySelector('[data-cr-root]')`, 90000, 'the settle screen to close');
  await sleep(1500);
}
const lifeOf = (p: Browser): Promise<any> => p.eval(`fetch('/api/life?city=lagos').then((r) => r.json()).then((b) => b.state)`);

const state: Record<string, unknown> = {};
try {
  // ---------------------------------------------------------------- A: the Local government sheet, desktop
  let A!: Browser;
  await j.run('A1', 'Fresh guest via Play now: the home screen carries the standing "Settle in: get your home" entry', [root], async (detail) => {
    A = await guest('Settle Ada');
    const e = await A.eval<any>(`(() => { const c = [...document.querySelectorAll('[data-settle-entry]')].find((x) => x.getBoundingClientRect().width > 1); if (!c) return null; const r = c.getBoundingClientRect(); return { text: c.innerText.replace(/\\s+/g, ' '), box: [Math.round(r.left), Math.round(r.top), Math.round(r.width), Math.round(r.height)] }; })()`);
    detail['entry'] = e; await j.shot(A, 'home-entry');
    must(e && /Settle in: get your home/.test(e.text), 'no standing "Settle in: get your home" entry on the home screen');
  });
  await j.run('A2', 'Local government sheet: "Settle in first" hint with a button; "This is my local government" gives a banner that wraps fully and carries "Settle in now"', [A], async (detail) => {
    detail['lga'] = await openLga(A);
    detail['hintBanner'] = await bannerProbe(A); await j.shot(A, 'lga-hint');
    await A.click('button', 'This is my local government'); await sleep(1500);
    detail['toastsAfterTry'] = await toasts(A); detail['bannerAfterTry'] = await bannerProbe(A); detail['ui'] = await settleUi(A);
    await j.shot(A, 'lga-after-try');
    const b = detail['bannerAfterTry'] as any;
    must(b.found && /Settle in now/.test(b.button) && !b.textClipped && b.withinViewport && b.buttonTappable, `banner: ${JSON.stringify(b)}`);
    must((detail['ui'] as any).toastButtons >= 1 || (detail['ui'] as any).buttons >= 1, 'no "Settle in now" button after the refusal');
  });
  await j.run('A3', '"Not now" on the settle screen returns to the Local government sheet', [A], async (detail) => {
    await A.click('[data-settle-notice] button', 'Settle in now').catch(async () => { await A.click('button', 'Settle in now'); });
    await A.waitFor(`!!document.querySelector('[data-cr-root]')`, 20000, 'the settle screen'); await sleep(2500); await j.shot(A, 'settle-open-from-lga');
    detail['stepOnOpen'] = await A.eval<string>(`document.querySelector('[data-cr-root]').dataset.step`);
    await A.click('[data-cr-root] button', 'Not now'); await sleep(2000);
    detail['backOnSheet'] = await A.eval<boolean>(`[...document.querySelectorAll('.base-sheet, [role=dialog]')].some((e) => e.getBoundingClientRect().width > 1 && /Local government/i.test(e.innerText))`); await j.shot(A, 'after-not-now');
    must(detail['backOnSheet'], 'after "Not now" the Local government sheet is not shown again');
  });
  await j.run('A4', 'Settle screen finished from the Local government sheet: back on that sheet, and "This is my local government" now works', [A], async (detail) => {
    await A.click('[data-settle-notice] button', 'Settle in now'); await finishSettling(A, detail);
    await j.shot(A, 'after-settle'); detail['backOnSheet'] = await A.eval<boolean>(`[...document.querySelectorAll('.base-sheet, [role=dialog]')].some((e) => e.getBoundingClientRect().width > 1 && /Local government/i.test(e.innerText))`);
    const life = await lifeOf(A); detail['settled'] = { done: life.onboarding?.done, guest: life.onboarding?.guest, home: life.estate?.lga?.name ?? life.estate?.lga ?? null };
    detail['uiAfter'] = await settleUi(A); await sleep(6000); detail['uiAfterSixSeconds'] = await settleUi(A);
    // the action: tap it if it is on screen (the player may now live there already)
    const can = await visible(A, 'button', 'This is my local government');
    if (can) { await A.click('button', 'This is my local government'); await sleep(2000); detail['toastsAfterAction'] = await toasts(A); detail['uiAfterAction'] = await settleUi(A); }
    else detail['actionButton'] = 'not offered (the sheet shows the player\'s own local government now)';
    detail['sheetText'] = (await text(A, '[data-lga-card]')).replace(/\s+/g, ' ').slice(0, 300); await j.shot(A, 'lga-after-action');
    must(detail['backOnSheet'], 'after settling the player is not back on the Local government sheet');
    must((detail['settled'] as any).done === true, `the life is not settled: ${JSON.stringify(detail['settled'])}`);
    must((detail['uiAfter'] as any).notices === 0 && (detail['uiAfter'] as any).buttons === 0 && !(detail['uiAfter'] as any).entry, `settle UI still shows right after settling (after 6 s: ${JSON.stringify(detail['uiAfterSixSeconds'])}): ${JSON.stringify(detail['uiAfter'])}`);
    if (can) must(((detail['uiAfterAction'] as any)?.toastButtons ?? 0) === 0 && !(detail['toastsAfterAction'] as string[]).some((t) => /Settle in/.test(t)), `the action was refused again: ${JSON.stringify(detail['toastsAfterAction'])}`);
  });
  await j.run('A5', 'A SETTLED player never sees the entry, the hints or the buttons (home, Houses, Boutique, Missions, My land, map travel card)', [A], async (detail) => {
    await A.eval(`document.querySelectorAll('.base-sheet-close').forEach((b) => b.click()); true`); await sleep(800);
    for (const nav of ['home']) await A.click(`[data-nav="${nav}"]`).catch(() => undefined);
    await sleep(1000); detail['home'] = await settleUi(A);
    const apps: Record<string, unknown> = {};
    await A.click('[data-nav="phone"]'); await A.waitFor(`!!document.querySelector('.ph-pages')`, 10000, 'the phone'); await sleep(1200);
    for (const app of ['houses', 'boutique', 'missions', 'land']) {
      await A.click(`[data-ph-app="${app}"]`); await A.waitFor(`!!document.querySelector('.ph-appbody')`, 10000, app); await sleep(2200);
      apps[app] = await settleUi(A); await j.shot(A, `settled-${app}`);
      await A.click('.ph-back'); await A.waitFor(`!!document.querySelector('.ph-pages')`, 10000, 'home'); await sleep(700);
    }
    detail['apps'] = apps;
    must((detail['home'] as any).entry === false && (detail['home'] as any).buttons === 0, `home: ${JSON.stringify(detail['home'])}`);
    for (const [k, v] of Object.entries(apps) as [string, any][]) must(v.notices === 0 && v.buttons === 0 && v.toastButtons === 0, `${k} still shows a settle hint or button: ${JSON.stringify(v)}`);
  });

  // ---------------------------------------------------------------- B: the travel card (fresh guest)
  let B!: Browser;
  await j.run('B', 'Travel card to another city (Kigali): "Settle in now" on the card; Not now returns to the map; finishing settles; the card then has no settle button', [root], async (detail) => {
    B = await guest('Settle Bola');
    const mapAt = async (): Promise<void> => {
      await B.click('[data-nav="map"]'); await B.waitFor(`!!document.querySelector('.map-levels-cur, [data-atlas-levels]')`, 30000, 'the map'); await sleep(1200);
      if (!(await B.eval<boolean>(`!!document.querySelector('[data-atlas-levels]') && document.querySelector('[data-atlas-levels]').getBoundingClientRect().width > 1`))) { await B.click('.map-levels-cur'); await B.click('[data-map-level="africa"]'); }
      else if (!(await B.eval<string>(`document.querySelector('[data-atlas-levels]').textContent.trim().toLowerCase()`)).startsWith('africa')) { await B.click('[data-atlas-levels]'); await B.click('[data-atlas-level="1"]'); }
      await B.waitFor(`document.querySelector('[data-atlas-levels]') && document.querySelector('[data-atlas-levels]').textContent.trim().toLowerCase().startsWith('africa')`, 30000, 'the Africa map');
    };
    const pickKigali = async (): Promise<void> => {
      if (!(await B.eval<boolean>(`!!document.querySelector('[data-atlas-search]') && document.querySelector('[data-atlas-search]').getBoundingClientRect().width > 1`))) await B.click('[data-atlas-list]').catch(() => undefined);
      await B.waitFor(`!!document.querySelector('[data-atlas-search]') && document.querySelector('[data-atlas-search]').getBoundingClientRect().width > 1`, 15000, 'the search box');
      await B.type('[data-atlas-search]', 'Rwanda'); await B.click('[data-atlas-pick]', 'Rwanda');
      await B.waitFor(`!!document.querySelector('.atlas-travel')`, 30000, 'the travel card');
    };
    await mapAt(); await pickKigali();
    detail['card'] = await B.eval<unknown>(`(() => { const c = document.querySelector('.atlas-travel'); const b = c.querySelector('[data-atlas-settle]'); const r = b && b.getBoundingClientRect(); return { text: c.innerText.replace(/\\s+/g, ' ').slice(0, 300), settleButton: !!b, tappable: !!r && !!document.elementFromPoint(r.left + r.width / 2, r.top + r.height / 2) && (document.elementFromPoint(r.left + r.width / 2, r.top + r.height / 2) === b || b.contains(document.elementFromPoint(r.left + r.width / 2, r.top + r.height / 2))) }; })()`); await j.shot(B, 'travel-card-settle');
    must((detail['card'] as any).settleButton, 'the travel card of a guest has no "Settle in now" button');
    await B.click('[data-atlas-settle]'); await B.waitFor(`!!document.querySelector('[data-cr-root]')`, 20000, 'the settle screen'); await sleep(2500);
    await B.click('[data-cr-root] button', 'Not now'); await sleep(2500);
    detail['afterNotNow'] = { card: await B.eval<boolean>(`!!document.querySelector('.atlas-travel') && document.querySelector('.atlas-travel').getBoundingClientRect().width > 1`), map: await B.eval<boolean>(`!!document.querySelector('[data-atlas-levels]') && document.querySelector('[data-atlas-levels]').getBoundingClientRect().width > 1`) }; await j.shot(B, 'travel-after-not-now');
    if (!(detail['afterNotNow'] as any).card) { await mapAt(); await pickKigali(); detail['cardReopened'] = true; }
    await B.click('[data-atlas-settle]'); await finishSettling(B, detail);
    detail['afterSettle'] = { card: await B.eval<boolean>(`!!document.querySelector('.atlas-travel') && document.querySelector('.atlas-travel').getBoundingClientRect().width > 1`), map: await B.eval<boolean>(`!!document.querySelector('[data-atlas-levels]') && document.querySelector('[data-atlas-levels]').getBoundingClientRect().width > 1`) }; await j.shot(B, 'travel-after-settle');
    if (!(detail['afterSettle'] as any).card) { await mapAt().catch(() => undefined); await pickKigali().catch(() => undefined); }
    detail['settledCard'] = await B.eval<unknown>(`(() => { const c = document.querySelector('.atlas-travel'); return c ? { settleButton: !!c.querySelector('[data-atlas-settle]'), text: c.innerText.replace(/\\s+/g, ' ').slice(0, 200) } : null; })()`); await j.shot(B, 'travel-card-settled');
    detail['returnedTo'] = detail['afterSettle'];
    must((detail['afterNotNow'] as any).card || (detail['afterNotNow'] as any).map, '"Not now" did not return to the map/travel card');
    must((detail['afterSettle'] as any).card || (detail['afterSettle'] as any).map, 'after settling the player is not back on the map/travel card');
    must(!((detail['settledCard'] as any)?.settleButton), 'a settled player still sees "Settle in now" on the travel card');
  });

  // ---------------------------------------------------------------- C: a refusal toast
  let C!: Browser;
  await j.run('C', 'Houses app (the controls are disabled for a guest, with the hint and the button): "Settle in now" from the app, "Not now" and finishing both return to the Houses app; Boutique, Missions and My land carry the same button', [root], async (detail) => {
    C = await guest('Settle Cara');
    const openApp = async (app: string): Promise<void> => { if (!(await visible(C, '.ph-pages'))) { await C.click('[data-nav="phone"]').catch(() => undefined); await C.waitFor(`!!document.querySelector('.ph-pages')`, 10000, 'home'); await sleep(800); } await C.click(`[data-ph-app="${app}"]`); await C.waitFor(`!!document.querySelector('.ph-appbody')`, 10000, app); await sleep(2500); };
    const hints: Record<string, unknown> = {};
    for (const app of ['boutique', 'missions', 'land', 'houses']) {
      await openApp(app); hints[app] = await settleUi(C); await j.shot(C, `guest-${app}-hint`);
      if (app !== 'houses') { await C.click('.ph-back'); await C.waitFor(`!!document.querySelector('.ph-pages')`, 10000, 'home'); await sleep(700); }
    }
    detail['hints'] = hints;
    await C.click('.ph-appbody button', 'Settle in now'); await C.waitFor(`!!document.querySelector('[data-cr-root]')`, 20000, 'the settle screen'); await sleep(2500);
    await C.click('[data-cr-root] button', 'Not now'); await sleep(2500);
    detail['afterNotNow'] = await C.eval<string>(`document.querySelector('.ph-appbody') ? document.querySelector('.ph-appbody').innerText.replace(/\\s+/g, ' ').slice(0, 80) : ''`); await j.shot(C, 'houses-after-not-now');
    await C.click('.ph-appbody button', 'Settle in now'); await finishSettling(C, detail);
    detail['returnedToApp'] = await C.eval<string>(`document.querySelector('.ph-appbody') ? document.querySelector('.ph-appbody').innerText.replace(/\\s+/g, ' ').slice(0, 80) : ''`); await j.shot(C, 'houses-after-settle');
    detail['ui'] = await settleUi(C);
    for (const [k, v] of Object.entries(hints) as [string, any][]) must(v.buttons >= 1, `${k} has no "Settle in now" for a guest: ${JSON.stringify(v)}`);
    must(/House|home|Choose|Move/i.test(String(detail['afterNotNow'])), `"Not now" did not return to the Houses app: "${detail['afterNotNow']}"`);
    must(/House|home|Choose|Move|Invite/i.test(String(detail['returnedToApp'])), `after settling the player is not back in the Houses app: "${detail['returnedToApp']}"`);
    must((detail['ui'] as any).buttons === 0 && (detail['ui'] as any).notices === 0, `settle UI still shows: ${JSON.stringify(detail['ui'])}`);
  });

  // ---------------------------------------------------------------- D: phone sizes
  for (const [w, h] of [[390, 844], [320, 568]] as [number, number][]) {
    await j.run(`P${w}`, `Simulated phone ${w}x${h}: standing entry, Local government banner (wraps fully, button tappable), settle screen and "Not now" back to the sheet${w === 390 ? '; finishing returns to the sheet' : ''}`, [root], async (detail) => {
      const P = await guest(`Phone ${w}`, [w, h]);
      detail['entry'] = await P.eval<unknown>(`(() => { const c = [...document.querySelectorAll('[data-settle-entry]')].find((x) => x.getBoundingClientRect().width > 1); if (!c) return null; const r = c.getBoundingClientRect(); return { text: c.innerText.replace(/\\s+/g, ' '), box: [Math.round(r.left), Math.round(r.top), Math.round(r.width), Math.round(r.height)], overflow: r.right > innerWidth }; })()`); await j.shot(P, `phone${w}-entry`);
      detail['lga'] = await openLga(P); detail['hint'] = await bannerProbe(P); await j.shot(P, `phone${w}-lga-hint`);
      await P.click('button', 'This is my local government'); await sleep(1500);
      detail['banner'] = await bannerProbe(P); detail['toasts'] = await toasts(P); await j.shot(P, `phone${w}-lga-after-try`);
      await P.click('[data-settle-notice] button', 'Settle in now'); await P.waitFor(`!!document.querySelector('[data-cr-root]')`, 20000, 'the settle screen'); await sleep(3000); await j.shot(P, `phone${w}-settle-open`);
      await P.click('[data-cr-root] button', 'Not now'); await sleep(2500);
      detail['backOnSheet'] = await P.eval<boolean>(`[...document.querySelectorAll('.base-sheet, [role=dialog]')].some((e) => e.getBoundingClientRect().width > 1 && /Local government/i.test(e.innerText))`); await j.shot(P, `phone${w}-after-not-now`);
      if (w === 390) {
        await P.click('[data-settle-notice] button', 'Settle in now'); await finishSettling(P, detail);
        detail['finishedBackOnSheet'] = await P.eval<boolean>(`[...document.querySelectorAll('.base-sheet, [role=dialog]')].some((e) => e.getBoundingClientRect().width > 1 && /Local government/i.test(e.innerText))`); detail['uiAfter'] = await settleUi(P); await j.shot(P, `phone${w}-after-settle`);
      }
      const bn = detail['banner'] as any;
      must(detail['entry'] && !(detail['entry'] as any).overflow, `the standing entry: ${JSON.stringify(detail['entry'])}`);
      must(bn.found && !bn.textClipped && bn.withinViewport && bn.buttonTappable, `the banner at ${w}: ${JSON.stringify(bn)}`);
      must(detail['backOnSheet'], '"Not now" did not return to the sheet');
      if (w === 390) { must(detail['finishedBackOnSheet'], 'finishing did not return to the sheet'); must((detail['uiAfter'] as any).buttons === 0 && (detail['uiAfter'] as any).notices === 0 && !(detail['uiAfter'] as any).entry, `settle UI after settling: ${JSON.stringify(detail['uiAfter'])}`); }
    });
  }

  // ---------------------------------------------------------------- E: regression as a settled player
  await j.run('E', 'Regression (settled player): Messages, Bank, Community, the map and a venue open and close; no console error, no blank panel', [A], async (detail) => {
    await desktop(A); await A.goto(lab.base + '/'); await gameShown(A);
    const before = realErrors(A).length; const out: Record<string, unknown> = {};
    const home = async (): Promise<void> => { if (!(await visible(A, '.ph-pages'))) { await A.click('.ph-back').catch(() => undefined); await A.waitFor(`!!document.querySelector('.ph-pages')`, 10000, 'the home screen'); await sleep(700); } };
    await A.click('[data-nav="phone"]').catch(() => undefined); await A.waitFor(`!!document.querySelector('.ph-pages')`, 15000, 'the phone'); await sleep(1500);
    for (const app of ['messages', 'bank', 'community']) {
      await home();
      const pg = await A.eval<number>(`(() => { const pg = [...document.querySelectorAll('.ph-page')].find((x) => x.querySelector('[data-ph-app="${app}"]')); return pg ? Number(pg.getAttribute('data-ph-page')) : -1; })()`);
      if (pg >= 0) { await A.eval(`document.querySelectorAll('.ph-dots button')[${pg}].click(); true`); await sleep(700); }
      await A.click(`[data-ph-app="${app}"]`);
      const opened = await A.waitFor(`!!document.querySelector('.ph-appbody') || (${JSON.stringify(app)} === 'community' && /Around you|Room chat|Nearby voice/.test(document.body.innerText))`, 15000, `${app} to open`).then(() => true, () => false);
      if (!opened) {
        out[`${app}AtHome`] = { opened: false, atHome: await A.eval<boolean>(`/Starter house/.test(document.body.innerText)`), toasts: await toasts(A) }; await j.shot(A, `regress-${app}-did-not-open-at-home`);
        // the settled player is inside their own house: step outside and try again
        const out2 = await A.eval<boolean>(`(() => { const e = [...document.querySelectorAll('button, .m3-label, [role=button], div, span')].find((x) => /^Step outside$/.test((x.innerText || '').trim()) && x.getBoundingClientRect().width > 1); if (!e) return false; e.click(); return true; })()`);
        (out[`${app}AtHome`] as any).stepOutsideFound = out2; await sleep(4000);
        await A.click('[data-nav="phone"]').catch(() => undefined); await A.waitFor(`!!document.querySelector('.ph-pages')`, 10000, 'the phone').catch(() => undefined); await sleep(1200);
        const pg2 = await A.eval<number>(`(() => { const pg = [...document.querySelectorAll('.ph-page')].find((x) => x.querySelector('[data-ph-app="${app}"]')); return pg ? Number(pg.getAttribute('data-ph-page')) : -1; })()`);
        if (pg2 >= 0) { await A.eval(`document.querySelectorAll('.ph-dots button')[${pg2}].click(); true`); await sleep(700); }
        await A.click(`[data-ph-app="${app}"]`).catch(() => undefined);
        const again = await A.waitFor(`!!document.querySelector('.ph-appbody') || /Around you|Room chat|Nearby voice/.test(document.body.innerText)`, 12000, 'the app after stepping outside').then(() => true, () => false);
        (out[`${app}AtHome`] as any).openedAfterStepOutside = again; await j.shot(A, `regress-${app}-after-step-outside`);
        if (!again) { out[app] = { opened: false, chars: 0, skeleton: false, sample: (await text(A)).replace(/\\s+/g, ' ').slice(0, 120) }; continue; }
        await sleep(2500);
      } else { await sleep(3000); }
      const body = await A.eval<{ chars: number; skeleton: boolean; sample: string }>(`(() => { const e = document.querySelector('.ph-appbody') || ([...document.querySelectorAll('section, div')].filter((x) => /Around you/.test(x.innerText) && x.getBoundingClientRect().width > 1).pop()) || document.body; return { chars: e.innerText.trim().length, skeleton: !!e.querySelector('[aria-label^="Loading"], .skeleton'), sample: e.innerText.replace(/\\s+/g, ' ').trim().slice(0, 80) }; })()`);
      out[app] = body; await j.shot(A, `regress-${app}`);
      if (await visible(A, '.ph-back')) { await A.click('.ph-back'); await A.waitFor(`!!document.querySelector('.ph-pages')`, 10000, 'home again'); await sleep(900); }
      else { await A.eval(`document.querySelectorAll('.base-sheet-close').forEach((b) => b.click()); true`); await sleep(900); out[app] = { ...(out[app] as object), asSheet: true }; await A.click('[data-nav="phone"]').catch(() => undefined); await A.waitFor(`!!document.querySelector('.ph-pages')`, 10000, 'the phone again').catch(() => undefined); await sleep(900); }
    }
    // the map and a venue
    await A.press('Escape', 'Escape', 27); await sleep(600);
    if (await visible(A, '.ph-pages')) await A.click('.phone-close, .ph-close, [data-nav="home"]').catch(() => undefined);
    await A.click('[data-nav="map"]'); await A.waitFor(`!!document.querySelector('.m3-label')`, 30000, 'the city map'); await sleep(1500); await j.shot(A, 'regress-map'); out['map'] = { labels: await A.eval<number>(`document.querySelectorAll('.m3-label').length` ) };
    await A.eval(`(document.querySelector('.m3-label.is-venue.is-here') || document.querySelector('.m3-label.is-venue')).click(); true`); await sleep(2500);
    out['venue'] = { shown: await A.eval<string>(`(document.querySelector('.base-sheet, [data-venue], .venue') || {}).innerText ? (document.querySelector('.base-sheet, [data-venue], .venue').innerText.replace(/\\s+/g, ' ').slice(0, 100)) : ''`) }; await j.shot(A, 'regress-venue');
    await A.eval(`document.querySelectorAll('.base-sheet-close').forEach((b) => b.click()); true`); await sleep(700);
    await A.click('[data-nav="home"]').catch(() => undefined); await sleep(800); await j.shot(A, 'regress-after');
    detail['panels'] = out; detail['newConsoleErrors'] = realErrors(A).slice(before);
    for (const app of ['messages', 'bank', 'community']) { const b = out[app] as any; must(b.opened !== false && b.chars > 40 && !b.skeleton, `${app} is blank, did not open, or is still loading: ${JSON.stringify(b)}`); }
    must((out['map'] as any).labels > 3, 'the map has no labels');
    must(String((out['venue'] as any).shown).length > 10, 'no venue panel opened');
    must((detail['newConsoleErrors'] as string[]).length === 0, `console errors: ${(detail['newConsoleErrors'] as string[]).join(' | ').slice(0, 400)}`);
  });
  await j.run('E2', 'Community panel for a guest standing in a venue (Freedom Park) opens with its room, voice and chat sections', [root], async (detail) => {
    const G = await guest('Community Gina');
    await G.click('[data-nav="phone"]'); await G.waitFor(`!!document.querySelector('.ph-pages')`, 10000, 'home'); await sleep(1200);
    await G.eval(`document.querySelectorAll('.ph-dots button')[3].click(); true`); await sleep(800);
    await G.click('[data-ph-app="community"]');
    detail['opened'] = await G.waitFor(`/Around you|Room chat|Nearby voice/.test(document.body.innerText)`, 15000, 'the Community panel').then(() => true, () => false);
    await sleep(1500); await j.shot(G, 'community-guest'); detail['sample'] = (await text(G)).replace(/\s+/g, ' ').slice(0, 200);
    must(detail['opened'], 'the Community panel did not open for a guest in a venue');
  });
} catch (e) { console.log('ERR', e); }
finally {
  const errs: Record<string, string[]> = {}; pages.forEach((p, i) => { errs[`page${i + 1}`] = realErrors(p); });
  const code = j.finish({}, errs);
  for (const p of pages.slice(1)) p.close(); root.close(); await lab.stop(); process.exit(code);
}
