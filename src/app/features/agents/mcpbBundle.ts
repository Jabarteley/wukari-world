// The desktop bundle (.mcpb) for assistants that install a local server from a file: a zip with a manifest and a tiny Node program that
// forwards the assistant's MCP messages (one JSON line each) to the game's address with the player's key as a bearer header.
// Built in the browser on request, from the address only. THE KEY IS NEVER IN THE BYTES: the manifest marks it `sensitive` and the
// assistant asks for it at install time. Pure TypeScript, no dependencies: stored (uncompressed) zip entries with a fixed date.
export const MCPB_FILENAME = 'allworld.mcpb'

// The proxy: no dependencies, logs only to stderr and never the key.
const PROXY = [
  '// Allworld connector: forwards MCP messages from stdin to the game and prints the answers. Needs Node 18 or later.',
  "const url = process.env.ALLWORLD_URL || '', key = process.env.ALLWORLD_KEY || ''",
  'const log = (text) => process.stderr.write(\'allworld: \' + text + \'\\n\')',
  'const send = (message) => process.stdout.write(JSON.stringify(message) + \'\\n\')',
  "if (!url || !key) { log('the address or the key is missing'); process.exit(1) }",
  'async function forward(line) {',
  '  let message',
  "  try { message = JSON.parse(line) } catch { return send({ jsonrpc: '2.0', id: null, error: { code: -32700, message: 'Parse error' } }) }",
  "  const asks = message !== null && typeof message === 'object' && !Array.isArray(message) && message.id !== undefined",
  '  try {',
  "    const res = await fetch(url, { method: 'POST', headers: { authorization: 'Bearer ' + key, 'content-type': 'application/json', accept: 'application/json, text/event-stream' }, body: line })",
  '    const text = await res.text()',
  '    if (!text.trim() || res.status === 202) return',
  "    const type = res.headers.get('content-type') || ''",
  "    const bodies = type.includes('text/event-stream') ? text.split('\\n').filter((row) => row.startsWith('data:')).map((row) => row.slice(5).trim()) : [text.trim()]",
  '    for (const body of bodies) { if (!body) continue; try { send(JSON.parse(body)) } catch { log(\'the game answered with something that is not JSON\') } }',
  '  } catch {',
  "    log('could not reach the game')",
  "    if (asks) send({ jsonrpc: '2.0', id: message.id, error: { code: -32000, message: 'Could not reach Allworld. Check your connection and try again.' } })",
  '  }',
  '}',
  'let buffer = \'\', chain = Promise.resolve()',
  "process.stdin.setEncoding('utf8')",
  "process.stdin.on('data', (chunk) => {",
  '  buffer += chunk',
  "  const lines = buffer.split('\\n'); buffer = lines.pop() || ''",
  '  for (const line of lines) if (line.trim()) chain = chain.then(() => forward(line.trim()))',
  '})',
  "process.stdin.on('end', () => { chain.then(() => process.exit(0)) })",
  '',
].join('\n')

function manifest(url: string): string {
  return JSON.stringify({
    manifest_version: '0.2', name: 'allworld', display_name: 'Allworld', version: '1.0.0',
    description: 'Play Allworld through your assistant: it looks after your life, works, earns and chats. It is always shown as an AI.',
    author: { name: 'Allworld' },
    server: { type: 'node', entry_point: 'server/index.js', mcp_config: { command: 'node', args: ['${__dirname}/server/index.js'], env: { ALLWORLD_URL: '${user_config.server_url}', ALLWORLD_KEY: '${user_config.agent_key}' } } },
    user_config: {
      server_url: { type: 'string', title: 'Allworld address', description: 'Where Allworld answers. Leave it as it is.', default: url, required: true },
      agent_key: { type: 'string', title: 'Your agent key', description: 'The key you made in Allworld, Settings, AI agents. It starts with awk_.', sensitive: true, required: true },
    },
  }, null, 2)
}

const TABLE: Uint32Array = (() => {
  const table = new Uint32Array(256)
  for (let n = 0; n < 256; n++) { let c = n; for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1; table[n] = c >>> 0 }
  return table
})()
export function crc32(bytes: Uint8Array): number {
  let c = 0xffffffff
  for (const byte of bytes) c = (TABLE[(c ^ byte) & 0xff] as number) ^ (c >>> 8)
  return (c ^ 0xffffffff) >>> 0
}

const DOS_TIME = 0, DOS_DATE = (0 << 9) | (1 << 5) | 1 // 1980-01-01 00:00, so the same address always makes the same file

/** A zip of stored entries. */
export function zipStored(files: readonly { name: string; data: Uint8Array }[]): Uint8Array {
  const encoder = new TextEncoder(), parts: Uint8Array[] = [], central: Uint8Array[] = []
  let offset = 0
  const put = (size: number, write: (view: DataView) => void): Uint8Array => { const bytes = new Uint8Array(size), view = new DataView(bytes.buffer); write(view); return bytes }
  for (const file of files) {
    const name = encoder.encode(file.name), crc = crc32(file.data), size = file.data.length
    const local = put(30, (v) => { v.setUint32(0, 0x04034b50, true); v.setUint16(4, 20, true); v.setUint16(6, 0x0800, true); v.setUint16(8, 0, true); v.setUint16(10, DOS_TIME, true); v.setUint16(12, DOS_DATE, true); v.setUint32(14, crc, true); v.setUint32(18, size, true); v.setUint32(22, size, true); v.setUint16(26, name.length, true); v.setUint16(28, 0, true) })
    central.push(put(46, (v) => { v.setUint32(0, 0x02014b50, true); v.setUint16(4, 20, true); v.setUint16(6, 20, true); v.setUint16(8, 0x0800, true); v.setUint16(10, 0, true); v.setUint16(12, DOS_TIME, true); v.setUint16(14, DOS_DATE, true); v.setUint32(16, crc, true); v.setUint32(20, size, true); v.setUint32(24, size, true); v.setUint16(28, name.length, true); v.setUint32(42, offset, true) }), name)
    parts.push(local, name, file.data)
    offset += 30 + name.length + size
  }
  const centralSize = central.reduce((sum, part) => sum + part.length, 0)
  const end = put(22, (v) => { v.setUint32(0, 0x06054b50, true); v.setUint16(8, files.length, true); v.setUint16(10, files.length, true); v.setUint32(12, centralSize, true); v.setUint32(16, offset, true) })
  const all = [...parts, ...central, end], out = new Uint8Array(offset + centralSize + 22)
  let at = 0
  for (const part of all) { out.set(part, at); at += part.length }
  return out
}

/** The bundle for this game address. Holds no key. */
export function buildMcpb({ url }: { url: string }): Uint8Array {
  const encoder = new TextEncoder()
  return zipStored([{ name: 'manifest.json', data: encoder.encode(manifest(url)) }, { name: 'server/index.js', data: encoder.encode(PROXY) }])
}
