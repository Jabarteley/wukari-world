// The Allworld skill's reference files: never stale, only real furniture ids, and a worked example that is a valid plan.
import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { FURNITURE } from '../game/content/furniture.ts'
import { fitSpacePlan, normalizeSpacePlan, tierPlot } from './plan.ts'
import type { SpaceProblem } from './plan.ts'
import { REFERENCE_DIR, skillReference } from '../../scripts/skills/build-skill-reference.ts'

const root = resolve(dirname(fileURLToPath(import.meta.url)), '../..')
const read = (path: string): string => readFileSync(join(root, path), 'utf8')

test('the committed reference files equal what the source generates', () => {
  for (const [path, content] of Object.entries(skillReference())) {
    assert.equal(read(path), content, `${path} is stale: run node --experimental-strip-types scripts/skills/build-skill-reference.ts`)
  }
})

test('every id in the catalogue table is a furniture piece', () => {
  const ids = read(`${REFERENCE_DIR}/catalogue.md`).split('\n').filter((l) => l.startsWith('| ') && !l.startsWith('| id') ).map((l) => l.split('|')[1]!.trim())
  assert.equal(ids.length, Object.keys(FURNITURE).length)
  for (const id of ids) assert.ok(Object.hasOwn(FURNITURE, id), id)
})

test('the example plan is valid and fits a two-room house', () => {
  const block = /```json\n([\s\S]*?)```/.exec(read(`${REFERENCE_DIR}/space-plan.md`))
  assert.ok(block, 'space-plan.md has a json block')
  const raw = JSON.parse(block[1]!)
  const problems: SpaceProblem[] = []
  const plan = normalizeSpacePlan(raw, problems)
  assert.ok(plan)
  assert.deepEqual(problems, [])
  assert.equal(plan.items.length, raw.items.length)
  assert.deepEqual(fitSpacePlan(plan, tierPlot('bq'), { repair: false }).problems, [])
})

test('the lite-game reference example is a valid lite game', async () => {
  const { readLite } = await import('../arena/lite/schema.ts')
  const text = readFileSync(join(root, 'skills/allworld-spaces/reference/lite-game.md'), 'utf8')
  const json = /```json\n([\s\S]*?)\n```/.exec(text)?.[1]
  assert.ok(json)
  assert.deepEqual(readLite(JSON.parse(json)).problems, [])
})
