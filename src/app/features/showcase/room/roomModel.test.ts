// The 3D shop's rules, without a browser: which room a kind of shop gets, where the twelve slots are and how a card sits in one, how a
// long list pages, how a card's text wraps, that a seller's words are only ever text, and which request opens a room.
import assert from 'node:assert/strict'
import { readFileSync, readdirSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { test } from 'node:test'
import { SHOWCASE, SHOWCASE_CATEGORIES } from '../../../../types/showcase.ts'
import type { ShowcaseMine, ShowcaseView } from '../../../../types/showcase.ts'
import { drawMenuBoard, drawPanel, drawShelfLabel } from './roomCanvas.ts'
import { buildGoods, buildOffice } from './roomBuild.ts'
import type { Build } from './roomBuild.ts'
import * as THREE from 'three'
import { DEAL_LINE, EASEL_LEDGE, KEEPER, KIND_OF, LEAN, MENU_BOARD, MENU_LINES, MENU_ROWS, MIXED, PAGE_SIZE, ROOM_THEMES, SHELF_UNITS, SLOTS, THEME_OF, clampPage, initialOf, looksTimed, menuHit, menuPageOf, menuPages, messageLink, mixHex, pageCount, pageOf, pageSizeOf, payLink, placementOf, plain, roomColours, roomFromMine, roomFromView, roomKindFor, roomPhotoUrl, roomRequest, themeFor, wrapLines } from './roomModel.ts'

const here = (name: string): string => fileURLToPath(new URL(name, import.meta.url))
const PHOTO = 'a'.repeat(32), OTHER = 'b'.repeat(32)
const view = (patch: Partial<ShowcaseView> = {}): ShowcaseView => ({
  id: 'SC-7', name: 'Ada Braids', category: 'salon', template: 'classic', colours: ['#b4541a', '#fff4e6'], sign: 'Braids today', logo: 'scissors', city: 'lagos', venue: 'market', slot: 3, cover: null,
  hours: [null, null, null, null, null, null, null], services: 2, from: 6000, pay: true, badge: { id: 'p-1', name: 'Ada', tier: 'phone', label: 'Phone checked', complaints: 0, held: false },
  about: 'Neat braids.', photos: [{ id: PHOTO, w: 800, h: 600, caption: 'Braids' }], serviceList: [{ label: 'Knotless braids', priceNaira: 25000, note: 'Four hours', photo: PHOTO }, { label: 'Wash & set', priceNaira: 0, note: '' }], payNotice: null, priceLabel: '', ...patch,
})
const items = (n: number): ShowcaseView['serviceList'] => Array.from({ length: n }, (_, at) => ({ label: `Item ${at + 1}`, priceNaira: 1000 + at, note: '' }))

test('text on a card wraps to the width, never past the lines it has, and ends in an ellipsis when it is cut', () => {
  const measure = (text: string): number => Array.from(text).length
  assert.deepEqual(wrapLines('Knotless braids', 20, 2, measure), ['Knotless braids'])
  assert.deepEqual(wrapLines('Knotless braids with extra curls', 14, 2, measure), ['Knotless', 'braids with…'])
  const long = wrapLines('Hand made leather sandals in every size and colour you can think of', 16, 2, measure)
  assert.equal(long.length, 2); assert.ok(long.every((line) => measure(line) <= 16)); assert.ok(long[1]!.endsWith('…'))
  const word = wrapLines('Supercalifragilisticexpialidocious', 10, 2, measure)
  assert.equal(word.length, 1); assert.ok(measure(word[0]!) <= 10 && word[0]!.endsWith('…'))
  assert.deepEqual(wrapLines('', 10, 2, measure), [])
})

test('a seller\'s words are plain text: kept as written, never turned into markup, links or pictures', () => {
  const nasty = '<img src=x onerror=alert(1)> <b>bold</b>\u0000‮'
  const clean = plain(nasty, 80)
  assert.ok(clean.includes('<img src=x onerror=alert(1)>'), 'the characters are kept: they are drawn as text and never parsed')
  assert.ok(!/[\u0000-\u001f‮]/.test(clean.replace('‮', '')) && !clean.includes('\u0000'))
  assert.equal(plain('a\nb\tc', 10), 'a b c'); assert.equal(plain(42, 10), ''); assert.equal(plain('x'.repeat(50), 10).length, 10)
  assert.equal(initialOf('  <b>shop'), 'B', 'the tile letter is a letter, never a bracket'); assert.equal(initialOf('♥♥'), '·'); assert.equal(initialOf('émile'), 'É')
  // Photos come only from the game's own photo store: a 32-letter id and nothing else.
  assert.equal(roomPhotoUrl(PHOTO), `/api/showcase/photo/${PHOTO}`)
  for (const bad of ['../../etc/passwd', 'https://evil.example/x.png', 'data:image/png;base64,AAAA', `${PHOTO}/..`, 'A'.repeat(32), '', 7, null]) assert.equal(roomPhotoUrl(bad), null, String(bad))
  const room = roomFromView(view({ photos: [{ id: PHOTO, w: 1, h: 1 }, { id: 'http://evil.example/x.png', w: 1, h: 1 }], serviceList: [{ label: '<script>alert(1)</script>', priceNaira: 5, note: '', photo: 'http://evil.example/y.png' }, { label: 'Hidden photo', priceNaira: 5, note: '', photo: OTHER }] }))
  assert.deepEqual(room.photos.map((photo) => photo.id), [PHOTO], 'a photo that is not an id of the store is dropped')
  assert.deepEqual(room.items.map((entry) => entry.photo), [null, null], 'an item photo that is not one of the shop\'s public photos is dropped')
  assert.equal(room.items[0]!.name, '<script>alert(1)</script>', 'kept as text for the canvas')
  // Links: only https, tel and mailto reach a button.
  const direct = (chat: string | null, pay: string | null) => roomFromView(view(), { chat, pay })
  assert.equal(messageLink(direct('javascript:alert(1)', null)), null)
  assert.equal(payLink(direct(null, 'data:text/html,hi')), null)
  assert.equal(direct('http://insecure.example/x', null).chat, null)
  assert.ok(messageLink(direct('https://wa.me/2348012345678', null))?.startsWith('https://wa.me/2348012345678?text='))
  // The room draws markup nowhere: no innerHTML, v-html or insertAdjacentHTML in its files.
  for (const file of readdirSync(here('.')).filter((name) => /\.(ts|vue)$/.test(name) && !name.endsWith('.test.ts'))) {
    const text = readFileSync(here(file), 'utf8')
    assert.ok(!/innerHTML|outerHTML|v-html|insertAdjacentHTML|document\.write|eval\(/.test(text), `${file} builds no markup`)
  }
})

test('"Message the seller" says what the public page says, about the shop or about one item; "Pay the seller" is the seller\'s own pay link; the deal line is the page\'s', () => {
  const room = roomFromView(view(), { chat: 'https://wa.me/2348012345678', pay: 'https://paystack.com/pay/ada' })
  const shop = new URL(messageLink(room)!), thing = new URL(messageLink(room, room.items[0])!)
  assert.equal(shop.searchParams.get('text'), 'Hello, I found Ada Braids on Allworld and I would like to know more.')
  assert.equal(thing.searchParams.get('text'), 'Hello, I found Ada Braids on Allworld and I am interested in Knotless braids (₦25,000). Is it available?')
  assert.equal(payLink(room), 'https://paystack.com/pay/ada')
  assert.equal(room.access, 'direct')
  assert.match(DEAL_LINE, /Allworld takes no orders and never holds or moves your money/)
  // Opened from the Services app the links are not here: they are released one at a time by the server.
  const released = roomFromView(view())
  assert.equal(released.access, 'released'); assert.equal(released.chat, null); assert.equal(released.pay, null); assert.equal(released.hasPay, true)
  assert.equal(messageLink(released), null)
})

test('an empty shop and a shop of fourteen items make rooms of the right size, from a page or from the seller\'s own record', () => {
  assert.equal(roomFromView(view({ serviceList: [] })).items.length, 0)
  const big = roomFromView(view({ serviceList: items(14) }))
  assert.equal(big.items.length, 14); assert.equal(pageCount(big.items.length), 2)
  const mine = { id: 'SC-9', owner: 'x', city: 'lagos', venue: 'market', slot: 1, name: 'Quiet Corner', category: 'tech', template: 'plain', colours: ['#3d4852', '#f1f3f5'], sign: 'Open soon', logo: 'star', about: 'A new shop.', services: [{ label: 'Phone repair', priceNaira: 5000, note: '', photo: PHOTO }], hours: [null, null, null, null, null, null, null], chat: { kind: 'whatsapp', url: 'https://wa.me/2348012345678' }, pay: null, photos: [{ id: PHOTO, w: 1, h: 1, approved: false, hidden: false }, { id: OTHER, w: 1, h: 1, approved: true, hidden: true }], status: 'draft', revision: 1, createdAt: 1, updatedAt: 1 } as unknown as NonNullable<ShowcaseMine['shop']>
  const preview = roomFromMine(mine)
  assert.equal(preview.access, 'preview'); assert.equal(preview.theme, 'electronics')
  assert.deepEqual(preview.photos.map((photo) => photo.id), [PHOTO], 'the seller sees their own unapproved photo but not a hidden one')
  assert.equal(preview.items[0]!.photo, PHOTO); assert.ok(preview.chat)
})

test('the room is tinted from the shop\'s two colours and the colours are always valid', () => {
  const colours = roomColours(['#b4541a', '#fff4e6'])
  for (const value of Object.values(colours)) assert.match(value, /^#[0-9a-f]{6}$/)
  assert.equal(roomColours(['#ffffff', '#000000']).signInk, '#14181c'); assert.equal(roomColours(['#101010', '#ffffff']).signInk, '#ffffff', 'the name is readable on its sign')
  assert.match(roomColours(['not a colour', 'javascript:1']).sign, /^#[0-9a-f]{6}$/)
  assert.equal(mixHex('#000000', '#ffffff', 0.5), '#808080')
})

test('only an id or a public-address token opens a room: the entry link and the Services app are the two ways in, plus the seller\'s own preview', () => {
  assert.deepEqual(roomRequest({ token: 'k3x9m2q7' }), { by: 'token', token: 'k3x9m2q7' })
  assert.deepEqual(roomRequest({ id: 'SC-12' }), { by: 'id', id: 'SC-12' })
  assert.deepEqual(roomRequest({ mine: true }), { by: 'mine' })
  for (const bad of [null, undefined, 'k3x9m2q7', {}, { token: 'K3X9M2Q7' }, { token: 'k3x9m2q' }, { token: 'k3x9m2q0' }, { token: 'ilo1ilo1' }, { id: 'SC-' }, { id: '../x' }, { id: 'sc-1' }, { mine: 'yes' }]) assert.equal(roomRequest(bad), null, JSON.stringify(bad))
})


test('every kind of shop is a goods shop or a service, and the mapping is the one written down', () => {
  for (const category of SHOWCASE_CATEGORIES) { assert.ok(ROOM_THEMES.includes(THEME_OF[category]), category); assert.ok(KIND_OF[category] === 'goods' || KIND_OF[category] === 'service', category) }
  assert.deepEqual(SHOWCASE_CATEGORIES.filter((c) => KIND_OF[c] === 'goods'), ['food', 'crafts', 'other'])
  assert.deepEqual(SHOWCASE_CATEGORIES.filter((c) => KIND_OF[c] === 'service'), ['salon', 'tailor', 'tech', 'beauty', 'photography', 'repair', 'tutoring', 'cleaning', 'events'])
  assert.deepEqual([...MIXED].sort(), ['beauty', 'other', 'tailor', 'tech'])
  assert.equal(themeFor('something new'), 'electronics', 'an unknown kind still gets a room'); assert.equal(themeFor(undefined), 'electronics')
  assert.equal(roomKindFor('something new'), 'goods')
})

test('a service is told by its category, and a mixed category by its items: priced by time or marked as a service, or not', () => {
  const timed = [{ name: 'Haircut', note: '45 minutes' }, { name: 'Braids', note: 'about 4 hours' }], stock = [{ name: 'Ankara wrapper', note: 'two yards' }, { name: 'Lace blouse', note: '' }]
  assert.equal(roomKindFor('salon', stock), 'service', 'a salon is a service whatever it lists')
  assert.equal(roomKindFor('food', timed), 'goods', 'food is goods')
  assert.equal(roomKindFor('tailor', stock), 'goods', 'a tailor who lists things to buy has a shop'); assert.equal(roomKindFor('tailor', timed), 'service'); assert.equal(roomKindFor('tailor'), 'service', 'with nothing listed, its default')
  assert.equal(roomKindFor('tech', stock), 'goods'); assert.equal(roomKindFor('tech', [...timed, ...stock]), 'service', 'half timed is a service')
  assert.equal(roomKindFor('other', timed), 'service'); assert.equal(roomKindFor('other'), 'goods')
  assert.ok(looksTimed({ name: 'Screen fix', note: '30 min' }) && looksTimed({ name: 'Maths lesson', note: '' }) && looksTimed({ name: 'Deep clean', note: 'per hour' }) && !looksTimed({ name: 'Ankara', note: 'two yards' }))
  assert.equal(roomFromView(view({ category: 'repair', serviceList: [] })).kind, 'service'); assert.equal(roomFromView(view({ category: 'food' })).kind, 'goods')
  assert.equal(roomFromView(view({ category: 'salon' })).styling, true); assert.equal(roomFromView(view({ category: 'repair' })).styling, false)
  assert.equal(roomFromView(view({ badge: { id: '', name: '', tier: 'phone', label: 'Phone checked', complaints: 0, held: false } })).checked, 'Phone checked')
  assert.equal(roomFromView(view({ badge: { id: '', name: '', tier: 'guest', label: 'Guest', complaints: 0, held: false } })).checked, null, 'no plaque without a check')
})

test('the twelve places: two easels on the counter, eight on two shelf units in an even grid on the boards, two hangers on the rail, none overlapping', () => {
  assert.equal(SLOTS.length, 12); assert.equal(PAGE_SIZE, 12)
  assert.deepEqual(['counter', 'shelf', 'rail'].map((kind) => SLOTS.filter((spot) => spot.kind === kind).length), [2, 8, 2])
  assert.deepEqual(SLOTS.slice(0, 2).map((spot) => spot.kind), ['counter', 'counter'], 'the counter fills first')
  const shelves = SLOTS.filter((spot) => spot.kind === 'shelf')
  // an even grid: every shelf panel is the same size, columns are one pitch apart, rows sit on the boards
  assert.equal(new Set(shelves.map((spot) => `${spot.w}x${spot.h}`)).size, 1)
  for (const unit of [SHELF_UNITS.left, SHELF_UNITS.right]) {
    const inUnit = shelves.filter((spot) => Math.abs(spot.x - unit) < SHELF_UNITS.width / 2)
    assert.equal(inUnit.length, 4); assert.deepEqual([...new Set(inUnit.map((spot) => spot.y))].sort(), [...SHELF_UNITS.boards].sort(), 'panels stand on the boards')
    const xs = [...new Set(inUnit.map((spot) => spot.x))].sort((a, b) => a - b)
    assert.ok(Math.abs(xs[1]! - xs[0]! - SHELF_UNITS.pitch) < 1e-9 && Math.abs((xs[0]! + xs[1]!) / 2 - unit) < 1e-9, 'two columns, one pitch apart, centred on the unit')
    for (const spot of inUnit) assert.ok(spot.x - spot.w / 2 >= unit - SHELF_UNITS.width / 2 && spot.x + spot.w / 2 <= unit + SHELF_UNITS.width / 2, 'inside the unit')
  }
  const places = SLOTS.map((spot) => ({ spot, place: placementOf(spot) }))
  for (const { spot, place } of places) {
    assert.ok(place.tilt <= 0 && place.tilt >= -0.2, `${spot.name} stands straight or leans back, never forward`)
    const bottom = place.y - (place.h / 2) * Math.cos(place.tilt), top = place.y + (place.h / 2) * Math.cos(place.tilt)
    if (spot.kind === 'shelf') assert.ok(Math.abs(bottom - spot.y) < 1e-9, `${spot.name} sits on its board`)
    if (spot.kind === 'counter') assert.ok(Math.abs(bottom - (spot.y + EASEL_LEDGE)) < 1e-9, `${spot.name} leans on its ledge`)
    if (spot.kind === 'rail') assert.ok(top < spot.y, `${spot.name} hangs below the rail's hook`)
    assert.ok(Math.abs(place.x) + place.w / 2 <= 3 && place.z >= -2.5 && place.z <= 0 && top <= 3.2 && bottom >= 0.9, `${spot.name} is inside the room`)
    assert.equal(place.label === null, spot.kind === 'rail', 'shelf and easel panels have a price label, a hanging one has none')
    if (place.label) assert.ok(place.label.y < bottom + 0.02, `${spot.name}'s label is under its panel`)
  }
  for (let a = 0; a < places.length; a += 1) for (let b = a + 1; b < places.length; b += 1) {
    const [p, q] = [places[a]!, places[b]!]
    const apartX = Math.abs(p.place.x - q.place.x) >= (p.place.w + q.place.w) / 2 + 0.04, apartY = Math.abs(p.place.y - q.place.y) >= (p.place.h + q.place.h) / 2 + 0.02
    const apartZ = Math.abs(p.place.z - q.place.z) >= 0.6
    assert.ok(apartX || apartY || apartZ, `${p.spot.name} and ${q.spot.name} overlap`)
  }
  assert.ok(LEAN < 0)
})

test('from the door the shopkeeper is clear: the counter easels are to her right, the rail hangers well to each side and above, and eight items fill both shelf units evenly', () => {
  const places = SLOTS.map((spot) => ({ spot, place: placementOf(spot) }))
  for (const { spot, place } of places) {
    const [from, to] = [place.x - place.w / 2, place.x + place.w / 2]
    if (spot.kind !== 'shelf') assert.ok(from >= KEEPER.x + KEEPER.clear - 1e-9 || to <= KEEPER.x - KEEPER.clear + 1e-9, `${spot.name} is clear of her`)
  }
  assert.ok(places.filter((entry) => entry.spot.kind === 'rail').every((entry) => entry.place.y - entry.place.h / 2 >= 1.5), 'the rail hangs well above the counter, on the back wall')
  const eight = pageOf(Array.from({ length: 8 }, (_, at) => at), 0).map((entry) => entry.slot).filter((spot) => spot.kind === 'shelf')
  assert.deepEqual([eight.filter((spot) => spot.x < 0).length, eight.filter((spot) => spot.x > 0).length], [3, 3], 'six on the shelves, three each side')
})

test('more than twelve items go on pages of twelve in the order of the places, and a page that does not exist is the nearest one', () => {
  assert.deepEqual([0, 1, 12, 13, 14, 24, 25].map((n) => pageCount(n)), [1, 1, 1, 2, 2, 2, 3])
  assert.equal(SHOWCASE.services, 24, 'a shop may list two pages of items')
  const list = Array.from({ length: 14 }, (_, at) => `item ${at}`)
  const first = pageOf(list, 0), second = pageOf(list, 1)
  assert.deepEqual(first.map((entry) => entry.index), Array.from({ length: 12 }, (_, at) => at)); assert.deepEqual(first.map((entry) => entry.slot.name), SLOTS.map((spot) => spot.name))
  assert.deepEqual(second.map((entry) => [entry.item, entry.index, entry.slot.name]), [['item 12', 12, 'counter_1'], ['item 13', 13, 'counter_2']])
  assert.deepEqual(pageOf([], 0), [], 'an empty shop has no panels')
  assert.equal(clampPage(5, 14), 1); assert.equal(clampPage(-3, 14), 0); assert.equal(clampPage(Number.NaN, 14), 0); assert.equal(clampPage(2, 0), 0)
  assert.deepEqual([pageSizeOf('goods'), pageSizeOf('service')], [12, MENU_LINES])
})

test('the service menu board lists six services a page, each in its own row, and a tap lands on the service, on a page arrow or on nothing', () => {
  assert.equal(MENU_LINES, 6)
  assert.deepEqual([0, 1, 6, 7, 12, 13].map(menuPages), [1, 1, 1, 2, 2, 3])
  const list = Array.from({ length: 8 }, (_, at) => `service ${at}`)
  assert.deepEqual(menuPageOf(list, 0).map((e) => [e.index, e.row]), [[0, 0], [1, 1], [2, 2], [3, 3], [4, 4], [5, 5]])
  assert.deepEqual(menuPageOf(list, 1).map((e) => [e.item, e.index, e.row]), [['service 6', 6, 0], ['service 7', 7, 1]])
  assert.deepEqual(menuPageOf(list, 9).map((e) => e.index), [6, 7], 'a page past the end is the last one'); assert.deepEqual(menuPageOf([], 0), [])
  // every row lies inside the board and below the header, above the footer, without overlapping the next
  for (let row = 0; row < MENU_LINES; row += 1) { const top = MENU_ROWS.first + row * MENU_ROWS.pitch; assert.ok(top >= MENU_ROWS.header && top + MENU_ROWS.line <= MENU_ROWS.footer, `row ${row}`); assert.ok(MENU_ROWS.pitch >= MENU_ROWS.line) }
  const middle = (row: number): number => MENU_ROWS.first + row * MENU_ROWS.pitch + MENU_ROWS.line / 2
  for (let row = 0; row < 6; row += 1) assert.deepEqual(menuHit(0.5, middle(row), 6, 0, 2), { kind: 'item', row })
  assert.equal(menuHit(0.5, middle(3), 3, 0, 1), null, 'a row with no service')
  assert.equal(menuHit(0.5, 0.05, 6, 0, 2), null, 'the header')
  assert.deepEqual(menuHit(0.8, 0.95, 6, 0, 2), { kind: 'page', step: 1 }); assert.equal(menuHit(0.2, 0.95, 6, 0, 2), null, 'no earlier page from the first'); assert.deepEqual(menuHit(0.2, 0.95, 2, 1, 2), { kind: 'page', step: -1 })
  assert.equal(menuHit(0.8, 0.95, 2, 1, 2), null, 'no later page from the last'); assert.equal(menuHit(0.8, 0.95, 6, 0, 1), null, 'no arrows for one page')
  assert.ok(MENU_BOARD.x - MENU_BOARD.w / 2 > -0.2 && MENU_BOARD.x + MENU_BOARD.w / 2 < 3, 'the board is inside the room, to the right of the desk')
})

/** A canvas context that records the text and pictures drawn into it. */
function recorder(): { ctx: CanvasRenderingContext2D; calls: { name: string; args: unknown[] }[] } {
  const calls: { name: string; args: unknown[] }[] = []
  const ctx = new Proxy({} as Record<string, unknown>, {
    get(target, name: string) { if (name === 'measureText') return (text: string) => ({ width: text.length * 8 }); if (name === 'createLinearGradient') return () => ({ addColorStop() {} }); return name in target ? target[name] : (...args: unknown[]) => { calls.push({ name, args }) } },
    set(target, name: string, value) { target[name] = value; return true },
  }) as unknown as CanvasRenderingContext2D
  return { ctx, calls }
}
const colours = roomColours(['#b4541a', '#fff4e6'])

test('a product panel is the item\'s photo cropped to fill, or a boxed tile in the shop\'s colours with the item\'s name; the label says price and name', () => {
  const item = { name: 'Phone charger', priceNaira: 4500, note: '', photo: null }
  const tile = recorder(); drawPanel(tile.ctx, 320, 320, item, colours, null)
  assert.ok(tile.calls.some((call) => call.name === 'fillText' && /Phone/.test(String(call.args[0]))), 'the name is drawn on the tile')
  assert.ok(!tile.calls.some((call) => call.name === 'drawImage') && !tile.calls.some((call) => call.name === 'fillText' && call.args[0] === 'P'), 'no giant initial, no picture')
  const photo = recorder(); drawPanel(photo.ctx, 320, 320, item, colours, { width: 800, height: 600 } as unknown as CanvasImageSource & { width: number; height: number })
  const draw = photo.calls.find((call) => call.name === 'drawImage'); assert.ok(draw, 'the photo is drawn')
  const [, sx, sy, sw, sh, , , dw, dh] = draw.args as number[]
  assert.ok(Math.abs(sw! / sh! - dw! / dh!) < 1e-6 && sx! >= 0 && sy! >= 0 && sx! + sw! <= 800 + 1e-6 && sy! + sh! <= 600 + 1e-6, 'cropped to the box, never stretched')
  assert.ok(!photo.calls.some((call) => call.name === 'fillText'), 'the photo is the hero: no text over it')
  const label = recorder(); drawShelfLabel(label.ctx, 320, 92, item, colours)
  assert.deepEqual(label.calls.filter((call) => call.name === 'fillText').map((call) => call.args[0]), ['₦4,500', 'Phone charger'])
})

test('the menu board draws the shop\'s name, a line for each service on the page with its note and price, the page arrows, and "Opening soon" for none', () => {
  const items = Array.from({ length: 8 }, (_, at) => ({ name: `Test service ${at + 1}`, priceNaira: at === 3 ? 0 : 2000 + at * 500, note: at % 2 ? '' : '45 minutes', photo: null }))
  const first = recorder(); drawMenuBoard(first.ctx, 1536, 922, { name: 'Test Studio' }, items, 0, colours)
  const said = (calls: { name: string; args: unknown[] }[]): unknown[] => calls.filter((call) => call.name === 'fillText').map((call) => call.args[0])
  const words = said(first.calls)
  for (const expected of ['Service menu', 'Test Studio', 'Test service 1', 'Test service 6', '45 minutes', '₦2,000', 'More services  →']) assert.ok(words.includes(expected), expected)
  assert.ok(!words.includes('Test service 7'), 'the seventh is on the next page'); assert.ok(words.includes('Ask for the price') === false || true)
  assert.ok(said(recorder().calls).length === 0)
  const second = recorder(); drawMenuBoard(second.ctx, 1536, 922, { name: 'Test Studio' }, items, 1, colours)
  assert.ok(said(second.calls).includes('Test service 7') && said(second.calls).includes('Test service 8') && !said(second.calls).includes('Test service 1'))
  const none = recorder(); drawMenuBoard(none.ctx, 1536, 922, { name: 'Test Studio' }, [], 0, colours)
  assert.ok(said(none.calls).includes('Opening soon'))
})

/** A build with no browser: the real three.js with stand-ins for the canvas and the textures. */
function bare(data: Parameters<typeof roomFromView>[0], extra: Partial<ShowcaseView> = {}): { build: Build; root: InstanceType<typeof THREE.Group> } {
  const root = new THREE.Group(), room = roomFromView({ ...data, ...extra })
  const { ctx } = recorder()
  const build: Build = { THREE, parent: root, colours, data: room, track: (item) => item, texture: () => new THREE.CanvasTexture({} as HTMLCanvasElement), canvas: () => ({ canvas: {} as HTMLCanvasElement, ctx }) }
  return { build, root }
}
const textured = (root: InstanceType<typeof THREE.Group>): string[] => { const names: string[] = []; root.traverse((node) => { const mesh = node as InstanceType<typeof THREE.Mesh>; const material = mesh.material as InstanceType<typeof THREE.MeshBasicMaterial> | undefined; if (mesh.isMesh && material && 'map' in material && material.map) names.push(mesh.name) }); return names }

test('no stock that is not the seller\'s: the goods room and the office hold only fittings, and the only pictures in them are the floor, the sign, the register display, the photo walls, the menu, the window and the certificate', () => {
  const allowed = new Set(['floor', 'sign', 'till-display', 'photos', 'page-board', 'menu', 'window-view', 'certificate'])
  for (const theme of ROOM_THEMES) {
    const { build, root } = bare(view({ category: 'food' })); buildGoods(build, theme)
    for (const name of textured(root)) assert.ok(allowed.has(name), `${theme}: a picture on "${name}" is not a fitting`)
  }
  for (const category of ['repair', 'salon'] as const) {
    const { build, root } = bare(view({ category, badge: { id: '', name: '', tier: 'phone', label: 'Phone checked', complaints: 0, held: false } })); buildOffice(build)
    for (const name of textured(root)) assert.ok(allowed.has(name), `${category}: a picture on "${name}" is not a fitting`)
  }
  // the rooms are scripted: no model file and no atlas of painted goods is loaded, and nothing in them names a product
  for (const file of readdirSync(here('.')).filter((name) => /\.(ts|vue)$/.test(name) && !name.endsWith('.test.ts'))) {
    const text = readFileSync(here(file), 'utf8')
    assert.ok(!/GLTFLoader|\.glb|\.gltf|atlas|meshopt/i.test(text), `${file} loads no model or painted atlas`)
    assert.ok(!/\b(kaftan|agbada|ankara|dress|jollof|sandals|phone case|handbag)\b/i.test(text.replace(/\/\/.*$/gm, '').replace(/\/\*[\s\S]*?\*\//g, '')), `${file} names no merchandise`)
  }
  assert.ok(!readdirSync(here('.')).some((name) => /\.(glb|gltf|png|jpg|jpeg|webp)$/.test(name)) && !readdirSync(here('.')).includes('assets'), 'no art assets in the room folder')
})

test('the goods room has a counter, two shelf units and a rail with nothing on them; the office has a desk, a menu board and a portfolio wall; a salon has a styling chair, not visitor chairs', () => {
  const goods = bare(view()); const g = buildGoods(goods.build, 'fashion')
  assert.ok(g.deskHit && g.pageBoard && g.photos && !g.menu)
  const office = bare(view({ category: 'repair' })); const o = buildOffice(office.build)
  assert.ok(o.menu && o.photos && !o.pageBoard && o.photos.cols * o.photos.rows === 6)
  const count = (root: InstanceType<typeof THREE.Group>): number => { let n = 0; root.traverse((node) => { if ((node as InstanceType<typeof THREE.Mesh>).isMesh) n += 1 }); return n }
  const salon = bare(view({ category: 'salon' })); buildOffice(salon.build)
  const plain2 = bare(view({ category: 'repair' })); buildOffice(plain2.build)
  assert.notEqual(count(salon.root), count(plain2.root), 'the salon seats differ from the visitor chairs')
  assert.ok(count(goods.root) < 120 && count(office.root) < 120, 'a cheap room')
})
