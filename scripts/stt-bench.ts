// Measure speech to text on labelled recordings: words wrong and delay, per accent group, for the gateway's transcription model and the browser's own recognition.
//
//   node --experimental-strip-types scripts/stt-bench.ts <samples-folder> [--gateway] [--model microsoft/mai-transcribe-2] [--json results.json]
//
//   --gateway   run the gateway over every recording (needs AI_GATEWAY_API_KEY in the environment; about US$0.10 an hour of audio)
//   without it, only the browser results saved beside the recordings are scored
//   --json      also write every row (reference, hypothesis, delay) to a file, for a closer look; keep it out of git
// The folder layout, the collector page and the rules about recordings are in scripts/stt-bench/README.md. Recordings of real people are never committed.
import { readFile, readdir } from 'node:fs/promises'
import { join, relative } from 'node:path'
import { writeFile } from 'node:fs/promises'
import { discover, measure, summarise, table, DEFAULT_STT_MODEL, NO_TRAINING } from './stt-bench/bench.ts'
import type { Files, GatewayRun } from './stt-bench/bench.ts'

const args = process.argv.slice(2)
const folder = args.find((arg) => !arg.startsWith('--') && args[args.indexOf(arg) - 1] !== '--model' && args[args.indexOf(arg) - 1] !== '--json')
const flag = (name: string): string | null => { const at = args.indexOf(name); return at >= 0 ? args[at + 1] ?? null : null }
if (!folder) { console.error('Usage: node --experimental-strip-types scripts/stt-bench.ts <samples-folder> [--gateway] [--model <id>] [--json <file>]'); process.exit(2) }

async function walk(dir: string): Promise<string[]> {
  const out: string[] = []
  for (const entry of await readdir(dir, { withFileTypes: true })) {
    const path = join(dir, entry.name)
    if (entry.isDirectory()) out.push(...await walk(path)); else out.push(path)
  }
  return out
}
const files: Files = {
  list: async () => (await walk(folder)).map((path) => relative(folder, path).split('\\').join('/')),
  text: async (path) => { try { return await readFile(join(folder, path), 'utf8') } catch { return null } },
  base64: async (path) => (await readFile(join(folder, path))).toString('base64'),
}
const { samples, skipped } = await discover(files)
if (!samples.length) { console.error(`No recordings with a reference text found in ${folder}. Nothing was measured. See scripts/stt-bench/README.md for how to collect them.`); process.exit(1) }
if (skipped.length) console.error(`Skipped ${skipped.length} recording(s) with no .txt reference: ${skipped.slice(0, 5).join(', ')}${skipped.length > 5 ? ', ...' : ''}`)

let gateway: GatewayRun | null = null
if (args.includes('--gateway')) {
  const key = (process.env['AI_GATEWAY_API_KEY'] ?? '').trim()
  if (!key) { console.error('--gateway needs AI_GATEWAY_API_KEY in the environment.'); process.exit(2) }
  const model = flag('--model') ?? DEFAULT_STT_MODEL
  if (!Object.hasOwn(NO_TRAINING, model)) { console.error(`${model} is not on the no-training list (server/models/transcribe.ts). Recordings are people's words: only those models are used.`); process.exit(2) }
  gateway = { key, model, now: () => performance.now(), base64: files.base64, fetch: async (url: string, init: { method: string; headers: Record<string, string>; body: string }) => fetch(url, init) }
}
const rows = await measure(samples, gateway)
const summaries = summarise(rows)
console.log(`${samples.length} recordings in ${folder}${gateway ? `; gateway model ${gateway.model}` : ''}\n`)
console.log(table(summaries))
const failures = rows.filter((row) => row.error)
if (failures.length) console.error(`\n${failures.length} recording(s) failed: ${[...new Set(failures.map((row) => row.error))].join(', ')}`)
const out = flag('--json')
if (out) await writeFile(out, JSON.stringify(rows, null, 2))
