// Word error rate and the small statistics the speech-to-text report needs. Pure functions, no files, no network.
//
//   words(text)            a text as comparable words: lower case, accents folded, punctuation gone (an apostrophe inside a word stays), numbers as written
//   wer(reference, hyp)    { refWords, edits, substitutions, deletions, insertions }: the word-level edit distance (Levenshtein) between the two texts
//   summarise(rows)        per accent group and overall: samples, words, WER %, median and 90th percentile delay
// WER is total edits over total reference words (not the mean of per-sample rates), so a long sentence counts for its length. It can pass 100% when a hypothesis has many extra words.

export function words(text: string): string[] {
  return text
    .normalize('NFKD').replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[’‘`]/g, "'")
    .replace(/(^|[^a-z0-9])'+|'+(?=$|[^a-z0-9])/g, '$1 ')
    .replace(/[^a-z0-9'\s]+/g, ' ')
    .split(/\s+/).filter(Boolean)
}

export interface Distance { refWords: number; edits: number; substitutions: number; deletions: number; insertions: number }
export function wer(reference: string, hypothesis: string): Distance {
  const ref = words(reference), hyp = words(hypothesis)
  // Rows of the edit-distance table, with the counts of each kind of edit carried along.
  type Cell = { edits: number; sub: number; del: number; ins: number }
  let previous: Cell[] = Array.from({ length: hyp.length + 1 }, (_, j) => ({ edits: j, sub: 0, del: 0, ins: j }))
  for (let i = 1; i <= ref.length; i++) {
    const row: Cell[] = [{ edits: i, sub: 0, del: i, ins: 0 }]
    for (let j = 1; j <= hyp.length; j++) {
      const diagonal = previous[j - 1]!, up = previous[j]!, left = row[j - 1]!
      if (ref[i - 1] === hyp[j - 1]) { row.push({ ...diagonal }); continue }
      const best = Math.min(diagonal.edits, up.edits, left.edits)
      row.push(best === diagonal.edits ? { edits: best + 1, sub: diagonal.sub + 1, del: diagonal.del, ins: diagonal.ins }
        : best === up.edits ? { edits: best + 1, sub: up.sub, del: up.del + 1, ins: up.ins }
        : { edits: best + 1, sub: left.sub, del: left.del, ins: left.ins + 1 })
    }
    previous = row
  }
  const end = previous[hyp.length]!
  return { refWords: ref.length, edits: end.edits, substitutions: end.sub, deletions: end.del, insertions: end.ins }
}

export const percentile = (values: readonly number[], p: number): number | null => {
  if (!values.length) return null
  const sorted = [...values].sort((a, b) => a - b)
  return sorted[Math.min(sorted.length - 1, Math.max(0, Math.ceil(p / 100 * sorted.length) - 1))]!
}

export interface Row { group: string; id: string; way: string; reference: string; hypothesis: string | null; ms: number | null; error?: string }
export interface Summary { group: string; way: string; samples: number; failed: number; refWords: number; edits: number; wer: number | null; medianMs: number | null; p90Ms: number | null }

/** One summary per (group, way), then one per way over everything ("all"). Failed samples (no hypothesis) count as every word wrong. */
export function summarise(rows: readonly Row[]): Summary[] {
  const key = (group: string, way: string): string => `${way}\u0000${group}`
  const buckets = new Map<string, Row[]>()
  for (const row of rows) for (const group of [row.group, 'all']) { const list = buckets.get(key(group, row.way)) ?? []; list.push(row); buckets.set(key(group, row.way), list) }
  const out: Summary[] = []
  for (const [name, list] of buckets) {
    const [way, group] = name.split('\u0000') as [string, string]
    let refWords = 0, edits = 0, failed = 0
    const delays: number[] = []
    for (const row of list) {
      const reference = words(row.reference).length
      if (row.hypothesis === null) { failed++; refWords += reference; edits += reference; continue }
      const d = wer(row.reference, row.hypothesis)
      refWords += d.refWords; edits += d.edits
      if (row.ms !== null) delays.push(row.ms)
    }
    out.push({ group, way, samples: list.length, failed, refWords, edits, wer: refWords ? edits / refWords * 100 : null, medianMs: percentile(delays, 50), p90Ms: percentile(delays, 90) })
  }
  return out.sort((a, b) => (a.group === 'all' ? 1 : 0) - (b.group === 'all' ? 1 : 0) || a.group.localeCompare(b.group) || a.way.localeCompare(b.way))
}
