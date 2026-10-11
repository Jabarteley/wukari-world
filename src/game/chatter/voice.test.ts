import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { BARKS, BARK_GAP_MS, BARK_RATE, BARK_SETTLE_MS, BARK_SLOT_MS, BARK_VISIT_CAP, barkAt, createVoice, linesFor } from './voice.ts'
import type { Candidate, VoiceContext } from './voice.ts'
import { gossipFrom } from './gossip.ts'
import type { PublicRecord } from './gossip.ts'

const context = (more: Partial<VoiceContext> = {}): VoiceContext => ({ cityId: 'lagos', cityName: 'Lagos', venueId: 'market-1', kind: 'market', band: 'morning', raining: false, ...more })
const crowd: Candidate[] = [{ id: 'w1', role: 'walker' }, { id: 'w2', role: 'walker' }, { id: 's1', role: 'sitter' }, { id: 'c1', role: 'caller' }, { id: 'npc:ada', role: 'regular', name: 'Ada' }]
const NOW = Date.UTC(2026, 9, 12, 9, 0)

test('barks are deterministic: the same place, slot and crowd say the same thing, whatever order the crowd is listed in', () => {
  for (let slot = 100; slot < 160; slot++) {
    const a = barkAt(context(), slot, crowd, new Set()), b = barkAt(context(), slot, [...crowd].reverse(), new Set())
    assert.deepEqual(a, b)
  }
  assert.notDeepEqual(Array.from({ length: 40 }, (_, i) => barkAt(context(), i, crowd, new Set())?.id), Array.from({ length: 40 }, (_, i) => barkAt(context({ venueId: 'market-2' }), i, crowd, new Set())?.id))
})

test('a place murmurs, it does not spam: about half the slots, never two lines inside one slot, a visit has a cap, and the first seconds are silent', () => {
  const voice = createVoice()
  let said = 0, last = -Infinity
  const ctx = context()
  for (let t = 0; t < 40 * 60_000; t += 1_000) {
    const line = voice.poll(ctx, crowd, NOW + t)
    if (line) { said++; assert.ok(NOW + t - last >= BARK_GAP_MS || last === -Infinity, 'lines are at least the gap apart'); last = NOW + t }
  }
  assert.ok(said <= BARK_VISIT_CAP, `a visit hears at most ${BARK_VISIT_CAP}: ${said}`)
  assert.ok(said >= 8, `and a busy place does murmur: ${said}`)
  const fresh = createVoice()
  for (let t = 0; t < BARK_SETTLE_MS; t += 500) assert.equal(fresh.poll(ctx, crowd, NOW + t), null, 'silent while the scene settles')
  let slots = 0, lines = 0
  for (let slot = 1000; slot < 1400; slot++) { slots++; if (barkAt(ctx, slot, crowd, new Set())) lines++ }
  assert.ok(Math.abs(lines / slots - BARK_RATE) < 0.1, `${lines}/${slots}`)
})

test('a player never hears the same line twice in a session, even when they leave and come back', () => {
  const voice = createVoice()
  const heard: string[] = []
  for (const venue of ['market-1', 'market-2', 'market-1']) {
    voice.reset()
    for (let t = 0; t < 20 * 60_000; t += 1_000) { const line = voice.poll(context({ venueId: venue }), crowd, NOW + t + heard.length * 100_000_000); if (line) heard.push(line.id) }
  }
  assert.ok(heard.length > 10)
  assert.equal(new Set(heard).size, heard.length, 'no repeats')
  assert.equal(voice.heardCount(), heard.length)
})

test('lines fit the hour, the sky, the place, the city and the speaker', () => {
  const ids = (ctx: VoiceContext, role: Candidate['role'] = 'walker') => linesFor(ctx, role).map((l) => l.id)
  assert.ok(ids(context({ raining: true })).includes('sky-1') && !ids(context({ raining: false })).includes('sky-1'))
  assert.ok(ids(context({ band: 'night' })).includes('hour-8') && !ids(context({ band: 'morning' })).includes('hour-8'))
  assert.ok(ids(context({ kind: 'viewing' })).includes('ball-1') && !ids(context({ kind: 'hospital' })).includes('ball-1'))
  assert.ok(ids(context()).includes('road-3') && !ids(context({ cityId: 'kano' })).includes('road-3'), 'a Lagos line stays in Lagos')
  assert.ok(ids(context(), 'caller').includes('call-1') && !ids(context(), 'walker').includes('call-1'))
  assert.ok(!ids(context(), 'walker').includes('sell-1') && ids(context(), 'regular').includes('sell-1'))
  const evented = linesFor(context({ event: { title: 'the cultural fair', when: 'today at 6PM' } }), 'walker').find((l) => l.id === 'news-1')
  assert.equal(evented?.text, 'They say there is the cultural fair today at 6PM. Will you go?')
  assert.ok(!ids(context()).includes('news-1'), 'no event, no line about one')
  assert.equal(new Set(BARKS.map((b) => b.id)).size, BARKS.length, 'ids are unique')
  for (const line of BARKS) assert.ok(line.text.length > 8 && line.text.length < 120, line.id)
})

const FACTS: PublicRecord = {
  news: ['Ada Obi won the Ikeja council seat', 'Governor opened voting'], event: { title: 'the cultural fair', where: 'the Arts Centre', when: 'tomorrow at 4PM' }, rain: 'soon',
  shop: { name: 'Sade Fabrics', street: 'Allen Avenue' }, board: { name: 'pride', city: 'Ibadan' }, office: { title: 'chairman', holder: 'Chief Bello' }, housewarming: { street: 'Bode Thomas Street' },
}

test('gossip is built only from the public record, and says what the record says', () => {
  const lines = gossipFrom(FACTS, 'Lagos'), text = lines.map((l) => l.text).join('\n')
  for (const part of ['Ada Obi won the Ikeja council seat', 'the cultural fair at the Arts Centre, tomorrow at 4PM', 'rain before long', 'Sade Fabrics', 'Allen Avenue', 'Ibadan is on top', 'chairman is Chief Bello', 'Bode Thomas Street']) assert.ok(text.includes(part), part)
  assert.deepEqual(gossipFrom({}, 'Lagos'), [])
  assert.deepEqual(gossipFrom(null, 'Lagos'), [])
  assert.equal(new Set(lines.map((l) => l.id)).size, lines.length)
})

test('PRIVACY: nothing outside the public record can come out of a gossip line, whatever is put in the record object', () => {
  const SECRET = ['SECRET-CASH-731', 'SECRET-PLACE-922', 'SECRET-MSG-418', 'SECRET-ONLINE-205', 'SECRET-NAME-660', 'SECRET-EMAIL-117']
  const poisoned = {
    ...FACTS,
    balance: SECRET[0], cash: SECRET[0], wallet: SECRET[0], money: SECRET[0], location: SECRET[1], venue: SECRET[1], position: SECRET[1], messages: [SECRET[2]], inbox: SECRET[2], text: SECRET[2],
    online: SECRET[3], lastSeen: SECRET[3], playerName: SECRET[4], name: SECRET[4], friends: [SECRET[4]], email: SECRET[5], phone: SECRET[5],
    shop: { ...FACTS.shop!, owner: SECRET[4], takings: SECRET[0], where: SECRET[1] }, housewarming: { ...FACTS.housewarming!, host: SECRET[4], home: SECRET[1] },
    board: { ...FACTS.board!, leader: SECRET[4], wealth: SECRET[0] }, event: { ...FACTS.event!, guests: [SECRET[4]], at: SECRET[1] }, office: { ...FACTS.office!, votes: SECRET[0], home: SECRET[1] },
  } as unknown as PublicRecord
  const out = gossipFrom(poisoned, 'Lagos').map((l) => l.text).join('\n') + linesFor(context({ record: poisoned }), 'regular').map((l) => l.text).join('\n')
  for (const secret of SECRET) assert.ok(!out.includes(secret), `${secret} leaked`)
  assert.ok(out.length > 100)
})

test('PRIVACY: the gossip and voice sources name no private field at all', () => {
  const FORBIDDEN = /\b(balance|cash|wallet|money|naira|salary|earned|savings|location|position|coordinates|online|lastSeen|presence|inbox|message|messages|email|phone|password|token|friends|relationship)\b/i
  for (const file of ['gossip.ts', 'voice.ts']) {
    const source = readFileSync(new URL(`./${file}`, import.meta.url), 'utf8')
    // the explanatory header may name them (it is the rule); the code, the strings and the types may not
    const code = source.split('\n').filter((line) => !line.trimStart().startsWith('//') && !line.trimStart().startsWith('*') && !line.trimStart().startsWith('/**')).join('\n')
    const hit = FORBIDDEN.exec(code)
    assert.equal(hit, null, `${file} mentions ${hit?.[0]}`)
  }
  // the record type is the whole of what can be said
  const source = readFileSync(new URL('./gossip.ts', import.meta.url), 'utf8')
  const record = /export interface PublicRecord \{([\s\S]*?)\n\}/.exec(source)?.[1] ?? ''
  const members = [...record.matchAll(/^\s{2}(\w+)\??:/gm)].map((m) => m[1])
  assert.deepEqual(members, ['news', 'event', 'rain', 'shop', 'board', 'office', 'housewarming'], 'adding a member to the public record is a decision, and this test is where it is made')
})
