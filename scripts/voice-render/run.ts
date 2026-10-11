// Renders sample voices and three places offline in a headless browser, measures them and writes WAV files, spectrograms and a page to
// listen from. Usage: node --experimental-strip-types scripts/voice-render/run.ts <out dir> <debug port 4611-4619> [<dir with an audio/ tree for the ambience>]
// The ambience comes from the audio folder given (the game's own by default); the voices always come from this checkout.
import { build } from 'esbuild'
import { mkdirSync, writeFileSync, readFileSync } from 'node:fs'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { Browser } from '../journeys/cdp.ts'
import { db, fromBase64, mono, pitchOf, spectrogramPng, spectrumOf, wav } from './analyse.ts'

const here = dirname(fileURLToPath(import.meta.url)), root = resolve(here, '../..')
const [out = '', port = '4611', audioDir = join(root, 'src/audio')] = process.argv.slice(2)
if (!out) throw new Error('usage: run.ts <out dir> <port> [audio dir]')
mkdirSync(out, { recursive: true })
const RATE = 44100

interface Rendered { left: Float32Array; right: Float32Array; peak: number; rms: number; stats: Record<string, number>; talkOverlap: number }
let page: Browser
async function render(job: object): Promise<Rendered> {
  const started = Date.now()
  await page.eval(`(() => { window.__done = false; window.__err = ''; window.__render(${JSON.stringify({ rate: RATE, avatar: { x: 0, z: 0 }, ...job })}).then((r) => { window.__r = r; window.__done = true }).catch((e) => { window.__err = String(e && e.stack || e); window.__done = true }); return true })()`)
  await page.waitFor('window.__done', 10 * 60_000, 'the offline render')
  const err = await page.eval<string>('window.__err')
  if (err) throw new Error(err)
  const r = await page.eval<{ peak: number; rms: number; stats: Record<string, number>; talkOverlap: number }>('({ peak: window.__r.peak, rms: window.__r.rms, stats: window.__r.stats, talkOverlap: window.__r.talkOverlap })')
  // The samples come back in slices: one very large message to the page's debugging socket is slow.
  const slices = async (channel: 'left' | 'right'): Promise<string> => {
    const size = 400_000, total = await page.eval<number>(`window.__r.${channel}.length`)
    let text = ''
    for (let at = 0; at < total; at += size) text += await page.eval<string>(`window.__r.${channel}.slice(${at}, ${at + size})`)
    return text
  }
  Object.assign(r, { left: await slices('left'), right: await slices('right') })
  console.error(`rendered in ${((Date.now() - started) / 1000).toFixed(1)} s`)
  const got = r as typeof r & { left: string; right: string }
  return { left: fromBase64(got.left), right: fromBase64(got.right), peak: r.peak, rms: r.rms, stats: r.stats, talkOverlap: r.talkOverlap }
}

const SAMPLE_LINE = 'Good morning, how far? The market is busy today, come and see!'
const SAMPLES: { id: string; label: string; job: object }[] = [
  ...([['man-1', 'Man, deep (seed npc:v29)', 'man', 'npc:v29'], ['man-2', 'Man, light and quick (seed npc:v20)', 'man', 'npc:v20'], ['woman-1', 'Woman, low (seed npc:v29)', 'woman', 'npc:v29'], ['woman-2', 'Woman, high and quick (seed npc:v20)', 'woman', 'npc:v20'], ['elder', 'Elder, slow with a waver (seed npc:v7)', 'elder', 'npc:v7'], ['youth', 'Youth, bright and fast (seed npc:v26)', 'youth', 'npc:v26']] as const).map(([id, label, build, seed]) => ({
    id, label, job: { seconds: 5, lines: [{ t: 0.1, id: seed, text: SAMPLE_LINE, kind: 'npc', build, x: 1.5, z: 0.5 }], scenes: [] },
  })),
  { id: 'seller', label: 'Market seller\'s call', job: { seconds: 3, lines: [], scenes: [], cues: [{ t: 0.1, cue: 'seller', id: 'seller-mama', x: 2, z: 1, in: 0 }] } },
  { id: 'laugh', label: 'A laugh', job: { seconds: 2, lines: [], scenes: [], cues: [{ t: 0.1, cue: 'laugh', id: 'npc:v29', x: 2, z: 1, in: 0 }] } },
  { id: 'hum', label: 'A hum', job: { seconds: 3.5, lines: [], scenes: [], cues: [{ t: 0.1, cue: 'hum', id: 'npc:v29', x: 3, z: 1, in: 0 }] } },
  { id: 'whistle', label: 'A whistle', job: { seconds: 2, lines: [], scenes: [], cues: [{ t: 0.1, cue: 'whistle', id: 'npc:v20', x: 3, z: 1, in: 0 }] } },
  { id: 'greeting', label: 'A greeting called across', job: { seconds: 2, lines: [], scenes: [], cues: [{ t: 0.1, cue: 'call', id: 'npc:v29', x: -4, z: 2, in: 0 }] } },
  { id: 'cheer', label: 'A cheer at the viewing centre', job: { seconds: 3.5, lines: [], scenes: [], cues: [{ t: 0.1, cue: 'cheer', id: 'npc:v20', x: 3, z: 2, in: 0 }] } },
  { id: 'steps', label: 'Footsteps of two walkers', job: { seconds: 5, lines: [], scenes: [
    { t: 0, kind: 'park', people: [{ id: 'w1', role: 'walker', x: 6, z: 2, sitting: false }, { id: 'w2', role: 'walker', x: -5, z: 3, sitting: false }] },
    { t: 4.5, kind: 'park', people: [{ id: 'w1', role: 'walker', x: 5, z: 2, sitting: false }, { id: 'w2', role: 'walker', x: -4, z: 3, sitting: false }] },
  ], chance: 0.9 } },
]

const REFERENCES: { id: string; label: string; job: object }[] = ['tap', 'message', 'notify', 'success'].map(id => ({ id: `ref-${id}`, label: `Interface sound for comparison: ${id}`, job: { seconds: 1.5, lines: [], scenes: [], recipe: id } }))
const walk = (t: number, who: number): { x: number; z: number } => ({ x: ((who * 7 + t * 0.9) % 24) - 12, z: 4 + who * 2 })
const people = (t: number, extra: { id: string; role: string; x: number; z: number; sitting: boolean }[] = []) => [
  ...[1, 2, 3].map(n => ({ id: `w${n}`, role: 'walker', sitting: false, ...walk(t, n) })), ...extra,
]
const scenes = (kind: string, seconds: number, extra: Parameters<typeof people>[1]) => { const out = []; for (let t = 0; t < seconds; t += 4) out.push({ t, kind, country: 'ng', people: people(t, extra) }); return out }
const lines = (list: [number, string, string, Record<string, unknown>?][]) => list.map(([t, id, text, more]) => ({ t, id, text, kind: 'npc', ...more }))
const burst = (t: number) => [2, 5, 8, 11, 14].map((d, i) => ({ t: t + i * 0.2, id: `crowd-${i}`, text: 'Abeg, make we go, e don late o!', kind: 'npc', x: d, z: 0 }))

const SCENES: { id: string; label: string; job: Record<string, unknown> }[] = [
  { id: 'market-1000', label: 'Market at 10:00', job: { seconds: 28, scape: 'market', night: false, scenes: scenes('market', 28, [{ id: 'sell', role: 'stander', x: 5, z: 3, sitting: false }, { id: 'sit', role: 'sitter', x: -9, z: 3, sitting: true }]),
    lines: [...lines([[1, 'npc:mama-put', 'Good morning, how far? Fresh tomatoes today!', { x: 3, z: 2 }], [4, 'npc:market-boy', 'Oga, come and see, na correct price.', { x: -6, z: 4 }],
      [8, 'player-7f3a', 'Anybody know where to buy yam?', { kind: 'player' }], [11, 'npc:ada-trader', 'Madam, your change!', { x: 14, z: -6 }], [14, 'agent-nova', 'I will take the red bag. How much?', { kind: 'agent' }],
      [17, 'npc:mama-put', 'Ha, you are lucky, it is the last one.', { x: 3, z: 2, reply: true }]]), ...burst(21)] } },
  { id: 'park-1830', label: 'Park at 18:30', job: { seconds: 28, scape: 'park', night: false, scenes: scenes('park', 28, [{ id: 'bench', role: 'sitter', x: -6, z: 2, sitting: true }]),
    lines: [...lines([[1.5, 'npc:old-baba', 'Ah, the evening is sweet today.', { build: 'elder', x: -5, z: 2 }], [5, 'npc:jogger-ife', 'Three rounds, no stopping!', { build: 'youth', x: 8, z: 3 }],
      [9, 'player-b21c', 'Nice weather, abi?', { kind: 'player' }], [12, 'npc:ngozi', 'Did you see the match last night?', { x: 4, z: 1 }], [15, 'npc:old-baba', 'Ha, those boys can run.', { build: 'elder', x: -5, z: 2, reply: true }],
      [19, 'agent-halo', 'Walking to the lake now.', { kind: 'agent' }]]), ...burst(23)] } },
  { id: 'bar-2200', label: 'Bar at 22:00', job: { seconds: 28, scape: 'bar-night', night: true, scenes: scenes('club', 28, [{ id: 'stool', role: 'sitter', x: -4, z: 2, sitting: true }]),
    lines: [...lines([[1, 'npc:bartender', 'Welcome, what will you have?', { x: 2, z: 1 }], [4.5, 'npc:tunde', 'One cold Star, and keep the change!', { x: -3, z: 2 }],
      [8, 'player-9aa0', 'Is the game still on?', { kind: 'player' }], [11, 'npc:amaka', 'Ha ha, you are late again, my friend.', { x: 7, z: 3 }], [14, 'npc:tunde', 'Traffic, I swear!', { x: -3, z: 2, reply: true }],
      [18, 'agent-nova', 'I will have a malt, please.', { kind: 'agent' }]]), ...burst(22)] } },
  { id: 'viewing-2200', label: 'Viewing centre, a goal (extra)', job: { seconds: 14, scape: 'viewing-night', night: true, scenes: scenes('viewing', 14, [{ id: 'fan', role: 'sitter', x: -3, z: 2, sitting: true }]),
    lines: lines([[1.5, 'npc:fan-1', 'Pass it, pass it!', { x: 3, z: 1, place: 'viewing' }], [5, 'npc:fan-2', 'GOAL! What a strike!', { x: -4, z: 2, place: 'viewing' }], [9, 'npc:fan-3', 'Ah, he was offside!', { x: 6, z: 2, place: 'viewing' }]]) } },
]

const bundle = await build({
  entryPoints: [join(here, 'entry.ts')], bundle: true, write: false, format: 'iife', target: 'es2022', platform: 'browser',
  logLevel: 'error',
  // The ambience (the director, the synth and their data) is taken from the audio folder given; the voices stay this checkout's.
  plugins: [{ name: 'audio-tree', setup(b) { b.onResolve({ filter: /\.ts$/ }, (args) => {
    const full = resolve(args.resolveDir, args.path), own = join(root, 'src/audio') + '/', theirs = dirname(audioDir) + '/'
    if (full.startsWith(own) && !full.startsWith(own + 'voice/')) return { path: join(audioDir, full.slice(own.length)) }
    // Something the borrowed audio folder reaches outside itself for (the clock, the time bands): this checkout's.
    if (theirs !== dirname(join(root, 'src/audio')) + '/' && full.startsWith(theirs) && !full.startsWith(audioDir + '/')) return { path: join(root, 'src', full.slice(theirs.length)) }
    return undefined
  }) } }],
})
page = await Browser.launch(Number(port))
const files: { id: string; label: string; wav: string; png: string; m: Record<string, string | number> }[] = []
const sections: { title: string; rows: typeof files }[] = [{ title: 'Voices', rows: [] }, { title: 'Places (with the ambience)', rows: [] }]
const report: Record<string, unknown> = {}
try {
  await page.goto('about:blank')
  await page.eval(`(() => { const s = ${JSON.stringify(bundle.outputFiles[0]?.text ?? '')}; (0, eval)(s); return true })()`)
  const save = (id: string, label: string, r: Rendered, extra: Record<string, string | number>): (typeof files)[number] => {
    const m = mono(r.left, r.right)
    writeFileSync(join(out, `${id}.wav`), wav(r.left, r.right, RATE)); writeFileSync(join(out, `${id}.png`), spectrogramPng(m, RATE))
    return { id, label, wav: `${id}.wav`, png: `${id}.png`, m: { 'RMS dBFS': +db(r.rms).toFixed(1), 'Peak dBFS': +db(r.peak).toFixed(1), ...extra } }
  }
  const sampleRows: Record<string, unknown>[] = []
  for (const s of process.env['SKIP_SAMPLES'] ? [] : [...SAMPLES, ...REFERENCES]) {
    const r = await render(s.job), m = mono(r.left, r.right), sp = spectrumOf(m, RATE), f0 = pitchOf(m, RATE)
    const row = save(s.id, s.label, r, { 'Pitch Hz': Math.round(f0), 'Centroid Hz': sp.centroid, 'Peaks Hz': sp.peaks.join(' / ') })
    sections[0]?.rows.push(row); sampleRows.push({ id: s.id, ...row.m, peak: r.peak, rms: r.rms })
  }
  report['samples'] = sampleRows
  const sceneRows: Record<string, unknown>[] = []
  for (const s of SCENES) {
    console.error(s.id, 'ambience'); const ambienceOnly = await render({ ...s.job, lines: [], scenes: [] }); console.error(s.id, 'voices'); const voicesOnly = await render({ ...s.job, scape: undefined }); console.error(s.id, 'mix'); const mix = await render(s.job)
    const row = save(s.id, s.label, mix, { 'Voices-only RMS dBFS': +db(voicesOnly.rms).toFixed(1), 'Ambience-only RMS dBFS': +db(ambienceOnly.rms).toFixed(1), 'Max voices at once': Math.max(mix.stats['peakVoices'] ?? 0, voicesOnly.stats['peakVoices'] ?? 0), 'Max talk sources overlapping': voicesOnly.talkOverlap, Lines: mix.stats['lines'] ?? 0, 'Talked': mix.stats['talked'] ?? 0, 'Dropped by the cap': mix.stats['dropped'] ?? 0, 'Cues': mix.stats['cues'] ?? 0, 'Steps': mix.stats['steps'] ?? 0, Clipped: mix.peak >= 0.9999 ? 'YES' : 'no' })
    sections[1]?.rows.push(row)
    sceneRows.push({ id: s.id, ...row.m, mixPeak: mix.peak, voicesPeak: voicesOnly.peak, stats: mix.stats })
    writeFileSync(join(out, `${s.id}-voices-only.wav`), wav(voicesOnly.left, voicesOnly.right, RATE))
  }
  report['scenes'] = sceneRows
} finally { page.close() }
writeFileSync(join(out, 'measurements.json'), JSON.stringify(report, null, 2))
const esc = (t: string): string => t.replace(/[&<>]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' }[c] as string))
const html = `<!doctype html><meta charset="utf-8"><title>Allworld voices</title><style>body{font:15px system-ui;max-width:980px;margin:24px auto;padding:0 16px;color:#1d2a26}h1{font-size:22px}table{border-collapse:collapse;width:100%;margin-bottom:28px}td,th{border-bottom:1px solid #ddd;padding:8px;text-align:left;vertical-align:top;font-size:13px}img{width:100%;max-width:420px;height:auto;display:block;margin-top:6px}audio{width:260px}</style>
<h1>Allworld voices: listen</h1><p>Every sound here is made in code (no recordings). Each clip is rendered offline through the game's own mixer. Spectrograms run 0 to 5 kHz.</p>
${sections.map(sec => `<h2>${esc(sec.title)}</h2><table><tr><th>Sound</th><th>Listen</th><th>Measured</th></tr>${sec.rows.map(r => `<tr><td><b>${esc(r.label)}</b></td><td><audio controls preload="none" src="${r.wav}"></audio><img src="${r.png}" alt="spectrogram of ${esc(r.label)}"></td><td>${Object.entries(r.m).map(([k, v]) => `${esc(k)}: ${esc(String(v))}`).join('<br>')}</td></tr>`).join('')}</table>`).join('')}
<p>The places also come as voices-only files (<code>*-voices-only.wav</code>) without the ambience.</p>`
writeFileSync(join(out, 'index.html'), html)
console.log(readFileSync(join(out, 'measurements.json'), 'utf8'))
