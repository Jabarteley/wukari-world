// Builds the round-two gallery folder. node --experimental-strip-types scripts/street-assets/gallery2.ts <shots-dir> <originals-dir> <shell-json-dir> <gallery-dir>
import { copyFileSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

const [shots, originals, shellJson, out] = process.argv.slice(2) as [string, string, string, string];
const img = join(out, 'img'); mkdirSync(img, { recursive: true });
const cp = (from: string, to: string): string => { copyFileSync(from, join(img, to)); return `img/${to}`; };
const num = JSON.parse(readFileSync(join(shots, 'numbers2.json'), 'utf8')) as Record<string, { bytesOnDisk: number; triangles: number; drawCalls: number; texture: number }>;
const fig = (src: string, cap: string, w = '100%'): string => `<figure style="width:${w}"><a href="${src}"><img src="${src}" loading="lazy" alt=""></a><figcaption>${cap}</figcaption></figure>`;
const shot = (n: string, cap: string, w?: string): string => { const f = ['jpg', 'png'].find((e) => { try { readFileSync(join(shots, `${n}.${e}`)); return true; } catch { return false; } })!; return fig(cp(join(shots, `${n}.${f}`), `${n}.${f}`), cap, w); };
const kb = (n: number): string => `${(n / 1024).toFixed(0)} kB`;
const footprints: Record<string, any> = {};
for (const t of ['bungalow', 'house2', 'flats', 'kiosk', 'stall']) footprints[t] = JSON.parse(readFileSync(join(shellJson, `${t}.json`), 'utf8'));
const rows: string[] = []; const table: Record<string, unknown> = {};
const NAMES: [string, string][] = [['bungalow-cream', 'Bungalow'], ['house2-cream', 'Two-storey family house'], ['flats-cream', 'Block of flats'], ['kiosk-teal', 'Kiosk'], ['stall-teal', 'Market stall with umbrella'], ['danfo', 'Danfo'], ['keke', 'Keke'], ['mango-tree', 'Mango tree (round one, unchanged)'], ['palm', 'Palm (round one, unchanged)']];
for (const [file, label] of NAMES) {
  const n = num[file]!, f = num[`${file}-far`]!;
  const t = file.split('-')[0]!; const fp = footprints[t];
  table[file] = { near: n, far: f, footprint: fp ? { width: fp.footprint[0], depth: fp.footprint[1], door: fp.door } : null };
  rows.push(`<tr><td>${label}</td><td>${n.triangles} / ${f.triangles}</td><td>${kb(n.bytesOnDisk)} / ${kb(f.bytesOnDisk)}</td><td>${n.drawCalls} / ${f.drawCalls}</td><td>${n.texture} / ${f.texture} px</td><td>${fp ? `${fp.footprint[0]} x ${fp.footprint[1]}` : ''}</td><td>${fp ? `x ${fp.door.x}, z ${fp.door.z}, faces ${fp.door.facing}; approach z ${fp.door.approachZ}` : ''}</td></tr>`);
}
const finals = NAMES.map(([file, label]) => shot(`final-${file.replace(/-(cream|teal)$/, '')}`, `${label}: four corners (45, 135, 225, 315 degrees), near version`, '49%')).join('');
const cl = readFileSync(join(shots, 'credits-note.txt'), 'utf8').trim();
writeFileSync(join(out, 'numbers.json'), JSON.stringify({ models: table, files: num, credits: cl }, null, 1));
writeFileSync(join(out, 'index.html'), `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Street assets, round two</title>
<style>body{font:15px/1.5 system-ui,sans-serif;margin:0;background:#f4f1ea;color:#222}main{max-width:1320px;margin:0 auto;padding:20px}h2{margin:1.6em 0 .3em;border-bottom:2px solid #2d5a3f;padding-bottom:4px}.row{display:flex;flex-wrap:wrap;gap:10px;margin:8px 0}figure{margin:0}figure img{width:100%;display:block;border-radius:6px;background:#ddd}figcaption{font-size:13px;color:#444;padding:3px 2px}table{border-collapse:collapse;font-size:13px;width:100%;background:#fff}td,th{border:1px solid #ccc;padding:4px 7px;text-align:left}th{background:#e6efe8}.note{background:#fff7d6;border:1px solid #e1cf7a;padding:8px 12px;border-radius:6px}</style></head><body><main>
<h1>Street assets, round two: straight walls</h1>
<p class="note">Round one (reduced generated meshes, whose walls wobbled) is in <a href="round1/index.html">round1/</a>. Pictures are drawn by the game's renderer settings in headless Chrome with software rendering. Nothing is switched on in the game. ${cl}</p>
<h2>The house, three routes, same renderer</h2>
<p>A: generated again from a clean concept picture, then flat faces merged and a gentle reduction. B: clean geometry built by script (walls, roof planes, window and door pieces, veranda), skinned with a generated window and door picture and drawn plaster and roofing. C: the B shell with generated props (round-one palm and mango tree) placed beside it. B wins: straight by construction, 190 triangles instead of 3,323. A is much better than round one but its roof edge wobbles and the roof is speckled with white holes.</p>
<div class="row">${shot('route-close', 'A, B and C side by side (close)')}</div>
<div class="row">${['A', 'B', 'C'].map((r) => shot(`route-${r}-sides`, `Route ${r}: four sides`, '33%')).join('')}</div>
<div class="row">${['A', 'B', 'C'].map((r) => shot(`route-${r}-street`, `Route ${r} at street distance (the game's neighbourhood camera)`, '33%')).join('')}</div>
<div class="row">${fig(cp(join(originals, 'c-house.png'), 'concept-house.png'), 'The clean concept picture used for route A', '33%')}${fig(cp(join(originals, 'a-house-thumb.png'), 'a-house-thumb.png'), 'Route A as generated', '24%')}</div>
<h2>Every final asset from four corners</h2><div class="row">${finals}</div>
<h2>Today's props beside round two</h2><div class="row">${shot('side-by-side-day', "Day")}${shot('side-by-side-dusk', 'Dusk')}${shot('side-houses', "Today's house and the three new house types")}</div>
<h2>The busy street</h2><div class="row">${shot('busy-street-day', 'Day')}${shot('busy-street-dusk', 'Dusk')}${shot('busy-street-night', 'Night')}${shot('busy-street-phone-day', 'Phone size', '24%')}</div>
<h2>Colour variants</h2><div class="row">${['bungalow', 'house2', 'flats'].map((t) => shot(`variants-${t}`, `${t}: cream, mint, sky walls`, '49%')).join('')}${shot('variants-kiosk-stall', 'Kiosk awnings (front row) and umbrellas (back row)', '49%')}</div>
<h2>Numbers: near / far</h2>
<table><tr><th>Asset</th><th>Triangles</th><th>Bytes</th><th>Draw calls</th><th>Texture</th><th>Footprint (game units)</th><th>Door, in game axes (z toward the street)</th></tr>${rows.join('')}</table>
<p>The keke's near version has two rear wheel nodes (wheel_rl, wheel_rr) plus the body: 3 draw calls; the far version is one. The danfo's wheels are fused to its body and stay fixed. Wall colour variants of each building are separate files of the same size (cream, mint, sky; kiosk and stall: teal, red, blue).</p>
<p><a href="numbers.json">numbers.json</a></p></main></body></html>`);
console.log('gallery 2 written');
