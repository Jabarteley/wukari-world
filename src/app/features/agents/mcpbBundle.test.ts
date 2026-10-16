// The desktop bundle: a real zip (signatures, names, CRC-32s), a manifest that asks for the key at install time, no key in the bytes, a proxy that parses.
import test from 'node:test'
import assert from 'node:assert/strict'
import { spawnSync } from 'node:child_process'
import { mkdtempSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { MCPB_FILENAME, buildMcpb, crc32 } from './mcpbBundle.ts'

const URL_ = 'https://play.example/mcp'
function read(zip: Uint8Array): Map<string, Uint8Array> {
  const view = new DataView(zip.buffer, zip.byteOffset, zip.byteLength), out = new Map<string, Uint8Array>()
  const end = zip.length - 22
  assert.equal(view.getUint32(end, true), 0x06054b50)
  const count = view.getUint16(end + 10, true)
  assert.equal(view.getUint32(end + 16, true) + view.getUint32(end + 12, true), end)
  let at = view.getUint32(end + 16, true)
  for (let i = 0; i < count; i++) {
    assert.equal(view.getUint32(at, true), 0x02014b50)
    const crc = view.getUint32(at + 16, true), size = view.getUint32(at + 24, true), nameLength = view.getUint16(at + 28, true), local = view.getUint32(at + 42, true)
    const name = new TextDecoder().decode(zip.subarray(at + 46, at + 46 + nameLength))
    assert.equal(view.getUint32(local, true), 0x04034b50)
    assert.equal(view.getUint16(local + 8, true), 0, 'stored')
    assert.equal(view.getUint16(local + 12, true), 0x21, 'fixed date')
    assert.equal(view.getUint32(local + 14, true), crc)
    assert.equal(view.getUint32(local + 22, true), size)
    const start = local + 30 + view.getUint16(local + 26, true) + view.getUint16(local + 28, true), data = zip.subarray(start, start + size)
    assert.equal(crc32(data), crc, `crc of ${name}`)
    out.set(name, data); at += 46 + nameLength
  }
  return out
}

test('crc32 matches the known check value', () => { assert.equal(crc32(new TextEncoder().encode('123456789')), 0xcbf43926) })

test('the bundle is a valid zip with the manifest and the proxy, and the same bytes every time', () => {
  assert.equal(MCPB_FILENAME, 'allworld.mcpb')
  const zip = buildMcpb({ url: URL_ }), files = read(zip)
  assert.deepEqual([...files.keys()], ['manifest.json', 'server/index.js'])
  assert.deepEqual(buildMcpb({ url: URL_ }), zip)
  const manifest = JSON.parse(new TextDecoder().decode(files.get('manifest.json'))) as Record<string, any>
  assert.equal(manifest.manifest_version, '0.2'); assert.equal(manifest.name, 'allworld'); assert.equal(manifest.author.name, 'Allworld')
  assert.equal(manifest.server.entry_point, 'server/index.js')
  assert.deepEqual(manifest.server.mcp_config.args, ['${__dirname}/server/index.js'])
  assert.deepEqual(manifest.server.mcp_config.env, { ALLWORLD_URL: '${user_config.server_url}', ALLWORLD_KEY: '${user_config.agent_key}' })
  assert.equal(manifest.user_config.agent_key.sensitive, true); assert.equal(manifest.user_config.agent_key.required, true)
  assert.equal(manifest.user_config.server_url.default, URL_)
})

test('no key is in the bytes', () => {
  const zip = buildMcpb({ url: URL_ }), text = new TextDecoder('latin1').decode(zip)
  assert.ok(!/awk_[A-Za-z0-9_-]{43}/.test(text))
})

test('the proxy is valid Node and answers a missing key with an exit', () => {
  const dir = mkdtempSync(join(tmpdir(), 'mcpb-')), file = join(dir, 'index.js')
  try {
    writeFileSync(file, read(buildMcpb({ url: URL_ })).get('server/index.js') ?? new Uint8Array())
    assert.equal(spawnSync(process.execPath, ['--check', file]).status, 0)
    const run = spawnSync(process.execPath, [file], { env: { PATH: process.env.PATH ?? '' }, input: '' })
    assert.equal(run.status, 1)
  } finally { rmSync(dir, { recursive: true, force: true }) }
})

test('the proxy forwards a line and writes the JSON answer on one line, with the bearer header', async () => {
  const { createServer } = await import('node:http')
  let seen = ''
  const server = createServer((req, res) => { let body = ''; req.on('data', (c) => { body += c }); req.on('end', () => { if (!body.includes('"id"')) { res.statusCode = 202; res.end(); return } seen = `${req.headers.authorization}|${body}`; res.setHeader('content-type', 'application/json'); res.end(JSON.stringify({ jsonrpc: '2.0', id: 1, result: {} })) }) })
  await new Promise<void>((done) => server.listen(0, '127.0.0.1', done))
  const port = (server.address() as { port: number }).port, dir = mkdtempSync(join(tmpdir(), 'mcpb-')), file = join(dir, 'index.js')
  try {
    writeFileSync(file, read(buildMcpb({ url: URL_ })).get('server/index.js') ?? new Uint8Array())
    const { spawn } = await import('node:child_process')
    const child = spawn(process.execPath, [file], { env: { PATH: process.env.PATH ?? '', ALLWORLD_URL: `http://127.0.0.1:${port}/mcp`, ALLWORLD_KEY: 'test-key' } })
    let out = '', err = ''
    child.stdout.on('data', (c) => { out += c }); child.stderr.on('data', (c) => { err += c })
    child.stdin.end('{"jsonrpc":"2.0","id":1,"method":"ping"}\n{"jsonrpc":"2.0","method":"notifications/initialized"}\n')
    await new Promise((done) => child.on('close', done))
    assert.equal(out, '{"jsonrpc":"2.0","id":1,"result":{}}\n', 'one line; nothing for the notification')
    assert.ok(seen.startsWith('Bearer test-key|'))
    assert.ok(!err.includes('test-key'))
  } finally { server.close(); rmSync(dir, { recursive: true, force: true }) }
})
