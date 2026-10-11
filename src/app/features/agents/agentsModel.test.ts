// The AI agents section's plain model, and the rule the "AI-played" tag follows (src/ui/agentMark.ts).
import test from 'node:test'
import assert from 'node:assert/strict'
import { AGENT_EXPLAINER, SUSPENDED_WORDS, mcpSnippet, since } from './agentsModel.ts'
import { agentPlayed } from '../../../ui/agentMark.ts'

test('the tag shows for an agent character always, and for an own character until the time the server named', () => {
  assert.equal(agentPlayed(undefined, 1000), false)
  assert.equal(agentPlayed({}, 1000), false)
  assert.equal(agentPlayed({ agent: true }, 9e15), true)
  assert.equal(agentPlayed({ agent: true, agentUntil: 5000 }, 4999), true)
  assert.equal(agentPlayed({ agent: true, agentUntil: 5000 }, 5000), false)
})

test('the section explains itself in three plain sentences, and the snippet carries the address and the key as a bearer header', () => {
  assert.equal(AGENT_EXPLAINER.length, 3)
  const parsed = JSON.parse(mcpSnippet('https://play.example/mcp', 'awk_abc')) as { mcpServers: { allworld: { type: string; url: string; headers: { Authorization: string } } } }
  assert.deepEqual(parsed.mcpServers.allworld, { type: 'http', url: 'https://play.example/mcp', headers: { Authorization: 'Bearer awk_abc' } })
  assert.ok(Object.keys(SUSPENDED_WORDS).length === 3)
})

test('last-used wording', () => {
  const now = 10_000_000
  assert.equal(since(null, now), 'never used')
  assert.equal(since(now - 20_000, now), 'used just now')
  assert.equal(since(now - 5 * 60_000, now), 'used 5 minutes ago')
  assert.equal(since(now - 3 * 3_600_000, now), 'used 3 hours ago')
  assert.equal(since(now - 5 * 86_400_000, now), 'used 5 days ago')
})
