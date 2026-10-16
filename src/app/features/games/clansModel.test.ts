// The Clans screen's model: invite links the quick start keeps, codes typed or pasted, board rows, the war lines, no betting words.
import test from 'node:test'
import assert from 'node:assert/strict'
import { FORBIDDEN_WORDS } from '../../../game/table-stakes.ts'
import { linkParts } from '../../../quick-start/model.ts'
import { boardRows, clanCodeOf, codeFromText, inviteLine, inviteLinkPath, lastWarLine, leagueShareLine, tierColour, warLine } from './clansModel.ts'

test('an invite link survives the quick start as a table link and comes back as the code', () => {
  const path = inviteLinkPath('EKOLNS'.replace('O', 'Q').replace('L', 'M'))
  assert.equal(path, '/?table=clan-ekqmns')
  const kept = linkParts('/', path.slice(1)).table
  assert.equal(kept, 'clan-ekqmns')
  assert.equal(clanCodeOf(kept), 'EKQMNS')
  assert.equal(clanCodeOf('g-fight-abcdef'), null)
  assert.equal(clanCodeOf('clan-abcdeo'), null, 'O is never in a code')
})

test('a code is read from six letters, with spaces or dashes, or from a whole pasted link', () => {
  assert.equal(codeFromText(' ekq-mns '), 'EKQMNS')
  assert.equal(codeFromText('https://joinallworld.com/?table=clan-ekqmns'), 'EKQMNS')
  assert.equal(codeFromText('hello'), null); assert.equal(codeFromText('IIIIII'), null)
})

test('board rows, rank colours and the war lines', () => {
  assert.deepEqual(boardRows([[1, 'Ada', 120.4, 2, 1], [2, 'Scout', 90, 1, 0, 1]]), [{ rank: 1, name: 'Ada', score: 120, tier: 2, me: true, ai: false }, { rank: 2, name: 'Scout', score: 90, tier: 1, me: false, ai: true }])
  assert.equal(tierColour(-1), tierColour(0)); assert.equal(tierColour(99), tierColour(5))
  assert.match(warLine(null, 2), /needs 3 people/)
  assert.match(warLine({ vs: null, mine: [] }, 5), /Looking for a clan/)
  assert.equal(warLine({ vs: { name: 'Eagles' }, mine: [30, 0, 60, 12, 5] }, 5), 'This week against Eagles. Your best 4 have 107 points so far.')
  assert.equal(lastWarLine({ vsName: 'Eagles', mine: 90, theirs: 0, outcome: 'win' }), 'Last week you beat Eagles, 90 to 0.')
  for (const line of [inviteLine('Eko Lions'), leagueShareLine('Lagos', 1, 3), leagueShareLine('Lagos', 4, 3), warLine({ vs: { name: 'X' }, mine: [1] }, 4)]) assert.doesNotMatch(line, FORBIDDEN_WORDS)
})
