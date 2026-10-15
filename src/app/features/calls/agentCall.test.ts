// The call with an AI character as plain logic, with fakes for the server, the engines and the voice: start, push-to-talk, typed words, the day's minutes, the break line,
// the game's help lines, a call the server ended, a way that fails and hands over, and that the character's voice is only ever played here (the server sends text).
import assert from 'node:assert/strict'
import test from 'node:test'
import { createAgentCall } from './agentCall.ts'
import type { CallApi, StartAnswer, TurnAnswer } from './agentCall.ts'
import type { Capture, SttEngine, SttKind } from './stt.ts'

const SEED = 4279091752
function rig(options: { start?: Partial<StartAnswer> | Error; turn?: (text: string, n: number) => Partial<TurnAnswer> | Error; engines?: Record<string, { available?: boolean; text?: string; failStart?: string; failStop?: string }>; choice?: string } = {}) {
  const spoken: { text: string; seed: number }[] = [], turns: string[] = [], active: boolean[] = [], ended: string[] = [], store = new Map<string, string>()
  if (options.choice) store.set('allworld:agent-call-stt', options.choice)
  let canSpeak = true, clock = 1000
  const api: CallApi = {
    async start() { if (options.start instanceof Error) throw options.start; return { call: 'call-1', name: 'Mama Tolani', voiceSeed: SEED, leftSeconds: 1200, stt: { default: 'browser', gateway: true }, ...options.start } },
    async turn(_call, text) {
      turns.push(text)
      const made = options.turn ? options.turn(text, turns.length) : {}
      if (made instanceof Error) throw made
      return { said: text, text: 'How far!', voiceSeed: SEED, leftSeconds: 1100, ...made }
    },
    async end(call) { ended.push(call) },
  }
  const engines: SttEngine[] = (['browser', 'gateway'] as SttKind[]).map((kind) => {
    const set = options.engines?.[kind] ?? {}
    return { kind, available: () => set.available !== false, async begin(): Promise<Capture> {
      if (set.failStart) throw new Error(set.failStart)
      return { partial: () => 'how f', async stop() { if (set.failStop) throw new Error(set.failStop); return { text: set.text ?? `from ${kind}`, ms: 321, kind } }, cancel() {} }
    } }
  })
  const call = createAgentCall({ api, engines, speak: (text, seed) => { if (canSpeak) spoken.push({ text, seed }); return canSpeak }, stopSpeaking: () => {}, storage: { get: (key) => store.get(key) ?? null, set: (key, value) => { store.set(key, value) } }, active: (on) => { active.push(on) }, now: () => clock })
  const hold = async (ms = 600): Promise<void> => { await call.press(); clock += ms; await call.release() }
  return { call, spoken, turns, active, ended, store, hold, mute: () => { canSpeak = false }, tick: (ms: number) => { clock += ms } }
}

test('a call: start, hold, let go: the words are sent as text and the answer is spoken here with the character’s own seed', async () => {
  const r = rig()
  await r.call.start('house.lagos.tolani')
  assert.deepEqual([r.call.view().phase, r.call.view().name, r.call.view().leftSeconds, r.active], ['ready', 'Mama Tolani', 1200, [true]])
  await r.hold()
  assert.deepEqual(r.turns, ['from browser'], 'the browser’s own recognition is the default')
  const view = r.call.view()
  assert.deepEqual(view.lines, [{ who: 'you', text: 'from browser' }, { who: 'agent', text: 'How far!' }])
  assert.deepEqual(r.spoken, [{ text: 'How far!', seed: SEED }])
  assert.deepEqual([view.phase, view.stt, view.delay, view.leftSeconds, view.silent], ['ready', 'browser', 321, 1100, false])
  await r.call.hangup()
  assert.deepEqual([r.ended, r.active, r.call.view().phase], [['call-1'], [true, false], 'ended'])
})

test('the person’s choice picks the way; "automatic" follows the server default; a browser with no recognition uses the gateway; with neither the page is typing only', async () => {
  const chosen = rig({ choice: 'gateway' })
  await chosen.call.start('a'); await chosen.hold()
  assert.deepEqual([chosen.turns, chosen.call.view().stt], [['from gateway'], 'gateway'])
  chosen.call.setChoice('browser'); await chosen.hold()
  assert.equal(chosen.turns.at(-1), 'from browser')
  const fallback = rig({ engines: { browser: { available: false } } })
  await fallback.call.start('a'); await fallback.hold()
  assert.deepEqual([fallback.turns, fallback.call.view().stt, fallback.call.view().typeOnly], [['from gateway'], 'gateway', false])
  const none = rig({ engines: { browser: { available: false }, gateway: { available: false } } })
  await none.call.start('a')
  assert.equal(none.call.view().typeOnly, true)
  await none.call.say('hello by typing')
  assert.deepEqual(none.turns, ['hello by typing'], 'typing always works')
  // The server says the gateway way is off: only the browser's is used, and the choice of gateway falls back.
  const off = rig({ choice: 'gateway', start: { stt: { default: 'browser', gateway: false } } })
  await off.call.start('a'); await off.hold()
  assert.equal(off.call.view().stt, 'browser')
})

test('a way that fails to start or to finish hands over to the other for the next press, and says so in plain words', async () => {
  const r = rig({ engines: { browser: { failStop: 'network' } } })
  await r.call.start('a')
  await r.hold()
  assert.deepEqual([r.turns.length, r.call.view().phase], [0, 'ready'])
  assert.match(r.call.view().problem ?? '', /did not come through/)
  await r.hold()
  assert.deepEqual(r.turns, ['from gateway'], 'the next press uses the other way')
  const refused = rig({ engines: { browser: { failStart: 'denied' } } })
  await refused.call.start('a'); await refused.hold()
  assert.match(refused.call.view().problem ?? '', /microphone is blocked/)
  assert.equal(refused.turns.length, 0)
})

test('nothing heard, or a tap that is too short, sends nothing', async () => {
  const empty = rig({ engines: { browser: { text: '   ' } } })
  await empty.call.start('a'); await empty.hold()
  assert.deepEqual([empty.turns.length, empty.call.view().phase], [0, 'ready'])
  assert.match(empty.call.view().problem ?? '', /did not catch/)
  const tap = rig()
  await tap.call.start('a'); await tap.hold(50)
  assert.equal(tap.turns.length, 0)
})

test('the day’s minutes: over the limit the character says it will call back and the call is over; started over the limit it never opens', async () => {
  const r = rig({ turn: (_text, n) => (n === 2 ? { over: 'player', text: 'I must go now. I will call you back tomorrow.', leftSeconds: 0 } : {}) })
  await r.call.start('a'); await r.hold(); await r.hold()
  assert.deepEqual([r.call.view().phase, r.call.view().leftSeconds, r.spoken.at(-1)?.text], ['over', 0, 'I must go now. I will call you back tomorrow.'])
  assert.deepEqual(r.active, [true, false])
  const early = rig({ start: { call: undefined as unknown as string, over: 'player', text: 'My call time for today is used up. I will call you back tomorrow.' } })
  await early.call.start('a')
  assert.deepEqual([early.call.view().phase, early.spoken.length, early.call.view().lines[0]?.text], ['over', 1, 'My call time for today is used up. I will call you back tomorrow.'])
  assert.deepEqual(early.active, [true, false])
  await early.hold()
  assert.equal(early.turns.length, 0, 'no talking on a call that is over')
})

test('the game’s words are shown as the game’s: help lines and the break reminder are not the character’s, and help is not spoken as the character', async () => {
  const r = rig({ turn: (_t, n) => (n === 1 ? { help: true, text: 'I am sorry you are going through this. In Nigeria: Emergency: 112.' } : { breakText: 'You have been talking with AI characters for a while.' }) })
  await r.call.start('a'); await r.call.say('help'); await r.call.say('hello')
  assert.deepEqual(r.call.view().lines.map((line) => line.who), ['you', 'game', 'you', 'agent', 'game'])
  assert.deepEqual(r.spoken.map((line) => line.text), ['How far!'], 'only the character’s own reply is spoken in its voice')
})

test('a phone with no voice shows the words instead; a call the server ended is shown as ended; a failed start is an error', async () => {
  const quiet = rig(); quiet.mute()
  await quiet.call.start('a'); await quiet.call.say('hello')
  assert.deepEqual([quiet.call.view().silent, quiet.call.view().lines.at(-1)?.text], [true, 'How far!'])
  const gone = rig({ turn: () => new Error('The call has ended.') })
  await gone.call.start('a'); await gone.call.say('hello')
  assert.deepEqual([gone.call.view().phase, gone.active], ['ended', [true, false]])
  const down = rig({ start: new Error('Calls with AI characters are off for now.') })
  await down.call.start('a')
  assert.deepEqual([down.call.view().phase, down.call.view().problem, down.active], ['error', 'Calls with AI characters are off for now.', [true, false]])
  // A failed turn leaves the call open to try again.
  const flaky = rig({ turn: (_t, n) => (n === 1 ? new Error('That did not come through.') : {}) })
  await flaky.call.start('a'); await flaky.call.say('hi')
  assert.equal(flaky.call.view().phase, 'ready')
  await flaky.call.say('hi again')
  assert.equal(flaky.call.view().lines.length, 2)
})
