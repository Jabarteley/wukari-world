// The share loops' pure parts (docs/SHARE-LOOPS.md): links and words, the start card, the passport pages, Wrapped, street fame, the front
// page, the street video's caption, search and timing, and the duet's layout. No DOM.
import assert from 'node:assert/strict'
import { readFileSync, readdirSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { test } from 'node:test'
import { fileURLToPath } from 'node:url'
import { LOOP_KINDS, gameNaira, loopFile, loopHandle, loopLink, loopMark, loopText, plain, profileOf, seedOf, wrapLines } from './loopsModel.ts'
import { START_TITLES, startCard, startText, startTitle } from './startCardModel.ts'
import { STAMPS_PER_PAGE, fameCard, fameText, frontCredit, frontDate, frontText, monthBefore, monthTitle, pageProgress, passportPages, passportText, stampDate, stampTone, wrappedCard, wrappedText } from './loopCards.ts'
import { CAPTIONS, HOLD_MS, captionOf, cloudMotion, coverCrop, fold, matchPlaces, placesOf, recordingMs, streetPath, streetText } from './streetVideoModel.ts'
import { duetLayout, duetTitle } from './duetComposite.ts'
import { DIVE_MS, ENTRY_COUNTRY_MS, ENTRY_WORLD_MS } from '../../../map3d/dive.ts'
import type { FameView, FrontPageView, PassportStamp, WrappedView } from '../../../types/shareloops.ts'

const here = dirname(fileURLToPath(import.meta.url))
const ORIGIN = 'https://joinallworld.com'

test('every card links with its own ad-source words, the link alone on the last line', () => {
  assert.equal(loopLink(ORIGIN, 'wrapped', '/p/@ada'), 'https://joinallworld.com/p/@ada?utm_source=wrapped&utm_medium=card&utm_campaign=wrapped')
  assert.equal(loopLink('', 'street-video', '/street/lagos/surulere'), 'https://joinallworld.com/street/lagos/surulere?utm_source=street-video&utm_medium=card&utm_campaign=street-video')
  assert.equal(loopLink(ORIGIN, 'fame', 'javascript:alert(1)'), 'https://joinallworld.com/?utm_source=fame&utm_medium=card&utm_campaign=fame', 'only a plain path')
  assert.equal(loopLink(ORIGIN, 'fame', '//evil.example/x'), 'https://joinallworld.com/?utm_source=fame&utm_medium=card&utm_campaign=fame')
  for (const loop of LOOP_KINDS) assert.match(loopLink(ORIGIN, loop), new RegExp(`utm_source=${loop}&`))
  const text = loopText(['One\u0007', '', 'Two'], 'https://x.example/l')
  assert.equal(text, 'One\nTwo\nhttps://x.example/l')
  assert.equal(profileOf('@Ada_1', 'id'), '/p/@ada_1')
  assert.equal(profileOf(null, 'abc-123'), '/p/abc-123')
  assert.equal(profileOf(null, 'a b'), '/')
  assert.equal(loopMark('tunde'), '@tunde · joinallworld.com')
  assert.equal(loopMark('no'), 'joinallworld.com', 'not a handle the feed would keep')
  assert.equal(loopHandle('1abc'), null)
  assert.equal(loopFile('duet', 'video/mp4'), 'allworld-duet.mp4')
  assert.equal(loopFile('start'), 'allworld-start.png')
  assert.equal(gameNaira(12400.4), '₦12,400')
  assert.equal(gameNaira(-5), '₦0')
  assert.equal(plain('a\u0000b   c', 80), 'a b c')
  assert.equal(plain('x'.repeat(10), 5), 'xxxx…')
})

test('lines wrap to the width, cut a long word, and end in an ellipsis when words are left over', () => {
  const measure = (line: string) => line.length * 10
  assert.deepEqual(wrapLines('one two three four', 90, measure), ['one two', 'three', 'four'])
  assert.deepEqual(wrapLines('one two three four five six seven', 90, measure, 2), ['one two', 'three…'])
  assert.deepEqual(wrapLines('supercalifragilistic', 60, measure, 2), ['super…'])
  assert.deepEqual(wrapLines('', 60, measure), [])
  assert.equal(seedOf('Ada'), seedOf('Ada'))
  assert.notEqual(seedOf('Ada'), seedOf('Bola'))
})

test('the start card: job, home, money and a title from the birth lottery; the same name always gets the same title', () => {
  const card = startCard({ name: 'Ada', city: 'Lagos', area: 'Yaba', lottery: 'lapo-baby', lotteryLabel: 'LAPO Baby', cash: 96000, job: null, dream: 'Lekki landlord' })
  assert.equal(card.kicker, 'WHAT I GOT IN ALLWORLD')
  assert.deepEqual(card.rows.map((row) => [row.label, row.value]), [['Job', 'Open to offers'], ['Home', 'Starter house in Yaba, Lagos'], ['Money', '₦96,000 game naira'], ['Born', 'LAPO Baby'], ['Dream', 'Lekki landlord']])
  assert.ok(START_TITLES['lapo-baby'].includes(card.title))
  assert.equal(startTitle('lapo-baby', 'Ada'), card.title)
  assert.equal(startCard({ name: '', city: '', area: '', lottery: null, lotteryLabel: '', cash: null, job: 'Okada rider', dream: '' }).rows.map((row) => row.value).join('|'), 'Okada rider|A starter house of my own|Rolling…')
  const text = startText(card, 'https://x.example/s')
  assert.ok(text.includes(card.title) && text.endsWith('\nhttps://x.example/s'))
})

test('no start title talks down to anyone: a small start is a hustle, never poverty', () => {
  const unkind = /\b(poor|broke|poverty|beggar|wretched|useless|loser|nobody|struggling|suffer|hungry|cheap|dirty)\b/i
  for (const titles of Object.values(START_TITLES)) for (const title of titles) {
    assert.doesNotMatch(title, unkind, title)
    assert.ok(title.length <= 40, title)
  }
})

const stamp = (city: string, continent: string, at: number): PassportStamp => ({ city, name: city[0]!.toUpperCase() + city.slice(1), country: 'ng', countryName: 'Nigeria', continent, at })

test('the passport has a page per continent (more when it fills), oldest stamp first, with how many of the open cities it holds', () => {
  const stamps = [stamp('lagos', 'africa', 3), stamp('paris', 'europe', 2), stamp('abuja', 'africa', 1), ...Array.from({ length: STAMPS_PER_PAGE }, (_, i) => stamp(`c${i}`, 'asia', 10 + i))]
  const pages = passportPages({ stamps, open: { africa: 41, europe: 30, asia: 50 } })
  assert.deepEqual(pages.map((page) => [page.name, page.page, page.pages, page.stamps.length]), [['Africa', 1, 1, 2], ['Europe', 1, 1, 1], ['Asia', 1, 1, STAMPS_PER_PAGE]])
  assert.deepEqual(pages[0]!.stamps.map((s) => s.city), ['abuja', 'lagos'])
  assert.equal(pageProgress(pages[0]!), '2 of 41 cities in Africa')
  const more = passportPages({ stamps: Array.from({ length: STAMPS_PER_PAGE + 1 }, (_, i) => stamp(`c${i}`, 'asia', i)), open: {} })
  assert.deepEqual(more.map((page) => [page.page, page.pages, page.stamps.length]), [[1, 2, STAMPS_PER_PAGE], [2, 2, 1]])
  assert.equal(pageProgress({ ...more[1]!, total: 1 }), '1 city in Asia')
  assert.equal(stampDate(Date.UTC(2026, 9, 12, 10)), '12 Oct 2026')
  assert.equal(stampDate(Date.UTC(2026, 9, 12, 23, 30)), '13 Oct 2026', 'Lagos time')
  assert.equal(stampTone('lagos'), stampTone('lagos'))
  assert.ok(passportText(pages[0]!, 'L').endsWith('\nL'))
})

const month = (over: Partial<WrappedView> = {}): WrappedView => ({ month: '2026-10', partial: true, cities: [], homes: 0, friends: 0, earned: 0, votes: 0, ai: null, post: null, ...over })

test('Wrapped shows only figures that are more than nothing, the AI resident with its mark, and the best post', () => {
  const card = wrappedCard(month({ cities: ['Ibadan'], homes: 3, friends: 1, earned: 52000, votes: 2, ai: { name: 'Mama Put' }, post: { id: 'p', body: 'Jollof wars', reactions: 7 } }))
  assert.equal(card.title, 'My October 2026 so far')
  assert.deepEqual(card.tiles.map((tile) => `${tile.value} ${tile.label}`), ['4 places visited', '1 friend made', '₦52,000 game naira earned', '2 elections voted in', '1 new city'])
  assert.deepEqual(card.rows.map((row) => row.label), ['AI you saw most (AI)', 'Top post · 7 reactions', 'New stamps'])
  assert.equal(wrappedCard(month({ partial: false })).title, 'My October 2026')
  assert.equal(wrappedCard(month()).empty, true)
  assert.ok(wrappedText(month({ friends: 2 }), 'L').includes('2 friends made'))
  assert.equal(monthTitle('2026-01'), 'January 2026')
  assert.equal(monthBefore('2026-01'), '2025-12')
  assert.equal(monthBefore('2026-10'), '2026-09')
})

test('street fame: the top homes and communities, and a badge that says so', () => {
  const view: FameView = { city: 'lagos', week: 2900, name: '2026-10-19', homes: [{ rank: 1, name: 'Bola', visitors: 9 }, { rank: 2, name: 'Ada', visitors: 1, mine: true }], communities: [{ rank: 1, id: 'c', name: 'Yaba Runners', reactions: 1 }], badge: { rank: 2, city: 'lagos', cityName: 'Lagos', week: '2026-10-12' } }
  const card = fameCard(view, 'Lagos')
  assert.equal(card.title, 'Street famous · #2 in Lagos')
  assert.deepEqual(card.rows.map((row) => `${row.label}: ${row.value}`), ['#1 home · 9 visitors: Bola', '#2 home · 1 visitor: Ada (me)', '#1 community · 1 reaction: Yaba Runners'])
  assert.equal(card.foot, 'Week of 2026-10-19')
  assert.equal(fameCard({ ...view, badge: null }, 'Lagos').title, 'Street fame in Lagos')
  assert.ok(fameText(view, 'Lagos', 'L').startsWith('I am street famous in Allworld: #2 in Lagos'))
})

test('the front page says who wrote it and how many public lines it came from', () => {
  const page: FrontPageView = { city: 'lagos', cityName: 'Lagos', date: '2026-10-18', paper: 'The Lagos Gist', headline: 'Ada takes Lagos', stories: [{ head: 'Shop opens', body: 'In Yaba.' }], by: 'ai', lines: 5 }
  assert.equal(frontCredit(page), 'Written by AI from 5 public gist lines')
  assert.equal(frontCredit({ ...page, by: 'template', lines: 1 }), 'From 1 public gist line')
  assert.equal(frontDate(page), '18 October 2026')
  assert.equal(frontText(page, 'L'), 'The Lagos Gist, 18 October 2026 📰\nAda takes Lagos\n· Shop opens\nL')
})

test('the street video: its caption, its link, a search by name and the length of the dive it records', () => {
  const choice = { city: 'lagos', cityName: 'Lagos', place: { id: 'surulere', name: 'Surulere' } }
  assert.equal(captionOf('Where I grew up', choice), 'Where I grew up · Surulere, Lagos')
  assert.equal(captionOf('anything else', { ...choice, place: null }), `${CAPTIONS[0]} · Lagos`, 'only the offered captions')
  assert.equal(streetPath(choice), '/street/lagos/surulere')
  assert.equal(streetPath({ ...choice, place: null }), '/visit/lagos')
  assert.ok(streetText('My old street', choice, 'L').startsWith('My old street · Surulere, Lagos'))
  const items = [{ name: 'Surulere' }, { name: 'Ikeja' }, { name: 'Lagos Island' }, { name: 'Eti-Osa' }, { name: 'Ìbàdàn' }]
  assert.deepEqual(matchPlaces(items, 'isl').map((item) => item.name), ['Lagos Island'])
  assert.deepEqual(matchPlaces(items, 'osa').map((item) => item.name), ['Eti-Osa'])
  assert.deepEqual(matchPlaces(items, 'ibad').map((item) => item.name), ['Ìbàdàn'], 'accents do not matter')
  assert.deepEqual(matchPlaces(items, 'ur').map((item) => item.name), ['Surulere'])
  assert.equal(matchPlaces(items, '', 2).length, 2)
  assert.equal(fold('  Ìkẹ́ja!! '), 'ikeja')
  const places = placesOf({ units: [{ id: 'surulere', name: 'Surulere' }], districts: [{ id: 'sur', name: 'surulere', localUnitId: 'surulere' }, { id: 'ojuelegba', name: 'Ojuelegba', localUnitId: 'surulere' }, { id: 'x', name: 'Nowhere', localUnitId: 'gone' }] })
  assert.deepEqual(places.map((place) => place.id), ['surulere', 'ojuelegba'])
  assert.deepEqual(placesOf(null), [])
  assert.equal(recordingMs('full'), ENTRY_WORLD_MS + ENTRY_COUNTRY_MS + DIVE_MS + HOLD_MS)
  assert.ok(recordingMs('lite') < recordingMs('full'))
  assert.ok(recordingMs('full') <= 15_000, 'short enough for a Status')
  assert.deepEqual(coverCrop(1920, 1080, 540, 960), { sx: 656, sy: 0, sw: 608, sh: 1080 })
  assert.deepEqual(coverCrop(500, 2000, 540, 960), { sx: 0, sy: 556, sw: 500, sh: 889 })
  assert.deepEqual(cloudMotion('translate3d(-12.5%,0,0) scale(1.4)'), { shift: -12.5, scale: 1.4 })
  assert.deepEqual(cloudMotion(''), { shift: 0, scale: 1 })
})

test('a duet is two halves side by side, titled with both handles', () => {
  const layout = duetLayout(1280, 720)
  assert.equal(layout.left.x, 0)
  assert.equal(layout.left.w, layout.right.w)
  assert.equal(layout.right.x + layout.right.w, 1280)
  assert.ok(layout.right.x >= layout.left.w)
  assert.equal(duetTitle({ name: 'Ada', handle: 'ada' }, { name: 'Tunde' }), '@ada × Tunde')
})

test('location privacy: no share-loop file reads where the device is; the street video asks the existing on-device finder', () => {
  const files = readdirSync(here).filter((name) => /\.(ts|vue)$/.test(name) && !name.endsWith('.test.ts'))
  for (const name of files) {
    const source = readFileSync(join(here, name), 'utf8')
    assert.doesNotMatch(source, /getCurrentPosition|watchPosition|GeolocationPosition|navigator\.geolocation|(?<!\.)\.coords\b/, name)
    assert.doesNotMatch(source, /localStorage|sessionStorage|indexedDB/, `${name} keeps nothing on the device`)
  }
  assert.match(readFileSync(join(here, 'StreetVideo.vue'), 'utf8'), /findStreet/)
})
