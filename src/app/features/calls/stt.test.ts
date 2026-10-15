// Speech to text behind one interface: which engine is chosen, the fallback where the browser has no recognition or the first way fails to start, and the wav the gateway way sends.
import assert from 'node:assert/strict'
import test from 'node:test'
import { WAV_RATE, encodeWav, mixDown, resample, toBase64 } from './wav.ts'
import { begin, order, pick, readChoice, tidy } from './stt.ts'
import type { Capture, SttEngine, SttKind } from './stt.ts'

function engine(kind: SttKind, options: { available?: boolean; fail?: string; text?: string } = {}): SttEngine & { began: number } {
  const made = {
    kind, began: 0,
    available: () => options.available !== false,
    async begin(): Promise<Capture> {
      made.began++
      if (options.fail) throw new Error(options.fail)
      return { async stop() { return { text: options.text ?? kind, ms: 5, kind } }, cancel() {} }
    },
  }
  return made
}

test('the order: the person’s choice first, "automatic" follows the server’s default, the other way second', () => {
  assert.deepEqual(order('auto', 'browser'), ['browser', 'gateway'])
  assert.deepEqual(order('auto', 'gateway'), ['gateway', 'browser'])
  assert.deepEqual(order('browser', 'gateway'), ['browser', 'gateway'])
  assert.deepEqual(order('gateway', 'browser'), ['gateway', 'browser'])
  assert.equal(readChoice('gateway'), 'gateway')
  assert.equal(readChoice('nonsense'), 'auto')
  assert.equal(readChoice(null), 'auto')
})

test('pick: the chosen way when it is there, the other when it is not, nothing when neither', () => {
  const both = [engine('browser'), engine('gateway')]
  assert.deepEqual([pick(both, 'auto', 'browser')?.engine.kind, pick(both, 'auto', 'browser')?.fellBack], ['browser', false])
  assert.equal(pick(both, 'gateway', 'browser')?.engine.kind, 'gateway', 'a person’s choice beats the default')
  const noBrowser = [engine('browser', { available: false }), engine('gateway')]
  assert.deepEqual([pick(noBrowser, 'auto', 'browser')?.engine.kind, pick(noBrowser, 'auto', 'browser')?.fellBack], ['gateway', true], 'a browser with no recognition falls back to the gateway')
  assert.deepEqual([pick(noBrowser, 'browser', 'gateway')?.engine.kind, pick(noBrowser, 'browser', 'gateway')?.fellBack], ['gateway', true])
  const none = [engine('browser', { available: false }), engine('gateway', { available: false })]
  assert.equal(pick(none, 'auto', 'browser'), null)
  assert.equal(pick([], 'auto', 'browser'), null)
})

test('begin: switching on a choice, and a way that cannot start hands over to the other, but a refused microphone is the person’s answer', async () => {
  const browser = engine('browser'), gateway = engine('gateway')
  const first = await begin([browser, gateway], 'auto', 'browser')
  assert.deepEqual([first?.kind, first?.fellBack, browser.began, gateway.began], ['browser', false, 1, 0])
  assert.equal((await begin([browser, gateway], 'gateway', 'browser'))?.kind, 'gateway')
  // The browser engine fails to start (a service error): the gateway way takes over.
  const broken = engine('browser', { fail: 'network' }), spare = engine('gateway')
  const over = await begin([broken, spare], 'auto', 'browser')
  assert.deepEqual([over?.kind, over?.fellBack, broken.began, spare.began], ['gateway', true, 1, 1])
  assert.equal((await over?.capture.stop())?.text, 'gateway')
  // No recognition in the browser at all.
  const none = await begin([engine('browser', { available: false }), engine('gateway')], 'auto', 'browser')
  assert.deepEqual([none?.kind, none?.fellBack], ['gateway', true])
  // A refused microphone is not retried with another way.
  const denied = engine('browser', { fail: 'denied' }), other = engine('gateway')
  await assert.rejects(begin([denied, other], 'auto', 'browser'), /denied/)
  assert.equal(other.began, 0)
  // Nothing can start.
  assert.equal(await begin([engine('browser', { fail: 'x' }), engine('gateway', { fail: 'y' })], 'auto', 'browser'), null)
  assert.equal(await begin([], 'auto', 'browser'), null)
})

test('words are tidied before they are sent', () => {
  assert.equal(tidy('  how   far\n Mama  '), 'how far Mama')
  assert.equal(tidy('x'.repeat(400)).length, 300)
})

test('the recording is 16 kHz mono 16-bit WAV: a header the server reads, the right size, resampled and mixed down', () => {
  const samples = new Float32Array(WAV_RATE * 2).map((_, n) => Math.sin(n / 20))
  const wav = encodeWav(samples)
  assert.equal(wav.length, 44 + samples.length * 2)
  const text = (at: number): string => String.fromCharCode(...wav.subarray(at, at + 4))
  assert.deepEqual([text(0), text(8), text(12), text(36)], ['RIFF', 'WAVE', 'fmt ', 'data'])
  const view = new DataView(wav.buffer)
  assert.deepEqual([view.getUint16(20, true), view.getUint16(22, true), view.getUint32(24, true), view.getUint32(28, true), view.getUint16(34, true), view.getUint32(40, true)], [1, 1, 16000, 32000, 16, samples.length * 2])
  assert.equal(view.getUint32(4, true), wav.length - 8)
  // Clipping is held at full scale.
  const loud = new DataView(encodeWav(new Float32Array([2, -2, 0.5])).buffer)
  assert.deepEqual([loud.getInt16(44, true), loud.getInt16(46, true)], [32767, -32768])
  // 48 kHz to 16 kHz keeps the length in proportion; the same rate is untouched; an empty recording stays empty.
  assert.equal(resample(new Float32Array(48000), 48000).length, 16000)
  const same = new Float32Array(10); assert.equal(resample(same, 16000), same)
  assert.equal(resample(new Float32Array(0), 48000).length, 0)
  assert.deepEqual([...resample(new Float32Array([1, 3, 5, 7]), 4, 2)], [2, 6])
  assert.deepEqual([...mixDown([new Float32Array([1, 1]), new Float32Array([0, 1])])], [0.5, 1])
  assert.equal(toBase64(new Uint8Array([1, 2, 3, 250])), Buffer.from([1, 2, 3, 250]).toString('base64'))
  assert.equal(toBase64(new Uint8Array(100000)).length, Math.ceil(100000 / 3) * 4, 'a long recording does not overflow the call stack')
})
