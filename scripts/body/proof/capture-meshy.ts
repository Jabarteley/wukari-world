// Drives page4 in one headless Chrome (one local server, one browser) and saves the screenshots and numbers.
//   node --experimental-strip-types scripts/body/proof/capture-meshy.ts <out-dir> <models-dir> [--set test|all|five|views|motion|face|size|numbers] [--port 4450] [--chrome-port 4451]
import { mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { Browser } from '../../journeys/cdp.ts';
import { serveProof } from './serve.ts';
import { REPO } from './body-data.ts';

const args = process.argv.slice(2);
const opt = (n: string, d: string): string => { const i = args.indexOf(n); return i >= 0 ? args[i + 1]! : d; };
const out = args[0]!, models = args[1]!;
const port = Number(opt('--port', '4450')), chromePort = Number(opt('--chrome-port', '4451'));
const set = opt('--set', 'test');
const want = (n: string): boolean => set === 'all' || set === n;
mkdirSync(out, { recursive: true });
const server = await serveProof(port, 'page4', join(REPO, 'scripts', 'body', 'proof', 'assets3'), models);
const browser = await Browser.launch(chromePort);
const cleanup = (): void => { browser.close(); server.close(); };
process.once('SIGTERM', () => { cleanup(); process.exit(1); });
const DESKTOP = { width: 1280, height: 800, scale: 1, mobile: false }, PHONE = { width: 390, height: 844, scale: 1, mobile: true };
const numbers: Record<string, unknown> = {};
try {
  await browser.setViewport(DESKTOP);
  await browser.goto(`http://127.0.0.1:${port}/`);
  await browser.waitFor('!!window.proof', 30000, 'the proof page');
  const call = (fn: string, ...a: unknown[]): Promise<any> => browser.eval(`window.proof.${fn}(${a.map((x) => JSON.stringify(x)).join(',')})`);
  await call('init');
  console.log('loaded', await call('loaded'));
  let prefix = 'd';
  const save = async (name: string, clip?: { x: number; y: number; width: number; height: number }): Promise<void> => {
    const file = join(out, `${prefix}-${name}.png`);
    if (clip) { const s = await browser.send('Page.captureScreenshot', { format: 'png', clip: { ...clip, scale: 1 } }); writeFileSync(file, Buffer.from(s.data, 'base64')); } else await browser.screenshot(file);
    console.log('saved', `${prefix}-${name}`);
  };
  const shot = async (name: string, spec: Record<string, unknown>, after?: () => Promise<void>): Promise<void> => {
    const vp = browser.viewport;
    await call('setup', { width: vp.width, height: vp.height, ...spec });
    if (after) await after();
    await call('render');
    await save(name);
  };
  const AI = [['ais', 'stylised'], ['air', 'realistic']] as const;
  const viewports: [string, typeof DESKTOP][] = [['d', DESKTOP], ['p', PHONE]];
  const WIDE = { width: 1700, height: 800, scale: 1, mobile: false };
  if (set === 'debug') {
    await call('setup', { width: 640, height: 400, mode: 'single', kinds: ['ais'], view: 'face' });
    await call('enable', { blink: false }); await call('setBlink', 1); await call('advance', 0.3);
    console.log(JSON.stringify(await call('debugFace')));
    await call('render'); await save('debug-blink');
  }
  if (set === 'test') {
    await shot('test-five', { mode: 'compare', kinds: ['old', 'p3', 'ais', 'air'], view: 'front' });
  }
  if (want('five')) {
    await browser.setViewport(WIDE); prefix = 'd';
    await shot('five-idle-front', { mode: 'compare', kinds: ['old', 'p3', 'ais', 'air'], view: 'front', concepts: true });
    await shot('five-walk-tq', { mode: 'compare', kinds: ['old', 'p3', 'ais', 'air'], view: 'tq', pose: 'walk', phase: 0.25, concepts: true });
    await shot('five-walk-side', { mode: 'compare', kinds: ['old', 'p3', 'ais', 'air'], view: 'side', pose: 'walk', phase: 0.6, concepts: true });
    await browser.setViewport(PHONE); prefix = 'p';
    await shot('five-idle-front', { mode: 'compare', kinds: ['old', 'p3', 'ais', 'air'], view: 'front' });
    await shot('five-walk-tq', { mode: 'compare', kinds: ['old', 'p3', 'ais', 'air'], view: 'tq', pose: 'walk', phase: 0.25 });
  }
  if (want('views')) {
    for (const [pre, vp] of viewports) {
      prefix = pre; await browser.setViewport(vp);
      for (const [kind, name] of AI) {
        for (const view of ['front', 'tq', 'side', 'back', 'face', 'hands']) await shot(`${name}-${view}`, { mode: 'single', kinds: [kind], view });
      }
    }
  }
  if (want('motion')) {
    prefix = 'd'; await browser.setViewport(DESKTOP);
    for (const [kind, name] of AI) {
      for (const [i, ph] of [0, 0.25, 0.5, 0.75].entries()) await shot(`${name}-walk-${i + 1}`, { mode: 'single', kinds: [kind], view: 'tq', pose: 'walk', phase: ph });
      for (const [i, ph] of [0.1, 0.4, 0.7].entries()) await shot(`${name}-dance-${i + 1}`, { mode: 'single', kinds: [kind], view: 'front', pose: 'dance', phase: ph });
      await shot(`${name}-sit-tq`, { mode: 'single', kinds: [kind], view: 'tq', pose: 'sit' });
      await shot(`${name}-sit-side`, { mode: 'single', kinds: [kind], view: 'side', pose: 'sit' });
      await shot(`${name}-lie`, { mode: 'single', kinds: [kind], view: 'tq', pose: 'lie' });
      await shot(`${name}-legs-walk-front`, { mode: 'single', kinds: [kind], view: 'legs', pose: 'walk', phase: 0.25 });
      await call('setup', { width: DESKTOP.width, height: DESKTOP.height, mode: 'single', kinds: [kind], view: 'front' });
      for (let i = 0; i < 3; i++) { await call('advance', i === 0 ? 0.3 : 0.9); await call('render'); await save(`${name}-idle-${i + 1}`); }
    }
    // clip-by-clip on the stylised model: where do shoulders, elbows, hips and knees break
    for (const pose of ['jog', 'dance', 'walk', 'sit', 'lie'] as const) await shot(`stylised-clip-${pose}-pair`, { mode: 'compare', kinds: ['p3', 'ais', 'air'], view: 'tq', pose, phase: 0.3 });
  }
  if (want('face')) {
    for (const [pre, vp] of viewports) {
      prefix = pre; await browser.setViewport(vp);
      const kind = 'ais', name = 'stylised';
      for (const [i, v] of [0, 0.55, 1].entries()) await shot(`${name}-blink-${i + 1}`, { mode: 'single', kinds: [kind], view: 'face' }, async () => { await call('enable', { blink: false }); await call('setBlink', v); await call('advance', 0.3); });
      for (const mood of ['happy', 'neutral', 'uneasy']) await shot(`${name}-mood-${mood}`, { mode: 'single', kinds: [kind], view: 'face', mood }, async () => { await call('enable', { blink: false }); await call('advance', 1.2); });
      for (const [i, shape] of ['aa', 'oh', 'ee', 'mm'].entries()) await shot(`${name}-talk-${i + 1}-${shape}`, { mode: 'single', kinds: [kind], view: 'face' }, async () => { await call('enable', { blink: false }); await call('setViseme', shape, 0.9); await call('advance', 0.4); });
      for (const [i, g] of ([[1, 0], [-1, 0], [0, 1], [0, -1]] as [number, number][]).entries()) await shot(`${name}-look-${['left', 'right', 'up', 'down'][i]}`, { mode: 'single', kinds: [kind], view: 'face' }, async () => { await call('enable', { blink: false }); await call('setLookAt', false); await call('setGaze', g); await call('advance', 0.5); await call('setLookAt', true); });
      await call('setGaze', null);
      await shot(`${name}-face-original-neutral`, { mode: 'single', kinds: [kind], view: 'face', face: false });
    }
  }
  if (want('size')) {
    prefix = 'd'; await browser.setViewport({ width: 640, height: 300, scale: 1, mobile: false });
    await shot('ingame-idle', { mode: 'compare', kinds: ['old', 'p3', 'ais', 'air'], view: 'front', ingame: true, pr: 1, spread: 0.75, shadows: false });
    await shot('ingame-walk', { mode: 'compare', kinds: ['old', 'p3', 'ais', 'air'], view: 'tq', pose: 'walk', phase: 0.25, ingame: true, pr: 1, spread: 0.75, shadows: false });
    await browser.setViewport({ width: 640, height: 300, scale: 1, mobile: false });
    await shot('ingame-hero-vs-crowd', { mode: 'compare', kinds: ['ais', 'ais', 'air', 'air'], lods: [false, true, false, true], view: 'front', ingame: true, pr: 1, spread: 0.75, shadows: false });
    await browser.setViewport(DESKTOP);
    await shot('hero-vs-crowd-close', { mode: 'compare', kinds: ['ais', 'ais', 'air', 'air'], lods: [false, true, false, true], view: 'front' });
    await browser.setViewport({ width: 512, height: 512, scale: 1, mobile: false });
    await browser.send('Emulation.setDefaultBackgroundColorOverride', { color: { r: 0, g: 0, b: 0, a: 0 } });
    for (const [kind, name] of AI) await shot(`portrait-${name}`, { mode: 'single', kinds: [kind], view: 'portrait', width: 512, height: 512, noGround: true, shadows: false, pr: 1 }, async () => { await call('enable', { blink: false }); await call('advance', 1.0); });
    await browser.send('Emulation.setDefaultBackgroundColorOverride', {});
    await browser.setViewport(DESKTOP);
    await shot('original-vs-reduced-front', { mode: 'compare', kinds: ['ois', 'ais', 'oir', 'air'], view: 'front' });
    await shot('original-vs-reduced-tq', { mode: 'compare', kinds: ['ois', 'ais', 'oir', 'air'], view: 'tq' });
    await shot('original-vs-reduced-face', { mode: 'compare', kinds: ['ois', 'ais', 'oir', 'air'], view: 'face' });
    await shot('original-vs-reduced-back', { mode: 'compare', kinds: ['ois', 'ais', 'oir', 'air'], view: 'back' });
  }
  if (want('numbers')) {
    await browser.setViewport(DESKTOP); prefix = 'd';
    const per: Record<string, unknown> = {};
    for (const [kind, name] of AI) for (const lod of [false, true]) {
      await call('setup', { width: 800, height: 800, mode: 'single', kinds: [kind], view: 'front', shadows: false, lod, noGround: true, pr: 1, face: false });
      await call('render'); const info = await call('info');
      per[`${name}-${lod ? 'crowd' : 'hero'}`] = { triangles: info.triangles, drawCalls: info.calls };
    }
    numbers['perCharacter'] = per;
    const fps: Record<string, unknown> = {};
    for (const [label, kind, lod, count] of [['stylised-hero-1', 'ais', false, 1], ['stylised-hero-12', 'ais', false, 12], ['stylised-hero-30', 'ais', false, 30], ['stylised-crowd-1', 'ais', true, 1], ['stylised-crowd-12', 'ais', true, 12], ['stylised-crowd-30', 'ais', true, 30], ['proof3-12', 'p3', false, 12], ['proof3-30', 'p3', false, 30]] as [string, string, boolean, number][]) {
      await call('setup', { width: 1280, height: 800, mode: 'row', kinds: [kind], lod, count, shadows: false, pr: 1, noGround: true });
      await call('render'); const info = await call('info'); const r = await call('bench', 4);
      fps[label] = { fps: Math.round(r.fps * 10) / 10, triangles: info.triangles, drawCalls: info.calls };
      console.log(label, fps[label]);
    }
    numbers['framesPerSecondHeadlessSoftwareRendering1280x800'] = fps;
  }
  numbers['note'] = 'Measured in headless Chrome with software rendering (SwiftShader) on a laptop CPU, no GPU. This is not a phone: use the triangle and draw-call counts and the relative frame rates, not the absolute numbers.';
  void PHONE;
  writeFileSync(join(out, `numbers-${set}.json`), JSON.stringify(numbers, null, 2));
} finally { cleanup(); }
