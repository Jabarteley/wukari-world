// The city gist on the phone (docs/GIST.md): the path, the reading of an answer, the words for "how long ago" and the radio-style line the
// Square shows. Pure: no fetch, no Vue. A line is {n, at, city, kind, text}; only its words are ever shown.
export interface GistLine { n: number; at: number; city: string; kind: string; text: string }

export const GIST_SHOWN = 30
/** How many lines the Square reads out, one after another. */
export const SQUARE_LINES = 3
/** A line older than this is no longer the talk of the Square. */
export const SQUARE_FRESH_MS = 6 * 3600000
export const gistPath = (city: string, since = 0): string => `/api/world/gist?id=${encodeURIComponent(city)}&limit=${GIST_SHOWN}${since > 0 ? `&since=${since}` : ''}`

/** The lines of an answer, newest first; anything that is not a well-formed line is left out. */
export function readGist(answer: unknown): GistLine[] {
  const items = typeof answer === 'object' && answer !== null ? (answer as { items?: unknown }).items : null
  if (!Array.isArray(items)) return []
  const lines: GistLine[] = []
  for (const item of items) {
    if (typeof item !== 'object' || item === null) continue
    const { n, at, city, kind, text } = item as Record<string, unknown>
    if (typeof n === 'number' && Number.isSafeInteger(n) && n > 0 && typeof at === 'number' && typeof text === 'string' && text && typeof city === 'string' && typeof kind === 'string') lines.push({ n, at, city, kind, text: text.slice(0, 160) })
  }
  return lines.sort((a, b) => b.n - a.n)
}

export function agoText(at: number, now: number): string {
  const minutes = Math.max(0, Math.round((now - at) / 60000))
  if (minutes < 1) return 'just now'
  if (minutes < 60) return `${minutes} min ago`
  const hours = Math.floor(minutes / 60)
  return hours < 24 ? `${hours} h ago` : `${Math.floor(hours / 24)} d ago`
}

/** The few fresh lines the Square reads out, newest first. */
export const squareLines = (lines: readonly GistLine[], now: number): GistLine[] => lines.filter((line) => line.at > now - SQUARE_FRESH_MS).slice(0, SQUARE_LINES)
/** The radio-style line for the turn-th reading ("Gist: Tunde was elected governor of Lagos"), or '' when there is nothing fresh. */
export function squareLine(lines: readonly GistLine[], now: number, turn: number): string {
  const fresh = squareLines(lines, now)
  const line = fresh[((turn % fresh.length) + fresh.length) % fresh.length]
  return line ? `Gist: ${line.text}` : ''
}
