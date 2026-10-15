import type { EpisodeDefinition } from '../../types/episodes.ts'

const STABLE_ID = /^[a-z][a-z0-9]*(?:-[a-z0-9]+)*$/

export function validateEpisodeCatalogue(catalogue: readonly EpisodeDefinition[]): string[] {
  const errors: string[] = [], episodeIds = new Set<string>(), mementoIds = new Set<string>(), rewardIds = new Set<string>()
  for (const [index, episode] of catalogue.entries()) {
    const prefix = `episode[${index}]`
    if (!STABLE_ID.test(episode.id)) errors.push(`${prefix}: unstable episode id ${episode.id}`)
    if (episodeIds.has(episode.id)) errors.push(`${prefix}: duplicate episode id ${episode.id}`)
    if (!STABLE_ID.test(episode.location.city) || !STABLE_ID.test(episode.location.venue)) errors.push(`${prefix}: city and venue must be stable ids`)
    if (!STABLE_ID.test(episode.memento.id)) errors.push(`${prefix}: unstable memento id ${episode.memento.id}`)
    if (mementoIds.has(episode.memento.id)) errors.push(`${prefix}: duplicate memento id ${episode.memento.id}`)
    if (rewardIds.has(episode.memento.rewardId)) errors.push(`${prefix}: duplicate reward id ${episode.memento.rewardId}`)
    if (episode.prerequisite && !episodeIds.has(episode.prerequisite.episodeId)) errors.push(`${prefix}: prerequisite ${episode.prerequisite.episodeId} must reference an earlier catalogue row`)
    if (episode.chapters.length !== 4 || episode.chapters.some((chapter, at) => chapter.chapter !== at + 1)) errors.push(`${prefix}: chapters must be exactly 1, 2, 3, 4`)
    if (!episode.intro.npcId.trim() || !episode.choices.every(choice => choice.callbackSpeaker.trim())) errors.push(`${prefix}: authored NPC ids and callback speakers must be non-empty`)
    const observed = new Set<string>()
    for (const observation of episode.observations) {
      if (observed.has(observation.source)) errors.push(`${prefix}: duplicate observation source ${observation.source}`)
      observed.add(observation.source)
      if (observation.event === 'npc.interacted' && !STABLE_ID.test(observation.npcId)) errors.push(`${prefix}: unstable NPC id ${observation.npcId}`)
      if (observation.event === 'activity.completed' && (!STABLE_ID.test(observation.activityId) || !STABLE_ID.test(observation.spot))) errors.push(`${prefix}: unstable activity observation ids`)
      if (observation.event === 'campus.job.completed' && (!observation.jobIds.length || observation.jobIds.some(id => !STABLE_ID.test(id)))) errors.push(`${prefix}: invalid campus job observation ids`)
      if ((observation.event === 'table.played' || observation.event === 'event.attended') && !STABLE_ID.test(observation.spot)) errors.push(`${prefix}: unstable observed spot ${observation.spot}`)
    }
    if (episode.intro.alternativeProof && !observed.has(episode.intro.alternativeProof)) errors.push(`${prefix}: intro alternative proof has no observation rule`)
    for (const choice of episode.choices) if (choice.alternativeProof && !observed.has(choice.alternativeProof)) errors.push(`${prefix}: choice alternative proof has no observation rule`)
    if (!observed.has(episode.intro.proof)) errors.push(`${prefix}: intro proof ${episode.intro.proof} has no observation rule`)
    const introObservation = episode.observations.find(observation => observation.source === episode.intro.proof)
    if (introObservation?.event !== 'npc.interacted' || introObservation.npcId !== episode.intro.npcId) errors.push(`${prefix}: intro NPC does not match its observation rule`)
    for (const choice of episode.choices) if (!observed.has(choice.proof)) errors.push(`${prefix}: choice proof ${choice.proof} has no observation rule`)
    for (const route of episode.finale.routes) if (route.missingProof !== null && !observed.has(route.proof)) errors.push(`${prefix}: finale proof ${route.proof} has no observation rule`)
    const choices = new Set<string>(), answers = new Set<string>()
    for (const choice of episode.choices) {
      if (!STABLE_ID.test(choice.id) || choices.has(choice.id)) errors.push(`${prefix}: invalid or duplicate choice ${choice.id}`)
      choices.add(choice.id)
      const challenge = episode.challenges[choice.id], visible = new Set<string>()
      for (const option of challenge.options) {
        if (!STABLE_ID.test(option.id) || visible.has(option.id) || answers.has(option.id)) errors.push(`${prefix}: invalid or duplicate answer ${option.id}`)
        visible.add(option.id); answers.add(option.id)
      }
      if (!visible.has(challenge.correct)) errors.push(`${prefix}: answer ${challenge.correct} is not a visible ${choice.id} option`)
    }
    const routes = new Set<string>()
    for (const route of episode.finale.routes) {
      if (!STABLE_ID.test(route.id) || routes.has(route.id)) errors.push(`${prefix}: invalid or duplicate finale route ${route.id}`)
      routes.add(route.id)
    }
    episodeIds.add(episode.id); mementoIds.add(episode.memento.id); rewardIds.add(episode.memento.rewardId)
  }
  return errors
}
