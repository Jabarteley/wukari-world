/**
 * OWNER: scenes
 * The `fx` chunk's front door: weather, particles, post-processing and game feel are fetched through `loadFx(tier)`, never imported
 * directly. Today the host is empty; phases 1 to 3 of docs/OPEN-SOURCE-PLAN.md add their parts at the FX_IMPORTS marker below.
 *
 * Nothing in the first download imports this file. It is reached only by lazy `import('./fx/index.ts')` calls from scene hosts,
 * so vite.config.ts can put src/scene/fx/**, src/scene/feel/** and the libraries behind them (postprocessing and
 * n8ao) in one chunk named `fx`, and src/scene/city-scenes.test.ts checks that no startup or scene-host chunk imports it statically.
 *
 * The tier gate, in one paragraph: rain, particles and feel are for every tier (a phone gets fewer drops and sparks, never none),
 * but the post-processing and ambient-occlusion parts, the code that imports `postprocessing` and `n8ao`, are imported only when
 * `tier === 'high'`, so a phone or a wide screen never downloads or compiles them. The tier comes from `renderTier()` in
 * src/scene/look.ts through `fxTierFor`; the HIGH tier there (`env: true`) is the same gate that already decides the environment map.
 *
 * Pure planners stay in their own files (a function of seed, clock and conditions, with Node tests); the draw modules that own THREE
 * are what `loadFx` imports. Nothing here asks for frames: the caller's wake window decides when anything moves.
 */

import type * as THREE from 'three'
import type { ThreeModule } from '../types.ts'
import type { Post } from './post.ts'

/** Which parts of the fx chunk a device may use. Same names as `RenderTier.name` in src/scene/look.ts. */
export type FxTier = 'phone' | 'wide' | 'high'

/** What a scene host hands `loadFx` so the post stack can be built on its renderer. */
export interface FxContext {
  readonly THREE: ThreeModule
  readonly renderer: THREE.WebGLRenderer
  /** The city the scene shows, for its season (the colour grade). */
  readonly cityId: string
}

/** What a scene host holds after `loadFx`. Phases add their parts here (rain, particles, post, feel); `dispose` frees all of them. */
export interface FxHost {
  readonly tier: FxTier
  /** The high tier's post stack (src/scene/fx/post.ts), or null on every other tier. Draw through `post.render(scene, camera)` when it is set. */
  readonly post: Post | null
  /** Re-grade the picture for the city's season and the hour at `now` (ms). Cheap: nothing happens unless the grade changed. */
  regrade(now: number): void
  dispose(): void
}

/**
 * The fx tier for a render tier. Only the exact names 'high' and 'wide' lift a device above the phone: an unknown or missing name
 * gets the cheapest set, so a new tier added to look.ts costs nothing until it is mapped here.
 */
export function fxTierFor(renderTier: { name: string }): FxTier {
  return renderTier.name === 'high' ? 'high' : renderTier.name === 'wide' ? 'wide' : 'phone'
}

/** Whether the post-processing and ambient-occlusion parts may be imported at all: the high tier only. */
export const fxUsesPost = (tier: FxTier): boolean => tier === 'high'

/**
 * Load the fx parts this tier may use and return the host that owns them. Call `dispose` when the scene goes away.
 * On the high tier, given a context, it builds the post stack; otherwise it loads nothing.
 */
export async function loadFx(tier: FxTier, context?: FxContext): Promise<FxHost> {
  let post: Post | null = null
  let regrade = (_now: number): void => {}
  // FX_IMPORTS: phases 1 to 3 add their lazy imports here. Rain, particles and feel for every tier; `if (fxUsesPost(tier))` around
  // anything that imports postprocessing or n8ao.
  if (fxUsesPost(tier) && context) {
    const [{ createPost, postAoEnabled }, { gradeFor }, { cityRules }] = await Promise.all([import('./post.ts'), import('./grade.ts'), import('../../game/cities/registry.ts')])
    const gradeNow = (now: number) => gradeFor(cityRules(context.cityId)?.climate, now)
    const size = context.renderer.getSize(new context.THREE.Vector2())
    const first = gradeNow(Date.now())
    const stack = await createPost(context.THREE, context.renderer, size.x, size.y, { grade: first, ao: postAoEnabled() })
    stack.setSize(size.x, size.y, context.renderer.getPixelRatio())
    post = stack
    let key = `${first.kind}/${first.band}`
    regrade = (now) => {
      const next = gradeNow(now), nextKey = `${next.kind}/${next.band}`
      if (nextKey === key) return
      key = nextKey; stack.setGrade(next.kind, next.band)
    }
  }
  return { tier, post, regrade, dispose() { post?.dispose(); post = null } }
}
