import type {
  EpisodeAgentOrigin, EpisodeAssistanceKind, EpisodeAssistanceReceipt, EpisodeChapter, EpisodeChapterReceipt,
  EpisodeChoice, EpisodeChoiceDefinition, EpisodeDefinition, EpisodeFinaleRouteDefinition, EpisodeHistoryRow,
  EpisodeId, EpisodeMementoReceipt, EpisodeObservedProof, EpisodeObservedProofSource, EpisodeOptionView,
  EpisodeOutcomeTag, EpisodeProofObservation, EpisodeProofSource, EpisodeRun, EpisodesSlice, EpisodesView,
} from '../../types/episodes.ts'
import type { ExecutionOrigin } from '../../types/progression.ts'
import type { LifeContext, LifeState, SystemDefinition } from '../../types/index.ts'
import { choiceFor, episodesForCity, episodeById, episodeByMemento, outcomeFor } from '../content/episodes.ts'
import { LEFT_OUT, PLAYS } from '../profile.ts'
import { emit, isDeparting } from '../registry.ts'
import { fail, isRecord, ok } from '../util.ts'

type EpisodeLife = LifeState & EpisodesSlice

const OBSERVATION_LIMIT = 16
const ASSISTANCE_LIMIT = 8
const RETURN_RECAP_MS = 24 * 60 * 60 * 1000
const ORIGINS: readonly ExecutionOrigin[] = ['human', 'delegated-agent', 'agent-character', 'system', 'unknown']
const OBSERVED_SOURCES: readonly EpisodeObservedProofSource[] = [
  'kola-interaction', 'bisi-interaction', 'campus-job', 'library-study', 'union-whot', 'campus-event',
  'local-conversation', 'local-practical', 'local-discovery',
]
const PROOF_SOURCES: readonly EpisodeProofSource[] = [...OBSERVED_SOURCES, 'authored-challenge', 'quiet-support', 'quiet-help']
const CHOICES: readonly EpisodeChoice[] = ['work', 'study', 'help']
const ASSISTANCE_KINDS: readonly EpisodeAssistanceKind[] = ['authored-dialogue', 'supported-role']

const isChoice = (value: unknown): value is EpisodeChoice => typeof value === 'string' && CHOICES.some(choice => choice === value)
const isAssistanceKind = (value: unknown): value is EpisodeAssistanceKind => typeof value === 'string' && ASSISTANCE_KINDS.some(kind => kind === value)
const isOrigin = (value: unknown): value is ExecutionOrigin => typeof value === 'string' && ORIGINS.some(origin => origin === value)
const isAgentOrigin = (value: ExecutionOrigin): value is EpisodeAgentOrigin => value === 'delegated-agent' || value === 'agent-character'
const isAgentOriginValue = (value: unknown): value is EpisodeAgentOrigin => value === 'delegated-agent' || value === 'agent-character'
const isObservedSource = (value: unknown): value is EpisodeObservedProofSource => typeof value === 'string' && OBSERVED_SOURCES.some(source => source === value)
const isProofSource = (value: unknown): value is EpisodeProofSource => typeof value === 'string' && PROOF_SOURCES.some(source => source === value)
const isChapter = (value: unknown): value is EpisodeChapter => value === 1 || value === 2 || value === 3 || value === 4
const isReference = (value: unknown): value is string => typeof value === 'string' && /^[a-zA-Z0-9][a-zA-Z0-9_.:+-]{0,159}$/.test(value)
const stamp = (value: unknown, now: number): value is number => typeof value === 'number' && Number.isSafeInteger(value) && value > 0 && value <= now
const originOf = (ctx: LifeContext): ExecutionOrigin => ctx.executionOrigin ?? 'unknown'
const referenceOf = (source: EpisodeProofSource, ctx: LifeContext): string => isReference(ctx.actionId) ? ctx.actionId : `${source}:${ctx.now}`

function definitionFor(id: unknown): EpisodeDefinition | null {
  return episodeById(id)
}

function chapterDefinition(episode: EpisodeDefinition, chapter: EpisodeChapter) {
  switch (chapter) {
    case 1: return episode.chapters[0]
    case 2: return episode.chapters[1]
    case 3: return episode.chapters[2]
    case 4: return episode.chapters[3]
    default: {
      const exhaustive: never = chapter
      return exhaustive
    }
  }
}

function atEpisodePlace(state: EpisodeLife, episode: EpisodeDefinition, spot: string, ctx: LifeContext): boolean {
  return ctx.cityId === episode.location.city && state.location === episode.location.venue && state.spot === spot && !isDeparting(state)
}

function prerequisiteMet(state: EpisodeLife, episode: EpisodeDefinition): boolean {
  if (!episode.prerequisite) return true
  const run = state.episodes.runs[episode.prerequisite.episodeId]
  return Boolean(run?.completedAt && run.receipts[4])
}

function requiredSpot(episode: EpisodeDefinition, run: EpisodeRun): string {
  if (run.chapter === 3 && run.choice) return choiceFor(episode, run.choice)?.callbackSpot ?? chapterDefinition(episode, 3).destination.spot
  return chapterDefinition(episode, run.chapter).destination.spot
}

function newRun(episode: EpisodeDefinition, now: number): EpisodeRun {
  return {
    id: episode.id, version: episode.version, chapter: 1, startedAt: now, lastSeenAt: now, choice: null, outcomeTags: [],
    receipts: {}, observations: [], assistance: [], completedAt: null, mementoGranted: false,
  }
}

function observedChapter(episode: EpisodeDefinition, source: EpisodeObservedProofSource, run: EpisodeRun): 1 | 2 | 4 | null {
  if (run.completedAt) return null
  if (run.chapter === 1 && (source === episode.intro.proof || source === episode.intro.alternativeProof)) return 1
  if (run.chapter === 2 && episode.choices.some(choice => choice.proof === source || choice.alternativeProof === source)) return 2
  if (run.chapter === 4 && episode.finale.routes.some(route => route.proof === source)) return 4
  return null
}

function observeProof(state: EpisodeLife, episode: EpisodeDefinition, source: EpisodeObservedProofSource, reference: string, ctx: LifeContext): void {
  if (state.story.helper) return
  let run = state.episodes.runs[episode.id]
  if (!run) {
    if ((source !== episode.intro.proof && source !== episode.intro.alternativeProof) || !prerequisiteMet(state, episode)) return
    run = newRun(episode, ctx.now)
    state.episodes.runs[episode.id] = run
  }
  const chapter = observedChapter(episode, source, run)
  if (!chapter) return
  if (run.observations.some(row => row.source === source && row.chapter === chapter && row.reference === reference)) return
  run.observations.push({ source, chapter, reference, observedAt: ctx.now, origin: originOf(ctx) })
  if (run.observations.length > OBSERVATION_LIMIT) run.observations.splice(0, run.observations.length - OBSERVATION_LIMIT)
  run.lastSeenAt = ctx.now
}

function atObservationPlace(state: EpisodeLife, episode: EpisodeDefinition, observation: EpisodeProofObservation, ctx: LifeContext): boolean {
  if (ctx.cityId !== episode.location.city || state.location !== ('venue' in observation && observation.venue ? observation.venue : episode.location.venue) || isDeparting(state)) return false
  return !('spot' in observation) || state.spot === observation.spot
}

function proofFor(run: EpisodeRun, source: EpisodeObservedProofSource, chapter: 1 | 2 | 4): EpisodeObservedProof | null {
  for (let at = run.observations.length - 1; at >= 0; at--) {
    const proof = run.observations[at]
    if (proof?.source === source && proof.chapter === chapter) return proof
  }
  return null
}

function saveReceipt(run: EpisodeRun, receipt: EpisodeChapterReceipt): void {
  switch (receipt.chapter) {
    case 1: run.receipts[1] = receipt; return
    case 2: run.receipts[2] = receipt; return
    case 3: run.receipts[3] = receipt; return
    case 4: run.receipts[4] = receipt; return
    default: {
      const exhaustive: never = receipt.chapter
      return exhaustive
    }
  }
}

function emitChapter(state: EpisodeLife, run: EpisodeRun, receipt: EpisodeChapterReceipt, ctx: LifeContext): void {
  emit(state, 'episode.chapter.completed', {
    id: run.id, version: run.version, chapter: receipt.chapter, choice: run.choice, source: receipt.source,
    origin: receipt.origin, completedAt: receipt.completedAt,
  }, ctx)
}

function episodeRun(state: EpisodeLife, episode: EpisodeDefinition): EpisodeRun | null {
  return state.episodes.runs[episode.id] ?? null
}

function wrongEpisode(state: EpisodeLife) {
  return fail(state, 'invalid_episode', 'Choose a known episode from My Story in this city.')
}

function wrongPlace(state: EpisodeLife, episode: EpisodeDefinition, spot: string) {
  const destination = episode.chapters.find(chapter => chapter.destination.spot === spot)?.destination
  const callback = episode.choices.find(choice => choice.callbackSpot === spot)
  const label = destination?.label ?? (callback ? `Meet ${callback.callbackSpeaker} at ${spot === 'library' ? 'the Library' : spot}.` : `Go to ${spot}.`)
  return fail(state, 'wrong_place', `${label} before continuing ${episode.title}.`)
}

function missingPrerequisite(state: EpisodeLife, episode: EpisodeDefinition) {
  return fail(state, 'missing_prerequisite', episode.prerequisite?.refusal ?? `${episode.title} is available.`)
}

function settledStudent(state: EpisodeLife): boolean {
  return state.unilagStudent.status === 'matriculated' || state.unilagStudent.status === 'studying'
}

function introduce(state: EpisodeLife, payload: Record<string, unknown>, ctx: LifeContext) {
  const episode = definitionFor(payload.id)
  if (!episode) return wrongEpisode(state)
  if (!prerequisiteMet(state, episode)) return missingPrerequisite(state, episode)
  const run = episodeRun(state, episode)
  if (run?.receipts[1]) return ok(state, 'already_introduced')
  if (!run) return fail(state, 'missing_proof', episode.intro.missingProof)
  if (run.chapter !== 1) return fail(state, 'wrong_chapter', `Finish the current ${episode.title} chapter before repeating the introduction.`)
  const spot = chapterDefinition(episode, 1).destination.spot
  if (!atEpisodePlace(state, episode, spot, ctx)) return wrongPlace(state, episode, spot)
  const proof = proofFor(run, episode.intro.proof, 1) ?? (episode.intro.alternativeProof ? proofFor(run, episode.intro.alternativeProof, 1) : null)
  if (!proof) return fail(state, 'missing_proof', episode.intro.missingProof)
  const receipt: EpisodeChapterReceipt = { chapter: 1, completedAt: ctx.now, source: proof.source, reference: proof.reference, origin: proof.origin }
  saveReceipt(run, receipt)
  run.chapter = 2
  run.lastSeenAt = ctx.now
  state.message = episode.intro.completeMessage
  emitChapter(state, run, receipt, ctx)
  return ok(state, 'introduced')
}

function choose(state: EpisodeLife, payload: Record<string, unknown>, ctx: LifeContext) {
  const episode = definitionFor(payload.id)
  if (!episode) return wrongEpisode(state)
  if (!prerequisiteMet(state, episode)) return missingPrerequisite(state, episode)
  const run = episodeRun(state, episode)
  if (!run) return fail(state, 'wrong_chapter', `Complete the ${episode.title} introduction before choosing an approach.`)
  if (!isChoice(payload.choice)) return fail(state, 'invalid_choice', 'Choose work, study or help.')
  const choice = choiceFor(episode, payload.choice)
  if (!choice) return fail(state, 'invalid_choice', 'Choose work, study or help.')
  if (run.receipts[2]) return run.choice === choice.id ? ok(state, 'choice_confirmed') : fail(state, 'choice_locked', `You chose ${run.choice}. ${choice.callbackSpeaker} will remember that route.`)
  if (run.chapter !== 2) return fail(state, 'wrong_chapter', `Finish the current ${episode.title} chapter before choosing an approach.`)
  const spot = chapterDefinition(episode, 2).destination.spot
  if (!atEpisodePlace(state, episode, spot, ctx)) return wrongPlace(state, episode, spot)
  if (choice.requiresStudent && !settledStudent(state)) return fail(state, 'student_required', choice.studentRefusal)
  const proof = proofFor(run, choice.proof, 2) ?? (choice.alternativeProof ? proofFor(run, choice.alternativeProof, 2) : null)
  if (!proof) return fail(state, 'missing_proof', choice.missingProof)
  run.choice = choice.id
  const receipt: EpisodeChapterReceipt = { chapter: 2, completedAt: ctx.now, source: proof.source, reference: proof.reference, origin: proof.origin }
  saveReceipt(run, receipt)
  run.chapter = 3
  run.lastSeenAt = ctx.now
  state.message = choice.savedMessage
  emitChapter(state, run, receipt, ctx)
  return ok(state, 'choice_saved')
}

function resolve(state: EpisodeLife, payload: Record<string, unknown>, ctx: LifeContext) {
  const episode = definitionFor(payload.id)
  if (!episode) return wrongEpisode(state)
  if (!prerequisiteMet(state, episode)) return missingPrerequisite(state, episode)
  const run = episodeRun(state, episode)
  if (!run?.choice) return fail(state, 'choice_missing', 'Choose and prove a Work, Study or Help approach first.')
  if (run.receipts[3]) return ok(state, 'already_resolved')
  if (run.chapter !== 3) return fail(state, 'wrong_chapter', `Finish the current ${episode.title} chapter before resolving the callback.`)
  const choice = choiceFor(episode, run.choice)
  if (!choice) return fail(state, 'choice_missing', 'Choose and prove a Work, Study or Help approach first.')
  const spot = choice.callbackSpot
  if (!atEpisodePlace(state, episode, spot, ctx)) return wrongPlace(state, episode, spot)
  const challenge = episode.challenges[run.choice]
  if (payload.answer !== challenge.correct || !challenge.options.some(option => option.id === payload.answer)) {
    return fail(state, 'invalid_answer', challenge.retry)
  }
  const tag = outcomeFor(episode, run.choice)
  run.outcomeTags = [tag]
  const receipt: EpisodeChapterReceipt = { chapter: 3, completedAt: ctx.now, source: 'authored-challenge', reference: challenge.correct, origin: originOf(ctx) }
  saveReceipt(run, receipt)
  run.chapter = 4
  run.lastSeenAt = ctx.now
  state.message = `${choice.callbackSpeaker} remembers: ${tag.replaceAll('-', ' ')}. ${chapterDefinition(episode, 4).title} is ready.`
  emitChapter(state, run, receipt, ctx)
  return ok(state, 'callback_resolved')
}

function observedFinaleSource(route: EpisodeFinaleRouteDefinition): EpisodeObservedProofSource | null {
  return isObservedSource(route.proof) ? route.proof : null
}

function finish(state: EpisodeLife, payload: Record<string, unknown>, ctx: LifeContext) {
  const episode = definitionFor(payload.id)
  if (!episode) return wrongEpisode(state)
  if (!prerequisiteMet(state, episode)) return missingPrerequisite(state, episode)
  const run = episodeRun(state, episode)
  if (!run) return fail(state, 'wrong_chapter', `Begin ${episode.title} before trying to finish it.`)
  if (run.receipts[4] && run.completedAt) return ok(state, 'already_completed')
  if (run.chapter !== 4 || !run.receipts[3] || !run.choice) return fail(state, 'wrong_chapter', episode.finale.notReady)
  const spot = chapterDefinition(episode, 4).destination.spot
  if (!atEpisodePlace(state, episode, spot, ctx)) return wrongPlace(state, episode, spot)
  const route = typeof payload.route === 'string' ? episode.finale.routes.find(row => row.id === payload.route) : undefined
  if (!route) return fail(state, 'invalid_route', episode.finale.invalidRoute)
  const tag = outcomeFor(episode, run.choice)
  const observedSource = observedFinaleSource(route)
  let source: EpisodeProofSource = route.proof
  let reference: string = tag
  let earnedOrigin = originOf(ctx)
  if (observedSource) {
    const proof = proofFor(run, observedSource, 4)
    if (!proof) return fail(state, 'missing_proof', route.missingProof ?? `Complete ${route.title} first.`)
    source = proof.source
    reference = proof.reference
    earnedOrigin = proof.origin
  }
  const receipt: EpisodeChapterReceipt = { chapter: 4, completedAt: ctx.now, source, reference, origin: earnedOrigin }
  saveReceipt(run, receipt)
  run.completedAt = ctx.now
  run.lastSeenAt = ctx.now
  const existing = state.episodes.mementos[episode.memento.id]
  if (!existing) {
    const origins = [...new Set([...Object.values(run.receipts).map(row => row?.origin).filter(isOrigin), ...run.assistance.map(row => row.origin)])]
    const memento: EpisodeMementoReceipt = {
      id: episode.memento.id, version: 1, episodeId: run.id, episodeVersion: run.version,
      grantedAt: ctx.now, origins, rewardId: episode.memento.rewardId,
    }
    state.episodes.mementos[memento.id] = memento
    emit(state, 'episode.memento.granted', { ...memento }, ctx)
  }
  run.mementoGranted = true
  state.message = `${episode.finale.closingLine} ${episode.memento.title} added to your passport.`
  emitChapter(state, run, receipt, ctx)
  emit(state, 'episode.completed', { id: run.id, version: run.version, choice: run.choice, outcomeTag: tag, completedAt: ctx.now, rewardId: episode.memento.rewardId }, ctx)
  return ok(state, 'completed')
}

function assist(state: EpisodeLife, payload: Record<string, unknown>, ctx: LifeContext) {
  const episode = definitionFor(payload.id)
  if (!episode) return wrongEpisode(state)
  if (!prerequisiteMet(state, episode)) return missingPrerequisite(state, episode)
  const run = episodeRun(state, episode)
  if (!run || run.completedAt) return fail(state, 'wrong_chapter', run?.completedAt ? `${episode.title} is already complete.` : `Finish the ${episode.title} introduction before recording assistance.`)
  if (!isAssistanceKind(payload.kind)) return fail(state, 'invalid_assistance', 'Record authored dialogue or a supported role.')
  if (!atEpisodePlace(state, episode, requiredSpot(episode, run), ctx)) return wrongPlace(state, episode, requiredSpot(episode, run))
  const origin = originOf(ctx)
  if (!isAgentOrigin(origin)) return fail(state, 'agent_origin_required', 'Assistance is recorded from an identified delegated agent or agent character. A person can continue directly.')
  if (run.assistance.some(row => row.kind === payload.kind && row.origin === origin && row.chapter === run.chapter)) return ok(state, 'already_recorded')
  run.assistance.push({ kind: payload.kind, origin, chapter: run.chapter, recordedAt: ctx.now })
  if (run.assistance.length > ASSISTANCE_LIMIT) run.assistance.splice(0, run.assistance.length - ASSISTANCE_LIMIT)
  run.lastSeenAt = ctx.now
  state.message = 'Assistance recorded. Game rules still require the chapter proof.'
  return ok(state, 'assistance_recorded')
}

function proofAllowed(episode: EpisodeDefinition, chapter: EpisodeChapter, source: EpisodeProofSource): boolean {
  if (chapter === 1) return source === episode.intro.proof || source === episode.intro.alternativeProof
  if (chapter === 2) return episode.choices.some(choice => choice.proof === source || choice.alternativeProof === source)
  if (chapter === 3) return source === 'authored-challenge'
  return episode.finale.routes.some(route => route.proof === source)
}

function sanitizeReceipt(value: unknown, chapter: EpisodeChapter, episode: EpisodeDefinition, now: number): EpisodeChapterReceipt | null {
  if (!isRecord(value) || value.chapter !== chapter || !stamp(value.completedAt, now) || !isProofSource(value.source)
    || !proofAllowed(episode, chapter, value.source) || !isReference(value.reference) || !isOrigin(value.origin)) return null
  return { chapter, completedAt: value.completedAt, source: value.source, reference: value.reference, origin: value.origin }
}

function sanitizeObservation(value: unknown, episode: EpisodeDefinition, now: number): EpisodeObservedProof | null {
  if (!isRecord(value) || !isObservedSource(value.source) || (value.chapter !== 1 && value.chapter !== 2 && value.chapter !== 4)
    || !proofAllowed(episode, value.chapter, value.source) || !isReference(value.reference) || !stamp(value.observedAt, now) || !isOrigin(value.origin)) return null
  return { source: value.source, chapter: value.chapter, reference: value.reference, observedAt: value.observedAt, origin: value.origin }
}

function sanitizeAssistance(value: unknown, now: number): EpisodeAssistanceReceipt | null {
  if (!isRecord(value) || !isAssistanceKind(value.kind) || !isAgentOriginValue(value.origin) || !isChapter(value.chapter) || !stamp(value.recordedAt, now)) return null
  return { kind: value.kind, origin: value.origin, chapter: value.chapter, recordedAt: value.recordedAt }
}

function sanitizeMemento(value: unknown, episode: EpisodeDefinition, now: number): EpisodeMementoReceipt | null {
  if (!isRecord(value) || value.id !== episode.memento.id || value.version !== 1 || value.episodeId !== episode.id
    || value.episodeVersion !== episode.version || !stamp(value.grantedAt, now) || value.rewardId !== episode.memento.rewardId) return null
  const savedOrigins: unknown[] = Array.isArray(value.origins) ? value.origins : []
  const origins = ORIGINS.filter(origin => savedOrigins.includes(origin))
  return { id: episode.memento.id, version: 1, episodeId: episode.id, episodeVersion: 1, grantedAt: value.grantedAt, origins, rewardId: episode.memento.rewardId }
}

function sanitizeRun(value: unknown, episode: EpisodeDefinition, now: number, trackingSince: number, mementoGranted: boolean): EpisodeRun | null {
  if (!isRecord(value) || value.id !== episode.id || value.version !== episode.version) return null
  const rawReceipts = isRecord(value.receipts) ? value.receipts : {}
  const one = sanitizeReceipt(rawReceipts[1], 1, episode, now)
  const rawChoice = isChoice(value.choice) && choiceFor(episode, value.choice) ? value.choice : null
  const expectedProof = rawChoice ? choiceFor(episode, rawChoice)?.proof : null
  let two: EpisodeChapterReceipt | null = null
  if (one && rawChoice) {
    const candidate = sanitizeReceipt(rawReceipts[2], 2, episode, now)
    if (candidate && (candidate.source === expectedProof || candidate.source === (rawChoice ? choiceFor(episode, rawChoice)?.alternativeProof : null)) && candidate.completedAt >= one.completedAt) two = candidate
  }
  const correct = rawChoice ? episode.challenges[rawChoice].correct : null
  let three: EpisodeChapterReceipt | null = null
  if (two && rawChoice) {
    const candidate = sanitizeReceipt(rawReceipts[3], 3, episode, now)
    if (candidate && candidate.reference === correct && candidate.completedAt >= two.completedAt) three = candidate
  }
  let four: EpisodeChapterReceipt | null = null
  if (three) {
    const candidate = sanitizeReceipt(rawReceipts[4], 4, episode, now)
    if (candidate && candidate.completedAt >= three.completedAt) four = candidate
  }
  const receipts: EpisodeRun['receipts'] = {}
  if (one) receipts[1] = one
  if (two) receipts[2] = two
  if (three) receipts[3] = three
  if (four) receipts[4] = four
  const chapter: EpisodeChapter = three ? 4 : two ? 3 : one ? 2 : 1
  const startedAt = stamp(value.startedAt, now) ? value.startedAt : one?.completedAt ?? trackingSince
  const observations = Array.isArray(value.observations)
    ? value.observations.map(row => sanitizeObservation(row, episode, now)).filter((row): row is EpisodeObservedProof => row !== null)
      .filter(row => row.chapter === chapter).slice(-OBSERVATION_LIMIT)
    : []
  const assistance = Array.isArray(value.assistance)
    ? value.assistance.map(row => sanitizeAssistance(row, now)).filter((row): row is EpisodeAssistanceReceipt => row !== null).slice(-ASSISTANCE_LIMIT)
    : []
  const latest = Math.max(startedAt, ...Object.values(receipts).map(receipt => receipt?.completedAt ?? 0), ...observations.map(row => row.observedAt), ...assistance.map(row => row.recordedAt))
  const lastSeenAt = stamp(value.lastSeenAt, now) ? Math.max(latest, value.lastSeenAt) : latest
  const choice = two && rawChoice ? rawChoice : null
  const outcomeTags: EpisodeOutcomeTag[] = three && choice ? [outcomeFor(episode, choice)] : []
  return {
    id: episode.id, version: episode.version, chapter, startedAt, lastSeenAt, choice, outcomeTags, receipts, observations, assistance,
    completedAt: four ? four.completedAt : null, mementoGranted,
  }
}

function historyOf(episode: EpisodeDefinition, run: EpisodeRun): EpisodeHistoryRow[] {
  return ([1, 2, 3, 4] as const).flatMap(chapter => {
    const receipt = run.receipts[chapter]
    if (!receipt) return []
    const choice = run.choice ? choiceFor(episode, run.choice) : null
    const summary = chapter === 1 ? receipt.source === episode.intro.alternativeProof
      ? `Continued ${chapterDefinition(episode, 1).speaker}’s story after completing the local activity.`
      : `Met ${chapterDefinition(episode, 1).speaker} for the introduction.`
      : chapter === 2 ? `Chose ${run.choice ?? 'an approach'} from verified ${receipt.source.replaceAll('-', ' ')}.`
        : chapter === 3 ? `${run.outcomeTags[0]?.replaceAll('-', ' ') ?? 'The callback'} changed what ${choice?.callbackSpeaker ?? 'the host'} remembers.`
          : `Finished ${episode.title} through ${receipt.source.replaceAll('-', ' ')}.`
    return [{ chapter, title: chapterDefinition(episode, chapter).title, completedAt: receipt.completedAt, source: receipt.source, origin: receipt.origin, summary }]
  })
}

function recapOf(episode: EpisodeDefinition, run: EpisodeRun, now: number): string | null {
  if (now - run.lastSeenAt < RETURN_RECAP_MS || !run.receipts[1]) return null
  if (run.completedAt) return episode.recap.completed
  if (!run.choice) return episode.recap.introduced
  const choice = choiceFor(episode, run.choice)
  return run.receipts[3] ? choice?.returnRecap.finaleReady ?? null : choice?.returnRecap.callbackPending ?? null
}

function nextFor(episode: EpisodeDefinition, run: EpisodeRun): EpisodeOptionView['next'] & {} {
  if (run.chapter === 1 && !proofFor(run, episode.intro.proof, 1) && !(episode.intro.alternativeProof && proofFor(run, episode.intro.alternativeProof, 1))) return episode.intro.proofNext
  if (run.chapter === 3 && run.choice) {
    const choice = choiceFor(episode, run.choice)
    if (choice) return { venue: episode.location.venue, spot: choice.callbackSpot, label: episode.chapters[2].destination.label }
  }
  return chapterDefinition(episode, run.chapter).destination
}

function optionsOf(state: EpisodeLife, episode: EpisodeDefinition, run: EpisodeRun): EpisodeOptionView[] {
  if (run.completedAt) return []
  if (!prerequisiteMet(state, episode)) {
    const reason = episode.prerequisite?.refusal ?? `${episode.title} is not available.`
    return [{ id: 'prerequisite', label: 'Complete the earlier episode', description: reason, enabled: false, reason,
      action: { type: 'episodes.intro', payload: { id: episode.id } } }]
  }
  if (run.chapter === 1) {
    const reason = (proofFor(run, episode.intro.proof, 1) || episode.intro.alternativeProof && proofFor(run, episode.intro.alternativeProof, 1)) ? null : episode.intro.missingProof
    return [{ id: 'continue', label: `Continue with ${chapterDefinition(episode, 1).speaker}`, description: episode.intro.alternativeProof ? 'Have a conversation or complete the listed activity, then return here.' : 'Confirm the introduction after the verified conversation.', enabled: reason === null, reason,
      action: { type: 'episodes.intro', payload: { id: episode.id } }, ...(reason ? { next: episode.intro.proofNext } : {}) }]
  }
  if (run.chapter === 2) return episode.choices.map(choice => {
    const studentBlock = choice.requiresStudent && !settledStudent(state) ? choice.studentRefusal : null
    const reason = studentBlock ?? ((proofFor(run, choice.proof, 2) || choice.alternativeProof && proofFor(run, choice.alternativeProof, 2)) ? null : choice.missingProof)
    return { id: choice.id, label: choice.title, description: choice.description, enabled: reason === null, reason,
      action: { type: 'episodes.choose', payload: { id: episode.id, choice: choice.id } }, ...(reason && !studentBlock ? { next: choice.proofNext } : {}) }
  })
  if (run.chapter === 3 && run.choice) return episode.challenges[run.choice].options.map(option => ({
    id: option.id, label: option.label, description: 'Choose the response that fits this scene.', enabled: true, reason: null,
    action: { type: 'episodes.resolve', payload: { id: episode.id, answer: option.id } },
  }))
  return episode.finale.routes.map(route => {
    const source = observedFinaleSource(route)
    const reason = source && !proofFor(run, source, 4) ? route.missingProof : null
    return { id: route.id, label: route.title, description: route.description, enabled: reason === null, reason,
      action: { type: 'episodes.finish', payload: { id: episode.id, route: route.id } }, ...(reason && route.proofNext ? { next: route.proofNext } : {}) }
  })
}

function viewRow(state: EpisodeLife, episode: EpisodeDefinition, ctx: LifeContext) {
  const saved = state.episodes.runs[episode.id]
  const run = saved ?? newRun(episode, state.episodes.trackingSince)
  const definition = chapterDefinition(episode, run.chapter)
  const choice = run.choice ? choiceFor(episode, run.choice) : null
  const callbackText = run.chapter === 3 && choice ? choice.callbackText : definition.text
  const memento = state.episodes.mementos[episode.memento.id]
  const unlocked = prerequisiteMet(state, episode)
  let next = nextFor(episode, run)
  if (!unlocked && episode.prerequisite) {
    const prerequisite = episodeById(episode.prerequisite.episodeId)
    const prerequisiteRun = prerequisite ? state.episodes.runs[prerequisite.id] ?? newRun(prerequisite, state.episodes.trackingSince) : null
    if (prerequisite && prerequisiteRun) next = nextFor(prerequisite, prerequisiteRun)
  }
  return {
    id: episode.id, version: episode.version, title: episode.title, cityId: episode.location.city, cityName: episode.location.name ?? episode.location.city,
    status: !unlocked ? 'locked' as const : run.completedAt ? 'completed' as const : saved ? 'active' as const : 'available' as const,
    chapter: run.chapter, chapterTitle: definition.title, speaker: definition.speaker,
    text: run.chapter === 3 && run.choice ? `${callbackText} ${episode.challenges[run.choice].prompt}` : callbackText,
    recap: saved ? recapOf(episode, run, ctx.now) : null, choice: run.choice, outcomeTags: [...run.outcomeTags], next,
    options: optionsOf(state, episode, run),
    assistance: { allowed: true as const, completionAuthority: 'game-rules-only' as const, fallback: 'Every episode has an authored solo route. An agent may deliver dialogue or fill a supported role, but cannot create proof or grant the memento.', records: run.assistance.map(row => ({ ...row })) },
    history: historyOf(episode, run),
    memento: { id: episode.memento.id, title: episode.memento.title, description: episode.memento.description, icon: episode.memento.icon, grantedAt: memento?.grantedAt ?? null },
  }
}

function viewOf(state: EpisodeLife, ctx: LifeContext): EpisodesView {
  return {
    trackingSince: state.episodes.trackingSince,
    mementos: Object.values(state.episodes.mementos).filter((row): row is EpisodeMementoReceipt => row !== undefined),
    rows: [...episodesForCity(ctx.cityId, state.episodes.runs), ...Object.keys(state.episodes.runs).flatMap(id => {
      const episode = episodeById(id)
      return episode && episode.location.city !== ctx.cityId ? [episode] : []
    })].map(episode => viewRow(state, episode, ctx)),
  }
}

const play = PLAYS ? {
  actions: {
    'episodes.intro': introduce,
    'episodes.choose': choose,
    'episodes.resolve': resolve,
    'episodes.finish': finish,
    'episodes.assist': assist,
  },
  on: {
    'npc.interacted'(state: EpisodeLife, data, ctx) {
      if (data.success !== true) return
      for (const episode of episodesForCity(ctx.cityId, state.episodes.runs)) for (const observation of episode.observations) {
        if (observation.event === 'npc.interacted' && data.npc === observation.npcId && atObservationPlace(state, episode, observation, ctx)) {
          observeProof(state, episode, observation.source, referenceOf(observation.source, ctx), ctx)
        }
      }
    },
    'activity.completed'(state: EpisodeLife, data, ctx) {
      for (const episode of episodesForCity(ctx.cityId, state.episodes.runs)) for (const observation of episode.observations) {
        if (observation.event === 'activity.completed' && data.id === observation.activityId && atObservationPlace(state, episode, observation, ctx)) {
          observeProof(state, episode, observation.source, referenceOf(observation.source, ctx), ctx)
        }
      }
    },
    'campus.job.completed'(state: EpisodeLife, data, ctx) {
      for (const episode of episodesForCity(ctx.cityId, state.episodes.runs)) for (const observation of episode.observations) {
        if (observation.event === 'campus.job.completed' && observation.jobIds.some(job => job === data.job)
          && (!observation.requirePositivePay || data.pay > 0) && atObservationPlace(state, episode, observation, ctx)) {
          observeProof(state, episode, observation.source, referenceOf(observation.source, ctx), ctx)
        }
      }
    },
    'table.played'(state: EpisodeLife, data, ctx) {
      for (const episode of episodesForCity(ctx.cityId, state.episodes.runs)) for (const observation of episode.observations) {
        if (observation.event === 'table.played' && data.game === observation.game && atObservationPlace(state, episode, observation, ctx)) {
          observeProof(state, episode, observation.source, referenceOf(observation.source, ctx), ctx)
        }
      }
    },
    'event.attended'(state: EpisodeLife, data, ctx) {
      for (const episode of episodesForCity(ctx.cityId, state.episodes.runs)) for (const observation of episode.observations) {
        if (observation.event === 'event.attended' && data.venue === observation.venueId && atObservationPlace(state, episode, observation, ctx)) {
          observeProof(state, episode, observation.source, referenceOf(observation.source, ctx), ctx)
        }
      }
    },
  },
} satisfies Pick<SystemDefinition<'episodes'>, 'actions' | 'on'> : LEFT_OUT

export default {
  id: 'episodes',
  stateKeys: ['episodes'],
  sanitize(input, state: EpisodeLife, ctx) {
    const now = ctx.now || state.t
    const raw = isRecord(input.episodes) ? input.episodes : {}
    const trackingSince = stamp(raw.trackingSince, now) ? raw.trackingSince : now
    const rawMementos = isRecord(raw.mementos) ? raw.mementos : {}
    const mementos: EpisodeLife['episodes']['mementos'] = {}
    for (const id of Object.keys(rawMementos)) {
      const episode = episodeByMemento(id)
      if (!episode) continue
      const memento = sanitizeMemento(rawMementos[id], episode, now)
      if (memento) mementos[memento.id] = memento
    }
    const rawRuns = isRecord(raw.runs) ? raw.runs : {}
    const runs: EpisodeLife['episodes']['runs'] = {}
    state.episodes = { version: 1, trackingSince, runs, mementos }
    const seen = new Set<string>()
    const restore = (episode: EpisodeDefinition): void => {
      if (seen.has(episode.id)) return
      seen.add(episode.id)
      if (episode.prerequisite) {
        const prerequisite = episodeById(episode.prerequisite.episodeId)
        if (prerequisite) restore(prerequisite)
      }
      if (!prerequisiteMet(state, episode)) return
      const run = sanitizeRun(rawRuns[episode.id], episode, now, trackingSince, Boolean(mementos[episode.memento.id]))
      if (run) runs[episode.id] = run
    }
    for (const id of Object.keys(rawRuns)) {
      const episode = episodeById(id)
      if (episode) restore(episode)
    }
  },
  ...play,
  view: viewOf,
} satisfies SystemDefinition<'episodes'>
