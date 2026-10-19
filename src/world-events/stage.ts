/**
 * OWNER: world events (docs/WORLD-EVENTS.md "Stage mode")
 * STAGE MODE, AS PURE FUNCTIONS: a stage over the voice circle of one room (the Square, a venue, a group room). Election night's debate
 * uses it first; Phase 7 (Allworld House, artist premieres) and Phase 8 (stage rooms) reuse it as it is.
 *
 *   moderator   runs it: invites people up, takes them down, picks the next question, ends it. `null`: the game runs it (the next
 *               question is taken by itself every AUTO_NEXT_MS) and an admin may step in. An admin is always a moderator.
 *   speakers    on the stage: the only people who may unmute in the room while the stage is open. Adults only. An AI character may be
 *               on it and always carries the AI mark.
 *   invited     may take their seat by themselves (a debate's candidates).
 *   audience    everyone else in the room: listens, raises a hand (adults), asks a written question, adds a vote to a question.
 *
 * The server decides every step with `stageRefusal` and `applyStage`; voice follows `mayTalk` (server/ws/rooms.ts refuses an unmute from
 * anyone else, and the page plays only the people on the stage).
 */
export type StageKind = 'debate' | 'talk' | 'speech'
export type StageRole = 'moderator' | 'speaker' | 'audience'
export interface StagePerson { id: string; name: string; ai?: true }
export interface StageQuestion { id: string; by: string; name: string; text: string; at: number; votes: string[]; state: 'open' | 'current' | 'done' }
export interface Stage {
  id: string
  /** The room key the stage is in (`world:square`, `lagos:park`, `world:room:g.12`). One stage per room. */
  room: string
  kind: StageKind
  title: string
  openedAt: number
  endsAt: number
  /** A person's id, or null: run by the game. */
  moderator: string | null
  speakers: StagePerson[]
  invited: StagePerson[]
  hands: (StagePerson & { at: number })[]
  questions: StageQuestion[]
  /** When the current question was picked (the game takes the next one AUTO_NEXT_MS later). */
  pickedAt: number
  /** For a debate: the seat it is about (`state:lagos`). */
  seat?: string
  rev: number
}
export const STAGE = Object.freeze({ speakers: 6, invited: 12, hands: 30, questions: 60, openPerPerson: 1, textMin: 3, textMax: 200, titleMax: 80, minutes: [5, 240] as const, autoNextMs: 4 * 60000 })

export type StageOp = 'hand' | 'unhand' | 'invite' | 'seat' | 'down' | 'ask' | 'upvote' | 'pick' | 'dismiss' | 'end'
export const STAGE_OPS: readonly StageOp[] = ['hand', 'unhand', 'invite', 'seat', 'down', 'ask', 'upvote', 'pick', 'dismiss', 'end']
/** Who is asking, as the server knows them. */
export interface StageActor { id: string; name: string; adult: boolean; present: boolean; admin: boolean }
/** What the op is about: a person (invite, down, unhand), a question (upvote, pick, dismiss) or the words (ask). */
export interface StageArgs { target?: string; targetAdult?: boolean; question?: string; text?: string }
export interface Refusal { code: string; reason: string }

export const roleOf = (stage: Pick<Stage, 'moderator' | 'speakers'>, id: string): StageRole => (stage.moderator === id ? 'moderator' : stage.speakers.some((item) => item.id === id) ? 'speaker' : 'audience')
/** May this person talk in the room while the stage is open? The moderator and the speakers. */
export const mayTalk = (stage: Pick<Stage, 'moderator' | 'speakers'>, id: string): boolean => roleOf(stage, id) !== 'audience'
const moderates = (stage: Stage, actor: StageActor): boolean => actor.admin || (stage.moderator !== null && stage.moderator === actor.id)
const no = (code: string, reason: string): Refusal => ({ code, reason })
const ADULTS = no('adults_only', 'Only adults can speak on a stage. You can still listen and ask a written question.')

/** Why `actor` may not do `op` now, or null. Pure: the server passes what it checked (adult, present in the room, admin). */
export function stageRefusal(stage: Stage, actor: StageActor, op: StageOp, args: StageArgs, now: number): Refusal | null {
  if (now >= stage.endsAt) return no('stage_over', 'This stage has ended.')
  if (!actor.present && !actor.admin) return no('not_in_room', 'Come into the room to take part.')
  const target = args.target ?? '', question = stage.questions.find((item) => item.id === args.question)
  switch (op) {
    case 'hand':
      if (!actor.adult) return ADULTS
      if (mayTalk(stage, actor.id)) return no('on_stage', 'You are already on the stage.')
      if (stage.hands.some((item) => item.id === actor.id)) return no('hand_up', 'Your hand is already up.')
      return stage.hands.length >= STAGE.hands ? no('hands_full', 'Many hands are up. Try again in a moment.') : null
    case 'unhand':
      if (target && target !== actor.id && !moderates(stage, actor)) return no('not_moderator', 'Only the moderator can do that.')
      return stage.hands.some((item) => item.id === (target || actor.id)) ? null : no('no_hand', 'That hand is not up.')
    case 'invite':
      if (!moderates(stage, actor)) return no('not_moderator', 'Only the moderator can bring someone up.')
      if (!target || (!stage.hands.some((item) => item.id === target) && !stage.invited.some((item) => item.id === target))) return no('not_waiting', 'Bring up someone whose hand is up.')
      if (args.targetAdult !== true) return no('adults_only', 'Only adults can speak on a stage.')
      if (stage.speakers.some((item) => item.id === target)) return no('on_stage', 'They are already on the stage.')
      return stage.speakers.length >= STAGE.speakers ? no('stage_full', `The stage holds ${STAGE.speakers} speakers.`) : null
    case 'seat':
      if (!stage.invited.some((item) => item.id === actor.id)) return no('not_invited', 'Only the people invited to this stage take a seat by themselves. Raise your hand instead.')
      if (!actor.adult) return ADULTS
      if (stage.speakers.some((item) => item.id === actor.id)) return no('on_stage', 'You are already on the stage.')
      return stage.speakers.length >= STAGE.speakers ? no('stage_full', `The stage holds ${STAGE.speakers} speakers.`) : null
    case 'down':
      if (target && target !== actor.id && !moderates(stage, actor)) return no('not_moderator', 'Only the moderator can take someone off the stage.')
      return stage.speakers.some((item) => item.id === (target || actor.id)) ? null : no('not_on_stage', 'That person is not on the stage.')
    case 'ask': {
      const text = (args.text ?? '').trim()
      if (text.length < STAGE.textMin || text.length > STAGE.textMax) return no('invalid_question', `A question is ${STAGE.textMin} to ${STAGE.textMax} characters.`)
      if (stage.questions.filter((item) => item.by === actor.id && item.state !== 'done').length >= STAGE.openPerPerson) return no('question_waiting', 'Your question is already in the queue. Wait for it to be taken.')
      return stage.questions.filter((item) => item.state !== 'done').length >= STAGE.questions ? no('queue_full', 'The queue is full. Try again soon.') : null
    }
    case 'upvote':
      if (!question || question.state !== 'open') return no('unknown_question', 'That question is not in the queue.')
      if (question.by === actor.id) return no('own_question', 'You cannot vote for your own question.')
      return question.votes.includes(actor.id) ? no('voted', 'You already voted for that question.') : null
    case 'pick': case 'dismiss':
      if (!moderates(stage, actor)) return no('not_moderator', 'Only the moderator can do that.')
      return question && question.state !== 'done' ? null : no('unknown_question', 'That question is not in the queue.')
    case 'end':
      return moderates(stage, actor) ? null : no('not_moderator', 'Only the moderator can end the stage.')
    default:
      return no('invalid_op', 'That is not something a stage does.')
  }
}

/** The next question the game takes: the most votes, then the oldest. */
export function nextQuestion(stage: Pick<Stage, 'questions'>): StageQuestion | null {
  return stage.questions.filter((item) => item.state === 'open').sort((a, b) => b.votes.length - a.votes.length || a.at - b.at || (a.id < b.id ? -1 : 1))[0] ?? null
}
function pick(stage: Stage, id: string, now: number): void {
  for (const item of stage.questions) if (item.state === 'current') item.state = 'done'
  const found = stage.questions.find((item) => item.id === id)
  if (found) found.state = 'current'
  stage.pickedAt = now
}
/** Keep the record small: answered questions beyond the newest twenty go. */
function trim(stage: Stage): void {
  const done = stage.questions.filter((item) => item.state === 'done')
  if (done.length > 20) { const drop = new Set(done.slice(0, done.length - 20).map((item) => item.id)); stage.questions = stage.questions.filter((item) => !drop.has(item.id)) }
}

/** Apply an op that `stageRefusal` allowed. `newId` names a new question. The stage's `rev` goes up. */
export function applyStage(stage: Stage, actor: StageActor, op: StageOp, args: StageArgs, now: number, newId: string, targetName = ''): void {
  const target = args.target || actor.id
  if (op === 'hand') stage.hands.push({ id: actor.id, name: actor.name, at: now })
  else if (op === 'unhand') stage.hands = stage.hands.filter((item) => item.id !== target)
  else if (op === 'invite' || op === 'seat') {
    const known = stage.hands.find((item) => item.id === target) ?? stage.invited.find((item) => item.id === target)
    stage.speakers.push({ id: target, name: known?.name ?? (targetName || actor.name), ...(known && 'ai' in known && known.ai ? { ai: true as const } : {}) })
    stage.hands = stage.hands.filter((item) => item.id !== target)
  } else if (op === 'down') stage.speakers = stage.speakers.filter((item) => item.id !== target)
  else if (op === 'ask') stage.questions.push({ id: newId, by: actor.id, name: actor.name, text: (args.text ?? '').trim(), at: now, votes: [], state: 'open' })
  else if (op === 'upvote') stage.questions.find((item) => item.id === args.question)?.votes.push(actor.id)
  else if (op === 'pick') pick(stage, args.question ?? '', now)
  else if (op === 'dismiss') { const found = stage.questions.find((item) => item.id === args.question); if (found) found.state = 'done' }
  else if (op === 'end') stage.endsAt = Math.min(stage.endsAt, now)
  trim(stage)
  stage.rev += 1
}

/** A game-run stage moves on by itself: the next question once the current one has had AUTO_NEXT_MS. True when it changed. */
export function autoStep(stage: Stage, now: number): boolean {
  if (stage.moderator !== null || now >= stage.endsAt) return false
  const current = stage.questions.find((item) => item.state === 'current')
  if (current && now - stage.pickedAt < STAGE.autoNextMs) return false
  const next = nextQuestion(stage)
  if (!next) { if (current) { current.state = 'done'; stage.rev += 1; return true } return false }
  pick(stage, next.id, now); stage.rev += 1
  return true
}

/** A new stage. */
export function newStage(fields: { id: string; room: string; kind: StageKind; title: string; now: number; minutes: number; moderator: string | null; invited?: StagePerson[]; seat?: string }): Stage {
  const minutes = Math.max(STAGE.minutes[0], Math.min(STAGE.minutes[1], Math.floor(fields.minutes)))
  return { id: fields.id, room: fields.room, kind: fields.kind, title: fields.title.slice(0, STAGE.titleMax), openedAt: fields.now, endsAt: fields.now + minutes * 60000, moderator: fields.moderator,
    speakers: [], invited: (fields.invited ?? []).slice(0, STAGE.invited), hands: [], questions: [], pickedAt: fields.now, ...(fields.seat ? { seat: fields.seat } : {}), rev: 1 }
}

/** What a page is shown: no voter lists, only counts and whether the viewer voted. */
export interface StageView {
  id: string; room: string; kind: StageKind; title: string; endsAt: number; moderator: string | null; rev: number; seat: string | null
  you: StageRole; handUp: boolean; invited: boolean
  speakers: StagePerson[]; invitedPeople: StagePerson[]; hands: StagePerson[]
  current: { id: string; name: string; text: string } | null
  queue: { id: string; name: string; text: string; votes: number; voted: boolean; mine: boolean }[]
}
export function stageView(stage: Stage, viewer: string | null): StageView {
  const current = stage.questions.find((item) => item.state === 'current') ?? null
  return {
    id: stage.id, room: stage.room, kind: stage.kind, title: stage.title, endsAt: stage.endsAt, moderator: stage.moderator, rev: stage.rev, seat: stage.seat ?? null,
    you: viewer ? roleOf(stage, viewer) : 'audience', handUp: Boolean(viewer && stage.hands.some((item) => item.id === viewer)), invited: Boolean(viewer && stage.invited.some((item) => item.id === viewer)),
    speakers: stage.speakers.map((item) => ({ ...item })), invitedPeople: stage.invited.filter((item) => !stage.speakers.some((on) => on.id === item.id)).map((item) => ({ ...item })),
    hands: stage.hands.map(({ id, name }) => ({ id, name })),
    current: current ? { id: current.id, name: current.name, text: current.text } : null,
    queue: stage.questions.filter((item) => item.state === 'open').sort((a, b) => b.votes.length - a.votes.length || a.at - b.at).map((item) => ({ id: item.id, name: item.name, text: item.text, votes: item.votes.length, voted: Boolean(viewer && item.votes.includes(viewer)), mine: item.by === viewer })),
  }
}
