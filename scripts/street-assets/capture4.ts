// Round four captures: dressed rooms, catalogue sheet, pieces from two sides, floor and wall variants.
//   node --experimental-strip-types scripts/street-assets/capture4.ts <home-glb-dir> <out-dir> --set rooms|sheet|pieces|variants|numbers [--port 4487] [--chrome-port 4488]
import { mkdirSync, readdirSync, readFileSync, statSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { Browser } from '../journeys/cdp.ts';
import { serveProof } from './serve.ts';

const args = process.argv.slice(2);
const opt = (n: string, d: string): string => { const i = args.indexOf(n); return i >= 0 ? args[i + 1]! : d; };
const glbDir = args[0]!, out = args[1]!;
const port = Number(opt('--port', '4487')), chromePort = Number(opt('--chrome-port', '4488'));
const set = opt('--set', 'rooms');
mkdirSync(out, { recursive: true });
type V3 = [number, number, number];
const C = 1.2;
interface It { piece: string; x: number; y: number; rot?: number; variant?: string; mountZ?: number; floorZ?: number; wall?: 'back' | 'left' }
const it = (piece: string, x: number, y: number, rot = 0, extra: Partial<It> = {}): It => ({ piece, x, y, rot, ...extra });

const ROOMS: Record<string, { room: string; W: number; D: number; items: It[] }> = {
  humble: { room: 'room-selfcontain-ceramic', W: 6, D: 6, items: [
    it('mattress', 0, 0), it('chair-plastic', 2, 2), it('stool', 3, 3), it('bucket-bowl', 4, 4), it('toilet', 5, 5), it('basin', 4, 5), it('cooker', 2, 5), it('gas-cylinder', 3, 5), it('shoe-rack', 0, 5),
    it('washing-line', 3, 1), it('cabinet-base', 1, 5), it('fan-standing', 5, 1), it('generator', 5, 2), it('prayer-mat', 2, 0), it('plant-bushy', 5, 3),
  ] },
  nice: { room: 'room-selfcontain-parquet', W: 6, D: 6, items: [
    it('bed-double', 0, 0, 0, { variant: 'ankara-a' }), it('bedside', 2, 0), it('wardrobe', 4, 0), it('rug1', 2, 2), it('coffee-table', 2, 2, 0, { floorZ: 0.013 }), it('tv-console', 0, 2, 1), it('sofa2', 4, 2, 3, { variant: 'terracotta' }),
    it('lamp-floor', 3, 1), it('plant-tall', 5, 1), it('fan-ceiling', 3, 3), it('ac-unit', 2, 0, 0, { wall: 'back', mountZ: 2.1 }), it('curtains', 3, 0, 0, { wall: 'back', variant: 'blue' }),
    it('frame-lagoon', 1, 0, 0, { wall: 'back' }), it('frame-adire', 0, 1, 1, { wall: 'left' }), it('toilet', 5, 5), it('basin', 4, 5), it('shower', 5, 4), it('cooker-pots', 2, 5), it('cabinet-sink', 1, 5), it('fridge', 1, 4), it('shoe-rack', 0, 5),
    it('dining', 2, 4) as It,
  ].filter((i) => i.piece !== 'dining') },
  flat: { room: 'room-flat-terrazzo', W: 12, D: 8, items: [
    // kitchen along the back wall, open to the living room
    it('fridge', 0, 0), it('cabinet-sink', 1, 0), it('cabinet-base', 2, 0), it('microwave', 2, 0, 0, { floorZ: 0.86 }), it('cooker-pots', 3, 0), it('cabinet-wall', 1, 0, 0, { wall: 'back', mountZ: 1.45 }), it('cabinet-wall', 2, 0, 0, { wall: 'back', mountZ: 1.45 }),
    it('water-dispenser', 0, 2), it('gas-cylinder', 3, 2),
    // dining and living
    it('dining-laid', 4, 0), it('rug2', 2, 3), it('coffee-table', 2, 3, 0, { floorZ: 0.013 }), it('tv-console', 0, 3, 1), it('sofa3', 5, 3, 3, { variant: 'slate' }), it('armchair', 2, 5, 2, { variant: 'terracotta' }), it('lamp-floor', 5, 2),
    it('bookshelf', 7, 0), it('plant-tall', 7, 4), it('plant-bushy', 4, 6), it('shoe-rack', 0, 5), it('inverter', 7, 6), it('ring-light', 6, 6),
    it('fan-ceiling', 3, 4), it('ac-unit', 7, 0, 0, { wall: 'back', mountZ: 2.1 }), it('curtains', 2, 0, 0, { wall: 'back', variant: 'default' }), it('curtains', 6, 0, 0, { wall: 'back', variant: 'default' }),
    it('frame-adire', 4, 0, 0, { wall: 'back' }), it('frame-portrait', 0, 1, 1, { wall: 'left', mountZ: 1.6 }), it('frame-lagoon', 7, 0, 0, { wall: 'back', mountZ: 1.5 }),
    // bedroom
    it('bed-double', 9, 0, 0, { variant: 'green' }), it('bedside', 8, 0), it('bedside', 11, 0), it('wardrobe', 9, 4, 2), it('dressing-table', 11, 2, 3), it('rug3', 9, 2), it('prayer-mat', 8, 2), it('fan-standing', 8, 4),
    it('curtains', 10, 0, 0, { wall: 'back', variant: 'cream' }), it('frame-lagoon', 9, 0, 0, { wall: 'back', mountZ: 1.7 }),
    // bathroom
    it('shower', 11, 5), it('toilet', 11, 7), it('basin', 9, 7), it('bucket-bowl', 10, 5),
  ].filter((i) => !(i.piece === 'frame-lagoon' && i.x === 7)) },
};
ROOMS['hall'] = { room: 'room-hall-checker', W: 20, D: 14, items: [
  it('stage', 7, 0), ...[[1, 5], [5, 5], [12, 5], [16, 5], [1, 9], [5, 9], [12, 9], [16, 9]].map(([x, y]) => it('hall-table', x!, y!)),
  ...[4, 6, 8, 10].map((y) => it('rug2', 9, y)), it('lamp-floor', 6, 3), it('lamp-floor', 13, 3), it('plant-tall', 6, 1), it('plant-tall', 14, 1),
  ...[4, 5, 10, 11, 15, 16].map((x) => it('curtains', x, 0, 0, { wall: 'back', variant: 'blue' })), it('ac-unit', 2, 0, 0, { wall: 'back', mountZ: 2.1 }), it('ac-unit', 17, 0, 0, { wall: 'back', mountZ: 2.1 }),
  it('fan-ceiling', 4, 8), it('fan-ceiling', 15, 8), it('fan-ceiling', 9, 9), it('frame-portrait', 2, 0, 1, { wall: 'left', mountZ: 1.6 }), it('frame-lagoon', 6, 0, 1, { wall: 'left', mountZ: 1.5 }), it('ring-light', 2, 3), it('ring-light', 17, 3),
] };
const FLOOR_LIST = ['ceramic', 'terrazzo', 'parquet', 'checker'];

const server = await serveProof(glbDir, port);
const browser = await Browser.launch(chromePort);
const cleanup = (): void => { try { browser.close(); } catch { /* gone */ } server.close(); };
process.once('SIGTERM', () => { cleanup(); process.exit(1); });
try {
  await browser.setViewport({ width: 1280, height: 800, scale: 1, mobile: false });
  await browser.goto(`http://127.0.0.1:${port}/`);
  await browser.waitFor('!!window.proof', 30000, 'the proof page');
  const call = (fn: string, ...a: unknown[]): Promise<any> => browser.eval(`window.proof.${fn}(${a.map((x) => JSON.stringify(x)).join(',')})`);
  const shot = async (name: string, jpeg = true): Promise<void> => {
    await call('render');
    const s = await browser.send('Page.captureScreenshot', jpeg ? { format: 'jpeg', quality: 90 } : { format: 'png' });
    writeFileSync(join(out, `${name}.${jpeg ? 'jpg' : 'png'}`), Buffer.from(s.data, 'base64'));
    console.log('saved', name);
  };
  const stats: Record<string, unknown> = {};
  const cams = (W: number, D: number, close: boolean): { pos: V3; look: V3; fov: number } => {
    const cx = W * C * 0.5, cz = D * C * 0.5, d = Math.max(W, D) * C * (close ? 0.95 : 1.55);
    const dir = [0.5, 0.75, 0.9];
    const n = Math.hypot(...dir);
    const tx = cx, tz = close ? cz * 0.85 : cz;
    return { pos: [tx + dir[0]! / n * d, 0.8 + dir[1]! / n * d, tz + dir[2]! / n * d], look: [tx, 0.6, tz], fov: close ? 42 : 38 };
  };
  if (set === 'rooms') {
    for (const [name, r] of Object.entries(ROOMS)) {
      for (const time of ['day', 'night']) for (const close of [false, true]) {
        const cam = cams(r.W, r.D, close);
        const res = await call('setupHome', { width: 1280, height: 800, time, room: r.room, items: r.items, hide: ['wall_front', 'wall_right', 'glass_wall_front', 'glass_wall_right'], cam, lightsOn: time === 'night', merge: true });
        if (time === 'day' && !close) stats[name] = res;
        await shot(`room-${name}-${time}-${close ? 'close' : 'home'}`);
      }
      // the same room unmerged, to compare the draw calls
      await browser.setViewport({ width: 390, height: 844, scale: 1, mobile: true });
      await call('setupHome', { width: 390, height: 844, time: 'night', room: r.room, items: r.items, hide: ['wall_front', 'wall_right', 'glass_wall_front', 'glass_wall_right'], cam: { ...cams(r.W, r.D, false), pos: cams(r.W, r.D, false).pos.map((v, i) => (i === 1 ? v * 1.25 : v * 1.1)) as V3 }, lightsOn: true, merge: true });
      await shot(`room-${name}-night-phone`);
      await browser.setViewport({ width: 1280, height: 800, scale: 1, mobile: false });
    }
    writeFileSync(join(out, 'room-stats.json'), JSON.stringify(stats, null, 1));
  }
  if (set === 'sheet' || set === 'pieces') {
    const infoDir = join(glbDir, 'info');
    const pieces = readdirSync(infoDir).filter((f) => f.endsWith('.json') && !f.startsWith('room-') && !f.startsWith('detail-')).map((f) => JSON.parse(readFileSync(join(infoDir, f), 'utf8')) as any);
    const names = pieces.map((p) => p.piece as string);
    const per: Record<string, { w: number; h: number; wall?: boolean }> = {};
    for (const p of pieces) per[p.piece] = { w: p.w, h: p.h, wall: p.wall };
    if (set === 'sheet') {
      // all pieces on a plain floor in rows, seen from the home camera, in four sheets
      const sheets = 4, perSheet = Math.ceil(names.length / sheets);
      for (let sh = 0; sh < sheets; sh++) {
        const list = names.slice(sh * perSheet, (sh + 1) * perSheet);
        const items: any[] = [];
        let x = 1, y = 2, rowH = 1;
        for (const n of list) {
          const p = per[n]!;
          if (p.wall) { items.push({ piece: n, x: Math.floor(x), y: 0, rot: 0, wall: 'back', mountZ: n.startsWith('ac') ? 1.6 : 1.1 }); x += 1.3; continue; }
          if (x + p.w > 17) { x = 1; y += rowH + 1; rowH = 1; }
          items.push({ piece: n, x, y, rot: 0 });
          x += p.w + 0.6; rowH = Math.max(rowH, p.h);
        }
        const D = y + rowH;
        await call('setupHome', { width: 1280, height: 800, time: 'day', room: 'room-hall-ceramic', items, hide: ['wall_front', 'wall_right', 'wall_left', 'glass_wall_front', 'glass_wall_right', 'glass_wall_left'], cam: { pos: [9 * C, 9 + D * 0.5, (D + 5) * C * 0.95], look: [9 * C, 0.4, (D * 0.5 + 1) * C], fov: 42 }, merge: false });
        await shot(`catalogue-${sh + 1}`);
      }
    } else {
      for (const n of names) {
        const p = per[n]!;
        await call('setupHome', { width: 900, height: 500, time: 'day', room: 'room-hall-ceramic', items: p.wall ? [{ piece: n, x: 6, y: 0, rot: 0, wall: 'back', mountZ: n.startsWith('ac') ? 1.4 : 1.0 }] : [{ piece: n, x: 6, y: 3, rot: 0 }], hide: ['wall_front', 'wall_right', 'wall_left', 'glass_wall_front', 'glass_wall_right', 'glass_wall_left'], cam: { pos: [0, 0, 0], look: [0, 0, 0] }, merge: false });
        const cx = (6 + p.w / 2) * C, cz = (p.wall ? 0.3 : (3 + p.h / 2) * C);
        const R = Math.max(p.w, p.h, 1.6) * C * 1.1;
        for (const [i, az] of [[0, 25], [1, 150]] as const) {
          const a = (az * Math.PI) / 180;
          await call('setupHome', { width: 900, height: 500, time: 'day', room: 'room-hall-ceramic', items: p.wall ? [{ piece: n, x: 6, y: 0, rot: 0, wall: 'back', mountZ: n.startsWith('ac') ? 1.4 : 1.0 }] : [{ piece: n, x: 6, y: 3, rot: 0 }], hide: ['wall_front', 'wall_right', 'wall_left', 'wall_back', 'glass_wall_front', 'glass_wall_right', 'glass_wall_left', 'glass_wall_back'], cam: { pos: [cx + Math.sin(a) * R * 1.6, 1.2 + R * 0.5, cz + Math.cos(a) * R * 1.6 * (p.wall && i ? -1 : 1)], look: [cx, 0.7, cz], fov: 36 }, merge: false });
          await shot(`piece-${n}-${i + 1}`);
        }
      }
    }
  }
  if (set === 'variants') {
    const r = ROOMS['nice']!;
    for (const f of FLOOR_LIST) {
      await call('setupHome', { width: 640, height: 400, time: 'day', room: `room-selfcontain-${f}`, items: r.items, hide: ['wall_front', 'wall_right', 'glass_wall_front', 'glass_wall_right'], cam: cams(6, 6, false), merge: true });
      await shot(`floor-${f}`);
    }
    const sofaV = ['slate', 'terracotta', 'grey', 'green'], bedV = ['cream', 'blue', 'red', 'green', 'ankara-a'], curV = ['default', 'blue', 'green', 'cream'];
    const items: any[] = [...sofaV.map((v, i) => ({ piece: 'sofa2', x: i * 3, y: 4, variant: v })), ...bedV.map((v, i) => ({ piece: 'bed-single', x: i * 2, y: 1, variant: v })), ...curV.map((v, i) => ({ piece: 'curtains', x: i * 2 + 1, y: 0, wall: 'back', variant: v, mountZ: 0.0 }))];
    await call('setupHome', { width: 1280, height: 700, time: 'day', room: 'room-hall-ceramic', items, hide: ['wall_front', 'wall_right', 'wall_left', 'glass_wall_front', 'glass_wall_right', 'glass_wall_left'], cam: { pos: [7.2, 9, 12], look: [7.2, 0.6, 3], fov: 40 }, merge: false });
    await shot('variants-tints');
    const wallsHex = ['cream', 'white', 'sage', 'sky', 'peach'];
    writeFileSync(join(out, 'variants-info.json'), JSON.stringify({ walls: wallsHex, floors: FLOOR_LIST, sofa: sofaV, bed: bedV, curtains: curV }, null, 1));
  }
  if (set === 'numbers') {
    const names = readdirSync(glbDir).filter((f) => f.endsWith('.glb')).map((f) => f.replace(/\.glb$/, ''));
    const info = await call('homeInfo', names);
    for (const k of Object.keys(info)) info[k].bytesOnDisk = statSync(join(glbDir, k + '.glb')).size;
    writeFileSync(join(out, 'numbers4.json'), JSON.stringify(info, null, 1));
    writeFileSync(join(out, 'layouts.json'), JSON.stringify(ROOMS, null, 1));
  }
  console.log('console errors:', browser.consoleErrors.slice(0, 6));
} finally { cleanup(); }
process.exit(0);
