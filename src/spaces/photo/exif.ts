/**
 * OWNER: spaces
 * How wide a photo's lens saw, from the JPEG's own EXIF (docs/WORLDS.md, phase 8): phones write the focal length "in 35 mm film"
 * (tag 0xA405), and with it the angle across the longer side is 2·atan(36 / 2f). A phone's main camera is about 26 mm (69°), its
 * wide camera about 13 mm (108°). Null when the photo does not say (a screenshot, a picture saved from the web). Pure.
 */

/** Degrees across the longer side, or null. */
export function exifFov(bytes: Uint8Array): number | null {
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength)
  if (bytes.length < 4 || view.getUint16(0) !== 0xffd8) return null
  let at = 2
  while (at + 4 <= bytes.length) {
    if (bytes[at] !== 0xff) return null
    const marker = bytes[at + 1]!, length = view.getUint16(at + 2)
    if (marker === 0xda || marker === 0xd9) return null
    // APP1 "Exif\0\0", then a TIFF header.
    if (marker === 0xe1 && at + 10 <= bytes.length && view.getUint32(at + 4) === 0x45786966 && view.getUint16(at + 8) === 0) {
      const tiff = at + 10, end = Math.min(bytes.length, at + 2 + length)
      try { return focalFov(view, tiff, end) } catch { return null }
    }
    at += 2 + length
  }
  return null
}

function focalFov(view: DataView, tiff: number, end: number): number | null {
  const little = view.getUint16(tiff) === 0x4949
  const u16 = (p: number): number => { if (p + 2 > end) throw new Error('short'); return view.getUint16(p, little) }
  const u32 = (p: number): number => { if (p + 4 > end) throw new Error('short'); return view.getUint32(p, little) }
  if (u16(tiff + 2) !== 42) return null
  /** The value of `tag` in the directory at `ifd` (offsets from the TIFF header), when it is a SHORT or LONG held in place. */
  const find = (ifd: number, tag: number): number | null => {
    const count = u16(tiff + ifd)
    for (let i = 0; i < Math.min(count, 200); i++) {
      const entry = tiff + ifd + 2 + i * 12
      if (u16(entry) !== tag) continue
      const type = u16(entry + 2)
      return type === 3 ? u16(entry + 8) : type === 4 ? u32(entry + 8) : null
    }
    return null
  }
  const exif = find(u32(tiff + 4), 0x8769)
  const f35 = exif === null ? null : find(exif, 0xa405)
  if (!f35 || f35 < 8 || f35 > 400) return null
  return (2 * Math.atan(36 / (2 * f35)) * 180) / Math.PI
}
