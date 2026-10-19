import { constants } from 'node:fs'
import { lstat, open } from 'node:fs/promises'
import { isAbsolute, join, relative, resolve } from 'node:path'
import type { TalkAssetReader } from './talk-banks.ts'
import { talkAssetFileName } from './talk-assets.ts'

function fail(): never { throw new Error('Talk asset read failed') }

async function regularDirectory(path: string): Promise<void> {
  const info = await lstat(path)
  if (info.isSymbolicLink() || !info.isDirectory()) fail()
}

/** Read generated talk assets from one absolute distribution root without following owned-path symlinks. */
export function nodeTalkAssets(distRoot: string): TalkAssetReader {
  if (!isAbsolute(distRoot)) fail()
  const root = resolve(distRoot), assetRoot = join(root, 'assets'), talkRoot = join(assetRoot, 'talk-banks')
  return async (path, maxBytes) => {
    const name = talkAssetFileName(path, maxBytes), target = join(talkRoot, name)
    if (resolve(target) !== target || relative(talkRoot, target) !== name) fail()
    let handle: Awaited<ReturnType<typeof open>> | null = null
    try {
      await regularDirectory(root); await regularDirectory(assetRoot); await regularDirectory(talkRoot)
      handle = await open(target, constants.O_RDONLY | constants.O_NOFOLLOW)
      const info = await handle.stat()
      if (!info.isFile() || info.size > maxBytes) fail()
      const buffer = new Uint8Array(maxBytes + 1)
      let total = 0
      while (total < buffer.byteLength) {
        const { bytesRead } = await handle.read(buffer, total, buffer.byteLength - total, null)
        if (bytesRead === 0) break
        total += bytesRead
      }
      if (total > maxBytes) fail()
      return buffer.slice(0, total)
    } catch {
      return fail()
    } finally {
      try { await handle?.close() } catch { /* best-effort file cleanup */ }
    }
  }
}
