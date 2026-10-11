// Drives the proof page in one headless Chrome (one local server, one browser, ports 4481-4489, muted, stopped by PID) and saves the pictures and numbers.
//   node --experimental-strip-types scripts/street-assets/capture.ts <glb-dir> <out-dir> [--set all|compare|busy|single|variants|numbers|wheels] [--port 4481] [--chrome-port 4482]
import { mkdirSync, readdirSync, statSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { Browser } from '../journeys/cdp.ts';
import { serveProof } from './serve.ts';

const args = process.argv.slice(2);
const opt = (n: string, d: string): string => { const i = args.indexOf(n); return i >= 0 ? args[i + 1]! : d; };
const glbDir = args[0]!, out = args[1]!;
const port = Number(opt('--port', '4481')), chromePort = Number(opt('--chrome-port', '4482'));
const set = opt('--set', 'all');
const want = (n: string): boolean => set === 'all' || set === n;
mkdirSync(out, { recursive: true });

type Kind = 'danfo' | 'keke' | 'house' | 'kiosk' | 'mango-tree' | 'palm';
interface Item { src: 'old' | 'new'; kind: Kind; x: number; z: number; ry?: number; lod?: 'near' | 'far'; variant?: string; s?: number }
const KINDS: Kind[] = ['danfo', 'keke', 'house', 'kiosk', 'mango-tree', 'palm'];
const PRETTY: Record<Kind, string> = { danfo: 'Danfo', keke: 'Keke', house: 'House', kiosk: 'Kiosk', 'mango-tree': 'Mango tree', palm: 'Palm' };
// where each kind stands when shown alone (the new house sits further forward than today's: its compound is the whole footprint) and how big it is
const SIZE: Record<Kind, { r: number; h: number; newZ: number; oldZ: number; ry: number }> = {
  danfo: { r: 4.6, h: 1.4, newZ: 0, oldZ: 0, ry: Math.PI / 2 }, keke: { r: 3.2, h: 1.1, newZ: 0, oldZ: 0, ry: Math.PI / 2 },
  house: { r: 10, h: 3.8, newZ: -7.6, oldZ: 0, ry: 0 }, kiosk: { r: 3.6, h: 1.7, newZ: 0, oldZ: 0, ry: 0 },
  'mango-tree': { r: 5, h: 3.2, newZ: 0, oldZ: 0, ry: 0 }, palm: { r: 4.8, h: 3.2, newZ: 0, oldZ: 0, ry: 0 },
};

const server = await serveProof(glbDir, port);
const browser = await Browser.launch(chromePort);
const pid = browser.child.pid;
const cleanup = (): void => { try { browser.close(); } catch { /* already gone */ } server.close(); };
process.once('SIGTERM', () => { cleanup(); process.exit(1); });
const DESKTOP = { width: 1280, height: 800, scale: 1, mobile: false }, PHONE = { width: 390, height: 844, scale: 1, mobile: true };
const numbers: Record<string, unknown> = { renderer: 'headless Chrome, software rendering (SwiftShader), pixel ratio 1: not a phone and not a real GPU', chromePid: pid };
const files: string[] = [];
try {
  await browser.setViewport(DESKTOP);
  await browser.goto(`http://127.0.0.1:${port}/`);
  await browser.waitFor('!!window.proof', 30000, 'the proof page');
  const call = (fn: string, ...a: unknown[]): Promise<any> => browser.eval(`window.proof.${fn}(${a.map((x) => JSON.stringify(x)).join(',')})`);
  const save = async (name: string, jpeg = false): Promise<void> => {
    const file = join(out, `${name}.${jpeg ? 'jpg' : 'png'}`);
    const s = await browser.send('Page.captureScreenshot', jpeg ? { format: 'jpeg', quality: 86 } : { format: 'png' });
    writeFileSync(file, Buffer.from(s.data, 'base64'));
    files.push(file); console.log('saved', file);
  };
  const stage = async (name: string, spec: Record<string, unknown>, jpeg = false): Promise<void> => {
    const vp = browser.viewport;
    await call('setup', { width: vp.width, height: vp.height, time: 'day', base: 'street', ...spec });
    await call('render');
    await save(name, jpeg);
  };
  const phone = (): boolean => browser.viewport.mobile;

  // ---- side by side: today's on the left, the new ones on the right, same scale (the new house sits at the back of its plot)
  const compareItems = (lod: 'near' | 'far' = 'near'): Item[] => {
    const items: Item[] = [];
    for (const [side, sign] of [['old', -1], ['new', 1]] as const) {
      const at = (kind: Kind, x: number, z: number, ry = 0): Item => ({ src: side, kind, x: sign * x, z: side === 'new' && kind === 'house' ? SIZE.house.newZ : z, ry, lod });
      items.push(at('house', 18, 0, 0), at('kiosk', 8.5, -0.2), at('palm', 3, 1), at('mango-tree', 27, 1), at('danfo', 16, 4.8, Math.PI / 2), at('keke', 5.5, 4.8, Math.PI / 2));
    }
    return items;
  };
  const camCompare = () => phone()
    ? { pos: [0, 30, 66] as [number, number, number], look: [0, 2.5, 1] as [number, number, number] }
    : { pos: [0, 15, 38] as [number, number, number], look: [0, 2.8, 1.5] as [number, number, number] };
  const labelsCompare = (time: string) => [
    { at: [-14, 9.5, 0] as [number, number, number], text: "Today's (drawn by the game)" },
    { at: [14, 9.5, 0] as [number, number, number], text: 'Generated, reduced', note: time === 'day' ? 'near versions' : 'near versions' },
  ];
  if (want('compare')) {
    for (const [pre, vp] of [['d', DESKTOP], ['p', PHONE]] as const) {
      await browser.setViewport(vp);
      for (const time of ['day', 'dusk']) await stage(`${pre}-street-side-by-side-${time}`, { time, items: compareItems(), cam: camCompare(), labels: labelsCompare(time) });
    }
  }
  // ---- the busy street: several of each, all new
  const busyItems = (n = 99, lod = true): Item[] => {
    const items: Item[] = [];
    const camX = 0, camZ = 38;
    const pick = (x: number, z: number): 'near' | 'far' => (!lod ? 'near' : Math.hypot(x - camX, z - camZ) > 52 ? 'far' : 'near');
    const add = (kind: Kind, x: number, z: number, ry = 0, variant?: string, s?: number): void => { items.push({ src: 'new', kind, x, z: kind === 'house' ? SIZE.house.newZ : z, ry, lod: pick(x, z), variant, s }); };
    for (const x of [-32, -16, 0, 16, 32]) add('house', x, 0);
    for (const x of [-24, -3, 22, 38]) add('kiosk', x, -0.2, 0);
    for (const x of [-38, -10, 9, 28]) add('mango-tree', x, 1.6, 0, undefined, x % 2 ? 0.9 : 1.1);
    for (const x of [-30, -20, 5, 14, 34]) add('palm', x, 2.0, 0, undefined, x % 3 ? 1 : 0.85);
    const lane = Math.PI / 2;
    [[-34, 'white'], [-20, undefined], [-4, 'blue'], [12, undefined], [27, 'white']].forEach(([x, v]) => add('danfo', x as number, 4.7, lane, v as string | undefined));
    [[-27, undefined], [-12, undefined], [3, undefined], [20, undefined]].forEach(([x, v]) => add('keke', x as number, 4.7, lane, v as string | undefined));
    [[-26, 'white'], [-8, undefined], [8, 'blue'], [32, undefined]].forEach(([x, v]) => add('danfo', x as number, 8.6, -lane, v as string | undefined));
    [[-18, undefined], [-1, undefined], [17, undefined]].forEach(([x, v]) => add('keke', x as number, 8.6, -lane, v as string | undefined));
    return items.slice(0, n);
  };
  const camBusy = () => phone() ? { pos: [0, 34, 78] as [number, number, number], look: [0, 2.5, 2] as [number, number, number] } : { pos: [0, 17, 40] as [number, number, number], look: [0, 3, 1.5] as [number, number, number], fov: 52 };
  if (want('busy')) {
    for (const [pre, vp] of [['d', DESKTOP], ['p', PHONE]] as const) {
      await browser.setViewport(vp);
      for (const time of ['day', 'dusk']) await stage(`${pre}-busy-street-${time}`, { time, items: busyItems(), cam: camBusy() });
    }
  }
  await browser.setViewport(DESKTOP);

  // ---- each asset: close up and at street distance, today's beside the new, and the far version
  if (want('single')) {
    for (const kind of KINDS) {
      const s = SIZE[kind];
      const gap = s.r * 1.15;
      const pair = (lod: 'near' | 'far' = 'near'): Item[] => [
        { src: 'old', kind, x: -gap, z: s.oldZ, ry: s.ry }, { src: 'new', kind, x: gap, z: s.newZ, ry: s.ry, lod },
      ];
      const dist = s.r * 4.2;
      const dir = [0.2, 0.3, 0.93];
      const close = { pos: [dir[0]! * dist, dir[1]! * dist + s.h, dir[2]! * dist] as [number, number, number], look: [0, s.h, s.newZ / 2] as [number, number, number] };
      await stage(`pair-close-${kind}`, { base: 'plain', items: pair(), cam: close, labels: [{ at: [-gap, s.h * 2.1, 0], text: 'Today' }, { at: [gap, s.h * 2.1, s.newZ], text: 'Generated' }] }, true);
      const near = (lod: 'near' | 'far'): Item[] => [{ src: 'new', kind, x: 0, z: s.newZ, ry: s.ry, lod }];
      const fitDist = s.r * 2.1;
      const dq = [0.62, 0.34, 0.71];
      const one = { pos: [dq[0]! * fitDist, dq[1]! * fitDist + s.h, dq[2]! * fitDist] as [number, number, number], look: [0, s.h, s.newZ / 2] as [number, number, number] };
      await stage(`new-close-${kind}`, { base: 'plain', items: near('near'), cam: one }, true);
      await stage(`far-close-${kind}`, { base: 'plain', items: near('far'), cam: one }, true);
      // street distance: the game's neighbourhood camera offset, 25 units out
      const street = { pos: [15, 12, 17] as [number, number, number], look: [0, 1.5, 0] as [number, number, number] };
      await stage(`pair-street-${kind}`, { base: 'street', items: pair().map((i) => ({ ...i, x: i.x > 0 ? 4.2 : -4.2 })).map((i) => ({ ...i, z: kind === 'house' ? (i.src === 'new' ? -4 : 0) : 2.4, ry: kind === 'danfo' || kind === 'keke' ? 0.5 : (i.ry ?? 0) })), cam: street, labels: [] }, true);
    }
  }
  if (want('numbers')) {
    // frame rate with 1, 10 and 40 mixed assets (near and far versions by distance), cloned meshes and instanced meshes
    const all = busyItems(99, true);
    // a fixed mix: take items round-robin by kind so every size contains every kind
    const byKind = new Map<Kind, Item[]>(); for (const it of all) { const l = byKind.get(it.kind) ?? []; l.push(it); byKind.set(it.kind, l); }
    const mix = (n: number, lod: 'auto' | 'near'): Item[] => {
      const res: Item[] = []; let i = 0;
      while (res.length < n) { const k = KINDS[i % KINDS.length]!; const l = byKind.get(k)!; const it = l[Math.floor(i / KINDS.length) % l.length]!; res.push({ ...it, lod: lod === 'near' ? 'near' : it.lod, variant: undefined }); i++; }
      return res;
    };
    const rows: Record<string, unknown>[] = [];
    for (const [pre, vp] of [['desktop 1280x800', DESKTOP], ['phone-size 390x844', PHONE]] as const) {
      await browser.setViewport(vp);
      for (const n of [0, 1, 10, 40]) for (const [label, lod, instanced] of [['near, one mesh each', 'near', false], ['near/far by distance, one mesh each', 'auto', false], ['near/far by distance, instanced', 'auto', true]] as const) {
        if (n === 0 && label !== 'near, one mesh each') continue;
        await call('setup', { width: vp.width, height: vp.height, time: 'day', base: 'street', items: n ? mix(n, lod) : [], cam: phone() ? camBusy() : camBusy(), instanced });
        const m = await call('measure', 12);
        rows.push({ viewport: pre, assets: n, mode: label, ...m });
        console.log(pre, n, label, m.fps, 'fps', m.calls, 'calls', m.triangles, 'tris');
      }
    }
    // the same with today's procedural props, for comparison (1, 10, 40 of the old versions)
    await browser.setViewport(DESKTOP);
    for (const n of [1, 10, 40]) {
      const items = mix(n, 'near').map((i) => ({ ...i, src: 'old' as const }));
      await call('setup', { width: 1280, height: 800, time: 'day', base: 'street', items, cam: camBusy() });
      const m = await call('measure', 12);
      rows.push({ viewport: 'desktop 1280x800', assets: n, mode: "today's procedural", ...m });
      console.log('old', n, m.fps, 'fps', m.calls, 'calls', m.triangles, 'tris');
    }
    numbers['frameRate'] = rows;
  }
  // per asset facts: bytes, triangles, draw calls, texture size of every packed file; and today's counts
  await browser.setViewport(DESKTOP);
  const mixAll: Item[] = [];
  for (const f of readdirSync(glbDir).filter((n) => n.endsWith('.glb')).sort()) {
    const name = f.replace(/\.glb$/, '');
    const kind = KINDS.find((k) => name === k || name.startsWith(k + '-'));
    if (!kind) continue;
    const rest = name.slice(kind.length + 1);
    const lod = rest.endsWith('far') ? 'far' : 'near';
    const variant = rest.replace(/-?far$/, '') || undefined;
    mixAll.push({ src: 'new', kind, x: 0, z: 0, lod, variant });
  }
  await call('setup', { width: 1280, height: 800, time: 'day', base: 'plain', items: mixAll, cam: { pos: [0, 30, 60], look: [0, 0, 0] } });
  const info = await call('modelInfo');
  for (const k of Object.keys(info)) info[k].bytesOnDisk = statSync(join(glbDir, k + '.glb')).size;
  numbers['models'] = info;
  const oldItems: Item[] = KINDS.map((k, i) => ({ src: 'old', kind: k, x: i * 8, z: 0 }));
  await call('setup', { width: 1280, height: 800, time: 'day', base: 'plain', items: oldItems, cam: { pos: [0, 30, 60], look: [0, 0, 0] } });
  numbers['today'] = await call('oldInfo');
  writeFileSync(join(out, `numbers-${set}.json`), JSON.stringify(numbers, null, 1));
  console.log('console errors:', browser.consoleErrors.slice(0, 5));
} finally {
  cleanup();
}
process.exit(0);
