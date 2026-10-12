// The voices: pacing of syllables from text, a voice from a seed, the three-voice cap, distance and pan, the speech layer's fallback and
// cancellation, the setting, and the teardown. No browser: the audio graph is the recording stand-in of ../fakeAudio.ts.
import assert from 'node:assert/strict'
import test from 'node:test'
import { FakeContext, FakeSource, asContext } from '../fakeAudio.ts'
import { SOUND_DEFAULTS, readSound, type SoundSettings } from '../settings.ts'
import { Cap, MAX_VOICES } from './cap.ts'
import { CuePlanner, VOCAL_GAP, type SceneView } from './cues.ts'
import { Voices } from './index.ts'
import { modeOf } from './mode.ts'
import { hash, profileOf, rng, type Build } from './seed.ts'
import { FLOOR_GAIN, NEAR, cutoffAt, gainAt, panFromOffset, panOf } from './spatial.ts'
import { Speech, pickVoice, scoreVoice, type SpeechApi, type UtteranceLike, type VoiceInfo } from './speech.ts'
import { MAX_SECONDS, MAX_SYLLABLES, chunksOf, lengthOf, syllablesOf } from './syllables.ts'

const calm = profileOf('regular-1', 'man')

test('a word gives one syllable per vowel group, a silent final e does not count, a word with no vowel goes by threes', () => {
  assert.equal(chunksOf('hello').length, 2)
  assert.equal(chunksOf('market').length, 2)
  assert.equal(chunksOf('make').length, 1)
  assert.equal(chunksOf('beautiful').length, 3)
  assert.equal(chunksOf('hmm').length, 1)
  assert.equal(chunksOf('brrrrrrr').length, 3)
  assert.equal(chunksOf('2024').length, 4)
  assert.equal(chunksOf('...').length, 0)
})

test('syllables are paced: a space is a short pause, a comma a longer one, a full stop the longest', () => {
  const beat = 1 / calm.speed
  const plain = syllablesOf('ba ba', calm), comma = syllablesOf('ba, ba', calm), stop = syllablesOf('ba. ba', calm)
  const pause = (list: ReturnType<typeof syllablesOf>): number => (list[1]?.at ?? 0) - (list[0]?.at ?? 0) - beat
  assert.ok(pause(plain) > 0.04 && pause(plain) < 0.1)
  assert.ok(pause(comma) > pause(plain) + 0.08)
  assert.ok(pause(stop) > pause(comma) + 0.1)
  // Times only ever go forward.
  const long = syllablesOf('Good morning, how far, na so we dey, you see?', calm)
  for (let i = 1; i < long.length; i++) assert.ok((long[i] as { at: number }).at > (long[i - 1] as { at: number }).at)
})

test('a question climbs at its end, an exclamation is louder, a statement settles', () => {
  const q = syllablesOf('Are you coming today?', calm), s = syllablesOf('You are coming today.', calm), x = syllablesOf('You are coming today!', calm)
  assert.ok((q[q.length - 1] as { pitch: number }).pitch > (q[0] as { pitch: number }).pitch + 2, 'a question rises')
  assert.ok((s[s.length - 1] as { pitch: number }).pitch < (s[0] as { pitch: number }).pitch, 'a statement falls')
  assert.ok((x[x.length - 1] as { gain: number }).gain > (s[s.length - 1] as { gain: number }).gain * 1.2, 'an exclamation is stressed')
})

test('a long line is cut so a bubble and its sound end together', () => {
  const list = syllablesOf('this is a very long line that goes on and on '.repeat(30), calm)
  assert.ok(list.length <= MAX_SYLLABLES)
  assert.ok(lengthOf(list) <= MAX_SECONDS + 0.4)
  assert.deepEqual(syllablesOf('   ', calm), [])
})

test('a seed is one voice: the same every time, and eight speakers are eight different voices', () => {
  assert.deepEqual(profileOf('npc:mama-ngozi'), profileOf('npc:mama-ngozi'))
  const seeds = ['a1', 'b2', 'c3', 'd4', 'e5', 'f6', 'g7', 'h8']
  const builds: Build[] = ['man', 'man', 'woman', 'woman', 'elder', 'youth', 'woman', 'man']
  const profiles = seeds.map((s, i) => profileOf(s, builds[i]))
  for (let i = 0; i < profiles.length; i++) for (let j = i + 1; j < profiles.length; j++) {
    const a = profiles[i] as ReturnType<typeof profileOf>, b = profiles[j] as ReturnType<typeof profileOf>
    assert.ok(Math.abs(Math.log2(a.f0 / b.f0)) > 0.01 || Math.abs(a.tract - b.tract) > 0.005 || Math.abs(a.speed - b.speed) > 0.05, `${seeds[i]} and ${seeds[j]} differ`)
  }
  const men = [...Array(60).keys()].map(n => profileOf(`m${n}`, 'man')), women = [...Array(60).keys()].map(n => profileOf(`w${n}`, 'woman'))
  assert.ok(Math.max(...men.map(p => p.f0)) < Math.min(...women.map(p => p.f0)), 'men sit below women')
  assert.ok(profileOf('e', 'elder').vibrato > 0 && profileOf('y', 'youth').vibrato === 0)
  assert.ok(profileOf('x', 'elder').speed < profileOf('x', 'youth').speed)
  // Over a crowd of seeds, no two are identical and all four builds turn up.
  const crowd = [...Array(200).keys()].map(n => profileOf(`person-${n}`))
  assert.equal(new Set(crowd.map(p => p.f0.toFixed(3))).size, 200)
  assert.equal(new Set(crowd.map(p => p.build)).size, 4)
  assert.notEqual(hash('a'), hash('b'))
})

test('at most three voices sound at once, nearest first', () => {
  const cap = new Cap()
  assert.equal(MAX_VOICES, 3)
  assert.ok(cap.admit('a', 9, 0, 5).ok); assert.ok(cap.admit('b', 5, 0, 5).ok); assert.ok(cap.admit('c', 7, 0, 5).ok)
  assert.equal(cap.admit('d', 12, 1, 6).ok, false, 'a farther newcomer is not heard')
  const near = cap.admit('e', 2, 1, 6)
  assert.deepEqual(near, { ok: true, evict: 'a' }, 'a nearer newcomer takes the farthest voice')
  assert.equal(cap.count(1), 3)
  assert.equal(cap.count(7), 0, 'they end')
  assert.ok(cap.admit('f', 30, 7, 9).ok)
  // The same speaker talking again replaces their own line, not another voice.
  assert.deepEqual(cap.admit('f', 30, 8, 10), { ok: true, evict: 'f' })
  assert.equal(cap.count(8), 1)
})

test('loudness and pan follow distance and screen position; a far voice is a quiet, dull murmur', () => {
  assert.equal(gainAt(0), 1); assert.equal(gainAt(NEAR), 1)
  let last = 1
  for (let d = 3; d <= 40; d += 1) { const g = gainAt(d); assert.ok(g <= last + 1e-9); last = g }
  assert.ok(Math.abs(gainAt(100) - FLOOR_GAIN) < 1e-9 && gainAt(100) > 0)
  assert.ok(cutoffAt(30) < cutoffAt(3) && cutoffAt(30) >= 1500)
  assert.equal(panOf(0), 0); assert.ok(panOf(-1) < 0 && panOf(1) > 0); assert.ok(Math.abs(panOf(5)) <= 0.8)
  assert.ok(panFromOffset(-4) < 0 && panFromOffset(4) > 0 && Math.abs(panFromOffset(100)) <= 0.8)
})

test('the setting: Off is silent, Sounds is sound only, Speech needs a voice, Quiet and mute override', () => {
  const s = (patch: Partial<SoundSettings>): SoundSettings => ({ ...SOUND_DEFAULTS, ...patch })
  assert.equal(SOUND_DEFAULTS.voices, 'sounds')
  assert.deepEqual(modeOf(s({}), true), { sounds: true, speech: false })
  assert.deepEqual(modeOf(s({ voices: 'off' }), true), { sounds: false, speech: false })
  assert.deepEqual(modeOf(s({ voices: 'speech' }), true), { sounds: true, speech: true })
  assert.deepEqual(modeOf(s({ voices: 'speech' }), false), { sounds: true, speech: false }, 'no voice on the device: the sounds')
  assert.deepEqual(modeOf(s({ voices: 'speech', quiet: true }), true), { sounds: true, speech: false })
  assert.deepEqual(modeOf(s({ voices: 'speech', on: false }), true), { sounds: false, speech: false })
  assert.equal(readSound({ getItem: () => JSON.stringify({ voices: 'speech' }) }).voices, 'speech')
  assert.equal(readSound({ getItem: () => JSON.stringify({ voices: 'loud' }) }).voices, 'sounds')
  assert.equal(readSound({ getItem: () => JSON.stringify({ voices: 3 }) }).voices, 'sounds')
})

// --- the speech layer ---
const LOCAL: VoiceInfo[] = [
  { name: 'Samantha', lang: 'en-US', localService: true }, { name: 'Daniel', lang: 'en-GB', localService: true },
  { name: 'Net Voice', lang: 'en-NG', localService: false }, { name: 'Amina', lang: 'en_NG', localService: true }, { name: 'Thomas', lang: 'fr-FR', localService: true },
]
const make = (voices: VoiceInfo[], hidden = false) => {
  const spoken: UtteranceLike[] = [], timers: { run: () => void; ms: number; live: boolean }[] = []
  let cancelled = 0, isHidden = hidden, clock = 0
  const api: SpeechApi = { speak: u => { spoken.push(u) }, cancel: () => { cancelled++ }, getVoices: () => voices }
  const speech = new Speech({
    api, utter: text => ({ text, voice: null, pitch: 1, rate: 1, volume: 1, lang: '', onend: null, onerror: null }), hidden: () => isHidden,
    after: (run, ms) => { const t = { run, ms, live: true }; timers.push(t); return () => { t.live = false } }, now: () => clock,
  })
  return { speech, spoken, timers, cancelled: () => cancelled, hide: (on: boolean) => { isHidden = on }, tick: (ms: number) => { clock += ms } }
}

test('speech picks a local English voice, the African one first, and never a voice that sends text to a server', () => {
  assert.equal(pickVoice(LOCAL, 'ng')?.name, 'Amina')
  assert.equal(pickVoice(LOCAL.filter(v => v.name !== 'Amina'), 'ng')?.name, 'Daniel', 'else the neutral British one')
  assert.equal(pickVoice(LOCAL.filter(v => v.name === 'Net Voice' || v.name === 'Thomas'), 'ng'), null, 'a network voice and a French one are not used')
  assert.equal(scoreVoice({ name: 'x', lang: 'en-GH', localService: true }, 'gh'), 100)
  assert.ok(scoreVoice({ name: 'x', lang: 'en-KE', localService: true }, 'ng') > scoreVoice({ name: 'x', lang: 'en-US', localService: true }, 'ng'))
})

test('speech falls back silently with no api, no voices, or a hidden page', () => {
  const none = new Speech({ api: null, utter: () => { throw new Error('no') }, hidden: () => false, after: () => () => undefined, now: () => 0 })
  assert.equal(none.available(), false); assert.equal(none.say('hello', calm, 1), false); none.cancel()
  const empty = make([]); assert.equal(empty.speech.available(), false); assert.equal(empty.speech.say('hello', calm, 1), false); assert.equal(empty.spoken.length, 0)
  const away = make(LOCAL, true); assert.equal(away.speech.say('hello', calm, 1), false); assert.equal(away.spoken.length, 0)
})

test('spoken lines queue and never overlap, each in its speaker\'s pitch and rate; a stale one is dropped; cancel clears all', () => {
  const t = make(LOCAL)
  const woman = profileOf('w', 'woman'), man = profileOf('m', 'man')
  assert.equal(t.speech.say('first line', man, 0.8), true)
  assert.equal(t.speech.say('second line', woman, 0.8), true)
  assert.equal(t.spoken.length, 1, 'the second waits')
  const first = t.spoken[0] as UtteranceLike
  assert.equal(first.lang, 'en-NG'); assert.equal(first.volume, 0.8)
  first.onend?.()
  assert.equal(t.spoken.length, 2)
  const second = t.spoken[1] as UtteranceLike
  assert.ok(second.pitch > first.pitch, 'a woman is higher than a man')
  // A third and fourth arrive while one speaks: only the latest waits.
  t.speech.say('third', man, 1); t.speech.say('fourth', man, 1)
  second.onend?.()
  assert.equal(t.spoken.length, 3); assert.equal((t.spoken[2] as UtteranceLike).text, 'fourth')
  // A line that waited too long is not spoken.
  t.speech.say('fifth', man, 1); t.tick(20_000); (t.spoken[2] as UtteranceLike).onend?.()
  assert.equal(t.spoken.length, 3)
  // A phone that never reports the end moves on by itself.
  t.speech.say('sixth', man, 1)
  assert.equal(t.spoken.length, 4)
  t.timers.filter(x => x.live).at(-1)?.run()
  const before = t.cancelled()
  t.speech.say('seventh', man, 1); t.speech.say('eighth', man, 1)
  t.speech.cancel()
  assert.ok(t.cancelled() > before); assert.equal(t.speech.busy(), false)
  const count = t.spoken.length
  ;(t.spoken[count - 1] as UtteranceLike).onend?.()
  assert.equal(t.spoken.length, count, 'nothing speaks after a cancel')
})

// --- the voices on a context ---
const noise = {} as AudioBuffer
const room = (settings: Partial<SoundSettings> = {}, speech: Speech | null = null, hidden = false) => {
  const ctx = new FakeContext()
  const into = ctx.createGain()
  let isHidden = hidden
  const voices = new Voices(asContext(ctx), into as unknown as AudioNode, noise, { settings: () => ({ ...SOUND_DEFAULTS, ...settings }), speech, hidden: () => isHidden, rand: () => 0.1 })
  voices.setAvatar(0, 0)
  return { ctx, voices, into, hide: (on: boolean) => { isHidden = on } }
}
const lineAt = (id: string, x: number, text = 'Good morning, how far?') => ({ id, text, kind: 'npc' as const, x, z: 1 })

test('a line makes a voice scheduled on the audio clock; the nearest three of many speakers sound, never more', () => {
  const { ctx, voices } = room()
  for (const [i, x] of [12, 3, 8, 5, 20, 2].entries()) voices.hear(lineAt(`p${i}`, x))
  assert.ok(voices.stats.peakVoices <= 3, `peak ${voices.stats.peakVoices}`)
  assert.equal(voices.cap.count(0), 3)
  const heardIds = voices.cap.live(0).map(v => v.id).sort()
  assert.deepEqual(heardIds, ['p1', 'p3', 'p5'], 'the three nearest: 3, 5 and 2 units away')
  assert.ok(ctx.sources.some(s => s.kind === 'osc' && s.started.length === 1), 'oscillators start on the clock')
})

test('off, a hidden page, a suspended context and an empty line are silent', () => {
  const off = room({ voices: 'off' }); off.voices.hear(lineAt('a', 3)); assert.equal(off.ctx.sources.length, 0)
  const muted = room({ on: false }); muted.voices.hear(lineAt('a', 3)); assert.equal(muted.ctx.sources.length, 0)
  const away = room({}, null, true); away.voices.hear(lineAt('a', 3)); assert.equal(away.ctx.sources.length, 0)
  const asleep = room(); asleep.ctx.state = 'suspended'; asleep.voices.hear(lineAt('a', 3)); assert.equal(asleep.ctx.sources.length, 0)
  const blank = room(); blank.voices.hear(lineAt('a', 3, '   ')); assert.equal(blank.ctx.sources.length, 0)
})

test('speech takes the nearest speaker\'s line (no sound under it); a far one gets the talk sound; with no voice all sounds', () => {
  const t = make(LOCAL)
  const spoken = room({ voices: 'speech' }, t.speech)
  spoken.voices.hear(lineAt('near', 3)); assert.equal(t.spoken.length, 1); assert.equal(spoken.ctx.sources.length, 0)
  spoken.voices.hear(lineAt('far', 20)); assert.equal(spoken.voices.stats.talked, 1, 'a far line is a murmur, not speech')
  const bare = make([]), fallback = room({ voices: 'speech' }, bare.speech)
  fallback.voices.hear(lineAt('near', 3)); assert.equal(fallback.voices.stats.talked, 1)
})

test('stop (a scene change) fades every voice, clears the cap and cancels speech; the bus is cut on dispose and the hidden tab stops', () => {
  const t = make(LOCAL), r = room({ voices: 'speech' }, t.speech)
  r.voices.hear(lineAt('a', 20)); r.voices.hear(lineAt('b', 22))
  assert.equal(r.voices.cap.count(0), 2)
  r.voices.stop()
  assert.equal(r.voices.cap.count(0), 0)
  const osc = r.ctx.sources.filter(s => s.kind === 'osc') as FakeSource[]
  assert.ok(osc.every(s => s.stopped.length >= 2), 'each source is told to stop')
  r.voices.hear(lineAt('c', 20)); r.hide(true); r.voices.setHidden(true); assert.equal(r.voices.cap.count(0), 0)
  r.voices.dispose(); assert.equal((r.voices.bus as unknown as { disconnected: boolean }).disconnected, true)
  const before = r.ctx.sources.length; r.hide(false); r.voices.hear(lineAt('d', 3)); assert.equal(r.ctx.sources.length, before, 'nothing sounds after dispose')
})

test('the setting changing to Off stops what is sounding', () => {
  let live: Partial<SoundSettings> = {}
  const ctx = new FakeContext()
  const v = new Voices(asContext(ctx), ctx.createGain() as unknown as AudioNode, noise, { settings: () => ({ ...SOUND_DEFAULTS, ...live }), speech: null, hidden: () => false })
  v.hear(lineAt('a', 4)); assert.equal(v.cap.count(0), 1)
  live = { voices: 'off' }; v.applySettings(); assert.equal(v.cap.count(0), 0)
})

test('the human sounds are sparse: one vocal cue per eight seconds at most, footsteps only for the nearest walkers, a goal brings a cheer', () => {
  const walkers = [1, 2, 3].map(n => ({ id: `w${n}`, role: 'walker', x: n * 3, z: 0, sitting: false }))
  const planner = new CuePlanner(() => 0.01)
  const view = (now: number, dx = 0, kind = 'market'): SceneView => ({ kind, now, avatar: { x: 0, z: 0 }, people: [...walkers.map(p => ({ ...p, x: p.x + dx })), { id: 's1', role: 'stander', x: 5, z: 5, sitting: false }, { id: 'sit', role: 'sitter', x: -9, z: 3, sitting: true }] })
  const first = planner.look(view(100))
  assert.deepEqual(first.filter(p => p.cue === 'step'), [], 'nobody has moved yet')
  assert.equal(first.filter(p => p.cue !== 'step').length, 1)
  assert.deepEqual(planner.look(view(104)).filter(p => p.cue !== 'step'), [], 'but not again within the gap')
  const second = planner.look(view(110, 1))
  const steps = second.filter(p => p.cue === 'step')
  assert.deepEqual([...new Set(steps.map(p => p.id))].sort(), ['w1', 'w2'], 'two nearest walkers only')
  assert.ok(steps.length >= 6 && steps.every(p => p.in < 4.5))
  const vocal = second.filter(p => p.cue !== 'step')
  assert.equal(vocal.length, 1)
  // Over ten minutes of looks every four seconds, vocal cues never come closer than the gap.
  const times: number[] = []
  const busy = new CuePlanner(() => 0.01)
  for (let t = 0; t < 600; t += 4) for (const p of busy.look(view(t, t % 8 ? 1 : 0))) if (p.cue !== 'step') times.push(t)
  for (let i = 1; i < times.length; i++) assert.ok((times[i] as number) - (times[i - 1] as number) >= VOCAL_GAP)
  assert.ok(times.length > 3 && times.length <= 600 / VOCAL_GAP, `${times.length} cues in ten minutes at the very most`)
  const usual: number[] = [], chance = rng(7), calmer = new CuePlanner(chance)
  for (let t = 0; t < 600; t += 4) for (const p of calmer.look(view(t, t % 8 ? 1 : 0))) if (p.cue !== 'step') usual.push(t)
  assert.ok(usual.length < 25, `${usual.length} cues in ten minutes with chance`)
  const cheer = new CuePlanner(() => 0.9).onLine({ ...view(10, 0, 'viewing') }, { id: 'f', x: 1, z: 1 }, 'GOAL! What a strike', false)
  assert.equal(cheer[0]?.cue, 'cheer')
  assert.deepEqual(new CuePlanner(() => 0.9).onLine(view(10, 0, 'market'), { id: 'f', x: 1, z: 1 }, 'goal', false), [])
  assert.equal(new CuePlanner(() => 0.1).onLine(view(10), { id: 'f', x: 1, z: 1 }, 'Ha, true', true)[0]?.cue, 'laugh')
})
