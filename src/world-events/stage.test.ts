// Stage mode's roles and permissions (src/world-events/stage.ts): who may raise a hand, speak, ask, vote and moderate.
import test from 'node:test'
import assert from 'node:assert/strict'
import { STAGE, applyStage, autoStep, mayTalk, newStage, nextQuestion, roleOf, stageRefusal, stageView } from './stage.ts'
import type { Stage, StageActor, StageArgs, StageOp } from './stage.ts'

const NOW = 1_000_000
const person = (id: string, more: Partial<StageActor> = {}): StageActor => ({ id, name: id.toUpperCase(), adult: true, present: true, admin: false, ...more })
const fresh = (moderator: string | null = 'mod'): Stage => newStage({ id: 's1', room: 'world:square', kind: 'debate', title: 'Debate: Governor of Lagos', now: NOW, minutes: 30, moderator, invited: [{ id: 'cand', name: 'Cand' }, { id: 'bot', name: 'Bot', ai: true }] })
let ids = 0
const run = (stage: Stage, actor: StageActor, op: StageOp, args: StageArgs = {}, now = NOW + 1000): string | null => {
  const refused = stageRefusal(stage, actor, op, args, now)
  if (!refused) applyStage(stage, actor, op, args, now, `q${++ids}`)
  return refused?.code ?? null
}

test('roles: the moderator and the speakers may talk; everyone else listens', () => {
  const stage = fresh()
  assert.equal(roleOf(stage, 'mod'), 'moderator'); assert.equal(roleOf(stage, 'ada'), 'audience')
  assert.equal(mayTalk(stage, 'mod'), true); assert.equal(mayTalk(stage, 'ada'), false)
  assert.equal(run(stage, person('cand'), 'seat'), null, 'an invited candidate takes their seat')
  assert.equal(roleOf(stage, 'cand'), 'speaker'); assert.equal(mayTalk(stage, 'cand'), true)
  assert.equal(run(stage, person('cand'), 'down'), null); assert.equal(mayTalk(stage, 'cand'), false)
})

test('adults only: a minor cannot raise a hand, take a seat or be brought up, but can still ask a written question', () => {
  const stage = fresh(), kid = person('kid', { adult: false })
  assert.equal(run(stage, kid, 'hand'), 'adults_only')
  assert.equal(run(fresh(), person('cand', { adult: false }), 'seat'), 'adults_only')
  assert.equal(run(stage, person('mod'), 'invite', { target: 'kid', targetAdult: false }), 'not_waiting')
  assert.equal(run(stage, kid, 'ask', { text: 'What about the roads?' }), null)
  // Even a hand that is up (an adult) is brought up only with the adult check passing.
  assert.equal(run(stage, person('ada'), 'hand'), null)
  assert.equal(run(stage, person('mod'), 'invite', { target: 'ada', targetAdult: false }), 'adults_only')
  assert.equal(run(stage, person('mod'), 'invite', { target: 'ada', targetAdult: true }), null)
  assert.equal(mayTalk(stage, 'ada'), true)
  assert.equal(stage.hands.length, 0, 'the hand goes down when they come up')
})

test('raise hand, the moderator brings people up and takes them down; the audience cannot', () => {
  const stage = fresh()
  assert.equal(run(stage, person('ada'), 'hand'), null)
  assert.equal(run(stage, person('ada'), 'hand'), 'hand_up')
  assert.equal(run(stage, person('bola'), 'invite', { target: 'ada', targetAdult: true }), 'not_moderator')
  assert.equal(run(stage, person('ada'), 'seat'), 'not_invited', 'only the invited seat themselves')
  assert.equal(run(stage, person('mod'), 'invite', { target: 'ada', targetAdult: true }), null)
  assert.equal(run(stage, person('mod'), 'invite', { target: 'ada', targetAdult: true }), 'not_waiting')
  assert.equal(run(stage, person('bola'), 'down', { target: 'ada' }), 'not_moderator')
  assert.equal(run(stage, person('mod'), 'down', { target: 'ada' }), null)
  assert.equal(run(stage, person('ada'), 'unhand'), 'no_hand')
  // An admin moderates any stage.
  assert.equal(run(stage, person('bola'), 'hand'), null)
  assert.equal(run(stage, person('root', { admin: true, present: false }), 'invite', { target: 'bola', targetAdult: true }), null)
})

test('the stage holds at most six speakers; someone outside the room cannot take part; an ended stage refuses everything', () => {
  const stage = fresh()
  for (let k = 0; k < STAGE.speakers; k++) { run(stage, person(`p${k}`), 'hand'); assert.equal(run(stage, person('mod'), 'invite', { target: `p${k}`, targetAdult: true }), null) }
  run(stage, person('late'), 'hand')
  assert.equal(run(stage, person('mod'), 'invite', { target: 'late', targetAdult: true }), 'stage_full')
  assert.equal(run(fresh(), person('away', { present: false }), 'hand'), 'not_in_room')
  assert.equal(run(fresh(), person('ada'), 'hand', {}, NOW + 31 * 60000), 'stage_over')
  assert.equal(run(stage, person('ada'), 'end'), 'not_moderator')
  assert.equal(run(stage, person('mod'), 'end'), null)
  assert.equal(run(stage, person('ada'), 'hand', {}, NOW + 2000), 'stage_over')
})

test('the question queue: one open question each, votes once and never for your own, the moderator picks and dismisses', () => {
  const stage = fresh()
  assert.equal(run(stage, person('ada'), 'ask', { text: 'no' }), 'invalid_question')
  assert.equal(run(stage, person('ada'), 'ask', { text: 'What will you do about the roads?' }), null)
  assert.equal(run(stage, person('ada'), 'ask', { text: 'And the light?' }), 'question_waiting')
  assert.equal(run(stage, person('bola'), 'ask', { text: 'Will the markets stay open late?' }), null)
  const [first, second] = stage.questions
  assert.equal(run(stage, person('ada'), 'upvote', { question: first!.id }), 'own_question')
  assert.equal(run(stage, person('chi'), 'upvote', { question: second!.id }), null)
  assert.equal(run(stage, person('chi'), 'upvote', { question: second!.id }), 'voted')
  assert.equal(nextQuestion(stage)?.id, second!.id, 'the most votes first')
  assert.equal(run(stage, person('ada'), 'pick', { question: first!.id }), 'not_moderator')
  assert.equal(run(stage, person('mod'), 'pick', { question: first!.id }), null)
  assert.equal(stageView(stage, 'ada').current?.text, 'What will you do about the roads?')
  assert.equal(run(stage, person('ada'), 'ask', { text: 'Another one now?' }), 'question_waiting', 'still waiting while it is the current one')
  assert.equal(run(stage, person('mod'), 'dismiss', { question: second!.id }), null)
  assert.equal(stageView(stage, 'ada').queue.length, 0)
  assert.equal(run(stage, person('mod'), 'pick', { question: second!.id }), 'unknown_question')
})

test('a stage the game runs takes the most-voted question by itself every few minutes', () => {
  const stage = fresh(null)
  assert.equal(run(stage, person('ada'), 'pick', { question: 'x' }), 'not_moderator', 'nobody moderates a game-run stage but an admin')
  run(stage, person('ada'), 'ask', { text: 'First question here?' })
  run(stage, person('bola'), 'ask', { text: 'Second question here?' })
  run(stage, person('chi'), 'upvote', { question: stage.questions[1]!.id })
  assert.equal(autoStep(stage, NOW + 2000), true)
  assert.equal(stage.questions.find((item) => item.state === 'current')?.text, 'Second question here?')
  assert.equal(autoStep(stage, NOW + 3000), false, 'it waits')
  assert.equal(autoStep(stage, NOW + 2000 + STAGE.autoNextMs), true)
  assert.equal(stage.questions.find((item) => item.state === 'current')?.text, 'First question here?')
  assert.equal(autoStep(fresh('mod'), NOW + 10 * 60000), false, 'a person moderates: nothing moves by itself')
})

test('what the page sees: roles, the AI mark, counts of votes and never who voted', () => {
  const stage = fresh()
  run(stage, person('bot'), 'seat')
  run(stage, person('ada'), 'ask', { text: 'A question for the bot?' })
  run(stage, person('chi'), 'upvote', { question: stage.questions[0]!.id })
  const seen = stageView(stage, 'chi')
  assert.deepEqual(seen.speakers, [{ id: 'bot', name: 'Bot', ai: true }])
  assert.deepEqual(seen.invitedPeople.map((item) => item.id), ['cand'])
  assert.equal(seen.queue[0]!.votes, 1); assert.equal(seen.queue[0]!.voted, true)
  assert.ok(!JSON.stringify(seen.queue).includes('"chi"'), 'no voter ids')
  assert.equal(stageView(stage, 'ada').queue[0]!.mine, true)
})
