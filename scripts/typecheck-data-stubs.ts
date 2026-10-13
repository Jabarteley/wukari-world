// The generated data modules of a city folder, and how the two whole-program tools read them without holding their literals.
//
// A generated city brings three data modules, terrain.ts, geometry.ts and places.ts (scripts/geo/build-destination-detail.ts),
// each one typed constant holding up to several megabytes of literal coordinates. Read in full they dominate the type program and
// the bundler: at 163 cities each type-check project needed 3.6 to 6 GB of heap and the build more than 8 GB, growing with each city.
// The files themselves are never changed (their hashes are pinned by the rollout receipts); only what the tools are handed is:
//   - typecheck: loaded with `node --import` into each compiler that scripts/typecheck.ts starts (ALLWORLD_TYPECHECK_DATA_STUBS=1),
//     which reads files through fs.readFileSync. Such a module is handed over as its declaration only: the same comments and type
//     imports and `export declare const NAME: Type`. Every importer is still checked against the declared type. What the literal
//     holds is checked when the city is generated, by createDestinationMap (src/game/cities/africa/map.ts) and by the city tests,
//     which load every map.
//   - build: vite.config.ts hands Rollup `export const NAME: Type = JSON.parse('…')` with the same value, one string token
//     instead of a syntax tree of every coordinate (see cityDataAsJson there).
// A file that is not exactly that shape is read as written by both.
import fs from 'node:fs'

/** The three generated data modules of a city folder. */
export const DATA_MODULE = /[\\/]src[\\/]game[\\/]cities[\\/][a-z0-9-]+[\\/](terrain|geometry|places)\.ts$/
/** Leading block comments, `import type` lines, then one typed export whose literal runs to the end of the file. */
const SHAPE = /^((?:\s*\/\*[\s\S]*?\*\/|\s*import type \{[^}]*\} from '[^']+'\n?)*\s*)export const ([A-Z][A-Z_]*): ([^=\n]+?) = (?=[[{])/

export interface DataModule { readonly head: string; readonly name: string; readonly type: string; readonly literal: string }

/** The parts of a generated data module, or null when the text is not one. */
export function splitDataModule(text: string): DataModule | null {
  const match = SHAPE.exec(text)
  if (!match) return null
  return { head: match[1] as string, name: match[2] as string, type: match[3] as string, literal: text.slice(match[0].length) }
}

/** The declaration-only text of a data module, or null when it is not one. */
export function declarationOf(text: string): string | null {
  const parts = splitDataModule(text)
  return parts && `${parts.head}export declare const ${parts.name}: ${parts.type}\n`
}

if (process.env.ALLWORLD_TYPECHECK_DATA_STUBS === '1') {
  const read = fs.readFileSync
  fs.readFileSync = function readFileSync(this: unknown, ...args: Parameters<typeof read>) {
    const [path, options] = args
    if (typeof path === 'string' && DATA_MODULE.test(path)) {
      const stub = declarationOf(read(path, 'utf8'))
      if (stub !== null) {
        const encoding = typeof options === 'string' ? options : options?.encoding
        return encoding ? stub : Buffer.from(stub, 'utf8')
      }
    }
    return read.apply(this, args)
  } as typeof read
}
