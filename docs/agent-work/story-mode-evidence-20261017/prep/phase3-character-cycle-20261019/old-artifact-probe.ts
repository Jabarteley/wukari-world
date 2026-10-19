import assert from 'node:assert/strict'
import { readFileSync, readdirSync } from 'node:fs'
import { join } from 'node:path'
function emittedChunks(dist: string, entries: readonly string[]): string[] {
  const queue = [...entries]
  const seen = new Set<string>()
  while (queue.length) {
    const name = queue.pop() as string
    if (seen.has(name)) continue
    seen.add(name)
    // Static imports only: `from"./x.js"` and `import"./x.js"`; a dynamic import("./x.js") and the preload map are not.
    const code = readFileSync(join(dist, name), 'utf8')
    for (const match of code.matchAll(/(?:\bfrom|\bimport)\s*"\.\/([^"]+\.js)"/g)) queue.push(`assets/${match[1]}`)
  }
  return [...seen]
}

function assertCharacterChunkBoundary(dist: string): void {
  const all = readdirSync(join(dist, 'assets'))
  const characters = all.filter(name => /^characters-[\w-]+\.js$/.test(name))
  const core = all.filter(name => /^scene-core-[\w-]+\.js$/.test(name))
  assert.equal(characters.length, 1, 'one emitted character chunk is required')
  assert.equal(core.length, 1, 'one emitted scene-core chunk is required')
  const characterChunk = `assets/${characters[0]}`, coreChunk = `assets/${core[0]}`
  const characterImportsCore = emittedChunks(dist, [characterChunk]).includes(coreChunk)
  const coreImportsCharacters = emittedChunks(dist, [coreChunk]).includes(characterChunk)
  assert.ok(!(characterImportsCore && coreImportsCharacters),
    `native creator initialization must not depend on a static-import cycle between ${characterChunk} and ${coreChunk}`)
}


assertCharacterChunkBoundary(process.argv[2]!)
