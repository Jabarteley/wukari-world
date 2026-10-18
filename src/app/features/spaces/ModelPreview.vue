<script setup lang="ts">
// One model in the realistic look (src/spaces/world/look.ts): image-based light, a sun with soft shadows, filmic tone mapping.
// Drag to turn it, pinch or scroll to come closer. Its animations play. Lazy: three loads only when this is shown.
import { onBeforeUnmount, onMounted, ref, watch } from 'vue'

const props = defineProps<{ bytes: ArrayBuffer | null }>()
const emit = defineEmits<{ failed: [reason: string] }>()
const canvas = ref<HTMLCanvasElement | null>(null)
const status = ref('Loading 3D…')
let stop: (() => void) | null = null
let showing: ((bytes: ArrayBuffer) => Promise<void>) | null = null
let gone = false

onMounted(async () => {
  const { createLook, parseModel, shadowFloor, disposeTree, aimSun, orbit, THREE } = await import('../../../spaces/world/look.ts')
  if (gone || !canvas.value) return
  const element = canvas.value
  const look = createLook(element, { quality: 'normal', background: '#dde3e8' })
  const camera = new THREE.PerspectiveCamera(40, 1, 0.05, 200)
  let spinning = true
  const controls = orbit(camera, element, new THREE.Vector3(), { onStart: () => { spinning = false } })
  const floor = shadowFloor(4)
  look.scene.add(floor)
  let current: InstanceType<typeof THREE.Group> | null = null
  let mixer: InstanceType<typeof THREE.AnimationMixer> | null = null
  const clock = new THREE.Clock()
  const resize = (): void => {
    const w = element.clientWidth || 300, h = element.clientHeight || 240
    look.renderer.setSize(w, h, false)
    camera.aspect = w / h
    camera.updateProjectionMatrix()
  }
  const observer = new ResizeObserver(resize)
  observer.observe(element)
  resize()
  let frame = 0
  const tick = (): void => {
    frame = requestAnimationFrame(tick)
    const dt = Math.min(clock.getDelta(), 0.1)
    mixer?.update(dt)
    if (spinning) controls.spin(dt * 0.25)
    look.renderer.render(look.scene, camera)
  }
  tick()
  showing = async (bytes: ArrayBuffer): Promise<void> => {
    status.value = 'Loading 3D…'
    try {
      const model = await parseModel(bytes.slice(0), look.renderer.capabilities.getMaxAnisotropy())
      if (gone) { disposeTree(model.root); return }
      if (current) { look.scene.remove(current); disposeTree(current) }
      current = model.root
      look.scene.add(current)
      mixer = null
      if (model.clips.length) { mixer = new THREE.AnimationMixer(current); mixer.clipAction(model.clips[0]!).play() }
      const radius = Math.max(model.size.x, model.size.y, model.size.z, 0.2)
      floor.scale.setScalar(Math.max(1, radius / 3))
      aimSun(look, new THREE.Vector3(0, model.size.y / 2, 0), radius * 1.2)
      camera.near = radius / 100; camera.far = radius * 50
      camera.updateProjectionMatrix()
      // Far enough that the whole model fits the view.
      controls.frame(new THREE.Vector3(0, model.size.y / 2, 0), (radius / 2) / Math.tan((camera.fov * Math.PI) / 360) * 1.25, radius * 0.4, radius * 6)
      status.value = ''
    } catch {
      status.value = ''
      emit('failed', 'This model could not be drawn. Export it again as .glb and try once more.')
    }
  }
  stop = () => { cancelAnimationFrame(frame); observer.disconnect(); controls.dispose(); look.dispose() }
  if (props.bytes) await showing(props.bytes)
})
watch(() => props.bytes, (bytes) => { if (bytes && showing) void showing(bytes) })
onBeforeUnmount(() => { gone = true; stop?.() })
</script>

<template>
  <div class="mp">
    <canvas ref="canvas" class="mp-canvas" aria-label="The model in 3D. Drag to turn it." />
    <p v-if="status" class="mp-status" role="status">{{ status }}</p>
  </div>
</template>

<style scoped>
.mp { position: relative; flex-shrink: 0; width: 100%; aspect-ratio: 4 / 3; border-radius: 14px; overflow: hidden; background: #dde3e8; }
.mp-canvas { display: block; width: 100%; height: 100%; touch-action: none; }
.mp-status { position: absolute; inset: auto 0 10px; margin: 0; text-align: center; font-size: 13px; color: var(--c-ink-2); }
</style>
