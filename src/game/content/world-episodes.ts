import type { EpisodeDefinition, EpisodeId, EpisodeChoiceDefinition } from '../../types/episodes.ts'
import type { WorldStorySeed } from '../../types/world-progression.ts'

const stableEpisodeId = (cityId: string, suffix: 'first-steps' | 'second-chapter'): EpisodeId => `city-${cityId}-${suffix}`

function destination(seed: WorldStorySeed, label: string) {
  return { venue: seed.host.venue, spot: 'people', label }
}

function activityDestination(activity: WorldStorySeed['practical'] | WorldStorySeed['discovery']) {
  return { venue: activity.venue, spot: activity.spot, label: `${activity.label} at ${activity.venueName}` }
}

function episode(seed: WorldStorySeed, second: boolean): EpisodeDefinition {
  const id = stableEpisodeId(seed.cityId, second ? 'second-chapter' : 'first-steps')
  const earlierId = stableEpisodeId(seed.cityId, 'first-steps')
  const title = second ? `A Place Kept Open in ${seed.cityName}` : `First Steps in ${seed.cityName}`
  const place = seed.placeLine.trim()
  const host = seed.host.name
  const practicalNext = activityDestination(seed.practical)
  const discoveryNext = activityDestination(seed.discovery)
  const hostNext = destination(seed, `Speak with ${host} at ${seed.host.venueName}`)
  const introProof = 'local-conversation'
  const practicalProof = 'local-practical'
  const discoveryProof = 'local-discovery'
  const choices: EpisodeChoiceDefinition[] = [
    {
      id: 'work', title: 'Make a practical contribution',
      description: `Complete ${seed.practical.label}, then bring one useful detail back to ${host}.`,
      proof: practicalProof, proofNext: practicalNext,
      missingProof: `Complete ${seed.practical.label}, then return to ${host}.`,
      requiresStudent: false, studentRefusal: '', callbackSpot: 'people', callbackSpeaker: host,
      callbackText: second
        ? `${host}: A good handover says what was done and leaves the next step clear.`
        : `${host}: A small contribution is easier to share when the next step is clear.`,
      savedMessage: `${host} has a practical follow-up for you.`, outcomeTag: 'local-care',
      returnRecap: {
        callbackPending: `${host} saved your practical route. The handover conversation is waiting.`,
        finaleReady: `${host} remembers your practical contribution. The local visit is ready.`,
      },
    },
    {
      id: 'study', title: 'Explore carefully',
      description: `Try ${seed.discovery.label} and notice what makes this place easier to understand.`,
      proof: discoveryProof, proofNext: discoveryNext,
      missingProof: `Complete ${seed.discovery.label}, then return to ${host}.`,
      requiresStudent: false, studentRefusal: '', callbackSpot: 'people', callbackSpeaker: host,
      callbackText: second
        ? `${host}: The route is useful when you can point out one clear next step.`
        : `${host}: What did you notice that could help someone find their own next step?`,
      savedMessage: `${host} has a follow-up about the route you explored.`, outcomeTag: 'local-curiosity',
      returnRecap: {
        callbackPending: `${host} remembers the route you explored. Share what you noticed.`,
        finaleReady: `${host} remembers your careful exploration. The local visit is ready.`,
      },
    },
    {
      id: 'help', title: 'Make room for someone else',
      description: `Speak with ${host}, or prepare a welcome note after ${seed.practical.label}. You can finish while the host is away.`,
      proof: introProof, alternativeProof: practicalProof, proofNext: practicalNext,
      missingProof: `Speak with ${host} again, or complete ${seed.practical.label} to prepare a welcome note. Then return here.`,
      requiresStudent: false, studentRefusal: '', callbackSpot: 'people', callbackSpeaker: host,
      callbackText: second
        ? `${host}: A welcome works best when you listen before offering a route.`
        : `${host}: Someone may need a place to begin. Ask what would make it easier.`,
      savedMessage: `${host} has a welcoming follow-up for you.`, outcomeTag: 'local-welcome',
      returnRecap: {
        callbackPending: `${host} remembers that you made room. A short conversation is waiting.`,
        finaleReady: `${host} remembers the welcome you offered. The local visit is ready.`,
      },
    },
  ] as const

  const challenges: EpisodeDefinition['challenges'] = second ? {
    work: {
      prompt: 'A new visitor asks what happened while they were away. What makes the handover useful?',
      options: [
        { id: 'local-work-check', label: 'State what changed and point to the next step.' },
        { id: 'local-work-rush', label: 'Rush through every detail at once.' },
        { id: 'local-work-assume', label: 'Assume they already know what to do.' },
      ],
      correct: 'local-work-check', retry: 'Leave a clear update and a next step for the returning visitor.',
    },
    study: {
      prompt: 'You found a useful route. What should you share with someone who has not tried it?',
      options: [
        { id: 'local-study-notice', label: 'Name one detail and let them decide where to go next.' },
        { id: 'local-study-guess', label: 'Guess which part they will prefer.' },
        { id: 'local-study-skip', label: 'Keep the route to yourself.' },
      ],
      correct: 'local-study-notice', retry: 'Share what you actually noticed, then leave the choice with them.',
    },
    help: {
      prompt: 'A visitor pauses before joining in. What is a considerate first response?',
      options: [
        { id: 'local-help-listen', label: 'Ask what would help and listen to the answer.' },
        { id: 'local-help-push', label: 'Choose for them and hurry them along.' },
        { id: 'local-help-ignore', label: 'Leave them to work it out alone.' },
      ],
      correct: 'local-help-listen', retry: 'Offer help without taking the visitor’s choice away.',
    },
  } as const : {
    work: {
      prompt: 'The host asks how to make a first contribution useful to the next person. What do you do?',
      options: [
        { id: 'local-work-check', label: 'Check the result and explain the next step.' },
        { id: 'local-work-rush', label: 'Finish quickly and leave without a note.' },
        { id: 'local-work-assume', label: 'Assume someone else will explain it.' },
      ],
      correct: 'local-work-check', retry: 'Check the result and leave the next step clear.',
    },
    study: {
      prompt: 'You tried something new. What makes your discovery useful to another visitor?',
      options: [
        { id: 'local-study-notice', label: 'Share one detail you actually noticed.' },
        { id: 'local-study-guess', label: 'Guess what the place might be like.' },
        { id: 'local-study-skip', label: 'Skip the details and move on.' },
      ],
      correct: 'local-study-notice', retry: 'Share an observed detail instead of guessing.',
    },
    help: {
      prompt: 'Someone is unsure where to begin. What is a welcoming response?',
      options: [
        { id: 'local-help-listen', label: 'Ask what they need and listen first.' },
        { id: 'local-help-push', label: 'Push them toward the first option you see.' },
        { id: 'local-help-ignore', label: 'Leave them to find their own way.' },
      ],
      correct: 'local-help-listen', retry: 'Ask first, then let the visitor choose.',
    },
  }

  return {
    id,
    version: 1,
    title,
    location: { city: seed.cityId, venue: seed.host.venue, name: seed.cityName },
    prerequisite: second ? {
      episodeId: earlierId,
      refusal: `Complete First Steps in ${seed.cityName} before beginning this return story.`,
    } : null,
    observations: [
      { event: 'npc.interacted', source: introProof, npcId: seed.host.id },
      { event: 'activity.completed', source: practicalProof, activityId: seed.practical.id, venue: seed.practical.venue, spot: seed.practical.spot },
      { event: 'activity.completed', source: discoveryProof, activityId: seed.discovery.id, venue: seed.discovery.venue, spot: seed.discovery.spot },
    ],
    intro: {
      proof: introProof,
      npcId: seed.host.id,
      alternativeProof: practicalProof,
      proofNext: practicalNext,
      missingProof: `Speak with ${host} at ${seed.host.venueName}, or complete ${seed.practical.label} and return here to read the welcome note.`,
      completeMessage: second
        ? `${host} kept your first note. Make the next step easy to find, whether you meet now or leave a handover.`
        : `${host} left you a welcome note. Choose how you would like to get to know this place.`,
    },
    chapters: second ? [
      { chapter: 1, title: 'Return to the place', speaker: host, text: `${host} has kept your first note. Another visitor is due, and the route needs a clear handover. ${place} What would you leave ready for them?`, destination: destination(seed, `Meet ${host} at ${seed.host.venueName}`) },
      { chapter: 2, title: 'What remains useful', speaker: host, text: 'A practical contribution, a careful discovery, or a thoughtful welcome can each help someone continue. Which will you bring back?', destination: destination(seed, `Choose a route with ${host}`) },
      { chapter: 3, title: 'The handover', speaker: host, text: 'The choice is remembered. Now decide what to tell the next visitor.', destination: destination(seed, `Return to ${host}`) },
      { chapter: 4, title: 'Keep the way open', speaker: host, text: 'Leave the next step easy to find, then finish with one more local activity or the quiet support route.', destination: destination(seed, `Finish with ${host}`) },
    ] : [
      { chapter: 1, title: 'A place to begin', speaker: host, text: `${host} is putting together a welcome card at ${seed.host.venueName}. There is room for one more recommendation. ${place} Bring back something you tried, or help make the welcome easier.`, destination: destination(seed, `Meet ${host} at ${seed.host.venueName}`) },
      { chapter: 2, title: 'Find your first route', speaker: host, text: 'You can make a practical contribution, explore carefully, or make room for someone else. Which feels like a good first step?', destination: destination(seed, `Choose a route with ${host}`) },
      { chapter: 3, title: 'Share what you learned', speaker: host, text: 'Your choice gives the conversation a direction. Choose a response that leaves another person able to continue.', destination: destination(seed, `Return to ${host}`) },
      { chapter: 4, title: 'A first visit remembered', speaker: host, text: 'Complete one more local activity, or finish with the quiet support route. Your first steps are now part of your city record.', destination: destination(seed, `Finish with ${host}`) },
    ],
    choices,
    challenges,
    finale: {
      routes: [
        {
          id: 'local-visit', title: 'Complete one more local activity',
          description: `Complete ${seed.discovery.label}, then return to ${host}.`,
          proof: discoveryProof, missingProof: `Complete ${seed.discovery.label} before finishing.`, proofNext: discoveryNext,
        },
        {
          id: 'quiet-support', title: 'Finish with quiet support',
          description: 'Use the response you already proved. This route works for a solo player.',
          proof: 'quiet-support', missingProof: null,
        },
      ],
      invalidRoute: 'Choose the local activity or quiet support route.',
      notReady: `Resolve ${host}’s remembered-choice question before finishing.`,
      closingLine: second
        ? 'The handover is clear, and the next visitor can choose their own way in.'
        : 'Your first route is saved, with room for someone else to begin.',
    },
    recap: {
      completed: `${title} is complete. Your keepsake and the route you chose remain in your passport.`,
      introduced: `${host} remembers your introduction. Choose what you will do next.`,
    },
    memento: {
      id: `${id}-memento`,
      title: second ? `${seed.cityName} Return Note` : `${seed.cityName} First Steps Note`,
      description: `A keepsake from ${host} at ${seed.host.venueName}, recording the part you played in ${title}.`,
      icon: second ? '🗺️' : '📍',
      rewardId: `episode:${id}:v1:memento`,
    },
  }
}

/** Two finite fictional stories grounded only in the reviewed content references supplied by the city seed. */
export function worldEpisodes(seed: WorldStorySeed): readonly EpisodeDefinition[] {
  return [episode(seed, false), episode(seed, true)]
}
