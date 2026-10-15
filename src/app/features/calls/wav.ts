// A recording made ready for the transcription route: 16 kHz, 16-bit, mono WAV. The gateway's transcription models take WAV, MP3, FLAC and Ogg/Opus but not the WebM or MP4 that a
// phone's recorder makes, so the page decodes what it recorded and writes WAV itself (about 32 KB a second: 15 seconds of holding the button is 480 KB). Pure functions.

export const WAV_RATE = 16000

/** Mono samples at `from` Hz to `to` Hz by averaging the source samples each new sample covers (enough for speech; no filter library). */
export function resample(samples: Float32Array, from: number, to: number = WAV_RATE): Float32Array {
  if (!(from > 0) || !(to > 0) || samples.length === 0) return new Float32Array(0)
  if (from === to) return samples
  const length = Math.floor(samples.length * to / from), step = from / to, out = new Float32Array(length)
  for (let i = 0; i < length; i++) {
    const start = Math.floor(i * step), end = Math.min(samples.length, Math.max(start + 1, Math.floor((i + 1) * step)))
    let sum = 0
    for (let j = start; j < end; j++) sum += samples[j]!
    out[i] = sum / (end - start)
  }
  return out
}

/** Several channels down to one. */
export function mixDown(channels: readonly Float32Array[]): Float32Array {
  if (channels.length === 0) return new Float32Array(0)
  if (channels.length === 1) return channels[0]!
  const out = new Float32Array(channels[0]!.length)
  for (const channel of channels) for (let i = 0; i < out.length; i++) out[i]! += (channel[i] ?? 0) / channels.length
  return out
}

/** 16-bit PCM mono WAV bytes of samples in [-1, 1] at `rate` Hz. */
export function encodeWav(samples: Float32Array, rate: number = WAV_RATE): Uint8Array {
  const bytes = new Uint8Array(44 + samples.length * 2), view = new DataView(bytes.buffer)
  const text = (at: number, value: string): void => { for (let i = 0; i < value.length; i++) bytes[at + i] = value.charCodeAt(i) }
  text(0, 'RIFF'); view.setUint32(4, 36 + samples.length * 2, true); text(8, 'WAVE'); text(12, 'fmt ')
  view.setUint32(16, 16, true); view.setUint16(20, 1, true); view.setUint16(22, 1, true)
  view.setUint32(24, rate, true); view.setUint32(28, rate * 2, true); view.setUint16(32, 2, true); view.setUint16(34, 16, true)
  text(36, 'data'); view.setUint32(40, samples.length * 2, true)
  for (let i = 0; i < samples.length; i++) { const s = Math.max(-1, Math.min(1, samples[i]!)); view.setInt16(44 + i * 2, s < 0 ? s * 0x8000 : s * 0x7fff, true) }
  return bytes
}

/** Bytes to base64 in chunks (a long array breaks `String.fromCharCode(...bytes)`). */
export function toBase64(bytes: Uint8Array): string {
  let text = ''
  for (let i = 0; i < bytes.length; i += 0x8000) text += String.fromCharCode(...bytes.subarray(i, i + 0x8000))
  return btoa(text)
}
