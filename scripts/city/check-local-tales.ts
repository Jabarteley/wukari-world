/** Validate authored values before registering a batch. This is a content gate, not a plot-quality review. */
import { writeFile } from 'node:fs/promises'
import { resolve } from 'node:path'
import { pathToFileURL } from 'node:url'
import type { AuthoredContentBatch, LocalTale } from '../../src/types/local-tales.ts'
import { WORLD_STORY_SEEDS } from '../../src/game/content/world-progression.generated.ts'
import { loadCityContent } from '../../src/game/cities/index.ts'

const args = process.argv.slice(2)
const outputAt = args.indexOf('--output')
const output = outputAt < 0 ? undefined : args.splice(outputAt, 2)[1]
if (!args.length) throw new Error('Pass one or more explicit batch-NN.ts paths, and optionally --output report.json')
const seeds = new Map(WORLD_STORY_SEEDS.map(city => [city.cityId, city]))
const expectedCountries = new Map<string, string[]>()
for (const seed of WORLD_STORY_SEEDS) {
  const cityIds = expectedCountries.get(seed.countryId) ?? []
  cityIds.push(seed.cityId)
  expectedCountries.set(seed.countryId, cityIds)
}
const errors: string[] = []
const seen = new Map<string, string>()
const cities = new Set<string>()
const countries = new Set<string>()
const desires = new Set(['belonging', 'competence', 'autonomy', 'curiosity', 'recognition', 'care', 'fairness', 'continuity'])
const normalized = (value: string) => value.toLowerCase().normalize('NFKC').replace(/[^\p{L}\p{N}]+/gu, ' ').trim()
function unique(kind: string, text: string, owner: string) {
  if (!text?.trim()) { errors.push(`${owner}: empty ${kind}`); return }
  const key = `${kind}:${normalized(text)}`
  const previous = seen.get(key)
  if (previous) errors.push(`${owner}: duplicate ${kind} with ${previous}: ${text}`)
  else seen.set(key, owner)
  if (/\b(?:TODO|TBD|lorem ipsum|placeholder)\b/i.test(text)) errors.push(`${owner}: placeholder in ${kind}`)
}
function tale(row: LocalTale, owner: string, anchors: string[]) {
  unique('title', row.title, owner)
  unique('opening', row.chapters?.[0]?.text, owner)
  unique('dilemma', row.dilemma?.prompt, owner)
  unique('closing', row.closing, owner)
  unique('keepsake', row.keepsake?.name, owner)
  if (!desires.has(row.desire)) errors.push(`${owner}: invalid desire ${row.desire}`)
  if (row.chapters?.length !== 4 || row.approaches?.length !== 3 || row.dilemma?.answers?.length !== 3) errors.push(`${owner}: invalid chapter/approach/answer tuple`)
  if (![0, 1, 2].includes(row.dilemma?.correct)) errors.push(`${owner}: invalid intended answer`)
  const prose = row.chapters?.map(chapter => chapter.text).join(' ') ?? ''
  if (!anchors.some(anchor => prose.includes(anchor))) errors.push(`${owner}: no named seed host/place in chapters`)
  for (const chapter of row.chapters ?? []) if (!chapter.title?.trim() || !chapter.text?.trim()) errors.push(`${owner}: empty chapter`)
  for (const approach of row.approaches ?? []) if (!approach.label?.trim() || !approach.callback?.trim()) errors.push(`${owner}: empty approach`)
  if (!row.dilemma?.explanation?.trim() || !row.keepsake?.description?.trim()) errors.push(`${owner}: missing explanation/keepsake description`)
}
for (const file of args) {
  const { default: batch } = await import(pathToFileURL(resolve(file)).href) as { default: AuthoredContentBatch }
  for (const country of batch.countries) {
    if (countries.has(country.countryId)) errors.push(`${country.countryId}: duplicate country`)
    countries.add(country.countryId)
    for (const field of ['title', 'premise', 'collection', 'rewardTitle'] as const) unique(`country-${field}`, country[field], country.countryId)
    if (!expectedCountries.has(country.countryId)) errors.push(`${country.countryId}: unsupported country`)
  }
  for (const city of batch.cities) {
    const seed = seeds.get(city.cityId)
    if (cities.has(city.cityId)) errors.push(`${city.cityId}: duplicate city`)
    cities.add(city.cityId)
    if (!seed) { errors.push(`${city.cityId}: unsupported city`); continue }
    const content = await loadCityContent(city.cityId)
    const venueCount = new Set(content.venues.filter(venue => venue.id !== 'home').map(venue => venue.id)).size
    const regularCount = new Set(content.regulars.map(regular => regular.id)).size
    const refs = seed
    const anchors = [refs.host.name, refs.host.venueName, refs.practical.venueName, refs.discovery.venueName]
    tale(city.city, `${city.cityId}/city`, anchors)
    tale(city.country, `${city.cityId}/country`, anchors)
    for (const scope of ['daily', 'weekly'] as const) {
      const missions = city.missions[scope]
      if (missions.length !== 3) errors.push(`${city.cityId}/${scope}: need three missions`)
      missions.forEach((mission, slot) => {
        const owner = `${city.cityId}/${scope}/${slot}`
        unique('mission-label', mission.label, owner)
        if (!mission.purpose?.trim()) errors.push(`${owner}: missing purpose`)
        const activity = mission.task === 'practical' || mission.task === 'discovery'
        const visit = ['host-visit', 'practical-visit', 'discovery-visit'].includes(mission.task)
        const valid = activity ? mission.count >= 1 && mission.count <= 3 : visit ? mission.count === 1 : mission.task === 'places' ? [2, 3].includes(mission.count) : mission.task === 'people' && [2, 3, 4].includes(mission.count)
        if (!valid) errors.push(`${owner}: invalid task/count ${mission.task}/${mission.count}`)
        if (mission.task === 'places' && mission.count > venueCount) errors.push(`${owner}: requires ${mission.count} places but only ${venueCount} are registered`)
        if (mission.task === 'people' && mission.count > regularCount) errors.push(`${owner}: requires ${mission.count} regulars but only ${regularCount} are registered`)
        if (slot === 0 && !activity) errors.push(`${owner}: life slot requires activity`)
        if (slot === 1 && !visit && mission.task !== 'places') errors.push(`${owner}: discovery slot requires visit/places`)
        if (slot === 2 && mission.task !== 'people' && !activity) errors.push(`${owner}: social slot requires people or solo activity`)
      })
    }
  }
}
// Whole-country activation prevents an incomplete multi-city arc from granting an early title.
for (const [countryId, cityIds] of expectedCountries) if (countries.has(countryId)) {
  for (const city of cityIds) if (!cities.has(city)) errors.push(`${countryId}: missing assigned city ${city}`)
}
for (const city of cities) {
  const country = seeds.get(city)?.countryId
  if (country && !countries.has(country)) errors.push(`${city}: missing country arc ${country}`)
}
const report = { referenceSource: 'src/game/content/world-progression.generated.ts', files: args, cityCount: cities.size, countryCount: countries.size, taleCount: cities.size * 2, missionCount: cities.size * 6, errors, scope: 'Structural, current grounding, registered place/regular capacity and normalized exact uniqueness only. Semantic plot quality and gameplay/save/agent compatibility require separate review.' }
if (output) await writeFile(output, `${JSON.stringify(report, null, 2)}\n`)
console.log(JSON.stringify(report, null, 2))
if (errors.length) process.exitCode = 1
