import { createHash } from 'node:crypto'
import { readFile } from 'node:fs/promises'
import { resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { houseTalkBindingsOf } from '../../server/story/cast.ts'
import { cityContent } from '../../src/game/cities/registry.ts'
import type { CityContent } from '../../src/types/content.ts'
import { extractCityBrief, type SourceFileHashV1 } from '../scene-factory/facts.ts'
import { parseTalkDraftBinding, prepareTalkDraft, type TalkDraftBindingV1 } from './draft.ts'

export interface ExtractTalkDraftInputsOptions {
  cityId: unknown
  region: unknown
  voice: unknown
  lang: unknown
  phrasebook: unknown
  phrases: unknown
  repoRoot?: string
}

export interface TalkDraftInputsPlanV1 {
  cityId: string
  region: string
  cityBrief: { inputSha256: string; contentSha256: string }
  sourceHashes: SourceFileHashV1[]
  requestHashes: { npcId: string; sha256: string }[]
  inputSha256: string
  counts: {
    regulars: number
    houseAgents?: number
    bindings: number
    facts: number
    phrasebookEntries: number
    selectedPhrasesPerBinding: number
    preparedRequests: number
    preparedPromptBytes: number
  }
  bindings: TalkDraftBindingV1[]
}

function sha256(value: string | Uint8Array): string { return createHash('sha256').update(value).digest('hex') }

function canonical(value: unknown): string {
  if (value === null || typeof value === 'boolean' || typeof value === 'string') return JSON.stringify(value)
  if (typeof value === 'number') {
    if (!Number.isFinite(value)) throw new TypeError('talk input digest cannot include a non-finite number')
    return JSON.stringify(value)
  }
  if (Array.isArray(value)) return `[${value.map(canonical).join(',')}]`
  if (!value || typeof value !== 'object') throw new TypeError('talk input digest accepts JSON data only')
  const entries = Object.entries(value as Record<string, unknown>).sort(([left], [right]) => left.localeCompare(right, 'en'))
  return `{${entries.map(([key, item]) => `${JSON.stringify(key)}:${canonical(item)}`).join(',')}}`
}

function copiedJson(value: unknown): unknown {
  return structuredClone(value)
}

const CITY_CULTURE_FACT_LIMIT = 8
const CITY_PLACE_FACT_LIMIT = 12
const HOUSE_CAST_SOURCE = 'server/house/cast.ts'

function cityFacts(content: CityContent, source: string): { id: string; text: string; source: string }[] {
  return [
    ...content.culture.food.slice(0, CITY_CULTURE_FACT_LIMIT).map((text, at) => ({ id: `city-food-${at + 1}`, text, source })),
    ...content.culture.knownFor.slice(0, CITY_CULTURE_FACT_LIMIT).map((text, at) => ({ id: `city-known-for-${at + 1}`, text, source })),
  ]
}

function publicVenueFacts(content: CityContent, venueId: string, source: string): { id: string; text: string; source: string }[] {
  const publicVenues = content.venues.filter(venue => venue.kind !== 'home')
    .sort((left, right) => left.id.localeCompare(right.id, 'en'))
  const current = publicVenues.find(venue => venue.id === venueId)
  const selected = [...(current ? [current] : []), ...publicVenues.filter(venue => venue !== current)]
    .slice(0, CITY_PLACE_FACT_LIMIT)
  return selected.flatMap((venue, at) => [
    { id: `city-place-name-${at + 1}`, text: venue.name, source },
    { id: `city-place-kind-${at + 1}`, text: venue.kind, source },
  ])
}

/** Build strict, validated per-regular draft bindings from the accepted city brief and supplied phrasebook selections. */
export async function extractTalkDraftInputs(options: ExtractTalkDraftInputsOptions): Promise<TalkDraftInputsPlanV1> {
  const brief = await extractCityBrief({ cityId: options.cityId, region: options.region, repoRoot: options.repoRoot })
  const content = cityContent(brief.city.id)
  if (content.cityId !== brief.city.id) throw new Error(`loaded city content ${content.cityId} does not match brief ${brief.city.id}`)
  const repoRoot = resolve(options.repoRoot ?? fileURLToPath(new URL('../..', import.meta.url)))
  const houseCastHash = sha256(await readFile(resolve(repoRoot, HOUSE_CAST_SOURCE)))
  const sourceHashes = [...brief.provenance.files, ...brief.provenance.registrationFiles, { path: HOUSE_CAST_SOURCE, sha256: houseCastHash }]
    .sort((left, right) => left.path.localeCompare(right.path, 'en'))
  for (let at = 1; at < sourceHashes.length; at++) {
    const previous = sourceHashes[at - 1]!, current = sourceHashes[at]!
    if (previous.path === current.path) {
      if (previous.sha256 !== current.sha256) throw new Error(`conflicting source hashes for ${current.path}`)
      sourceHashes.splice(at--, 1)
    }
  }
  const venues = new Map(brief.venues.map(venue => [venue.id, venue]))
  const bindings: TalkDraftBindingV1[] = []
  const requestHashes: { npcId: string; sha256: string }[] = []
  let preparedPromptBytes = 0

  const append = (rawBinding: unknown): void => {
    const binding = parseTalkDraftBinding(rawBinding)
    if (bindings.some(row => row.npc.id === binding.npc.id)) throw new Error(`duplicate talk binding ${binding.npc.id}`)
    const prepared = prepareTalkDraft(binding)
    preparedPromptBytes += prepared.request.messages.reduce((sum, message) => sum + new TextEncoder().encode(message.content).byteLength, 0)
    requestHashes.push({ npcId: binding.npc.id, sha256: sha256(canonical(prepared.request)) })
    bindings.push(binding)
  }

  for (const regular of [...brief.regulars].sort((left, right) => left.id.localeCompare(right.id, 'en'))) {
    const venue = venues.get(regular.venueId)
    if (!venue) throw new Error(`regular ${regular.id} references missing brief venue ${regular.venueId}`)
    const citySource = `city-brief:${brief.digests.inputSha256}`
    const contentSource = `city-content:${brief.digests.contentSha256}`
    const facts = [
      { id: 'npc-role', text: regular.role, source: contentSource },
      ...venue.effectiveSpots.map(spot => ({
        id: `venue-target-${spot.id}`,
        text: spot.name,
        source: citySource,
      })),
      ...cityFacts(content, contentSource),
      ...publicVenueFacts(content, venue.id, contentSource),
    ]
    const rawBinding: unknown = {
      city: { id: brief.city.id, name: brief.city.name, source: citySource },
      npc: { id: regular.id, name: regular.name, source: contentSource },
      venue: { id: venue.id, name: venue.name, source: citySource },
      voice: options.voice,
      lang: options.lang,
      facts,
      phrasebook: copiedJson(options.phrasebook),
      phrases: copiedJson(options.phrases),
    }
    append(rawBinding)
  }
  const houseAgents = houseTalkBindingsOf(brief.city.id, houseCastHash)
  for (const house of houseAgents) {
    const venue = venues.get(house.venue.id)
    if (!venue || venue.name !== house.venue.name) throw new Error(`house agent ${house.npc.id} references missing brief venue ${house.venue.id}`)
    const citySource = `city-brief:${brief.digests.inputSha256}`
    const contentSource = `city-content:${brief.digests.contentSha256}`
    append({
      city: { id: brief.city.id, name: brief.city.name, source: citySource },
      npc: house.npc,
      venue: { id: venue.id, name: venue.name, source: contentSource },
      voice: options.voice,
      lang: options.lang,
      facts: [
        ...house.facts,
        ...venue.effectiveSpots.map(spot => ({ id: `venue-target-${spot.id}`, text: spot.name, source: citySource })),
        ...cityFacts(content, contentSource),
        ...publicVenueFacts(content, venue.id, contentSource),
      ],
      phrasebook: copiedJson(options.phrasebook),
      phrases: copiedJson(options.phrases),
    })
  }
  if (!bindings.length) throw new Error(`city ${brief.city.id} has no talk identities to bind`)
  bindings.sort((left, right) => left.npc.id.localeCompare(right.npc.id, 'en'))
  requestHashes.sort((left, right) => left.npcId.localeCompare(right.npcId, 'en'))

  const counts = {
    bindings: bindings.length,
    regulars: brief.regulars.length,
    houseAgents: houseAgents.length,
    facts: bindings.reduce((sum, binding) => sum + binding.facts.length, 0),
    phrasebookEntries: bindings[0]!.phrasebook.length,
    selectedPhrasesPerBinding: bindings[0]!.phrases.length,
    preparedRequests: bindings.length,
    preparedPromptBytes,
  }
  const inputSha256 = sha256(canonical({
    cityId: brief.city.id,
    region: brief.style.region,
    cityBrief: brief.digests,
    sourceHashes,
    requestHashes,
    voice: options.voice,
    lang: options.lang,
    bindings,
  }))
  return {
    cityId: brief.city.id,
    region: brief.style.region,
    cityBrief: brief.digests,
    sourceHashes,
    requestHashes,
    inputSha256,
    counts,
    bindings,
  }
}
