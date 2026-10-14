// A version-4 UUID for a device that is not in a secure context. Its own file: only the campus app asks for one, so the first download does not carry it.
/** A version-4 UUID that also works outside secure contexts (plain HTTP on a LAN), where crypto.randomUUID is missing. */
export function uuid(): string {
  if (typeof globalThis.crypto?.randomUUID === 'function') return globalThis.crypto.randomUUID();
  const bytes = globalThis.crypto.getRandomValues(new Uint8Array(16));
  // The array is 16 long, so indexes 6 and 8 always exist.
  bytes[6] = (bytes[6]! & 0x0f) | 0x40; bytes[8] = (bytes[8]! & 0x3f) | 0x80;
  const hex = [...bytes].map((byte) => byte.toString(16).padStart(2, '0')).join('');
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
}
