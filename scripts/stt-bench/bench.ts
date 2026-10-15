// The speech-to-text measurement: find labelled recordings, run the gateway's transcription over them, read the browser's results the collector page saved next to them, score
// both against the reference text and write the table docs/CALLS.md holds. Everything that touches the outside (the file system, the network, the clock) is passed in, so a test runs it
// on a temporary folder with a fake fetch.
//
// LAYOUT of a samples folder: <folder>/<group>/<id>.<wav|mp3|flac|ogg> with <id>.txt (the words the person was asked to say) beside it, and optionally <id>.browser.json
// ({ "hypothesis": "...", "ms": 640 }: what the browser's own recognition heard of the same utterance and the delay after the button was released; scripts/stt-bench/collect.html writes it).
// Without group folders, the group is the file name up to the first "-" or "_" (ng-001.wav). Groups used: ng (Nigerian English), gh (Ghanaian), ke (Kenyan), gb (British), pidgin.
import { DEFAULT_STT_MODEL, NO_TRAINING } from '../../server/models/transcribe.ts'
import { summarise } from './wer.ts'
import type { Row, Summary } from './wer.ts'

export const GROUPS: Readonly<Record<string, string>> = Object.freeze({ ng: 'Nigerian English', gh: 'Ghanaian English', ke: 'Kenyan English', gb: 'British English', pidgin: 'Nigerian Pidgin' })
export const MEDIA: Readonly<Record<string, string>> = Object.freeze({ wav: 'audio/wav', mp3: 'audio/mpeg', flac: 'audio/flac', ogg: 'audio/ogg' })
export const ENDPOINT = 'https://ai-gateway.vercel.sh/v4/ai/transcription-model'

export interface Sample { group: string; id: string; file: string; mediaType: string; reference: string; browser: { hypothesis: string; ms: number | null } | null }
export interface Files {
  /** Relative paths of every file under the folder, using "/". */
  list(): Promise<string[]>
  text(path: string): Promise<string | null>
  base64(path: string): Promise<string>
}

/** The samples in a folder: an audio file with its reference text. Files without one are skipped and named in `skipped`. */
export async function discover(files: Files): Promise<{ samples: Sample[]; skipped: string[] }> {
  const all = await files.list(), samples: Sample[] = [], skipped: string[] = []
  for (const path of all.sort()) {
    const match = /^(?:(.+)\/)?([^/]+)\.(wav|mp3|flac|ogg)$/i.exec(path)
    if (!match) continue
    const folder = match[1]?.split('/').pop(), id = match[2]!, ext = match[3]!.toLowerCase()
    const group = (folder ?? id.split(/[-_]/)[0] ?? 'other').toLowerCase()
    const base = path.slice(0, path.length - ext.length - 1)
    const reference = (await files.text(`${base}.txt`))?.trim()
    if (!reference) { skipped.push(path); continue }
    let browser: Sample['browser'] = null
    const sidecar = await files.text(`${base}.browser.json`)
    if (sidecar) {
      try {
        const parsed: unknown = JSON.parse(sidecar)
        if (typeof parsed === 'object' && parsed !== null && typeof Reflect.get(parsed, 'hypothesis') === 'string') { const ms = Reflect.get(parsed, 'ms'); browser = { hypothesis: Reflect.get(parsed, 'hypothesis') as string, ms: typeof ms === 'number' && Number.isFinite(ms) ? ms : null } }
      } catch { /* a bad sidecar means no browser result for this sample */ }
    }
    samples.push({ group, id: `${group}/${id}`, file: path, mediaType: MEDIA[ext]!, reference, browser })
  }
  return { samples, skipped }
}

type Fetcher = (url: string, init: { method: string; headers: Record<string, string>; body: string }) => Promise<{ status: number; text(): Promise<string> }>
export interface GatewayRun { key: string; model: string; fetch: Fetcher; now: () => number; base64: (path: string) => Promise<string> }

/** One recording through the gateway, as the route does it (server/models/transcribe.ts): the text and the seconds the round trip took. */
export async function viaGateway(run: GatewayRun, sample: Sample): Promise<{ hypothesis: string | null; ms: number | null; error?: string }> {
  const started = run.now()
  try {
    const response = await run.fetch(ENDPOINT, {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${run.key}`, 'ai-gateway-protocol-version': '0.0.1', 'ai-transcription-model-specification-version': '4', 'ai-model-id': run.model, 'Content-Type': 'application/json' },
      body: JSON.stringify({ audio: await run.base64(sample.file), mediaType: sample.mediaType }),
    })
    const ms = run.now() - started
    if (response.status < 200 || response.status >= 300) return { hypothesis: null, ms: null, error: `HTTP ${response.status}` }
    const body: unknown = JSON.parse(await response.text())
    const text = typeof body === 'object' && body !== null ? Reflect.get(body, 'text') : undefined
    return typeof text === 'string' ? { hypothesis: text, ms } : { hypothesis: null, ms: null, error: 'no text in the answer' }
  } catch (error) { return { hypothesis: null, ms: null, error: error instanceof Error ? error.message : 'failed' } }
}

export const WAYS = { gateway: 'Gateway', browser: 'Browser' } as const

/** All the rows: the gateway for every sample when a run is given, the browser's for every sample that has a sidecar. */
export async function measure(samples: readonly Sample[], gateway: GatewayRun | null): Promise<Row[]> {
  const rows: Row[] = []
  for (const sample of samples) {
    if (gateway) { const got = await viaGateway(gateway, sample); rows.push({ group: sample.group, id: sample.id, way: WAYS.gateway, reference: sample.reference, hypothesis: got.hypothesis, ms: got.ms, ...(got.error ? { error: got.error } : {}) }) }
    if (sample.browser) rows.push({ group: sample.group, id: sample.id, way: WAYS.browser, reference: sample.reference, hypothesis: sample.browser.hypothesis, ms: sample.browser.ms })
  }
  return rows
}

const pct = (value: number | null): string => (value === null ? '–' : `${value.toFixed(1)}%`)
const ms = (value: number | null): string => (value === null ? '–' : `${Math.round(value)} ms`)
/** The Markdown table for docs/CALLS.md: one row per group, a column pair (words wrong, delay) per way. */
export function table(summaries: readonly Summary[]): string {
  const ways = [...new Set(summaries.map((item) => item.way))].sort()
  if (!summaries.length) return 'Not yet measured.'
  const groups = [...new Set(summaries.map((item) => item.group))].sort((a, b) => (a === 'all' ? 1 : 0) - (b === 'all' ? 1 : 0) || a.localeCompare(b))
  const head = `| Accent group | Recordings | ${ways.map((way) => `${way}: words wrong | ${way}: delay (median / 90th)`).join(' | ')} |`
  const rule = `| --- | ---: | ${ways.map(() => '---: | ---:').join(' | ')} |`
  const lines = groups.map((group) => {
    const cells = ways.map((way) => { const found = summaries.find((item) => item.group === group && item.way === way); return found ? `${pct(found.wer)}${found.failed ? ` (${found.failed} failed)` : ''} | ${ms(found.medianMs)} / ${ms(found.p90Ms)}` : '– | –' })
    const samples = Math.max(...ways.map((way) => summaries.find((item) => item.group === group && item.way === way)?.samples ?? 0))
    return `| ${group === 'all' ? '**All**' : GROUPS[group] ?? group} | ${samples} | ${cells.join(' | ')} |`
  })
  return [head, rule, ...lines].join('\n')
}

export { DEFAULT_STT_MODEL, NO_TRAINING, summarise }
