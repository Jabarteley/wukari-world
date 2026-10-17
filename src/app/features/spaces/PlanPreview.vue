<script setup lang="ts">
// A flat top-down drawing of a space plan: rooms, stairs, door, window and every piece as its icon. Drawn once per change on a
// canvas sized to the container; no animation loop, no 3D.
import { onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { FURNITURE } from '../../../game/content/furniture.ts'
import { doorSlot, footprint, windowSlot } from '../../../game/home-layout.ts'
import { planOf } from '../../../game/home-plan.ts'
import type { Plot } from '../../../game/home-layout.ts'
import type { SpacePlanV1 } from '../../../spaces/plan.ts'

const props = defineProps<{ plan: SpacePlanV1; plot: Plot; floor: number }>()
const canvas = ref<HTMLCanvasElement | null>(null)
const box = ref<HTMLElement | null>(null)
const MAX = 440
let observer: ResizeObserver | null = null
let lastWidth = 0

function draw(): void {
  const node = canvas.value, holder = box.value
  if (!node || !holder) return
  const plot = props.plot
  const width = Math.max(200, Math.min(MAX, Math.floor(holder.clientWidth || MAX)))
  const cell = width / plot.w
  const height = Math.round(cell * plot.d)
  const dpr = Math.min(3, globalThis.devicePixelRatio || 1)
  node.width = Math.round(width * dpr); node.height = Math.round(height * dpr)
  node.style.width = `${width}px`; node.style.height = `${height}px`
  const ctx = node.getContext('2d')
  if (!ctx) return
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
  ctx.clearRect(0, 0, width, height)
  ctx.fillStyle = '#f4efe6'; ctx.fillRect(0, 0, width, height)
  const plan = planOf(plot)
  const rooms = plan.floors[props.floor] ?? plan.floors[0] ?? []
  // Rooms
  ctx.lineWidth = 1.5; ctx.strokeStyle = '#8a7f6c'
  rooms.forEach((room, i) => {
    ctx.fillStyle = i % 2 ? '#efe8da' : '#f8f4ec'
    ctx.fillRect(room.x * cell, room.y * cell, room.w * cell, room.h * cell)
  })
  // Faint grid
  ctx.strokeStyle = 'rgba(0,0,0,0.05)'; ctx.lineWidth = 1
  ctx.beginPath()
  for (let x = 0; x <= plot.w; x++) { ctx.moveTo(x * cell, 0); ctx.lineTo(x * cell, height) }
  for (let y = 0; y <= plot.d; y++) { ctx.moveTo(0, y * cell); ctx.lineTo(width, y * cell) }
  ctx.stroke()
  ctx.strokeStyle = '#8a7f6c'; ctx.lineWidth = 1.5
  for (const room of rooms) ctx.strokeRect(room.x * cell, room.y * cell, room.w * cell, room.h * cell)
  // Stairs, hatched
  for (const flight of plan.stairs) {
    if (flight.floor !== props.floor && flight.floor !== props.floor - 1) continue
    const sx = flight.x * cell, sy = flight.y * cell, sw = flight.w * cell, sh = flight.h * cell
    ctx.save(); ctx.beginPath(); ctx.rect(sx, sy, sw, sh); ctx.clip()
    ctx.fillStyle = 'rgba(120,100,70,0.18)'; ctx.fillRect(sx, sy, sw, sh)
    ctx.strokeStyle = 'rgba(90,70,40,0.55)'; ctx.lineWidth = 1
    ctx.beginPath()
    for (let o = -sh; o < sw; o += Math.max(4, cell * 0.4)) { ctx.moveTo(sx + o, sy + sh); ctx.lineTo(sx + o + sh, sy) }
    ctx.stroke(); ctx.restore()
    ctx.strokeStyle = '#8a7f6c'; ctx.lineWidth = 1; ctx.strokeRect(sx, sy, sw, sh)
  }
  // Room labels
  const labelSize = 10
  ctx.font = `600 ${labelSize}px system-ui, sans-serif`; ctx.textBaseline = 'top'; ctx.fillStyle = 'rgba(70,60,45,0.7)'
  for (const room of rooms) {
    if (room.w * cell < 36 || room.h * cell < 16) continue
    ctx.save(); ctx.beginPath(); ctx.rect(room.x * cell, room.y * cell, room.w * cell, room.h * cell); ctx.clip()
    ctx.fillText(room.label, room.x * cell + 4, room.y * cell + 3)
    ctx.restore()
  }
  // Door (left edge) and window (top edge)
  ctx.lineCap = 'round'; ctx.lineWidth = 4
  ctx.strokeStyle = '#a0652a'
  ctx.beginPath(); ctx.moveTo(1.5, doorSlot(plot.grid) * cell + 2); ctx.lineTo(1.5, (doorSlot(plot.grid) + 1) * cell - 2); ctx.stroke()
  ctx.strokeStyle = '#3b9ad9'
  ctx.beginPath(); ctx.moveTo(windowSlot(plot.grid) * cell + 2, 1.5); ctx.lineTo((windowSlot(plot.grid) + 1) * cell - 2, 1.5); ctx.stroke()
  // Pieces
  ctx.textAlign = 'center'; ctx.textBaseline = 'middle'
  for (const item of props.plan.items) {
    if ((item.floor ?? 0) !== props.floor) continue
    const def = FURNITURE[item.itemId]
    if (!def) continue
    if (def.wall) {
      const size = Math.min(cell, 22)
      const cx = item.rot === 1 ? size / 2 + 2 : (item.x + 0.5) * cell
      const cy = item.rot === 1 ? (item.y + 0.5) * cell : size / 2 + 2
      ctx.fillStyle = def.color; ctx.globalAlpha = 0.85
      ctx.beginPath(); ctx.roundRect(cx - size / 2, cy - size / 2, size, size, 4); ctx.fill(); ctx.globalAlpha = 1
      ctx.font = `${Math.round(size * 0.7)}px system-ui, "Apple Color Emoji", "Segoe UI Emoji", sans-serif`
      ctx.fillStyle = '#000'; ctx.fillText(def.icon, cx, cy + 1)
      continue
    }
    const fp = footprint(def, item.rot)
    const x = item.x * cell + 1, y = item.y * cell + 1, w = fp.w * cell - 2, h = fp.h * cell - 2
    ctx.globalAlpha = 0.85; ctx.fillStyle = def.color
    ctx.beginPath(); ctx.roundRect(x, y, w, h, Math.min(6, cell * 0.3)); ctx.fill(); ctx.globalAlpha = 1
    ctx.strokeStyle = 'rgba(0,0,0,0.25)'; ctx.lineWidth = 1; ctx.stroke()
    const size = Math.max(8, Math.min(cell * 0.8, Math.min(w, h) * 0.8, 28))
    ctx.font = `${Math.round(size)}px system-ui, "Apple Color Emoji", "Segoe UI Emoji", sans-serif`
    ctx.fillStyle = '#000'; ctx.fillText(def.icon, x + w / 2, y + h / 2 + 1)
  }
  lastWidth = width
}

onMounted(() => {
  draw()
  if (box.value && typeof ResizeObserver !== 'undefined') {
    observer = new ResizeObserver(() => { const w = Math.floor(box.value?.clientWidth ?? 0); if (w && w !== lastWidth) draw() })
    observer.observe(box.value)
  }
})
onBeforeUnmount(() => observer?.disconnect())
watch(() => [props.plan, props.plot, props.floor], draw, { flush: 'post' })
</script>

<template>
  <div ref="box" class="sp-preview">
    <canvas ref="canvas" role="img" :aria-label="`Top-down drawing of your plan, ${plan.items.length} pieces`" />
  </div>
</template>

<style scoped>
.sp-preview { width: 100%; max-width: 440px; margin: 0 auto; }
.sp-preview canvas { display: block; border-radius: 10px; border: 1px solid var(--c-line); max-width: 100%; }
</style>
