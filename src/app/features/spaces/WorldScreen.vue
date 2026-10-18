<script setup lang="ts">
// Walk through a space in 3D (docs/SPACES-3D.md, phase 2): a home or a group room, its furniture and the models players placed,
// in the realistic look. The owner (or a group member) can place their own models: choose one, tap a floor to put it there, turn
// it, size it, lift it, and save. Full screen over the game; lazy (three and the engine load only when this opens).
import { computed, onBeforeUnmount, onMounted, ref, shallowRef } from 'vue'
import '../../../ui/controls.css'
import { useApp } from '../../state/app.ts'
import { modelBytes, scriptSave, worldRead, worldSave, type ModelView, type PlacedModel, type WorldView, type WorldWhere } from './spacesClient.ts'
import { scriptNames, SCRIPT, TEMPLATES } from '../../../spaces/script.ts'
import type { Placement } from '../../../spaces/layout.ts'
import type { Engine, View } from '../../../spaces/world/engine.ts'

const props = defineProps<{ where: WorldWhere }>()
const emit = defineEmits<{ close: [] }>()
const { game } = useApp()

const canvas = ref<HTMLCanvasElement | null>(null)
// A modal dialog: the phone is one too, and a dialog shown later sits above it in the page's top layer.
const dialog = ref<HTMLDialogElement | null>(null)
const world = shallowRef<WorldView['world'] | null>(null)
const loading = ref(true)
const error = ref('')
const note = ref('')
const view = ref<View>('third')
const floor = ref(0)
const floors = ref(1)
const editing = ref(false)
const busy = ref(false)
const dirty = ref(false)
/** The layout being edited: the saved one plus changes. */
const layout = ref<PlacedModel[]>([])
const selected = ref<string | null>(null)
const choosing = ref<ModelView | null>(null)
/** Physics (phase 3): on once Rapier has loaded; whether a model is in the walker's hands. */
const physicsOn = ref(false)
const holding = ref(false)
/** Phase 4: the space's script, the code panel, and what a running script shows. */
const coding = ref(false)
const code = ref('')
const lines = ref('')
const said = ref('')
const score = ref<number | null>(null)
const scriptError = ref('')
const scriptBusy = ref(false)
let saidTimer = 0
const linesOf = (): string[] => lines.value.split('\n').map((l) => l.trim()).filter(Boolean).slice(0, SCRIPT.lines)
const namesOf = (): Map<string, string> => scriptNames(layout.value)
function startScript(source: { code: string; lines: string[] } | null): void {
  scriptError.value = ''; score.value = null; said.value = ''
  engine?.runScript(source, namesOf())
}
let engine: Engine | null = null
let gone = false
let counter = Date.now() % 100000

const picked = computed(() => layout.value.find((p) => p.k === selected.value) ?? null)
const triangles = computed(() => layout.value.reduce((sum, p) => sum + p.triangles, 0))
const bytes = new Map<string, Promise<ArrayBuffer | null>>()
const bytesOf = (hash: string): Promise<ArrayBuffer | null> => { let found = bytes.get(hash); if (!found) { found = modelBytes(hash); bytes.set(hash, found) } return found }

onMounted(async () => {
  dialog.value?.showModal?.()
  const answer = await worldRead(game, props.where)
  if (gone) return
  if (!answer.ok) { loading.value = false; error.value = answer.reason; return }
  world.value = answer.world
  layout.value = answer.world.models.map((p) => ({ ...p }))
  const { startEngine } = await import('../../../spaces/world/engine.ts')
  if (gone || !canvas.value) return
  engine = startEngine(canvas.value, { grid: answer.world.grid, owned: answer.world.owned, style: answer.world.style as Record<string, number> | null, items: answer.world.items, models: layout.value }, bytesOf, {
    status(s) { floor.value = s.floor; floors.value = s.floors; view.value = s.view },
    picked(key) { selected.value = key; engine?.highlight(key) },
    tapped(at) { if (choosing.value) add(choosing.value, at); else if (picked.value) move(at) },
    physics(state) { physicsOn.value = state === 'on' },
    said(text) { said.value = text; clearTimeout(saidTimer); saidTimer = window.setTimeout(() => { said.value = '' }, 4000) },
    scored(value) { score.value = value },
    scriptProblem(message, stopped) { scriptError.value = stopped ? message : `Your code: ${message}` },
  })
  loading.value = false
  if (answer.world.script) {
    code.value = answer.world.script.code
    lines.value = answer.world.script.lines.join('\n')
    startScript(answer.world.script)
  }
})
onBeforeUnmount(() => { gone = true; engine?.dispose(); engine = null })

function leave(): void {
  if (dirty.value && !globalThis.confirm?.('Leave without saving where your models stand?')) return
  emit('close')
}
function jump(): void { engine?.jump() }
function useTemplate(id: string): void {
  const found = TEMPLATES.find((t) => t.id === id)
  if (!found) return
  if (code.value.trim() && !globalThis.confirm?.('Replace your code with this starter?')) return
  code.value = found.code
  lines.value = found.lines.join('\n')
}
function runNow(): void { startScript({ code: code.value, lines: linesOf() }) }
function stopNow(): void { engine?.runScript(null, namesOf()); score.value = null; said.value = '' }
async function saveCode(): Promise<void> {
  if (scriptBusy.value) return
  scriptBusy.value = true; scriptError.value = ''; note.value = ''
  const answer = await scriptSave(game, props.where, code.value, linesOf())
  scriptBusy.value = false
  if (gone) return
  if (!answer.ok) { scriptError.value = answer.reason; return }
  note.value = answer.code === 'removed' ? 'Script removed.' : 'Script saved. Everyone who walks in runs it.'
  startScript(code.value.trim() ? { code: code.value, lines: linesOf() } : null)
}
function grab(): void { holding.value = engine?.grab() ?? false; if (!holding.value) note.value = '' }
function throwIt(): void { engine?.throwHeld(); holding.value = false }
function setLoose(on: boolean): void { const p = picked.value; if (!p) return; if (on) p.loose = true; else delete p.loose; changed(p) }
function toggleView(): void { engine?.setView(view.value === 'first' ? 'third' : 'first') }
function toggleEdit(): void {
  editing.value = !editing.value
  engine?.setEditing(editing.value)
  if (!editing.value) { selected.value = null; choosing.value = null; engine?.highlight(null) }
}

// The stick: a thumb on the left walks.
const stick = ref<{ x: number; y: number } | null>(null)
let stickId = -1, stickOrigin = { x: 0, y: 0 }
function stickDown(event: PointerEvent): void { stickId = event.pointerId; stickOrigin = { x: event.clientX, y: event.clientY }; (event.currentTarget as HTMLElement).setPointerCapture?.(event.pointerId); stick.value = { x: 0, y: 0 } }
function stickMove(event: PointerEvent): void {
  if (event.pointerId !== stickId) return
  const dx = event.clientX - stickOrigin.x, dy = event.clientY - stickOrigin.y, len = Math.hypot(dx, dy), max = 46
  const k = len > max ? max / len : 1
  stick.value = { x: dx * k, y: dy * k }
  engine?.setStick(-(dy * k) / max, (dx * k) / max)
}
function stickUp(event: PointerEvent): void { if (event.pointerId !== stickId) return; stickId = -1; stick.value = null; engine?.setStick(0, 0) }

// Editing.
function changed(p: PlacedModel): void { dirty.value = true; engine?.placeModel(p) }
async function add(model: ModelView, at: { x: number; y: number; z: number; floor: number }): Promise<void> {
  if (!world.value) return
  if (layout.value.length >= world.value.limits.placements) { error.value = `A space holds at most ${world.value.limits.placements} of your models.`; return }
  const p: PlacedModel = { k: `p${(counter++).toString(36)}`, m: model.id, by: model.by, hash: model.hash, x: round(at.x), y: 0, z: round(at.z), ry: 0, s: 1, floor: at.floor, name: model.name, size: model.size, triangles: model.triangles }
  layout.value = [...layout.value, p]
  choosing.value = null
  dirty.value = true
  await engine?.setModels(layout.value)
  selected.value = p.k
  engine?.highlight(p.k)
}
function choose(model: ModelView): void {
  choosing.value = model
  note.value = `Tap a floor to put ${model.name} there.`
}
function placeInFront(): void {
  const model = choosing.value
  if (!model || !engine) return
  const at = engine.inFront()
  void add(model, { x: at.x, y: 0, z: at.z, floor: at.floor })
  note.value = ''
}
function move(at: { x: number; z: number; floor: number }): void { const p = picked.value; if (!p) return; p.x = round(at.x); p.z = round(at.z); p.floor = at.floor; changed(p) }
function turn(degrees: number): void { const p = picked.value; if (!p) return; p.ry = (((p.ry + degrees) % 360) + 360) % 360; changed(p) }
function size(factor: number): void { const p = picked.value; if (!p) return; p.s = Math.min(20, Math.max(0.05, round(p.s * factor))); changed(p) }
function lift(metres: number): void { const p = picked.value; if (!p) return; p.y = Math.min(12, Math.max(-1, round(p.y + metres))); changed(p) }
async function remove(): Promise<void> {
  const p = picked.value
  if (!p) return
  layout.value = layout.value.filter((q) => q.k !== p.k)
  selected.value = null
  dirty.value = true
  await engine?.setModels(layout.value)
}
async function save(): Promise<void> {
  if (busy.value) return
  busy.value = true; error.value = ''; note.value = ''
  const models: Placement[] = layout.value.map(({ k, m, by, hash, x, y, z, ry, s, floor, loose }) => ({ k, m, by, hash, x, y, z, ry, s, floor, ...(loose ? { loose } : {}) }))
  const answer = await worldSave(game, props.where, models)
  busy.value = false
  if (gone) return
  if (!answer.ok) { error.value = answer.reason; return }
  dirty.value = false
  note.value = answer.placed ? `Saved. ${answer.placed} model${answer.placed === 1 ? '' : 's'} in this space.` : 'Saved.'
}
const round = (v: number): number => Math.round(v * 100) / 100
</script>

<template>
  <dialog ref="dialog" class="ws" :aria-label="world ? `${world.title} in 3D` : 'Space in 3D'" @cancel.prevent="leave">
      <canvas ref="canvas" class="ws-canvas" aria-label="The space in 3D. Drag to look around." />
      <header class="ws-top">
        <button type="button" class="ws-pill" @click="leave">Leave</button>
        <h2 class="ws-title">{{ world?.title ?? 'Loading…' }}</h2>
        <button v-if="world" type="button" class="ws-pill" :aria-label="view === 'first' ? 'Switch to third person' : 'Switch to first person'" @click="toggleView">{{ view === 'first' ? '1st' : '3rd' }}</button>
      </header>
      <p v-if="floors > 1" class="ws-floor" role="status">{{ floor === 0 ? 'Ground floor' : `Floor ${floor}` }}</p>
      <p v-if="loading" class="ws-centre" role="status">Building the space…</p>
      <div v-else-if="!world" class="ws-centre ws-card">
        <p>{{ error }}</p>
        <button type="button" class="ui-button is-block" @click="emit('close')">Close</button>
      </div>
      <template v-else>
        <div class="ws-stick" aria-label="Walk: drag the stick" @pointerdown="stickDown" @pointermove="stickMove" @pointerup="stickUp" @pointercancel="stickUp">
          <span class="ws-knob" :style="stick ? { transform: `translate(${stick.x}px, ${stick.y}px)` } : undefined" />
        </div>
        <div v-if="physicsOn && !editing" class="ws-acts" role="group" aria-label="Actions">
          <button type="button" class="ws-pill" @click="jump">Jump</button>
          <button type="button" class="ws-pill" :class="{ 'is-on': holding }" :aria-pressed="holding" @click="grab">{{ holding ? 'Put down' : 'Pick up' }}</button>
          <button v-if="holding" type="button" class="ws-pill" @click="throwIt">Throw</button>
        </div>
        <p v-if="score !== null" class="ws-score" role="status">Score {{ score }}</p>
        <p v-if="said" class="ws-said" role="status">{{ said }}</p>
        <button v-if="world.canEdit && world.scripts && !editing" type="button" class="ws-pill ws-code" :class="{ 'is-on': coding }" :aria-pressed="coding" @click="coding = !coding">Code</button>
        <section v-if="coding" class="ws-panel ws-coder" aria-label="This space's code">
          <label class="ws-hint" for="ws-template">Start from</label>
          <select id="ws-template" class="ws-select" @change="useTemplate(($event.target as HTMLSelectElement).value); ($event.target as HTMLSelectElement).value = ''">
            <option value="">Choose a starter…</option>
            <option v-for="t in TEMPLATES" :key="t.id" :value="t.id">{{ t.title }}</option>
          </select>
          <label class="ws-hint" for="ws-code">JavaScript. <code>space.find('Chair')</code>, <code>space.on('tick', (dt) => …)</code>, <code>space.say(0)</code>.</label>
          <textarea id="ws-code" v-model="code" class="ws-text ws-mono" rows="9" spellcheck="false" autocapitalize="off" autocomplete="off" :maxlength="SCRIPT.code" />
          <label class="ws-hint" for="ws-lines">Words it may show, one a line ({1} for a number). Line 0 is the first.</label>
          <textarea id="ws-lines" v-model="lines" class="ws-text" rows="3" />
          <div class="ws-row ws-row-3">
            <button type="button" @click="runNow">Run</button>
            <button type="button" @click="stopNow">Stop</button>
            <button type="button" :disabled="scriptBusy" @click="saveCode">{{ scriptBusy ? '…' : 'Save' }}</button>
          </div>
          <p v-if="scriptError" class="ws-hint ws-bad" role="alert">{{ scriptError }}</p>
          <p class="ws-hint">Your code runs only in a sandbox on each visitor's phone: it can move your models and show your lines, nothing else.</p>
        </section>
        <button v-if="world.canEdit" type="button" class="ws-pill ws-edit" :class="{ 'is-on': editing }" :aria-pressed="editing" @click="toggleEdit">{{ editing ? 'Done' : 'Place models' }}</button>
        <section v-if="editing" class="ws-panel" aria-label="Place your models">
          <template v-if="picked">
            <p class="ws-name">{{ picked.name }}</p>
            <div class="ws-row">
              <button type="button" aria-label="Turn left" @click="turn(-15)">⟲</button>
              <button type="button" aria-label="Turn right" @click="turn(15)">⟳</button>
              <button type="button" aria-label="Smaller" @click="size(1 / 1.15)">−</button>
              <button type="button" aria-label="Bigger" @click="size(1.15)">+</button>
              <button type="button" aria-label="Lower" @click="lift(-0.1)">↓</button>
              <button type="button" aria-label="Higher" @click="lift(0.1)">↑</button>
              <button type="button" aria-label="Remove from the space" @click="remove">✕</button>
            </div>
            <label class="ws-check"><input type="checkbox" :checked="picked.loose === true" @change="setLoose(($event.target as HTMLInputElement).checked)" /> Loose: falls, rolls and can be picked up</label>
            <p class="ws-hint">Tap a floor to move it there.</p>
          </template>
          <template v-else>
            <p v-if="!world.mine.length" class="ws-hint">Upload models in Houses → My 3D models first.</p>
            <div v-else class="ws-models" role="group" aria-label="My models">
              <button v-for="m in world.mine" :key="m.id" type="button" :class="{ 'is-on': choosing?.id === m.id }" @click="choose(m)">{{ m.name }}</button>
            </div>
            <button v-if="choosing" type="button" class="ws-wide" @click="placeInFront">Put it in front of me</button>
            <p class="ws-hint">{{ choosing ? `Or tap a floor.` : 'Choose a model, or tap one in the space.' }}</p>
          </template>
          <p class="ws-hint">{{ layout.length }} of {{ world.limits.placements }} placed · {{ triangles.toLocaleString('en') }} of {{ world.limits.triangles.toLocaleString('en') }} triangles</p>
          <button type="button" class="ws-wide is-primary" :disabled="busy || !dirty" @click="save">{{ busy ? 'Saving…' : dirty ? 'Save' : 'Saved' }}</button>
        </section>
        <p v-if="note && !error" class="ws-note" role="status">{{ note }}</p>
        <p v-if="error" class="ws-note ws-error" role="alert">{{ error }}</p>
      </template>
  </dialog>
</template>

<style scoped>
.ws::backdrop { background: #000; }
.ws { position: fixed; inset: 0; width: 100%; height: 100%; max-width: none; max-height: none; margin: 0; padding: 0; border: 0; background: #a9c7de; overflow: hidden; touch-action: none; user-select: none; font-family: var(--font); }
.ws-canvas { position: absolute; inset: 0; width: 100%; height: 100%; display: block; }
.ws-top { position: absolute; top: max(8px, env(safe-area-inset-top)); left: 8px; right: 8px; display: flex; align-items: center; gap: 8px; pointer-events: none; }
.ws-top > * { pointer-events: auto; }
.ws-title { flex: 1; min-width: 0; margin: 0; font-size: 16px; color: #fff; text-shadow: 0 1px 3px rgba(0, 0, 0, 0.6); overflow: hidden; text-overflow: ellipsis; white-space: nowrap; text-align: center; }
.ws-pill { min-height: 44px; min-width: 44px; padding: 0 14px; border: 0; border-radius: 22px; background: rgba(20, 24, 28, 0.62); color: #fff; font: 600 14px var(--font); backdrop-filter: blur(6px); cursor: pointer; }
.ws-pill.is-on { background: #fff; color: #14181c; }
.ws-floor { position: absolute; top: calc(max(8px, env(safe-area-inset-top)) + 52px); left: 50%; transform: translateX(-50%); margin: 0; padding: 4px 12px; border-radius: 12px; background: rgba(20, 24, 28, 0.55); color: #fff; font-size: 13px; }
.ws-centre { position: absolute; top: 45%; left: 50%; transform: translate(-50%, -50%); margin: 0; color: #fff; font-weight: 600; text-shadow: 0 1px 3px rgba(0, 0, 0, 0.6); }
.ws-card { width: min(320px, 86vw); padding: 16px; border-radius: 16px; background: #fff; color: var(--c-ink); text-shadow: none; display: flex; flex-direction: column; gap: 12px; }
.ws-card p { margin: 0; font-weight: 400; }
.ws-stick { position: absolute; left: 18px; bottom: max(18px, env(safe-area-inset-bottom)); width: 112px; height: 112px; border-radius: 50%; background: rgba(255, 255, 255, 0.22); border: 2px solid rgba(255, 255, 255, 0.5); display: flex; align-items: center; justify-content: center; touch-action: none; }
.ws-knob { width: 48px; height: 48px; border-radius: 50%; background: rgba(255, 255, 255, 0.85); box-shadow: 0 2px 6px rgba(0, 0, 0, 0.3); pointer-events: none; }
.ws-edit { position: absolute; right: 12px; bottom: max(18px, env(safe-area-inset-bottom)); }
.ws-panel { position: absolute; right: 8px; bottom: calc(max(18px, env(safe-area-inset-bottom)) + 54px); width: min(300px, calc(100vw - 150px)); max-height: 55vh; overflow-y: auto; padding: 10px; border-radius: 16px; background: rgba(255, 255, 255, 0.94); display: flex; flex-direction: column; gap: 8px; }
.ws-name { margin: 0; font-weight: 700; font-size: 14px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.ws-row { display: grid; grid-template-columns: repeat(4, 1fr); gap: 6px; }
.ws-row button, .ws-models button { min-height: 44px; border: 0; border-radius: 10px; background: var(--c-fill, #eef0f2); color: var(--c-ink, #14181c); font: 600 16px var(--font); cursor: pointer; }
.ws-models { display: flex; flex-direction: column; gap: 6px; }
.ws-models button { font-size: 13px; text-align: left; padding: 0 10px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.ws-models button.is-on { background: #14181c; color: #fff; }
.ws-wide { min-height: 44px; border: 0; border-radius: 12px; background: var(--c-fill, #eef0f2); color: var(--c-ink, #14181c); font: 600 14px var(--font); cursor: pointer; }
.ws-wide.is-primary { background: #14181c; color: #fff; }
.ws-wide:disabled { opacity: 0.5; }
.ws-hint { margin: 0; font-size: 12px; color: #4a5560; }
.ws-score { position: absolute; top: calc(max(8px, env(safe-area-inset-top)) + 52px); right: 12px; margin: 0; padding: 6px 12px; border-radius: 14px; background: rgba(20, 24, 28, 0.7); color: #fff; font: 700 15px var(--font); }
.ws-said { position: absolute; left: 50%; top: 32%; transform: translateX(-50%); max-width: 80vw; margin: 0; padding: 10px 16px; border-radius: 16px; background: rgba(255, 255, 255, 0.92); color: #14181c; font: 600 16px var(--font); text-align: center; box-shadow: 0 4px 14px rgba(0, 0, 0, 0.25); }
.ws-code { position: absolute; right: 12px; top: calc(max(8px, env(safe-area-inset-top)) + 96px); }
.ws-coder { top: calc(max(8px, env(safe-area-inset-top)) + 148px); bottom: auto; max-height: calc(100vh - 340px); width: min(340px, calc(100vw - 24px)); }
.ws-select, .ws-text { width: 100%; box-sizing: border-box; border: 1px solid #c9d0d6; border-radius: 10px; padding: 8px; font: 14px var(--font); color: #14181c; background: #fff; }
.ws-select { min-height: 44px; }
.ws-mono { font: 12px/1.45 ui-monospace, SFMono-Regular, Menlo, monospace; white-space: pre; overflow-x: auto; }
.ws-row-3 { grid-template-columns: repeat(3, 1fr); }
.ws-bad { color: #a1281d; font-weight: 600; }
.ws-check { display: flex; align-items: center; gap: 8px; min-height: 44px; font-size: 13px; }
.ws-check input { width: 20px; height: 20px; flex-shrink: 0; }
.ws-acts { position: absolute; right: 12px; bottom: calc(max(18px, env(safe-area-inset-bottom)) + 54px); display: flex; flex-direction: column; align-items: flex-end; gap: 8px; }
.ws-note { position: absolute; left: 50%; top: calc(max(8px, env(safe-area-inset-top)) + 92px); transform: translateX(-50%); width: max-content; max-width: 86vw; margin: 0; padding: 8px 12px; border-radius: 12px; background: rgba(20, 24, 28, 0.72); color: #fff; font-size: 13px; }
.ws-error { background: #a1281d; }
</style>
