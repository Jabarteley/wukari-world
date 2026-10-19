import assert from 'node:assert/strict'
import { createHash } from 'node:crypto'
import { mkdir, mkdtemp, rm, symlink, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import test, { type TestContext } from 'node:test'
import { nodeTalkAssets } from './talk-assets-node.ts'

async function fixture(t: TestContext) {
  const root = await mkdtemp(join(tmpdir(), 'allworld-talk-assets-')), talk = join(root, 'assets', 'talk-banks')
  await mkdir(talk, { recursive: true })
  t.after(() => rm(root, { recursive: true, force: true }))
  return { root, talk }
}

test('Node adapter reads real index and full-hash city files beneath an absolute dist root', async t => {
  const { root, talk } = await fixture(t), index = Buffer.from('{"cities":[]}'), city = Buffer.from('{"city":"kano"}')
  const digest = createHash('sha256').update(city).digest('hex'), cityPath = `/assets/talk-banks/kano-${digest}.json`
  await writeFile(join(talk, 'index.json'), index)
  await writeFile(join(talk, `kano-${digest}.json`), city)
  const read = nodeTalkAssets(root)
  assert.deepEqual(Buffer.from(await read('/assets/talk-banks/index.json', 100)), index)
  assert.deepEqual(Buffer.from(await read(cityPath, 100)), city)
})

test('Node adapter rejects oversized and non-regular owned sources', async t => {
  const { root, talk } = await fixture(t)
  await writeFile(join(talk, 'index.json'), Buffer.alloc(6, 1))
  await assert.rejects(nodeTalkAssets(root)('/assets/talk-banks/index.json', 5), /Talk asset read failed/)
  await rm(join(talk, 'index.json'))
  await mkdir(join(talk, 'index.json'))
  await assert.rejects(nodeTalkAssets(root)('/assets/talk-banks/index.json', 5), /Talk asset read failed/)
})

test('Node adapter refuses file and directory symlink escapes', async t => {
  const { root, talk } = await fixture(t), outside = await mkdtemp(join(tmpdir(), 'allworld-talk-outside-'))
  t.after(() => rm(outside, { recursive: true, force: true }))
  await writeFile(join(outside, 'private.json'), '{}')
  await symlink(join(outside, 'private.json'), join(talk, 'index.json'))
  await assert.rejects(nodeTalkAssets(root)('/assets/talk-banks/index.json', 100), /Talk asset read failed/)

  const otherRoot = await mkdtemp(join(tmpdir(), 'allworld-talk-link-'))
  t.after(() => rm(otherRoot, { recursive: true, force: true }))
  await mkdir(join(otherRoot, 'assets'))
  await symlink(outside, join(otherRoot, 'assets', 'talk-banks'))
  await assert.rejects(nodeTalkAssets(otherRoot)('/assets/talk-banks/index.json', 100), /Talk asset read failed/)
})

test('Node adapter rejects relative roots and hostile paths without exposing them', async t => {
  const { root } = await fixture(t), read = nodeTalkAssets(root)
  assert.throws(() => nodeTalkAssets('dist'), /Talk asset read failed/)
  for (const path of ['/assets/talk-banks/../secret.json', '/assets/talk-banks/index.json?secret=1']) {
    await assert.rejects(read(path, 100), error => {
      assert.equal((error as Error).message, 'Talk asset read failed')
      assert.equal((error as Error).message.includes(path), false)
      return true
    })
  }
})
