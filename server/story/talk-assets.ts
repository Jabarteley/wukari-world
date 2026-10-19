import { TALK_CITY_MAX_BYTES, type TalkAssetReader } from './talk-banks.ts'

const INDEX_PATH = '/assets/talk-banks/index.json'
const CITY_PATH = /^\/assets\/talk-banks\/([a-z][a-z0-9]*(?:-[a-z0-9]+)*)-([a-f0-9]{64})\.json$/u

function fail(): never { throw new Error('Talk asset read failed') }

/** Validate the only public filenames the offline talk-bank builder owns. */
export function talkAssetFileName(path: string, maxBytes: number): string {
  if (!Number.isSafeInteger(maxBytes) || maxBytes <= 0 || maxBytes > TALK_CITY_MAX_BYTES) fail()
  if (path === INDEX_PATH) return 'index.json'
  const match = CITY_PATH.exec(path)
  if (!match) fail()
  return `${match[1]}-${match[2]}.json`
}

async function discard(response: Response): Promise<void> {
  try { await response.body?.cancel() } catch { /* best-effort response cleanup */ }
}

async function responseBytes(response: Response, maximum: number): Promise<Uint8Array> {
  if (!response.ok || !response.body) { await discard(response); return fail() }
  const declaredText = response.headers.get('content-length')
  let declared: number | null = null
  if (declaredText !== null) {
    if (!/^(?:0|[1-9][0-9]*)$/u.test(declaredText)) { await discard(response); return fail() }
    declared = Number(declaredText)
    if (!Number.isSafeInteger(declared) || declared > maximum) { await discard(response); return fail() }
  }
  const reader = response.body.getReader(), chunks: Uint8Array[] = []
  let total = 0, complete = false
  try {
    while (true) {
      const next = await reader.read()
      if (next.done) { complete = true; break }
      if (!(next.value instanceof Uint8Array) || total + next.value.byteLength > maximum) fail()
      total += next.value.byteLength
      chunks.push(next.value.slice())
    }
    if (declared !== null && total !== declared) fail()
    const output = new Uint8Array(total)
    let offset = 0
    for (const chunk of chunks) { output.set(chunk, offset); offset += chunk.byteLength }
    return output
  } catch {
    if (!complete) { try { await reader.cancel() } catch { /* best-effort stream cleanup */ } }
    return fail()
  } finally {
    reader.releaseLock()
  }
}

/** Adapt a trusted host's same-origin static-asset fetch to the shared talk reader. */
export function hostTalkAssets(fetchAsset: (path: string) => Promise<Response>): TalkAssetReader {
  return async (path, maxBytes) => {
    talkAssetFileName(path, maxBytes)
    let response: Response
    try { response = await fetchAsset(path) } catch { return fail() }
    if (!(response instanceof Response)) return fail()
    return responseBytes(response, maxBytes)
  }
}
