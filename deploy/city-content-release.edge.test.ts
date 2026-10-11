import test from 'node:test'
import assert from 'node:assert/strict'
import { createHash } from 'node:crypto'
import { cp, mkdir, mkdtemp, readFile, rm, unlink, writeFile } from 'node:fs/promises'
import { createRequire } from 'node:module'
import { tmpdir } from 'node:os'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { layoutBindings } from '../server/testing/sqliteStorage.ts'
import { CITY_CONTENT_ASSETS } from '../src/game/cities/content-assets.generated.ts'

interface TestSocket { accept(): void; close(): void; send(value: string): void; addEventListener(type: 'message', listener: (event: { data: string }) => void): void }
type WorkerResponse = Response & { webSocket?: TestSocket | null }
interface ObjectStorage { exec(sql: string, ...values: (string | number)[]): Promise<Record<string, unknown>[]> }
interface WorkerHost {
  ready: Promise<URL>
  dispose(): Promise<void>
  dispatchFetch(url: string, init?: RequestInit): Promise<WorkerResponse>
  unsafeGetDurableObjectStorage(script: string, className: string, id: { name: string }): Promise<ObjectStorage>
}
interface Tooling { Miniflare: new (options: Record<string, unknown>) => WorkerHost; convertV4MiniflareOptions(options: Record<string, unknown>): Record<string, unknown> }
interface BuildApi { build(options: Record<string, unknown>): Promise<unknown> }
interface Device { cookie: string; secret: string }
interface AssetProof { reads: Record<string, number>; alarms: number }

const require = createRequire(resolve(process.env.JOINALLWORLD_TOOLS || 'deploy/tooling', 'package.json'))
const { Miniflare, convertV4MiniflareOptions } = require('miniflare') as Tooling
const { build } = require('esbuild') as BuildApi
const root = fileURLToPath(new URL('..', import.meta.url))
const dist = fileURLToPath(new URL('../dist', import.meta.url))
const ORIGIN = 'https://city-content-release.test'
const DO_NAME = 'joinallworld-v1'

const deadline = async <T>(label: string, work: Promise<T>, ms = 30000): Promise<T> => {
  let timer: ReturnType<typeof setTimeout> | undefined
  return Promise.race([work, new Promise<never>((_, reject) => { timer = setTimeout(() => reject(new Error(`${label} timed out`)), ms) })]).finally(() => clearTimeout(timer))
}

async function bundle(path: string, rows = CITY_CONTENT_ASSETS): Promise<void> {
  await build({
    stdin: {
      contents: `
        const host = await import('./deploy/cloudflare-worker.ts');
        export class MeasuredJoinAllworldState extends host.JoinAllworldState {
          reads: Map<string, number>;
          alarms = 0;
          constructor(ctx: DurableObjectState, env: any) {
            const reads = new Map<string, number>();
            const assets = env.ASSETS;
            super(ctx, { ...env, ASSETS: { fetch(request: Request) {
              const path = new URL(request.url).pathname;
              reads.set(path, (reads.get(path) ?? 0) + 1);
              return assets.fetch(request);
            } } });
            this.reads = reads;
          }
          override async fetch(request: Request): Promise<Response> {
            const path = new URL(request.url).pathname;
            if (path === '/__release-proof/assets') return Response.json({ reads: Object.fromEntries(this.reads), alarms: this.alarms });
            if (path === '/__release-proof/alarm') { await this.ctx.storage.setAlarm(Date.now()); return Response.json({ armed: true }); }
            return super.fetch(request);
          }
          override async alarm(): Promise<void> { this.alarms += 1; await super.alarm(); }
        }
        export default { async fetch(request: Request, env: any) {
          if (new URL(request.url).pathname.startsWith('/__release-proof/')) return env.JOINALLWORLD.getByName(${JSON.stringify(DO_NAME)}).fetch(request);
          return host.default.fetch(request, env);
        } };
      `,
      resolveDir: root, sourcefile: 'city-content-release-worker.ts', loader: 'ts',
    },
    outfile: path, bundle: true, format: 'esm', platform: 'neutral', external: ['cloudflare:workers'],
    plugins: [{
      name: 'release-city-content-manifest',
      setup(api: { onLoad(options: { filter: RegExp }, load: () => { contents: string; loader: 'ts' }): void }) {
        api.onLoad({ filter: /content-assets\.generated\.ts$/ }, () => ({ contents: `export const CITY_CONTENT_ASSETS = Object.freeze(${JSON.stringify(rows)})`, loader: 'ts' }))
      },
    }],
  })
}

function runtime(scriptName: string, script: string, storage: string, assets: string): WorkerHost {
  const options = {
    name: scriptName, script, modules: true, compatibilityDate: '2026-10-01',
    durableObjects: { JOINALLWORLD: { className: 'MeasuredJoinAllworldState', useSQLite: true } },
    durableObjectsPersist: storage, bindings: { ...layoutBindings(), BUILD_ID: scriptName, FOUNDER_EMAIL_SHA256: '' },
    assets: { directory: assets, binding: 'ASSETS', run_worker_first: true, routerConfig: { has_user_worker: true }, assetConfig: { not_found_handling: 'single-page-application' } },
  }
  return new Miniflare({ ...convertV4MiniflareOptions(options), resourcePersistencePath: storage, unsafeInspectDurableObjects: true, handleStructuredLogs: () => {} })
}

const cookieSecret = (cookie: string): string => cookie.slice(cookie.indexOf('=') + 1)
const request = (worker: WorkerHost, path: string, init: RequestInit = {}): Promise<WorkerResponse> => worker.dispatchFetch(ORIGIN + path, { ...init, headers: { origin: ORIGIN, ...init.headers } })

async function device(worker: WorkerHost, name: string, city: string): Promise<Device> {
  const created = await request(worker, '/api/session', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ name }) })
  assert.equal(created.status, 200)
  const cookie = (created.headers.get('set-cookie') ?? '').split(';')[0] ?? ''
  assert.ok(cookie)
  const life = await request(worker, `/api/life?city=${city}`, { headers: { cookie } })
  assert.equal(life.status, 200)
  assert.equal(((await life.json()) as { state?: { estate?: { city?: string } } }).state?.estate?.city, city)
  return { cookie, secret: cookieSecret(cookie) }
}

const proof = async (worker: WorkerHost): Promise<AssetProof> => {
  const response = await request(worker, '/__release-proof/assets')
  assert.equal(response.status, 200)
  return response.json() as Promise<AssetProof>
}

async function session(storage: ObjectStorage, secret: string): Promise<Record<string, unknown>> {
  const rows = await storage.exec('SELECT value FROM sessions WHERE secret = ?', secret)
  assert.equal(rows.length, 1)
  return JSON.parse(String(rows[0]?.value)) as Record<string, unknown>
}

test('release city assets: cold HTTP, socket and alarm entry points use the Durable Object with its real ASSETS binding', { timeout: 120000 }, async t => {
  const folder = await mkdtemp(join(tmpdir(), 'joinallworld-city-release-'))
  const output = join(folder, 'worker.mjs'), storagePath = join(folder, 'storage')
  await bundle(output)
  const script = await readFile(output, 'utf8')
  let worker = runtime('city-content-release', script, storagePath, dist)
  const sockets: TestSocket[] = []
  const stop = async () => deadline('Worker disposal', worker.dispose())
  t.after(async () => { for (const socket of sockets) try { socket.close() } catch { /* closed */ } await stop().catch(() => {}); await rm(folder, { recursive: true, force: true }) })
  await deadline('Worker startup', worker.ready)

  const [lagos, ibadan, abuja] = await Promise.all([
    device(worker, 'Release Lagos', 'lagos'), device(worker, 'Release Ibadan', 'ibadan'), device(worker, 'Release Abuja', 'abuja'),
  ])
  const db = await worker.unsafeGetDurableObjectStorage('city-content-release', 'MeasuredJoinAllworldState', { name: DO_NAME })
  const [primary, second, third] = await Promise.all([session(db, lagos.secret), session(db, ibadan.secret), session(db, abuja.secret)])
  primary.cities = { ...(primary.cities as object), ...(second.cities as object), ...(third.cities as object) }
  await db.exec('UPDATE sessions SET value = ? WHERE secret = ?', JSON.stringify(primary), lagos.secret)

  await stop()
  worker = runtime('city-content-release', script, storagePath, dist)
  await deadline('Cold Worker startup', worker.ready)
  const began = performance.now()
  const answers = await Promise.all([request(worker, '/api/life?city=lagos', { headers: { cookie: lagos.cookie } }), request(worker, '/api/life?city=lagos', { headers: { cookie: lagos.cookie } })])
  const coldMs = performance.now() - began
  for (const answer of answers) assert.ok(answer.status === 200 || answer.status === 503)
  const retry = answers.some(answer => answer.status === 503)
  await Promise.all(answers.map(answer => answer.arrayBuffer()))
  if (retry) {
    const warmed = await request(worker, '/api/life?city=lagos', { headers: { cookie: lagos.cookie } })
    assert.equal(warmed.status, 200)
    await warmed.arrayBuffer()
  }
  const measured = await proof(worker)
  const cityReads = Object.entries(measured.reads).filter(([path]) => path.startsWith('/assets/cities/'))
  assert.equal(cityReads.length, 3)
  assert.deepEqual(cityReads.map(([path, count]) => [path.split('/').at(-1)?.split('.')[0], count]).sort(), [['abuja', 1], ['ibadan', 1], ['lagos', 1]])
  console.log(`cold stored-city preload: 3 ASSETS subrequests, ${coldMs.toFixed(1)} ms, 2 concurrent requests`)

  await stop()
  worker = runtime('city-content-release', script, storagePath, dist)
  await deadline('Socket Worker startup', worker.ready)
  const upgrade = await request(worker, '/socket', { headers: { cookie: lagos.cookie, upgrade: 'websocket' } })
  assert.equal(upgrade.status, 101)
  const socket = upgrade.webSocket
  assert.ok(socket)
  socket.accept(); sockets.push(socket)
  const frame = new Promise<void>((resolveFrame, reject) => {
    const timer = setTimeout(() => reject(new Error('socket city preload timed out')), 10000)
    socket.addEventListener('message', event => {
      const value = JSON.parse(event.data) as { type?: string; cityId?: string }
      if (value.type === 'tables' && value.cityId === 'lagos') { clearTimeout(timer); resolveFrame() }
    })
  })
  socket.send(JSON.stringify({ type: 'table-list', cityId: 'lagos', venue: 'park' }))
  await frame
  const beforeAlarm = await proof(worker)
  const socketReads = Object.entries(beforeAlarm.reads).filter(([path]) => path.startsWith('/assets/cities/'))
  assert.deepEqual(socketReads.map(([path, count]) => [path.split('/').at(-1)?.split('.')[0], count]), [['lagos', 1]])
  assert.equal((await request(worker, '/__release-proof/alarm')).status, 200)
  let afterAlarm = beforeAlarm
  for (let attempt = 0; attempt < 100 && afterAlarm.alarms === beforeAlarm.alarms; attempt++) {
    await new Promise(resolve => setTimeout(resolve, 20))
    afterAlarm = await proof(worker)
  }
  assert.equal(afterAlarm.alarms, beforeAlarm.alarms + 1, 'the real Durable Object alarm ran')
  assert.deepEqual(afterAlarm.reads, beforeAlarm.reads, 'an alarm with no stored-life settlement needs no city asset')
})

test('release city assets: a second deployment reads only its own complete hash set over persisted state', { timeout: 120000 }, async t => {
  const folder = await mkdtemp(join(tmpdir(), 'joinallworld-city-skew-'))
  const storagePath = join(folder, 'storage'), assetsA = join(folder, 'assets-a'), assetsB = join(folder, 'assets-b')
  const scriptAPath = join(folder, 'worker-a.mjs'), scriptBPath = join(folder, 'worker-b.mjs')
  await Promise.all([cp(dist, assetsA, { recursive: true }), cp(dist, assetsB, { recursive: true })])
  const oldRow = CITY_CONTENT_ASSETS.find(row => row.id === 'lagos')
  assert.ok(oldRow)
  const oldFile = join(assetsB, oldRow.path.slice(1))
  const payload = JSON.parse(await readFile(oldFile, 'utf8')) as { rules: { defaultName?: string } }
  payload.rules.defaultName = `${payload.rules.defaultName ?? 'New Lagosian'} v2`
  const nextBytes = JSON.stringify(payload), nextHash = createHash('sha256').update(nextBytes).digest('hex')
  const nextPath = `/assets/cities/lagos.${nextHash}.json`
  await mkdir(dirname(join(assetsB, nextPath.slice(1))), { recursive: true })
  await writeFile(join(assetsB, nextPath.slice(1)), nextBytes)
  await unlink(oldFile)
  const nextRows = CITY_CONTENT_ASSETS.map(row => row.id === 'lagos' ? { ...row, path: nextPath, sha256: nextHash, bytes: Buffer.byteLength(nextBytes) } : row)
  await Promise.all([bundle(scriptAPath), bundle(scriptBPath, nextRows)])
  const [scriptA, scriptB] = await Promise.all([readFile(scriptAPath, 'utf8'), readFile(scriptBPath, 'utf8')])
  let worker = runtime('city-content-skew', scriptA, storagePath, assetsA)
  const stop = async () => deadline('Worker disposal', worker.dispose())
  t.after(async () => { await stop().catch(() => {}); await rm(folder, { recursive: true, force: true }) })
  await deadline('First deployment startup', worker.ready)
  const who = await device(worker, 'Version Skew', 'lagos')
  assert.deepEqual((await proof(worker)).reads[oldRow.path], 1)
  assert.equal((await proof(worker)).reads[nextPath], undefined)

  await stop()
  worker = runtime('city-content-skew', scriptB, storagePath, assetsB)
  await deadline('Second deployment startup', worker.ready)
  let response = await request(worker, '/api/life?city=lagos', { headers: { cookie: who.cookie } })
  if (response.status === 503) response = await request(worker, '/api/life?city=lagos', { headers: { cookie: who.cookie } })
  assert.equal(response.status, 200)
  assert.equal(((await response.json()) as { state?: { estate?: { city?: string } } }).state?.estate?.city, 'lagos')
  const after = await proof(worker)
  assert.equal(after.reads[nextPath], 1)
  assert.equal(after.reads[oldRow.path], undefined)
})
