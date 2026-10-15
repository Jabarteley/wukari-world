// The speech-to-text measurement: the word error rate, the groups and the table, on a made-up folder and a fake gateway. No recordings of real people are in this repository.
import assert from 'node:assert/strict'
import test from 'node:test'
import { ENDPOINT, discover, measure, table, viaGateway } from './bench.ts'
import type { Files, GatewayRun } from './bench.ts'
import { percentile, summarise, wer, words } from './wer.ts'

test('words: lower case, accents and punctuation gone, apostrophes inside words kept, numbers as written', () => {
  assert.deepEqual(words('Wetin dey happen for the Square tonight?'), ['wetin', 'dey', 'happen', 'for', 'the', 'square', 'tonight'])
  assert.deepEqual(words("Don't  go, Ọ̀gá! It's 'fine'"), ["don't", 'go', 'oga', "it's", 'fine'])
  assert.deepEqual(words('Two thousand, 500 naira.'), ['two', 'thousand', '500', 'naira'])
  assert.deepEqual(words('   '), [])
})

test('wer: substitutions, deletions and insertions are counted, and an exact match is zero', () => {
  assert.deepEqual(wer('how much is the red cloth', 'how much is the red cloth'), { refWords: 6, edits: 0, substitutions: 0, deletions: 0, insertions: 0 })
  assert.deepEqual(wer('how much is the red cloth', 'how much is the bread cloth'), { refWords: 6, edits: 1, substitutions: 1, deletions: 0, insertions: 0 })
  assert.deepEqual(wer('how much is the red cloth', 'how much red cloth'), { refWords: 6, edits: 2, substitutions: 0, deletions: 2, insertions: 0 })
  assert.deepEqual(wer('how much', 'how very much now'), { refWords: 2, edits: 2, substitutions: 0, deletions: 0, insertions: 2 })
  assert.deepEqual(wer('a b c d', 'x y z w'), { refWords: 4, edits: 4, substitutions: 4, deletions: 0, insertions: 0 })
  // Case and punctuation do not count; nothing heard is every word deleted.
  assert.equal(wer('Where is the library?', 'where is the LIBRARY').edits, 0)
  assert.deepEqual(wer('where is the library', ''), { refWords: 4, edits: 4, substitutions: 0, deletions: 4, insertions: 0 })
  assert.equal(wer('', 'something').edits, 1)
  // It can pass one hundred percent.
  assert.ok(wer('hi', 'oh hello there my friend').edits / 1 > 1)
})

test('percentile: the nearest rank, and nothing for an empty list', () => {
  assert.equal(percentile([], 50), null)
  assert.equal(percentile([5], 90), 5)
  assert.deepEqual([percentile([100, 200, 300, 400], 50), percentile([100, 200, 300, 400], 90), percentile([400, 100, 300, 200], 25)], [200, 400, 100])
})

test('summarise: WER is total edits over total reference words, per group and way and overall; a failed recording counts every word wrong', () => {
  const rows = [
    { group: 'ng', id: 'ng/1', way: 'Gateway', reference: 'one two three four', hypothesis: 'one two three four', ms: 900 },
    { group: 'ng', id: 'ng/2', way: 'Gateway', reference: 'five six', hypothesis: 'five', ms: 1100 },
    { group: 'pidgin', id: 'pidgin/1', way: 'Gateway', reference: 'wetin dey happen', hypothesis: null, ms: null, error: 'HTTP 503' },
    { group: 'ng', id: 'ng/1', way: 'Browser', reference: 'one two three four', hypothesis: 'one too three for', ms: 400 },
  ]
  const by = (group: string, way: string) => summarise(rows).find((item) => item.group === group && item.way === way)!
  assert.deepEqual([by('ng', 'Gateway').samples, by('ng', 'Gateway').refWords, by('ng', 'Gateway').edits, by('ng', 'Gateway').wer], [2, 6, 1, 1 / 6 * 100])
  assert.deepEqual([by('ng', 'Gateway').medianMs, by('ng', 'Gateway').p90Ms], [900, 1100])
  assert.deepEqual([by('pidgin', 'Gateway').failed, by('pidgin', 'Gateway').wer, by('pidgin', 'Gateway').medianMs], [1, 100, null])
  assert.equal(by('ng', 'Browser').wer, 50)
  assert.equal(by('all', 'Gateway').wer, (1 + 3) / 9 * 100)
  assert.equal(summarise([]).length, 0)
})

/** A folder of made-up files in memory. */
function folder(entries: Record<string, string>): Files {
  return { list: async () => Object.keys(entries), text: async (path) => entries[path] ?? null, base64: async (path) => Buffer.from(entries[path] ?? '').toString('base64') }
}

test('discover: group folders or file name prefixes, references and browser results beside the audio, and recordings with no reference are skipped', async () => {
  const found = await discover(folder({
    'ng/001.wav': 'x', 'ng/001.txt': 'How much is the red cloth?\n', 'ng/001.browser.json': JSON.stringify({ hypothesis: 'how much is the red cloth', ms: 640 }),
    'pidgin/002.mp3': 'x', 'pidgin/002.txt': 'Wetin dey happen for the Square?',
    'gh-003.wav': 'x', 'gh-003.txt': 'Where is the library?', 'gh-003.browser.json': 'not json',
    'ke/004.wav': 'x', 'notes.md': 'hello', 'ke/005.ogg': 'x', 'ke/005.txt': '   ',
  }))
  assert.deepEqual(found.samples.map((item) => [item.group, item.id, item.mediaType]), [['gh', 'gh/gh-003', 'audio/wav'], ['ng', 'ng/001', 'audio/wav'], ['pidgin', 'pidgin/002', 'audio/mpeg']])
  assert.deepEqual(found.skipped.sort(), ['ke/004.wav', 'ke/005.ogg'])
  const ng = found.samples.find((item) => item.group === 'ng')!
  assert.deepEqual([ng.reference, ng.browser], ['How much is the red cloth?', { hypothesis: 'how much is the red cloth', ms: 640 }])
  assert.equal(found.samples.find((item) => item.group === 'gh')?.browser, null, 'a bad sidecar is no result')
})

function gateway(replies: (index: number) => { status: number; body: string }): GatewayRun & { sent: { url: string; headers: Record<string, string>; body: { audio: string; mediaType: string } }[] } {
  const sent: { url: string; headers: Record<string, string>; body: { audio: string; mediaType: string } }[] = []
  let clock = 0
  return {
    sent, key: 'k', model: 'microsoft/mai-transcribe-2', base64: async (path) => Buffer.from(path).toString('base64'),
    now: () => (clock += 250),
    fetch: async (url, init) => { sent.push({ url, headers: init.headers, body: JSON.parse(init.body) as { audio: string; mediaType: string } }); const made = replies(sent.length - 1); return { status: made.status, text: async () => made.body } },
  }
}

test('the gateway run sends what the route sends, takes the delay from the clock, and keeps going when one recording fails', async () => {
  const found = await discover(folder({ 'ng/1.wav': 'a', 'ng/1.txt': 'one two', 'ng/1.browser.json': JSON.stringify({ hypothesis: 'one too', ms: 500 }), 'pidgin/2.wav': 'b', 'pidgin/2.txt': 'three four' }))
  const run = gateway((index) => (index === 0 ? { status: 200, body: JSON.stringify({ text: 'one two', durationInSeconds: 2 }) } : { status: 500, body: 'no' }))
  const rows = await measure(found.samples, run)
  assert.equal(run.sent[0]?.url, ENDPOINT)
  assert.deepEqual([run.sent[0]?.headers['ai-model-id'], run.sent[0]?.headers['ai-transcription-model-specification-version'], run.sent[0]?.headers['Authorization']], ['microsoft/mai-transcribe-2', '4', 'Bearer k'])
  assert.equal(run.sent[0]?.body.mediaType, 'audio/wav')
  assert.deepEqual(rows.map((row) => [row.id, row.way, row.hypothesis, row.ms, row.error]), [['ng/1', 'Gateway', 'one two', 250, undefined], ['ng/1', 'Browser', 'one too', 500, undefined], ['pidgin/2', 'Gateway', null, null, 'HTTP 500']])
  const text = table(summarise(rows))
  assert.match(text, /\| Accent group \| Recordings \| Browser: words wrong \| Browser: delay \(median \/ 90th\) \| Gateway: words wrong/)
  assert.match(text, /\| Nigerian English \| 1 \| 50\.0% \| 500 ms \/ 500 ms \| 0\.0% \| 250 ms \/ 250 ms \|/)
  assert.match(text, /\| Nigerian Pidgin \| 1 \| – \| – \| 100\.0% \(1 failed\) \|/)
  assert.match(text, /\| \*\*All\*\* \|/)
  assert.equal(table([]), 'Not yet measured.')
  const bad = await viaGateway(gateway(() => ({ status: 200, body: '{"nothing":1}' })), found.samples[0]!)
  assert.deepEqual([bad.hypothesis, bad.error], [null, 'no text in the answer'])
})
