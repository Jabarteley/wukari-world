import assert from 'node:assert/strict'
import { spawnSync } from 'node:child_process'
import { mkdtempSync, readFileSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join, resolve } from 'node:path'
import { test } from 'node:test'

const script = resolve(import.meta.dirname, '../geo/city-acceptance-plan.mjs')
const sha = 'a'.repeat(40)

function plan(batch: Record<string, unknown>) {
  const dir = mkdtempSync(join(tmpdir(), 'acceptance-plan-'))
  const file = join(dir, 'batch.json')
  writeFileSync(file, JSON.stringify({ schemaVersion: 1, queue: [{ id: 'b1', appSha: sha, driverSha: sha, cities: ['lagos'], ...batch }] }))
  const out = join(dir, 'github-output')
  const run = spawnSync(process.execPath, [script, 'plan', file], { cwd: dir, env: { ...process.env, GITHUB_OUTPUT: out }, encoding: 'utf8' })
  return { run, written: () => JSON.parse(readFileSync(join(dir, 'acceptance-plan.json'), 'utf8')), output: () => readFileSync(out, 'utf8') }
}

test('default batch emits no browserOnly output and records no skipped jobs', () => {
  const result = plan({})
  assert.equal(result.run.status, 0, result.run.stderr)
  assert.ok(!result.output().includes('browserOnly'))
  const written = result.written()
  assert.ok(!('browserOnly' in written) && !('skippedJobs' in written))
  assert.deepEqual(Object.keys(written), ['nodeVersion', 'shards', 'active', 'app', 'driver', 'batch', 'roundtrip', 'cities', 'queue'])
})

test('browserOnly false behaves exactly like the default', () => {
  const result = plan({ browserOnly: false })
  assert.equal(result.run.status, 0, result.run.stderr)
  assert.ok(!result.output().includes('browserOnly'))
  assert.ok(!('skippedJobs' in result.written()))
})

test('browserOnly true is a plan output and is recorded with the skipped jobs', () => {
  const result = plan({ browserOnly: true })
  assert.equal(result.run.status, 0, result.run.stderr)
  assert.match(result.output(), /^browserOnly=true$/m)
  const written = result.written()
  assert.equal(written.browserOnly, 'true')
  assert.deepEqual(written.skippedJobs, ['node', 'edge'])
  assert.match(written.skippedReason, /intentionally skipped/)
  assert.equal(written.active, 'true')
})

test('browserOnly must be a boolean', () => {
  for (const value of ['true', 1, null]) assert.notEqual(plan({ browserOnly: value }).run.status, 0)
})
