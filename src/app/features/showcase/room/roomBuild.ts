// The rooms themselves, built from boxes and planes in the shop's colours: a goods shop (a counter, two shelf units and a rail, all empty
// until the seller's own items are put on them) and an office or studio for services (a reception desk, visitor chairs or a styling chair,
// a window, a plant, a portfolio wall and the service menu board). Nothing here is merchandise: no stock is drawn or modelled that the seller
// did not list. Every function takes the three.js module it is given, so a test can read what was built without a browser.
import type * as THREE_TYPES from 'three'
import { FONT, roundedRect } from './roomCanvas.ts'
import { MENU_BOARD, SHELF_UNITS, mixHex } from './roomModel.ts'
import type { RoomColours, RoomData, RoomTheme } from './roomModel.ts'

type Three = typeof THREE_TYPES

export interface Build {
  THREE: Three
  parent: THREE_TYPES.Object3D
  colours: RoomColours
  data: RoomData
  /** Remember a resource so it is freed with the room. */
  track<T extends { dispose(): void }>(item: T): T
  /** A canvas as a sharp texture. */
  texture(canvas: HTMLCanvasElement): THREE_TYPES.CanvasTexture
  canvas(width: number, height: number): { canvas: HTMLCanvasElement; ctx: CanvasRenderingContext2D }
}
/** What a room hands back: the things a tap can land on, and the planes the scene paints pictures into later. */
export interface Fittings {
  /** Where the shopkeeper or the person at the desk stands. */
  keeper: { x: number; z: number }
  /** A box around the counter or the desk that counts as a tap on the shop. */
  deskHit: THREE_TYPES.Mesh
  /** The plane the shop's photos are drawn on, with how many frames it has (columns by rows). */
  photos: { mesh: THREE_TYPES.Mesh; cols: number; rows: number; width: number; height: number } | null
  /** The wall board a visitor taps to move between pages of items (goods rooms). */
  pageBoard: THREE_TYPES.Mesh | null
  /** The service menu board (office). */
  menu: THREE_TYPES.Mesh | null
}

const WOOD = '#9a6a3f', WOOD_DARK = '#6e4626'
const paint = (b: Build, color: string): THREE_TYPES.MeshLambertMaterial => b.track(new b.THREE.MeshLambertMaterial({ color }))
function box(b: Build, w: number, h: number, d: number, x: number, y: number, z: number, material: THREE_TYPES.Material, parent: THREE_TYPES.Object3D = b.parent): THREE_TYPES.Mesh {
  const mesh = new b.THREE.Mesh(b.track(new b.THREE.BoxGeometry(w, h, d)), material)
  mesh.position.set(x, y, z); parent.add(mesh)
  return mesh
}
function plane(b: Build, w: number, h: number, x: number, y: number, z: number, material: THREE_TYPES.Material, ry = 0): THREE_TYPES.Mesh {
  const mesh = new b.THREE.Mesh(b.track(new b.THREE.PlaneGeometry(w, h)), material)
  mesh.position.set(x, y, z); mesh.rotation.y = ry; b.parent.add(mesh)
  return mesh
}
const basic = (b: Build, map: THREE_TYPES.Texture): THREE_TYPES.MeshBasicMaterial => b.track(new b.THREE.MeshBasicMaterial({ map, color: '#f4eee4', toneMapped: false }))

/** The floor's picture: planks, a chequer or tiles, in the shop's colours. */
function floorTexture(b: Build, style: 'planks' | 'chequer' | 'tiles' | 'carpet'): THREE_TYPES.CanvasTexture {
  const { canvas, ctx } = b.canvas(256, 256)
  const a = style === 'chequer' ? mixHex('#ffffff', b.colours.sign, 0.12) : style === 'tiles' ? mixHex('#6d7480', b.colours.sign, 0.18) : style === 'carpet' ? mixHex('#c9c2b4', b.colours.sign, 0.22) : '#c99a66'
  const c = style === 'chequer' ? mixHex('#c43a2d', b.colours.sign, 0.35) : style === 'tiles' ? mixHex('#565c68', b.colours.sign, 0.18) : style === 'carpet' ? mixHex('#bcb4a4', b.colours.sign, 0.22) : '#b7844f'
  ctx.fillStyle = a; ctx.fillRect(0, 0, 256, 256)
  ctx.fillStyle = c
  if (style === 'chequer' || style === 'tiles') { for (let y = 0; y < 4; y += 1) for (let x = 0; x < 4; x += 1) if ((x + y) % 2) ctx.fillRect(x * 64, y * 64, 64, 64) }
  else if (style === 'planks') { for (let y = 0; y < 256; y += 64) { ctx.fillRect(0, y, 256, 4); for (let x = (y / 64) % 2 ? 0 : 96; x < 256; x += 192) ctx.fillRect(x, y, 3, 64) } }
  const texture = b.texture(canvas)
  texture.wrapS = texture.wrapT = b.THREE.RepeatWrapping
  texture.repeat.set(style === 'carpet' ? 2 : 3, style === 'carpet' ? 2 : 2.5)
  return texture
}

/** The walls, the floor, the ceiling and the light fitting: the same shell for both kinds of room. */
function shell(b: Build, floor: 'planks' | 'chequer' | 'tiles' | 'carpet'): void {
  const wall = paint(b, mixHex('#ffffff', b.colours.wall, 0.55))
  const floorMaterial = b.track(new b.THREE.MeshLambertMaterial({ map: floorTexture(b, floor) }))
  const ground = plane(b, 6, 5, 0, 0, 0, floorMaterial); ground.rotation.x = -Math.PI / 2; ground.name = 'floor'
  plane(b, 6, 3.2, 0, 1.6, -2.5, wall)
  plane(b, 5, 3.2, -3, 1.6, 0, wall, Math.PI / 2)
  plane(b, 5, 3.2, 3, 1.6, 0, wall, -Math.PI / 2)
  const ceiling = plane(b, 6.3, 5.6, 0, 3.2, 0.1, paint(b, mixHex('#fff6e6', b.colours.wall, 0.2))); ceiling.rotation.x = Math.PI / 2; (ceiling.material as THREE_TYPES.Material).side = b.THREE.DoubleSide
  const trim = paint(b, mixHex('#ffffff', b.colours.wall, 0.3))
  box(b, 6, 0.12, 0.03, 0, 0.06, -2.485, trim); box(b, 0.03, 0.12, 5, -2.985, 0.06, 0, trim); box(b, 0.03, 0.12, 5, 2.985, 0.06, 0, trim)
  const lamp = new b.THREE.Mesh(b.track(new b.THREE.CylinderGeometry(0.32, 0.4, 0.07, 18)), b.track(new b.THREE.MeshBasicMaterial({ color: '#fff1cf' })))
  lamp.position.set(0, 3.15, 0.2); b.parent.add(lamp)
}

/** The shop's name on a sign above the back wall. */
function sign(b: Build, y = 2.78): void {
  const { canvas, ctx } = b.canvas(1280, 180)
  const { colours, data } = b
  ctx.fillStyle = colours.sign; ctx.fillRect(0, 0, 1280, 180)
  ctx.strokeStyle = colours.accent; ctx.lineWidth = 6; roundedRect(ctx, 14, 14, 1252, 152, 16); ctx.stroke()
  ctx.fillStyle = colours.signInk; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'
  let size = 104
  do { ctx.font = `800 ${size}px ${FONT}`; size -= 4 } while (ctx.measureText(data.name).width > 1140 && size > 36)
  ctx.fillText(data.name, 640, data.sign ? 78 : 92)
  if (data.sign) { ctx.font = `600 34px ${FONT}`; ctx.globalAlpha = 0.85; ctx.fillText(data.sign, 640, 142, 1100); ctx.globalAlpha = 1 }
  box(b, 3.2, 0.5, 0.05, 0, y, -2.47, paint(b, WOOD_DARK))
  plane(b, 3.04, 0.42, 0, y, -2.442, basic(b, b.texture(canvas))).name = 'sign'
}

/** A potted plant. */
function plant(b: Build, x: number, z: number, scale = 1): void {
  const pot = new b.THREE.Mesh(b.track(new b.THREE.CylinderGeometry(0.16 * scale, 0.12 * scale, 0.28 * scale, 12)), paint(b, mixHex('#b4543a', b.colours.sign, 0.25)))
  pot.position.set(x, 0.14 * scale, z); b.parent.add(pot)
  const leaves = paint(b, '#3f8a4a'), bright = paint(b, '#58a65c')
  for (const [dx, dy, dz, r, m] of [[0, 0.5, 0, 0.22, leaves], [0.12, 0.72, 0.04, 0.17, bright], [-0.1, 0.66, -0.05, 0.16, leaves], [0.02, 0.9, 0, 0.12, bright]] as const) {
    const ball = new b.THREE.Mesh(b.track(new b.THREE.IcosahedronGeometry(r * scale, 0)), m)
    ball.position.set(x + dx * scale, dy * scale, z + dz * scale); b.parent.add(ball)
  }
}

/** A flat framed mirror. */
function mirror(b: Build, x: number, y: number, z: number, w: number, h: number, ry: number): void {
  const frame = new b.THREE.Group(); frame.position.set(x, y, z); frame.rotation.y = ry; b.parent.add(frame)
  box(b, w + 0.1, h + 0.1, 0.05, 0, 0, 0, paint(b, WOOD_DARK), frame)
  const glass = new b.THREE.Mesh(b.track(new b.THREE.PlaneGeometry(w, h)), b.track(new b.THREE.MeshBasicMaterial({ color: '#cfdde6' })))
  glass.position.z = 0.03; frame.add(glass)
}

/** The goods shop: a counter with a register, two shelf units, a rail, a mirror and plants. Every board and the rail are empty. */
export function buildGoods(b: Build, theme: RoomTheme): Fittings {
  shell(b, theme === 'food' ? 'chequer' : theme === 'electronics' ? 'tiles' : 'planks')
  sign(b)
  const wood = paint(b, WOOD), dark = paint(b, WOOD_DARK), backing = paint(b, mixHex('#fff7ea', b.colours.accent, 0.5))
  // a plain wall panel behind the counter
  box(b, 3.1, 1.7, 0.04, 0, 1.5, -2.48, backing)
  box(b, 3.2, 0.06, 0.06, 0, 0.62, -2.46, dark); box(b, 3.2, 0.06, 0.06, 0, 2.38, -2.46, dark)
  // the two shelf units
  for (const cx of [SHELF_UNITS.left, SHELF_UNITS.right]) {
    box(b, SHELF_UNITS.width, 2.5, 0.02, cx, 1.25, -2.49, backing)
    for (const side of [-1, 1]) box(b, 0.07, 2.58, SHELF_UNITS.depth, cx + (side * SHELF_UNITS.width) / 2, 1.29, -2.5 + SHELF_UNITS.depth / 2, dark)
    for (const top of [...SHELF_UNITS.boards, 0.3, 2.5]) box(b, SHELF_UNITS.width, top === 2.5 ? 0.08 : SHELF_UNITS.thickness, SHELF_UNITS.depth, cx, top - (top === 2.5 ? 0.04 : SHELF_UNITS.thickness / 2), -2.5 + SHELF_UNITS.depth / 2, wood)
  }
  // the counter
  box(b, 2.5, 1.0, 0.65, 0, 0.5, -0.67, dark)
  box(b, 2.6, 0.06, 0.75, 0, 1.03, -0.67, wood)
  box(b, 2.4, 0.7, 0.02, 0, 0.5, -0.335, paint(b, mixHex(b.colours.sign, '#2a1c10', 0.15)))
  // the rail
  const rail = new b.THREE.Mesh(b.track(new b.THREE.CylinderGeometry(0.022, 0.022, 2.7, 10)), paint(b, '#6f6f74')); rail.rotation.z = Math.PI / 2; rail.position.set(0, 2.3, -2.3); b.parent.add(rail)
  for (const x of [-1.35, 1.35]) box(b, 0.04, 0.04, 0.2, x, 2.3, -2.4, paint(b, '#6f6f74'))
  // fittings on the side walls and in the corners
  mirror(b, 2.94, 1.55, 0.5, 0.9, 1.5, -Math.PI / 2)
  plant(b, -2.7, 1.5, 1.2); plant(b, 2.7, 1.6, 1.2)
  // the register
  till(b, -1.0, 1.06, -0.65)
  const deskHit = new b.THREE.Mesh(b.track(new b.THREE.BoxGeometry(2.5, 1.1, 0.9)), b.track(new b.THREE.MeshBasicMaterial({ visible: false })))
  deskHit.position.set(0, 0.55, -0.67); b.parent.add(deskHit)
  // the photos wall: a strip on the left wall
  const strip = plane(b, 2.8, 0.75, -2.97, 2.3, -0.4, b.track(new b.THREE.MeshBasicMaterial({ color: '#ffffff' })), Math.PI / 2)
  strip.name = 'photos'
  // the board a visitor taps for more items
  const board = plane(b, 1.5, 0.47, 2.96, 2.35, -0.9, b.track(new b.THREE.MeshBasicMaterial({ color: '#ffffff' })), -Math.PI / 2)
  board.name = 'page-board'; board.visible = false
  return { keeper: { x: -0.05, z: -1.3 }, deskHit, photos: { mesh: strip, cols: 4, rows: 1, width: 1344, height: 360 }, pageBoard: board, menu: null }
}

/** A small cash register: a drawer, a keypad and a lit display. */
function till(b: Build, x: number, y: number, z: number): void {
  const body = paint(b, '#cfc8b8'), trim = paint(b, '#3b3a38'), keys = paint(b, '#8e8a80')
  const { canvas, ctx } = b.canvas(128, 64)
  ctx.fillStyle = '#12301f'; ctx.fillRect(0, 0, 128, 64); ctx.fillStyle = '#7fe3a1'; ctx.font = `700 34px ${FONT}`; ctx.textAlign = 'right'; ctx.textBaseline = 'middle'; ctx.fillText('0.00', 118, 34)
  const group = new b.THREE.Group(); group.position.set(x, y, z); b.parent.add(group)
  box(b, 0.5, 0.12, 0.34, 0, 0.06, 0, paint(b, '#a8a294'), group); box(b, 0.5, 0.06, 0.34, 0, 0.15, 0, body, group)
  const pad = box(b, 0.46, 0.04, 0.16, 0, 0.2, 0.07, keys, group); pad.rotation.x = -0.25
  box(b, 0.46, 0.14, 0.06, 0, 0.3, -0.12, trim, group)
  const glass = new b.THREE.Mesh(b.track(new b.THREE.PlaneGeometry(0.4, 0.1)), basic(b, b.texture(canvas))); glass.position.set(0, 0.3, -0.088); glass.rotation.x = -0.2; glass.name = 'till-display'; group.add(glass)
}

/** A visitor chair: a seat, a back and four legs, facing the way `ry` says (0 faces +z). */
function chair(b: Build, x: number, z: number, ry: number): void {
  const group = new b.THREE.Group(); group.position.set(x, 0, z); group.rotation.y = ry; b.parent.add(group)
  const cloth = paint(b, mixHex(b.colours.sign, '#ffffff', 0.15)), legs = paint(b, '#4a4036')
  box(b, 0.5, 0.08, 0.5, 0, 0.45, 0, cloth, group); box(b, 0.5, 0.5, 0.06, 0, 0.74, -0.22, cloth, group)
  for (const [dx, dz] of [[-0.21, -0.21], [0.21, -0.21], [-0.21, 0.21], [0.21, 0.21]] as const) box(b, 0.05, 0.42, 0.05, dx, 0.21, dz, legs, group)
}
/** A styling chair on a round base, for a salon: facing the way `ry` says. */
function stylingChair(b: Build, x: number, z: number, ry: number): void {
  const group = new b.THREE.Group(); group.position.set(x, 0, z); group.rotation.y = ry; b.parent.add(group)
  const cloth = paint(b, mixHex(b.colours.sign, '#101010', 0.1)), steel = paint(b, '#8a8f98')
  const base = new b.THREE.Mesh(b.track(new b.THREE.CylinderGeometry(0.32, 0.36, 0.06, 18)), steel); base.position.y = 0.03; group.add(base)
  const post = new b.THREE.Mesh(b.track(new b.THREE.CylinderGeometry(0.06, 0.06, 0.4, 10)), steel); post.position.y = 0.26; group.add(post)
  box(b, 0.6, 0.12, 0.58, 0, 0.52, 0, cloth, group); box(b, 0.56, 0.8, 0.1, 0, 0.98, -0.26, cloth, group); box(b, 0.3, 0.18, 0.1, 0, 1.5, -0.26, cloth, group)
  box(b, 0.06, 0.06, 0.4, -0.34, 0.74, 0, steel, group); box(b, 0.06, 0.06, 0.4, 0.34, 0.74, 0, steel, group)
}

/** The office or studio: a reception desk with a person behind it, visitor chairs (or a styling chair and a mirror for a salon), a window, a plant, a portfolio wall and the service menu board. */
export function buildOffice(b: Build): Fittings {
  shell(b, 'carpet')
  sign(b)
  const wood = paint(b, WOOD), dark = paint(b, WOOD_DARK)
  // reception desk, left of the middle so the menu board is the first thing the eye lands on
  const dx = -0.9
  box(b, 1.7, 0.95, 0.7, dx, 0.475, -1.0, dark)
  box(b, 1.8, 0.05, 0.8, dx, 0.975, -1.0, wood)
  box(b, 1.6, 0.6, 0.02, dx, 0.5, -0.645, paint(b, mixHex(b.colours.sign, '#2a1c10', 0.1)))
  // a laptop and a bell on the desk
  box(b, 0.42, 0.02, 0.3, dx - 0.45, 1.01, -0.95, paint(b, '#9aa0a8')); const screen = box(b, 0.42, 0.28, 0.02, dx - 0.45, 1.16, -1.1, paint(b, '#2b2f36')); screen.rotation.x = -0.15
  const bell = new b.THREE.Mesh(b.track(new b.THREE.CylinderGeometry(0.06, 0.07, 0.05, 12)), paint(b, '#d6b24a')); bell.position.set(dx + 0.6, 1.025, -0.8); b.parent.add(bell)
  // the window on the left wall
  const sky = b.canvas(64, 128)
  const gradient = sky.ctx.createLinearGradient(0, 0, 0, 128); gradient.addColorStop(0, '#8fc7f0'); gradient.addColorStop(1, '#e6f4fb'); sky.ctx.fillStyle = gradient; sky.ctx.fillRect(0, 0, 64, 128)
  const windowGroup = new b.THREE.Group(); windowGroup.position.set(-2.97, 1.75, -1.0); windowGroup.rotation.y = Math.PI / 2; b.parent.add(windowGroup)
  box(b, 1.5, 1.3, 0.05, 0, 0, 0, paint(b, '#f1ece2'), windowGroup)
  const view = new b.THREE.Mesh(b.track(new b.THREE.PlaneGeometry(1.36, 1.16)), basic(b, b.texture(sky.canvas))); view.position.z = 0.03; view.name = 'window-view'; windowGroup.add(view)
  box(b, 0.04, 1.16, 0.04, 0, 0, 0.04, paint(b, '#f1ece2'), windowGroup); box(b, 1.36, 0.04, 0.04, 0, 0, 0.04, paint(b, '#f1ece2'), windowGroup)
  // seating: two visitor chairs, or a styling chair facing a mirror
  if (b.data.styling) { mirror(b, -2.95, 1.55, 0.15, 1.1, 1.5, Math.PI / 2); stylingChair(b, -1.0, 0.15, Math.PI) }
  else { chair(b, -1.25, -0.05, Math.PI); chair(b, -0.55, -0.05, Math.PI) }
  plant(b, 2.6, -2.0, 1.5); plant(b, -2.65, 1.8, 1.1)
  // the certificate
  if (b.data.checked) {
    const { canvas, ctx } = b.canvas(512, 384)
    ctx.fillStyle = '#fbf7ec'; ctx.fillRect(0, 0, 512, 384); ctx.strokeStyle = b.colours.sign; ctx.lineWidth = 10; ctx.strokeRect(20, 20, 472, 344)
    ctx.fillStyle = b.colours.sign; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.font = `800 64px ${FONT}`; ctx.fillText('✓', 256, 110)
    ctx.font = `800 54px ${FONT}`; ctx.fillText(b.data.checked, 256, 205, 440)
    ctx.fillStyle = '#4a5361'; ctx.font = `600 34px ${FONT}`; ctx.fillText(b.data.name, 256, 285, 440)
    box(b, 0.8, 0.62, 0.04, dx, 2.2, -2.47, paint(b, WOOD_DARK)); plane(b, 0.7, 0.52, dx, 2.2, -2.445, basic(b, b.texture(canvas))).name = 'certificate'
  }
  // the service menu board
  box(b, MENU_BOARD.w + 0.14, MENU_BOARD.h + 0.14, 0.05, MENU_BOARD.x, MENU_BOARD.y, MENU_BOARD.z, paint(b, WOOD_DARK))
  const menu = plane(b, MENU_BOARD.w, MENU_BOARD.h, MENU_BOARD.x, MENU_BOARD.y, MENU_BOARD.z + 0.03, b.track(new b.THREE.MeshBasicMaterial({ color: '#ffffff' })))
  menu.name = 'menu'
  // the portfolio wall on the right
  const wall = plane(b, 3.2, 1.6, 2.97, 1.65, 0, b.track(new b.THREE.MeshBasicMaterial({ color: '#ffffff' })), -Math.PI / 2)
  box(b, 0.04, 1.7, 3.3, 2.99, 1.65, 0, paint(b, mixHex('#fff7ea', b.colours.accent, 0.4)))
  wall.position.x = 2.955; wall.name = 'photos'
  const deskHit = new b.THREE.Mesh(b.track(new b.THREE.BoxGeometry(1.8, 1.0, 0.9)), b.track(new b.THREE.MeshBasicMaterial({ visible: false })))
  deskHit.position.set(dx, 0.5, -1.0); b.parent.add(deskHit)
  void wood
  return { keeper: { x: dx, z: -1.65 }, deskHit, photos: { mesh: wall, cols: 3, rows: 2, width: 1536, height: 768 }, pageBoard: null, menu }
}

/** The photos wall (goods strip or office portfolio): framed pictures side by side, cropped to fill, never stretched. */
export function drawPhotoWall(ctx: CanvasRenderingContext2D, width: number, height: number, cols: number, rows: number, images: readonly (HTMLImageElement | null)[], colours: RoomColours, count: number, cover: (ctx: CanvasRenderingContext2D, image: HTMLImageElement, x: number, y: number, w: number, h: number) => void): void {
  ctx.fillStyle = mixHex(colours.accent, '#ffffff', 0.5); ctx.fillRect(0, 0, width, height)
  const gap = Math.round(width * 0.012), tileW = (width - gap * (cols + 1)) / cols, tileH = (height - gap * (rows + 1)) / rows
  if (!count) { ctx.fillStyle = colours.sign; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.font = `700 ${Math.round(height * 0.14)}px ${FONT}`; ctx.fillText('Photos coming soon', width / 2, height / 2, width - 80); return }
  for (let at = 0; at < cols * rows; at += 1) {
    const x = gap + (at % cols) * (tileW + gap), y = gap + Math.floor(at / cols) * (tileH + gap), image = images[at]
    ctx.save(); roundedRect(ctx, x, y, tileW, tileH, 8); ctx.clip()
    if (image && image.naturalWidth > 0) cover(ctx, image, x, y, tileW, tileH)
    else { ctx.fillStyle = at < count ? mixHex(colours.tile, '#ffffff', 0.3) : mixHex(colours.accent, '#ffffff', 0.3); ctx.fillRect(x, y, tileW, tileH) }
    ctx.restore()
    ctx.strokeStyle = '#6e4626'; ctx.lineWidth = 5; roundedRect(ctx, x, y, tileW, tileH, 8); ctx.stroke()
  }
}
