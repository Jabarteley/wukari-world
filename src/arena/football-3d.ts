/**
 * OWNER: games (real-time)
 * FOOTBALL IN 3D: the same server-judged match (./football.ts) drawn with three.js on the phone. The rules' field is 900 x 540
 * units; this view makes it the 40 x 20 m pitch of our own pitch model (so a rules unit is 4.4 cm along the pitch and 3.7 cm across
 * it), with its two goals, a ball, and Kenney's blocky players with their idle, walk, run, kick, celebrate, dejected and fall clips
 * chosen from what each snapshot says, with crossfades so nothing pops. The ball rolls and spins from its velocity; the net moves
 * when a goal goes in. One hemisphere light and one directional light, no shadow map (a soft blob under each body), Lambert
 * materials, and instancing wherever a thing repeats (rings, blobs, stands, crowd): about 40 to 50 draw calls and 10,000 triangles.
 *
 * CAMERA. Wide phone, held sideways: a broadcast camera from the side, high, that follows the ball with lead and closes in near a
 * goal. Tall phone: the pitch seen end-on from behind your own goal looking up it (your side always attacks "up", as the 2D view
 * does), which keeps the length of the pitch, where the play is, along the tall screen, and the play out of the thumb pad. A goal
 * cuts to a low camera behind the goal, then to the scorer's celebration. A shoot-out is seen from behind the shooter with the
 * keeper facing, and the kick that decides it slows down at the end. `framing` fits the play in what the HUD and thumbs leave free.
 * The 2D HUD (./football-draw.ts, drawFootballHud) is drawn over this canvas, with the names this view projects (`labels`).
 *
 * ASSETS (manifest in scripts/assets/manifests/): our pitch, goal and ball, and three CC0 blocky players; about 0.1 MB.
 * A lazy chunk: the Games hub warms it (warmFootball) and the Football screen fetches it when it opens, drawing the 2D view
 * until it is ready (or for ever, without WebGL).
 */
import { THREE, Shake, FrameStats, MEDIAN_FRAMES, blobShadow, cloneSkinned, disposeScene, lambertise, loadGlb, makeRenderer, nextLevel, ratioLadder } from './three/kit.ts'
import type { RatioState } from './three/kit.ts'
import { ASSET_VERSIONS } from './asset-versions.generated.ts'
import { EV, GOAL_DEPTH, GOAL_Y1, GOAL_Y2, H, PEN_D, PHASE, SO_STAGE, W, flightProgress, shotHeight } from './football.ts'
import type { FootballSnap, FootballerSnap, ShootSnap } from './football.ts'
import { defaultNativeLook, unpackNativeLook } from './native-look.ts'
import type { ArenaNative } from '../types/arena.ts'
import { ActionMix, FOOTBALLER_HEIGHT, KIT, NATIVE_HEIGHT, NATIVE_WAIT_MS, TIMES, clipsFor, kitLook, nativeAllowedHere, spawnNativeFighter, trianglesOf, warmNative, withinBudget } from './football-native.ts'
import type { NativeFighter } from './fight-native.ts'

/** A model's URL with its content version (asset-versions.generated.ts): /assets/ is cached for a year, so a changed file needs a new URL. */
const versioned = (path: string): string => `${path}?v=${ASSET_VERSIONS[path] ?? 'x'}`
export const FOOTBALL_ASSETS = Object.freeze({
  pitch: versioned('/assets/packs/allworld-arenas/pitch.glb'),
  goal: versioned('/assets/packs/allworld-arenas/goal.glb'),
  ball: versioned('/assets/packs/allworld-arenas/ball.glb'),
  /** team 0 (green), team 1 (yellow), the goalkeepers (purple) */
  players: [versioned('/assets/packs/kenney-blocky-characters/player-1.glb'), versioned('/assets/packs/kenney-blocky-characters/player-2.glb'), versioned('/assets/packs/kenney-blocky-characters/player-3.glb')] as const,
  /** our own football clips for the players' own (native) characters */
  clips: versioned('/assets/packs/allworld-arenas/native-football-clips.glb'),
})
/** Fetch and parse the Football models ahead of the screen (the Games hub does this when it opens and when the browser is idle). */
export function preloadFootball(): Promise<unknown> {
  const a = FOOTBALL_ASSETS
  const own = nativeAllowedHere() ? [loadGlb(a.clips), warmNative()] : []
  return Promise.all([...[a.pitch, a.goal, a.ball, ...a.players].map((url) => loadGlb(url)), ...own])
}

// ---- units ---------------------------------------------------------------------------------------------------

/** The pitch model is this long and wide inside its lines, metres. */
export const PITCH_L = 40, PITCH_W = 20
/** Metres per rules unit along the pitch (x) and across it (y). */
export const UX = PITCH_L / W, UZ = PITCH_W / H
/** Where a rules position is on the pitch: x along it, z across it, metres from the centre spot. */
export const toWorld = (x: number, y: number): { x: number; z: number } => ({ x: (x - W / 2) * UX, z: (y - H / 2) * UZ })
export const PLAYER_HEIGHT = 1.75, BALL_RADIUS = 0.23
/** The goal's mouth in metres across, and how deep the net goes (the rules' own goal, which is wider than the model's). */
export const GOAL_WIDTH = (GOAL_Y2 - GOAL_Y1) * UZ, GOAL_DEEP = GOAL_DEPTH * UX
const sgn = (team: number): number => (team === 0 ? 1 : -1)

// ---- clips -----------------------------------------------------------------------------------------------------

export type Clip = 'idle' | 'walk' | 'run' | 'kick' | 'celebrate' | 'dejected' | 'down'
/** Clips that play once and hold their last frame. */
export const ONCE: ReadonlySet<Clip> = new Set(['kick', 'down'])
/**
 * The clip a player should be showing, pure. `speed` is metres a second on the pitch; `kicking` is true for a moment after he
 * struck the ball; `cheer` for the scorer (and his side) after a goal; `sad` for the side that conceded.
 */
export function clipFor(f: FootballerSnap, speed: number, opts: { kicking: boolean; cheer: boolean; sad: boolean }): Clip {
  const status = f[3]
  if (status & 3) return 'down' // sliding, or stunned after a tackle
  if (opts.kicking) return 'kick'
  if (opts.cheer) return 'celebrate'
  if (opts.sad) return 'dejected'
  if (speed > 2.6) return 'run'
  if (speed > 0.5) return 'walk'
  return 'idle'
}
/** A run clip's pace for the speed the player is really moving at (the clip is one stride cycle at about 4.6 m/s). */
export const runScale = (speed: number): number => Math.min(1.7, Math.max(0.6, speed / 4.6))
/** The player nearest a rules position (an event's), within `reach` units, or -1. */
export function nearestPlayer(players: readonly FootballerSnap[], x: number, y: number, reach = 60): number {
  let best = -1, bestD = reach
  players.forEach((f, p) => { const d = Math.hypot(f[0] - x, f[1] - y); if (d < bestD) { bestD = d; best = p } })
  return best
}
/** The angle (about the vertical, a glTF model faces +z) that turns a model to face rules heading `d` (0..23, 15 degrees each, clockwise from +x). */
export const yawFor = (d: number): number => Math.PI / 2 - (d * Math.PI) / 12
/** The shortest way round from one angle to another. */
export const turnTo = (from: number, to: number, k: number): number => { let diff = ((to - from + Math.PI) % (2 * Math.PI) + 2 * Math.PI) % (2 * Math.PI) - Math.PI; if (diff === -Math.PI) diff = Math.PI; return from + diff * k }

// ---- camera ------------------------------------------------------------------------------------------------------

/** What covers the canvas, in px: the HUD at the top, the thumbs at the bottom (and the corners, in landscape). */
export interface Insets { top: number; bottom: number; left: number; right: number }
export const NO_INSETS: Insets = Object.freeze({ top: 0, bottom: 0, left: 0, right: 0 })
export type CamMode = 'side' | 'end'
/** The camera for a screen: from the side on a wide one, end-on behind your own goal on a tall one. */
export const modeFor = (width: number, height: number): CamMode => (width > height ? 'side' : 'end')
/** The camera's elevation above the ground (degrees) in each mode. */
export const ELEVATION: Record<CamMode, number> = { side: 36, end: 46 }
/** The vertical field of view for a screen shape: wide on a tall phone, narrow on a wide one. */
export const fovFor = (aspect: number): number => (aspect < 1 ? 46 : 36)
/**
 * How far the camera is from its look point (metres) to show `across` metres of pitch across the free part of the screen, and the
 * px to slide the picture (down, and across) so the look point sits in the middle of the free band, pure. `across` is metres
 * along the screen's width, at the look point.
 */
export function framing(across: number, width: number, height: number, inset: Insets = NO_INSETS): { fov: number; dist: number; shift: number; shiftX: number } {
  const aspect = width / Math.max(1, height), fov = fovFor(aspect), tan2 = 2 * Math.tan((fov * Math.PI) / 360)
  const freeW = Math.max(120, width - inset.left - inset.right), bandH = Math.max(60, height - inset.top - inset.bottom)
  const dist = Math.max(6, (across * height) / (freeW * tan2))
  return { fov, dist, shift: Math.round(inset.top + bandH / 2 - height / 2), shiftX: Math.round((inset.left - inset.right) / 2) }
}
/** How many metres across the free screen to show: closer when the play is near a goal. */
export function acrossFor(mode: CamMode, ballX: number): number {
  const near = Math.min(1, Math.max(0, Math.abs(ballX) - 12) / 8) // 0 in the middle of the pitch, 1 at the goal area
  return (mode === 'side' ? 24 : 11.5) * (1 - 0.14 * near)
}
export interface CamTarget { pos: [number, number, number]; look: [number, number, number] }
/**
 * What the camera looks at, pure: the ball, or (when you are playing) a point between you and the ball, so that you stay in the
 * picture while you run for it. The ball keeps priority: it is never further than 85% of what the camera shows from the middle of
 * the picture; you are pulled in to the same limit when there is room. `ext` is the half of the picture on the ground, in metres.
 */
export function focusPoint(ball: { x: number; z: number }, me: { x: number; z: number } | null, ext: { x: number; z: number }): { x: number; z: number } {
  if (!me) return { x: ball.x, z: ball.z }
  const lim = (v: number, around: number, e: number): number => Math.max(around - e, Math.min(around + e, v))
  let fx = (ball.x + me.x) / 2, fz = (ball.z + me.z) / 2
  fx = lim(fx, me.x, ext.x * 0.85); fz = lim(fz, me.z, ext.z * 0.85) // you stay in the picture...
  fx = lim(fx, ball.x, ext.x * 0.85); fz = lim(fz, ball.z, ext.z * 0.85) // ...unless the ball would leave it
  return { x: fx, z: fz }
}
/**
 * Where the camera stands and looks in open play, pure. `team` is the side the viewer is on (it attacks +x for team 0): `side`
 * stands on the pitch's +z side for team 0 (-z for team 1) so that the viewer's side always attacks to the right of the screen;
 * `end` stands behind the viewer's own goal, high, so that it attacks up the screen. `ball` is the ball in metres, `vel` its
 * velocity in metres a second (the camera looks a little ahead of a moving ball), `me` the viewer's own player (or null) and
 * `dist` the distance to the look point; `half` is the half width of the picture on the ground in metres.
 */
export function openPlay(mode: CamMode, team: number, ball: { x: number; z: number }, vel: { x: number; z: number }, dist: number, half = 10, me: { x: number; z: number } | null = null): CamTarget {
  const s = sgn(team), el = (ELEVATION[mode] * Math.PI) / 180
  const ahead = { x: ball.x + vel.x * 0.5, z: ball.z + vel.z * 0.3 }
  if (mode === 'side') {
    const f = focusPoint(ahead, me, { x: half, z: 7 })
    const reach = PITCH_L / 2 + 1.5 - half * 0.7 // the camera stops short of the far end, where only the stands would show
    const fx = Math.max(-reach, Math.min(reach, f.x)), fz = Math.max(-6, Math.min(6, f.z)) * 0.65
    return { pos: [fx, Math.sin(el) * dist, s * Math.cos(el) * dist + fz], look: [fx, 0.4, fz] }
  }
  // End-on: behind the ball along the attack and high; the look point is ahead of it, so the ball sits in the lower half of the picture.
  const f = focusPoint(ahead, me, { x: half * 1.5, z: half })
  const fx = Math.max(-PITCH_L / 2 + 3, Math.min(PITCH_L / 2 - 3, f.x)), fz = Math.max(-5, Math.min(5, f.z * 0.85))
  const back = Math.cos(el) * dist, lead = dist * 0.14
  return { pos: [fx - s * (back + lead), Math.sin(el) * dist, fz * 0.8], look: [fx + s * lead, 0, fz] }
}
/**
 * Behind the goal line, low and out to one side of the goal, looking across the mouth and back up the pitch: the replay angle for a
 * goal (straight behind it the net fills the picture). `team` scored (at the +x end for team 0).
 */
export function behindGoal(team: number, ball: { x: number; z: number }): CamTarget {
  const s = sgn(team), endX = (PITCH_L / 2 + GOAL_DEEP) * s
  return { pos: [endX + s * 3.6, 1.35, 6.4], look: [endX - s * 5.5, 0.9, ball.z * 0.3 - 0.4] }
}
/** In front of a celebrating scorer, a little above him, a camera on the side the viewer sees from. */
export function celebration(scorer: { x: number; z: number }, team: number): CamTarget {
  const s = sgn(team)
  return { pos: [scorer.x - s * 4.2, 2.3, scorer.z + 7.6], look: [scorer.x, 1.05, scorer.z] }
}
/** The shoot-out looks along the pitch at a narrow goal, so a tall phone gets a wider view to fit it without backing off half the pitch. */
export const penaltyFov = (aspect: number): number => (aspect < 1 ? 64 : fovFor(aspect))
/**
 * The shoot-out camera, pure: behind the shooter (who stands behind the spot), a little to the left and above, looking at the
 * goal's middle. `across` is the metres to fit across the screen at the goal line, `aspect` the free width over the height. The
 * goal is at +x for team 0.
 */
export function penaltyCam(team: number, across: number, aspect: number, fov: number): CamTarget {
  const s = sgn(team), goalX = (PITCH_L / 2) * s
  const tanH = Math.tan((fov * Math.PI) / 360) * aspect
  const toGoal = Math.max(PEN_D * UX + 8.5, across / 2 / Math.max(0.1, tanH)) // from the camera to the goal line: at least eight metres behind the spot
  return { pos: [goalX - s * toGoal, 3.0, -s * 1.7], look: [goalX, 0.7, 0] }
}
/** The most the end-on camera slides back towards your own goal to keep its mouth out from under the thumbs, metres. */
export const GOAL_CLEAR_MAX = 6
/**
 * The smallest slide `d` in [0, max] for which `y(d)` (where something sits on the screen, px from the top, falling as `d` grows) is
 * no lower than `limit`: 0 when it is clear already, `max` when even that is not enough. Pure.
 */
export function clearShift(y: (d: number) => number, limit: number, max = GOAL_CLEAR_MAX): number {
  if (y(0) <= limit) return 0
  if (y(max) > limit) return max
  let lo = 0, hi = max
  for (let i = 0; i < 12; i++) { const mid = (lo + hi) / 2; if (y(mid) > limit) lo = mid; else hi = mid }
  return hi
}
/** The roll (radians about the keeper's forward axis) of a diving keeper, `u` 0..1 through his dive; the sign is for the camera's right. */
export const diveRoll = (dive: number, u: number): number => -dive * 1.15 * Math.min(1, Math.max(0, u))

// ---- the view --------------------------------------------------------------------------------------------------------

export interface Label { x: number; y: number; p: number; carrier: boolean; you: boolean; /** px height of a player on screen */ scale: number }
export interface FootballMeta { you: number | null; own: { x: number; y: number } | null; now: number }
export interface FootballView {
  /** Draw one frame. `a`/`b`/`t` are the two snapshots and how far between; `meta.own` replaces your player (prediction). */
  draw(a: FootballSnap, b: FootballSnap, t: number, meta: FootballMeta): void
  /** One snapshot's events (its `e`): kicks, tackles, goals, saves, with the camera shake and effects. */
  events(events: readonly number[][], snap: FootballSnap): void
  /** The canvas size in px and what covers it (HUD, thumbs): the play is framed in the rest, at once. */
  resize(width: number, height: number, insets?: Insets): void
  /** Where the players are on screen after the last draw (for names and the carrier arrow). */
  labels: Label[]
  /** The goal's replay is showing (the HUD says so instead of shouting GOAL). */
  replaying: boolean
  /** Where a point on the pitch (rules units, metres up) is on the canvas after the last draw. */
  project(x: number, y: number, up?: number): { x: number; y: number }
  /** The camera now. */
  mode(): CamMode | 'penalty'
  stats(): ReturnType<FrameStats['read']> & { /** the pixel ratio now drawn at */ ratio: number; /** where the camera, its look point and the ball are (metres), for measuring */ cam: number[]; look: number[]; ball: number[]; /** the keepers' lean or dive, radians */ keepers: number[]; native: number; perActor: number; nativeWhy: string }
  dispose(): void
}

interface Body {
  holder: THREE.Group; tilt: THREE.Group; mixer: THREE.AnimationMixer; actions: Map<string, THREE.AnimationAction>; current: Clip | null
  yaw: number; roll: number; lx: number; lz: number; speed: number; kickUntil: number; cheerUntil: number; keeper: boolean; team: number
  /** the blocky player (hidden while the player's own character is drawn) */ root: THREE.Object3D
  /** the player's own character, once it has arrived */ nat: NativeSlot | null
}
/** One player's own character in the scene: the actor, the blender that drives its clips, and what it is in the middle of. */
interface NativeSlot { fighter: NativeFighter; mix: ActionMix; slide: boolean; landAt: number; kickUntil: number }
/** What the view needs to know about a seat to dress it: the name (a default look is made from it) and the public native look, if any. */
export interface SeatLook { name: string; nat?: ArenaNative | undefined; /** This seat is the player's own (their pieces are on the phone already). */ mine?: boolean }
/** How far (metres) a keeper's dive goes in the clip's time: the body is at full length when he has moved this far. */
export const DIVE_M = 2.2
/** The dive clip's lengths: the body going over (played by how far the keeper has gone), then the landing (played in time). */
export const DIVE_LEN = 1.2
const CAP_CHARS = 6, CAP_RINGS = 8
/** The goal's replay: it starts this long after the ball went in, shows this much of the play before it at this speed, then the scorer's celebration. */
export const REPLAY_AFTER = 0.5, REPLAY_BACK = 1.0, REPLAY_PAST = 0.15, REPLAY_SPEED = 0.62
/** How long a replay lasts on the clock, seconds. */
export const REPLAY_FOR = (REPLAY_BACK + REPLAY_PAST) / REPLAY_SPEED
/** Samples kept for the replay (one a frame, 2.5 s at 60 fps), and floats in each: the ball (x, z in metres), four players (x, y, facing, status) and two keepers. */
const HIST = 160, STRIDE = 20

/** Make the 3D view on `canvas`, or null when WebGL or the models are not available (the screen keeps its 2D view). */
export async function createFootballView(canvas: HTMLCanvasElement, opts: { reduced: boolean; seats?: () => readonly SeatLook[] }): Promise<FootballView | null> {
  const renderer = makeRenderer(canvas)
  if (!renderer) return null
  let models: Awaited<ReturnType<typeof loadGlb>>[]
  try { models = await Promise.all([FOOTBALL_ASSETS.pitch, FOOTBALL_ASSETS.goal, FOOTBALL_ASSETS.ball, ...FOOTBALL_ASSETS.players].map((url) => loadGlb(url))) }
  catch { renderer.dispose(); return null }
  const [pitchModel, goalModel, ballModel, ...playerModels] = models as [typeof models[0], typeof models[0], typeof models[0], ...typeof models]
  // The players' own characters (our clips for them) come on top of the blocky players, which stay as the stand-in and the fallback.
  let clipsModel: Awaited<ReturnType<typeof loadGlb>> | null = null
  let native = nativeAllowedHere(), nativeWhy = native ? '' : 'this phone'
  if (native) { try { clipsModel = await loadGlb(FOOTBALL_ASSETS.clips) } catch { native = false; nativeWhy = 'no clips' } }

  const scene = new THREE.Scene()
  scene.background = skyTexture()
  scene.fog = new THREE.Fog(0x2a3d5e, 60, 130)
  scene.add(new THREE.HemisphereLight(0xfff4e0, 0x35502f, 1.45))
  const sun = new THREE.DirectionalLight(0xfff0d8, 1.9)
  sun.position.set(-9, 22, 12); scene.add(sun)

  // The pitch and its boards, centred on the centre spot, grass at y = 0.
  const pitch = pitchModel.scene.clone(true)
  lambertise(pitch)
  { const box = new THREE.Box3().setFromObject(pitch), c = box.getCenter(new THREE.Vector3()); pitch.position.set(-c.x, -box.min.y, -c.z) }
  scene.add(pitch)

  // The goals at both ends, sized to the rules' own mouth, each with a net that gives when a ball hits it.
  const nets: THREE.Object3D[] = []
  for (const team of [0, 1]) {
    const goal = goalModel.scene.clone(true)
    lambertise(goal)
    goal.traverse((n) => {
      if (n.name !== 'goal-net') return
      nets.push(n)
      // The net's texture is cords on a clear ground, but the model does not say it has alpha (alphaMode), so its clear cells would draw black: blend it.
      n.traverse((part) => {
        const mesh = part as THREE.Mesh
        if (!mesh.isMesh) return
        for (const m of ([] as THREE.Material[]).concat(mesh.material)) { m.alphaTest = 0.02; m.transparent = true; m.depthWrite = false; m.needsUpdate = true }
      })
    })
    const box = new THREE.Box3().setFromObject(goal), size = box.getSize(new THREE.Vector3()), c = box.getCenter(new THREE.Vector3())
    // glTF: the goal line runs along x with the net behind it at -z; the pivot is the middle of the line on the grass.
    goal.position.set(-c.x, -box.min.y, -box.max.z)
    const pivot = new THREE.Group(); pivot.add(goal)
    pivot.scale.set(GOAL_WIDTH / size.x, 1, GOAL_DEEP / size.z)
    pivot.rotation.y = team === 0 ? -Math.PI / 2 : Math.PI / 2
    pivot.position.x = sgn(team) * PITCH_L / 2
    scene.add(pivot)
  }

  // The ball.
  const ball = ballModel.scene.clone(true)
  lambertise(ball)
  { const box = new THREE.Box3().setFromObject(ball), size = box.getSize(new THREE.Vector3()), c = box.getCenter(new THREE.Vector3()); ball.position.sub(c); ball.scale.setScalar((BALL_RADIUS * 2) / Math.max(size.x, size.y, size.z)); ball.position.multiplyScalar((BALL_RADIUS * 2) / Math.max(size.x, size.y, size.z)) }
  const ballHolder = new THREE.Group(), ballSpin = new THREE.Group(); ballSpin.add(ball); ballHolder.add(ballSpin); scene.add(ballHolder)

  // Players and keepers: a clone of one blocky model each, its own mixer. Team 0 green, team 1 yellow, keepers purple.
  const bodies: Body[] = []
  for (let i = 0; i < CAP_CHARS; i++) {
    const keeper = i >= 4, team = keeper ? i - 4 : i & 1, model = (keeper ? playerModels[2] : playerModels[team]) as typeof models[0]
    const root = cloneSkinned(model.scene)
    withNormals(root)
    lambertise(root)
    root.updateMatrixWorld(true)
    const box = new THREE.Box3().setFromObject(root), size = box.getSize(new THREE.Vector3())
    const k = PLAYER_HEIGHT / Math.max(0.1, size.y)
    root.scale.multiplyScalar(k); root.position.y -= box.min.y * k
    const tilt = new THREE.Group(); tilt.add(root)
    const holder = new THREE.Group(); holder.add(tilt); holder.visible = false; scene.add(holder)
    const mixer = new THREE.AnimationMixer(root), actions = new Map<string, THREE.AnimationAction>()
    for (const clip of model.animations) {
      const action = mixer.clipAction(clip)
      if (ONCE.has(clip.name as Clip)) { action.setLoop(THREE.LoopOnce, 1); action.clampWhenFinished = true }
      actions.set(clip.name, action)
    }
    bodies.push({ holder, tilt, mixer, actions, current: null, yaw: 0, roll: 0, lx: NaN, lz: NaN, speed: 0, kickUntil: 0, cheerUntil: 0, keeper, team, root, nat: null })
  }

  // Blob shadows and team rings: one instanced draw each.
  const blob = blobShadow(1).material as THREE.MeshBasicMaterial
  const shadows = new THREE.InstancedMesh(new THREE.PlaneGeometry(1, 1).rotateX(-Math.PI / 2), new THREE.MeshBasicMaterial({ map: blob.map, transparent: true, opacity: 0.55, depthWrite: false }), CAP_CHARS + 1)
  shadows.renderOrder = 1; shadows.frustumCulled = false; scene.add(shadows)
  const rings = new THREE.InstancedMesh(new THREE.RingGeometry(0.62, 0.8, 28).rotateX(-Math.PI / 2), new THREE.MeshBasicMaterial({ transparent: true, opacity: 0.95, depthWrite: false }), CAP_RINGS)
  rings.renderOrder = 2; rings.frustumCulled = false; scene.add(rings)
  const TEAM_COLOURS = [new THREE.Color(0x24d05a), new THREE.Color(0xffd23a)], YOU_COLOUR = new THREE.Color(0xffffff)

  const stands = stadium()
  scene.add(stands)

  // Confetti, dust and sparks: one Points object with a pool.
  const BITS = 72
  const bitPos = new Float32Array(BITS * 3), bitVel = new Float32Array(BITS * 3), bitLife = new Float32Array(BITS).fill(1), bitCol = new Float32Array(BITS * 3)
  const bitGeo = new THREE.BufferGeometry(); bitGeo.setAttribute('position', new THREE.BufferAttribute(bitPos, 3)); bitGeo.setAttribute('color', new THREE.BufferAttribute(bitCol, 3))
  const bitMat = new THREE.PointsMaterial({ size: 0.16, vertexColors: true, transparent: true, opacity: 1, depthWrite: false })
  const bits = new THREE.Points(bitGeo, bitMat); bits.frustumCulled = false; scene.add(bits)
  let nextBit = 0
  const burst = (x: number, y: number, z: number, n: number, speed: number, colours: readonly number[], up = 1): void => {
    const c = new THREE.Color()
    for (let i = 0; i < n; i++) {
      const k = nextBit = (nextBit + 1) % BITS, a = Math.random() * Math.PI * 2, v = speed * (0.4 + Math.random())
      bitPos.set([x, y, z], k * 3)
      bitVel.set([Math.cos(a) * v, (1 + Math.random() * 2.2) * up * speed * 0.5, Math.sin(a) * v], k * 3)
      c.setHex(colours[i % colours.length] as number); bitCol.set([c.r, c.g, c.b], k * 3)
      bitLife[k] = 0
    }
    bitGeo.attributes.color!.needsUpdate = true
  }

  const camera = new THREE.PerspectiveCamera(40, 1, 0.1, 180)
  const shake = new Shake(opts.reduced), shakeOffset = new THREE.Vector3()
  const stats = new FrameStats()
  const look = new THREE.Vector3(), camPos = new THREE.Vector3()
  const labels: Label[] = []
  let last = 0, sizeW = 300, sizeH = 300, inset: Insets = NO_INSETS, snapCamera = true, camMode: CamMode | 'penalty' = 'end', cutAt = 0
  let ballX = 0, ballZ = 0, ballLift = BALL_RADIUS, hopUntil = 0, hopPeak = 0, goalTeam = -1, netShake = 0, crowdBounce = 0
  let phaseSince = 0, lastPhase = -1, scorer = -1, slowSince = -1, lastShot = ''
  const histT = new Float64Array(HIST), histV = new Float32Array(HIST * STRIDE)
  let histHead = 0, histCount = 0
  // Adaptive resolution: the pixel ratio steps down while frames run long and back up when they run easy (kit.ts nextLevel).
  const ladder = ratioLadder(globalThis.devicePixelRatio || 1)
  let rung: RatioState = { level: 0, calmMs: 0 }
  const recent: number[] = []
  const setRung = (next: RatioState): void => {
    if (next.level !== rung.level) { renderer.setPixelRatio(ladder[next.level] as number); renderer.setSize(sizeW, sizeH, false); recent.length = 0 }
    rung = next
  }

  function play(body: Body, clip: Clip, restart: boolean, scale = 1, offset = 0): void {
    const next = body.actions.get(clip) ?? body.actions.get('idle')
    if (!next) return
    const prev = body.current ? body.actions.get(body.current) : undefined
    if (body.current === clip && !restart) { next.timeScale = scale; return }
    next.reset(); next.timeScale = scale; next.enabled = true; next.setEffectiveWeight(1); next.time = offset
    const fade = clip === 'kick' ? 0.06 : clip === 'down' ? 0.1 : 0.2
    if (prev && prev !== next) next.crossFadeFrom(prev, fade, false)
    next.play()
    body.current = clip
  }

  const proj = new THREE.Vector3(), probe = new THREE.PerspectiveCamera()
  const toScreen = (x: number, y: number, z: number): { x: number; y: number } => {
    proj.set(x, y, z).project(camera)
    return { x: (proj.x + 1) / 2 * sizeW, y: (1 - proj.y) / 2 * sizeH }
  }
  const mix = (fa: FootballerSnap | undefined, fb: FootballerSnap, t: number): FootballerSnap => (fa ? [fa[0] + (fb[0] - fa[0]) * t, fa[1] + (fb[1] - fa[1]) * t, fb[2], fb[3]] : fb)
  const tmpM = new THREE.Matrix4(), tmpQ = new THREE.Quaternion(), tmpS = new THREE.Vector3(), tmpP = new THREE.Vector3(), tmpA = new THREE.Vector3()
  const ident = new THREE.Quaternion()

  /** A goalkeeper: stands in his goal facing the pitch, leans with his sideways steps, and in a shoot-out dives to his side. */
  function keeperTick(body: Body, w: { x: number; z: number }, so: ShootSnap | undefined, dt: number, conceded: boolean, now: number): void {
    const team = body.team
    // In a shoot-out only the keeper who is shot at is on the pitch (the other end is out of the picture, and not drawn).
    body.holder.visible = !(so && so.w < 0 && team === so.t)
    body.holder.position.set(w.x, 0, w.z)
    const target = yawFor(team === 0 ? 0 : 12) // team 0's keeper is at the -x end and looks along +x
    body.yaw = Number.isNaN(body.lx) ? target : turnTo(body.yaw, target, 1 - Math.exp(-10 * dt))
    body.holder.rotation.y = body.yaw
    const vz = Number.isNaN(body.lx) || dt <= 0 ? 0 : (w.z - body.lz) / dt
    body.speed += (vz - body.speed) * (1 - Math.exp(-10 * dt))
    body.lx = w.x; body.lz = w.z
    if (body.nat) {
      // The keepers are drawn as the players' own characters in a shoot-out only: two actors on the screen at most, which is what the triangle budget allows.
      const own = !!so
      body.nat.fighter.group.visible = own; body.root.visible = !own
      if (own) { body.tilt.rotation.set(0, 0, 0); body.tilt.position.y = 0; nativeKeeper(body, w, so, conceded, now, dt); return }
    }
    let want = Math.max(-0.3, Math.min(0.3, body.speed * 0.09 * (team === 0 ? 1 : -1))), lift = 0
    if (so && so.s >= SO_STAGE.fly && team === 1 - so.t && so.k[2] !== 0) {
      // This keeper is being shot at and has named a dive: he goes over as far as the server has moved him, and stays down till the next kick.
      const u = Math.min(1, Math.abs(w.z) / 1.1)
      want = diveRoll(so.k[2], u)
      lift = Math.sin(Math.PI * u) * 0.4
    }
    body.roll += (want - body.roll) * (1 - Math.exp(-(Math.abs(want) > 0.5 ? 16 : 8) * dt))
    body.tilt.rotation.set(0, 0, body.roll)
    body.tilt.position.y = lift
    play(body, conceded ? 'dejected' : 'idle', false, 1)
    body.mixer.update(dt)
  }

  /** The history interpolated at clock time `at` (ms), or null when it holds nothing so old. */
  function sampleHistory(at: number): Float32Array | null {
    if (histCount < 2) return null
    const out = new Float32Array(STRIDE)
    // Newest first: find the two samples around `at`.
    let hi = (histHead - 1 + HIST) % HIST
    for (let n = 1; n < histCount; n++) {
      const lo = (hi - 1 + HIST) % HIST
      if ((histT[lo] as number) <= at) {
        const t0 = histT[lo] as number, t1 = histT[hi] as number, k = t1 > t0 ? Math.min(1, Math.max(0, (at - t0) / (t1 - t0))) : 0
        for (let i = 0; i < STRIDE; i++) { const v0 = histV[lo * STRIDE + i] as number, v1 = histV[hi * STRIDE + i] as number; out[i] = i >= 2 && i < 18 && (i - 2) % 4 >= 2 ? v1 : v0 + (v1 - v0) * k }
        return out
      }
      hi = lo
    }
    return null
  }

  // Compile every shader and upload every texture now (everything is shown for the one call), so the first frames the player sees do not stall.
  {
    bodies.forEach((body) => { body.holder.visible = true })
    camera.position.set(0, 12, 14); camera.lookAt(0, 0, 0); camera.updateMatrixWorld(true)
    try {
      renderer.compile(scene, camera)
      scene.traverse((node) => { const m = (node as THREE.Mesh).material as THREE.MeshLambertMaterial | undefined; if (m?.map) renderer.initTexture(m.map) })
    } catch { /* it compiles on the first frame instead */ }
    bodies.forEach((body) => { body.holder.visible = false })
  }

  // ---- the players' own characters ------------------------------------------------------------------------------------
  // Each body slot is dressed from its seat's public look (the keepers and seats without one get a default made from the world's own
  // pieces, which are on the phone already), in its team's shirt, and swapped in for the blocky player when it is ready. If one actor
  // would cost so many triangles that the screen passes NATIVE_TRIANGLES_MAX, or the files are slow to come, the blocky players stay.
  const wanted: string[] = bodies.map(() => ''), generation: number[] = bodies.map(() => 0)
  let seatsSeen: readonly SeatLook[] | null = null, startedAt = 0, disposed = false, fieldN = 2, perActor = 0, keepersAsked = false
  function dropNative(why: string): void {
    native = false; nativeWhy = why
    for (const body of bodies) { if (body.nat) { body.nat.fighter.dispose(); body.nat = null } body.root.visible = true; body.tilt.rotation.set(0, 0, 0); body.tilt.position.y = 0 }
    generation.forEach((_, i) => { generation[i] = (generation[i] as number) + 1 })
  }
  async function buildSlot(i: number, appearance: ReturnType<typeof defaultNativeLook>, mine: number): Promise<void> {
    const fighter = await spawnNativeFighter(appearance)
    if (disposed || !native || generation[i] !== mine) { fighter.dispose(); return }
    perActor = Math.max(perActor, trianglesOf(fighter.group))
    if (!withinBudget(perActor, fieldN)) { fighter.dispose(); dropNative(`over budget: ${perActor} triangles an actor`); return }
    fighter.group.scale.setScalar(PLAYER_HEIGHT / NATIVE_HEIGHT)
    const body = bodies[i] as Body
    const clips = clipsFor((clipsModel as NonNullable<typeof clipsModel>).animations, appearance.body, fighter.bones)
    const mix = new ActionMix(new THREE.AnimationMixer(fighter.model), clips)
    if (body.nat) body.nat.fighter.dispose()
    body.tilt.add(fighter.group)
    if (body.keeper) fighter.group.visible = false; else body.root.visible = false // a keeper is drawn as his own character in a shoot-out only (see keeperTick)
    body.nat = { fighter, mix, slide: false, landAt: 0, kickUntil: 0 }
    if (body.keeper) mix.start({ clip: 'keeper-ready', loop: true, rate: 1 })
    try { (renderer as THREE.WebGLRenderer).compile(scene, camera) } catch { /* it compiles on the next frame instead */ }
  }
  function wantNative(seats: readonly SeatLook[] | null): void {
    const known = seats?.find((x) => x.nat && unpackNativeLook(x.nat))
    const bodyOf = known ? unpackNativeLook(known.nat)?.body : undefined
    bodies.forEach((body, i) => {
      if (body.keeper ? keepersAsked : i < fieldN) {
        const seat = body.keeper ? undefined : seats?.[i]
        const given = seat?.nat ? unpackNativeLook(seat.nat) : null
        const base = given ?? defaultNativeLook(body.keeper ? `Keeper ${body.team}` : seat?.name ?? `Player ${i}`, i, bodyOf)
        const look = kitLook(base, body.team, body.keeper)
        const key = JSON.stringify(look)
        if (wanted[i] === key) return
        wanted[i] = key
        const mine = ++(generation[i] as number)
        void buildSlot(i, look, mine).catch((error) => { if (!disposed && native && generation[i] === mine) dropNative(String((error as Error)?.message ?? error).slice(0, 120)) })
      }
    })
  }
  /** Which clip the player is in, from what the snapshot says (the rules' slide is a standing tackle here). */
  function nativeField(body: Body, f: FootballerSnap, speed: number, cheer: boolean, sad: boolean, carrying: boolean, now: number, dt: number): void {
    const nat = body.nat as NativeSlot, mix = nat.mix
    const slide = (f[3] & 1) !== 0, stun = (f[3] & 2) !== 0, charge = (f[3] >> 2) & 7
    if (slide) { if (!nat.slide) mix.start({ clip: 'tackle', loop: false, rate: 1.5 }, 0, true) }
    else if (stun) mix.start({ clip: 'stumble', loop: false, rate: 1 }, 0)
    else if (now < nat.kickUntil) { /* the strike plays out */ }
    else if (cheer) mix.start({ clip: 'celebrate', loop: true, rate: 1 })
    else if (sad) mix.start({ clip: 'dejected', loop: true, rate: 1 })
    else if (charge > 0 && speed < 1.3) {
      // the shoot button is held: the leg goes back and waits there for the strike
      mix.start({ clip: 'kick', loop: false, rate: 1.4 }, 0)
      if (mix.stateTime >= TIMES.kickWind) { mix.stateTime = TIMES.kickWind; mix.hold = true }
    } else mix.start(null)
    nat.slide = slide
    mix.fadeIn = slide ? 22 : 14
    mix.update(dt, speed, carrying)
  }
  /** The keeper: ready, or in a shoot-out over and down as far as the server has moved him, or catching, or hanging his head. */
  function nativeKeeper(body: Body, w: { x: number; z: number }, so: ShootSnap | undefined, conceded: boolean, now: number, dt: number): void {
    const nat = body.nat as NativeSlot, mix = nat.mix
    const diving = !!so && so.s >= SO_STAGE.fly && body.team === 1 - so.t && so.k[2] !== 0
    if (diving && so) {
      const clip = so.k[2] > 0 ? 'keeper-dive-left' : 'keeper-dive-right' // the shooter's right is the keeper's left
      mix.fadeIn = 22
      mix.start({ clip, loop: false, rate: 0 }, 0)
      mix.hold = true
      let want = Math.min(1, Math.abs(w.z) / DIVE_M) * TIMES.diveGo
      if (so.s >= SO_STAGE.result) { if (!nat.landAt) nat.landAt = now; want = Math.min(DIVE_LEN, TIMES.diveGo + (now - nat.landAt) / 1000) }
      mix.stateTime += (want - mix.stateTime) * (1 - Math.exp(-30 * dt))
    } else {
      nat.landAt = 0
      mix.fadeIn = now < nat.kickUntil ? 16 : 6
      if (now < nat.kickUntil) { /* a catch plays out */ } else if (conceded) mix.start({ clip: 'dejected', loop: true, rate: 1 })
      else mix.start({ clip: 'keeper-ready', loop: true, rate: 1 })
    }
    mix.update(dt, 0, false)
  }

  const view: FootballView = {
    labels,
    replaying: false,
    draw(a, b, t, meta) {
      const began = performance.now()
      const now = meta.now, dt = last ? Math.min(0.1, (now - last) / 1000) : 1 / 60
      const frameMs = last ? now - last : 0
      last = now; stats.tick(now)
      if (frameMs > 0 && frameMs < 250) { recent.push(frameMs); if (recent.length > MEDIAN_FRAMES) recent.shift(); setRung(nextLevel(rung, ladder.length, recent)) }
      const viewTeam = meta.you === null ? 0 : meta.you & 1
      const so = b.o, pens = b.p === PHASE.pens && !!so
      if (b.p !== lastPhase) { lastPhase = b.p; phaseSince = now; if (b.p === PHASE.goal) scorer = b.s ? b.s[1] : -1 }
      const sincePhase = (now - phaseSince) / 1000
      // The players' own characters: dress each body from its seat when the roster is known, and give up on them if they are slow to come.
      fieldN = Math.min(4, Math.max(2, b.f.length))
      if (native && clipsModel) {
        const seats = opts.seats?.() ?? null
        if (seats === null || seats.length > 0) { if (!startedAt || seats !== seatsSeen) { seatsSeen = seats; if (!startedAt) startedAt = now; wantNative(seats) } }
        if (!keepersAsked && fieldN > 0 && bodies.slice(0, fieldN).every((x) => x.nat)) { keepersAsked = true; wantNative(seatsSeen) }
        if (startedAt && bodies.some((x, i) => !x.keeper && i < fieldN && !x.nat) && now - startedAt > ((globalThis as { allworldFootballNativeWaitMs?: number }).allworldFootballNativeWaitMs ?? NATIVE_WAIT_MS)) dropNative('waited too long')
      }

      // Where everyone is, drawn: the snapshots mixed, your own player from your own input.
      const fs: FootballerSnap[] = b.f.map((fb, p) => {
        let f = mix(a.f[p], fb, t)
        if (meta.you === p && meta.own) f = [meta.own.x, meta.own.y, f[2], f[3]]
        return f
      })
      const ks: [number, number] = [a.k[0] + (b.k[0] - a.k[0]) * t, a.k[1] + (b.k[1] - a.k[1]) * t]
      const bw = toWorld(a.b[0] + (b.b[0] - a.b[0]) * t, a.b[1] + (b.b[1] - a.b[1]) * t)
      // A goal is shown again: the last second of the play, slowed, from low behind the goal (what the history kept), then the scorer's celebration.
      const replay = b.p === PHASE.goal && sincePhase >= REPLAY_AFTER && sincePhase < REPLAY_AFTER + REPLAY_FOR && histCount > 8
      view.replaying = replay
      const sim = replay ? REPLAY_SPEED : 1
      if (replay) {
        const at = phaseSince - REPLAY_BACK * 1000 + (sincePhase - REPLAY_AFTER) * 1000 * REPLAY_SPEED
        const got = sampleHistory(at)
        if (got) {
          bw.x = got[0] as number; bw.z = got[1] as number
          for (let p = 0; p < fs.length && p < 4; p++) fs[p] = [got[2 + p * 4] as number, got[3 + p * 4] as number, Math.round(got[4 + p * 4] as number), Math.round(got[5 + p * 4] as number)]
          ks[0] = got[18] as number; ks[1] = got[19] as number
        }
      } else {
        const at = histHead * STRIDE
        histT[histHead] = now
        histV[at] = bw.x; histV[at + 1] = bw.z
        for (let p = 0; p < 4; p++) { const f = fs[p]; histV[at + 2 + p * 4] = f ? f[0] : 0; histV[at + 3 + p * 4] = f ? f[1] : 0; histV[at + 4 + p * 4] = f ? f[2] : 0; histV[at + 5 + p * 4] = f ? f[3] : 0 }
        histV[at + 18] = ks[0]; histV[at + 19] = ks[1]
        histHead = (histHead + 1) % HIST; histCount = Math.min(HIST, histCount + 1)
      }
      const moved = Number.isNaN(ballX) ? 0 : Math.hypot(bw.x - ballX, bw.z - ballZ)
      const ballVx = dt > 0 && moved > 0 ? (bw.x - ballX) / (dt * sim) : 0, ballVz = dt > 0 && moved > 0 ? (bw.z - ballZ) / (dt * sim) : 0
      const travel = { x: bw.x - ballX, z: bw.z - ballZ }
      ballX = bw.x; ballZ = bw.z

      // Players.
      const scoring = b.p === PHASE.goal ? (b.s ? b.s[0] : -1) : -1
      const winner = so && so.w >= 0 && so.w < 2 ? so.w : -1
      labels.length = 0
      bodies.forEach((body, i) => {
        if (body.keeper) {
          const wk = toWorld(body.team === 0 ? 24 : W - 24, ks[body.team as 0 | 1])
          body.holder.visible = true
          keeperTick(body, wk, pens ? so : (b.p === PHASE.over && so ? so : undefined), dt * sim, scoring >= 0 && scoring !== body.team, now)
          return
        }
        const f = fs[i]
        // In a shoot-out only the shooter is on the pitch (the others wait out of the picture).
        if (!f || (pens && so && i !== so.p[0])) { body.holder.visible = false; body.lx = NaN; return }
        body.holder.visible = true
        const w = toWorld(f[0], f[1])
        body.holder.position.set(w.x, 0, w.z)
        const target = yawFor(f[2])
        body.yaw = Number.isNaN(body.lx) ? target : turnTo(body.yaw, target, 1 - Math.exp(-14 * dt))
        body.holder.rotation.y = body.yaw
        const speed = Number.isNaN(body.lx) || dt <= 0 ? 0 : Math.hypot(w.x - body.lx, w.z - body.lz) / (dt * sim)
        body.speed += (speed - body.speed) * (1 - Math.exp(-12 * dt))
        body.lx = w.x; body.lz = w.z
        const sliding = (f[3] & 1) !== 0
        const cheer = (scoring >= 0 && (i & 1) === scoring && (i === scorer || sincePhase > 0.6)) || (winner >= 0 && (i & 1) === winner) || now < body.cheerUntil
        const sad = (scoring >= 0 && (i & 1) !== scoring) || (winner >= 0 && (i & 1) !== winner)
        if (body.nat) {
          nativeField(body, f, body.speed, cheer, sad, b.b[2] === i + 1, now, dt * sim)
          body.tilt.rotation.set(0, 0, 0); body.tilt.position.y = 0
        } else {
          const clip = clipFor(f, body.speed, { kicking: now < body.kickUntil, cheer, sad })
          play(body, clip, false, (clip === 'run' || clip === 'walk' ? runScale(body.speed) : 1) * sim)
          body.mixer.update(dt)
          // A slide tackle lays the body back, feet first.
          body.roll += ((sliding ? -1.2 : 0) - body.roll) * (1 - Math.exp(-18 * dt))
          body.tilt.rotation.set(body.roll, 0, 0)
          body.tilt.position.y = sliding ? 0.3 : 0
        }
        labels.push({ x: 0, y: 0, p: i, carrier: b.b[2] === i + 1, you: meta.you === i, scale: 0 })
      })

      // The ball: on the ground, hopping after a kick, or along its flight in a shoot-out; it rolls and spins from how far it went.
      let lift = BALL_RADIUS
      if (pens && so && so.s === SO_STAGE.fly) lift = BALL_RADIUS + shotHeight(flightProgress(so.k[3], so.k[4], so.k[5]), so.k[1])
      else if (now < hopUntil) lift = BALL_RADIUS + Math.sin(Math.PI * (1 - (hopUntil - now) / 520)) * hopPeak
      ballLift += (lift - ballLift) * Math.min(1, dt * 40)
      ballHolder.position.set(ballX, ballLift, ballZ)
      if (moved > 0.0005 && moved < 3) {
        const axis = tmpA.set(travel.z, 0, -travel.x).normalize()
        tmpQ.setFromAxisAngle(axis, moved / BALL_RADIUS); ballSpin.quaternion.premultiply(tmpQ)
      }

      // Shadows and rings.
      let r = 0
      bodies.forEach((body, i) => {
        const on = body.holder.visible
        tmpM.compose(tmpP.set(body.holder.position.x, 0.02, body.holder.position.z), ident, tmpS.set(on ? 1.5 : 0.001, 1, on ? 1.5 : 0.001))
        shadows.setMatrixAt(i, tmpM)
        if (!on) return
        const you = meta.you === i && !body.keeper
        tmpM.compose(tmpP.set(body.holder.position.x, 0.03, body.holder.position.z), ident, tmpS.set(you ? 1.25 : 1, 1, you ? 1.25 : 1))
        rings.setMatrixAt(r, tmpM); rings.setColorAt(r, you ? YOU_COLOUR : (TEAM_COLOURS[body.team] as THREE.Color)); r += 1
      })
      for (; r < CAP_RINGS; r++) { tmpM.compose(tmpP.set(0, -5, 0), ident, tmpS.set(0.001, 0.001, 0.001)); rings.setMatrixAt(r, tmpM); rings.setColorAt(r, YOU_COLOUR) }
      const bs = Math.max(0.5, 1 - (ballLift - BALL_RADIUS) * 0.35)
      tmpM.compose(tmpP.set(ballX, 0.02, ballZ), ident, tmpS.set(0.6 * bs, 1, 0.6 * bs)); shadows.setMatrixAt(CAP_CHARS, tmpM)
      shadows.instanceMatrix.needsUpdate = true; rings.instanceMatrix.needsUpdate = true
      if (rings.instanceColor) rings.instanceColor.needsUpdate = true

      // The net gives when a goal goes in, the crowd jumps, the pieces fly.
      netShake *= Math.pow(0.03, dt); crowdBounce *= Math.pow(0.1, dt)
      nets.forEach((net, i) => { const k = goalTeam === i ? netShake : 0; net.scale.set(1, 1 + 0.1 * k * Math.sin(now / 45), 1 + 0.6 * k) })
      stands.position.y = Math.abs(Math.sin(now / 110)) * 0.12 * crowdBounce
      for (let i = 0; i < BITS; i++) {
        const life = bitLife[i] as number
        if (life >= 1) { bitPos[i * 3 + 1] = -10; continue }
        bitLife[i] = life + dt * 0.6
        bitVel[i * 3 + 1] = (bitVel[i * 3 + 1] as number) - 9.8 * dt
        for (let k = 0; k < 3; k++) bitPos[i * 3 + k] = (bitPos[i * 3 + k] as number) + (bitVel[i * 3 + k] as number) * dt
        if ((bitPos[i * 3 + 1] as number) < 0.03) { bitPos[i * 3 + 1] = 0.03; bitVel[i * 3 + 1] = 0; bitVel[i * 3] = (bitVel[i * 3] as number) * 0.8; bitVel[i * 3 + 2] = (bitVel[i * 3 + 2] as number) * 0.8 }
      }
      bitGeo.attributes.position!.needsUpdate = true

      // The camera: what shot this is, where it stands and how fast it follows.
      // `allworldFootballCamera` is for comparing the two cameras on one screen (screenshots); a player never sets it.
      const mode = (globalThis as { allworldFootballCamera?: CamMode }).allworldFootballCamera ?? modeFor(sizeW, sizeH), fr = framing(1, sizeW, sizeH, inset)
      let target: CamTarget, ease = 1 - Math.pow(0.002, dt), shot: string, fov = fr.fov
      if (pens && so) {
        shot = 'penalty-' + so.t
        camMode = 'penalty'
        fov = penaltyFov(sizeW / Math.max(1, sizeH))
        target = penaltyCam(so.t, GOAL_WIDTH + 2.4, (sizeW - inset.left - inset.right) / Math.max(1, sizeH), fov)
        // The kick that decides it slows down: the camera creeps in on the goal as the ball takes its last ticks.
        if (so.s === SO_STAGE.fly && so.k[5] > 0 && so.k[3] > so.k[5]) { if (slowSince < 0) slowSince = now; const u = Math.min(1, (now - slowSince) / 700); target.pos[0] += sgn(so.t) * u * 2.4; target.pos[1] -= u * 0.45 } else slowSince = -1
      } else if (b.p === PHASE.goal) {
        camMode = mode
        const team = b.s ? b.s[0] : 0
        if (replay) { shot = 'goal-low'; target = behindGoal(team, { x: ballX, z: ballZ }) }
        else if (sincePhase < REPLAY_AFTER + 0.05) { shot = 'goal-live'; target = openPlay(mode, viewTeam, { x: ballX, z: ballZ }, { x: 0, z: 0 }, framing(acrossFor(mode, ballX), sizeW, sizeH, inset).dist) }
        else { shot = 'goal-cheer'; const f = fs[scorer], w = f ? toWorld(f[0], f[1]) : { x: ballX, z: ballZ }; target = celebration(w, team) }
        ease = 1 - Math.pow(0.0008, dt)
      } else {
        camMode = mode
        shot = mode + '-' + viewTeam
        const dist = framing(acrossFor(mode, ballX), sizeW, sizeH, inset).dist
        const half = dist * Math.tan((fr.fov * Math.PI) / 360) * (sizeW / Math.max(1, sizeH))
        const mine = meta.you !== null ? fs[meta.you] : undefined, me = mine ? toWorld(mine[0], mine[1]) : null
        target = openPlay(mode, viewTeam, { x: ballX, z: ballZ }, { x: Math.max(-9, Math.min(9, ballVx)), z: Math.max(-9, Math.min(9, ballVz)) }, dist, half, me)
      }
      // End-on in open play, the near goal's mouth would sit under the thumb pad: slide the picture back towards it, up the screen, until the goal line is above the thumbs.
      if (mode === 'end' && shot === 'end-' + viewTeam && !pens) {
        const sg = sgn(viewTeam), limit = sizeH - inset.bottom - 4
        probe.copy(camera, false); probe.fov = fov
        const goalY = (d: number): number => {
          probe.position.set(target.pos[0] - sg * d, target.pos[1], target.pos[2]); probe.up.set(0, 1, 0)
          probe.lookAt(target.look[0] - sg * d, target.look[1], target.look[2]); probe.updateMatrixWorld(true); probe.updateProjectionMatrix()
          proj.set(-sg * (PITCH_L / 2 + 0.3), 0, 0).project(probe)
          return (1 - proj.y) / 2 * sizeH
        }
        const d = clearShift(goalY, limit)
        target.pos[0] -= sg * d; target.look[0] -= sg * d
      }
      // A new kind of shot cuts a little faster than a follow; the same kind eases.
      if (shot !== lastShot) { lastShot = shot; cutAt = now }
      if (now - cutAt < 600) ease = Math.max(ease, 1 - Math.pow(0.0001, dt))
      if (snapCamera) { camPos.set(...target.pos); look.set(...target.look); snapCamera = false } else {
        camPos.x += (target.pos[0] - camPos.x) * ease; camPos.y += (target.pos[1] - camPos.y) * ease; camPos.z += (target.pos[2] - camPos.z) * ease
        look.x += (target.look[0] - look.x) * ease; look.y += (target.look[1] - look.y) * ease; look.z += (target.look[2] - look.z) * ease
      }
      if (Math.abs(camera.fov - fov) > 0.01) { camera.fov = fov; camera.updateProjectionMatrix() }
      camera.position.copy(camPos).add(shake.offset(dt, shakeOffset))
      camera.lookAt(look)
      camera.updateMatrixWorld(true)
      renderer.render(scene, camera)
      // Labels are projected through the camera as it was drawn.
      for (const l of labels) {
        const body = bodies[l.p] as Body
        const head = toScreen(body.holder.position.x, PLAYER_HEIGHT + 0.3, body.holder.position.z), feet = toScreen(body.holder.position.x, 0, body.holder.position.z)
        l.x = head.x; l.y = head.y; l.scale = Math.max(10, feet.y - head.y)
      }
      stats.cpu(performance.now() - began)
    },
    events(events, snap) {
      const now = performance.now()
      for (const [code, x, y, extra] of events as [number, number, number, number][]) {
        const w = toWorld(x, y)
        if (code === EV.kick) {
          const o = snap.o, who = o && snap.p === PHASE.pens ? o.p[0] : nearestPlayer(snap.f, x, y)
          const body = who >= 0 ? bodies[who] : undefined
          if (body?.nat && !body.keeper) {
            const nat = body.nat, kind = extra ? 'kick' : 'pass', hit = extra ? TIMES.kickHit : TIMES.passHit
            if (nat.mix.state?.clip === kind && nat.mix.hold) nat.mix.hold = false // the wind-up the shoot button was holding goes on through the ball
            else nat.mix.start({ clip: kind, loop: false, rate: 1 }, hit - 0.05, true)
            nat.kickUntil = now + Math.max(0, nat.mix.duration(kind) - nat.mix.stateTime) * 1000
          } else if (body && !body.keeper) { body.kickUntil = now + 380; play(body, 'kick', true, 1, 0.12) }
          shake.kick(extra ? 0.05 : 0.015)
          hopUntil = now + 520; hopPeak = extra ? 0.6 : 0.2
          burst(w.x, 0.1, w.z, extra ? 8 : 4, 1.4, [0xffffff, 0xcfe8c4], 0.6)
        } else if (code === EV.tackle) {
          shake.kick(0.1)
          burst(w.x, 0.15, w.z, 10, 2.2, [0xd9c9a0, 0xb5a37a], 0.8)
        } else if (code === EV.goal) {
          goalTeam = extra; netShake = 1; crowdBounce = 1
          shake.kick(0.2)
          burst(sgn(extra) * (PITCH_L / 2 + GOAL_DEEP / 2), 1.2, 0, 44, 5, [0xffffff, 0x24d05a, 0xffd23a, 0xff5a36, 0x38bdf8], 1.2)
          const o = snap.o, body = o && snap.p === PHASE.pens ? bodies[o.p[0]] : undefined
          if (body) body.cheerUntil = now + 1800
        } else if (code === EV.post) {
          shake.kick(0.15); burst(w.x, 0.9, w.z, 6, 2.5, [0xffffff], 1)
        } else if (code === EV.save) {
          shake.kick(0.1); burst(w.x, 0.8, w.z, 6, 2, [0x7dd3fc], 1)
          const keeper = bodies[4 + (extra & 1)]
          if (keeper?.nat && !(snap.o && snap.o.k[2] !== 0)) { keeper.nat.mix.start({ clip: 'keeper-catch', loop: false, rate: 1 }, 0, true); keeper.nat.kickUntil = now + keeper.nat.mix.duration('keeper-catch') * 1000 }
        } else if (code === EV.miss) {
          shake.kick(0.04)
        }
      }
    },
    resize(width, height, insets = NO_INSETS) {
      sizeW = width; sizeH = height; inset = insets
      renderer.setSize(width, height, false)
      const f = framing(1, width, height, insets)
      camera.aspect = width / Math.max(1, height); camera.fov = f.fov
      camera.setViewOffset(width, height, -f.shiftX, -f.shift, width, height) // slides the picture so the play centres in the free band
      camera.updateProjectionMatrix()
      snapCamera = true
    },
    project: (x, y, up = 0) => { const w = toWorld(x, y); return toScreen(w.x, up, w.z) },
    mode: () => camMode,
    stats: () => ({ ...stats.read(renderer), ratio: ladder[rung.level] as number, cam: [camPos.x, camPos.y, camPos.z].map((v) => Math.round(v * 10) / 10), look: [look.x, look.y, look.z].map((v) => Math.round(v * 10) / 10), ball: [ballX, ballLift, ballZ].map((v) => Math.round(v * 10) / 10), keepers: [bodies[4], bodies[5]].map((k) => Math.round(((k as Body).roll) * 100) / 100), /** how many bodies are the players' own characters, the triangles of one, and why not */ native: bodies.filter((x) => x.nat).length, perActor, nativeWhy }),
    dispose() { disposed = true; for (const body of bodies) { body.nat?.fighter.dispose(); body.nat = null } disposeScene(scene); bitGeo.dispose(); bitMat.dispose(); shadows.geometry.dispose(); rings.geometry.dispose(); renderer.dispose() },
  }
  return view
}

/** The sky: a vertical gradient from a deep evening blue to a warm haze at the horizon, drawn once into a small texture. */
function skyTexture(): THREE.Texture {
  const c = document.createElement('canvas'); c.width = 2; c.height = 256
  const g = c.getContext('2d') as CanvasRenderingContext2D
  const grad = g.createLinearGradient(0, 0, 0, 256)
  grad.addColorStop(0, '#0d1530'); grad.addColorStop(0.55, '#2a3d5e'); grad.addColorStop(0.85, '#c98a63'); grad.addColorStop(1, '#e8b27a')
  g.fillStyle = grad; g.fillRect(0, 0, 2, 256)
  const texture = new THREE.CanvasTexture(c); texture.colorSpace = THREE.SRGBColorSpace
  return texture
}

/** The blocky players ship unlit with no normals (a flat-shaded look baked into the texture): give them normals so one light shades them like the rest. */
function withNormals(root: THREE.Object3D): void {
  root.traverse((node) => {
    const mesh = node as THREE.Mesh
    if (mesh.isMesh && !mesh.geometry.attributes.normal) mesh.geometry.computeVertexNormals()
  })
}

function seeded(seed: number): () => number { let a = seed; return () => { a = (a * 1664525 + 1013904223) >>> 0; return a / 4294967296 } }

/** Stands round the pitch (tiers rising away from the boards), a crowd of coloured blocks on them, and four floodlight towers: four instanced draws. */
function stadium(): THREE.Group {
  const group = new THREE.Group(), rnd = seeded(11)
  const m = new THREE.Matrix4(), q = new THREE.Quaternion(), s = new THREE.Vector3(), p = new THREE.Vector3(), c = new THREE.Color()
  const tiers = 4, long = 54, short = 36
  const steps = new THREE.InstancedMesh(new THREE.BoxGeometry(1, 1, 1), new THREE.MeshLambertMaterial({ color: 0x3a4660 }), tiers * 4)
  const palette = [0x24d05a, 0xffffff, 0xffffff, 0xffd23a, 0x1f6f3a, 0xe9efe9, 0xc8352b, 0x38bdf8, 0x2b2f3c]
  const crowdCount = 700
  const crowd = new THREE.InstancedMesh(new THREE.BoxGeometry(0.5, 0.8, 0.4), new THREE.MeshLambertMaterial({ color: 0xffffff }), crowdCount)
  let i = 0, n = 0
  const row = (x: number, z: number, y: number, along: 'x' | 'z', length: number, count: number): void => {
    for (let k = 0; k < count && n < crowdCount; k++) {
      const u = (k + 0.5) / count - 0.5, jitter = (rnd() - 0.5) * 0.2
      m.compose(p.set(along === 'x' ? x + u * length : x, y + 0.6 + rnd() * 0.12, along === 'z' ? z + u * length : z), q.identity(), s.set(1, 0.9 + rnd() * 0.3, 1))
      p.x += along === 'z' ? jitter : 0; m.setPosition(p)
      crowd.setMatrixAt(n, m); crowd.setColorAt(n, c.setHex(palette[Math.floor(rnd() * palette.length)] as number)); n += 1
    }
  }
  for (let t = 0; t < tiers; t++) {
    const off = 14.2 + t * 1.15, y = 0.3 + t * 0.55, h = 0.6 + t * 1.1
    for (const side of [-1, 1]) {
      steps.setMatrixAt(i++, m.compose(p.set(0, h / 2, side * off), q.identity(), s.set(long, h, 1.15)))
      row(0, side * off, h, 'x', long - 3, 46)
    }
    const eo = 29.6 + t * 1.15 // 8 m behind each goal is free: the goal replay's camera stands there
    for (const side of [-1, 1]) {
      const he = Math.min(h, 0.6 + t * 0.35) // the ends stay low, so the camera behind a goal sees over them
      steps.setMatrixAt(i++, m.compose(p.set(side * eo, he / 2, 0), q.identity(), s.set(1.15, he, short)))
      if (t < 2) row(side * eo, 0, he, 'z', short - 3, 24)
    }
    void y
  }
  for (; n < crowdCount; n++) { crowd.setMatrixAt(n, m.compose(p.set(0, -9, 0), q.identity(), s.set(0.001, 0.001, 0.001))); crowd.setColorAt(n, c.setHex(0xffffff)) }
  steps.frustumCulled = false; crowd.frustumCulled = false
  const poles = new THREE.InstancedMesh(new THREE.CylinderGeometry(0.22, 0.34, 1, 6), new THREE.MeshLambertMaterial({ color: 0x59627a }), 4)
  const lamps = new THREE.InstancedMesh(new THREE.BoxGeometry(3.4, 1.7, 0.35), new THREE.MeshBasicMaterial({ color: 0xfff1c8, fog: false }), 4)
  let k = 0
  for (const sx of [-1, 1]) for (const sz of [-1, 1]) {
    const x = sx * 33, z = sz * 22
    poles.setMatrixAt(k, m.compose(p.set(x, 8, z), q.identity(), s.set(1, 16, 1)))
    q.setFromAxisAngle(new THREE.Vector3(0, 1, 0), Math.atan2(-x, -z))
    lamps.setMatrixAt(k, m.compose(p.set(x, 16.6, z), q, s.set(1, 1, 1)))
    k += 1
  }
  poles.frustumCulled = false; lamps.frustumCulled = false
  group.add(steps, crowd, poles, lamps)
  return group
}
