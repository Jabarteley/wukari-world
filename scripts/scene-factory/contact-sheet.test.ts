import assert from 'node:assert/strict'
import { mkdtempSync, mkdirSync, readFileSync, rmSync, symlinkSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import test from 'node:test'
import { MAX_IMAGE_BYTES, planPages, resolveCells, validateManifest, writeContactSheets } from './contact-sheet.ts'
import type { ContactSheetCell, ResolvedCell } from './contact-sheet.ts'

const PNG = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=', 'base64')
const root = (): string => mkdtempSync(join(tmpdir(), 'allworld-contact-sheet-test-'))
const cell = (id: string, screenshot = 'tiny.png'): ContactSheetCell => ({ id, group: { kind: 'city', id: 'lagos', label: 'Lagos' }, label: `Cell ${id}`, screenshot, status: 'pass', stats: { triangles: 12, meshes: 1, lights: 2, drawCalls: 3, bytes: PNG.length } })
const manifest = (cells: unknown[]) => ({ schemaVersion: 1, sourceRevision: 'abc123', title: 'Scene review', cells })

test('manifest rejects file escapes, injection-shaped paths, duplicates, and invalid metadata', () => {
  for (const screenshot of ['../secret.png', '/tmp/secret.png', 'https://example.test/a.png', 'data:image/png;base64,AAAA', 'a\\b.png']) {
    assert.throws(() => validateManifest(manifest([cell('one', screenshot)])), /relative local path|parent segments/)
  }
  assert.throws(() => validateManifest(manifest([cell('same'), cell('same')])), /duplicates/)
  assert.throws(() => validateManifest(manifest([{ ...cell('bad'), stats: { triangles: -1 } }])), /non-negative safe integer/)
  assert.throws(() => validateManifest(manifest([{ ...cell('bad'), reason: 4 }])), /reason must be/)
  assert.throws(() => validateManifest({ ...manifest([]), unexpected: true }), /unknown field/)
})

test('filesystem validation rejects escaped symlinks and image extension or signature mismatches', (t) => {
  const dir = root()
  t.after(() => rmSync(dir, { recursive: true, force: true }))
  const images = join(dir, 'images')
  mkdirSync(images)
  const outside = join(dir, 'outside.png')
  writeFileSync(outside, PNG)
  symlinkSync(outside, join(images, 'link.png'))
  assert.throws(() => resolveCells(validateManifest(manifest([cell('link', 'link.png')])), images), /symlink escapes/)
  writeFileSync(join(images, 'fake.png'), Buffer.from('not an image'))
  assert.throws(() => resolveCells(validateManifest(manifest([cell('fake', 'fake.png')])), images), /not a PNG or JPEG/)
  writeFileSync(join(images, 'wrong.jpg'), PNG)
  assert.throws(() => resolveCells(validateManifest(manifest([cell('wrong', 'wrong.jpg')])), images), /extension does not match/)
  const oversized = Buffer.alloc(MAX_IMAGE_BYTES + 1)
  PNG.copy(oversized, 0, 0, 8)
  writeFileSync(join(images, 'oversized.png'), oversized)
  assert.throws(() => resolveCells(validateManifest(manifest([cell('oversized', 'oversized.png')])), images), new RegExp(`4-${MAX_IMAGE_BYTES} bytes`))
})

test('page planning splits a group when embedded image bytes reach the sheet ceiling', () => {
  const resolved: ResolvedCell[] = ['cell-001', 'cell-002', 'cell-003'].map((id) => ({ ...cell(id), imagePath: `/images/${id}.png`, mimeType: 'image/png' as const, imageBytes: 3 * 1024 * 1024 }))
  assert.deepEqual(planPages(resolved).map((page) => ({ ids: page.cells.map((entry) => entry.id), bytes: page.cells.reduce((sum, entry) => sum + entry.imageBytes, 0) })), [
    { ids: ['cell-001', 'cell-002'], bytes: 6 * 1024 * 1024 },
    { ids: ['cell-003'], bytes: 3 * 1024 * 1024 },
  ])
})

test('writer escapes labels, embeds usable images, bounds sheets, links the index, and refuses an existing output', (t) => {
  const dir = root()
  t.after(() => rmSync(dir, { recursive: true, force: true }))
  const images = join(dir, 'images')
  const out = join(dir, 'review')
  mkdirSync(images)
  writeFileSync(join(images, 'tiny.png'), PNG)
  const cells = Array.from({ length: 101 }, (_, index) => ({ ...cell(`cell-${String(index).padStart(3, '0')}`), ...(index === 0 ? { label: '<script>alert(1)</script> & scene' } : {}) }))
  const checked = validateManifest({ ...manifest(cells), title: '<b>Review</b>' })
  const resolved = resolveCells(checked, images)
  assert.deepEqual(planPages(resolved).map((page) => page.cells.length), [100, 1])
  assert.deepEqual(writeContactSheets(checked, images, out), { cells: 101, sheets: 2, out })
  const index = readFileSync(join(out, 'index.html'), 'utf8')
  const first = readFileSync(join(out, 'sheet-0001.html'), 'utf8')
  const second = readFileSync(join(out, 'sheet-0002.html'), 'utf8')
  assert.match(index, /&lt;b&gt;Review&lt;\/b&gt;/)
  assert.match(index, /href="sheet-0001\.html"/)
  assert.match(index, /href="sheet-0002\.html"/)
  assert.doesNotMatch(first, /<script>alert/)
  assert.match(first, /&lt;script&gt;alert\(1\)&lt;\/script&gt; &amp; scene/)
  assert.ok(first.includes(`src="data:image/png;base64,${PNG.toString('base64')}"`))
  assert.match(second, /href="index\.html"/)
  assert.throws(() => writeContactSheets(checked, images, out), /output already exists/)
})
