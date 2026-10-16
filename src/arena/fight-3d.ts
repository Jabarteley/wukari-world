/**
 * OWNER: games (real-time)
 * FIGHT IN 3D: the same server-judged fight (./fight.ts) drawn with three.js on the phone. The rules are a side view, 1000 units wide;
 * this view puts them in a ring at their own scale (a fighter's body is 105 units, so 1.8 m fighters make the stage 15.8 m between
 * the walls) and plays each fighter's animation clips from what the snapshot says: idle and walking, punch and kick timed so the
 * strike lands on the tick the server counts it, block, the hit reaction, the knock-down and the winner's cheer, with crossfades so
 * nothing pops. The camera follows the pair, closes in as they close, shakes on a hit and turns round the fighter who went down.
 * HUD and banners are drawn over it by ./fight-draw.ts (drawFightHud), so both views read the same.
 *
 * ASSETS (manifests in scripts/assets/manifests/, licences in Help): two CC0 KayKit fighters with their clips, and our own ring from
 * scripts/assets/blender/ring.py. About 0.5 MB in all, about 7,300 triangles, under 20 draw calls, one light, no shadow map.
 * A lazy chunk: the Fight screen fetches it when it opens, and draws the 2D view until it is ready (or for ever, without WebGL).
 */
import { THREE, Shake, FrameStats, blobShadow, disposeScene, lambertise, loadGlb, makeRenderer } from './three/kit.ts'
import { clone as cloneSkinned } from 'three/examples/jsm/utils/SkeletonUtils.js'
import { ACT, ARENA_W, BODY_H, HZ, MOVES, PHASE } from './fight.ts'
import type { FighterSnap, FightSnap } from './fight.ts'

export const FIGHT_ASSETS = Object.freeze({
  fighters: ['/assets/packs/kaykit-adventurers/fighter-1.glb', '/assets/packs/kaykit-adventurers/fighter-2.glb'] as const,
  ring: '/assets/packs/allworld-fight/ring-wide.glb',
})
/** Metres per rules unit: a fighter's 105-unit body is 1.8 m tall. */
export const UNIT = 1.8 / BODY_H
/** The canvas is this high above the floor (scripts/assets/blender/ring.py). */
export const CANVAS_Y = 1.0
export const FIGHTER_HEIGHT = 1.8

/** Where a rules position is in the ring. */
export const toWorld = (x: number, y: number): { x: number; y: number } => ({ x: (x - ARENA_W / 2) * UNIT, y: CANVAS_Y + y * UNIT })

export type Clip = 'idle' | 'walk' | 'walk-back' | 'punch' | 'punch-2' | 'kick' | 'blocking' | 'block-hit' | 'hit' | 'hit-2' | 'down' | 'cheer'
/** Clips that play once and hold their last frame. */
export const ONCE: ReadonlySet<Clip> = new Set(['punch', 'punch-2', 'kick', 'block-hit', 'hit', 'hit-2', 'down'])

/**
 * The clip a fighter should be showing, pure. `speed` is metres a second towards (+) or away from (-) the other fighter;
 * `blockHit` is true for a moment after a blocked hit; `won` once the match is over and this seat won.
 */
export function clipFor(f: FighterSnap, speed: number, opts: { blockHit: boolean; strongHit: boolean; won: boolean; punchAlt: boolean }): Clip {
  const act = f[3], blocking = (f[6] & 1) !== 0
  if (act === ACT.ko || f[5] <= 0) return 'down'
  if (opts.won) return 'cheer'
  if (act === ACT.hurt) return opts.strongHit ? 'hit-2' : 'hit'
  if (act === ACT.punch) return opts.punchAlt ? 'punch-2' : 'punch'
  if (act === ACT.kick) return 'kick'
  if (blocking) return opts.blockHit ? 'block-hit' : 'blocking'
  if (Math.abs(speed) > 0.35) return speed > 0 ? 'walk' : 'walk-back'
  return 'idle'
}
/** How fast an attack clip plays so its whole swing fits the move's ticks (it lands when the server says it lands). */
export const attackScale = (clipSeconds: number, act: number): number => {
  const move = MOVES[act as 1 | 2]
  return move ? clipSeconds / (move.total / HZ) : 1
}
/** Camera distance for a gap between the fighters (metres) and the screen's shape: they stay in frame on a tall phone too. */
/** The camera's vertical field of view for a screen shape: wider on a tall phone, so two fighters fit across it. */
export const fovFor = (aspect: number): number => (aspect < 1 ? 60 : 40)
/** Camera distance that keeps both fighters and a body's width either side in frame, for a gap (metres) and a screen shape. */
export function cameraDistance(gap: number, aspect: number): number {
  const half = (fovFor(aspect) * Math.PI) / 360, across = Math.atan(Math.tan(half) * Math.max(0.3, aspect))
  return Math.min(17, Math.max(3.6, (gap / 2 + 1.1) / Math.tan(across)))
}
/** The ring's ropes are 8.25 m from its centre and the top rope 2.25 m up: a camera further out rises to look over it. */
export const ROPE_Z = 8.25, ROPE_TOP = CANVAS_Y + 1.25
/** Camera height (metres above the floor) for a distance: at eye level inside the ring, over the top rope from outside it. */
export const cameraHeight = (dist: number, lookY: number): number => {
  const eye = CANVAS_Y + 1.55
  if (dist <= ROPE_Z - 0.3) return eye
  // The line from the camera to the look point must pass 0.35 m over the top rope where it crosses the ropes.
  const over = lookY + (ROPE_TOP + 0.35 - lookY) * (dist / ROPE_Z)
  return Math.max(eye, over)
}

interface Body {
  root: THREE.Object3D; mixer: THREE.AnimationMixer; actions: Map<string, THREE.AnimationAction>; current: Clip | null
  shadow: THREE.Mesh; lastX: number; lastAct: number; lastAt: number; blockHitUntil: number; strongUntil: number; punchAlt: boolean
}

export interface FightView {
  /** Draw one frame. `a`/`b`/`t` are the two snapshots and how far between; `own` replaces your fighter (prediction). */
  draw(a: FightSnap, b: FightSnap, t: number, meta: { own: FighterSnap | null; you: number | null; winner: number; now: number }): void
  /** This tick's hits (a snapshot's `e`): sparks and camera shake. */
  hits(events: readonly number[][]): void
  resize(width: number, height: number): void
  stats(): ReturnType<FrameStats['read']>
  dispose(): void
}

/** Make the 3D view on `canvas`, or null when WebGL or the models are not available (the screen keeps its 2D view). */
export async function createFightView(canvas: HTMLCanvasElement, opts: { reduced: boolean }): Promise<FightView | null> {
  const renderer = makeRenderer(canvas)
  if (!renderer) return null
  let models: Awaited<ReturnType<typeof loadGlb>>[]
  try { models = await Promise.all([...FIGHT_ASSETS.fighters.map((url) => loadGlb(url)), loadGlb(FIGHT_ASSETS.ring)]) }
  catch { renderer.dispose(); return null }
  const [m0, m1, ringModel] = models as [typeof models[0], typeof models[0], typeof models[0]]

  const scene = new THREE.Scene()
  scene.background = skyTexture()
  scene.fog = new THREE.Fog(0x1a1426, 16, 40)
  scene.add(new THREE.HemisphereLight(0xffe6c4, 0x2a2238, 1.25))
  const sun = new THREE.DirectionalLight(0xfff1dc, 1.6)
  sun.position.set(-4, 9, 7); scene.add(sun)

  const ring = ringModel.scene.clone(true)
  lambertise(ring)
  const box = new THREE.Box3().setFromObject(ring), centre = box.getCenter(new THREE.Vector3())
  ring.position.x -= centre.x; ring.position.z -= centre.z
  scene.add(ring)
  scene.add(hall())

  const bodies: Body[] = [m0, m1].map((model, seat) => {
    const root = cloneSkinned(model.scene)
    lambertise(root)
    root.updateMatrixWorld(true)
    const size = new THREE.Box3().setFromObject(root).getSize(new THREE.Vector3())
    root.scale.setScalar(FIGHTER_HEIGHT / Math.max(0.1, size.y))
    const holder = new THREE.Group(); holder.add(root); scene.add(holder)
    const mixer = new THREE.AnimationMixer(root), actions = new Map<string, THREE.AnimationAction>()
    for (const clip of model.animations) {
      const action = mixer.clipAction(clip)
      if (ONCE.has(clip.name as Clip)) { action.setLoop(THREE.LoopOnce, 1); action.clampWhenFinished = true }
      actions.set(clip.name, action)
    }
    const shadow = blobShadow(0.55); shadow.position.y = CANVAS_Y + 0.012; scene.add(shadow)
    return { root: holder, mixer, actions, current: null, shadow, lastX: seat ? 640 : 360, lastAct: ACT.none, lastAt: 0, blockHitUntil: 0, strongUntil: 0, punchAlt: false }
  })

  // Sparks: one Points object, a small pool.
  const SPARKS = 48
  const sparkPos = new Float32Array(SPARKS * 3), sparkVel = new Float32Array(SPARKS * 3), sparkLife = new Float32Array(SPARKS).fill(1)
  const sparkGeo = new THREE.BufferGeometry(); sparkGeo.setAttribute('position', new THREE.BufferAttribute(sparkPos, 3))
  const sparkMat = new THREE.PointsMaterial({ color: 0xffd36a, size: 0.09, transparent: true, opacity: 1, depthWrite: false, blending: THREE.AdditiveBlending })
  const sparks = new THREE.Points(sparkGeo, sparkMat); sparks.frustumCulled = false; scene.add(sparks)
  let nextSpark = 0

  const camera = new THREE.PerspectiveCamera(38, 1, 0.1, 80)
  const shake = new Shake(opts.reduced), shakeOffset = new THREE.Vector3()
  const look = new THREE.Vector3(0, CANVAS_Y + 0.95, 0), camPos = new THREE.Vector3(0, CANVAS_Y + 1.6, 7)
  const stats = new FrameStats()
  let last = 0, aspect = 1, koSince = -1

  function play(body: Body, clip: Clip, now: number, restart: boolean, scale = 1): void {
    const next = body.actions.get(clip) ?? body.actions.get('idle')
    if (!next) return
    const prev = body.current ? body.actions.get(body.current) : undefined
    if (body.current === clip && !restart) { next.timeScale = scale; return }
    next.reset(); next.timeScale = scale; next.enabled = true; next.setEffectiveWeight(1)
    const fade = ONCE.has(clip) ? 0.07 : clip === 'down' ? 0.12 : 0.2
    if (prev && prev !== next) next.crossFadeFrom(prev, fade, false)
    next.play()
    body.current = clip
    void now
  }

  return {
    draw(a, b, t, meta) {
      const began = performance.now()
      const now = meta.now, dt = last ? Math.min(0.1, (now - last) / 1000) : 1 / 60
      last = now; stats.tick(now)
      const snaps: [FighterSnap, FighterSnap] = [0, 1].map((seat) => {
        const fa = a.f[seat as 0 | 1], fb = b.f[seat as 0 | 1]
        const mixd: FighterSnap = [fa[0] + (fb[0] - fa[0]) * t, fa[1] + (fb[1] - fa[1]) * t, fb[2], fb[3], fb[4], fb[5], fb[6]]
        return meta.own && meta.you === seat ? meta.own : mixd
      }) as [FighterSnap, FighterSnap]
      const over = b.p === PHASE.over
      bodies.forEach((body, seat) => {
        const f = snaps[seat as 0 | 1], other = snaps[(1 - seat) as 0 | 1]
        const w = toWorld(f[0], f[1])
        body.root.position.set(w.x, w.y, 0)
        const facing = f[2] ? 1 : -1
        body.root.rotation.y = facing > 0 ? Math.PI / 2 : -Math.PI / 2
        // Speed towards the other fighter, from the drawn positions (metres a second).
        const towards = Math.sign(other[0] - f[0]) || facing
        const speed = dt > 0 ? ((f[0] - body.lastX) * UNIT / dt) * towards : 0
        body.lastX = f[0]
        // A new attack restarts its clip; the second punch of a pair uses the other arm.
        const startedAttack = (f[3] === ACT.punch || f[3] === ACT.kick) && (f[3] !== body.lastAct || f[4] < body.lastAt)
        if (startedAttack && f[3] === ACT.punch) body.punchAlt = !body.punchAlt
        const startedHurt = f[3] === ACT.hurt && body.lastAct !== ACT.hurt
        body.lastAct = f[3]; body.lastAt = f[4]
        const clip = clipFor(f, speed, { blockHit: now < body.blockHitUntil, strongHit: now < body.strongUntil, won: over && meta.winner === seat, punchAlt: body.punchAlt })
        const action = body.actions.get(clip)
        const scale = clip === 'punch' || clip === 'punch-2' || clip === 'kick' ? attackScale(action?.getClip().duration ?? 0.4, f[3]) : clip === 'walk' || clip === 'walk-back' ? Math.min(1.6, Math.max(0.7, Math.abs(speed) / 2.2)) : 1
        play(body, clip, now, startedAttack || (startedHurt && (clip === 'hit' || clip === 'hit-2')), scale)
        body.mixer.update(dt)
        // The shadow stays on the canvas and shrinks as the fighter rises.
        const lift = Math.max(0, f[1] * UNIT)
        body.shadow.position.set(w.x, CANVAS_Y + 0.012, 0)
        body.shadow.scale.setScalar(Math.max(0.5, 1 - lift * 0.6));
        (body.shadow.material as THREE.MeshBasicMaterial).opacity = 0.45 * Math.max(0.3, 1 - lift)
      })
      // Sparks fly and fall.
      for (let i = 0; i < SPARKS; i++) {
        const life = sparkLife[i] as number
        if (life >= 1) { sparkPos[i * 3 + 1] = -10; continue }
        sparkLife[i] = life + dt * 2.2
        sparkVel[i * 3 + 1] = (sparkVel[i * 3 + 1] as number) - 9.8 * dt
        for (let k = 0; k < 3; k++) sparkPos[i * 3 + k] = (sparkPos[i * 3 + k] as number) + (sparkVel[i * 3 + k] as number) * dt
      }
      sparkGeo.attributes.position!.needsUpdate = true
      // The camera: between the two, closer as they close in; on a knock-out it turns slowly round the one who went down.
      const x0 = toWorld(snaps[0][0], 0).x, x1 = toWorld(snaps[1][0], 0).x, gap = Math.abs(x1 - x0)
      // On a tall phone the thumbs cover the bottom: the camera looks lower, so the fighters stand above them.
      let tx = (x0 + x1) / 2, ty = CANVAS_Y + (aspect < 1 ? 0.15 : 0.95), dist = cameraDistance(gap, aspect), yaw = 0, drop = 0
      const loser = b.f[0][5] <= 0 ? 0 : b.f[1][5] <= 0 ? 1 : -1
      if ((b.p === PHASE.ko || over) && loser >= 0 && !opts.reduced) {
        if (koSince < 0) koSince = now
        const k = Math.min(1, (now - koSince) / 1800), ease = k * k * (3 - 2 * k)
        tx += ((loser ? x1 : x0) - tx) * ease; ty -= 0.45 * ease; dist = Math.min(dist * (1 - 0.32 * ease), ROPE_Z - 0.6 + (dist - ROPE_Z + 0.6) * (1 - ease)); yaw = 0.55 * ease * (loser ? -1 : 1); drop = 0.6 * ease
      } else if (b.p !== PHASE.ko && !over) koSince = -1
      const ease = 1 - Math.pow(0.001, dt)
      look.x += (tx - look.x) * ease; look.y += (ty - look.y) * ease
      const want = new THREE.Vector3(look.x + Math.sin(yaw) * dist, cameraHeight(dist, look.y) - drop, Math.cos(yaw) * dist)
      camPos.lerp(want, ease)
      camera.position.copy(camPos).add(shake.offset(dt, shakeOffset))
      camera.lookAt(look)
      renderer.render(scene, camera)
      stats.cpu(performance.now() - began)
    },
    hits(events) {
      for (const [seat, blocked, strong, x, y] of events as [number, number, number, number, number][]) {
        const body = bodies[seat]
        if (body) { if (blocked) body.blockHitUntil = performance.now() + 260; else if (strong) body.strongUntil = performance.now() + 400 }
        shake.kick(blocked ? 0.05 : strong ? 0.22 : 0.12)
        const at = toWorld(x, y), n = blocked ? 8 : strong ? 18 : 12
        for (let i = 0; i < n; i++) {
          const k = nextSpark = (nextSpark + 1) % SPARKS, a = Math.random() * Math.PI * 2, v = 1.5 + Math.random() * (strong ? 4 : 2.6)
          sparkPos.set([at.x, at.y, (Math.random() - 0.5) * 0.2], k * 3)
          sparkVel.set([Math.cos(a) * v, Math.abs(Math.sin(a)) * v + 1, (Math.random() - 0.5) * v], k * 3)
          sparkLife[k] = 0
        }
        sparkMat.color.set(blocked ? 0x9ad0ff : 0xffd36a)
      }
    },
    resize(width, height) {
      aspect = width / Math.max(1, height)
      renderer.setSize(width, height, false)
      camera.aspect = aspect; camera.fov = fovFor(aspect); camera.updateProjectionMatrix()
    },
    stats: () => stats.read(renderer),
    dispose() { disposeScene(scene); sparkGeo.dispose(); sparkMat.dispose(); renderer.dispose() },
  }
}

/** The dark of the hall above the lamps: a vertical gradient drawn once into a small texture. */
function skyTexture(): THREE.Texture {
  const c = document.createElement('canvas'); c.width = 2; c.height = 256
  const g = c.getContext('2d') as CanvasRenderingContext2D
  const grad = g.createLinearGradient(0, 0, 0, 256)
  grad.addColorStop(0, '#07060d'); grad.addColorStop(0.6, '#1a1426'); grad.addColorStop(1, '#2e2238')
  g.fillStyle = grad; g.fillRect(0, 0, 2, 256)
  const texture = new THREE.CanvasTexture(c); texture.colorSpace = THREE.SRGBColorSpace
  return texture
}

/** The hall round the ring: dark stands that rise into shadow, and a row of warm lamps over them. Two instanced draws. */
function hall(): THREE.Group {
  const group = new THREE.Group()
  const tiers = 14, stands = new THREE.InstancedMesh(new THREE.BoxGeometry(1, 1, 1), new THREE.MeshLambertMaterial({ color: 0x2a2236 }), tiers * 3)
  const lamps = new THREE.InstancedMesh(new THREE.SphereGeometry(0.22, 8, 6), new THREE.MeshBasicMaterial({ color: 0xffd28a, fog: false }), 18)
  const m = new THREE.Matrix4(), q = new THREE.Quaternion(), s = new THREE.Vector3(), p = new THREE.Vector3()
  let i = 0
  for (let row = 0; row < tiers; row++) {
    // Behind the ring and down both sides, each row a step higher and further back.
    stands.setMatrixAt(i++, m.compose(p.set(0, 0.4 + row * 0.55, -14 - row * 0.9), q, s.set(34, 0.8, 0.9)))
    stands.setMatrixAt(i++, m.compose(p.set(-14 - row * 0.9, 0.4 + row * 0.55, -2), q, s.set(0.9, 0.8, 26)))
    stands.setMatrixAt(i++, m.compose(p.set(14 + row * 0.9, 0.4 + row * 0.55, -2), q, s.set(0.9, 0.8, 26)))
  }
  for (let k = 0; k < 18; k++) lamps.setMatrixAt(k, m.compose(p.set(-17 + k * 2, 15.5, -24), q, s.set(1, 1, 1)))
  group.add(stands, lamps)
  return group
}
