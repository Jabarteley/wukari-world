import type {
  EpisodeChoice, EpisodeDefinition, EpisodeId, EpisodeOutcomeTag,
} from '../../types/episodes.ts'

export const HOSTEL_HUSTLE_ID = 'hostel-hustle' as const satisfies EpisodeId
export const HOSTEL_HUSTLE_VERSION = 1 as const
export const HOSTEL_HUSTLE_REWARD_ID = 'episode:v1:hostel-hustle:memento' as const
export const THE_QUIET_HOURS_ID = 'the-quiet-hours' as const satisfies EpisodeId
export const THE_QUIET_HOURS_VERSION = 1 as const
export const THE_QUIET_HOURS_REWARD_ID = 'episode:v1:the-quiet-hours:memento' as const

export const HOSTEL_HUSTLE: EpisodeDefinition<'hostel-hustle'> = {
  id: HOSTEL_HUSTLE_ID,
  version: HOSTEL_HUSTLE_VERSION,
  title: 'Hostel Hustle',
  location: { city: 'lagos', venue: 'unilag' },
  prerequisite: null,
  observations: [
    { event: 'npc.interacted', source: 'kola-interaction', npcId: 'kola-union' },
    { event: 'activity.completed', source: 'library-study', activityId: 'read-library', spot: 'library' },
    { event: 'campus.job.completed', source: 'campus-job', jobIds: ['library-assistant', 'lab-assistant', 'tutor'], requirePositivePay: true },
    { event: 'table.played', source: 'union-whot', game: 'whot', spot: 'student-union' },
    { event: 'event.attended', source: 'campus-event', venueId: 'unilag', spot: 'student-union' },
  ],
  intro: {
    proof: 'kola-interaction',
    npcId: 'kola-union',
    proofNext: { venue: 'unilag', spot: 'people', label: 'Meet Kola in People' },
    missingProof: 'Choose People at UNILAG and say hello to Kola, then return to Student Union.',
    completeMessage: 'Kola saved you a place. Choose what you will bring to games evening.',
  },
  chapters: [
    {
      chapter: 1,
      title: 'Main Gate, one room left',
      speaker: 'Kola',
      text: 'You made it to Akoka. The Union table is noisy, but there is always space for one more. Aunty Ngozi says the cafeteria queue is moving, and Bisi says the library has a quiet corner.',
      destination: { venue: 'unilag', spot: 'student-union', label: 'Meet Kola at Student Union' },
    },
    {
      chapter: 2,
      title: 'The approach',
      speaker: 'Kola',
      text: 'The games evening is tomorrow. We need somebody who can carry a shift, somebody who can learn the difficult bit, and somebody who will notice who has been left out. What do you bring?',
      destination: { venue: 'unilag', spot: 'student-union', label: 'Choose an approach at Student Union' },
    },
    {
      chapter: 3,
      title: 'The callback',
      speaker: 'Kola and Bisi',
      text: 'Kola remembered what you picked. Use it now to leave a path for the next person.',
      destination: { venue: 'unilag', spot: 'student-union', label: 'Return for the callback' },
    },
    {
      chapter: 4,
      title: 'Union games evening',
      speaker: 'Seun and Kola',
      text: 'Sound check is nearly done. Save a seat near the front. You came back. That counts.',
      destination: { venue: 'unilag', spot: 'student-union', label: 'Finish at Student Union' },
    },
  ],
  choices: [
    {
      id: 'work',
      title: 'Carry a shift',
      description: 'Finish a UNILAG library, lab or tutor job, then bring that steady hand back.',
      proof: 'campus-job',
      proofNext: { venue: 'unilag', spot: 'library', label: 'Go to campus jobs' },
      missingProof: 'Finish a UNILAG library, lab or tutor job, then return to Kola at Student Union.',
      requiresStudent: false,
      studentRefusal: 'Settle in before using this student route, or choose Help as a guest.',
      callbackSpot: 'student-union',
      callbackSpeaker: 'Kola',
      callbackText: 'Kola: I remembered what you picked. The work route needs a calm hand at the desk.',
      savedMessage: 'Kola has a role ready for you at Student Union.',
      outcomeTag: 'steady-hand',
      returnRecap: {
        callbackPending: 'Kola kept the Union table open. You chose the work route, and his handover question is waiting.',
        finaleReady: 'Kola kept the Union table open. Your steady hand is still helping. Games evening is ready.',
      },
    },
    {
      id: 'study',
      title: 'Learn the difficult bit',
      description: 'Complete Read and practise coding at the Library, then help Bisi explain the stubborn part.',
      proof: 'library-study',
      proofNext: { venue: 'unilag', spot: 'library', label: 'Read at the Library' },
      missingProof: 'Finish Read and practise coding at the Library, then return to Kola at Student Union.',
      requiresStudent: true,
      studentRefusal: 'Settle in and matriculate for Study, or choose Help as a guest.',
      callbackSpot: 'library',
      callbackSpeaker: 'Bisi',
      callbackText: 'Bisi: You did not just finish your own task. Show the first step and leave a path for the next person.',
      savedMessage: 'Bisi has a question for you at the Library.',
      outcomeTag: 'clear-explanation',
      returnRecap: {
        callbackPending: 'Kola kept the Union table open. You chose the study route, and Bisi’s question is waiting.',
        finaleReady: 'Kola kept the Union table open. Your clear explanation is still helping. Games evening is ready.',
      },
    },
    {
      id: 'help',
      title: 'Notice who is left out',
      description: 'Meet Kola again after the introduction. Guests and solo players can help too.',
      proof: 'kola-interaction',
      proofNext: { venue: 'unilag', spot: 'people', label: 'Speak with Kola' },
      missingProof: 'Choose People at UNILAG and speak with Kola again after the introduction, then return to Student Union.',
      requiresStudent: false,
      studentRefusal: 'Help remains available to guests.',
      callbackSpot: 'student-union',
      callbackSpeaker: 'Kola',
      callbackText: 'Kola: I remembered what you picked. The help route needs somebody to make room for the shy people.',
      savedMessage: 'Kola has a role ready for you at Student Union.',
      outcomeTag: 'made-room',
      returnRecap: {
        callbackPending: 'Kola kept the Union table open. You chose the help route, and his welcome question is waiting.',
        finaleReady: 'Kola kept the Union table open. The room you made is still helping. Games evening is ready.',
      },
    },
  ],
  challenges: {
    work: {
      prompt: 'The desk gets crowded just before games evening. What keeps the handover calm?',
      options: [
        { id: 'work-rush-first', label: 'Rush the first request and remember the rest later.' },
        { id: 'work-check-list', label: 'Check each request, mark it down, then hand over clearly.' },
        { id: 'work-ask-everyone', label: 'Ask everyone to solve the queue together.' },
      ],
      correct: 'work-check-list',
      retry: 'That would leave the next person stuck. Try the option that gives them a clear handover.',
    },
    study: {
      prompt: 'Bisi asks how to help somebody stuck on the difficult bit. What do you do?',
      options: [
        { id: 'study-give-answer', label: 'Give them the final answer so they can move on.' },
        { id: 'study-show-first-step', label: 'Show the first step, then let them try the next one.' },
        { id: 'study-change-topic', label: 'Change the topic to something easier.' },
      ],
      correct: 'study-show-first-step',
      retry: 'That would leave the learner stuck. Try the option that shows a clear first step.',
    },
    help: {
      prompt: 'A shy visitor reaches the noisy Union table. How do you make room?',
      options: [
        { id: 'help-fill-front-row', label: 'Fill the front row before anybody else arrives.' },
        { id: 'help-hold-quiet-seat', label: 'Keep a quiet seat open and introduce them when they are ready.' },
        { id: 'help-close-door', label: 'Close the door until the games have started.' },
      ],
      correct: 'help-hold-quiet-seat',
      retry: 'That would leave the visitor outside. Try the option that makes room without putting them on the spot.',
    },
  },
  finale: {
    routes: [
      {
        id: 'union-table', title: 'Take a Union table seat',
        description: 'Finish a counted Whot game at UNILAG, then close the episode at Student Union.',
        proof: 'union-whot',
        missingProof: 'Finish a counted Whot game while you are at UNILAG, then return to Student Union. You can choose Quiet support if no table is available.',
        proofNext: { venue: 'unilag', spot: 'student-union', label: 'Play Whot at Student Union' },
      },
      {
        id: 'campus-event', title: 'Join the campus event',
        description: 'Complete an activity during a live UNILAG event, then close the episode at Student Union.',
        proof: 'campus-event',
        missingProof: 'Complete an activity during a live UNILAG event, then return to Student Union. You can choose Quiet support if no event is live.',
        proofNext: { venue: 'unilag', spot: 'student-union', label: 'Join a campus event' },
      },
      {
        id: 'quiet-support', title: 'Take the quiet support role',
        description: 'Use the Chapter 3 outcome you already proved. You can finish even when nobody else is around.',
        proof: 'quiet-support', missingProof: null,
      },
    ],
    invalidRoute: 'Choose a Union table, the campus event, or the quiet support role.',
    notReady: 'Resolve Kola or Bisi’s callback before games evening.',
    closingLine: 'Whatever you brought, somebody else can use it now.',
  },
  recap: {
    completed: 'Kola kept your Union token safe. Hostel Hustle is complete, and the keepsake is still in your passport.',
    introduced: 'Kola kept the Union table open. Your introduction is saved; choose what you will bring next.',
  },
  memento: {
    id: 'hostel-hustle-memento',
    title: 'Hostel Hustle keepsake',
    description: 'A small Union table token from Kola, kept in your passport and available for a home display.',
    icon: '🎟️',
    rewardId: HOSTEL_HUSTLE_REWARD_ID,
  },
}

export const THE_QUIET_HOURS: EpisodeDefinition<'the-quiet-hours'> = {
  id: THE_QUIET_HOURS_ID,
  version: THE_QUIET_HOURS_VERSION,
  title: 'The Quiet Hours',
  location: { city: 'lagos', venue: 'unilag' },
  prerequisite: {
    episodeId: HOSTEL_HUSTLE_ID,
    refusal: 'Complete Hostel Hustle first. Bisi’s late-library invitation follows the Union games evening.',
  },
  observations: [
    { event: 'npc.interacted', source: 'bisi-interaction', npcId: 'bisi-reader' },
    { event: 'activity.completed', source: 'library-study', activityId: 'read-library', spot: 'library' },
    { event: 'campus.job.completed', source: 'campus-job', jobIds: ['library-assistant', 'lab-assistant', 'tutor'], requirePositivePay: true },
  ],
  intro: {
    proof: 'bisi-interaction',
    npcId: 'bisi-reader',
    proofNext: { venue: 'unilag', spot: 'people', label: 'Meet Bisi in People' },
    missingProof: 'Choose People at UNILAG and say hello to Bisi, then return to the Library.',
    completeMessage: 'Bisi kept the corner open. Choose how you will help before the last lamp goes out.',
  },
  chapters: [
    {
      chapter: 1,
      title: 'One lamp still on',
      speaker: 'Bisi',
      text: 'The games evening is over, but one library corner is still awake. Bisi has a loose trolley wheel, a difficult page, and a tired visitor who needs somewhere quiet.',
      destination: { venue: 'unilag', spot: 'library', label: 'Meet Bisi at the Library' },
    },
    {
      chapter: 2,
      title: 'What the corner needs',
      speaker: 'Bisi',
      text: 'We can fix the practical snag, coach the difficult step, or welcome the person who does not want a crowd. Which part will you hold?',
      destination: { venue: 'unilag', spot: 'library', label: 'Choose a role at the Library' },
    },
    {
      chapter: 3,
      title: 'The note in the margin',
      speaker: 'Bisi',
      text: 'Bisi remembers the role you chose. One small decision will show whether the next person can keep going.',
      destination: { venue: 'unilag', spot: 'library', label: 'Return to Bisi at the Library' },
    },
    {
      chapter: 4,
      title: 'The last lamp',
      speaker: 'Bisi',
      text: 'The trolley is still, the page is marked, and the quiet chair is ready. Finish with one useful library act or leave the welcome prepared for morning.',
      destination: { venue: 'unilag', spot: 'library', label: 'Finish at the Library' },
    },
  ],
  choices: [
    {
      id: 'work',
      title: 'Fix the practical snag',
      description: 'Finish a UNILAG library, lab or tutor job, then bring the careful handover back to Bisi.',
      proof: 'campus-job',
      proofNext: { venue: 'unilag', spot: 'library', label: 'Go to campus jobs' },
      missingProof: 'Finish a UNILAG library, lab or tutor job, then return to Bisi at the Library.',
      requiresStudent: false,
      studentRefusal: 'Settle in before using this student route, or choose Help as a guest.',
      callbackSpot: 'library',
      callbackSpeaker: 'Bisi',
      callbackText: 'Bisi: You chose the practical snag. A quick fix only helps if the next person can trust it.',
      savedMessage: 'Bisi has a handover question for you at the Library.',
      outcomeTag: 'careful-fix',
      returnRecap: {
        callbackPending: 'Bisi kept the last lamp on. You chose the work route, and the trolley handover is waiting.',
        finaleReady: 'Bisi kept the last lamp on. Your careful fix still holds. The quiet corner is ready to close.',
      },
    },
    {
      id: 'study',
      title: 'Coach the difficult step',
      description: 'Finish Read and practise coding at the Library, then help Bisi leave a useful learning note.',
      proof: 'library-study',
      proofNext: { venue: 'unilag', spot: 'library', label: 'Read at the Library' },
      missingProof: 'Finish Read and practise coding at the Library, then return to Bisi there.',
      requiresStudent: true,
      studentRefusal: 'Settle in and matriculate for Study, or choose Help as a guest.',
      callbackSpot: 'library',
      callbackSpeaker: 'Bisi',
      callbackText: 'Bisi: You chose to coach the difficult step. The note should help without taking the work away.',
      savedMessage: 'Bisi has a margin-note question for you at the Library.',
      outcomeTag: 'patient-coach',
      returnRecap: {
        callbackPending: 'Bisi kept the last lamp on. You chose the study route, and the margin-note question is waiting.',
        finaleReady: 'Bisi kept the last lamp on. Your patient coaching is still helping. The quiet corner is ready to close.',
      },
    },
    {
      id: 'help',
      title: 'Welcome without a crowd',
      description: 'Speak with Bisi again and prepare a quiet seat. This route is free and works for guests playing solo.',
      proof: 'bisi-interaction',
      proofNext: { venue: 'unilag', spot: 'people', label: 'Speak with Bisi' },
      missingProof: 'Choose People at UNILAG and speak with Bisi again after the introduction, then return to the Library.',
      requiresStudent: false,
      studentRefusal: 'Help remains free and available to guests.',
      callbackSpot: 'library',
      callbackSpeaker: 'Bisi',
      callbackText: 'Bisi: You chose the quiet welcome. Make the corner easy to enter without turning the visitor into an announcement.',
      savedMessage: 'Bisi has a welcome question for you at the Library.',
      outcomeTag: 'quiet-welcome',
      returnRecap: {
        callbackPending: 'Bisi kept the last lamp on. You chose the help route, and the quiet-welcome question is waiting.',
        finaleReady: 'Bisi kept the last lamp on. Your quiet welcome still leaves room. The corner is ready to close.',
      },
    },
  ],
  challenges: {
    work: {
      prompt: 'The trolley wheel stops rattling, but the next volunteer needs to know what changed. What do you leave?',
      options: [
        { id: 'quiet-work-move-all', label: 'Move every trolley and let the next volunteer work out why.' },
        { id: 'quiet-work-check-one', label: 'Check the repaired wheel once, then leave a short handover note.' },
        { id: 'quiet-work-ignore-rattle', label: 'Ignore the rattle until the morning shift arrives.' },
      ],
      correct: 'quiet-work-check-one',
      retry: 'That leaves the morning volunteer guessing. Choose the response that checks the fix and explains it.',
    },
    study: {
      prompt: 'A reader is stuck on the same step you practised. What belongs in the margin note?',
      options: [
        { id: 'quiet-study-solve-it', label: 'Write the final answer so nobody has to pause.' },
        { id: 'quiet-study-ask-first', label: 'Write one guiding question and the first step, then leave room to try.' },
        { id: 'quiet-study-copy-notes', label: 'Copy every note onto the page, whether it helps or not.' },
      ],
      correct: 'quiet-study-ask-first',
      retry: 'That takes the difficult step away instead of teaching it. Leave a question and a first step.',
    },
    help: {
      prompt: 'A tired visitor pauses at the library door and does not want attention. How do you welcome them?',
      options: [
        { id: 'quiet-help-call-room', label: 'Call across the room so everybody knows a visitor arrived.' },
        { id: 'quiet-help-offer-corner', label: 'Point out the quiet corner and let them settle before you introduce yourself.' },
        { id: 'quiet-help-leave-alone', label: 'Turn away so they have to find a place without help.' },
      ],
      correct: 'quiet-help-offer-corner',
      retry: 'That either puts the visitor on display or leaves them stranded. Offer the quiet corner without a crowd.',
    },
  },
  finale: {
    routes: [
      {
        id: 'library-session', title: 'Test the quiet corner',
        description: 'Complete Read and practise coding at the Library, then close the episode with Bisi.',
        proof: 'library-study',
        missingProof: 'Finish Read and practise coding at the Library once more. You can choose Leave the welcome ready for the solo path.',
        proofNext: { venue: 'unilag', spot: 'library', label: 'Read at the Library' },
      },
      {
        id: 'quiet-help', title: 'Leave the welcome ready',
        description: 'Use the Chapter 3 outcome you already proved. Guests and solo players can finish without a live friend, table, event, model or payment.',
        proof: 'quiet-help', missingProof: null,
      },
    ],
    invalidRoute: 'Choose a final library session or leave the quiet welcome ready.',
    notReady: 'Resolve Bisi’s remembered-choice challenge before closing the Library corner.',
    closingLine: 'Quiet work still leaves a mark. The next reader will find the corner ready.',
  },
  recap: {
    completed: 'Bisi kept your bookmark safe. The Quiet Hours is complete, and the Library corner still remembers your role.',
    introduced: 'Bisi kept the last lamp on. Your introduction is saved; choose what the quiet corner needs next.',
  },
  memento: {
    id: 'the-quiet-hours-memento',
    title: 'Quiet Hours bookmark',
    description: 'A pressed-paper bookmark from Bisi, kept in your passport and available for a home display.',
    icon: '🔖',
    rewardId: THE_QUIET_HOURS_REWARD_ID,
  },
}

export const EPISODES: readonly EpisodeDefinition[] = [HOSTEL_HUSTLE, THE_QUIET_HOURS]

const STABLE_ID = /^[a-z][a-z0-9]*(?:-[a-z0-9]+)*$/

export function validateEpisodeCatalogue(catalogue: readonly EpisodeDefinition[]): string[] {
  const errors: string[] = []
  const episodeIds = new Set<string>()
  const mementoIds = new Set<string>()
  const rewardIds = new Set<string>()

  for (const [index, episode] of catalogue.entries()) {
    const prefix = `episode[${index}]`
    if (!STABLE_ID.test(episode.id)) errors.push(`${prefix}: unstable episode id ${episode.id}`)
    if (episodeIds.has(episode.id)) errors.push(`${prefix}: duplicate episode id ${episode.id}`)
    if (!STABLE_ID.test(episode.location.city) || !STABLE_ID.test(episode.location.venue)) errors.push(`${prefix}: city and venue must be stable ids`)
    if (!STABLE_ID.test(episode.memento.id)) errors.push(`${prefix}: unstable memento id ${episode.memento.id}`)
    if (mementoIds.has(episode.memento.id)) errors.push(`${prefix}: duplicate memento id ${episode.memento.id}`)
    if (rewardIds.has(episode.memento.rewardId)) errors.push(`${prefix}: duplicate reward id ${episode.memento.rewardId}`)
    if (episode.prerequisite && !episodeIds.has(episode.prerequisite.episodeId)) {
      errors.push(`${prefix}: prerequisite ${episode.prerequisite.episodeId} must reference an earlier catalogue row`)
    }
    if (episode.chapters.length !== 4 || episode.chapters.some((chapter, at) => chapter.chapter !== at + 1)) {
      errors.push(`${prefix}: chapters must be exactly 1, 2, 3, 4`)
    }
    if (!episode.intro.npcId.trim() || !episode.choices.every(choice => choice.callbackSpeaker.trim())) {
      errors.push(`${prefix}: authored NPC ids and callback speakers must be non-empty`)
    }
    const observed = new Set<string>()
    for (const observation of episode.observations) {
      if (observed.has(observation.source)) errors.push(`${prefix}: duplicate observation source ${observation.source}`)
      observed.add(observation.source)
      if (observation.event === 'npc.interacted' && !STABLE_ID.test(observation.npcId)) errors.push(`${prefix}: unstable NPC id ${observation.npcId}`)
      if (observation.event === 'activity.completed' && (!STABLE_ID.test(observation.activityId) || !STABLE_ID.test(observation.spot))) errors.push(`${prefix}: unstable activity observation ids`)
      if (observation.event === 'campus.job.completed' && (!observation.jobIds.length || observation.jobIds.some(id => !STABLE_ID.test(id)))) errors.push(`${prefix}: invalid campus job observation ids`)
      if ((observation.event === 'table.played' || observation.event === 'event.attended') && !STABLE_ID.test(observation.spot)) errors.push(`${prefix}: unstable observed spot ${observation.spot}`)
    }
    if (!observed.has(episode.intro.proof)) errors.push(`${prefix}: intro proof ${episode.intro.proof} has no observation rule`)
    const introObservation = episode.observations.find(observation => observation.source === episode.intro.proof)
    if (introObservation?.event !== 'npc.interacted' || introObservation.npcId !== episode.intro.npcId) errors.push(`${prefix}: intro NPC does not match its observation rule`)
    for (const choice of episode.choices) if (!observed.has(choice.proof)) errors.push(`${prefix}: choice proof ${choice.proof} has no observation rule`)
    for (const route of episode.finale.routes) {
      if (route.missingProof !== null && !observed.has(route.proof)) errors.push(`${prefix}: finale proof ${route.proof} has no observation rule`)
    }

    const choices = new Set<string>()
    const answers = new Set<string>()
    for (const choice of episode.choices) {
      if (!STABLE_ID.test(choice.id) || choices.has(choice.id)) errors.push(`${prefix}: invalid or duplicate choice ${choice.id}`)
      choices.add(choice.id)
      const challenge = episode.challenges[choice.id]
      const visible = new Set<string>()
      for (const option of challenge.options) {
        if (!STABLE_ID.test(option.id) || visible.has(option.id) || answers.has(option.id)) errors.push(`${prefix}: invalid or duplicate answer ${option.id}`)
        visible.add(option.id)
        answers.add(option.id)
      }
      if (!visible.has(challenge.correct)) errors.push(`${prefix}: answer ${challenge.correct} is not a visible ${choice.id} option`)
    }

    const routes = new Set<string>()
    for (const route of episode.finale.routes) {
      if (!STABLE_ID.test(route.id) || routes.has(route.id)) errors.push(`${prefix}: invalid or duplicate finale route ${route.id}`)
      routes.add(route.id)
    }
    episodeIds.add(episode.id)
    mementoIds.add(episode.memento.id)
    rewardIds.add(episode.memento.rewardId)
  }
  return errors
}

const catalogueErrors = validateEpisodeCatalogue(EPISODES)
if (catalogueErrors.length) throw new TypeError(`Invalid episode catalogue: ${catalogueErrors.join('; ')}`)

export const episodeById = (id: unknown): EpisodeDefinition | null =>
  typeof id === 'string' ? EPISODES.find(episode => episode.id === id) ?? null : null

export const choiceFor = (episode: EpisodeDefinition, choice: unknown) =>
  typeof choice === 'string' ? episode.choices.find(row => row.id === choice) ?? null : null

export function outcomeFor(episode: EpisodeDefinition, choice: EpisodeChoice): EpisodeOutcomeTag {
  const definition = choiceFor(episode, choice)
  if (!definition) throw new TypeError(`${episode.id} has no ${choice} choice`)
  return definition.outcomeTag
}
