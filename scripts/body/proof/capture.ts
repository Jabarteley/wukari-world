// Drives the proof page in one headless Chrome (one local server, one browser) and saves the screenshots and numbers.
//   node --experimental-strip-types scripts/body/proof/capture.ts <out-dir> [--set all|main|seq|npc|numbers|debug] [--port 4350] [--chrome-port 4351]
import { gzipSync } from 'node:zlib';
import { mkdirSync, readdirSync, readFileSync, statSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { Browser } from '../../journeys/cdp.ts';
import { serveProof } from './serve.ts';
import { REPO } from './body-data.ts';
import { apng } from './apng.ts';

const args = process.argv.slice(2);
const opt = (n: string, d: string): string => { const i = args.indexOf(n); return i >= 0 ? args[i + 1]! : d; };
const out = args[0] && !args[0].startsWith('--') ? args[0] : '/tmp/proof-shots';
const port = Number(opt('--port', '4350')), chromePort = Number(opt('--chrome-port', '4351'));
const set = opt('--set', 'all');
const want = (name: string): boolean => set === 'all' || set === name;

mkdirSync(out, { recursive: true });
const server = await serveProof(port);
const browser = await Browser.launch(chromePort);
const cleanup = (): void => { browser.close(); server.close(); };
process.once('SIGTERM', () => { cleanup(); process.exit(1); });
const LOOKS = opt('--looks', 'woman-braids,man-lowcut,woman-afro,man-afro').split(',');
const DESKTOP = { width: 1280, height: 800, scale: 1, mobile: false }, PHONE = { width: 390, height: 844, scale: 1, mobile: true };
const numbers: Record<string, unknown> = {};
try {
  await browser.setViewport(DESKTOP);
  await browser.goto(`http://127.0.0.1:${port}/`);
  await browser.waitFor('!!window.proof', 20000, 'the proof page');
  const call = (fn: string, ...a: unknown[]): Promise<any> => browser.eval(`window.proof.${fn}(${a.map((x) => JSON.stringify(x)).join(',')})`);
  await call('init', await call('allParts'));
  let prefix = 'd';
  const files: string[] = [];
  const save = async (name: string, clip?: { x: number; y: number; width: number; height: number }): Promise<void> => {
    const file = join(out, `${prefix}-${name}.png`);
    if (clip) { const s = await browser.send('Page.captureScreenshot', { format: 'png', clip: { ...clip, scale: 1 } }); writeFileSync(file, Buffer.from(s.data, 'base64')); }
    else await browser.screenshot(file);
    files.push(file);
    console.log('saved', `${prefix}-${name}`);
  };
  const shot = async (name: string, spec: Record<string, unknown>, after?: () => Promise<void>, clip?: { x: number; y: number; width: number; height: number }): Promise<void> => {
    const vp = browser.viewport;
    await call('setup', { width: vp.width, height: vp.height, ...spec });
    if (after) await after();
    await call('render');
    await save(name, clip);
  };
  const viewports: [string, typeof DESKTOP][] = [['d', DESKTOP], ['p', PHONE]];

  if (set === 'debug') {
    await shot('dbg-side', { mode: 'single', look: 'woman-afro', view: 'side' });
    await shot('dbg-tq', { mode: 'single', look: 'woman-afro', view: 'tq' });
    cleanup(); process.exit(0);
  }

  if (want('main')) {
    for (const [pre, vp] of viewports) {
      prefix = pre; await browser.setViewport(vp);
      for (const look of LOOKS) {
        for (const view of ['front', 'tq', 'back']) await shot(`${look}-${view}`, { mode: 'compare', look, view });
        await shot(`${look}-face`, { mode: 'compare', look, view: 'face' });
        await shot(`${look}-sit`, { mode: 'compare', look, view: 'tq', pose: 'sit' });
      }
    }
  }
  if (want('seq')) {
    for (const [pre, vp] of viewports) {
      prefix = pre; await browser.setViewport(vp);
      const lookList = pre === 'd' ? LOOKS : ['woman-braids'];
      for (const look of lookList) {
        // blink: open, closing, closed
        for (const [i, v] of [0, 0.55, 1].entries()) await shot(`${look}-blink-${i + 1}`, { mode: 'single', look, view: 'face' }, async () => { await call('enable', { blink: false }); await call('setBlink', v); await call('advance', 0.3); });
        // moods
        for (const mood of ['happy', 'neutral', 'uneasy']) await shot(`${look}-mood-${mood}`, { mode: 'single', look, view: 'face', mood }, async () => { await call('enable', { blink: false }); await call('advance', 1.2); });
        // talking: four mouth shapes of a spoken line
        for (const [i, shape] of ['aa', 'oh', 'ee', 'mm'].entries()) await shot(`${look}-talk-${i + 1}-${shape}`, { mode: 'single', look, view: 'face', mood: 'neutral' }, async () => { await call('enable', { blink: false }); await call('setViseme', shape, 0.9); await call('advance', 0.4); });
        // idle breathing: three frames 0.7 s apart (chest view)
        await call('setup', { width: browser.viewport.width, height: browser.viewport.height, mode: 'single', look, view: 'front' });
        for (let i = 0; i < 3; i++) { await call('advance', i === 0 ? 0.3 : 0.7); await call('render'); await save(`${look}-idle-${i + 1}`); }
        // walking: four phases
        for (const [i, ph] of [0, 0.25, 0.5, 0.75].entries()) await shot(`${look}-walk-${i + 1}`, { mode: 'single', look, view: 'tq', pose: 'walk', phase: ph });
      }
    }
  }
  if (want('npc')) {
    for (const [pre, vp] of viewports) {
      prefix = pre; await browser.setViewport(vp);
      await shot('npc-row-before', { mode: 'row', side: 'old', oldDetail: 'medium' });
      await shot('npc-row-after-full', { mode: 'row', side: 'new' });
      await shot('npc-row-after-lod', { mode: 'row', side: 'new', lod: true });
      for (const look of ['woman-braids', 'man-lowcut']) await shot(`crowd-distance-${look}`, { mode: 'compare', look, view: 'far', lod: true, oldDetail: 'low', shadows: false });
    }
    prefix = 'd'; await browser.setViewport(DESKTOP);
    // portraits: transparent background, 512 px
    await browser.send('Emulation.setDefaultBackgroundColorOverride', { color: { r: 0, g: 0, b: 0, a: 0 } });
    for (const look of LOOKS) for (const mood of ['neutral', 'happy']) {
      await shot(`portrait-${look}-${mood}`, { mode: 'single', look, view: 'portrait', mood, width: 512, height: 512, noGround: true, shadows: false, pr: 1 }, async () => { await call('enable', { blink: false }); await call('advance', 1.0); }, { x: 0, y: 0, width: 512, height: 512 });
    }
    await browser.send('Emulation.setDefaultBackgroundColorOverride', {});
  }
  if (want('anim')) {
    prefix = 'd'; await browser.setViewport(DESKTOP);
    const frames = (look: string, n: number, step: number, setup: Record<string, unknown>, before?: () => Promise<void>): Promise<Buffer[]> => (async () => {
      await call('setup', { width: 640, height: 640, ...setup, look });
      if (before) await before();
      const list: Buffer[] = [];
      for (let i = 0; i < n; i++) {
        await call('advance', step); await call('render');
        const s = await browser.send('Page.captureScreenshot', { format: 'png', clip: { x: 0, y: 0, width: 640, height: 640, scale: 1 } });
        list.push(Buffer.from(s.data, 'base64'));
      }
      return list;
    })();
    const talk = await frames('woman-braids', 14, 0.1, { mode: 'single', view: 'face', mood: 'happy', shadows: false, pr: 1 }, async () => { await call('setLookAt', true); await call('say', 'Welcome to Allworld, friend'); });
    writeFileSync(join(out, 'anim-talk-woman-braids.png'), apng(talk, 100)); 
    const blink = await frames('man-lowcut', 20, 0.06, { mode: 'single', view: 'face', mood: 'neutral', shadows: false, pr: 1 }, async () => { await call('enable', { blink: true }); });
    writeFileSync(join(out, 'anim-blink-man-lowcut.png'), apng(blink, 80));
    const walk = await frames('woman-afro', 12, 1 / 12, { mode: 'single', view: 'tq', pose: 'walk', phase: 0, shadows: false, pr: 1, width: 640, height: 640 }, async () => { await call('setPose', 'walk', 0, true); });
    writeFileSync(join(out, 'anim-walk-woman-afro.png'), apng(walk, 83));
    console.log('animations saved');
  }
  if (want('numbers')) {
    await browser.setViewport(DESKTOP);
    prefix = 'd';
    const per: Record<string, unknown> = {};
    for (const look of LOOKS) {
      for (const lod of [false, true]) {
        await call('setup', { width: 800, height: 800, mode: 'single', look, view: 'front', shadows: false, lod, noGround: true, pr: 1 });
        await call('render');
        const info = await call('info');
        per[`${look}${lod ? '-crowd-lod' : '-full'}`] = { triangles: info.triangles, drawCalls: info.calls };
      }
    }
    numbers['perCharacter'] = per;
    const fps: Record<string, unknown> = {};
    for (const [label, spec] of [['full-1', { count: 1 }], ['full-12', { count: 12 }], ['full-30', { count: 30 }], ['lod-12', { count: 12, lod: true }], ['lod-30', { count: 30, lod: true }], ['lod-1', { count: 1, lod: true }]] as [string, Record<string, unknown>][]) {
      await call('setup', { width: 1280, height: 800, mode: 'row', side: 'new', shadows: false, pr: 1, noGround: true, ...spec });
      await call('render');
      const info = await call('info');
      const r = await call('bench', 4);
      fps[label] = { fps: Math.round(r.fps * 10) / 10, triangles: info.triangles, drawCalls: info.calls };
      console.log(label, fps[label]);
    }
    numbers['framesPerSecondHeadlessSoftwareRendering1280x800'] = fps;
  }
  numbers['note'] = 'Measured in headless Chrome with software rendering (SwiftShader) on a laptop CPU, no GPU. This is not a phone: use the relative numbers and the triangle and draw-call counts, not the absolute frame rate.';
  writeFileSync(join(out, `numbers-${set}.json`), JSON.stringify(numbers, null, 2));
  void files; void gzipSync; void readdirSync; void readFileSync; void statSync; void REPO;
} finally { cleanup(); }
