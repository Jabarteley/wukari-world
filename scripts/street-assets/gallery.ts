// Builds the gallery folder (self-contained, relative links) from the capture output.
//   node --experimental-strip-types scripts/street-assets/gallery.ts <shots-dir> <originals-dir> <work-dir> <glb-dir> <out-dir>
// <shots-dir> holds the pictures and numbers-all.json from capture.ts, <originals-dir> the downloaded models and their thumb-*.png (read only), <work-dir> the
// build's work folders (for the baked textures), <glb-dir> the packed files.
import { copyFileSync, existsSync, mkdirSync, readdirSync, readFileSync, statSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

const [shots, originals, work, glbDir, out] = process.argv.slice(2) as [string, string, string, string, string];
const img = join(out, 'img'); mkdirSync(img, { recursive: true });
const cp = (from: string, to: string): string => { copyFileSync(from, join(img, to)); return `img/${to}`; };
const numbers = JSON.parse(readFileSync(join(shots, 'numbers-all.json'), 'utf8')) as Record<string, any>;
const KINDS = ['danfo', 'keke', 'house', 'kiosk', 'mango-tree', 'palm'] as const;
const NAME: Record<string, string> = { danfo: 'Danfo (minibus)', keke: 'Keke (three-wheeler)', house: 'House', kiosk: 'Kiosk / market stall', 'mango-tree': 'Mango tree', palm: 'Palm' };
const ORIGINAL_TRIANGLES: Record<string, number> = { danfo: 4708, keke: 3979, house: 6625, kiosk: 2889, 'mango-tree': 2403, palm: 2527 };
const kb = (n: number): string => `${(n / 1024).toFixed(1)} kB`;
const MB = (n: number): string => `${(n / 1048576).toFixed(2)} MB`;

const table: Record<string, unknown> = {};
for (const k of KINDS) {
  const near = numbers.models[k], far = numbers.models[`${k}-far`];
  const variants = Object.keys(numbers.models).filter((n) => n.startsWith(k + '-') && !n.endsWith('-far') && n !== `${k}-far`).sort();
  const originalBytes = statSync(join(originals, `${k}.glb`)).size;
  table[k] = {
    before: { triangles: ORIGINAL_TRIANGLES[k], bytes: originalBytes, drawCalls: 1, textures: '4 images, 2048x2048 JPEG (base colour, metallic-roughness, normal, emissive copy)' },
    near: { triangles: near.triangles, bytes: near.bytesOnDisk, drawCalls: near.drawCalls, texturePx: near.texture, textures: 'one base-colour JPEG, no normal or metal map' },
    far: { triangles: far.triangles, bytes: far.bytesOnDisk, drawCalls: far.drawCalls, texturePx: far.texture },
    colourVariants: variants.map((v) => ({ file: `${v}.glb`, bytes: numbers.models[v].bytesOnDisk, triangles: numbers.models[v].triangles })),
    todays: numbers.today[k] ?? null,
    wheelsAsNodes: k === 'keke' ? 'yes: wheel_f, wheel_rl, wheel_rr (near version only; the far version is one mesh)' : k === 'danfo' ? 'no: the wheels are fused to the body and a cut leaves mudguard fragments that flap when turned (see the attempt pictures)' : 'not applicable',
  };
}
const final = { note: numbers.renderer, models: table, frameRate: numbers.frameRate, wheels: numbers.wheels, budgetsInGame: { sceneTriangles: 17000, sceneDrawCalls: 60, cityTriangles: 90000, cityDrawCalls: 40, perVehicleOnTheMap: '1,500 triangles and 8 draw calls', perAssetFile: '2 MiB' } };
writeFileSync(join(out, 'numbers.json'), JSON.stringify(final, null, 1));

const fig = (src: string, cap: string, w = ''): string => `<figure${w ? ` style="width:${w}"` : ''}><a href="${src}"><img src="${src}" loading="lazy" alt="${cap.replace(/"/g, '')}"></a><figcaption>${cap}</figcaption></figure>`;
let html = '';
for (const k of KINDS) {
  const t = table[k] as any;
  const thumb = cp(join(originals, `thumb-${k}.png`), `original-thumb-${k}.png`);
  const tex = existsSync(join(work, k, `${k}-color.jpg`)) ? cp(join(work, k, `${k}-color.jpg`), `texture-${k}.jpg`) : '';
  html += `<section id="${k}"><h2>${NAME[k]}</h2>
<p class="nums">Original ${t.before.triangles.toLocaleString()} triangles, ${MB(t.before.bytes)}, 4 textures of 2048 px. Reduced: ${t.near.triangles.toLocaleString()} triangles, ${kb(t.near.bytes)}, ${t.near.drawCalls} draw call${t.near.drawCalls > 1 ? 's' : ''}, one ${t.near.texturePx} px texture. Far version: ${t.far.triangles} triangles, ${kb(t.far.bytes)}, ${t.far.drawCalls} draw call, ${t.far.texturePx} px. Wheels as nodes: ${t.wheelsAsNodes}.</p>
<div class="row">${fig(thumb, 'Original generated preview (before)', '24%')}${fig(cp(join(shots, `new-close-${k}.jpg`), `new-close-${k}.jpg`), 'Reduced, close up, in the game renderer and light', '37%')}${fig(cp(join(shots, `far-close-${k}.jpg`), `far-close-${k}.jpg`), 'Far version, same close up (it is only drawn far away)', '37%')}</div>
<div class="row">${fig(cp(join(shots, `pair-close-${k}.jpg`), `pair-close-${k}.jpg`), "Close: today's (left) and generated (right), same scale", '49%')}${fig(cp(join(shots, `pair-street-${k}.jpg`), `pair-street-${k}.jpg`), "Street distance, the game's neighbourhood camera: today's (left) and generated (right)", '49%')}</div>
${tex ? `<div class="row">${fig(tex, `The baked ${t.near.texturePx} px base-colour texture (this is the whole texture of the model)`, '24%')}</div>` : ''}
</section>`;
}
const sbs = ['d-street-side-by-side-day', 'd-street-side-by-side-dusk'].map((n) => fig(cp(join(shots, `${n}.png`), `${n}.png`), n.endsWith('day') ? "Side by side, day. Left: what the game draws today. Right: the generated models, near versions, same scale." : 'Side by side, dusk (the game\'s dusk light).')).join('');
const sbsP = ['p-street-side-by-side-day', 'p-street-side-by-side-dusk'].map((n) => fig(cp(join(shots, `${n}.png`), `${n}.png`), `Phone size 390x844, ${n.endsWith('day') ? 'day' : 'dusk'}: today's in the back row, generated in the front row.`, '24%')).join('');
const busy = ['d-busy-street-day', 'd-busy-street-dusk'].map((n) => fig(cp(join(shots, `${n}.png`), `${n}.png`), `Busy street, ${n.endsWith('day') ? 'day' : 'dusk'}: 5 houses, 4 kiosks, 4 mango trees, 5 palms, 9 danfos, 7 kekes; far versions beyond 40 units from the camera.`)).join('');
const busyP = ['p-busy-street-day', 'p-busy-street-dusk'].map((n) => fig(cp(join(shots, `${n}.png`), `${n}.png`), `Phone size 390x844, busy street, ${n.endsWith('day') ? 'day' : 'dusk'}.`, '24%')).join('');
const vars = ['danfo', 'house', 'kiosk'].map((k) => fig(cp(join(shots, `variants-${k}.jpg`), `variants-${k}.jpg`), `${NAME[k]}: the same model with three textures (recoloured through region masks).`, '49%')).join('');
const wheels = [['wheels-keke-spin0.jpg', 'Keke, wheels at rest'], ['wheels-keke-spin2.jpg', 'Keke, the three wheel nodes turned 2.1 rad about their own axles: body and mudguards stay']]
  .map(([f, c]) => fig(cp(join(shots, f!), f!), c!, '49%')).join('');
const danfoAttempt = ['wheels-danfo-cut-attempt-spin0.jpg', 'wheels-danfo-cut-attempt-spin2.jpg'].map((f, i) => fig(cp(join(shots, '..', 'keep', f), f), i ? 'Danfo, the same wheels turned: pieces of mudguard come with them. Not shipped: the danfo stays one mesh.' : 'Danfo, first attempt to cut the wheels out (at rest)', '49%')).join('');
const fr = (numbers.frameRate as any[]).map((r) => `<tr><td>${r.viewport}</td><td>${r.assets}</td><td>${r.mode}</td><td>${r.fps}</td><td>${r.msPerFrame}</td><td>${r.callsScene}</td><td>${r.trianglesScene.toLocaleString()}</td></tr>`).join('');
const rows = KINDS.map((k) => { const t = table[k] as any; return `<tr><td>${NAME[k]}</td><td>${t.before.triangles.toLocaleString()}</td><td>${t.near.triangles.toLocaleString()} / ${t.far.triangles}</td><td>${MB(t.before.bytes)}</td><td>${kb(t.near.bytes)} / ${kb(t.far.bytes)}</td><td>${t.near.drawCalls} / ${t.far.drawCalls}</td><td>${t.near.texturePx} / ${t.far.texturePx}</td><td>${t.todays ? `${t.todays.triangles} tris, ${t.todays.drawCalls} calls` : ''}</td></tr>`; }).join('');

writeFileSync(join(out, 'index.html'), `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Street assets: generated models at game size</title>
<style>body{font:15px/1.5 system-ui,sans-serif;margin:0;background:#f4f1ea;color:#222}main{max-width:1320px;margin:0 auto;padding:20px}h1{margin:.2em 0}h2{margin:1.6em 0 .3em;border-bottom:2px solid #2d5a3f;padding-bottom:4px}
.row{display:flex;flex-wrap:wrap;gap:10px;margin:8px 0}figure{margin:0;width:100%}figure img{width:100%;display:block;border-radius:6px;background:#ddd}figcaption{font-size:13px;color:#444;padding:3px 2px}
table{border-collapse:collapse;font-size:13px;width:100%;background:#fff}td,th{border:1px solid #ccc;padding:4px 7px;text-align:left}th{background:#e6efe8}.nums{font-size:14px}.note{background:#fff7d6;border:1px solid #e1cf7a;padding:8px 12px;border-radius:6px}nav a{margin-right:12px}</style></head><body><main>
<h1>Street assets: six generated models at game size</h1>
<p class="note">Proof only: nothing here is switched on in the game. Every picture is drawn by the game's own renderer settings (tone mapping, light presets, sky, ground, prop and vehicle builders) in headless Chrome with software rendering. Frame rates below are from that software renderer, not from a phone or a real graphics chip: use them to compare one setup with another, not as phone numbers.</p>
<nav><a href="#sbs">Side by side</a><a href="#busy">Busy street</a>${KINDS.map((k) => `<a href="#${k}">${NAME[k]}</a>`).join('')}<a href="#variants">Colour variants</a><a href="#wheels">Wheels</a><a href="#numbers">Numbers</a><a href="numbers.json">numbers.json</a></nav>
<h2 id="sbs">The street: today's and generated, same scale</h2><div class="row">${sbs}</div><div class="row">${sbsP}</div>
<h2 id="busy">A busy street of generated assets</h2><div class="row">${busy}</div><div class="row">${busyP}</div>
${html}
<h2 id="variants">Colour variants</h2><p>No more generating: one extra 512 px texture per variant (about 20 kB), made by recolouring the baked texture inside a region mask (hue/saturation/value selection plus a position mask for the danfo's stripe). The mesh is shared.</p><div class="row">${vars}</div>
<h2 id="wheels">Wheels</h2><div class="row">${wheels}${danfoAttempt}</div>
<h2 id="numbers">Numbers</h2>
<table><tr><th>Asset</th><th>Triangles before</th><th>After near / far</th><th>Bytes before</th><th>After near / far</th><th>Draw calls near / far</th><th>Texture px near / far</th><th>Today's procedural</th></tr>${rows}</table>
<h3>Frame rate (software rendering, 1280x800 and 390x844, pixel ratio 1, shadows on as the game has them)</h3>
<table><tr><th>Viewport</th><th>Assets</th><th>Setup</th><th>fps</th><th>ms per frame</th><th>Draw calls (scene pass)</th><th>Triangles (scene pass)</th></tr>${fr}</table>
<p>"0 assets" is the street slab and road alone (4 draw calls). "One mesh each" is a clone per object; "instanced" is one instanced mesh per model and level of detail. The game's limits: scene 17,000 triangles and 60 draw calls, city 90,000 and 40.</p>
</main></body></html>`);
console.log('gallery written to', out, readdirSync(img).length, 'images');
