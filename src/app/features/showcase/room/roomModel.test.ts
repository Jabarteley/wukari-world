// The 3D shop's rules, without a browser: which room a kind of shop gets, where the twelve slots are and how a card sits in one, how a
// long list pages, how a card's text wraps, that a seller's words are only ever text, and which request opens a room.
import assert from 'node:assert/strict'
import { readFileSync, readdirSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { test } from 'node:test'
import { SHOWCASE, SHOWCASE_CATEGORIES } from '../../../../types/showcase.ts'
import type { ShowcaseMine, ShowcaseView } from '../../../../types/showcase.ts'
import { drawItemCard } from './roomCanvas.ts'
import { MODEL_TILL, coveredTriangles, insideBox } from './roomGeometry.ts'
import type { Tri } from './roomGeometry.ts'
import { CARD_SIZE, DEAL_LINE, KEEPER, PAGE_SIZE, ROOM_THEMES, SLOTS, SLOT_ORDER, THEME_OF, cardPlace, clampPage, initialOf, messageLink, mixHex, pageCount, pageOf, payLink, plain, roomColours, roomFromMine, roomFromView, roomPhotoUrl, roomRequest, themeFor, wrapLines } from './roomModel.ts'

const here = (name: string): string => fileURLToPath(new URL(name, import.meta.url))
const PHOTO = 'a'.repeat(32), OTHER = 'b'.repeat(32)
const view = (patch: Partial<ShowcaseView> = {}): ShowcaseView => ({
  id: 'SC-7', name: 'Ada Braids', category: 'salon', template: 'classic', colours: ['#b4541a', '#fff4e6'], sign: 'Braids today', logo: 'scissors', city: 'lagos', venue: 'market', slot: 3, cover: null,
  hours: [null, null, null, null, null, null, null], services: 2, from: 6000, pay: true, badge: { id: 'p-1', name: 'Ada', tier: 'phone', label: 'Phone checked', complaints: 0, held: false },
  about: 'Neat braids.', photos: [{ id: PHOTO, w: 800, h: 600, caption: 'Braids' }], serviceList: [{ label: 'Knotless braids', priceNaira: 25000, note: 'Four hours', photo: PHOTO }, { label: 'Wash & set', priceNaira: 0, note: '' }], payNotice: null, priceLabel: '', ...patch,
})
const items = (n: number): ShowcaseView['serviceList'] => Array.from({ length: n }, (_, at) => ({ label: `Item ${at + 1}`, priceNaira: 1000 + at, note: '' }))

test('every kind of shop has a room, and the mapping is the one written down', () => {
  for (const category of SHOWCASE_CATEGORIES) assert.ok(ROOM_THEMES.includes(THEME_OF[category]), category)
  assert.deepEqual(SHOWCASE_CATEGORIES.filter((c) => THEME_OF[c] === 'fashion'), ['salon', 'tailor', 'beauty', 'crafts'])
  assert.deepEqual(SHOWCASE_CATEGORIES.filter((c) => THEME_OF[c] === 'food'), ['food', 'events'])
  assert.deepEqual(SHOWCASE_CATEGORIES.filter((c) => THEME_OF[c] === 'electronics'), ['tech', 'photography', 'repair', 'tutoring', 'cleaning', 'other'])
  assert.equal(themeFor('something new'), 'electronics', 'an unknown kind still gets a room')
  assert.equal(themeFor(undefined), 'electronics')
  assert.equal(roomFromView(view({ category: 'food' })).theme, 'food')
})

test('the twelve slots are the room model\'s: eight on shelves, two on the counter, two on the rail, in the model\'s units', () => {
  const model = JSON.parse(readFileSync(here('assets/shop-interior.json'), 'utf8')) as Record<string, { slots: { name: string; x: number; y: number; z: number; width: number; height: number; kind: string; anchor: string; facing_gltf: number[] }[]; room: { width: number; depth: number; height: number } }>
  assert.equal(SLOTS.length, 12); assert.equal(PAGE_SIZE, 12)
  for (const theme of ROOM_THEMES) {
    const known = model[theme]
    assert.ok(known, theme)
    assert.deepEqual(known.slots.map((slot) => ({ name: slot.name, x: slot.x, y: slot.y, z: slot.z, width: slot.width, height: slot.height, kind: slot.kind, anchor: slot.anchor, facing: slot.facing_gltf })), SLOTS.map((slot) => ({ ...slot, facing: [...slot.facing] })), theme)
  }
  assert.deepEqual(['shelf', 'counter', 'rail'].map((kind) => SLOTS.filter((slot) => slot.kind === kind).length), [8, 2, 2])
})

test('a card stands on its shelf or counter and hangs from the rail, faces into the room, and stays inside the room and apart from its neighbours', () => {
  const room = { w: 6, d: 5, h: 3.2 }
  const places = SLOTS.map((slot) => ({ slot, place: cardPlace(slot) }))
  for (const { slot, place } of places) {
    const bottom = place.y - place.h / 2, top = place.y + place.h / 2
    if (slot.anchor === 'bottom') assert.ok(Math.abs(bottom - slot.y) < 1e-9, `${slot.name} stands on its slot`)
    else assert.ok(top >= slot.y - 1e-9 && top <= slot.y + 0.5, `${slot.name} hangs at its slot, raised a little at most`)
    assert.ok(Math.abs(place.x) + place.w / 2 <= room.w / 2 && Math.abs(place.z) <= room.d / 2 && bottom >= 0 && top <= room.h, `${slot.name} is inside the room`)
    // The card's front looks along the slot's facing: yaw turns +z onto it.
    assert.ok(Math.abs(Math.sin(place.yaw) - slot.facing[0]) < 1e-9 && Math.abs(Math.cos(place.yaw) - slot.facing[2]) < 1e-9, `${slot.name} faces ${slot.facing.join(',')}`)
    assert.ok(place.tilt <= 0, 'a card leans back or stands straight, never forward')
    assert.deepEqual({ w: place.w, h: place.h }, CARD_SIZE[slot.kind])
  }
  // Two cards never overlap: compare the footprints (width along the wall) and the heights of every pair.
  for (let a = 0; a < places.length; a += 1) for (let b = a + 1; b < places.length; b += 1) {
    const [p, q] = [places[a]!, places[b]!]
    const alongA = Math.abs(p.slot.facing[0]) > 0.5 ? 'z' : 'x', alongB = Math.abs(q.slot.facing[0]) > 0.5 ? 'z' : 'x'
    if (alongA !== alongB || (alongA === 'z' ? Math.sign(p.slot.facing[0]) !== Math.sign(q.slot.facing[0]) : Math.abs(p.slot.z - q.slot.z) > 0.01)) continue
    const gap = Math.abs((alongA === 'z' ? p.place.z - q.place.z : p.place.x - q.place.x))
    const apart = gap >= (p.place.w + q.place.w) / 2 || Math.abs(p.place.y - q.place.y) >= (p.place.h + q.place.h) / 2 + 0.04
    assert.ok(apart, `${p.slot.name} and ${q.slot.name} overlap`)
  }
})

test('more than twelve items go on pages of twelve, the counter and rail first, and a page that does not exist is the nearest one', () => {
  assert.deepEqual([0, 1, 12, 13, 14, 24, 25].map(pageCount), [1, 1, 1, 2, 2, 2, 3])
  assert.equal(SHOWCASE.services, 24, 'a shop may list two pages of items')
  const list = Array.from({ length: 14 }, (_, at) => `item ${at}`)
  const first = pageOf(list, 0), second = pageOf(list, 1)
  assert.equal(first.length, 12); assert.deepEqual(first.map((entry) => entry.index), Array.from({ length: 12 }, (_, at) => at))
  assert.deepEqual(first.map((entry) => entry.slot.name), SLOT_ORDER.map((at) => SLOTS[at]!.name), 'the counter and the rail fill first, then the shelves')
  assert.deepEqual([...SLOT_ORDER].sort((a, b) => a - b), SLOTS.map((_, at) => at), 'every slot is used once')
  assert.deepEqual(first.slice(0, 4).map((entry) => entry.slot.kind), ['counter', 'counter', 'rail', 'rail'])
  assert.deepEqual(second.map((entry) => [entry.item, entry.index, entry.slot.name]), [['item 12', 12, 'slot_09'], ['item 13', 13, 'slot_10']])
  assert.deepEqual(pageOf([], 0), [], 'an empty shop has no cards')
  assert.equal(clampPage(5, 14), 1); assert.equal(clampPage(-3, 14), 0); assert.equal(clampPage(Number.NaN, 14), 0); assert.equal(clampPage(2, 0), 0)
})

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

test('an item with no photo gets a tile in the shop\'s colours with its initial; one with a photo draws it cropped to fill, never stretched', () => {
  const calls: { name: string; args: unknown[] }[] = []
  const ctx = new Proxy({} as Record<string, unknown>, {
    get(target, name: string) { if (name === 'measureText') return (text: string) => ({ width: text.length * 8 }); if (name === 'createLinearGradient') return () => ({ addColorStop() {} }); return name in target ? target[name] : (...args: unknown[]) => { calls.push({ name, args }) } },
    set(target, name: string, value) { target[name] = value; return true },
  }) as unknown as CanvasRenderingContext2D
  const colours = roomColours(['#b4541a', '#fff4e6'])
  const item = { name: 'äda\'s braids', priceNaira: 25000, note: '', photo: null }
  drawItemCard(ctx, 320, 357, item, colours, null)
  assert.ok(calls.some((call) => call.name === 'fillText' && call.args[0] === 'Ä'), 'the initial is drawn')
  assert.ok(calls.some((call) => call.name === 'fillText' && call.args[0] === '₦25,000'), 'the price is drawn')
  assert.ok(!calls.some((call) => call.name === 'drawImage'))
  calls.length = 0
  drawItemCard(ctx, 320, 357, item, colours, { width: 800, height: 600 } as unknown as CanvasImageSource & { width: number; height: number })
  const draw = calls.find((call) => call.name === 'drawImage')
  assert.ok(draw, 'the photo is drawn')
  const [, sx, sy, sw, sh, , , dw, dh] = draw.args as number[]
  assert.ok(Math.abs(sw! / sh! - dw! / dh!) < 1e-6, 'the crop has the shape of the box: nothing is stretched')
  assert.ok(sx! >= 0 && sy! >= 0 && sx! + sw! <= 800 + 1e-6 && sy! + sh! <= 600 + 1e-6, 'the crop is inside the photo')
  assert.ok(!calls.some((call) => call.name === 'fillText' && call.args[0] === 'Ä'), 'no initial over a photo')
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

test('a wall that has a plain swatch sheet at the same place as its picture drops the swatch, and nothing else', () => {
  // A 5 x 3.2 wall at x = 3 made of two triangles; the picture covers a big part of the atlas, the swatch a tiny one, facing the other way.
  const wall = (uv: number, flip: boolean): Tri[] => {
    const a = [3, 0, 2.5] as const, b = [3, 0, -2.5] as const, c = [3, 3.2, -2.5] as const, d = [3, 3.2, 2.5] as const
    const t = (p: Tri['p']): Tri => ({ p, uv: [[0, 0], [uv, 0], [uv, uv]] })
    return flip ? [t([a, c, b]), t([a, d, c])] : [t([a, b, c]), t([a, c, d])]
  }
  const tris = [...wall(0.25, false), ...wall(0.03, true)]
  assert.deepEqual([...coveredTriangles(tris)].sort(), [2, 3], 'the swatch triangles are left out')
  assert.deepEqual([...coveredTriangles(wall(0.25, false))], [], 'a wall with one sheet keeps it')
  const small: Tri = { p: [[3, 0, 0], [3, 0.1, 0], [3, 0.1, 0.1]], uv: [[0, 0], [0.001, 0], [0.001, 0.001]] }
  assert.deepEqual([...coveredTriangles([...tris, small, { ...small, uv: [[0, 0], [0.2, 0], [0.2, 0.2]] }])].sort(), [2, 3], 'small pieces are never touched')
  assert.deepEqual([...coveredTriangles([{ p: [[0, 0, 0], [1, 0, 0], [2, 0, 0]], uv: [[0, 0], [0, 0], [0, 0]] }])], [], 'a sliver is ignored')
})

test('from the door nothing hides the shopkeeper: counter cards stand to her right, rail cards hang well to each side, and the shelves fill on both sides first', () => {
  const places = SLOTS.map((slot) => ({ slot, place: cardPlace(slot) }))
  for (const { slot, place } of places) {
    const [from, to] = [place.x - place.w / 2, place.x + place.w / 2]
    if (slot.kind === 'counter') assert.ok(from >= KEEPER.x + KEEPER.clear - 1e-9, `${slot.name} is clear of her`)
    if (slot.kind === 'rail') assert.ok(to <= KEEPER.x - KEEPER.clear + 1e-9 || from >= KEEPER.x + KEEPER.clear - 1e-9, `${slot.name} is clear of her`)
  }
  const counter = places.filter((entry) => entry.slot.kind === 'counter')
  const rail = places.filter((entry) => entry.slot.kind === 'rail'), top = Math.max(...counter.map((entry) => entry.place.y + entry.place.h / 2))
  assert.ok(rail.every((entry) => entry.place.y - entry.place.h / 2 >= top), 'rail cards hang above the counter cards')
  assert.ok(counter[0]!.place.x + counter[0]!.place.w / 2 <= counter[1]!.place.x - counter[1]!.place.w / 2, 'the two counter cards do not overlap')
  const eight = pageOf(Array.from({ length: 8 }, (_, at) => at), 0).map((entry) => entry.slot)
  const left = eight.filter((slot) => slot.kind === 'shelf' && slot.x < 0).length, right = eight.filter((slot) => slot.kind === 'shelf' && slot.x > 0).length
  assert.deepEqual([left, right], [2, 2], 'eight items put two cards on each side shelf')
  assert.ok(CARD_SIZE.shelf.w >= 0.58, 'shelf cards read from the door')
})

test('the model\'s plain dark till is recognised and only it: the counter top and the shelves are not', () => {
  const box = (a: [number, number, number], b: [number, number, number], c: [number, number, number]) => ({ p: [a, b, c] as const, uv: [[0, 0], [1, 0], [1, 1]] as const })
  assert.ok(insideBox(box([-1.3, 1.28, -0.45], [-0.7, 1.28, -0.45], [-0.7, 1.28, -0.85]), MODEL_TILL))
  assert.ok(!insideBox(box([-1.4, 1, -0.3], [1.4, 1, -0.3], [1.4, 1, -1]), MODEL_TILL), 'the counter top')
  assert.ok(!insideBox(box([-2.6, 1, 0.6], [-2.6, 1.1, 0.6], [-2.6, 1.1, 0.7]), MODEL_TILL), 'a shelf')
})
