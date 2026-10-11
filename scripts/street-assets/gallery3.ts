// Builds the round-three gallery. node --experimental-strip-types scripts/street-assets/gallery3.ts <shots-dir> <originals-dir> <assets-dir> <gallery-dir> <credits-text>
import { copyFileSync, mkdirSync, readFileSync, readdirSync, writeFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';

const [shots, originals, assets, out, credits] = process.argv.slice(2) as [string, string, string, string, string];
const img = join(out, 'img'); mkdirSync(img, { recursive: true });
const cp = (from: string, to: string): string => { copyFileSync(from, join(img, to)); return `img/${to}`; };
const fig = (src: string, cap: string, w = '100%'): string => `<figure style="width:${w}"><a href="${src}"><img src="${src}" loading="lazy" alt=""></a><figcaption>${cap}</figcaption></figure>`;
const shot = (n: string, cap: string, w?: string): string => { const f = ['jpg', 'png'].find((e) => existsSync(join(shots, `${n}.${e}`))); if (!f) return ''; return fig(cp(join(shots, `${n}.${f}`), `${n}.${f}`), cap, w); };
const num = JSON.parse(readFileSync(join(shots, 'numbers3.json'), 'utf8')) as Record<string, { bytesOnDisk: number; triangles: number; drawCalls: number; texture: number; size: number[] }>;
const foot = JSON.parse(readFileSync(join(assets, 'footprints.json'), 'utf8')) as Record<string, any>;
const shopsJ = JSON.parse(readFileSync(join(assets, 'shop-interior.json'), 'utf8')) as Record<string, any>;
const stats = JSON.parse(readFileSync(join(shots, 'scene-stats.json'), 'utf8'));
const kb = (n: number): string => `${(n / 1024).toFixed(0)} kB`;
const four = readdirSync(shots).filter((n) => n.startsWith('four-')).map((n) => n.replace(/\.jpg$/, '')).sort();
const wantFour = ['danfo', 'danfo-white-green', 'danfo-blue-white', 'keke', 'okada', 'bus', 'saloon-cream', 'saloon-red', 'saloon-blue', 'saloon-green', 'suv-white', 'pickup-white', 'van-white', 'shops-cream', 'shoprow-cream', 'church-cream', 'mosque-cream', 'school-cream', 'clinic-cream', 'filling-cream', 'bank-cream', 'unfinished-cream', 'kiosk-teal', 'stall-teal'];
const names = Object.keys(num).filter((n) => !n.endsWith('-far')).sort();
const rows = names.map((k) => { const f = num[`${k}-far`]; const t = k.split('-')[0]!; const fp = foot[t]; return `<tr><td>${k}</td><td>${num[k]!.triangles} / ${f ? f.triangles : ''}</td><td>${kb(num[k]!.bytesOnDisk)} / ${f ? kb(f.bytesOnDisk) : ''}</td><td>${num[k]!.drawCalls} / ${f ? f.drawCalls : ''}</td><td>${num[k]!.texture} px</td><td>${fp && /-(cream|teal)$|^[a-z0-9]+$/.test(k) ? `${fp.footprint[0]} x ${fp.footprint[1]}; door ${fp.door ? `x ${fp.door.x}, z ${fp.door.z}` : 'n/a'}` : ''}</td></tr>`; }).join('');
const slotRows = (shopsJ['fashion'].slots as any[]).map((s) => `<tr><td>${s.name}</td><td>${s.x}, ${s.y}, ${s.z}</td><td>${s.width} x ${s.height}</td><td>${s.kind}</td><td>${s.anchor}</td><td>${s.facing_gltf.join(', ')}</td></tr>`).join('');
const sceneStats = Object.entries(stats).map(([k, v]: [string, any]) => `<tr><td>${k}</td><td>${v.items}</td><td>${v.callsScene}</td><td>${v.trianglesScene}</td><td>${v.fps}</td></tr>`).join('');
writeFileSync(join(out, 'numbers.json'), JSON.stringify({ files: num, footprints: foot, shop: shopsJ, scenes: stats, credits }, null, 1));
writeFileSync(join(out, 'index.html'), `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Street assets, round three</title>
<style>body{font:15px/1.5 system-ui,sans-serif;margin:0;background:#f4f1ea;color:#222}main{max-width:1320px;margin:0 auto;padding:20px}h2{margin:1.6em 0 .3em;border-bottom:2px solid #2d5a3f;padding-bottom:4px}.row{display:flex;flex-wrap:wrap;gap:10px;margin:8px 0}figure{margin:0}figure img{width:100%;display:block;border-radius:6px;background:#ddd}figcaption{font-size:13px;color:#444;padding:3px 2px}table{border-collapse:collapse;font-size:12px;width:100%;background:#fff}td,th{border:1px solid #ccc;padding:3px 6px;text-align:left}th{background:#e6efe8}.note{background:#fff7d6;border:1px solid #e1cf7a;padding:8px 12px;border-radius:6px}</style></head><body><main>
<h1>Street assets, round three: the first street set</h1>
<p class="note">Rounds one and two are in <a href="round1/index.html">round1/</a> and <a href="round2/index.html">round2/</a>. Pictures come from the game's renderer settings in headless Chrome with software rendering; nothing is switched on in the game. Vehicle lights at dusk and night are glowing markers placed at the named light_* empties (the game would switch real lights there). ${credits}</p>
<h2>Scenes from the set (day, dusk, night; 1280x800 and 390x844)</h2>
${['market', 'residential', 'mainroad'].map((s) => `<div class="row">${['day', 'dusk', 'night'].map((t) => shot(`scene-${s}-${t}-d`, `${s}, ${t}`, '33%')).join('')}</div><div class="row">${['day', 'dusk', 'night'].map((t) => shot(`scene-${s}-${t}-p`, `${s}, ${t}, phone size`, '16%')).join('')}</div>`).join('')}
<table><tr><th>Scene</th><th>Assets</th><th>Draw calls</th><th>Triangles</th><th>fps (software rendering, 1280x800, shadows on, one mesh per object, no instancing)</th></tr>${sceneStats}</table>
<h2>Side by side with today's props</h2><div class="row">${shot('side-by-side-day', 'Day')}${shot('side-by-side-dusk', 'Dusk')}</div>
<h2>The shop interior (three themes), open front and from inside, with placeholder boxes in the twelve slots</h2>
${['fashion', 'food', 'electronics'].map((t) => `<div class="row">${shot(`shop-${t}-front`, `${t}: from the open front`, '33%')}${shot(`shop-${t}-inside`, `${t}: from inside, looking left`, '33%')}${shot(`shop-${t}-inside-right`, `${t}: from inside, looking right`, '33%')}</div>`).join('')}
<table><tr><th>Slot (named empty)</th><th>Position x, y (up), z (toward the street) in metres</th><th>Item size w x h</th><th>Where</th><th>Item anchored</th><th>Faces (glTF)</th></tr>${slotRows}</table>
<p>Room 6.0 wide, 5.0 deep, 3.2 high, open at the front. Also in the file: <code>shop_sign</code> (3.2 x 0.45, its own node and UV rectangle), <code>photos_area</code> (2.8 x 0.75, own node), <code>light_room</code>, <code>camera_in</code>, <code>visitor_stand</code>. Slot positions are the same in the three themes. Full list in <code>assets/shop-interior.json</code>.</p>
<h2>Vehicles</h2><div class="row">${shot('group-danfo-liveries', 'Danfo in three liveries: yellow with black stripe, white with green stripe, blue with white stripe', '49%')}${shot('group-saloons', 'Saloon in four colours', '49%')}${shot('group-cars2', 'SUV (white, black), pickup (white, blue), delivery van (white, blue)', '49%')}${shot('spin2-bus', 'Bus with all six wheel nodes turned 2.4 rad about their axles (spin0 and spin1 are in img/)', '49%')}${shot('spin0-bus', 'Bus, wheels at rest', '16%')}${shot('spin1-bus', 'Bus, 1.2 rad', '16%')}</div>
<h2>Buildings in three wall colours</h2><div class="row">${[1, 2, 3].map((i) => shot(`colours-${i}`, `Set ${i}`, '33%')).join('')}${shot('colours-kiosk-stall', 'Kiosk awnings and stall umbrellas', '33%')}</div>
<h2>Props</h2><div class="row">${['props1', 'props2', 'props3'].map((g) => shot(`group-${g}`, `${g}: four corners of a row of props`, '49%')).join('')}</div>
<h2>Every asset from four sides</h2><div class="row">${wantFour.map((n) => shot(`four-${n}`, n, '49%')).join('')}${four.filter((n) => !wantFour.includes(n.replace('four-', ''))).map((n) => shot(n, n.replace('four-', ''), '49%')).join('')}</div>
<h2>Numbers (near / far)</h2><table><tr><th>File</th><th>Triangles</th><th>Bytes</th><th>Draw calls</th><th>Texture</th><th>Footprint (game units) and door</th></tr>${rows}</table>
<p><a href="numbers.json">numbers.json</a></p></main></body></html>`);
console.log('gallery 3 written');
