// Writes index.html and numbers.json in the evidence folder from the screenshots the capture script saved.
//   node --experimental-strip-types scripts/body/proof/gallery.ts <evidence-dir>
import { existsSync, readFileSync, readdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

const dir = process.argv[2]!;
const files = new Set(readdirSync(dir));
const LOOKS: Record<string, string> = {
  'woman-braids': 'Woman, braids, dark skin, ankara dress', 'man-lowcut': 'Man, low-cut, light-brown skin, plain kaftan',
  'woman-afro': 'Woman, afro, medium skin, plain dress', 'man-afro': 'Man, afro, dark skin, ankara-print kaftan',
};
const img = (name: string, caption: string, cls = ''): string => files.has(name) ? `<figure class="${cls}"><img loading="lazy" src="${name}" alt="${caption}"><figcaption>${caption}</figcaption></figure>` : '';
const strip = (names: string[], captions: string[], cls = 'small'): string => `<div class="strip">${names.map((n, i) => img(n, captions[i]!, cls)).join('')}</div>`;
let body = '';
const section = (title: string, intro: string, inner: string): void => { if (inner.trim()) body += `<section><h2>${title}</h2><p>${intro}</p>${inner}</section>`; };

for (const [look, label] of Object.entries(LOOKS)) {
  const parts: string[] = [];
  for (const [pre, vp] of [['d', 'desktop 1280x800'], ['p', 'phone 390x844']] as const) {
    parts.push(`<h4>${vp}</h4><div class="row">` + ['front', 'tq', 'back', 'face', 'sit'].map((v) => img(`${pre}-${look}-${v}.png`, `${{ front: 'Full body, front', tq: 'Three-quarter', back: 'Back', face: 'Face close-up', sit: 'Sitting' }[v]}: today (left) and proposed (right)`)).join('') + '</div>');
  }
  const seq = (pre: string): string =>
    '<h4>Face and motion (proposed)</h4>' +
    strip([1, 2, 3].map((i) => `${pre}-${look}-blink-${i}.png`), ['Blink: open', 'Blink: closing', 'Blink: closed']) +
    strip(['happy', 'neutral', 'uneasy'].map((m) => `${pre}-${look}-mood-${m}.png`), ['Mood: happy', 'Mood: neutral', 'Mood: uneasy']) +
    strip(['aa', 'oh', 'ee', 'mm'].map((s, i) => `${pre}-${look}-talk-${i + 1}-${s}.png`), ['Talking: open "ah"', 'Talking: rounded "oh"', 'Talking: wide "ee"', 'Talking: closed "mm"'], 'small') +
    strip([1, 2, 3].map((i) => `${pre}-${look}-idle-${i}.png`), ['Idle breathing, frame 1', 'frame 2 (+0.7 s)', 'frame 3 (+1.4 s)']) +
    strip([1, 2, 3, 4].map((i) => `${pre}-${look}-walk-${i}.png`), ['Walking 1', 'Walking 2', 'Walking 3', 'Walking 4']);
  parts.push(seq('d'));
  if (look === 'woman-braids') parts.push('<h4>Phone: face and motion</h4>' + seq('p'));
  section(label, 'Left is today\'s figure as the creator draws it; right is the proposed character (skinned base body plus generated face, hair and garment).', parts.join(''));
}
section('Everyone in the world, one quality', 'Twelve varied people built from the same parts: seven skin tones, three hairstyles, two garments in plain colours and two prints.',
  ['d', 'p'].map((pre) => `<h4>${pre === 'd' ? 'desktop' : 'phone'}</h4><div class="row">` + img(`${pre}-npc-row-before.png`, 'Today: twelve people from the old figure') + img(`${pre}-npc-row-after-full.png`, 'Proposed: full detail, with faces') + img(`${pre}-npc-row-after-lod.png`, 'Proposed: crowd LOD (about a quarter of the triangles, no face parts)') + '</div>').join(''));
section('Crowd distance', 'Today\'s low-detail figure (left) next to the proposed crowd LOD (right), seen from far away.',
  ['d', 'p'].map((pre) => '<div class="row">' + img(`${pre}-crowd-distance-woman-braids.png`, `${pre === 'd' ? 'Desktop' : 'Phone'}: woman, braids, ankara dress`) + img(`${pre}-crowd-distance-man-lowcut.png`, `${pre === 'd' ? 'Desktop' : 'Phone'}: man, low-cut, kaftan`) + '</div>').join(''));
const letters = Object.entries(LOOKS).map(([look]) => `<figure class="portrait"><div class="before">${look.startsWith('woman') ? 'A' : 'T'}</div><figcaption>Today: a letter in a circle</figcaption></figure>`);
section('Portraits', 'Head and shoulders rendered from the proposed character on a transparent background (shown here on a soft tile), in place of the letter in a circle.',
  '<div class="row portraits">' + Object.keys(LOOKS).map((look, i) => letters[i] + img(`d-portrait-${look}-neutral.png`, 'Proposed: neutral', 'portrait') + img(`d-portrait-${look}-happy.png`, 'Proposed: happy', 'portrait')).join('') + '</div>');
section('Moving pictures', 'Animated PNG files (open in a browser): a line of speech, blinking, and a walk cycle.',
  ['anim-talk-woman-braids.png', 'anim-blink-man-lowcut.png', 'anim-walk-woman-afro.png'].map((n, i) => img(n, ['Talking: "Welcome to Allworld, friend" (happy)', 'Blinking at random intervals', 'Walking (shipped walk clip plus life layer)'][i]!, 'small')).join(''));

const sizes = existsSync(join(dir, 'asset-sizes.json')) ? JSON.parse(readFileSync(join(dir, 'asset-sizes.json'), 'utf8')) as Record<string, { raw: number; gzip: number; packed?: number; packedGzip?: number }> : {};
const merged: Record<string, unknown> = { assets: sizes };
for (const f of readdirSync(dir)) if (/^numbers-.*\.json$/.test(f)) Object.assign(merged, JSON.parse(readFileSync(join(dir, f), 'utf8')));
writeFileSync(join(dir, 'numbers.json'), JSON.stringify(merged, null, 2));
const kb = (n?: number): string => (n === undefined ? '' : (n / 1024).toFixed(1));
section('Numbers', 'Raw, gzip, and after meshopt packing, in kB. Full numbers are in numbers.json. Frame rates come from headless software rendering and are not a phone.',
  `<table><tr><th>file</th><th>raw</th><th>gzip</th><th>packed</th><th>packed+gzip</th></tr>${Object.entries(sizes).map(([n, r]) => `<tr><td>${n}</td><td>${kb(r.raw)}</td><td>${kb(r.gzip)}</td><td>${kb(r.packed)}</td><td>${kb(r.packedGzip)}</td></tr>`).join('')}</table>`);
writeFileSync(join(dir, 'index.html'), `<!doctype html><html lang="en"><head><meta charset="utf-8"><title>Character proof</title><style>
body{font:15px system-ui,sans-serif;margin:0;background:#101a15;color:#e8f0ea}header,section{max-width:1400px;margin:0 auto;padding:18px 24px}h1{margin:0}h2{border-top:1px solid #2c4337;padding-top:18px}
.row,.strip{display:flex;flex-wrap:wrap;gap:12px}figure{margin:0;flex:1 1 380px}figure.small{flex:0 1 300px}figure img{width:100%;border-radius:8px;background:#20352c}figcaption{font-size:13px;color:#9fb8a8;padding:4px 2px}
.portraits figure{flex:0 0 150px}.portraits img{background:#e9efe9}.before{width:150px;height:150px;border-radius:50%;background:#c9d5cc;color:#35564a;font:700 64px/150px system-ui;text-align:center}
table{border-collapse:collapse}td,th{padding:3px 12px;text-align:right;border-bottom:1px solid #2c4337}td:first-child,th:first-child{text-align:left}</style></head><body><header><h1>Character proof</h1><p>Today's figure (left) against the proposed character (right): the shipped skinned base body plus face life, hair and clothing generated from it. Each caption says what the picture shows.</p></header>${body}</body></html>`);
console.log('gallery written');
