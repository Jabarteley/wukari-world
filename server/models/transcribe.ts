/**
 * OWNER: models
 * SPEECH TO TEXT THROUGH THE GATEWAY: one recording in, the words out. Portable (no Node imports): the Node host and the Worker run it.
 * docs/CALLS.md "Speech to text" is the guide; the route that uses it is server/house/call-routes.ts.
 *
 *   transcribe(router, fetch, { audioBase64, mediaType, playerId, model? }) → { ok: true, text, seconds, model, costMicro } | { ok: false, why }
 *
 * THE API (checked against https://vercel.com/docs/ai-gateway/modalities/speech-to-text and https://ai-gateway.vercel.sh/v1/models on 15 Oct 2026):
 *   POST {gateway}/v4/ai/transcription-model, headers `Authorization: Bearer <key>`, `ai-gateway-protocol-version: 0.0.1`,
 *   `ai-transcription-model-specification-version: 4`, `ai-model-id: <model>`, body JSON `{ audio: <base64>, mediaType }`, answer JSON
 *   `{ text, segments, language, durationInSeconds, warnings }`. No multipart. MAI-Transcribe takes WAV, MP3, FLAC and Ogg/Opus, NOT WebM or MP4,
 *   which is what phones' MediaRecorder makes: the page therefore sends 16 kHz mono WAV (src/app/features/calls/wav.ts).
 *
 * THE RULES (the model router's, not new ones):
 *   - A PERSON'S VOICE IS THEIR WORDS. Only a model the gateway lists as `no_training: all` is ever used (NO_TRAINING below, taken from the model list); a setting that
 *     names any other model is ignored and the default is used. There is no free transcription model on the list, so the paid rule holds anyway.
 *   - THE BUDGET is the router's: `router.spend` reserves the worst case (the longest recording the route accepts) against the day's US$2.00 cap and the person's
 *     own caps before the request is sent, and books the real cost after it (seconds the provider reported, times the model's price per second).
 *   - NOTHING IS STORED. The audio lives in this call's memory only; the ledger keeps numbers (cost, count). The recording is never logged, never written, never passed on
 *     to anything but the gateway.
 */
import type { Router } from './router.ts';

/** The default model and its price: US$0.00002778 a second, about US$0.10 an hour (gateway model list, 15 Oct 2026). */
export const DEFAULT_STT_MODEL = 'microsoft/mai-transcribe-2';
/** Models the gateway lists as `no_training: "all"`, with US$ per second in millionths of a dollar (the list's `transcription_duration_cost_per_second`). */
export const NO_TRAINING: Readonly<Record<string, number>> = Object.freeze({
  'microsoft/mai-transcribe-2': 27.78,
  'spacexai/grok-stt': 28,
  'openai/gpt-4o-transcribe': 100,
  'openai/gpt-4o-mini-transcribe': 100,
  'google/gemini-3.5-transcribe': 100,
  'openai/whisper-1': 100,
});
export const sttModel = (wanted: unknown): string => (typeof wanted === 'string' && Object.hasOwn(NO_TRAINING, wanted) ? wanted : DEFAULT_STT_MODEL);

/** What the route accepts: a push-to-talk recording is at most this long and this big. */
export const MAX_SECONDS = 20;
export const MAX_AUDIO_BYTES = 720_000;
/** The page sends 16 kHz, 16-bit, mono WAV: 32,000 bytes a second. A header of 44 bytes. */
export const MEDIA_TYPES = Object.freeze(['audio/wav', 'audio/mpeg', 'audio/flac', 'audio/ogg']);

const BASE64 = /^[A-Za-z0-9+/]+={0,2}$/;
/** The byte length of a base64 text, or null when it is not base64. */
export function base64Bytes(text: string): number | null {
  if (!text || text.length % 4 !== 0 || !BASE64.test(text)) return null;
  return text.length / 4 * 3 - (text.endsWith('==') ? 2 : text.endsWith('=') ? 1 : 0);
}
/** The bytes a second of a WAV file holds (its header's byte rate), from the first bytes of the file, or null when it is not a PCM WAV. */
export function wavByteRate(bytes: Uint8Array): number | null {
  if (bytes.length < 44) return null;
  const text = (at: number): string => String.fromCharCode(bytes[at]!, bytes[at + 1]!, bytes[at + 2]!, bytes[at + 3]!);
  if (text(0) !== 'RIFF' || text(8) !== 'WAVE') return null;
  const rate = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength).getUint32(28, true);
  return rate >= 8000 && rate <= 400000 ? rate : null;
}
/** The first 48 bytes of a base64 text. */
function head(audioBase64: string): Uint8Array {
  return Uint8Array.from(atob(audioBase64.slice(0, 64)), (char) => char.charCodeAt(0));
}

export type Failure = 'off' | 'budget' | 'player-cap' | 'failed' | 'too_big' | 'bad_audio' | 'too_long' | 'empty';
export interface Input {
  audioBase64: string
  mediaType: string
  /** The router's one-way id of the person, for their daily caps. */
  playerId: string
  /** The model the settings name; anything not on the no-training list is replaced by the default. */
  model?: unknown
  timeoutMs?: number
}
export type Result = { ok: true; text: string; seconds: number; model: string; costMicro: number } | { ok: false; why: Failure };

/** A recording checked before anything is spent: its size, its type, and (for WAV) its length. */
export function checkAudio(audioBase64: unknown, mediaType: unknown): { ok: true; bytes: number } | { ok: false; why: Failure } {
  if (typeof audioBase64 !== 'string' || typeof mediaType !== 'string' || !MEDIA_TYPES.includes(mediaType)) return { ok: false, why: 'bad_audio' };
  const bytes = base64Bytes(audioBase64);
  if (bytes === null || bytes < 200) return { ok: false, why: bytes === null ? 'bad_audio' : 'empty' };
  if (bytes > MAX_AUDIO_BYTES) return { ok: false, why: 'too_big' };
  if (mediaType === 'audio/wav') {
    let rate: number | null = null;
    try { rate = wavByteRate(head(audioBase64)); } catch { rate = null; }
    if (rate === null) return { ok: false, why: 'bad_audio' };
    if ((bytes - 44) / rate > MAX_SECONDS + 0.5) return { ok: false, why: 'too_long' };
  }
  return { ok: true, bytes };
}

type Fetcher = (url: string, init?: object) => Promise<unknown>;
const isResponse = (value: unknown): value is Response => typeof value === 'object' && value !== null && typeof Reflect.get(value, 'status') === 'number' && typeof Reflect.get(value, 'text') === 'function';

/** The words of a transcript made safe to hold and show: plain text, one line, at most 300 characters. */
export const cleanTranscript = (text: unknown): string => (typeof text === 'string' ? text.replace(/[\u0000-\u001f\u007f<>]+/g, ' ').replace(/\s+/g, ' ').trim().slice(0, 300) : '');

export async function transcribe(router: Router, fetcher: Fetcher, input: Input): Promise<Result> {
  const checked = checkAudio(input.audioBase64, input.mediaType);
  if (!checked.ok) return checked;
  const found = router.provider('gateway');
  if (!found) return { ok: false, why: 'off' };
  const model = sttModel(input.model), perSecond = NO_TRAINING[model]!;
  const base = found.baseUrl.replace(/\/+$/, '');
  const worstMicro = perSecond * MAX_SECONDS;
  const done = await router.spend<{ text: string; seconds: number }>({ purpose: 'transcribe', model, playerId: input.playerId, worstMicro }, async () => {
    const control = new AbortController();
    const timer = setTimeout(() => control.abort(), input.timeoutMs ?? 12000);
    try {
      const sent = fetcher(`${base}/v4/ai/transcription-model`, {
        method: 'POST', signal: control.signal, redirect: 'manual',
        headers: { 'Authorization': `Bearer ${found.key}`, 'ai-gateway-protocol-version': '0.0.1', 'ai-transcription-model-specification-version': '4', 'ai-model-id': model, 'Content-Type': 'application/json', 'Accept': 'application/json' },
        body: JSON.stringify({ audio: input.audioBase64, mediaType: input.mediaType }),
      });
      const response = await Promise.race([sent, new Promise<never>((_, reject) => { control.signal.addEventListener('abort', () => reject(new Error('timeout'))); })]);
      if (!isResponse(response) || response.status < 200 || response.status >= 300) return null;
      const raw = await Promise.race([response.text(), new Promise<never>((_, reject) => { control.signal.addEventListener('abort', () => reject(new Error('timeout'))); })]);
      let body: unknown;
      try { body = JSON.parse(raw.slice(0, 100000)); } catch { return null; }
      if (typeof body !== 'object' || body === null) return null;
      const text = cleanTranscript(Reflect.get(body, 'text'));
      const reported = Reflect.get(body, 'durationInSeconds');
      // The provider's own seconds when it gives them, else the recording's size; never less than a second, never more than the cap we reserved.
      const seconds = Math.min(MAX_SECONDS, Math.max(1, typeof reported === 'number' && Number.isFinite(reported) && reported > 0 ? reported : checked.bytes / 32000));
      return { value: { text, seconds }, micro: seconds * perSecond };
    } catch { return null; } finally { clearTimeout(timer); }
  });
  if (!done.ok) return { ok: false, why: done.why };
  if (!done.value.text) return { ok: false, why: 'empty' };
  return { ok: true, text: done.value.text, seconds: done.value.seconds, model, costMicro: done.micro };
}
