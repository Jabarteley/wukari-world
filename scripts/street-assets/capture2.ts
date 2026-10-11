// Round two captures: route comparison for the house, every final asset from four sides, today's beside the new, and the busy street at day, dusk and night.
//   node --experimental-strip-types scripts/street-assets/capture2.ts <glb-dir> <out-dir> [--set routes|finals|side|busy|all] [--port 4491] [--chrome-port 4492]
import { mkdirSync, readdirSync, statSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { Browser } from '../journeys/cdp.ts';
import { serveProof } from './serve.ts';

const args = process.argv.slice(2);
const opt = (n: string, d: string): string => { const i = args.indexOf(n); return i >= 0 ? args[i + 1]! : d; };
const glbDir = args[0]!, out = args[1]!;
const port = Number(opt('--port', '4483')), chromePort = Number(opt('--chrome-port', '4484'));
const set = opt('--set', 'all');
const want = (n: string): boolean => set === 'all' || set === n;
mkdirSync(out, { recursive: true });
type V3 = [number, number, number];
interface Item { src: 'old' | 'new'; kind: string; file?: string; x: number; z: number; ry?: number; lod?: 'near' | 'far' }
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

  if (want('routes')) {
    // the house in three routes: A generated again from a clean picture and reduced gently, B clean shell with a generated skin, C shell plus generated props
    const items: Item[] = [
      { src: 'new', kind: 'house', file: 'a-house', x: -15, z: 0 }, { src: 'new', kind: 'house', file: 'bungalow-cream', x: 0, z: 0 },
      { src: 'new', kind: 'house', file: 'bungalow-cream', x: 15, z: 0 }, { src: 'new', kind: 'palm', file: 'palm', x: 21.5, z: 4.5 }, { src: 'new', kind: 'mango-tree', file: 'mango-tree', x: 9.5, z: 5.5 },
    ];
    const labels = [{ at: [-15, 8, 0] as V3, text: 'A: generated, gently reduced' }, { at: [0, 8, 0] as V3, text: 'B: clean shell, generated skin' }, { at: [15, 8, 0] as V3, text: 'C: shell + generated props' }];
    await stage('route-close', { items, cam: { pos: [0, 15, 40] as V3, look: [0, 2.8, 0] as V3, fov: 40 }, labels });
    for (const [name, dx] of [['A', -15], ['B', 0], ['C', 15]] as const) {
      await stage(`route-${name}-sides`, { items: items.filter((i) => Math.abs(i.x - dx) < 0.1 || (name === 'C' && i.kind !== 'house')).map((i) => ({ ...i, x: i.x - dx })), quad: [
        { pos: [0, 5, 22], look: [0, 2.6, 0] }, { pos: [22, 5, 0], look: [0, 2.6, 0] }, { pos: [0, 5, -22], look: [0, 2.6, 0] }, { pos: [-22, 5, 0], look: [0, 2.6, 0] }], cam: { pos: [0, 5, 22], look: [0, 2.6, 0], fov: 40 } });
    }
    for (const [name, dx] of [['A', -15], ['B', 0], ['C', 15]] as const) {
      await stage(`route-${name}-street`, { base: 'street', items: items.filter((i) => Math.abs(i.x - dx) < 0.1 || (name === 'C' && i.kind !== 'house')).map((i) => ({ ...i, x: i.x - dx, z: i.kind === 'house' ? -7.2 : i.z })), cam: { pos: [15, 12, 17] as V3, look: [0, 2, -4] as V3 } });
    }
  }

  // ---- every final asset from four corners (distortion shows at corners and roof edges), 2 x 2 in one picture
  const FINALS: [string, number, number][] = [['bungalow-cream', 7.5, 2.6], ['house2-cream', 8, 3.8], ['flats-cream', 9, 5.5], ['kiosk-teal', 3.4, 1.5], ['stall-teal', 3.2, 1.6], ['danfo', 4.2, 1.2], ['keke', 3, 1.1], ['mango-tree', 5, 3.5], ['palm', 4.5, 3.5]];
  const finals = (suffix: string, lod: 'near' | 'far', names: string[]): Promise<void[]> => Promise.all([]).then(async () => {
    for (const [file, r, h] of FINALS) {
      if (names.length && !names.includes(file.replace(/-(cream|teal)$/, ''))) continue;
      const d = r * 2.6;
      const views = [45, 135, 225, 315].map((deg) => ({ pos: [Math.sin((deg * PI) / 180) * d, h + d * 0.33, Math.cos((deg * PI) / 180) * d] as V3, look: [0, h, 0] as V3 }));
      await stage(`final-${file.replace(/-(cream|teal)$/, '')}${suffix}`, { items: [{ src: 'new', kind: file, file: lod === 'far' ? file + '-far' : file, x: 0, z: 0 }], quad: views, cam: { pos: views[0]!.pos, look: [0, h, 0] as V3, fov: 40 } });
    }
    return [];
  });
  if (want('finals')) await finals('', 'near', args.includes('--only') ? opt('--only', '').split(',') : []);
  if (want('finalsfar')) await finals('-far', 'far', []);

  const HZ = -7.6;     // the new houses are centred on their footprint: this puts their front where today's house front is
  const place = (file: string, x: number, z: number, ry = 0, far = false): Item => ({ src: 'new', kind: file.split('-')[0]!, file: far ? file + '-far' : file, x, z, ry });
  const houseZ = (file: string): number => (file.startsWith('flats') ? -7.4 : file.startsWith('house2') ? -8.0 : -7.4);
  // ---- today's props on the left, round two on the right, same scale
  if (want('side')) {
    for (const time of ['day', 'dusk']) {
      const items: Item[] = [
        { src: 'old', kind: 'house', x: -18, z: 0 }, { src: 'old', kind: 'kiosk', x: -8, z: -0.2 }, { src: 'old', kind: 'palm', x: -3, z: 1 }, { src: 'old', kind: 'mango-tree', x: -27, z: 1 },
        { src: 'old', kind: 'danfo', x: -15, z: 4.8, ry: PI / 2 }, { src: 'old', kind: 'keke', x: -5, z: 4.8, ry: PI / 2 },
        place('house2-cream', 18, houseZ('house2-cream')), place('kiosk-teal', 8, -0.2), place('palm', 3, 1), place('mango-tree', 27, 1), place('danfo', 15, 4.8, PI / 2), place('keke', 5, 4.8, PI / 2), place('stall-teal', 12, 2.0),
      ];
      await stage(`side-by-side-${time}`, { time, base: 'street', items, cam: { pos: [0, 11, 32] as V3, look: [0, 3.9, 1] as V3, fov: 46 }, labels: [{ at: [-14, 9.5, 0] as V3, text: "Today's (drawn by the game)" }, { at: [14, 9.5, 0] as V3, text: 'Round two' }] });
    }
    await stage('side-houses', { base: 'street', items: [{ src: 'old', kind: 'house', x: -21, z: 0 }, place('bungalow-cream', -7, houseZ('bungalow')), place('house2-cream', 8, houseZ('house2-cream')), place('flats-cream', 24, houseZ('flats-cream'))],
      cam: { pos: [0, 14, 38] as V3, look: [0, 3.5, -3] as V3, fov: 46 }, labels: [{ at: [-21, 9.5, 0] as V3, text: "Today's house" }, { at: [-7, 8, -2] as V3, text: 'Bungalow' }, { at: [8, 10, -2] as V3, text: 'Two-storey house' }, { at: [24, 13, -2] as V3, text: 'Block of flats' }] });
  }
  // ---- colour variants
  if (want('variants')) {
    for (const t of ['bungalow', 'house2', 'flats']) {
      const items = ['cream', 'mint', 'sky'].map((c, i) => place(`${t}-${c}`, (i - 1) * 14, 0));
      await stage(`variants-${t}`, { items, cam: { pos: [0, 12, 34] as V3, look: [0, 3.2, 0] as V3, fov: 42 } });
    }
    await stage('variants-kiosk-stall', { items: [...['teal', 'red', 'blue'].map((c, i) => place(`kiosk-${c}`, (i - 1) * 7, 4)), ...['teal', 'red', 'blue'].map((c, i) => place(`stall-${c}`, (i - 1) * 7, -4))], cam: { pos: [0, 12, 18] as V3, look: [0, 1, 0] as V3, fov: 40 } });
  }
  // ---- the busy street, day, dusk and night
  if (want('busy')) {
    const items: Item[] = [];
    const camPos: V3 = [0, 12, 34];
    const far = (x: number, z: number): boolean => Math.hypot(x - camPos[0], z - camPos[2]) > 40;
    const add = (file: string, x: number, z: number, ry = 0): void => { items.push(place(file, x, file.match(/^(bungalow|house2|flats)/) ? houseZ(file) : z, ry, far(x, z))); };
    [['bungalow-cream', -34], ['house2-mint', -20], ['flats-sky', -4], ['bungalow-sky', 11], ['house2-cream', 24], ['flats-mint', 38]].forEach(([f, x]) => add(f as string, x as number, 0));
    [['kiosk-teal', -26], ['stall-red', -12], ['kiosk-red', 3], ['stall-blue', 17], ['kiosk-blue', 31]].forEach(([f, x]) => add(f as string, x as number, -0.2 + ((f as string).startsWith('stall') ? 2.4 : 0)));
    [-30, -8, 8, 29].forEach((x, i) => add('mango-tree', x, 1.8 + (i % 2)));
    [-22, -15, 0, 14, 35].forEach((x) => add('palm', x, 2.2));
    [-34, -20, -4, 12, 27].forEach((x) => add('danfo', x, 4.7, PI / 2));
    [-27, -12, 3, 20].forEach((x) => add('keke', x, 4.7, PI / 2));
    [-26, -8, 8, 32].forEach((x) => add('danfo', x, 8.6, -PI / 2));
    [-18, -1, 17].forEach((x) => add('keke', x, 8.6, -PI / 2));
    for (const time of ['day', 'dusk', 'night']) await stage(`busy-street-${time}`, { time, base: 'street', items, cam: { pos: camPos, look: [0, 4.2, 1.5] as V3, fov: 52 } }, false);
    await stage('busy-street-phone-day', { time: 'day', base: 'street', items, cam: { pos: [0, 40, 62] as V3, look: [0, 1.5, 3] as V3, fov: 50 } }, false);
  }

  // sizes of every packed file: triangles, draw calls, texture px, bytes
  const names = readdirSync(glbDir).filter((n) => n.endsWith('.glb')).map((n) => n.replace(/\.glb$/, '')).sort();
  await call('setup', { width: 1280, height: 800, time: 'day', base: 'plain', items: names.map((n, i) => ({ src: 'new', kind: 'x', file: n, x: i * 14, z: 0 })), cam: { pos: [0, 30, 60], look: [0, 0, 0] } });
  const info = await call('modelInfo');
  for (const k of Object.keys(info)) info[k].bytesOnDisk = statSync(join(glbDir, k + '.glb')).size;
  writeFileSync(join(out, 'numbers2.json'), JSON.stringify(info, null, 1));
} finally { cleanup(); }
process.exit(0);
