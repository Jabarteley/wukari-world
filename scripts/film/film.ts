// Allworld film rig: driver library. Runs from the game worktree (it imports the journeys' CDP driver).
import { Browser, sleep } from '/Users/anthonyakpan/Documents/Allworld-notes/work/x1-adcap/scripts/journeys/cdp.ts';
import { playNow } from '/Users/anthonyakpan/Documents/Allworld-notes/work/x1-adcap/scripts/journeys/kit.ts';
import { readFileSync, mkdirSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
export { sleep };
const HERE = dirname(fileURLToPath(import.meta.url));
export const BASE = process.env.FILM_BASE || 'http://127.0.0.1:4631';
export const PORT = Number(process.env.FILM_CDP || 4632);

export class Film {
  b!: Browser;
  w = 540; h = 960; scale = 2;
  static async open(opts: { w?: number; h?: number; scale?: number; fresh?: boolean } = {}): Promise<Film> {
    const f = new Film();
    f.b = await Browser.attach(PORT, { kill() {} } as any, '/nonexistent');
    f.w = opts.w ?? 540; f.h = opts.h ?? 960; f.scale = opts.scale ?? 2;
    await f.b.setViewport({ width: f.w, height: f.h, scale: f.scale, mobile: false });
    if (opts.fresh !== false) await f.b.send('Page.addScriptToEvaluateOnNewDocument', { source: readFileSync(join(HERE, 'inject.js'), 'utf8') });
    return f;
  }
  ev<T = any>(js: string): Promise<T> { return this.b.eval<T>(js); }
  /** New guest through the creator (open dev mode: settled life with a home and money). */
  async newPlayer(name: string): Promise<void> { await playNow(this.b, BASE, name); }
  async tapText(selector: string, text?: string): Promise<void> { await this.b.click(selector, text); }
  /** Hide every panel with the game's own "Clean screen" eye, then the leftovers (dev button, guide, banners). */
  /** Hide every panel: the game's own "Clean screen" eye, then everything the eye leaves (top bar, banners, guide, dev button, joystick, door tags). */
  async cleanScreen(o: { tags?: boolean } = {}): Promise<void> {
    const css = `#life-overlay, .attn, .lumo-root, .toast-stack, .scene-controls, body > div:not([id]):not([class]), .ui-note, .life-wordmark, #life-dialog { display: none !important; }` + (o.tags ? `[data-kind="city-gate"], [data-tag="home-door"], [data-kind="home-door"], [data-kind="neighbour-door"] { display: none !important; }` : `.scene-tags { display: none !important; }`);
    await this.ev(`(() => { document.getElementById('film-clean')?.remove(); const s = document.createElement('style'); s.id = 'film-clean'; s.textContent = ${JSON.stringify(css)}; document.head.append(s); })()`);
  }
  freeze(): Promise<void> { return this.ev(`window.__film.freeze()`); }
  async shotFile(file: string, jpeg = true): Promise<void> {
    const r = await this.b.send('Page.captureScreenshot', jpeg ? { format: 'jpeg', quality: 94 } : { format: 'png' });
    writeFileSync(file, Buffer.from(r.data, 'base64'));
  }
  close(): void { try { this.b.ws.close(); } catch {} }
}

import { dismiss, gameShown } from '/Users/anthonyakpan/Documents/Allworld-notes/work/x1-adcap/scripts/journeys/kit.ts';
export async function resume(f: Film): Promise<void> {
  await f.b.goto(BASE + '/');
  await f.b.waitFor(`!!document.querySelector('.hud-cash') || !!document.querySelector('[data-qs-name], [data-entry-creator]')`, 60000, 'game or entry');
  if (!(await f.ev<boolean>(`!!document.querySelector('.hud-cash')`))) throw new Error('no saved life: call newPlayer first');
  await dismiss(f.b, 2500);
}
export const where = (f: Film): Promise<string> => f.ev<string>(`document.body.innerText.includes('Outside your home') ? 'street' : document.body.innerText.includes('Starter house') ? 'home' : 'other'`);
/** Bring the player to the street outside their home. */
export async function toStreet(f: Film): Promise<void> {
  let at = await where(f);
  if (at === 'street') return;
  if (at !== 'home') {
    await f.tapText('button', 'Home');            // bottom bar: Home opens the map card for home
    await f.b.waitFor(`[...document.querySelectorAll('button')].some(b => /^Danfo|^Trek/.test(b.innerText||b.getAttribute('aria-label')||''))`, 20000, 'travel card');
    await f.tapText('button', 'Trek'); await sleep(300);
    await f.tapText('button', 'Go ·');
    await f.b.waitFor(`document.body.innerText.includes('Starter house')`, 90000, 'arrival home');
    await sleep(1500);
  }
  await f.b.click('button', 'Step outside');
  await f.b.waitFor(`document.body.innerText.includes('Outside your home')`, 30000, 'street');
}

export interface Rig { anchor?: 'avatar' | number[]; yaw?: number; pitch?: number; dist?: number; look?: number[]; lat?: number; fov?: number; headingSmooth?: number; lag?: number; world?: boolean }
export interface Roll { dir: string; n: number; fps?: number; sub?: number; rig: (t: number, i: number) => Rig | null; before?: (i: number, t: number) => Promise<void>; start?: number; quality?: number }
/** Step the frozen game one frame at a time and write a numbered JPEG per frame. Returns the avatar track and per-frame wall time. */
export async function roll(f: Film, o: Roll): Promise<{ track: any[]; ms: number[] }> {
  mkdirSync(o.dir, { recursive: true });
  const fps = o.fps ?? 30, sub = o.sub ?? 2, track: any[] = [], ms: number[] = [];
  for (let i = 0; i < o.n; i++) {
    const t0 = Date.now(), t = i / fps;
    if (o.before) await o.before(i, t);
    const rig = o.rig(t, i);
    const info = await f.ev(`(() => { const F = window.__film; F.setRig(${JSON.stringify(rig)}); if (!${JSON.stringify(rig)}) F.cam = null; return F.step(${1 / fps}, ${sub}); })()`);
    track.push(info);
    await f.shotFile(join(o.dir, `f${String(i + (o.start ?? 0)).padStart(4, '0')}.jpg`));
    ms.push(Date.now() - t0);
  }
  return { track, ms };
}
export const ease = { lin: (t: number) => t, io: (t: number) => t * t * (3 - 2 * t), out: (t: number) => 1 - (1 - t) ** 3, in: (t: number) => t ** 3, ioq: (t: number) => t < 0.5 ? 4 * t ** 3 : 1 - (-2 * t + 2) ** 3 / 2 };
export const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
/** Keyframes: [[t, value], ...] with an easing between each pair (default smoothstep). Values may be numbers or arrays. */
export function track(keys: Array<[number, number | number[]]>, e: (t: number) => number = ease.io) {
  return (t: number): any => {
    if (t <= keys[0]![0]) return keys[0]![1];
    for (let i = 1; i < keys.length; i++) {
      const [t1, v1] = keys[i]!, [t0, v0] = keys[i - 1]!;
      if (t <= t1) { const u = e((t - t0) / (t1 - t0)); return Array.isArray(v0) ? v0.map((x, j) => lerp(x, (v1 as number[])[j]!, u)) : lerp(v0 as number, v1 as number, u); }
    }
    return keys[keys.length - 1]![1];
  };
}
