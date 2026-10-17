import assert from 'node:assert/strict'
import test from 'node:test'
import { canPickTableCard, canPlayTable, expiryLabel, takeStoryHelpQuery, turnLabel } from './coopModel.ts'
import type { HelpSessionView } from './coopModel.ts'

function session(overrides: Partial<HelpSessionView> = {}): HelpSessionView {
  return {
    id: 'session-1',
    host: { id: 'host', name: 'Tola' },
    helper: { id: 'helper', name: 'Ada' },
    city: 'lagos',
    cityName: 'Lagos',
    venue: 'National Theatre',
    label: 'Two-seat memory',
    kind: 'two-seat',
    status: 'active',
    expiresAt: 120_000,
    role: 'helper',
    joined: true,
    question: null,
    table: { cards: Array(8).fill(null), found: [], turn: 'helper', team: 0, house: 0, played: { host: 0, helper: 0 }, last: [], result: 'playing' },
    errand: null,
    ...overrides,
  }
}

test('story help query is consumed once without granting access or losing other URL state', () => {
  let replacement = ''
  const history = { state: { key: 1 }, replaceState: (_state: unknown, _title: string, url?: string | URL | null) => { replacement = String(url) } }
  const id = takeStoryHelpQuery(
    { href: 'https://joinallworld.test/play?storyHelp=123e4567-e89b-42d3-a456-426614174000&city=lagos#passport' },
    history,
  )
  assert.equal(id, '123e4567-e89b-42d3-a456-426614174000')
  assert.equal(replacement, '/play?city=lagos#passport')

  const invalid = takeStoryHelpQuery({ href: 'https://joinallworld.test/play?storyHelp=not-public' }, history)
  assert.equal(invalid, null)
  assert.equal(replacement, '/play')
})

test('memory choices follow only the server-owned turn and result', () => {
  const active = session()
  assert.equal(canPlayTable(active), true)
  assert.equal(turnLabel(active), 'Your turn: choose two cards.')

  const waiting = session({ table: { ...active.table!, turn: 'host' } })
  assert.equal(canPlayTable(waiting), false)
  assert.equal(turnLabel(waiting), 'Waiting for Tola.')

  const lost = session({ table: { ...active.table!, result: 'lost' } })
  assert.equal(canPlayTable(lost), false)
  assert.equal(turnLabel(lost), 'The house won this round.')
})

test('expiry copy rounds up remaining server time without going negative', () => {
  assert.equal(expiryLabel(120_001, 60_000), '2 minutes left')
  assert.equal(expiryLabel(119_999, 60_000), '1 minute left')
  assert.equal(expiryLabel(59_999, 60_000), 'Expires now')
})


test('revealed unmatched memory cards stay playable, while matched cards do not', () => {
  const current = session()
  current.table!.cards = [3, 1, 1, null, null, null, 3, null]
  current.table!.found = [1, 2]
  current.table!.last = [0, 6]
  assert.equal(canPickTableCard(current, 0), true)
  assert.equal(canPickTableCard(current, 6), true)
  assert.equal(canPickTableCard(current, 1), false)
  assert.equal(canPickTableCard(current, 3), true)
  assert.equal(canPickTableCard(current, -1), false)
  assert.equal(canPickTableCard(current, 8), false)
  current.table!.turn = 'host'
  assert.equal(canPickTableCard(current, 0), false)
})
