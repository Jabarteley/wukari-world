// AI agent access on the Worker host (docs/AGENTS.md): POST /mcp through the real Durable Object and its SQLite tables in Miniflare, with
// the sign-in stand-in of server/accounts/test-tokens.ts. A key made by an account works, is stored only as a hash, survives the object
// being restarted, and an agent character in a city whose content is not loaded yet is read through the on-demand loader.
import test from 'node:test'
import type { TestContext } from 'node:test'
import assert from 'node:assert/strict'
import { mkdtemp, rm, readFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join, resolve } from 'node:path'
import { createRequire } from 'node:module'
import { claimsFor, makeKey, signToken } from '../server/accounts/test-tokens.ts'
import { TOKEN_KEYS_URL } from '../server/accounts/token.ts'
import { layoutBindings, readStoredCollection } from '../server/testing/sqliteStorage.ts'
import { hashOfKey } from '../server/agents/service.ts'

interface MiniflareInstance {
  ready: Promise<URL>
  dispose(): Promise<void>
  dispatchFetch(url: string, init?: RequestInit & { headers?: Record<string, string> }): Promise<Response>
  unsafeGetDurableObjectStorage(script: string, className: string, id: { name: string }): Promise<{ exec(query: string, ...bindings: (string | number | null)[]): Promise<Record<string, unknown>[]> }>
}
interface MiniflareTooling { Miniflare: new (options: Record<string, unknown>) => MiniflareInstance; convertV4MiniflareOptions(options: Record<string, unknown>): Record<string, unknown> }
const require = createRequire(resolve(process.env['JOINALLWORLD_TOOLS'] || 'deploy/tooling', 'package.json'))
const { Miniflare, convertV4MiniflareOptions } = require('miniflare') as MiniflareTooling
const { build } = require('esbuild') as { build(options: Record<string, unknown>): Promise<unknown> }

const PROJECT = 'allworld-edge-agents-fixture'
const ORIGIN = 'https://joinallworld.test'
const MODERATOR = 'agents-edge-fixture-operator-token'
const BINDINGS = { BUILD_ID: 'agents-edge-fixture', MODERATOR_TOKEN: MODERATOR, FOUNDER_EMAIL_SHA256: '', ACCOUNTS_FIREBASE_PROJECT_ID: PROJECT, ACCOUNTS_FIREBASE_API_KEY: 'edge-web-api-key-0000000000000000000000', ACCOUNTS_GOOGLE_CLIENT_ID: '1234567890-edgeclient.apps.googleusercontent.com', ...layoutBindings() }
type Json = Record<string, unknown>
interface Person { id: string; cookie: string }

async function host(t: TestContext) {
  const folder = await mkdtemp(join(tmpdir(), 'joinallworld-agents-edge-'))
  let mf: MiniflareInstance | null = null
  const handed: Response[] = []
  let client = 0, minted = 0
  const bounded = async <T>(name: string, work: Promise<T>, ms = 30_000): Promise<T> => {
    let timer: ReturnType<typeof setTimeout> | undefined
    try { return await Promise.race([work, new Promise<never>((_, reject) => { timer = setTimeout(() => reject(new Error(`${name} exceeded ${ms} ms`)), ms) })]) } finally { if (timer) clearTimeout(timer) }
  }
  const release = async (): Promise<void> => { for (const response of handed.splice(0)) if (!response.bodyUsed && response.body && !response.body.locked) await response.body.cancel().catch(() => {}) }
  t.after(async () => { try { await release(); if (mf) await bounded('Miniflare dispose', mf.dispose()) } finally { await rm(folder, { recursive: true, force: true }) } })
  const bundle = join(folder, 'worker.mjs')
  await build({ entryPoints: [new URL('./cloudflare-worker.ts', import.meta.url).pathname], outfile: bundle, bundle: true, format: 'esm', platform: 'neutral', external: ['cloudflare:workers'] })
  const script = await readFile(bundle, 'utf8')
  const key = await makeKey('agents-edge-key')
  const start = async (): Promise<void> => {
    if (mf) { await release(); await bounded('Miniflare restart', mf.dispose()) }
    const outbound = async (request: Request): Promise<Response> => new Response(new URL(request.url).href.split('?')[0] === TOKEN_KEYS_URL ? JSON.stringify({ keys: [key.jwk] }) : '{}', { status: 200, headers: { 'content-type': 'application/json', 'cache-control': 'public, max-age=3600' } })
    const options = { name: 'joinallworld-agents-edge', script, modules: true, compatibilityDate: '2026-10-01', durableObjects: { JOINALLWORLD: { className: 'JoinAllworldState', useSQLite: true } },
      durableObjectsPersist: join(folder, 'storage'), resourcePersistencePath: join(folder, 'storage'), unsafeInspectDurableObjects: true, bindings: BINDINGS, outboundService: outbound,
      assets: { directory: new URL('../dist', import.meta.url).pathname, binding: 'ASSETS', run_worker_first: true, routerConfig: { has_user_worker: true }, assetConfig: { not_found_handling: 'single-page-application' } }, handleStructuredLogs: () => {} }
    mf = new Miniflare({ ...convertV4MiniflareOptions(options), resourcePersistencePath: join(folder, 'storage'), unsafeInspectDurableObjects: true, handleStructuredLogs: () => {} })
    await bounded('Miniflare ready', mf.ready)
  }
  await start()
  const dispatch = async (path: string, init?: RequestInit & { headers?: Record<string, string> }): Promise<Response> => { const response = await bounded(`Worker ${path}`, (mf as MiniflareInstance).dispatchFetch(ORIGIN + path, init)); handed.push(response); return response }
  const ip = (): string => `198.51.100.${(client++ % 240) + 1}`
  const browser = (path: string, body?: object, cookie?: string): Promise<Response> => dispatch(path, { method: body === undefined ? 'GET' : 'POST', headers: { origin: ORIGIN, ...(body === undefined ? {} : { 'content-type': 'application/json' }), ...(cookie ? { cookie } : {}), 'cf-connecting-ip': ip() }, ...(body === undefined ? {} : { body: JSON.stringify(body) }) })
  const csrf = async (cookie: string): Promise<string> => ((await (await browser('/api/account', undefined, cookie)).json()) as { csrf: string }).csrf
  const storage = () => (mf as MiniflareInstance).unsafeGetDurableObjectStorage('joinallworld-agents-edge', 'JoinAllworldState', { name: 'joinallworld-v1' })
  /** A signed-in player with a played life, whose account is older than a day (the account's creation time is rewritten in its row, then the object restarts). */
  async function owner(subject: string, name: string): Promise<Person> {
    const session = await browser('/api/session', { name })
    const guest = (session.headers.get('set-cookie') ?? '').split(';')[0] ?? ''
    const id = ((await session.json()) as { session: { id: string } }).session.id
    await (await browser('/api/life?city=lagos', undefined, guest)).arrayBuffer()
    const idToken = await signToken(key, claimsFor(PROJECT, Date.now(), { subject, email: `${subject.toLowerCase()}@example.com`, n: ++minted }))
    const signed = await browser('/api/account/sign-in', { idToken, csrf: await csrf(guest) }, guest)
    assert.equal(signed.status, 200)
    const cookie = (signed.headers.get('set-cookie') ?? '').split(';')[0] ?? ''
    await signed.arrayBuffer()
    const db = await storage()
    for (const row of await db.exec('SELECT id, value FROM accounts')) await db.exec('UPDATE accounts SET value = ? WHERE id = ?', JSON.stringify({ ...JSON.parse(String(row['value'])) as Json, createdAt: 1 }), String(row['id']))
    await start()
    return { id, cookie }
  }
  const makeAgentKey = async (who: Person, body: Json): Promise<Json & { status: number; key: string }> => { const r = await browser('/api/agents/keys', { ...body, csrf: await csrf(who.cookie) }, who.cookie); return { ...(await r.json() as Json), status: r.status } as Json & { status: number; key: string } }
  const mcp = async (bearer: string | null, method: string, params?: Json, headers: Record<string, string> = {}): Promise<{ status: number; json: Json; headers: Headers }> => {
    const response = await dispatch(bearer ? '/mcp' : '/mcp?signup=1', { method: 'POST', headers: { 'content-type': 'application/json', 'cf-connecting-ip': ip(), ...(bearer ? { authorization: `Bearer ${bearer}` } : {}), ...headers }, body: JSON.stringify({ jsonrpc: '2.0', id: 1, method, ...(params ? { params } : {}) }) })
    const text = await response.text()
    return { status: response.status, json: text ? JSON.parse(text) as Json : {}, headers: response.headers }
  }
  const tool = async (bearer: string, name: string, args: Json = {}): Promise<{ ok: boolean; data: Json; status: number }> => {
    const answer = await mcp(bearer, 'tools/call', { name, arguments: args })
    const result = (answer.json.result ?? {}) as Json
    return { ok: result.isError === false, data: (result.structuredContent ?? {}) as Json, status: answer.status }
  }
  const operator = (path: string, body?: object): Promise<Response> => dispatch(path, { method: body === undefined ? 'GET' : 'POST', headers: { authorization: `Bearer ${MODERATOR}`, 'content-type': 'application/json', 'cf-connecting-ip': ip() }, ...(body === undefined ? {} : { body: JSON.stringify(body) }) })
  const signup = async (name: string, extra: Json = {}): Promise<{ ok: boolean; data: Json; key: string; claim: string }> => {
    const answer = await mcp(null, 'tools/call', { name: 'create_agent_account', arguments: { name, ...extra } })
    const data = (((answer.json.result ?? {}) as Json).structuredContent ?? {}) as Json
    return { ok: data.ok === true, data, key: String(data.key ?? ''), claim: String(data.claimToken ?? '') }
  }
  const page = (path: string): Promise<Response> => dispatch(path, { headers: { 'cf-connecting-ip': ip() } })
  return { start, browser, csrf, owner, makeAgentKey, mcp, tool, storage, operator, signup, page, dispatch, ip }
}

test('POST /mcp through the Durable Object: a key plays the player\'s own character, is stored only as a hash, closed to browsers, and survives a restart', { timeout: 240_000 }, async (t) => {
  const h = await host(t)
  const ada = await h.owner('Ada1', 'Ada')
  const made = await h.makeAgentKey(ada, { mode: 'own', name: 'Edge agent' })
  assert.equal(made.status, 200, JSON.stringify(made))
  assert.match(made.key, /^awk_[A-Za-z0-9_-]{43}$/)
  const init = await h.mcp(made.key, 'initialize', { protocolVersion: '2025-06-18', capabilities: {}, clientInfo: { name: 'edge', version: '1' } })
  assert.equal(init.status, 200)
  assert.deepEqual(Object.keys(init.json).sort(), ['id', 'jsonrpc', 'result'], 'a bare JSON-RPC answer')
  assert.equal(init.headers.get('access-control-allow-origin'), null)
  const tools = (await h.mcp(made.key, 'tools/list')).json.result as { tools: { name: string }[] }
  assert.ok(tools.tools.some((tool) => tool.name === 'get_my_life') && tools.tools.length >= 15)
  const life = await h.tool(made.key, 'get_my_life')
  assert.equal(life.ok, true, JSON.stringify(life))
  assert.equal(typeof life.data.cash, 'number')
  assert.equal((await h.mcp(made.key, 'ping', undefined, { origin: ORIGIN })).status, 403, 'a browser origin is refused, even the site\'s own')
  assert.equal((await h.mcp(null, 'tools/call', { name: 'get_my_life', arguments: {} })).status, 401)
  const stored = await readStoredCollection((query, ...args) => h.storage().then((db) => db.exec(query, ...args)), 'agents') ?? ''
  assert.ok(stored.includes(hashOfKey(made.key)) && !stored.includes(made.key), 'only the hash is stored')
  await h.start();
  assert.equal((await h.tool(made.key, 'list_actions_here')).ok, true, 'the key works after the object restarts')
  const listed = await (await h.browser('/api/agents', undefined, ada.cookie)).json() as { keys: { calls: number; lastUsedAt: number }[] }
  assert.ok(listed.keys[0] && listed.keys[0].calls >= 1 && listed.keys[0].lastUsedAt > 0, 'a call is counted (a read-only call is held in memory and may be forgotten by a restart, as the store documents)')
  const revoked = await h.browser(`/api/agents/keys/${String((made as Json).id)}/revoke`, { csrf: await h.csrf(ada.cookie) }, ada.cookie)
  assert.equal(revoked.status, 200)
  assert.equal((await h.mcp(made.key, 'ping')).status, 401)
})

test('POST /mcp: an agent that signs itself up in a city whose content is not loaded yet is read through the on-demand loader after a cold start', { timeout: 240_000 }, async (t) => {
  const h = await host(t)
  const made = await h.signup('Cold Ibadan', { city: 'ibadan', builtWith: 'edge' })
  assert.equal(made.ok, true, JSON.stringify(made.data))
  await h.start()
  const life = await h.tool(made.key, 'get_my_life')
  assert.equal(life.ok, true, JSON.stringify(life))
  assert.equal(life.data.city, 'ibadan')
  const places = await h.tool(made.key, 'list_places')
  assert.equal(places.ok, true)
  assert.ok((places.data.places as unknown[]).length > 0, 'the city\'s places were read from its loaded content')
  await h.start()
  const refused = await h.tool(made.key, 'do_activity', { id: 'no-such-activity' })
  assert.equal(refused.status, 200)
  assert.notEqual(refused.data.code, 'city_content_unavailable', 'a cold city is loaded before an action runs, not refused')
  assert.equal(refused.ok, false)
})

test('POST /mcp on the Worker: the two keyless tools, the claim flow, the public pages, the general tools and venue chat', { timeout: 240_000 }, async (t) => {
  const h = await host(t)
  const keyless = (await h.mcp(null, 'tools/list')).json.result as { tools: { name: string }[] }
  assert.deepEqual(keyless.tools.map((tool) => tool.name).sort(), ['create_agent_account', 'get_claim_status'])
  assert.equal((await h.mcp(null, 'tools/call', { name: 'get_my_life', arguments: {} })).status, 401)
  const made = await h.signup('Edge Robo', { builtWith: 'rules' })
  assert.equal(made.ok, true, JSON.stringify(made.data))
  assert.match(String(made.data.claimLink), /\/agents\/claim\/awc_/)
  assert.equal((await h.tool(made.key, 'get_my_life')).ok, true)
  assert.equal((await h.tool(made.key, 'list_action_types', { match: 'estate' })).ok, true)
  assert.equal((await h.tool(made.key, 'call_api', { method: 'GET', path: '/api/account' })).data.code, 'not_allowed')
  assert.equal((await h.tool(made.key, 'call_api', { method: 'GET', path: '/api/civic/gov?city=lagos' })).ok, true)
  const said = await h.tool(made.key, 'say_here', { text: 'Hello from the edge.' })
  assert.ok(said.ok || said.data.code === 'nobody_here', JSON.stringify(said.data))
  const league = await h.page('/agents/league')
  assert.equal(league.status, 200)
  const html = await league.text()
  assert.ok(html.includes('<title>The Allworld Agent league</title>') && html.includes('Edge Robo') && !html.includes('<script'))
  assert.equal((await h.page('/agents/edge-robo')).status, 200)
  assert.equal((await h.page(`/agents/claim/${made.claim}`)).status, 200)
  const ada = await h.owner('Ada1', 'Ada')
  const claim = await h.browser('/api/agents/claim', { token: made.claim, csrf: await h.csrf(ada.cookie) }, ada.cookie)
  assert.equal(claim.status, 200, await claim.clone().text())
  assert.equal((await h.tool(made.key, 'get_my_life')).ok, true, 'the key keeps working once claimed')
  const board = await (await h.browser('/api/agents/league')).json() as { rows: { name: string; claimed: boolean }[] }
  assert.deepEqual(board.rows.map((row) => [row.name, row.claimed]), [['Edge Robo', true]])
})

test('POST /mcp: the operator switch ends agent access on the Worker, and back', { timeout: 240_000 }, async (t) => {
  const h = await host(t)
  const ada = await h.owner('Ada1', 'Ada')
  const made = await h.makeAgentKey(ada, { mode: 'own', name: 'switch' })
  const switchTo = (off: boolean) => h.operator('/api/mod/agents/switch', { off })
  assert.equal(((await (await h.operator('/api/mod/agents/switch', { createOff: true })).json()) as Json).createOff, true)
  assert.equal((await h.signup('Blocked Bot')).data.code, 'creation_off', 'creation has its own switch')
  await h.operator('/api/mod/agents/switch', { createOff: false })
  assert.equal((await switchTo(true)).status, 200)
  const refused = await h.mcp(made.key, 'tools/list')
  assert.deepEqual([refused.status, ((refused.json.error as Json).data as Json).code], [403, 'agents_off'])
  const overview = await (await h.operator('/api/mod/agents')).json() as Json
  assert.deepEqual([overview.off, overview.keys], [true, 1])
  assert.equal((await switchTo(false)).status, 200)
  assert.equal((await h.tool(made.key, 'get_my_life')).ok, true)
})

test('sign-in for web assistants on the Worker: the discovery documents, the 401 challenge, registration, the code flow with PKCE, and the token on /mcp', { timeout: 240_000 }, async (t) => {
  const h = await host(t)
  const ada = await h.owner('Ada1', 'Ada')
  // No PUBLIC_ORIGIN is set in this fixture, so the documents name the host the request arrived at (as the preview pages do).
  const resource = await (await h.page('/.well-known/oauth-protected-resource/mcp')).json() as Json
  const issuer = String((resource.authorization_servers as string[])[0])
  assert.match(issuer, /^http:\/\/127\.0\.0\.1:\d+$/)
  assert.equal(resource.resource, `${issuer}/mcp`)
  const server = await (await h.page('/.well-known/oauth-authorization-server')).json() as Json
  assert.deepEqual([server.issuer, server.token_endpoint, server.code_challenge_methods_supported], [issuer, `${issuer}/api/agents/oauth/token`, ['S256']])
  const none = await h.dispatch('/mcp', { method: 'POST', headers: { 'content-type': 'application/json', 'cf-connecting-ip': h.ip() }, body: JSON.stringify({ jsonrpc: '2.0', id: 1, method: 'initialize', params: {} }) })
  assert.equal(none.status, 401)
  assert.ok((none.headers.get('www-authenticate') ?? '').includes(`resource_metadata="${issuer}/.well-known/oauth-protected-resource/mcp"`))
  await none.arrayBuffer()
  const redirect = 'https://claude.ai/api/mcp/auth_callback'
  const registered = await h.dispatch('/api/agents/oauth/register', { method: 'POST', headers: { 'content-type': 'application/json', 'cf-connecting-ip': h.ip() }, body: JSON.stringify({ client_name: 'Claude', redirect_uris: [redirect] }) })
  assert.equal(registered.status, 201)
  const client = String(((await registered.json()) as Json).client_id)
  const verifier = 'edge-verifier-'.padEnd(64, 'abcdefghijklmnopqrstuvwxyz0123456789')
  const challenge = Buffer.from(await crypto.subtle.digest('SHA-256', new TextEncoder().encode(verifier))).toString('base64url')
  const request = new URLSearchParams({ response_type: 'code', client_id: client, redirect_uri: redirect, code_challenge: challenge, code_challenge_method: 'S256', state: 's1' }).toString()
  const decided = await h.browser('/api/agents/oauth/authorize', { request, approve: true, mode: 'own', csrf: await h.csrf(ada.cookie) }, ada.cookie)
  assert.equal(decided.status, 200)
  const code = new URL(String(((await decided.json()) as Json).redirect)).searchParams.get('code') ?? ''
  const traded = await h.dispatch('/api/agents/oauth/token', { method: 'POST', headers: { 'content-type': 'application/x-www-form-urlencoded', 'cf-connecting-ip': h.ip() }, body: new URLSearchParams({ grant_type: 'authorization_code', client_id: client, code, code_verifier: verifier, redirect_uri: redirect }).toString() })
  assert.equal(traded.status, 200)
  const tokens = await traded.json() as Json
  assert.equal((await h.tool(String(tokens.access_token), 'get_my_life')).ok, true, 'the access token plays like a key')
  const again = await h.dispatch('/api/agents/oauth/token', { method: 'POST', headers: { 'content-type': 'application/x-www-form-urlencoded', 'cf-connecting-ip': h.ip() }, body: new URLSearchParams({ grant_type: 'authorization_code', client_id: client, code, code_verifier: verifier }).toString() })
  assert.equal(again.status, 400)
  await again.arrayBuffer()
  const stored = await readStoredCollection((query, ...args) => h.storage().then((db) => db.exec(query, ...args)), 'oauth') ?? ''
  assert.ok(String(stored).length > 10 && !String(stored).includes(code), 'a code is stored only as its digest')
})
