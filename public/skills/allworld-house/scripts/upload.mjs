#!/usr/bin/env node
// Send a house (or any model, or a house description) to the player's Allworld account with their agent key.
//
//   node upload.mjs house.glb --house --name "Our house" --key awk_…      a whole house, set as their home
//   node upload.mjs tree.glb --name Tree --key awk_…                     a model for their spaces and worlds
//   node upload.mjs --spec house.json --key awk_…                        a house description, built by the game
//
// The key can also come from ALLWORLD_AGENT_KEY. --origin changes the server (default https://joinallworld.com).
// How: the Allworld MCP server's call_api tool asks for a one-time upload link (ten minutes, one file), then the file is sent to it.
// Node 18 or later; nothing to install. The key is sent only to the origin and never printed.
import { readFileSync } from 'node:fs'

const args = process.argv.slice(2)
const flag = (name) => args.includes(name)
const value = (name) => { const i = args.indexOf(name); return i >= 0 ? args[i + 1] : undefined }
const origin = (value('--origin') ?? 'https://joinallworld.com').replace(/\/+$/, '')
const key = value('--key') ?? process.env.ALLWORLD_AGENT_KEY
const specFile = value('--spec')
const file = args.find((a, i) => !a.startsWith('--') && !['--key', '--name', '--origin', '--spec'].includes(args[i - 1] ?? ''))
if (!key || !/^awk_/.test(key)) { console.error('Give the player\'s agent key: --key awk_… or ALLWORLD_AGENT_KEY (Allworld → Settings → AI agents).'); process.exit(2) }
if (!file && !specFile) { console.error('Usage: node upload.mjs house.glb [--house] [--name "Our house"] --key awk_…   or   node upload.mjs --spec house.json --key awk_…'); process.exit(2) }

let rpc = 0
async function callApi(method, path, body) {
  const response = await fetch(`${origin}/mcp`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${key}`, 'Content-Type': 'application/json', Accept: 'application/json, text/event-stream' },
    body: JSON.stringify({ jsonrpc: '2.0', id: ++rpc, method: 'tools/call', params: { name: 'call_api', arguments: { method, path, ...(body ? { body } : {}) } } }),
  })
  if (response.status === 401) throw new Error('The agent key was refused. Make a new one in Allworld → Settings → AI agents.')
  const answer = await response.json()
  const data = answer?.result?.structuredContent ?? JSON.parse(answer?.result?.content?.[0]?.text ?? '{}')
  const result = data?.result ?? {}
  if (data?.ok === false || result.ok === false) throw new Error(result.reason ?? data?.reason ?? `The game refused (${result.code ?? data?.code ?? 'unknown'}).`)
  return result
}

try {
  if (specFile) {
    const spec = JSON.parse(readFileSync(specFile, 'utf8'))
    const text = JSON.stringify({ spec })
    // call_api takes 8 KB at most; a larger description is sent the same way the game's own page sends it.
    if (text.length > 7800) throw new Error('This description is over 8 KB: ask the player to paste it in Houses → Copy my real house → Paste a house description.')
    const done = await callApi('POST', '/api/spaces/house', { spec })
    console.log(`Built: ${done.rooms ?? 0} rooms.${(done.notes ?? []).length ? ` The game changed: ${done.notes.join(' ')}` : ''} Tell the player to open Houses → Walk into my house.`)
  } else {
    const bytes = readFileSync(file)
    const house = flag('--house')
    const name = (value('--name') ?? file.replace(/^.*[\\/]/, '').replace(/\.glb$/i, '').replace(/[_-]+/g, ' ')).slice(0, 40)
    const link = await callApi('POST', '/api/spaces/models/upload-link', { name, ...(house ? { use: 'house' } : {}) })
    if (bytes.byteLength > link.limits.bytes) throw new Error(`The file is ${(bytes.byteLength / 1e6).toFixed(1)} MB; at most ${link.limits.bytes / 1e6} MB. Decimate it and use smaller pictures.`)
    const sent = await fetch(`${origin}${link.url}`, { method: 'POST', headers: { 'Content-Type': 'model/gltf-binary' }, body: bytes })
    const done = await sent.json().catch(() => ({}))
    if (!sent.ok || done.ok === false) throw new Error(done.reason ?? `The upload was refused (HTTP ${sent.status}).`)
    console.log(house ? `Uploaded "${done.model.name}" and made it the player's house. Tell them to open Houses → Walk into my house, then Invite.` : `Uploaded "${done.model.name}" (model id ${done.model.id}, by ${done.model.by}, hash ${done.model.hash}).`)
  }
} catch (error) {
  console.error(String(error instanceof Error ? error.message : error))
  process.exit(1)
}
