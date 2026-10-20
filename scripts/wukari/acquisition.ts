/** Public HTTPS acquisition. No authentication, TLS bypass, or automatic provider switching. */
import { execFile } from 'node:child_process';
import { createHash } from 'node:crypto';
import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { promisify } from 'node:util';
import { checkedBytes } from './sources.ts';

export interface SourceRequest {
  id: string; url: string; license: string; attribution: string;
  query?: string; expected?: { bytes: number; sha256: string };
  maxBytes?: number; timeoutSeconds?: number; attempts?: number;
}
export interface ResponseBytes {
  status: number; body: Buffer; retryAfter?: string;
  transportCode?: number; transportError?: string;
}
export interface Failure {
  category: 'proxy-access-denied' | 'access-denied' | 'rate-limit' | 'provider-unavailable' | 'timeout' | 'transport' | 'tls-verification' | 'integrity' | 'invalid-response';
  message: string; retryable: boolean;
}
export interface Attempt {
  number: number; at: string; status: number; failure?: Failure; nextDelayMs?: number;
}
export interface Receipt {
  schemaVersion: 1; id: string; url: string; license: string; attribution: string;
  status: 'acquired' | 'failed'; retrievedAt: string | null; bytes: number | null; sha256: string | null;
  query: string | null; querySha256: string | null;
  verification: 'source-backed-not-field-verified' | 'not-acquired'; fieldVerified: false;
  attempts: Attempt[];
}
export class AcquisitionError extends Error {
  readonly receipt: Receipt;
  constructor(receipt: Receipt) {
    super(`${receipt.id}: ${receipt.attempts.at(-1)?.failure?.category}: ${receipt.attempts.at(-1)?.failure?.message}`);
    this.receipt = receipt;
  }
}
export const sha256 = (bytes: Uint8Array | string): string => createHash('sha256').update(bytes).digest('hex');
const execute = promisify(execFile);

/** curl uses this environment's supported proxy/trust settings; subprocess args contain no secrets. */
export async function curlTransport(source: SourceRequest): Promise<ResponseBytes> {
  const directory = await mkdtemp(join(tmpdir(), 'wukari-acquire-'));
  try {
    const bodyPath = join(directory, 'body'), headersPath = join(directory, 'headers');
    const args = ['--silent', '--show-error', '--location', '--proto', '=https', '--proto-redir', '=https',
      '--connect-timeout', '10', '--max-time', String(source.timeoutSeconds ?? 30),
      '--max-filesize', String(source.maxBytes ?? 12 * 1024 * 1024),
      '--user-agent', 'WukariLife/0.2 (+https://github.com/Jabarteley/wukari-world)',
      '--header', 'Accept: application/json', '--dump-header', headersPath, '--output', bodyPath, '--write-out', '%{http_code}'];
    if (source.query !== undefined) {
      const queryPath = join(directory, 'query'); await writeFile(queryPath, source.query);
      args.push('--get', '--data-urlencode', `data@${queryPath}`);
    }
    args.push(source.url);
    let status = 0, transportCode: number | undefined, transportError: string | undefined;
    try { const response = await execute('curl', args, { maxBuffer: 256_000 }); status = Number(response.stdout); }
    catch (error) {
      const e = error as { code?: number; stdout?: string; stderr?: string };
      status = Number(e.stdout) || 0; transportCode = typeof e.code === 'number' ? e.code : -1;
      transportError = (e.stderr ?? 'curl could not execute').trim().slice(0, 500);
    }
    const body = await readFile(bodyPath).catch(() => Buffer.alloc(0));
    const headers = await readFile(headersPath, 'utf8').catch(() => '');
    const retryAfter = [...headers.matchAll(/^retry-after:\s*(.+)$/gim)].at(-1)?.[1]?.trim();
    return { status, body, retryAfter, transportCode, transportError };
  } finally { await rm(directory, { recursive: true, force: true }); }
}
export function classify(response: ResponseBytes): Failure | null {
  const { status, transportCode, transportError = '' } = response;
  if (transportCode && /CONNECT.*403/i.test(transportError)) return { category: 'proxy-access-denied', message: 'Proxy denied CONNECT; apply network configuration before retrying.', retryable: false };
  if (transportCode && [51, 58, 60, 77, 83, 90, 91].includes(transportCode)) return { category: 'tls-verification', message: transportError, retryable: false };
  if (transportCode === 28) return { category: 'timeout', message: transportError, retryable: true };
  if (transportCode) return { category: 'transport', message: transportError, retryable: [6, 7, 18, 52, 55, 56].includes(transportCode) };
  if ([401, 403, 406].includes(status)) return { category: 'access-denied', message: `HTTP ${status}; no bypass or authentication guessing attempted.`, retryable: false };
  if (status === 429) return { category: 'rate-limit', message: 'HTTP 429; honor Retry-After or retry later.', retryable: true };
  if ([408, 500, 502, 503, 504].includes(status)) return { category: 'provider-unavailable', message: `HTTP ${status}; bounded retry only.`, retryable: true };
  if (status < 200 || status >= 300) return { category: 'invalid-response', message: `Unexpected HTTP ${status}`, retryable: false };
  return null;
}
export async function acquire(source: SourceRequest, options: {
  transport?: (source: SourceRequest) => Promise<ResponseBytes>;
  sleep?: (ms: number) => Promise<void>; now?: () => Date; maxWaitMs?: number;
} = {}): Promise<{ body: Buffer; receipt: Receipt }> {
  const url = new URL(source.url);
  if (url.protocol !== 'https:' || url.username || url.password || url.hash) throw new Error('Source must be a public HTTPS URL without credentials or fragment');
  if (!source.license.trim() || !source.attribution.trim()) throw new Error('Source license and attribution are required');
  if (source.timeoutSeconds !== undefined && (!Number.isInteger(source.timeoutSeconds) || source.timeoutSeconds < 1 || source.timeoutSeconds > 60)) throw new Error('Source timeout must be 1–60 seconds');
  if (source.maxBytes !== undefined && (!Number.isInteger(source.maxBytes) || source.maxBytes < 1 || source.maxBytes > 32 * 1024 * 1024)) throw new Error('Source size limit must be 1–32 MiB');
  const maxAttempts = source.attempts ?? 3;
  if (!Number.isInteger(maxAttempts) || maxAttempts < 1 || maxAttempts > 3) throw new Error('Acquisition permits 1–3 attempts');
  const now = options.now ?? (() => new Date()), sleep = options.sleep ?? (ms => new Promise(resolve => setTimeout(resolve, ms)));
  const receipt: Receipt = {
    schemaVersion: 1, id: source.id, url: source.url, license: source.license, attribution: source.attribution,
    status: 'failed', retrievedAt: null, bytes: null, sha256: null,
    query: source.query ?? null, querySha256: source.query === undefined ? null : sha256(source.query),
    verification: 'not-acquired', fieldVerified: false, attempts: [],
  };
  let waited = 0;
  for (let number = 1; number <= maxAttempts; number++) {
    let response: ResponseBytes;
    try { response = await (options.transport ?? curlTransport)(source); }
    catch (error) { response = { status: 0, body: Buffer.alloc(0), transportCode: -1, transportError: error instanceof Error ? error.message : String(error) }; }
    let failure = classify(response);
    if (!failure) {
      try {
        if (!response.body.length || response.body.length > (source.maxBytes ?? 12 * 1024 * 1024)) throw new Error('Empty or oversized source');
        if (source.expected) checkedBytes(response.body, source.expected);
        const value: unknown = JSON.parse(response.body.toString('utf8'));
        if (!value || typeof value !== 'object' || Array.isArray(value)) throw new Error('Source JSON must be an object');
        if ('remark' in value) throw new Error('Overpass returned an incomplete/error response');
        receipt.attempts.push({ number, at: now().toISOString(), status: response.status });
        return { body: response.body, receipt: { ...receipt, status: 'acquired', verification: 'source-backed-not-field-verified', retrievedAt: now().toISOString(), bytes: response.body.length, sha256: sha256(response.body) } };
      } catch (error) {
        failure = { category: source.expected ? 'integrity' : 'invalid-response', message: error instanceof Error ? error.message : String(error), retryable: false };
      }
    }
    const attempt: Attempt = { number, at: now().toISOString(), status: response.status, failure };
    receipt.attempts.push(attempt);
    if (!failure.retryable || number === maxAttempts) break;
    let delay = 1000 * 2 ** (number - 1);
    if (response.status === 429 && !response.retryAfter) break; // never guess a rate-limit reset
    if (response.retryAfter) {
      const seconds = Number(response.retryAfter), date = Date.parse(response.retryAfter);
      if (Number.isFinite(seconds) && seconds >= 0) delay = Math.max(delay, seconds * 1000);
      else if (Number.isFinite(date)) delay = Math.max(delay, date - now().getTime());
      else break;
    }
    if (delay + waited > (options.maxWaitMs ?? 30_000)) break; // return control rather than retry before the provider permits
    attempt.nextDelayMs = delay; waited += delay; await sleep(delay);
  }
  throw new AcquisitionError(receipt);
}
