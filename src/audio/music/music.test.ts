import assert from 'node:assert/strict'
import test from 'node:test'
import { FakeContext, asContext } from '../fakeAudio.ts'
import { analyzeSong } from './analysis.ts'
import { composeSong } from './composer.ts'
import { VoiceBudget } from './instruments.ts'
import { Band, songDuration, songEvents } from './sequencer.ts'
import { songs } from './songs.ts'
import type { MusicStyle, Song } from './types.ts'

test('twelve original scores cover all eight styles and six ordered sections', () => {
  assert.equal(songs.length, 12)
  assert.equal(new Set(songs.map(song => song.id)).size, 12)
  const expected = ['intro', 'A', 'B', 'break', 'A-prime', 'outro']
  for (const song of songs) {
    assert.deepEqual(song.sections.map(section => section.kind), expected, song.id)
    assert.ok(songDuration(song) > 60 && songDuration(song) < 95, song.id)
    assert.equal(song.lead.length, 16, song.id)
    assert.equal(song.answer.length, 16, song.id)
  }
  assert.deepEqual(new Set(songs.map(song => song.style)), new Set<MusicStyle>(['highlife', 'palm-wine', 'juju', 'afrobeats', 'amapiano-lite', 'cape-jazz', 'bossa', 'marimba']))
})

test('every score moves through chords, lands on chord tones, and changes its phrase', () => {
  for (const song of [...songs, ...Array.from({ length: 10 }, (_, seed) => composeSong(seed + 3, songs[seed % songs.length]?.style ?? 'highlife'))]) {
    const report = analyzeSong(song)
    assert.ok(report.chordChangesPerEightBars > 2, `${song.id}: chord changes`)
    assert.ok(report.strongBeatChordToneShare >= 0.94, `${song.id}: ${report.strongBeatChordToneShare}`)
    assert.ok(report.rhythmicPatterns >= 3, `${song.id}: rhythm`)
    assert.equal(report.monotony, false, `${song.id}: pitch drift ${report.pitchHistogramDrift}, onset drift ${report.onsetDrift}`)
    const key = new Set([0, 2, 4, 5, 7, 9, 11])
    for (const event of songEvents(song)) if (event.midi !== null) assert.ok(key.has(((event.midi - song.key) % 12 + 12) % 12), `${song.id}: ${event.instrument} out of key at ${event.beat}`)
  }
})

test('the monotony detector rejects a flat melody', () => {
  const base = songs[0]
  assert.ok(base)
  const dull: Song = { ...base, progression: [0, 0, 0, 0], lead: Array(16).fill(0), answer: Array(16).fill(0) }
  assert.equal(analyzeSong(dull).monotony, true)
})

test('the monotony detector rejects a repeated rhythm even when pitches change', () => {
  const base = songs[0]
  assert.ok(base)
  const repeated: Song = { ...base, lead: [0, null, null, null, 4, null, null, null, 7, null, null, null, 4, null, null, null], answer: [7, null, null, null, 0, null, null, null, 4, null, null, null, 7, null, null, null] }
  const report = analyzeSong(repeated)
  assert.ok(report.distinctPitches >= 6)
  assert.equal(report.monotony, true)
})

test('composition is deterministic for a seed and varies across seeds', () => {
  const first = composeSong(42, 'highlife')
  assert.deepEqual(first, composeSong(42, 'highlife'))
  assert.notDeepEqual(first, composeSong(43, 'highlife'))
  assert.notDeepEqual(first, composeSong(42, 'marimba'))
})

test('lookahead schedules only events within the requested audio-clock horizon', () => {
  const ctx = new FakeContext()
  const band = new Band(asContext(ctx), asContext(ctx).destination)
  const song = songs[0]
  assert.ok(song)
  const end = band.schedule(song, 5)
  assert.ok(Math.abs(end - (5 + songDuration(song))) < 1e-9)
  band.fill(4.9)
  assert.equal(ctx.sources.length, 0)
  band.fill(5.1)
  assert.ok(ctx.sources.length > 0)
  assert.ok(ctx.sources.every(source => source.started.every(at => at < 5.1)))
  const firstCount = ctx.sources.length
  band.fill(5.1)
  assert.equal(ctx.sources.length, firstCount, 'same horizon does not schedule twice')
  band.fill(6.2)
  assert.ok(ctx.sources.length > firstCount)
  band.dispose()
})

test('missed notes after suspension are skipped instead of bursting on resume', () => {
  const ctx = new FakeContext()
  const band = new Band(asContext(ctx), asContext(ctx).destination)
  const song = songs[0]
  assert.ok(song)
  band.schedule(song, 0)
  ctx.currentTime = 30
  band.fill(30.2)
  assert.ok(ctx.sources.every(source => source.started.every(at => at >= 29.95)))
  band.dispose()
})

test('the shared reservation budget bounds two simultaneous bands', () => {
  const budget = new VoiceBudget(24)
  const ctx = new FakeContext()
  const first = new Band(asContext(ctx), asContext(ctx).destination, budget)
  const second = new Band(asContext(ctx), asContext(ctx).destination, budget)
  const song = songs[0]
  assert.ok(song)
  first.schedule(song, 0)
  second.schedule(song, 0)
  first.fill(3)
  second.fill(3)
  assert.ok(budget.count(0) <= 24)
  for (let at = 0; at < 3; at += 0.05) assert.ok(budget.count(at) <= 24, `${at}s`)
  first.dispose(); second.dispose()
  assert.equal(budget.count(0), 0)
})

test('events stay inside their sections and the last event precedes the song end', () => {
  for (const song of songs) {
    const events = songEvents(song)
    assert.ok(events.length > 120, song.id)
    assert.ok(events.every(event => event.beat >= 0 && event.beat < songDuration(song) * song.tempo / 60), song.id)
    assert.ok(events.some(event => event.section === 'A-prime'), song.id)
    assert.ok(events.some(event => event.section === 'outro'), song.id)
  }
})
