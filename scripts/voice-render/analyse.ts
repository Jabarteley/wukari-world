// Measurements on rendered samples: loudness, pitch, spectral peaks, a WAV file and a spectrogram PNG. Plain Node, no dependencies.
import { deflateSync } from 'node:zlib'

export const db = (x: number): number => 20 * Math.log10(Math.max(x, 1e-9))

export function fromBase64(text: string): Float32Array {
  const bytes = Buffer.from(text, 'base64')
  const pcm = new Int16Array(bytes.buffer, bytes.byteOffset, bytes.length / 2)
  const out = new Float32Array(pcm.length)
  for (let i = 0; i < pcm.length; i++) out[i] = (pcm[i] as number) / 32767
  return out
}
export const mono = (l: Float32Array, r: Float32Array): Float32Array => l.map((v, i) => (v + (r[i] as number)) / 2)

export function wav(left: Float32Array, right: Float32Array, rate: number): Buffer {
  const n = left.length, out = Buffer.alloc(44 + n * 4)
  out.write('RIFF', 0); out.writeUInt32LE(36 + n * 4, 4); out.write('WAVEfmt ', 8); out.writeUInt32LE(16, 16); out.writeUInt16LE(1, 20); out.writeUInt16LE(2, 22)
  out.writeUInt32LE(rate, 24); out.writeUInt32LE(rate * 4, 28); out.writeUInt16LE(4, 32); out.writeUInt16LE(16, 34); out.write('data', 36); out.writeUInt32LE(n * 4, 40)
  for (let i = 0; i < n; i++) {
    out.writeInt16LE(Math.round(Math.max(-1, Math.min(1, left[i] as number)) * 32767), 44 + i * 4)
    out.writeInt16LE(Math.round(Math.max(-1, Math.min(1, right[i] as number)) * 32767), 46 + i * 4)
  }
  return out
}

/** In-place radix-2 FFT. */
function fft(re: Float64Array, im: Float64Array): void {
  const n = re.length
  for (let i = 1, j = 0; i < n; i++) {
    let bit = n >> 1
    for (; j & bit; bit >>= 1) j ^= bit
    j ^= bit
    if (i < j) { [re[i], re[j]] = [re[j] as number, re[i] as number]; [im[i], im[j]] = [im[j] as number, im[i] as number] }
  }
  for (let len = 2; len <= n; len <<= 1) {
    const ang = -2 * Math.PI / len, wr = Math.cos(ang), wi = Math.sin(ang)
    for (let i = 0; i < n; i += len) {
      let cr = 1, ci = 0
      for (let k = 0; k < len / 2; k++) {
        const a = i + k, b = i + k + len / 2
        const tr = (re[b] as number) * cr - (im[b] as number) * ci, ti = (re[b] as number) * ci + (im[b] as number) * cr
        re[b] = (re[a] as number) - tr; im[b] = (im[a] as number) - ti; re[a] = (re[a] as number) + tr; im[a] = (im[a] as number) + ti
        const nr = cr * wr - ci * wi; ci = cr * wi + ci * wr; cr = nr
      }
    }
  }
}

/** Magnitude spectra (dB) of overlapping Hann windows. */
export function stft(x: Float32Array, rate: number, size = 1024, hop = 256): { frames: Float64Array[]; hz: (bin: number) => number } {
  const frames: Float64Array[] = [], win = new Float64Array(size).map((_, i) => 0.5 - 0.5 * Math.cos(2 * Math.PI * i / (size - 1)))
  for (let at = 0; at + size <= x.length; at += hop) {
    const re = new Float64Array(size), im = new Float64Array(size)
    for (let i = 0; i < size; i++) re[i] = (x[at + i] as number) * (win[i] as number)
    fft(re, im)
    frames.push(new Float64Array(size / 2).map((_, k) => db(Math.hypot(re[k] as number, im[k] as number) / size * 4)))
  }
  return { frames, hz: bin => bin * rate / size }
}

/** Median pitch of the voiced parts (autocorrelation, 70..420 Hz), or 0. */
export function pitchOf(x: Float32Array, rate: number): number {
  const size = Math.round(rate * 0.04), hop = Math.round(rate * 0.01), lo = Math.round(rate / 420), hi = Math.round(rate / 70), found: number[] = []
  let loud = 0
  for (let i = 0; i < x.length; i++) loud = Math.max(loud, Math.abs(x[i] as number))
  for (let at = 0; at + size + hi < x.length; at += hop) {
    let e = 0
    for (let i = 0; i < size; i++) e += (x[at + i] as number) ** 2
    if (Math.sqrt(e / size) < loud * 0.12) continue
    let best = 0, lag = 0
    for (let l = lo; l <= hi; l++) {
      let c = 0, e2 = 0
      for (let i = 0; i < size; i++) { c += (x[at + i] as number) * (x[at + i + l] as number); e2 += (x[at + i + l] as number) ** 2 }
      const score = c / Math.sqrt(e * e2 + 1e-12)
      if (score > best) { best = score; lag = l }
    }
    if (best > 0.55 && lag) found.push(rate / lag)
  }
  found.sort((a, b) => a - b)
  return found.length ? found[Math.floor(found.length / 2)] as number : 0
}

/** Long-term spectrum: the centroid over 200..4000 Hz and the strongest smoothed peak in each of three formant bands. */
export function spectrumOf(x: Float32Array, rate: number): { centroid: number; peaks: [number, number, number] } {
  const { frames, hz } = stft(x, rate, 2048, 1024)
  const bins = (frames[0] as Float64Array).length, power = new Float64Array(bins)
  for (const f of frames) for (let k = 0; k < bins; k++) power[k] = (power[k] as number) + 10 ** ((f[k] as number) / 10)
  let num = 0, den = 0
  for (let k = 0; k < bins; k++) { const f = hz(k); if (f >= 200 && f <= 4000) { num += f * (power[k] as number); den += power[k] as number } }
  const smooth = new Float64Array(bins)
  for (let k = 8; k < bins - 8; k++) { let s = 0; for (let j = -8; j <= 8; j++) s += power[k + j] as number; smooth[k] = s }
  const peak = (a: number, b: number): number => { let best = 0, at = 0; for (let k = 0; k < bins; k++) { const f = hz(k); if (f >= a && f <= b && (smooth[k] as number) > best) { best = smooth[k] as number; at = f } } return Math.round(at) }
  return { centroid: Math.round(num / Math.max(den, 1e-12)), peaks: [peak(250, 1000), peak(1000, 2200), peak(2200, 3600)] }
}

/** A spectrogram as a PNG (time across, 0..5 kHz up, level as colour). */
export function spectrogramPng(x: Float32Array, rate: number, height = 220): Buffer {
  const { frames } = stft(x, rate, 1024, 512), maxBin = Math.floor(5000 / (rate / 1024))
  const width = frames.length, raw = Buffer.alloc((width * 3 + 1) * height)
  const colour = (v: number): [number, number, number] => { const t = Math.max(0, Math.min(1, (v + 100) / 70)); return [Math.round(255 * Math.min(1, t * 1.6)), Math.round(255 * Math.max(0, t * 1.4 - 0.4)), Math.round(255 * (t < 0.5 ? t * 1.2 : Math.max(0, 1.4 - t * 1.4)))] }
  for (let y = 0; y < height; y++) {
    const row = y * (width * 3 + 1); raw[row] = 0
    const bin = Math.min(maxBin - 1, Math.floor((height - 1 - y) / height * maxBin))
    for (let xk = 0; xk < width; xk++) { const [r, g, b] = colour((frames[xk] as Float64Array)[bin] as number); raw[row + 1 + xk * 3] = r; raw[row + 2 + xk * 3] = g; raw[row + 3 + xk * 3] = b }
  }
  const chunk = (type: string, data: Buffer): Buffer => {
    const out = Buffer.alloc(12 + data.length); out.writeUInt32BE(data.length, 0); out.write(type, 4); data.copy(out, 8)
    let c = 0xffffffff
    for (let i = 4; i < 8 + data.length; i++) { c ^= out[i] as number; for (let k = 0; k < 8; k++) c = c & 1 ? (c >>> 1) ^ 0xedb88320 : c >>> 1 }
    out.writeUInt32BE((c ^ 0xffffffff) >>> 0, 8 + data.length); return out
  }
  const head = Buffer.alloc(13); head.writeUInt32BE(width, 0); head.writeUInt32BE(height, 4); head[8] = 8; head[9] = 2
  return Buffer.concat([Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]), chunk('IHDR', head), chunk('IDAT', deflateSync(raw)), chunk('IEND', Buffer.alloc(0))])
}
