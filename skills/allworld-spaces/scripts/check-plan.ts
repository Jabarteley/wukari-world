// Check an Allworld Space Plan on your own computer, from a clone of the repository (no key, no network).
//   node --experimental-strip-types skills/allworld-spaces/scripts/check-plan.ts plan.json --tier bq
//   node --experimental-strip-types skills/allworld-spaces/scripts/check-plan.ts plan.json --room
// Prints one problem per line, then the cost. Exits 1 when the file is not a plan.
import { readFileSync } from 'node:fs'
import { SPACE_TIERS, firstJsonObject, fitSpacePlan, normalizeSpacePlan, roomPlot, tierPlot } from '../../../src/spaces/plan.ts'
import type { SpaceProblem } from '../../../src/spaces/plan.ts'

const args = process.argv.slice(2)
const file = args.find((a, i) => !a.startsWith('--') && args[i - 1] !== '--tier')
const tierAt = args.indexOf('--tier')
const tier = tierAt >= 0 ? args[tierAt + 1] : undefined
if (!file || (!args.includes('--room') && !SPACE_TIERS.some((t) => t === tier))) {
  console.error(`usage: check-plan.ts plan.json (--tier ${SPACE_TIERS.join('|')} | --room)`)
  process.exit(1)
}
const problems: SpaceProblem[] = []
const plan = normalizeSpacePlan(firstJsonObject(readFileSync(file, 'utf8')), problems, args.includes('--room') ? 'room' : 'home')
if (!plan) { console.error('This is not an Allworld Space Plan.'); process.exit(1) }
const fit = fitSpacePlan(plan, args.includes('--room') ? roomPlot() : tierPlot(tier as (typeof SPACE_TIERS)[number]), { repair: false })
for (const p of [...problems, ...fit.problems]) console.log(`piece ${p.index + 1} (${p.itemId}): ${p.reason}`)
console.log(`${fit.items.length} of ${plan.items.length} pieces fit. Cost ₦${fit.cost.toLocaleString('en-GB')}.`)
