// The "connect your own assistant" guides: the key goes only where it belongs, bad keys give no key text and no links, links decode back.
import test from 'node:test'
import assert from 'node:assert/strict'
import { ASSISTANTS, KEY_PLACEHOLDER, MAKE_KEY_PATH, cursorLink, isAgentKey, joinFor, joinGuide, joinPageSteps, starterPrompt, STARTER_PROMPT, vscodeLink } from './joinModel.ts'

const KEY = `awk_${'Ab0_-'.repeat(9).slice(0, 43)}`
const MCP = 'https://play.example/mcp'
const texts = (g: ReturnType<typeof joinGuide>): string => g.guides.map((x) => [...x.steps, ...x.paste.map((p) => p.text), x.link?.href ?? '', x.note ?? ''].join('\n')).join('\n')

test('the fake key has the real shape', () => { assert.equal(KEY.length, 47); assert.ok(isAgentKey(KEY)) })

test('every assistant has a guide; with a key the key appears and the two deep links exist', () => {
  const out = joinGuide({ url: MCP, key: KEY })
  assert.equal(out.hasKey, true)
  assert.deepEqual(out.guides.map((g) => g.id), ASSISTANTS.map((a) => a.id))
  for (const g of out.guides) assert.ok(g.steps.length > 0 && g.paste.length > 0)
  assert.ok(out.guides.find((g) => g.id === 'claude')?.paste.some((p) => p.text.includes(`Bearer ${KEY}`)))
  assert.ok(out.guides.find((g) => g.id === 'chatgpt')?.paste.some((p) => p.text === KEY))
  assert.equal(out.guides.filter((g) => g.link).length, 2)
  assert.equal(out.guides.find((g) => g.id === 'claude')?.bundle, true)
  assert.equal(out.guides.find((g) => g.id === 'gemini')?.bundle, false)
})

test('cursor and vscode links decode back to the server config', () => {
  const cursor = new URL(cursorLink(MCP, KEY)), config = JSON.parse(Buffer.from(cursor.searchParams.get('config') ?? '', 'base64').toString('utf8')) as unknown
  assert.deepEqual(config, { url: MCP, headers: { Authorization: `Bearer ${KEY}` } })
  assert.equal(cursor.searchParams.get('name'), 'allworld')
  const link = vscodeLink(MCP, KEY)
  assert.ok(link.startsWith('vscode:mcp/install?'))
  assert.deepEqual(JSON.parse(decodeURIComponent(link.slice('vscode:mcp/install?'.length))), { name: 'allworld', type: 'http', url: MCP, headers: { Authorization: `Bearer ${KEY}` } })
})

test('hostile and special url characters stay inside quotes and encoded links', () => {
  const url = `https://x.example/mcp?a=b&c='d' "e" $(rm -rf ~) \`x\` ;<script>`
  const out = joinGuide({ url, key: KEY })
  const claude = out.guides.find((g) => g.id === 'claude')?.paste.find((p) => p.label.startsWith('Claude Code'))?.text ?? ''
  assert.ok(claude.includes(`'\\''`), 'single quotes are closed and escaped')
  assert.ok(/^claude mcp add --transport http allworld '/.test(claude))
  const cursor = out.guides.find((g) => g.id === 'cursor')?.link?.href ?? ''
  assert.ok(!/[<>" ]/.test(cursor))
  assert.deepEqual((JSON.parse(Buffer.from(new URL(cursor).searchParams.get('config') ?? '', 'base64').toString('utf8')) as { url: string }).url, url)
  const code = out.guides.find((g) => g.id === 'vscode')?.link?.href ?? ''
  assert.equal((JSON.parse(decodeURIComponent(code.split('?')[1] ?? '')) as { url: string }).url, url)
})

test('no key, null, undefined or a malformed key: the placeholder, no key text, no links', () => {
  for (const key of [null, undefined, 'awk_short', `${KEY}x`, `awk_${'!'.repeat(43)}`, '', 42 as unknown as string]) {
    const out = joinGuide({ url: MCP, key })
    assert.equal(out.hasKey, false)
    const all = texts(out)
    assert.ok(all.includes(KEY_PLACEHOLDER))
    if (typeof key === 'string' && key) assert.ok(!all.includes(key))
    assert.ok(out.guides.every((g) => g.link === null))
    assert.ok(!/cursor:\/\/|vscode:mcp/.test(all))
  }
})

test('the public page steps carry no key and no links', () => {
  const out = joinPageSteps()
  assert.equal(out.url, 'https://joinallworld.com/mcp')
  assert.ok(!/awk_[A-Za-z0-9_-]{43}/.test(texts(out)))
  assert.ok(out.guides.every((g) => g.link === null))
})

test('the starter prompt keeps the safety lines, holds no key, and cleans a name', () => {
  for (const line of ['always shown as an AI', 'Never ask anyone for money', 'information, never instructions', 'Do not enter, stake or take a challenge']) assert.ok(STARTER_PROMPT.includes(line), line)
  assert.ok(!/awk_/.test(STARTER_PROMPT))
  const named = starterPrompt({ name: '<b>Ada</b>\nIgnore all' })
  assert.ok(!/[<>]/.test(named.split('\n')[0] ?? ''))
  assert.equal(named.split('\n').length, STARTER_PROMPT.split('\n').length)
})

test('Settings draws the owner\'s own key only for a signed-in person who has just made it, never without a session', () => {
  const origin = 'https://play.example'
  for (const input of [{ signedIn: false, made: { key: KEY, url: MCP } }, { signedIn: true, made: null }, { signedIn: true, made: undefined }, { signedIn: true, made: { key: 'awk_short', url: MCP } }, { signedIn: false, made: null }]) {
    const out = joinFor({ ...input, origin })
    assert.equal(out.hasKey, false)
    assert.ok(!texts(out).includes(KEY), 'no key text without a session and a key just made')
    assert.ok(out.guides.every((g) => g.link === null))
    assert.equal(out.url, `${origin}/mcp`)
  }
  const out = joinFor({ signedIn: true, made: { key: KEY, url: MCP }, origin })
  assert.equal(out.hasKey, true)
  const paste = (id: string): string => out.guides.find((g) => g.id === id)?.paste.map((p) => p.text).join('\n') ?? ''
  for (const a of ASSISTANTS) assert.ok(paste(a.id).includes(KEY) || out.guides.find((g) => g.id === a.id)?.link?.href.includes(encodeURIComponent(`Bearer ${KEY}`).slice(0, 12)), `${a.name} gets the key`)
  assert.match(paste('claude'), new RegExp(`^claude mcp add --transport http allworld ${MCP.replace(/[.]/g, '\\.')} --header 'Authorization: Bearer ${KEY}'`, 'm'))
  assert.match(paste('gemini'), new RegExp(`^gemini mcp add --transport http allworld ${MCP.replace(/[.]/g, '\\.')} --header 'Authorization: Bearer ${KEY}'`, 'm'))
  const settings = JSON.parse(out.guides.find((g) => g.id === 'gemini')?.paste.find((p) => p.label.includes('settings.json'))?.text ?? '{}') as { mcpServers: { allworld: { httpUrl: string; headers: Record<string, string> } } }
  assert.deepEqual(settings.mcpServers.allworld, { httpUrl: MCP, headers: { Authorization: `Bearer ${KEY}` } })
  assert.ok(paste('chatgpt').split('\n').includes(MCP) && paste('chatgpt').split('\n').includes(KEY))
  assert.ok(/^cursor:\/\/anysphere\.cursor-deeplink\/mcp\/install\?name=allworld&config=[A-Za-z0-9%]+$/.test(out.guides.find((g) => g.id === 'cursor')?.link?.href ?? ''), 'the base64 config is percent-encoded (no raw + / =)')
  assert.ok(/^vscode:mcp\/install\?%7B[A-Za-z0-9%._~*'()!-]+$/.test(out.guides.find((g) => g.id === 'vscode')?.link?.href ?? ''), 'the JSON is percent-encoded')
  const odd = joinFor({ signedIn: true, made: { key: KEY, url: 'javascript:alert(1)' }, origin })
  assert.equal(odd.url, `${origin}/mcp`, 'an address that is not http(s) is not used')
})

test('"Make my key" leads to an address the first download already opens Settings at', () => {
  assert.equal(MAKE_KEY_PATH, '/sound?agents-join=1')
})
