// The one 3D preview of the app (src/scene/avatar-preview.ts), shared by every look stage.
//
// There is one WebGL context for the whole app. A stage that appears asks to show a look; the
// canvas is moved into it and updated (one frame only when something changed — the preview never
// loops). When the last stage has gone, the renderer, geometry, materials and context are
// disposed. The module and Three.js are fetched with a dynamic import the first time a stage is
// shown, so neither is part of the first download. A stage reports loading and can offer an
// explicit retry if the module, WebGL context, or canonical character assets fail.
import type { AvatarPreview, PreviewFocus } from '../../../scene/avatar-preview.ts'
import { markSpun } from './lookState.ts'
import type { SceneLook } from './lookModel.ts'

export type StageMode = 'loading' | '3d' | 'error'
/** What the preview needs of one stage. */
export interface StageHandle {
  host: HTMLElement
  setMode(mode: StageMode): void
  /** False once the stage has left the page. */
  connected(): boolean
}
export interface PreviewRequest { stage: StageHandle; look: SceneLook; focus: PreviewFocus; label: string; /** Pixels at the bottom of the stage kept clear of the character. */ inset?: number }

type AvatarModule = typeof import('../../../scene/avatar-preview.ts')
let scene3d: AvatarModule | null = null
let loading: Promise<AvatarModule> | null = null
let preview: AvatarPreview | null = null
let wanted: PreviewRequest | null = null
let lastShown = ''
const stages = new Set<StageHandle>()

/** { renderCount, frames, animating, live, … } of the preview that is alive, or null. For tests and checks. */
export const previewDiagnostics = (): ReturnType<AvatarPreview['diagnostics']> | null => (preview ? preview.diagnostics() : null)

/** Free the preview and its WebGL context. Safe to call at any time. */
export function releaseLookPreview(): void {
  preview?.dispose()
  preview = null
  lastShown = ''
}

function show(): void {
  const request = wanted
  if (!request || !request.stage.connected()) return
  const { stage, look, focus, label, inset = 0 } = request
  const key = JSON.stringify(look)
  const react = lastShown !== '' && lastShown !== key
  lastShown = key
  try {
    if (!preview) {
      if (!scene3d) return
      preview = scene3d.createAvatarPreview(stage.host, {
        look, focus, label, inset,
        onSpin: markSpun,
      })
    } else {
      preview.attach(stage.host)
      preview.setLook(look, { react })
      preview.setInset(inset)
      preview.setFocus(focus)
      preview.setLabel(label)
    }
    stage.setMode('3d')
  } catch (error) {
    // Keep the stage in an explicit error state. Its retry action repeats this request.
    releaseLookPreview()
    stage.setMode('error')
    console.warn('The canonical character preview could not start.', error)
  }
}

/**
 * Show `look` in `stage`. The first call downloads the preview code; later calls move the existing
 * canvas and update it, costing one frame only when something changed.
 */
export function showLookPreview(request: PreviewRequest): void {
  stages.add(request.stage)
  wanted = request
  if (scene3d) { show(); return }
  loading ??= import('../../../scene/avatar-preview.ts')
  loading.then((module) => { scene3d = module; if (wanted?.stage.connected()) show() },
    (error) => { loading = null; if (wanted?.stage.connected()) wanted.stage.setMode('error'); console.warn('The canonical character preview module could not load.', error) })
}

/** Fetch the preview code now, without showing anything (see warmLanding.ts). A failed fetch is forgotten, so showing a stage tries again. */
export function warmLookPreview(): Promise<void> {
  if (scene3d) return Promise.resolve()
  const pending = loading ??= import('../../../scene/avatar-preview.ts')
  pending.catch(() => { if (loading === pending) loading = null })
  return pending.then(() => undefined, () => undefined)
}

/** The preview alone follows a Face / Full body switch. */
export function setPreviewFocus(focus: PreviewFocus): void { preview?.setFocus(focus) }

/** The figure on the stage, full length and facing front, as a canvas drawn at once (the share card starts from it); null when no preview is showing. */
export const snapshotLookPreview = (): HTMLCanvasElement | null => preview?.snapshot() ?? null

/** Turn the character with a short ease: a quarter turn, or π to see it from behind. */
export function turnPreview(radians: number): void { preview?.turnBy(radians) }

/**
 * A stage left the page. The preview lives exactly as long as a stage is on it: when the last one
 * has gone (a new one that replaces it in the same update counts as still there) it is released.
 */
export function leaveLookPreview(stage: StageHandle): void {
  stages.delete(stage)
  if (wanted?.stage === stage) wanted = null
  queueMicrotask(() => { if (stages.size === 0) releaseLookPreview() })
}
