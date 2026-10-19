// The house skill (public/skills/allworld-house/): never stale against the game's code, every file it names is there, and its worked
// example is a house the game accepts as it is.
import test from 'node:test'
import assert from 'node:assert/strict'
import { existsSync, readFileSync } from 'node:fs'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { FILES, generated, SKILL_DIR } from '../../scripts/skills/build-house-skill.ts'
import { cleanHouseSpec } from './house-spec.ts'

const root = resolve(dirname(fileURLToPath(import.meta.url)), '../..')
const read = (path: string): string => readFileSync(join(root, path), 'utf8')

test('the generated parts of the house skill equal what the source makes', () => {
  for (const [path, content] of Object.entries(generated())) assert.equal(read(path), content, `${path} is stale: run node --experimental-strip-types scripts/skills/build-house-skill.ts`)
})

test('every file the skill names is there, and its example is a house the game takes unchanged', () => {
  for (const file of FILES) assert.ok(existsSync(join(root, SKILL_DIR, file)), file)
  const skill = read(`${SKILL_DIR}/SKILL.md`)
  for (const named of skill.matchAll(/`((?:reference|scripts)\/[a-z_.-]+)`/g)) assert.ok((FILES as readonly string[]).includes(named[1]!), `${named[1]} is named in SKILL.md but not listed`)
  assert.match(skill, /^---\nname: allworld-house\ndescription: /)
  const block = /```json\n([\s\S]*?)```/.exec(read(`${SKILL_DIR}/reference/house-spec.md`))
  assert.ok(block)
  const checked = cleanHouseSpec(JSON.parse(block[1]!))
  assert.equal(checked.ok, true)
  assert.deepEqual(checked.ok && checked.notes, [])
})
