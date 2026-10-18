// A .glb built by hand for tests (src/spaces/glb.test.ts, server/spaces-models.test.ts).
const pad4 = (bytes: Uint8Array, fill: number): Uint8Array => { const out = new Uint8Array(Math.ceil(bytes.length / 4) * 4).fill(fill); out.set(bytes); return out }
/** A .glb from a glTF JSON object and an optional binary chunk, exactly as the format lays it out. */
export function makeGlb(json: object, bin?: Uint8Array, options: { version?: number; length?: number } = {}): Uint8Array {
  const text = pad4(new TextEncoder().encode(JSON.stringify(json)), 0x20)
  const body = bin ? pad4(bin, 0) : null
  const total = 12 + 8 + text.length + (body ? 8 + body.length : 0)
  const out = new Uint8Array(total), view = new DataView(out.buffer)
  view.setUint32(0, 0x46546c67, true); view.setUint32(4, options.version ?? 2, true); view.setUint32(8, options.length ?? total, true)
  view.setUint32(12, text.length, true); view.setUint32(16, 0x4e4f534a, true); out.set(text, 20)
  if (body) { const at = 20 + text.length; view.setUint32(at, body.length, true); view.setUint32(at + 4, 0x004e4942, true); out.set(body, at + 8) }
  return out
}
