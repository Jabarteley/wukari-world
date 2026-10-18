// Phone numbers on the device only (server/feed/contacts.ts): normalise to E.164 and hash, so no number ever leaves the browser.
const COUNTRY: Readonly<Record<string, string>> = Object.freeze({ NG: '234', GH: '233', KE: '254', ZA: '27', UG: '256', TZ: '255', RW: '250', CM: '237', SN: '221', CI: '225', GB: '44', US: '1' })
/** "0803 123 4567", "+234 803…", "234803…", "(0)803…" → "+2348031234567", or null when it cannot be a phone number. `country` is the default for a local number. */
export function toE164(raw: string, country = 'NG'): string | null {
  let text = raw.replace(/[^\d+]/g, '')
  if (!text) return null
  if (text.startsWith('00')) text = `+${text.slice(2)}`
  const code = COUNTRY[country] ?? '234'
  if (!text.startsWith('+')) {
    if (text.startsWith(code) && text.length > code.length + 6) text = `+${text}`
    else if (text.startsWith('0')) text = `+${code}${text.slice(1)}`
    else text = `+${code}${text}`
  }
  return /^\+[1-9]\d{7,14}$/.test(text) ? text : null
}
/** The first 32 hex characters of SHA-256 of the E.164 number: what the server receives (and blinds again with its own secret). */
export async function phoneHash(e164: string): Promise<string> {
  const digest = new Uint8Array(await globalThis.crypto.subtle.digest('SHA-256', new TextEncoder().encode(e164)))
  return [...digest].map((b) => b.toString(16).padStart(2, '0')).join('').slice(0, 32)
}
/** Every telephone number in a vCard file (TEL lines), as typed. */
export const numbersInVcf = (text: string): string[] => [...text.matchAll(/^TEL[^:]*:(.+)$/gim)].map((m) => m[1]!.trim())
/** Numbers in pasted text: anything that looks like one, separated by commas, new lines or semicolons. */
export const numbersInText = (text: string): string[] => text.split(/[,;\n]+/).map((x) => x.trim()).filter((x) => /\d{6,}/.test(x.replace(/\D/g, '')))
