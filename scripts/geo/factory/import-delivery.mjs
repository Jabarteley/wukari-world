#!/usr/bin/env node
// Import downloaded factory artifacts (city-factory-<cc>-<N>targets-<sha>) into an app checkout.
//
//   node scripts/geo/factory/import-delivery.mjs --app <app worktree> --deliveries <dir> [--cities a,b,c] [--replace]
//
// <dir> holds one sub-folder per artifact (gh run download <run> -n <artifact> -D <dir>/<artifact>).
// For every city the script verifies, then copies:
//   delivery/cities/<id>/                 -> <app>/src/game/cities/<id>/
//   delivery/recipes/<id>.ts              -> <app>/scripts/geo/destination-detail/<id>.ts
//   delivery/<root>/receipts/<id>.json    -> <app>/world/<root>/receipts/<id>.json
//   delivery/<root>/sources/<id>.json     -> <app>/world/<root>/sources/<id>.json
// It never applies generated.patch, never touches generated catalogue/loader/route/asset files, never runs
// npm or builds. It prints the follow-up commands. Exit code 1 when any city (or artifact) is refused.
import { createHash } from 'node:crypto'
import { cpSync, existsSync, lstatSync, mkdirSync, readFileSync, readdirSync, rmSync, copyFileSync } from 'node:fs'
import { join, resolve } from 'node:path'

const ID = /^[a-z0-9]+(?:-[a-z0-9]+)*$/
const ROOT_NAME = /^playable-[a-z0-9]+(?:-[a-z0-9]+)*$/
const MAX_FILES = 200
const MAX_BYTES = 8 * 1024 * 1024

function parseArgs(argv) {
  const out = { replace: false }
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i]
    if (a === '--replace') out.replace = true
    else if (a === '--app' || a === '--deliveries' || a === '--cities') {
      const v = argv[++i]
      if (!v || v.startsWith('--')) throw new Error(`${a} needs a value`)
      out[a.slice(2)] = v
    } else throw new Error(`unknown argument ${a}`)
  }
  if (!out.app || !out.deliveries) throw new Error('usage: import-delivery.mjs --app <app worktree> --deliveries <dir> [--cities a,b,c] [--replace]')
  return out
}

const sha = (path) => createHash('sha256').update(readFileSync(path)).digest('hex')
const kind = (path) => { try { return lstatSync(path) } catch { return null } }
const isDir = (path) => kind(path)?.isDirectory() === true
const isFile = (path) => kind(path)?.isFile() === true

function readJson(path, what) {
  if (!isFile(path)) throw new Error(`${what} missing (${path})`)
  try { return JSON.parse(readFileSync(path, 'utf8')) } catch (e) { throw new Error(`${what} is not valid JSON: ${e.message}`) }
}

// Every entry below dir must be a plain file or directory (no symlinks, no devices); returns relative file paths.
function plainFiles(dir, prefix = '', acc = []) {
  for (const name of readdirSync(dir).sort()) {
    const rel = prefix ? `${prefix}/${name}` : name
    const st = lstatSync(join(dir, name))
    if (st.isSymbolicLink() || !(st.isFile() || st.isDirectory())) throw new Error(`${rel} is a symlink or special file`)
    if (st.isDirectory()) plainFiles(join(dir, name), rel, acc)
    else {
      if (st.size > MAX_BYTES) throw new Error(`${rel} is larger than ${MAX_BYTES} bytes`)
      acc.push(rel)
    }
    if (acc.length > MAX_FILES) throw new Error(`more than ${MAX_FILES} files`)
  }
  return acc
}

// step-cache.json maps absolute runner paths to sha256; match the tail after ".../city-factory/".
function manifestHashes(artifact) {
  const path = join(artifact, 'evidence', 'step-cache.json')
  if (!isFile(path)) return null
  const cache = readJson(path, 'evidence/step-cache.json')
  const map = new Map()
  for (const [step, value] of Object.entries(cache.steps ?? {})) {
    for (const [abs, hash] of Object.entries(value?.outputs ?? {})) {
      const at = abs.indexOf('/city-factory/')
      if (at < 0 || typeof hash !== 'string') continue
      map.set(abs.slice(at + '/city-factory/'.length), { hash, step })
    }
  }
  return map
}

function receiptRoot(delivery, id) {
  const roots = readdirSync(delivery).filter((name) => ROOT_NAME.test(name) && isDir(join(delivery, name))
    && isFile(join(delivery, name, 'receipts', `${id}.json`)) && isFile(join(delivery, name, 'sources', `${id}.json`)))
  if (roots.length !== 1) throw new Error(`expected exactly one delivery/playable-*/{receipts,sources}/${id}.json, found ${roots.length}`)
  return roots[0]
}

function ladderReportMatches(canonical, rungReport, rung) {
  if (!isFile(canonical) || !isFile(rungReport)) return false
  try {
    const a = JSON.parse(readFileSync(canonical, 'utf8')), b = JSON.parse(readFileSync(rungReport, 'utf8'))
    const ladder = a.toleranceLadder
    delete a.toleranceLadder
    delete b.toleranceLadder
    return ladder?.rungsDegrees?.[rung - 1] === ladder?.rungToleranceDegrees && JSON.stringify(a) === JSON.stringify(b)
  } catch { return false }
}

function verifyCity({ artifact, delivery, id, row, manifest }) {
  const dir = join(delivery, 'cities', id)
  if (!isDir(dir)) throw new Error(`delivery/cities/${id} missing`)
  const files = plainFiles(dir)
  if (!files.includes('index.ts')) throw new Error(`delivery/cities/${id}/index.ts missing`)
  const recipe = join(delivery, 'recipes', `${id}.ts`)
  if (!isFile(recipe)) throw new Error(`delivery/recipes/${id}.ts missing`)
  const root = receiptRoot(delivery, id)
  const receipt = join(delivery, root, 'receipts', `${id}.json`)
  const source = join(delivery, root, 'sources', `${id}.json`)
  const failed = Object.entries(row?.machineStages ?? {}).filter(([, ok]) => ok !== true).map(([k]) => k)
  if (!row?.machineStages || !Object.keys(row.machineStages).length) throw new Error('machine-holds row has no machineStages')
  if (failed.length) throw new Error(`machine stages not true: ${failed.join(', ')}`)
  const rc = readJson(receipt, `${root}/receipts/${id}.json`)
  if (rc.cityId !== id) throw new Error(`receipt cityId is ${rc.cityId}`)
  if (rc.inventoryPath !== `world/${root}/sources/${id}.json`) throw new Error(`receipt inventoryPath is ${rc.inventoryPath}`)
  if (rc.inventorySha256 !== sha(source)) throw new Error('receipt inventorySha256 does not match the delivered sources file')
  // Manifest check: every pinned output of this city that was delivered must match; a pinned app file that is missing is a refusal.
  let checked = 0
  if (manifest) {
    // The exact-coast stage rewrites app files (terrain.ts, geometry.ts) after earlier steps pinned their hashes and
    // step-cache.json does not always carry the new hash for every rewritten file. Its own log records sha256After
    // for each rewritten file: accept that hash (the delivered file must still match it) when the stage passed.
    // When the water budget ladder ran (row.waterBudgetLadder.accepted.rung = N), the delivered files are the ones the
    // accepted rung wrote: its log (<id>-exact-coast-rung-N.log) is the one that carries their sha256After.
    const rung = Number(row?.waterBudgetLadder?.accepted?.rung)
    const coastLogName = Number.isInteger(rung) && rung > 0 ? `${id}-exact-coast-rung-${rung}.log` : `${id}-exact-coast.log`
    const coastLog = join(artifact, 'evidence', coastLogName)
    let coastRewrites = []
    if (isFile(coastLog)) {
      try {
        const log = JSON.parse(readFileSync(coastLog, 'utf8'))
        if (log.status === 'passed' && Array.isArray(log.outputFiles)) coastRewrites = log.outputFiles
      } catch { /* an unreadable log leaves the cache hashes in force */ }
    }
    const rewritten = new Map()
    for (const f of coastRewrites) {
      const at = typeof f?.path === 'string' ? f.path.indexOf('/city-factory/') : -1
      if (at >= 0 && typeof f.sha256After === 'string' && /^[0-9a-f]{64}$/.test(f.sha256After)) rewritten.set(f.path.slice(at + '/city-factory/'.length), f.sha256After)
    }
    for (const [tail, { hash: cached, step }] of manifest) {
      const hash = rewritten.get(tail) ?? cached
      let file = null
      if (tail.startsWith(`app/src/game/cities/${id}/`)) file = join(delivery, 'cities', id, tail.slice(`app/src/game/cities/${id}/`.length))
      else if (tail === `app/scripts/geo/destination-detail/${id}.ts`) file = recipe
      else if (tail === `app/world/${root}/receipts/${id}.json`) file = receipt
      else if (tail === `app/world/${root}/sources/${id}.json`) file = source
      else if (tail.startsWith(`evidence/${id}/`)) file = join(artifact, tail)
      if (!file) continue
      if (!isFile(file)) throw new Error(`${tail} (step ${step}) is pinned but missing from the artifact`)
      if (sha(file) !== hash) {
        // The ladder rewrites coast-water.json after the exact-coast step pinned it: the canonical report is the accepted
        // rung's report plus a toleranceLadder block. Accept it only when it equals that rung report (itself hash-pinned)
        // apart from toleranceLadder, and the ladder block names the same accepted rung.
        if (!(rung > 0 && tail === `evidence/${id}/coast-water.json` && ladderReportMatches(file, join(artifact, 'evidence', id, `coast-water-rung-${rung}.json`), rung))) throw new Error(`sha256 mismatch for ${tail} (step ${step})`)
      }
      checked++
    }
  }
  return { dir, files, recipe, root, receipt, source, checked }
}

function importCity(app, id, v, replace) {
  const target = {
    city: join(app, 'src/game/cities', id),
    recipe: join(app, 'scripts/geo/destination-detail', `${id}.ts`),
    receipt: join(app, 'world', v.root, 'receipts', `${id}.json`),
    source: join(app, 'world', v.root, 'sources', `${id}.json`),
  }
  const present = Object.entries(target).filter(([, p]) => kind(p)).map(([k]) => k)
  if (present.length && !replace) throw new Error(`already present in the app (${present.join(', ')}); pass --replace to overwrite`)
  if (kind(target.city)) rmSync(target.city, { recursive: true, force: true })
  mkdirSync(join(app, 'src/game/cities'), { recursive: true })
  cpSync(v.dir, target.city, { recursive: true, dereference: false })
  mkdirSync(join(app, 'scripts/geo/destination-detail'), { recursive: true })
  copyFileSync(v.recipe, target.recipe)
  mkdirSync(join(app, 'world', v.root, 'receipts'), { recursive: true })
  mkdirSync(join(app, 'world', v.root, 'sources'), { recursive: true })
  copyFileSync(v.receipt, target.receipt)
  copyFileSync(v.source, target.source)
}

function main() {
  const args = parseArgs(process.argv.slice(2))
  const app = resolve(args.app)
  const deliveries = resolve(args.deliveries)
  if (!isFile(join(app, 'package.json')) || !isDir(join(app, 'src/game/cities'))) throw new Error(`${app} is not an app checkout (package.json / src/game/cities missing)`)
  if (!isDir(deliveries)) throw new Error(`${deliveries} is not a directory`)
  const only = args.cities ? args.cities.split(',').map((s) => s.trim()).filter(Boolean) : null
  for (const id of only ?? []) if (!ID.test(id)) throw new Error(`bad city id ${id}`)
  const report = []
  const imported = []
  const artifacts = readdirSync(deliveries).sort().filter((name) => isDir(join(deliveries, name)))
  if (!artifacts.length) throw new Error(`no artifact sub-folders in ${deliveries}`)
  const seen = new Set()
  for (const name of artifacts) {
    const artifact = join(deliveries, name)
    let holds
    try {
      holds = readJson(join(artifact, 'evidence', 'machine-holds.json'), 'evidence/machine-holds.json')
      if (holds.machineFailed !== false) throw new Error(`machine-holds.json machineFailed is ${holds.machineFailed}, need false`)
      if (holds.catalogue !== true) throw new Error(`machine-holds.json catalogue is ${holds.catalogue}, need true`)
      if (!Array.isArray(holds.rows) || !holds.rows.length) throw new Error('machine-holds.json has no rows')
    } catch (e) {
      report.push({ artifact: name, id: '(artifact)', ok: false, why: e.message })
      continue
    }
    const delivery = join(artifact, 'delivery')
    let manifest = null
    let manifestNote = 'no evidence/step-cache.json: sha256 not checked'
    try {
      manifest = manifestHashes(artifact)
      if (manifest) manifestNote = null
    } catch (e) {
      report.push({ artifact: name, id: '(artifact)', ok: false, why: e.message })
      continue
    }
    const deliveredIds = isDir(join(delivery, 'cities')) ? readdirSync(join(delivery, 'cities')).filter((n) => isDir(join(delivery, 'cities', n))) : []
    const ids = [...new Set([...holds.rows.map((r) => r.id), ...deliveredIds])].sort()
    for (const id of ids) {
      if (only && !only.includes(id)) continue
      const entry = { artifact: name, id, ok: false, why: '', note: manifestNote }
      report.push(entry)
      try {
        if (typeof id !== 'string' || !ID.test(id)) throw new Error('bad city id')
        if (seen.has(id)) throw new Error('same city appears in more than one artifact')
        seen.add(id)
        const row = holds.rows.find((r) => r.id === id)
        if (!row) throw new Error('delivered but not listed in machine-holds.json')
        if (!deliveredIds.includes(id)) throw new Error('listed in machine-holds.json but not delivered')
        const v = verifyCity({ artifact, delivery, id, row, manifest })
        importCity(app, id, v, args.replace)
        entry.ok = true
        entry.why = `${v.files.length} module files, receipts in world/${v.root}, ${v.checked} manifest hashes checked, machine status ${row.status}`
        imported.push({ id, root: v.root })
      } catch (e) {
        entry.why = e.message
      }
    }
  }
  if (only) for (const id of only) if (!report.some((r) => r.id === id)) report.push({ artifact: '-', id, ok: false, why: 'not found in any artifact' })

  console.log(`app:        ${app}\ndeliveries: ${deliveries}\n`)
  for (const r of report) console.log(`${r.ok ? 'IMPORTED' : 'REFUSED '} ${r.id}  [${r.artifact}]  ${r.why}${r.note ? `  (${r.note})` : ''}`)
  const refused = report.filter((r) => !r.ok).length
  console.log(`\n${imported.length} imported, ${refused} refused`)
  if (imported.length) {
    const ids = imported.map((i) => i.id).join(' ')
    console.log(`
Follow-up (run in ${app}; nothing was built or registered by hand):
  npm run cities:catalogue          # regenerates catalogue/loaders/routes .generated.ts
  npm run cities:assets             # regenerates content-assets.generated.ts (+ dist/assets/cities; needs disk)
  python3 scripts/world/check-playable-africa-rollout.py ${ids}   # expects pinned-assets-match
  npm run typecheck
  node --experimental-strip-types --test ${imported.map((i) => `src/game/cities/${i.id}/*.test.ts`).join(' ')} src/game/cities/allCities.test.ts
Never apply generated.patch. Still manual: primary-record review of centre/airport, visual review of the flat PNGs
(evidence/<id>/proof), land components if the app has that table, flights/travel copy, then commit and take the SHA as appSha.`)
  }
  process.exit(refused || !imported.length ? 1 : 0)
}

try { main() } catch (e) { console.error(`import-delivery: ${e.message}`); process.exit(2) }
