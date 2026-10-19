import { Buffer } from 'node:buffer'
import { existsSync, lstatSync, mkdirSync, mkdtempSync, readFileSync, realpathSync, renameSync, rmSync, statSync, writeFileSync } from 'node:fs'
import { basename, dirname, isAbsolute, join, relative, resolve, sep } from 'node:path'
import { fileURLToPath } from 'node:url'

export const CONTACT_SHEET_SCHEMA_VERSION = 1 as const
export const MAX_CELLS = 10_000
export const MAX_CELLS_PER_SHEET = 100
export const MAX_IMAGE_BYTES = 4 * 1024 * 1024
export const MAX_SHEET_IMAGE_BYTES = 8 * 1024 * 1024
export const MAX_TOTAL_IMAGE_BYTES = 2 * 1024 * 1024 * 1024

export interface ContactSheetStats {
  triangles?: number
  meshes?: number
  lights?: number
  drawCalls?: number
  bytes?: number
}

export interface ContactSheetCell {
  id: string
  group: { kind: 'city' | 'kit'; id: string; label: string }
  label: string
  screenshot: string
  status: 'pending' | 'pass' | 'fail'
  reason?: string
  stats?: ContactSheetStats
}

export interface ContactSheetManifest {
  schemaVersion: typeof CONTACT_SHEET_SCHEMA_VERSION
  sourceRevision: string
  title: string
  cells: ContactSheetCell[]
}

export interface ResolvedCell extends ContactSheetCell {
  imagePath: string
  mimeType: 'image/png' | 'image/jpeg'
  imageBytes: number
}

export interface ContactSheetPage {
  file: string
  number: number
  group: ContactSheetCell['group']
  cells: ResolvedCell[]
}

type JsonObject = Record<string, unknown>

const object = (value: unknown): value is JsonObject => Boolean(value) && typeof value === 'object' && !Array.isArray(value)
const keysAre = (value: JsonObject, allowed: readonly string[], where: string): void => {
  const extra = Object.keys(value).filter((key) => !allowed.includes(key))
  if (extra.length) throw new Error(`${where} has unknown field${extra.length === 1 ? '' : 's'}: ${extra.join(', ')}`)
}
const textField = (value: unknown, where: string, max = 240): string => {
  if (typeof value !== 'string' || value.length < 1 || value.length > max || /[\u0000-\u001f\u007f]/.test(value)) throw new Error(`${where} must be 1-${max} characters without control characters`)
  return value
}
const idField = (value: unknown, where: string): string => {
  const text = textField(value, where, 120)
  if (!/^[a-z0-9][a-z0-9._-]*$/i.test(text)) throw new Error(`${where} must use letters, numbers, dot, underscore, or hyphen`)
  return text
}
const countField = (value: unknown, where: string): number => {
  if (!Number.isSafeInteger(value) || (value as number) < 0) throw new Error(`${where} must be a non-negative safe integer`)
  return value as number
}

export function validateScreenshotPath(value: unknown, where = 'screenshot'): string {
  const path = textField(value, where, 500)
  if (isAbsolute(path) || path.includes('\\') || /^[a-z][a-z0-9+.-]*:/i.test(path)) throw new Error(`${where} must be a relative local path`)
  const parts = path.split('/')
  if (parts.some((part) => !part || part === '.' || part === '..')) throw new Error(`${where} must not contain empty, current, or parent segments`)
  if (!/\.(?:png|jpe?g)$/i.test(path)) throw new Error(`${where} must end in .png, .jpg, or .jpeg`)
  return path
}

export function validateManifest(value: unknown): ContactSheetManifest {
  if (!object(value)) throw new Error('manifest must be an object')
  keysAre(value, ['schemaVersion', 'sourceRevision', 'title', 'cells'], 'manifest')
  if (value.schemaVersion !== CONTACT_SHEET_SCHEMA_VERSION) throw new Error(`schemaVersion must be ${CONTACT_SHEET_SCHEMA_VERSION}`)
  const sourceRevision = idField(value.sourceRevision, 'sourceRevision')
  const title = textField(value.title, 'title')
  if (!Array.isArray(value.cells) || value.cells.length > MAX_CELLS) throw new Error(`cells must be an array with at most ${MAX_CELLS} entries`)
  const ids = new Set<string>()
  const groupLabels = new Map<string, string>()
  const cells = value.cells.map((raw, index): ContactSheetCell => {
    const where = `cells[${index}]`
    if (!object(raw)) throw new Error(`${where} must be an object`)
    keysAre(raw, ['id', 'group', 'label', 'screenshot', 'status', 'reason', 'stats'], where)
    const id = idField(raw.id, `${where}.id`)
    if (ids.has(id)) throw new Error(`${where}.id duplicates ${id}`)
    ids.add(id)
    if (!object(raw.group)) throw new Error(`${where}.group must be an object`)
    keysAre(raw.group, ['kind', 'id', 'label'], `${where}.group`)
    if (raw.group.kind !== 'city' && raw.group.kind !== 'kit') throw new Error(`${where}.group.kind must be city or kit`)
    const group: ContactSheetCell['group'] = { kind: raw.group.kind, id: idField(raw.group.id, `${where}.group.id`), label: textField(raw.group.label, `${where}.group.label`) }
    const groupKey = `${group.kind}:${group.id}`
    const priorLabel = groupLabels.get(groupKey)
    if (priorLabel !== undefined && priorLabel !== group.label) throw new Error(`${where}.group.label conflicts with another ${groupKey} cell`)
    groupLabels.set(groupKey, group.label)
    if (raw.status !== 'pending' && raw.status !== 'pass' && raw.status !== 'fail') throw new Error(`${where}.status must be pending, pass, or fail`)
    const reason = raw.reason === undefined ? undefined : textField(raw.reason, `${where}.reason`, 500)
    let stats: ContactSheetStats | undefined
    if (raw.stats !== undefined) {
      if (!object(raw.stats)) throw new Error(`${where}.stats must be an object`)
      keysAre(raw.stats, ['triangles', 'meshes', 'lights', 'drawCalls', 'bytes'], `${where}.stats`)
      stats = {}
      for (const key of ['triangles', 'meshes', 'lights', 'drawCalls', 'bytes'] as const) if (raw.stats[key] !== undefined) stats[key] = countField(raw.stats[key], `${where}.stats.${key}`)
    }
    return { id, group, label: textField(raw.label, `${where}.label`), screenshot: validateScreenshotPath(raw.screenshot, `${where}.screenshot`), status: raw.status, ...(reason === undefined ? {} : { reason }), ...(stats === undefined ? {} : { stats }) }
  })
  return { schemaVersion: CONTACT_SHEET_SCHEMA_VERSION, sourceRevision, title, cells }
}

export const escapeHtml = (value: string): string => value.replace(/[&<>"']/g, (char) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[char]!)

function within(root: string, candidate: string): boolean {
  const path = relative(root, candidate)
  return path === '' || (!path.startsWith(`..${sep}`) && path !== '..' && !isAbsolute(path))
}

function imageType(bytes: Buffer): 'image/png' | 'image/jpeg' | null {
  if (bytes.length >= 8 && bytes.subarray(0, 8).equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]))) return 'image/png'
  if (bytes.length >= 4 && bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff && bytes.at(-2) === 0xff && bytes.at(-1) === 0xd9) return 'image/jpeg'
  return null
}

export function resolveCells(manifest: ContactSheetManifest, imagesRoot: string): ResolvedCell[] {
  const root = realpathSync(imagesRoot)
  if (!statSync(root).isDirectory()) throw new Error('images root must be a directory')
  let total = 0
  return manifest.cells.map((cell) => {
    const lexical = resolve(root, cell.screenshot)
    if (!within(root, lexical)) throw new Error(`${cell.id}: screenshot escapes images root`)
    const actual = realpathSync(lexical)
    if (!within(root, actual)) throw new Error(`${cell.id}: screenshot symlink escapes images root`)
    if (!lstatSync(actual).isFile()) throw new Error(`${cell.id}: screenshot must be a file`)
    const imageBytes = statSync(actual).size
    if (imageBytes < 4 || imageBytes > MAX_IMAGE_BYTES) throw new Error(`${cell.id}: screenshot must be 4-${MAX_IMAGE_BYTES} bytes`)
    total += imageBytes
    if (total > MAX_TOTAL_IMAGE_BYTES) throw new Error(`images exceed the ${MAX_TOTAL_IMAGE_BYTES} byte total cap`)
    const bytes = readFileSync(actual)
    const mimeType = imageType(bytes)
    if (!mimeType) throw new Error(`${cell.id}: screenshot is not a PNG or JPEG`)
    if ((/\.png$/i.test(cell.screenshot)) !== (mimeType === 'image/png')) throw new Error(`${cell.id}: screenshot extension does not match its image signature`)
    return { ...cell, imagePath: actual, mimeType, imageBytes }
  })
}

export function planPages(cells: readonly ResolvedCell[]): ContactSheetPage[] {
  const groups = new Map<string, { group: ContactSheetCell['group']; cells: ResolvedCell[] }>()
  for (const cell of [...cells].sort((a, b) => `${a.group.kind}:${a.group.id}:${a.id}`.localeCompare(`${b.group.kind}:${b.group.id}:${b.id}`, 'en'))) {
    const key = `${cell.group.kind}:${cell.group.id}`
    const group = groups.get(key) ?? { group: cell.group, cells: [] }
    group.cells.push(cell)
    groups.set(key, group)
  }
  const pages: ContactSheetPage[] = []
  for (const { group, cells: groupCells } of groups.values()) {
    let pageCells: ResolvedCell[] = []
    let pageBytes = 0
    const flush = (): void => {
      if (!pageCells.length) return
      const number = pages.length + 1
      pages.push({ file: `sheet-${String(number).padStart(4, '0')}.html`, number, group, cells: pageCells })
      pageCells = []
      pageBytes = 0
    }
    for (const cell of groupCells) {
      if (cell.imageBytes > MAX_SHEET_IMAGE_BYTES) throw new Error(`${cell.id}: screenshot exceeds the per-sheet image byte cap`)
      if (pageCells.length && (pageCells.length >= MAX_CELLS_PER_SHEET || pageBytes + cell.imageBytes > MAX_SHEET_IMAGE_BYTES)) flush()
      pageCells.push(cell)
      pageBytes += cell.imageBytes
    }
    flush()
  }
  return pages
}

const pageShell = (title: string, body: string): string => `<!doctype html>\n<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${escapeHtml(title)}</title><style>body{margin:0;padding:24px;background:#f2efe8;color:#1d211e;font:14px/1.45 system-ui,sans-serif}header,main{max-width:1440px;margin:auto}nav{display:flex;gap:16px;flex-wrap:wrap;margin:12px 0 20px}a{color:#165f46}.grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(220px,1fr));gap:14px}.cell{min-width:0;padding:10px;border:1px solid #cbc7bd;border-radius:10px;background:#fff}.cell img{display:block;width:100%;height:190px;object-fit:contain;background:#e8e5de}.cell h2{font-size:15px;margin:9px 0 2px;overflow-wrap:anywhere}.meta,.stats{color:#5c625e;font-size:12px}.reason{color:#8b2424}.status{font-weight:700}.status-pass{color:#17643e}.status-fail{color:#8b2424}.status-pending{color:#725500}code{overflow-wrap:anywhere}</style></head><body>${body}</body></html>\n`

export function renderIndex(manifest: ContactSheetManifest, pages: readonly ContactSheetPage[]): string {
  const links = pages.map((page) => `<li><a href="${page.file}">${escapeHtml(page.group.label)} · sheet ${page.number}</a> <small>${page.cells.length} cells</small></li>`).join('')
  return pageShell(manifest.title, `<header><h1>${escapeHtml(manifest.title)}</h1><p>Source <code>${escapeHtml(manifest.sourceRevision)}</code> · ${manifest.cells.length} cells · ${pages.length} sheets</p></header><main><ol>${links}</ol></main>`)
}

export function renderPage(manifest: ContactSheetManifest, page: ContactSheetPage, pages: readonly ContactSheetPage[]): string {
  const previous = pages[page.number - 2]
  const next = pages[page.number]
  const nav = `<nav>${previous ? `<a href="${previous.file}">Previous sheet</a>` : ''}<a href="index.html">Index</a>${next ? `<a href="${next.file}">Next sheet</a>` : ''}</nav>`
  const cells = page.cells.map((cell) => {
    const image = readFileSync(cell.imagePath).toString('base64')
    const stats = cell.stats ? (['triangles', 'meshes', 'lights', 'drawCalls', 'bytes'] as const).filter((key) => cell.stats?.[key] !== undefined).map((key) => `${key}: ${cell.stats![key]}`).join(' · ') : ''
    return `<article class="cell"><img src="data:${cell.mimeType};base64,${image}" alt="${escapeHtml(cell.label)}"><h2>${escapeHtml(cell.label)}</h2><div class="meta"><code>${escapeHtml(cell.id)}</code></div><div class="status status-${cell.status}">${cell.status}</div>${cell.reason ? `<p class="reason">${escapeHtml(cell.reason)}</p>` : ''}${stats ? `<div class="stats">${escapeHtml(stats)}</div>` : ''}</article>`
  }).join('')
  const title = `${manifest.title} · ${page.group.label} · sheet ${page.number}`
  return pageShell(title, `<header><h1>${escapeHtml(page.group.label)}</h1><p>${escapeHtml(page.group.kind)} <code>${escapeHtml(page.group.id)}</code> · ${page.cells.length} cells · source <code>${escapeHtml(manifest.sourceRevision)}</code></p>${nav}</header><main class="grid">${cells}</main>`)
}

export function writeContactSheets(manifestValue: unknown, imagesRoot: string, out: string): { cells: number; sheets: number; out: string } {
  const manifest = validateManifest(manifestValue)
  const cells = resolveCells(manifest, imagesRoot)
  const pages = planPages(cells)
  const target = resolve(out)
  if (existsSync(target)) throw new Error(`output already exists: ${target}`)
  mkdirSync(dirname(target), { recursive: true })
  const temporary = mkdtempSync(join(dirname(target), `.${basename(target)}-pending-`))
  try {
    writeFileSync(join(temporary, 'index.html'), renderIndex(manifest, pages), { encoding: 'utf8', flag: 'wx' })
    for (const page of pages) writeFileSync(join(temporary, page.file), renderPage(manifest, page, pages), { encoding: 'utf8', flag: 'wx' })
    renameSync(temporary, target)
  } catch (error) {
    rmSync(temporary, { recursive: true, force: true })
    throw error
  }
  return { cells: cells.length, sheets: pages.length, out: target }
}

function option(argv: readonly string[], name: string): string {
  const index = argv.indexOf(name)
  if (index < 0 || !argv[index + 1] || argv[index + 1]!.startsWith('--')) throw new Error(`missing ${name}`)
  return argv[index + 1]!
}

export function runCli(argv = process.argv.slice(2)): void {
  const input = option(argv, '--input')
  const imagesRoot = option(argv, '--images-root')
  const out = option(argv, '--out')
  const manifest = JSON.parse(readFileSync(input, 'utf8')) as unknown
  const result = writeContactSheets(manifest, imagesRoot, out)
  process.stdout.write(`Wrote ${result.sheets} sheet${result.sheets === 1 ? '' : 's'} for ${result.cells} cell${result.cells === 1 ? '' : 's'} to ${result.out}\n`)
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  try { runCli() } catch (error) { process.stderr.write(`${error instanceof Error ? error.message : String(error)}\n`); process.exitCode = 1 }
}
