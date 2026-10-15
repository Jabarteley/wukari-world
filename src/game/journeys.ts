import type { EpisodeMementoReceipt } from '../types/episodes.ts'
import type { LifeState } from '../types/life.ts'
import type { ProjectMemento } from '../types/projects.ts'
import type { JourneyCollectionView, JourneyDefinition, JourneyMemberDefinition } from '../types/journeys.ts'
import { JOURNEYS } from './content/journeys.ts'
import { episodeById } from './content/episodes.ts'

const episodeReceipt = (state: LifeState, member: JourneyMemberDefinition): EpisodeMementoReceipt | null => {
  if (member.source.kind !== 'episode') return null
  const source = member.source, definition = episodeById(source.id)
  const saved = definition ? state.episodes?.mementos[definition.memento.id] : undefined
  const receipt = saved && saved.id === member.id && saved.version === 1 && saved.episodeId === source.id && saved.episodeVersion === source.version && saved.rewardId === definition?.memento.rewardId ? saved : null
  return receipt && Number.isSafeInteger(receipt.grantedAt) && receipt.grantedAt > 0 && receipt.grantedAt <= state.t ? receipt : null
}

const projectReceipt = (state: LifeState, member: JourneyMemberDefinition): ProjectMemento | null => {
  if (member.source.kind !== 'project') return null
  const receipt = state.projects?.mementos?.[member.source.id as keyof typeof state.projects.mementos]
  return receipt && receipt.id === member.source.id && receipt.occurrence === member.source.occurrence && Number.isSafeInteger(receipt.earnedAt) && receipt.earnedAt > 0 && receipt.earnedAt <= state.t ? receipt : null
}

const earnedAtFor = (state: LifeState, member: JourneyMemberDefinition): number | null => {
  return member.source.kind === 'episode' ? episodeReceipt(state, member)?.grantedAt ?? null : projectReceipt(state, member)?.earnedAt ?? null
}

export function journeyCollections(state: LifeState): JourneyCollectionView[] {
  const activeCountry = JOURNEYS.find(row => row.level !== 'country' && row.geography.cityId === state.estate.city)?.geography.countryId
  const visible = JOURNEYS.filter(journey => journey.geography.cityId === state.estate.city
    || journey.level === 'country' && journey.geography.countryId === activeCountry
    || journey.members.some(member => earnedAtFor(state, member) !== null))
  return visible.map((journey: JourneyDefinition) => {
    const members = journey.members.map(member => {
      const earnedAt = earnedAtFor(state, member)
      return { id: member.id, title: member.title, criterion: member.criterion, earnedAt }
    })
    const earned = members.filter(member => member.earnedAt !== null)
    return { id: journey.id, version: journey.version, name: journey.name, title: journey.title, geography: journey.geography, ...(journey.level ? { level: journey.level } : {}), ...(journey.placeLabel ? { placeLabel: journey.placeLabel } : {}), members, complete: earned.length === members.length, completionAt: earned.length === members.length ? Math.max(...earned.map(member => member.earnedAt as number)) : null }
  })
}

export { JOURNEYS }
