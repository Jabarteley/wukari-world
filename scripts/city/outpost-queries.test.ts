import assert from 'node:assert/strict'
import test from 'node:test'
import { createHash } from 'node:crypto'
import { NOT_SENSITIVE, PROFILE_PLACE_FILTERS, ROAD_LADDER, civilLanduseQuery, extrasQuery, ladderRoadsQuery, landuseQuery, placesQuery, profileExtrasQuery, profilePlacesQuery, roadsQuery } from '../geo/destination-detail/queries.ts'

const bbox = '-62.25,-59.05,-62.15,-58.9'
const sha = (text: string): string => createHash('sha256').update(text).digest('hex')

test('the standard queries are unchanged (every recorded Overpass answer is keyed by its text)', () => {
  // sha256 of the query texts before the outpost queries existed (queries.ts at release M, 0c4d507c).
  assert.deepEqual([placesQuery(bbox), extrasQuery(bbox), landuseQuery(bbox), roadsQuery(bbox, '1,2,3,4')].map(sha), [
    '7a0162cd6dcaf477efbfb44abe98726332467861b36707020fd18e476c0695b2', '81ed02d255fc3dddfd8e7fcdd09f39fd88c4d2434ec6c89f755f81681ef6f796',
    '54a7af822be5d949e8c294ec169b6c7ec2a32e90f9600da8497a6ec13ddface6', 'de17925a527dc572bb6db718bc5f22346f24de612098fb6e85f95fc01b05f251'])
})

test('outpost queries: every standard place filter plus the named extras, never a sensitive feature', () => {
  const standard = placesQuery(bbox).split('\n').filter(line => line.startsWith('nwr')).map(line => line.slice(0, -1))
  const outpost = profilePlacesQuery(bbox, ['post_office', 'hut', 'research', 'historic', 'ferry'])
  for (const filter of standard) assert.ok(outpost.includes(`${filter}${NOT_SENSITIVE};`), filter)
  for (const key of ['post_office', 'hut', 'research', 'historic', 'ferry'] as const) for (const filter of PROFILE_PLACE_FILTERS[key]) assert.ok(outpost.includes(`nwr${filter}${NOT_SENSITIVE};`))
  assert.ok(!outpost.includes('"natural"'), 'natural names are the wilderness filter only')
  assert.match(profilePlacesQuery(bbox, ['natural']), /mountain_pass/)
  assert.equal(outpost.split('\n').filter(line => line.startsWith('nwr')).every(line => line.endsWith(`${NOT_SENSITIVE};`)), true)
  assert.equal(profileExtrasQuery(bbox).split('\n').filter(line => line.startsWith('nwr')).length, extrasQuery(bbox).split('\n').filter(line => line.startsWith('nwr')).length)
  assert.ok(!civilLanduseQuery(bbox).includes('military'))
  assert.equal(civilLanduseQuery(bbox), landuseQuery(bbox).replace('|military', ''))
  assert.match(ladderRoadsQuery(bbox), new RegExp(`primary\\|${ROAD_LADDER.join('\\|')}\\)`))
  assert.match(ladderRoadsQuery(bbox), /\[!"military"\]\[!"aeroway"\]/)
})
