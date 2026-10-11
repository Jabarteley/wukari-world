// Round three captures. node --experimental-strip-types scripts/street-assets/capture3.ts <glb-dir> <out-dir> --set finals|spin|scenes|side|numbers [--only name,name] [--suffix -far]
import { mkdirSync, readdirSync, statSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { Browser } from '../journeys/cdp.ts';
import { serveProof } from './serve.ts';

const args = process.argv.slice(2);
const opt = (n: string, d: string): string => { const i = args.indexOf(n); return i >= 0 ? args[i + 1]! : d; };
const glbDir = args[0]!, out = args[1]!;
const port = Number(opt('--port', '4485')), chromePort = Number(opt('--chrome-port', '4486'));
const set = opt('--set', 'finals');
const only = opt('--only', '').split(',').filter(Boolean);
const suffix = opt('--suffix', '');
mkdirSync(out, { recursive: true });
type V3 = [number, number, number];
const PI = Math.PI;
const server = await serveProof(glbDir, port);
const browser = await Browser.launch(chromePort);
const cleanup = (): void => { try { browser.close(); } catch { /* gone */ } server.close(); };
process.once('SIGTERM', () => { cleanup(); process.exit(1); });
try {
  await browser.setViewport({ width: 1280, height: 800, scale: 1, mobile: false });
  await browser.goto(`http://127.0.0.1:${port}/`);
  await browser.waitFor('!!window.proof', 30000, 'the proof page');
  const call = (fn: string, ...a: unknown[]): Promise<any> => browser.eval(`window.proof.${fn}(${a.map((x) => JSON.stringify(x)).join(',')})`);
  const stage = async (name: string, spec: Record<string, unknown>, jpeg = true): Promise<void> => {
    const vp = browser.viewport;
    await call('setup', { width: vp.width, height: vp.height, time: 'day', base: 'plain', ...spec });
    await call('render');
    const s = await browser.send('Page.captureScreenshot', jpeg ? { format: 'jpeg', quality: 88 } : { format: 'png' });
    writeFileSync(join(out, `${name}.${jpeg ? 'jpg' : 'png'}`), Buffer.from(s.data, 'base64'));
    console.log('saved', name);
  };
  const names = readdirSync(glbDir).filter((n) => n.endsWith('.glb')).map((n) => n.replace(/\.glb$/, '')).sort();
  const item = (file: string, x = 0, z = 0, ry = 0) => ({ src: 'new', kind: 'x', file, x, z, ry });
  if (set === 'finals') {
    for (const file of names) {
      if (only.length && !only.includes(file)) continue;
      if (!only.length && (file.endsWith('-far') !== (suffix === '-far'))) continue;
      await call('setup', { width: 1280, height: 800, time: 'day', base: 'plain', items: [item(file)], cam: { pos: [0, 10, 30], look: [0, 0, 0] } });
      const size = (await call('modelInfo'))[file].size as number[];
      const r = Math.max(size[0]!, size[2]!) / 2 * 1.1, h = size[1]! / 2;
      const d = Math.max(r * 2.9, h * 4.5);
      const views = [45, 135, 225, 315].map((deg) => ({ pos: [Math.sin((deg * PI) / 180) * d, h + d * 0.32, Math.cos((deg * PI) / 180) * d] as V3, look: [0, h, 0] as V3 }));
      await stage(`four-${file}`, { items: [item(file)], quad: views, cam: { pos: views[0]!.pos, look: [0, h, 0] as V3, fov: 40 } });
    }
  }
  if (set === 'group') {
    // several assets in a row, four corner views of the whole row: --only a,b,c --name label
    const label = opt('--name', 'group');
    const sizes: number[][] = [];
    for (const f of only) { await call('setup', { width: 1280, height: 800, time: 'day', base: 'plain', items: [item(f)], cam: { pos: [0, 10, 30], look: [0, 0, 0] } }); sizes.push((await call('modelInfo'))[f].size as number[]); }
    const gap = Math.max(...sizes.map((z) => Math.max(z[0]!, z[2]!))) * 1.15;
    const total = gap * (only.length - 1);
    const items = only.map((f, i) => item(f, i * gap - total / 2, 0));
    const h = Math.max(...sizes.map((z) => z[1]!)) / 2;
    const d = Math.max(total * 0.62 + gap * 1.6, h * 4);
    const views = [30, 150, 210, 330].map((deg) => ({ pos: [Math.sin((deg * PI) / 180) * d, h + d * 0.3, Math.cos((deg * PI) / 180) * d] as V3, look: [0, h * 0.8, 0] as V3 }));
    await stage(`group-${label}`, { items, quad: views, cam: { pos: views[0]!.pos, look: [0, h, 0] as V3, fov: 40 } });
  }
  if (set === 'shop') {
    for (const theme of ['fashion', 'food', 'electronics']) {
      const file = `shop-${theme}`;
      const base = { items: [item(file)], slotItems: true, time: 'day' };
      await stage(`shop-${theme}-front`, { ...base, cam: { pos: [0, 2.6, 11.5] as V3, look: [0, 1.5, 0] as V3, fov: 42 } });
      await stage(`shop-${theme}-inside`, { ...base, cam: { pos: [2.1, 1.6, 1.9] as V3, look: [-1.6, 1.2, -2.5] as V3, fov: 72 } });
      await stage(`shop-${theme}-inside-right`, { ...base, cam: { pos: [-2.0, 1.6, 1.9] as V3, look: [1.7, 1.2, -2.3] as V3, fov: 72 } });
    }
  }
  if (set === 'scenes') {
    const have = new Set(names);
    const PI2 = PI / 2;
    const camPos: V3 = [0, 12, 34];
    type It = { src: 'new'; kind: string; file: string; x: number; z: number; ry: number };
    const mk = (list: [string, number, number, number?][]): It[] => list.map(([file, x, z, ry = 0]) => {
      const far = Math.hypot(x - camPos[0], z - camPos[2]) > 40 && have.has(file + '-far');
      if (!have.has(file)) return null as unknown as It;
      return { src: 'new' as const, kind: 'x', file: far ? file + '-far' : file, x, z, ry };
    }).filter(Boolean);
    const bz = (f: string): number => (/^(bungalow|house2)/.test(f) ? -5.5 : /^flats|^shops|^school|^clinic|^bank/.test(f) ? -5.2 : /^church/.test(f) ? -5.8 : /^mosque/.test(f) ? -5 : /^shoprow/.test(f) ? -3.6 : /^filling/.test(f) ? -3.5 : -5);
    const road = (names2: [string, number][], z: number, ry: number): [string, number, number, number][] => names2.map(([f, x]) => [f, x, z, ry]);
    const scenes: Record<string, It[]> = {
      residential: mk([
        ['bungalow-cream', -33, bz('bungalow')], ['house2-mint', -19, bz('house2')], ['bungalow-sky', -5, bz('bungalow')], ['house2-cream', 9, bz('house2')], ['flats-mint', 25, bz('flats')], ['church-cream', 38, bz('church')],
        ...[-26, -12, 2, 16, 31].map((x): [string, number, number] => ['hedge-cream', x, -0.4]), ['fencegate-cream', -26, -0.6], ['fencegate-cream', 2, -0.6],
        ['shadetree-cream', -25, 1.8], ['shadetree-cream', 17, 1.9], ['plantain-cream', -10, 1.4], ['pawpaw-cream', -14, 1.5], ['plantain-cream', 20, 1.4], ['pawpaw-cream', 33, 1.5], ['grass-cream', -2, 1.6], ['grass-cream', 6, 1.7], ['grass-cream', 28, 1.6],
        ['lamp-cream', -31, 2.5], ['lamp-cream', -9, 2.5], ['lamp-cream', 14, 2.5], ['lamp-cream', 36, 2.5], ['bin-cream', -16, 2.3], ['gutter-cream', -6, 2.2], ['gutter-cream', 22, 2.2], ['tank-cream', -37, -3], ['kiosk-teal', 29, 0.2],
        ...road([['saloon-cream', -28], ['okada', -10], ['suv-white', 8], ['keke', 26]], 4.7, PI2), ...road([['okada', -22], ['saloon-blue', -2], ['pickup-white', 18], ['saloon-red', 34]], 8.6, -PI2),
      ]),
      market: mk([
        ['shops-cream', -30, bz('shops')], ['shoprow-mint', -15, bz('shoprow')], ['shops-sky', 0, bz('shops')], ['shoprow-cream', 15, bz('shoprow')], ['shops-mint', 30, bz('shops')],
        ['stall-teal', -24, 1.4], ['stall-red', -9, 1.4], ['table-cream', -4, 1.2], ['stall-blue', 7, 1.4], ['table-cream', 12, 1.2], ['kiosk-red', 21, 0.6], ['stall-teal', 36, 1.4], ['kiosk-teal', -36, 0.6],
        ['generator-cream', -19, 0.8], ['generator-cream', 26, 0.8], ['wheelbarrow-cream', -13, 1.9], ['wheelbarrow-cream', 4, 1.9], ['signboard-cream', -7, -0.9], ['bin-cream', 10, 2.3], ['bin-cream', -21, 2.3], ['billboard-cream', 41, -8], ['lamp-cream', -27, 2.5], ['lamp-cream', -1, 2.5], ['lamp-cream', 18, 2.5], ['lamp-cream', 33, 2.5],
        ['busstop-cream', 8, 3.3, PI], ['plantain-cream', -33, 1.4],
        ...road([['okada', -26], ['keke', -14], ['danfo', 0], ['van-white', 14], ['keke', 30]], 4.7, PI2), ...road([['danfo-blue-white', -20], ['okada', -5], ['pickup-blue', 10], ['bus', 33]], 8.6, -PI2),
      ]),
      mainroad: mk([
        ['bank-cream', -32, bz('bank')], ['filling-cream', -16, bz('filling')], ['school-mint', 2, bz('school')], ['clinic-sky', 20, bz('clinic')], ['mosque-cream', 35, bz('mosque')],
        ['billboard-cream', -8, -9], ['trafficlight-cream', -3, 2.6], ['trafficlight-cream', 28, 2.6], ['lamp-cream', -24, 2.5], ['lamp-cream', 9, 2.5], ['lamp-cream', 40, 2.5], ['lamp-cream', -38, 2.5], ['busstop-cream', 14, 3.2, PI], ['bin-cream', 12, 2.3],
        ['shadetree-cream', 27, 1.9], ['shadetree-cream', -10, 1.9], ['hedge-cream', 5, -0.4], ['unfinished-sky', 46, bz('unfinished')],
        ...road([['bus', -30], ['danfo-white-green', -9], ['saloon-green', 4], ['suv-black', 18], ['danfo', 34]], 4.7, PI2), ...road([['okada', -24], ['bus', -5], ['danfo-blue-white', 17], ['van-blue', 32]], 8.6, -PI2),
      ]),
    };
    const stats: Record<string, unknown> = {};
    for (const [name, items] of Object.entries(scenes)) {
      for (const time of ['day', 'dusk', 'night']) {
        for (const [pre, vp, cam] of [['d', { width: 1280, height: 800, scale: 1, mobile: false }, { pos: camPos, look: [0, 4.2, 1.5] as V3, fov: 52 }], ['p', { width: 390, height: 844, scale: 1, mobile: true }, { pos: [0, 40, 62] as V3, look: [0, 1.5, 3] as V3, fov: 50 }]] as const) {
          await browser.setViewport(vp);
          await stage(`scene-${name}-${time}-${pre}`, { time, base: 'street', items, cam, lightsOn: time !== 'day' }, false);
          if (pre === 'd' && time === 'day') stats[name] = { items: items.length, ...(await call('measure', 6)) };
        }
      }
    }
    await browser.setViewport({ width: 1280, height: 800, scale: 1, mobile: false });
    writeFileSync(join(out, 'scene-stats.json'), JSON.stringify(stats, null, 1));
  }
  if (set === 'side') {
    const items = [
      { src: 'old', kind: 'house', x: -21, z: 0 }, { src: 'old', kind: 'kiosk', x: -8, z: -0.2 }, { src: 'old', kind: 'palm', x: -3, z: 1 }, { src: 'old', kind: 'mango-tree', x: -29, z: 1 },
      { src: 'old', kind: 'danfo', x: -16, z: 4.8, ry: PI / 2 }, { src: 'old', kind: 'keke', x: -6, z: 4.8, ry: PI / 2 },
      item('house2-sky', 21, -8), item('kiosk-red', 8, -0.2), item('shadetree-cream', 3, 2), item('mango-tree', 29, 1), item('danfo-white-green', 16, 4.8, PI / 2), item('keke', 6, 4.8, PI / 2), item('okada', 11, 8.6, -PI / 2), item('saloon-red', -1, 8.6, -PI / 2),
    ];
    for (const time of ['day', 'dusk']) await stage(`side-by-side-${time}`, { time, base: 'street', items, cam: { pos: [0, 11, 32] as V3, look: [0, 3.9, 1] as V3, fov: 46 }, lightsOn: false, labels: [{ at: [-15, 9.5, 0] as V3, text: "Today's (drawn by the game)" }, { at: [15, 9.5, 0] as V3, text: 'Round three' }] });
  }
  if (set === 'numbers') {
    await call('setup', { width: 1280, height: 800, time: 'day', base: 'plain', items: names.map((n, i) => item(n, i * 12, 0)), cam: { pos: [0, 30, 60], look: [0, 0, 0] } });
    const info = await call('modelInfo');
    for (const k of Object.keys(info)) info[k].bytesOnDisk = statSync(join(glbDir, k + '.glb')).size;
    writeFileSync(join(out, 'numbers3.json'), JSON.stringify(info, null, 1));
  }
  if (set === 'colours') {
    // rows of building types, three colours each, seen from the front and above
    const groups: string[][] = [['shops', 'shoprow', 'church'], ['mosque', 'school', 'clinic'], ['filling', 'bank', 'unfinished']];
    for (const [gi, g] of groups.entries()) {
      const items = g.flatMap((t, row) => ['cream', 'mint', 'sky'].map((c, col) => item(`${t}-${c}`, (col - 1) * 15, (1 - row) * 17)));
      await stage(`colours-${gi + 1}`, { items, cam: { pos: [0, 62, 52] as V3, look: [0, 0, 0] as V3, fov: 42 } });
    }
    await stage('colours-kiosk-stall', { items: ['teal', 'red', 'blue'].flatMap((c, col) => [item(`kiosk-${c}`, (col - 1) * 7, 4), item(`stall-${c}`, (col - 1) * 7, -4)]), cam: { pos: [0, 12, 18] as V3, look: [0, 1, 0] as V3, fov: 40 } });
  }
  if (set === 'spin') {
    for (const file of names) {
      if (only.length && !only.includes(file)) continue;
      await call('setup', { width: 1280, height: 800, time: 'day', base: 'plain', items: [item(file)], cam: { pos: [0, 10, 30], look: [0, 0, 0] } });
      const size = (await call('modelInfo'))[file].size as number[];
      const d = Math.max(size[0]!, size[2]!) * 1.7;
      const h = size[1]! / 2;
      for (const [i, a] of [0, 1.2, 2.4].entries()) {
        await call('setup', { width: 1280, height: 800, time: 'day', base: 'plain', items: [item(file, 0, 0, 0)], cam: { pos: [d, h + 0.6, 0.01] as V3, look: [0, h, 0] as V3 } });
        const n = await call('spinWheels', a);
        await call('render');
        const s = await browser.send('Page.captureScreenshot', { format: 'jpeg', quality: 88 });
        writeFileSync(join(out, `spin${i}-${file}.jpg`), Buffer.from(s.data, 'base64'));
        if (i === 0) console.log(file, 'wheel nodes', n);
      }
    }
  }
} finally { cleanup(); }
process.exit(0);
