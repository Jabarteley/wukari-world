#!/usr/bin/env node
/**
 * Home-screen icon audit: opens the phone home screen as a new guest on a simulated phone and, for every page, saves a screenshot and
 * lists each app with how its icon is drawn (a picture from the atlas, or a mark drawn from the icon set). Compare the list with an
 * earlier run to find apps whose icon changed.
 *
 *   node --experimental-strip-types --no-warnings scripts/journeys/icons.ts --out <folder> [--port 4391] [--debug-port 4392]
 */
import { writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { Browser, sleep } from './cdp.ts';
import { startLab } from './lab.ts';
import { arg, playNow } from './kit.ts';

const lab = await startLab(Number(arg('port', '4391')));
const a = await Browser.launch(Number(arg('debug-port', '4392')));
const out = arg('out');
try {
  await a.setViewport({ width: 390, height: 844, scale: 3, mobile: true });
  await playNow(a, lab.base, 'Icons');
  await a.click('[data-nav="phone"]'); await a.waitFor(`!!document.querySelector('.ph-appbtn')`, 15000, 'the phone home');
  await sleep(4000);   // the pictures load
  const pages = await a.eval<number>(`document.querySelectorAll('.ph-dots button').length`);
  const apps: Record<string, unknown>[] = [];
  for (let i = 0; i < pages; i++) {
    await a.eval(`document.querySelectorAll('.ph-dots button')[${i}].click(); true`); await sleep(1500);
    await a.screenshot(join(out, `icons-page${i + 1}.png`));
    apps.push(...await a.eval<Record<string, unknown>[]>(`[...document.querySelectorAll('.ph-page[data-ph-page="${i}"] .ph-appbtn')].map((b) => { const ic = b.querySelector('.ph-icon'); const art = ic && ic.classList.contains('ph-artwork'); return { page: ${i + 1}, app: b.getAttribute('data-ph-app'), label: b.querySelector('.ph-label').innerText, icon: art ? 'picture' : 'drawn mark', glyph: art ? null : (ic.querySelector('svg') ? ic.querySelector('svg').outerHTML.length : 0) }; })`));
  }
  apps.push(...await a.eval<Record<string, unknown>[]>(`[...document.querySelectorAll('.ph-dock .ph-appbtn')].map((b) => { const ic = b.querySelector('.ph-icon'); const art = ic && ic.classList.contains('ph-artwork'); return { page: 'dock', app: b.getAttribute('data-ph-app'), label: b.querySelector('.ph-label').innerText, icon: art ? 'picture' : 'drawn mark' }; })`));
  writeFileSync(join(out, 'icons.json'), JSON.stringify({ pages, apps }, null, 2));
  console.log(JSON.stringify(apps.filter((x) => x['icon'] !== 'picture')));
} catch (e) { console.log('ERR', String(e).slice(0, 300)); } finally { a.close(); await lab.stop(); process.exit(0); }
