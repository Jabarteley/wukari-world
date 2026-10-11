// Builds the evidence gallery (index.html) and numbers.json for the generated-character proof.
//   node --experimental-strip-types scripts/body/proof/meshy_gallery.ts <evidence-dir> <models-dir> <work-dir> [<capture-numbers.json>]
// <evidence-dir>/raw holds the screenshots from capture-meshy.ts. <models-dir> holds the shipped .glb files, <work-dir>/<set>/ the unpacked ones.
import { existsSync, readFileSync, readdirSync, statSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { gzipSync } from 'node:zlib';

const [evidence, models, work, captured] = process.argv.slice(2);
if (!evidence || !models || !work) throw new Error('usage: meshy_gallery.ts <evidence-dir> <models-dir> <work-dir> [capture-numbers.json]');
const raw = join(evidence, 'raw');
const files = new Set(readdirSync(raw).filter((f) => f.endsWith('.png')));

const SECTIONS: { title: string; note?: string; items: [string, string][] }[] = [
  { title: '1. The five-way comparison', note: 'Today | best hand-built | AI stylised (reduced, on the game skeleton, game clips) | AI realistic (same) | the two concept images they were generated from.', items: [
    ['d-five-idle-front', 'Idle, front: the four characters in the same light, with the concept images as the target (1700x800).'],
    ['d-five-walk-tq', 'Walking (shipped clip), three-quarter view.'],
    ['d-five-walk-side', 'Walking, side view.'],
    ['p-five-idle-front', 'Phone-sized frame (390x844), idle.'],
    ['p-five-walk-tq', 'Phone-sized frame, walking.'],
  ] },
  { title: '2. Cost of the reduction', items: [
    ['d-original-vs-reduced-front', 'Original (120k / 113k triangles, three 2048 px maps) next to the reduced hero (13k, one 1024 px map), front.'],
    ['d-original-vs-reduced-tq', 'Same, three-quarter view.'],
    ['d-original-vs-reduced-face', 'Same, face close-up: what the reduction costs the face.'],
    ['d-original-vs-reduced-back', 'Same, back view: the weaker back survives about as well as it started.'],
    ['d-hero-vs-crowd-close', 'Hero (13k triangles, 1024 px) versus crowd (2.8k triangles, 512 px), both models.'],
  ] },
  { title: '3. In-game size', note: 'The character stands 120 px tall in a 640x300 frame, drawn at 1x. The gallery enlarges the frame without smoothing.', items: [
    ['d-ingame-idle', 'Idle at in-game size: today | hand-built | AI stylised | AI realistic.'],
    ['d-ingame-walk', 'Walking at in-game size.'],
    ['d-ingame-hero-vs-crowd', 'Hero and crowd versions at in-game size (stylised, stylised crowd, realistic, realistic crowd).'],
    ['d-portrait-stylised', '512 px portrait, stylised.'],
    ['d-portrait-realistic', '512 px portrait, realistic.'],
  ] },
];
for (const [name, title] of [['stylised', 'AI stylised'], ['realistic', 'AI realistic']] as const) {
  SECTIONS.push({ title: `${title}: views`, items: [
    ...['front', 'tq', 'side', 'back', 'face', 'hands'].map((v): [string, string] => [`d-${name}-${v}`, `${title}, ${v === 'tq' ? 'three-quarter' : v}.`]),
    ...['front', 'back', 'face'].map((v): [string, string] => [`p-${name}-${v}`, `${title}, ${v}, phone-sized.`]),
  ] });
  SECTIONS.push({ title: `${title}: motion`, note: 'Shipped clips on the game skeleton; no retargeting at runtime.', items: [
    ...[1, 2, 3, 4].map((i): [string, string] => [`d-${name}-walk-${i}`, `Walk, frame ${i} of 4.`]),
    ['d-' + name + '-legs-walk-front', 'Walk from the front, skirt and legs close up.'],
    ...[1, 2, 3].map((i): [string, string] => [`d-${name}-dance-${i}`, `Dance, frame ${i} of 3.`]),
    [`d-${name}-idle-1`, 'Idle, frame 1.'], [`d-${name}-idle-2`, 'Idle, frame 2.'], [`d-${name}-idle-3`, 'Idle, frame 3.'],
    [`d-${name}-sit-tq`, 'Sit, three-quarter.'], [`d-${name}-sit-side`, 'Sit, side.'], [`d-${name}-lie`, 'Lie (sleep clip).'],
  ] });
}
SECTIONS.push({ title: 'Clip by clip against the hand-built figure', items: ['jog', 'dance', 'walk', 'sit', 'lie'].map((c): [string, string] => [`d-stylised-clip-${c}-pair`, `${c}: hand-built | AI stylised | AI realistic.`]) });
SECTIONS.push({ title: 'Face life on the baked face (stylised)', note: 'Eyes and brows are repainted live over the baked ones, mouth shapes are painted patches, the jaw, mouth corners and brows are shape keys, gaze moves the painted irises.', items: [
  ...[1, 2, 3].map((i): [string, string] => [`d-stylised-blink-${i}`, `Blink, step ${i} of 3.`]),
  ...['left', 'right', 'up', 'down'].map((g): [string, string] => [`d-stylised-look-${g}`, `Look ${g}.`]),
  ...['aa', 'oh', 'ee', 'mm'].map((s, i): [string, string] => [`d-stylised-talk-${i + 1}-${s}`, `Talk shape ${s.toUpperCase()}.`]),
  ...['happy', 'neutral', 'uneasy'].map((m): [string, string] => [`d-stylised-mood-${m}`, `Mood: ${m}.`]),
  ['d-stylised-face-original-neutral', 'For comparison: the original baked face, no overlay.'],
  ...[1, 2, 3].map((i): [string, string] => [`p-stylised-blink-${i}`, `Phone-sized blink, step ${i}.`]),
  ...['aa', 'oh', 'ee', 'mm'].map((s, i): [string, string] => [`p-stylised-talk-${i + 1}-${s}`, `Phone-sized talk shape ${s.toUpperCase()}.`]),
  ...['happy', 'neutral', 'uneasy'].map((m): [string, string] => [`p-stylised-mood-${m}`, `Phone-sized mood: ${m}.`]),
] });

const esc = (s: string): string => s.replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]!);
let body = '';
let used = 0;
for (const sec of SECTIONS) {
  const items = sec.items.filter(([f]) => files.has(`${f}.png`));
  if (!items.length) continue;
  body += `<h2>${esc(sec.title)}</h2>${sec.note ? `<p class="note">${esc(sec.note)}</p>` : ''}<div class="grid">`;
  for (const [f, cap] of items) {
    used++;
    const small = f.includes('ingame');
    body += `<figure${small ? ' class="px"' : ''}><a href="raw/${f}.png"><img loading="lazy" src="raw/${f}.png" alt="${esc(cap)}"></a><figcaption>${esc(cap)}</figcaption></figure>`;
  }
  body += '</div>';
}
const html = `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Generated characters, reduced and rigged for the game</title>
<style>body{margin:0;font:15px/1.45 system-ui,sans-serif;background:#10201a;color:#eaf2ee}main{max-width:1500px;margin:0 auto;padding:24px}h1{font-size:26px}h2{margin:36px 0 6px;font-size:20px;border-bottom:1px solid #2f4a3e;padding-bottom:4px}.note{opacity:.8;margin:4px 0 12px}.grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(360px,1fr));gap:14px}figure{margin:0;background:#16302680;border-radius:8px;overflow:hidden}img{width:100%;display:block}figure.px img{image-rendering:pixelated}figcaption{padding:8px 10px;font-size:13px}code{background:#0006;padding:1px 5px;border-radius:4px}</style></head><body><main>
<h1>Generated characters, reduced and rigged for the game</h1>
<p class="note">Every image is drawn by the proof page in a headless browser with software rendering (the way the game draws), lit with the same rig as the earlier proofs. Numbers are in <code>numbers.json</code>; the frame rates there are not from a phone. Models created with Meshy (https://www.meshy.ai/) – CC BY 4.0 (https://creativecommons.org/licenses/by/4.0/).</p>
${body}</main></body></html>`;
writeFileSync(join(evidence, 'index.html'), html);

// ---- numbers.json
const nums: Record<string, unknown> = {};
const fileRows: Record<string, unknown> = {};
for (const f of readdirSync(models).filter((x) => x.endsWith('.glb') && !x.includes('original')).sort()) {
  const data = readFileSync(join(models, f));
  const row: Record<string, unknown> = { shippedBytes: data.length, shippedGzipBytes: gzipSync(data).length };
  for (const dir of readdirSync(work)) { const raw0 = join(work, dir, f.replace('.glb', '.raw.glb')); if (existsSync(raw0)) { const r = readFileSync(raw0); row['unpackedBytes'] = r.length; row['unpackedGzipBytes'] = gzipSync(r).length; } }
  row['textureEdgePx'] = f.includes('crowd') ? 512 : 1024;
  fileRows[f] = row;
}
nums['files'] = fileRows;
const originals: Record<string, unknown> = {};
for (const f of readdirSync(models).filter((x) => x.includes('original'))) originals[f] = { bytes: statSync(join(models, f)).size, textures: '3 maps (base colour, metallic-roughness, normal), 2048 px each' };
nums['originals'] = originals;
if (captured && existsSync(captured)) nums['capture'] = JSON.parse(readFileSync(captured, 'utf8'));
writeFileSync(join(evidence, 'numbers.json'), JSON.stringify(nums, null, 2));
console.log(`gallery: ${used} images`);
