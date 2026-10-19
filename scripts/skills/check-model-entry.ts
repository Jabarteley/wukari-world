// The entry of public/skills/allworld-house/scripts/check_model.mjs: the game's own model check (src/spaces/glb.ts), bundled so a
// player's AI runs exactly what the server runs, with no install. Built by scripts/skills/build-house-skill.ts.
import { readFileSync } from 'node:fs'
import { checkGlb, GLB_LIMITS, HOUSE_GLB_LIMITS } from '../../src/spaces/glb.ts'

const [file, ...flags] = process.argv.slice(2)
if (!file) { console.error('Usage: node check_model.mjs model.glb [--house]'); process.exit(2) }
const house = flags.includes('--house')
const limits = house ? HOUSE_GLB_LIMITS : GLB_LIMITS
const result = checkGlb(new Uint8Array(readFileSync(file)), limits)
if (!result.ok) { console.error(`NOT ACCEPTED (${result.code}): ${result.reason}`); process.exit(1) }
const i = result.info
console.log(`PASSES as ${house ? 'a whole house' : 'a model'}: ${i.triangles.toLocaleString('en')} of ${limits.triangles.toLocaleString('en')} triangles, ${i.textures} pictures, ${i.size.map((n) => n.toFixed(2)).join(' × ')} m (x, y up, z).`)
