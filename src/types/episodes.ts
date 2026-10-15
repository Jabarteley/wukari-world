import type { ExecutionOrigin } from './progression.ts'

export const EPISODE_IDS = ['hostel-hustle', 'the-quiet-hours'] as const
export type WorldEpisodeId = `city-${string}-first-steps` | `city-${string}-second-chapter`
export type EpisodeId = typeof EPISODE_IDS[number] | WorldEpisodeId
export type EpisodeChapter = 1 | 2 | 3 | 4
export type EpisodeChoice = 'work' | 'study' | 'help'
export type EpisodeOutcomeTag =
  | 'steady-hand' | 'clear-explanation' | 'made-room'
  | 'careful-fix' | 'patient-coach' | 'quiet-welcome'
  | 'local-care' | 'local-curiosity' | 'local-welcome'
export type EpisodeFinaleRoute = 'union-table' | 'campus-event' | 'quiet-support' | 'library-session' | 'quiet-help' | 'local-visit'
export type EpisodeAssistanceKind = 'authored-dialogue' | 'supported-role'
export type EpisodeAgentOrigin = Extract<ExecutionOrigin, 'delegated-agent' | 'agent-character'>
export type EpisodeObservedProofSource = 'kola-interaction' | 'bisi-interaction' | 'campus-job' | 'library-study' | 'union-whot' | 'campus-event' | 'local-conversation' | 'local-practical' | 'local-discovery'
export type EpisodeProofSource = EpisodeObservedProofSource | 'authored-challenge' | 'quiet-support' | 'quiet-help'
export type EpisodeChallengeOptionId =
  | 'work-rush-first' | 'work-check-list' | 'work-ask-everyone'
  | 'study-give-answer' | 'study-show-first-step' | 'study-change-topic'
  | 'help-fill-front-row' | 'help-hold-quiet-seat' | 'help-close-door'
  | 'quiet-work-move-all' | 'quiet-work-check-one' | 'quiet-work-ignore-rattle'
  | 'quiet-study-solve-it' | 'quiet-study-ask-first' | 'quiet-study-copy-notes'
  | 'quiet-help-call-room' | 'quiet-help-offer-corner' | 'quiet-help-leave-alone'
  | 'local-work-check' | 'local-work-rush' | 'local-work-assume'
  | 'local-study-notice' | 'local-study-guess' | 'local-study-skip'
  | 'local-help-listen' | 'local-help-push' | 'local-help-ignore'
export type EpisodeMementoId = 'hostel-hustle-memento' | 'the-quiet-hours-memento' | `${WorldEpisodeId}-memento`

export interface EpisodeObservedProof {
  source: EpisodeObservedProofSource
  chapter: 1 | 2 | 4
  reference: string
  observedAt: number
  origin: ExecutionOrigin
}

export interface EpisodeChapterReceipt {
  chapter: EpisodeChapter
  completedAt: number
  source: EpisodeProofSource
  reference: string
  origin: ExecutionOrigin
}

export interface EpisodeAssistanceReceipt {
  kind: EpisodeAssistanceKind
  origin: EpisodeAgentOrigin
  chapter: EpisodeChapter
  recordedAt: number
}

export interface EpisodeMementoReceipt {
  id: EpisodeMementoId
  version: 1
  episodeId: EpisodeId
  episodeVersion: 1
  grantedAt: number
  origins: ExecutionOrigin[]
  rewardId: string
}

export interface EpisodeRun {
  id: EpisodeId
  version: 1
  chapter: EpisodeChapter
  startedAt: number
  lastSeenAt: number
  choice: EpisodeChoice | null
  outcomeTags: EpisodeOutcomeTag[]
  receipts: Partial<Record<EpisodeChapter, EpisodeChapterReceipt>>
  observations: EpisodeObservedProof[]
  assistance: EpisodeAssistanceReceipt[]
  completedAt: number | null
  mementoGranted: boolean
}

export interface EpisodeState {
  version: 1
  trackingSince: number
  runs: Partial<Record<EpisodeId, EpisodeRun>>
  mementos: Partial<Record<EpisodeMementoId, EpisodeMementoReceipt>>
}

export interface EpisodesSlice { episodes: EpisodeState }

export interface EpisodeDestination {
  venue: string
  spot: string
  label: string
}

export interface EpisodeIntroDefinition {
  proof: Extract<EpisodeObservedProofSource, 'kola-interaction' | 'bisi-interaction' | 'local-conversation'>
  npcId: string
  alternativeProof?: EpisodeObservedProofSource
  proofNext: EpisodeDestination
  missingProof: string
  completeMessage: string
}

export interface EpisodeChoiceDefinition {
  id: EpisodeChoice
  title: string
  description: string
  proof: Extract<EpisodeObservedProofSource, 'campus-job' | 'library-study' | 'kola-interaction' | 'bisi-interaction' | 'local-conversation' | 'local-practical' | 'local-discovery'>
  alternativeProof?: EpisodeObservedProofSource
  proofNext: EpisodeDestination
  missingProof: string
  requiresStudent: boolean
  studentRefusal: string
  callbackSpot: string
  callbackSpeaker: string
  callbackText: string
  savedMessage: string
  outcomeTag: EpisodeOutcomeTag
  returnRecap: { callbackPending: string; finaleReady: string }
}

export interface EpisodeChallengeOptionDefinition {
  id: EpisodeChallengeOptionId
  label: string
}

export interface EpisodeChallengeDefinition {
  prompt: string
  options: readonly EpisodeChallengeOptionDefinition[]
  correct: EpisodeChallengeOptionId
  retry: string
}

export interface EpisodeChapterDefinition {
  chapter: EpisodeChapter
  title: string
  speaker: string
  text: string
  destination: EpisodeDestination
}

export interface EpisodeFinaleRouteDefinition {
  id: EpisodeFinaleRoute
  title: string
  description: string
  proof: Exclude<EpisodeProofSource, 'authored-challenge'>
  missingProof: string | null
  proofNext?: EpisodeDestination
}

export type EpisodeProofObservation =
  | { event: 'npc.interacted'; venue?: string; source: Extract<EpisodeObservedProofSource, 'kola-interaction' | 'bisi-interaction' | 'local-conversation'>; npcId: string }
  | { event: 'activity.completed'; source: 'library-study' | 'local-practical' | 'local-discovery'; activityId: string; spot: string; venue?: string }
  | { event: 'campus.job.completed'; source: 'campus-job'; jobIds: readonly string[]; requirePositivePay: true }
  | { event: 'table.played'; source: 'union-whot'; game: string; spot: string }
  | { event: 'event.attended'; source: 'campus-event'; venueId: string; spot: string }

/** A finite authored catalogue row. This is source content, not a general editor or reward language. */
export interface EpisodeDefinition<I extends EpisodeId = EpisodeId> {
  id: I
  version: 1
  title: string
  location: { city: string; venue: string; name?: string }
  prerequisite: { episodeId: EpisodeId; refusal: string } | null
  observations: readonly EpisodeProofObservation[]
  intro: EpisodeIntroDefinition
  chapters: readonly [EpisodeChapterDefinition, EpisodeChapterDefinition, EpisodeChapterDefinition, EpisodeChapterDefinition]
  choices: readonly EpisodeChoiceDefinition[]
  challenges: Readonly<Record<EpisodeChoice, EpisodeChallengeDefinition>>
  finale: {
    routes: readonly EpisodeFinaleRouteDefinition[]
    invalidRoute: string
    notReady: string
    closingLine: string
  }
  recap: { completed: string; introduced: string }
  memento: { id: EpisodeMementoId; title: string; description: string; icon: string; rewardId: string }
}

export type EpisodeOptionAction =
  | { type: 'episodes.intro'; payload: { id: EpisodeId } }
  | { type: 'episodes.choose'; payload: { id: EpisodeId; choice: EpisodeChoice } }
  | { type: 'episodes.resolve'; payload: { id: EpisodeId; answer: EpisodeChallengeOptionId } }
  | { type: 'episodes.finish'; payload: { id: EpisodeId; route: EpisodeFinaleRoute } }

export interface EpisodeOptionView {
  id: string
  label: string
  description: string
  enabled: boolean
  reason: string | null
  action: EpisodeOptionAction
  next?: EpisodeDestination
}

export interface EpisodeHistoryRow {
  chapter: EpisodeChapter
  title: string
  completedAt: number
  source: EpisodeProofSource
  origin: ExecutionOrigin
  summary: string
}

export interface EpisodeView {
  id: EpisodeId
  version: 1
  title: string
  cityId: string
  cityName: string
  status: 'locked' | 'available' | 'active' | 'completed'
  chapter: EpisodeChapter
  chapterTitle: string
  speaker: string
  text: string
  recap: string | null
  choice: EpisodeChoice | null
  outcomeTags: EpisodeOutcomeTag[]
  next: EpisodeDestination
  options: EpisodeOptionView[]
  assistance: {
    allowed: true
    completionAuthority: 'game-rules-only'
    fallback: string
    records: EpisodeAssistanceReceipt[]
  }
  history: EpisodeHistoryRow[]
  memento: { id: EpisodeMementoId; title: string; description: string; icon: string; grantedAt: number | null }
}

export interface EpisodesView {
  trackingSince: number
  mementos: EpisodeMementoReceipt[]
  rows: EpisodeView[]
}

type EpisodeActionFail = 'invalid_episode' | 'wrong_chapter' | 'wrong_place' | 'missing_prerequisite'
export interface EpisodeActionMap {
  'episodes.intro': { payload: { id: EpisodeId }; ok: 'introduced' | 'already_introduced'; fail: EpisodeActionFail | 'missing_proof' }
  'episodes.choose': { payload: { id: EpisodeId; choice: EpisodeChoice }; ok: 'choice_saved' | 'choice_confirmed'; fail: EpisodeActionFail | 'invalid_choice' | 'choice_locked' | 'student_required' | 'missing_proof' }
  'episodes.resolve': { payload: { id: EpisodeId; answer: EpisodeChallengeOptionId }; ok: 'callback_resolved' | 'already_resolved'; fail: EpisodeActionFail | 'choice_missing' | 'invalid_answer' }
  'episodes.finish': { payload: { id: EpisodeId; route: EpisodeFinaleRoute }; ok: 'completed' | 'already_completed'; fail: EpisodeActionFail | 'invalid_route' | 'missing_proof' }
  'episodes.assist': { payload: { id: EpisodeId; kind: EpisodeAssistanceKind }; ok: 'assistance_recorded' | 'already_recorded'; fail: EpisodeActionFail | 'invalid_assistance' | 'agent_origin_required' }
}

export const EPISODE_ACTION_TYPES = [
  'episodes.intro', 'episodes.choose', 'episodes.resolve', 'episodes.finish', 'episodes.assist',
] as const
