import type {
  EpisodeChallengeDefinition, EpisodeChallengeOptionId, EpisodeChoice, EpisodeChoiceDefinition,
  EpisodeDefinition, PlaceEpisodeId,
} from '../../types/episodes.ts'
import type { LocalTale } from '../../types/local-tales.ts'
import type { WorldStorySeed } from '../../types/world-progression.ts'
import { ACCEPTED_LOCAL_CITIES } from './local-tales-source.ts'

const episodeId = (cityId: string, kind: 'city' | 'country'): PlaceEpisodeId => `place-${cityId}-${kind}-story`
const destination = (seed: WorldStorySeed, label: string) => ({ venue: seed.host.venue, spot: 'people', label })
const activityDestination = (activity: WorldStorySeed['practical'] | WorldStorySeed['discovery']) => ({
  venue: activity.venue, spot: activity.spot, label: `${activity.label} at ${activity.venueName}`,
})

function challengeFor(id: PlaceEpisodeId, choice: EpisodeChoice, tale: LocalTale): EpisodeChallengeDefinition {
  const optionId = (index: 0 | 1 | 2): EpisodeChallengeOptionId => `${id}-${choice}-answer-${index}`
  const options = tale.dilemma.answers.map((label, index) => ({ id: optionId(index as 0 | 1 | 2), label }))
  return { prompt: tale.dilemma.prompt, options, correct: optionId(tale.dilemma.correct), retry: tale.dilemma.explanation }
}

function choicesFor(seed: WorldStorySeed, tale: LocalTale): readonly EpisodeChoiceDefinition[] {
  const practical = activityDestination(seed.practical)
  const discovery = activityDestination(seed.discovery)
  const callback = { callbackSpot: 'people', callbackSpeaker: seed.host.name, requiresStudent: false, studentRefusal: '' }
  return [
    {
      id: 'work', title: tale.approaches[0].label,
      description: `Complete ${seed.practical.label} at ${seed.practical.venueName}, then return to ${seed.host.name}.`,
      proof: 'local-practical', proofNext: practical,
      missingProof: `Complete ${seed.practical.label} at ${seed.practical.venueName}, then return to ${seed.host.name}.`,
      ...callback, callbackText: tale.approaches[0].callback,
      savedMessage: `${seed.host.name} has your practical route ready.`, outcomeTag: 'local-care',
      returnRecap: { callbackPending: tale.approaches[0].callback, finaleReady: tale.approaches[0].callback },
    },
    {
      id: 'study', title: tale.approaches[1].label,
      description: `Complete ${seed.discovery.label} at ${seed.discovery.venueName}, then return to ${seed.host.name}.`,
      proof: 'local-discovery', proofNext: discovery,
      missingProof: `Complete ${seed.discovery.label} at ${seed.discovery.venueName}, then return to ${seed.host.name}.`,
      ...callback, callbackText: tale.approaches[1].callback,
      savedMessage: `${seed.host.name} has your discovery route ready.`, outcomeTag: 'local-curiosity',
      returnRecap: { callbackPending: tale.approaches[1].callback, finaleReady: tale.approaches[1].callback },
    },
    {
      id: 'help', title: tale.approaches[2].label,
      description: `Speak with ${seed.host.name}, or complete ${seed.practical.label} when the host route is unavailable.`,
      proof: 'local-conversation', alternativeProof: 'local-practical', proofNext: practical,
      missingProof: `Speak with ${seed.host.name}, or complete ${seed.practical.label} and return to ${seed.host.venueName}.`,
      ...callback, callbackText: tale.approaches[2].callback,
      savedMessage: `${seed.host.name} has your considerate route ready.`, outcomeTag: 'local-welcome',
      returnRecap: { callbackPending: tale.approaches[2].callback, finaleReady: tale.approaches[2].callback },
    },
  ]
}

function localEpisode(seed: WorldStorySeed, tale: LocalTale, kind: 'city' | 'country'): EpisodeDefinition {
  const id = episodeId(seed.cityId, kind)
  const host = seed.host.name
  const hostDestination = destination(seed, `Meet ${host} at ${seed.host.venueName}`)
  const practical = activityDestination(seed.practical)
  const discovery = activityDestination(seed.discovery)
  const choices = choicesFor(seed, tale)
  return {
    id, version: 1, title: tale.title,
    location: { city: seed.cityId, venue: seed.host.venue, name: seed.cityName },
    prerequisite: kind === 'country' ? {
      episodeId: episodeId(seed.cityId, 'city'),
      refusal: `Complete ${ACCEPTED_LOCAL_CITIES.get(seed.cityId)?.tales.city.title ?? 'the city story'} first.`,
    } : null,
    observations: [
      { event: 'npc.interacted', source: 'local-conversation', npcId: seed.host.id },
      { event: 'activity.completed', source: 'local-practical', activityId: seed.practical.id, venue: seed.practical.venue, spot: seed.practical.spot },
      { event: 'activity.completed', source: 'local-discovery', activityId: seed.discovery.id, venue: seed.discovery.venue, spot: seed.discovery.spot },
    ],
    intro: {
      proof: 'local-conversation', npcId: seed.host.id, alternativeProof: 'local-practical', proofNext: practical,
      missingProof: `Speak with ${host} at ${seed.host.venueName}, or complete ${seed.practical.label} and return to the host venue.`,
      completeMessage: tale.chapters[0].text,
    },
    chapters: [
      { chapter: 1, title: tale.chapters[0].title, speaker: host, text: tale.chapters[0].text, destination: hostDestination },
      { chapter: 2, title: tale.chapters[1].title, speaker: host, text: tale.chapters[1].text, destination: hostDestination },
      { chapter: 3, title: tale.chapters[2].title, speaker: host, text: tale.chapters[2].text, destination: hostDestination },
      { chapter: 4, title: tale.chapters[3].title, speaker: host, text: tale.chapters[3].text, destination: hostDestination },
    ],
    choices,
    challenges: {
      work: challengeFor(id, 'work', tale), study: challengeFor(id, 'study', tale), help: challengeFor(id, 'help', tale),
    },
    finale: {
      routes: [
        {
          id: 'local-visit', title: `Complete ${seed.discovery.label}`,
          description: `Complete ${seed.discovery.label} at ${seed.discovery.venueName}, then return to ${host}.`,
          proof: 'local-discovery', missingProof: `Complete ${seed.discovery.label} before finishing.`, proofNext: discovery,
        },
        {
          id: 'quiet-support', title: 'Finish with quiet support',
          description: 'Finish using the choice you made earlier. You can complete this route on your own.',
          proof: 'quiet-support', missingProof: null,
        },
      ],
      invalidRoute: 'Choose the local activity or quiet support route.',
      notReady: `Resolve ${host}’s remembered-choice question before finishing.`,
      closingLine: tale.closing,
    },
    recap: { completed: tale.closing, introduced: tale.chapters[0].text },
    memento: {
      id: `${id}-memento`, title: tale.keepsake.name, description: tale.keepsake.description,
      icon: kind === 'city' ? '📖' : '🧭', rewardId: `episode:${id}:v1:memento`,
    },
  }
}

export const LOCAL_EPISODES: readonly EpisodeDefinition[] = Object.freeze([...ACCEPTED_LOCAL_CITIES.values()].flatMap(({ tales, seed }) => [
  localEpisode(seed, tales.city, 'city'), localEpisode(seed, tales.country, 'country'),
]))

