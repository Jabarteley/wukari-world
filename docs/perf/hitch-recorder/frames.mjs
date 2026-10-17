// node frames.mjs <frames.json> [more...]  -> per-phase frame-time table (markdown)
import { readFileSync } from 'node:fs';
const files = process.argv.slice(2);
const q = (a, p) => a.length ? a[Math.min(a.length - 1, Math.floor(p * a.length))] : 0;
for (const f of files) {
  const { frames, phases, loaf, reloads, stride: K = 3 } = JSON.parse(readFileSync(f, "utf8")); if (reloads?.length) console.log("RELOADS during", reloads.join(", "));
  const by = new Map();
  const gaps = new Map(); let lastDraw = null, lastPh = null; for (let i = 0; i < frames.length; i += K) { const ph = phases[frames[i + 2]]; if (K === 4 && frames[i + 3]) { if (lastDraw !== null && lastPh === ph) { if (!gaps.has(ph)) gaps.set(ph, []); gaps.get(ph).push(frames[i] - lastDraw); } lastDraw = frames[i]; lastPh = ph; } if (!by.has(ph)) by.set(ph, []); if (frames[i + 1] >= 0) by.get(ph).push(frames[i + 1]); }
  console.log(`\n${f}\n| phase | frames | p50 | p95 | p99 | max | >16.7 | >33 | >50 |\n|---|---|---|---|---|---|---|---|---|`);
  const all = [];
  for (const ph of phases) { const a = by.get(ph); if (!a) continue; a.sort((x, y) => x - y); all.push(...a); console.log(`| ${ph} | ${a.length} | ${q(a, .5).toFixed(1)} | ${q(a, .95).toFixed(1)} | ${q(a, .99).toFixed(1)} | ${a.at(-1).toFixed(0)} | ${a.filter(x => x > 16.7).length} | ${a.filter(x => x > 33).length} | ${a.filter(x => x > 50).length} |`); }
  all.sort((x, y) => x - y); console.log(`| ALL | ${all.length} | ${q(all, .5).toFixed(1)} | ${q(all, .95).toFixed(1)} | ${q(all, .99).toFixed(1)} | ${all.at(-1).toFixed(0)} | ${all.filter(x => x > 16.7).length} | ${all.filter(x => x > 33).length} | ${all.filter(x => x > 50).length} |`);
  if (K === 4) { console.log('\nDraw-to-draw gaps (time between frames that drew WebGL; idle pauses count too, so read only the walking phases)\n| phase | draws | p99 gap | max gap | gaps >33 | gaps >50 |\n|---|---|---|---|---|---|'); for (const ph of phases) { const g = gaps.get(ph); if (!g) continue; g.sort((x, y) => x - y); console.log(`| ${ph} | ${g.length} | ${q(g, .99).toFixed(1)} | ${g.at(-1).toFixed(0)} | ${g.filter(x => x > 33).length} | ${g.filter(x => x > 50).length} |`); } }
  if (process.env.LOAF) for (const l of loaf) console.log(phases[l.ph], Math.round(l.t), Math.round(l.d), 'block', Math.round(l.block), 'render', Math.round(l.render), JSON.stringify(l.scripts));
}
