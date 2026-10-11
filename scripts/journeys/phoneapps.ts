#!/usr/bin/env node
/**
 * Phone shell check: an app tapped open and its first tab tapped at once; three different apps opened and closed with a real tap on a
 * home icon while each is open (it must not open anything) and the home screen taking taps again afterwards.
 *
 *   node --experimental-strip-types --no-warnings scripts/journeys/phoneapps.ts --out <folder> [--port 4391] [--debug-port 4392]
 */
import { Browser, sleep } from './cdp.ts';
import { startLab } from './lab.ts';
import { Journey, arg, desktop, must, phone, playNow, realErrors, visible } from './kit.ts';

const lab = await startLab(Number(arg('port', '4391')));
const S = await Browser.launch(Number(arg('debug-port', '4392')));
const j = new Journey(arg('out'), 'phoneapps');
for (const sig of ['SIGINT', 'SIGTERM'] as const) process.once(sig, () => { try { S.child.kill('SIGKILL'); } catch { /* gone */ } process.exit(130); });
const openHomeApp = async (p: Browser, app: string): Promise<void> => {
  if (await visible(p, '.ph-back')) { await p.click('.ph-back'); await p.waitFor(`(() => { const b = document.querySelector('.ph-back'); return !b || b.getBoundingClientRect().width < 2; })()`, 10000, 'the app to close'); await sleep(1200); }
  const page = await p.eval<number>(`(() => { const pg = [...document.querySelectorAll('.ph-page')].find((x) => x.querySelector('[data-ph-app="${app}"]')); return pg ? Number(pg.getAttribute('data-ph-page')) : -1; })()`);
  if (page >= 0) { await p.eval(`document.querySelectorAll('.ph-dots button')[${page}].click(); true`); await p.waitFor(`(() => { const r = document.querySelector('.ph-page[data-ph-page="${page}"]').getBoundingClientRect(); return r.left >= -2 && r.left < innerWidth / 2; })()`, 5000, 'the home page to slide in').catch(() => undefined); await sleep(500); }
  await p.click(`[data-ph-app="${app}"]`);
};
try {
  for (const [label, size] of [['480 wide', null], ['390x844', [390, 844]]] as [string, [number, number] | null][]) {
    if (size) await phone(S, size[0], size[1]); else await desktop(S);
    if (label === '480 wide') { await playNow(S, lab.base, 'Phone Pat'); await S.click('[data-nav="phone"]'); await S.waitFor(`!!document.querySelector('.ph-pages')`, 15000, 'the phone'); await sleep(1500); } else { await S.goto(lab.base + '/'); await S.waitFor(`!!document.querySelector('.hud-cash')`, 60000, 'the game'); await sleep(1500); await S.click('[data-nav="phone"]').catch(() => undefined); await S.waitFor(`!!document.querySelector('.ph-pages')`, 15000, 'the phone'); await sleep(1500); }
    await j.run(`immediate ${label}`, `Tapping "My shop" the moment the Services app opens works, three times (${label})`, [S], async (detail) => {
      const tries: Record<string, unknown>[] = [];
      for (let i = 0; i < 3; i++) {
        await openHomeApp(S, 'showcase');
        const t0 = Date.now(); await S.click('.sc-tabs [role="tab"]', 'My shop', 10000); const tapAfterMs = Date.now() - t0;
        const took = await S.waitFor(`[...document.querySelectorAll('.sc-tabs [role="tab"]')].some((t) => t.getAttribute('aria-selected') === 'true' && /My shop/.test(t.innerText))`, 3000, 'the tab to take').then(() => true, () => false);
        tries.push({ try: i + 1, tapAfterMs, took }); if (i === 0) await j.shot(S, `my-shop-immediately-${label.replace(/\W/g, '')}`);
      }
      detail['tries'] = tries; must(tries.every((t) => t['took']), `a tap on "My shop" right after the app opened did not take: ${JSON.stringify(tries)}`);
    });
    await j.run(`apps ${label}`, `Messages, Bank and Missions open and close; a real tap on a home icon while one is open opens nothing; the home screen takes taps again after (${label})`, [S], async (detail) => {
      const out: Record<string, unknown>[] = [];
      const spotOf = (app: string): Promise<{ x: number; y: number; covered: boolean; label: string } | null> => S.eval(`(() => { const bs = [...document.querySelectorAll('.ph-pages .ph-appbtn, .ph-dock .ph-appbtn')].filter((b) => b.getAttribute('data-ph-app') !== '${app}'); for (const b of bs) { const r = b.getBoundingClientRect(); if (r.width < 2 || r.top < 0 || r.bottom > innerHeight || r.left < 0 || r.right > innerWidth) continue; const x = r.left + r.width / 2, y = r.top + r.height / 2, t = document.elementFromPoint(x, y); if (t && t.closest('.ph-appbody') && t.closest('button, a, input, select, textarea, [role=button], [role=tab], [data-conv], label')) continue; return { x, y, covered: !!t && !(t === b || b.contains(t)), label: b.querySelector('.ph-label').innerText.trim() }; } return null; })()`);
      const title = (): Promise<string> => S.eval(`((document.querySelector('.ph-bar') || {}).innerText || '').trim().slice(0, 40)`);
      const ph = (): Promise<boolean> => S.eval(`(() => { const b = document.querySelector('.ph-back'); return !!b && b.getBoundingClientRect().width > 2; })()`);
      for (const app of ['messages', 'bank', 'missions']) {
        await openHomeApp(S, app); await S.waitFor(`(() => { const b = document.querySelector('.ph-back'); return !!b && b.getBoundingClientRect().width > 2; })()`, 15000, `${app} to open`); await sleep(2500);
        const spot = await spotOf(app); const before = await title();
        await S.tapAt(spot?.x ?? 100, spot?.y ?? 400); await sleep(900);
        const after = await title(); await j.shot(S, `phone-app-${app}-${label.replace(/\W/g, '')}`);
        const sameAppOpen = !after.includes(spot?.label ?? '###') || before.includes(spot?.label ?? '###');   // the home icon's own app did not open
        // whatever the tap opened inside the app is the app's own content (it may sit under the spot): close the guide overlay if one opened
        const overlay = await S.eval<boolean>(`(() => { const x = [...document.querySelectorAll('button')].find((b) => /^(Close|×|✕)$/.test((b.getAttribute('aria-label') || b.innerText || '').trim()) && b.getBoundingClientRect().width > 1 && b.closest('[class*=companion], [class*=lumo], [role=dialog]')); if (x) { x.click(); return true; } return false; })()`); if (overlay) await sleep(700);
        if (!(await ph())) { await S.click('[data-nav="phone"]').catch(() => undefined); await S.waitFor(`!!document.querySelector('.ph-pages')`, 10000, 'the phone').catch(() => undefined); await sleep(1200); await openHomeApp(S, app); await sleep(1500); }
        await S.click('.ph-back'); await S.waitFor(`(() => { const b = document.querySelector('.ph-back'); return !b || b.getBoundingClientRect().width < 2; })()`, 10000, 'the app to close'); await sleep(1500);
        const home = await S.eval<boolean>(`(() => { const bs = [...document.querySelectorAll('.ph-pages .ph-appbtn, .ph-dock .ph-appbtn')].filter((b) => { const r = b.getBoundingClientRect(); return r.width > 2 && r.left >= 0 && r.right <= innerWidth && r.top >= 0 && r.bottom <= innerHeight; }); return bs.length > 0 && bs.every((b) => { const r = b.getBoundingClientRect(), t = document.elementFromPoint(r.left + r.width / 2, r.top + r.height / 2); return !!t && (t === b || b.contains(t)); }); })()`);
        out.push({ app, titleBefore: before, titleAfterTap: after, spotApp: spot?.label, tapOnHomeIconOpenedNothing: sameAppOpen, hitTestSaysCovered: spot?.covered ?? null, homeTakesTapsAfterClose: home });
      }
      detail['apps'] = out;
      for (const o of out as any[]) must(o.tapOnHomeIconOpenedNothing && o.homeTakesTapsAfterClose, `${o.app}: ${JSON.stringify(o)}`);
    });
  }
} catch (e) { console.log('ERR', e); }
finally { const code = j.finish({}, { page: realErrors(S) }); S.close(); await lab.stop(); process.exit(code); }
