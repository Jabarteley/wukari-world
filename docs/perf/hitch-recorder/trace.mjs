// node --max-old-space-size=12000 trace.mjs <trace.json> [minMs=33]  -> long main-thread tasks per phase with attribution
import { createReadStream } from 'node:fs'; import { createInterface } from 'node:readline';
const [file, minArg] = process.argv.slice(2); const MIN = +(minArg || 33) * 1000;
const ev = []; const keepCat = /devtools\.timeline|v8|gpu|__metadata|blink/;
for await (let line of createInterface({ input: createReadStream(file), crlfDelay: Infinity })) { if (!line.startsWith('{"')) continue; if (line.endsWith(',')) line = line.slice(0, -1); let e; try { e = JSON.parse(line); } catch { continue; } if (e.traceEvents) continue; if (e.ph === 'X' && e.dur != null && e.dur < 200 && e.name !== 'ProfileChunk') { if (!/GC|Compile/.test(e.name)) continue; } ev.push(e); }
const tname = new Map(); for (const e of ev) if (e.ph === 'M' && e.name === 'thread_name') tname.set(e.pid + ':' + e.tid, e.args.name);
// main renderer = the CrRendererMain thread with the most FunctionCall events
const fc = new Map(); for (const e of ev) if (e.name === 'FunctionCall') { const k = e.pid + ':' + e.tid; fc.set(k, (fc.get(k) || 0) + 1); }
const main = [...fc].sort((a, b) => b[1] - a[1])[0][0];
const gpuMain = [...tname].find(([k, v]) => v === 'CrGpuMain')?.[0];
const on = (e, k) => e.pid + ':' + e.tid === k;
// phases from console.timeStamp
const marks = ev.filter(e => e.name === 'TimeStamp' && /^phase:/.test(e.args?.data?.message || '')).map(e => ({ ts: e.ts, name: e.args.data.message.slice(6).split('@')[0] })).sort((a, b) => a.ts - b.ts);
const phaseAt = ts => { let p = 'load'; for (const m of marks) if (m.ts <= ts) p = m.name; return p; };
// cpu samples for main thread
const profs = new Map();
for (const e of ev) {
  if (e.name === 'Profile' && on(e, main)) profs.set(e.id, { start: e.args.data.startTime, nodes: new Map(), samples: [], times: [], t: e.args.data.startTime });
}
for (const e of ev) if (e.name === 'ProfileChunk' && profs.has(e.id)) { const p = profs.get(e.id), d = e.args.data, cp = d.cpuProfile || {};
  for (const n of cp.nodes || []) p.nodes.set(n.id, n);
  const s = cp.samples || [], td = d.timeDeltas || []; for (let i = 0; i < s.length; i++) { p.t += td[i] || 0; p.samples.push(s[i]); p.times.push(p.t); } }
const S = []; for (const p of profs.values()) for (let i = 0; i < p.samples.length; i++) S.push([p.times[i], p.nodes, p.samples[i]]); S.sort((a, b) => a[0] - b[0]);
const frameOf = n => { const c = n.callFrame; return `${c.functionName || '(anon)'} ${(c.url || '').replace(/^https?:\/\/[^/]+/, '').replace(/\?.*$/, '')}${c.lineNumber >= 0 && c.url ? ':' + (c.lineNumber + 1) : ''}`; };
const srcOf = (nodes, id) => { let n = nodes.get(id); const chain = []; while (n) { chain.push(n); n = nodes.get(n.parent); } return chain; };
const lowerBound = t => { let lo = 0, hi = S.length; while (lo < hi) { const m = (lo + hi) >> 1; if (S[m][0] < t) lo = m + 1; else hi = m; } return lo; };
// main-thread events by kind
const mainEv = ev.filter(e => on(e, main) && e.ph === 'X' && e.dur != null).sort((a, b) => a.ts - b.ts);
const tasks = mainEv.filter(e => e.name === 'RunTask' && e.dur >= MIN);
const KIND = { MajorGC: 'GC', MinorGC: 'GC', 'V8.GC_SCAVENGER': 'GC', 'V8.GC_MARK_COMPACTOR': 'GC', 'V8.GCFinalizeMC': 'GC', 'BlinkGC.AtomicPhase': 'GC', Layout: 'layout', UpdateLayoutTree: 'style', Paint: 'paint', PrePaint: 'paint', 'V8.CompileCode': 'js-compile', 'v8.compile': 'js-compile', CompileScript: 'js-compile', 'V8.CompileLazy': 'js-compile', EvaluateScript: 'eval-script', 'v8.evaluateModule': 'eval-module', ParseHTML: 'html', 'Decode Image': 'image-decode', 'Decode LazyPixelRef': 'image-decode', ImageDecodeTask: 'image-decode' };
const NATIVE = /^(linkProgram|compileShader|getProgramParameter|getShaderParameter|getProgramInfoLog|getShaderInfoLog|texImage2D|texSubImage2D|texImage3D|texSubImage3D|texStorage2D|texStorage3D|compressedTexImage2D|bufferData|bufferSubData|generateMipmap|readPixels|getError|getUniformLocation|getActiveUniform|getActiveAttrib|toDataURL|getImageData|drawImage|createImageBitmap|decode|uniform\w*|drawElements|drawArrays|drawElementsInstanced|drawArraysInstanced|clientWaitSync|finish|flush|\(garbage collector\))$/;
const out = []; const agg = new Map(); const bump = (ph, k, v) => { if (!agg.has(ph)) agg.set(ph, new Map()); const m = agg.get(ph); m.set(k, (m.get(k) || 0) + v); };
for (const t of tasks) {
  const end = t.ts + t.dur, kinds = {}; let fcall = null;
  for (let i = lowerBound(0); false;); // placeholder
  // child events
  let lo = 0, hi = mainEv.length; while (lo < hi) { const m = (lo + hi) >> 1; if (mainEv[m].ts < t.ts) lo = m + 1; else hi = m; }
  for (let i = lo; i < mainEv.length && mainEv[i].ts < end; i++) { const e = mainEv[i]; const k = KIND[e.name]; if (k) kinds[k] = (kinds[k] || 0) + e.dur / 1000; if (e.name === 'FunctionCall' && !fcall) fcall = e.args?.data; }
  // samples
  const self = new Map(), src = new Map(), nat = new Map(); let n = 0;
  for (let i = lowerBound(t.ts); i < S.length && S[i][0] < end; i++) { const [, nodes, id] = S[i]; const chain = srcOf(nodes, id); if (!chain.length) continue; n++;
    const top = frameOf(chain[0]); if (/^\(idle\)|^\(program\)/.test(top)) continue; self.set(top, (self.get(top) || 0) + 1);
    const natf = chain.find(c => NATIVE.test(c.callFrame.functionName)); if (natf) { const k = natf.callFrame.functionName; nat.set(k, (nat.get(k) || 0) + 1); }
    const s = chain.find(c => /\/src\//.test(c.callFrame.url) && !/frame-gate|motion-loop/.test(c.callFrame.url)); if (s) { const k = frameOf(s); src.set(k, (src.get(k) || 0) + 1); }
    if (process.env.DRILL && s && frameOf(s).includes(process.env.DRILL)) bump('DRILL ' + phaseAt(t.ts), chain.slice(0, +(process.env.DEPTH || 3)).map(c => frameOf(c).replace(/ \/node_modules.*?\.js(:\d+)?/, '')).join(' <- '), ((S[i + 1]?.[0] ?? S[i][0]) - S[i][0]) / 1000);
    const ms = (S[i + 1]?.[0] ?? S[i][0]) - S[i][0]; bump(phaseAt(t.ts), (natf && /garbage/.test(natf.callFrame.functionName) ? 'GC' : natf ? 'gl:' + natf.callFrame.functionName + ' <- ' + (s ? frameOf(s) : '?') : s ? frameOf(s) : top), Math.min(ms, 5000) / 1000); }
  const top = m => [...m].sort((a, b) => b[1] - a[1]).slice(0, 4).map(([k, v]) => `${k} ${Math.round(100 * v / Math.max(1, n))}%`);
  out.push({ phase: phaseAt(t.ts), ms: Math.round(t.dur / 1000), at: ((t.ts - (marks[0]?.ts ?? t.ts)) / 1e6).toFixed(1), entry: fcall ? `${fcall.functionName || ''} ${(fcall.url || '').replace(/^https?:\/\/[^/]+/, '').replace(/\?.*$/, '')}` : '', kinds: Object.fromEntries(Object.entries(kinds).filter(([, v]) => v > 1).map(([k, v]) => [k, Math.round(v)])), native: top(nat), self: top(self), src: top(src) });
}
if (!process.env.SUM) for (const o of out) console.log(JSON.stringify(o));
const cnt = new Map(); for (const o of out) { cnt.set('DRILL ' + o.phase, cnt.get('DRILL ' + o.phase) || [0, 0, 0]); const v = cnt.get(o.phase) || [0, 0, 0]; v[0]++; v[1] += o.ms; v[2] = Math.max(v[2], o.ms); cnt.set(o.phase, v); }
for (const [ph, m] of agg) { const c = cnt.get(ph); console.log(`\n## ${ph}: ${c[0]} long tasks, ${c[1]} ms total, max ${c[2]} ms. Sampled ms inside them by innermost /src/ frame (or GL call / GC):`); for (const [k, v] of [...m].sort((a, b) => b[1] - a[1]).slice(0, +(process.env.TOP || 8))) console.log(`  ${Math.round(v)} ms  ${k}`); }
// GPU main thread long tasks (shader compile / program link happen there under ANGLE)
if (gpuMain) { const g = ev.filter(e => on(e, gpuMain) && e.ph === 'X' && e.dur >= MIN / 2 && !/RunTask|ThreadControllerImpl/.test(e.name)); const agg = new Map(); for (const e of g) { const k = phaseAt(e.ts) + ' ' + e.name; const v = agg.get(k) || [0, 0, 0]; v[0]++; v[1] += e.dur / 1000; v[2] = Math.max(v[2], e.dur / 1000); agg.set(k, v); } console.log('\nGPU main thread events >= ' + MIN / 2000 + ' ms (phase name: count, total ms, max ms)'); for (const [k, v] of [...agg].sort((a, b) => b[1][1] - a[1][1]).slice(0, 30)) console.log(k, v[0], Math.round(v[1]), Math.round(v[2])); }
