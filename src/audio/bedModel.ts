// A model of what a soundscape's continuous part (its beds, not its one-shots) puts into the room, from the recipe alone:
// the real noise buffers are measured, each bed's filter and gain are applied analytically, and the hums are lines.
// Used by the tests to hold every soundscape to the "no static" targets without a browser.
import { Synth, NOISE_RATE, type Colour } from './synth.ts'
import { FakeContext, asContext } from './fakeAudio.ts'
import { BED_GAIN, type Bed, type ScapeSpec } from './scape.ts'

const N = 2048
function fft(re: Float64Array, im: Float64Array): void {
  const n = re.length
  for (let i = 1, j = 0; i < n; i++) { let bit = n >> 1; for (; j & bit; bit >>= 1) j ^= bit; j ^= bit; if (i < j) { [re[i], re[j]] = [re[j] as number, re[i] as number]; [im[i], im[j]] = [im[j] as number, im[i] as number] } }
  for (let len = 2; len <= n; len <<= 1) {
    const ang = -2 * Math.PI / len, wr = Math.cos(ang), wi = Math.sin(ang)
    for (let i = 0; i < n; i += len) {
      let cr = 1, ci = 0
      for (let k = 0; k < len / 2; k++) {
        const a = i + k, b = a + len / 2, xr = (re[b] as number) * cr - (im[b] as number) * ci, xi = (re[b] as number) * ci + (im[b] as number) * cr
        re[b] = (re[a] as number) - xr; im[b] = (im[a] as number) - xi; re[a] = (re[a] as number) + xr; im[a] = (im[a] as number) + xi
        const t = cr * wr - ci * wi; ci = cr * wi + ci * wr; cr = t
      }
    }
  }
}

/** Power per bin (N / 2 bins up to NOISE_RATE / 2) of a noise colour as the synth generates it. */
const noisePower = new Map<Colour, Float64Array>()
function powerOf(colour: Colour): Float64Array {
  let p = noisePower.get(colour)
  if (p) return p
  const synth = new Synth(asContext(new FakeContext()), {}), data = synth.noiseBuffer(colour).getChannelData(0)
  p = new Float64Array(N / 2)
  let frames = 0
  const re = new Float64Array(N), im = new Float64Array(N)
  for (let s = 0; s + N <= data.length; s += N / 2) {
    for (let i = 0; i < N; i++) { re[i] = (data[s + i] as number) * (0.5 - 0.5 * Math.cos(2 * Math.PI * i / N)); im[i] = 0 }
    fft(re, im)
    for (let k = 0; k < N / 2; k++) p[k] = (p[k] as number) + (re[k] as number) ** 2 + (im[k] as number) ** 2
    frames++
  }
  for (let k = 0; k < N / 2; k++) p[k] = (p[k] as number) / frames / (N * 0.375) / (N / 2)
  noisePower.set(colour, p)
  return p
}

/** |H(f)|^2 of a Web Audio biquad (RBJ cookbook), for the sample rate the model uses. */
export function biquadPower(type: BiquadFilterType, f0: number, q: number, f: number, rate: number): number {
  const w0 = 2 * Math.PI * f0 / rate, alpha = Math.sin(w0) / (2 * q), c = Math.cos(w0)
  let b0: number, b1: number, b2: number
  if (type === 'lowpass') { b0 = (1 - c) / 2; b1 = 1 - c; b2 = b0 }
  else if (type === 'highpass') { b0 = (1 + c) / 2; b1 = -(1 + c); b2 = b0 }
  else { b0 = alpha; b1 = 0; b2 = -alpha }
  const a0 = 1 + alpha, a1 = -2 * c, a2 = 1 - alpha
  const w = 2 * Math.PI * f / rate, cw = Math.cos(w), sw = Math.sin(w), c2 = Math.cos(2 * w), s2 = Math.sin(2 * w)
  const nr = b0 + b1 * cw + b2 * c2, ni = -(b1 * sw + b2 * s2), dr = a0 + a1 * cw + a2 * c2, di = -(a1 * sw + a2 * s2)
  return (nr * nr + ni * ni) / (dr * dr + di * di)
}

export interface BedReport { power: number; flatness: number; over4k: number; noiseShare: number }
const RATE = 44100, BINS = 1024
/** The continuous part of a scape (day or night) as one spectrum, summed over its beds. */
export function bedReport(spec: ScapeSpec, night: boolean): BedReport {
  const grid = new Float64Array(BINS)
  let noise = 0
  const hz = (k: number): number => (k + 0.5) * (RATE / 2) / BINS
  for (const bed of spec.beds ?? []) {
    const gain = bed.g * BED_GAIN * (night ? bed.night ?? 1 : 1), type = bed.fl[0], f0 = bed.fl[1], q = bed.fl[2] ?? 0.7
    if (bed.c) {
      const p = powerOf(bed.c)
      for (let k = 0; k < BINS; k++) {
        const f = hz(k), src = f < NOISE_RATE / 2 ? p[Math.min(N / 2 - 1, Math.floor(f / (NOISE_RATE / 2) * (N / 2)))] as number : 0
        // the noise buffer is sampled every other bin of the grid, so its power is counted twice
        const v = 2 * src * gain * gain * biquadPower(type, f0, q, f, RATE)
        grid[k] = (grid[k] as number) + v; noise += v
      }
    } else {
      const f = bed.hum ?? 100, k = Math.min(BINS - 1, Math.floor(f / (RATE / 2) * BINS))
      // A line: its power spread over the bins of one analysis bin so it is comparable with noise per bin.
      grid[k] = (grid[k] as number) + (gain * gain / 2) * biquadPower(type, f0, q, f, RATE)
    }
  }
  // Flatness counts only what is within 60 dB of the loudest bin, so a silent top end does not make a hissy bed look tonal.
  let sum = 0, high = 0, logSum = 0, peak = 0
  for (let k = 0; k < BINS; k++) peak = Math.max(peak, grid[k] as number)
  const floor = peak * 1e-6
  for (let k = 0; k < BINS; k++) { const v = grid[k] as number; sum += v; logSum += Math.log(v + floor); if (hz(k) >= 4000) high += v }
  const mean = sum / BINS
  return { power: sum, flatness: mean > 0 ? Math.exp(logSum / BINS) / (mean + floor) : 0, over4k: sum > 0 ? high / sum : 0, noiseShare: sum > 0 ? noise / sum : 0 }
}
export type { Bed }
