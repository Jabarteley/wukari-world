<script setup lang="ts">
import { onBeforeUnmount, onMounted, ref } from 'vue';
import type { Dataset } from '../geography.ts';
import { createPreview } from './scene.ts';

const host = ref<HTMLDivElement>();
const data = ref<Dataset>();
const error = ref('');
let dispose: (() => void) | undefined;
let mounted = true;
onMounted(async () => {
  try {
    const response = await fetch('/dataset.json');
    if (!response.ok) throw new Error(await response.text());
    const dataset: Dataset = await response.json();
    if (!mounted || !host.value) return;
    data.value = dataset;
    dispose = createPreview(host.value, dataset);
  } catch (e) { if (mounted) error.value = e instanceof Error ? e.message : String(e); }
});
onBeforeUnmount(() => { mounted = false; dispose?.(); });
</script>

<template>
  <main>
    <header>
      <h1>Wukari Life · geography lab</h1>
      <strong>{{ data?.disclaimer ?? 'DEVELOPMENT ONLY — loading local dataset' }}</strong>
      <p>Unofficial community project. No Federal University Wukari endorsement.</p>
      <p v-if="data">LGA: {{ data.extents.lga.status }} · Town extent: unknown · Campus: {{ data.extents.campus.status }}.<br>
        {{ data.coverage.renderableWays }} complete ways; {{ data.coverage.omittedWays }} incomplete ways omitted; {{ data.coverage.relations }} relations retained but not drawn.</p>
      <p>Drag to orbit · scroll to zoom. Orange: campus candidate; green: LGA outline; blue: paths/roads; grey: flat building footprints. Heights, terrain and road widths are unknown. This is a data inspection scene, with no multiplayer or player spawn.</p>
      <p v-if="error" role="alert">{{ error }}</p>
    </header>
    <div ref="host" class="scene" aria-label="Development geographic data inspection scene"></div>
    <footer>
      <template v-if="data?.mode === 'source-data'">© <a href="https://www.openstreetmap.org/copyright">OpenStreetMap contributors · ODbL 1.0</a> · geoBoundaries gbOpen / GRID3 / William &amp; Mary geoLab, release 9469f09 · <a href="https://creativecommons.org/licenses/by/4.0/">CC BY 4.0</a>. Selected and projected for display.</template>
      <template v-else>Synthetic test fixture only. No Wukari geographic data displayed.</template>
      <br>Code: AGPL-3.0-or-later · <a href="https://github.com/Jabarteley/wukari-world">Wukari Life source</a> · based on <a href="https://github.com/kromate/joinallworld">Allworld</a>.
    </footer>
  </main>
</template>

<style>
* { box-sizing: border-box; } body { margin: 0; background: #0e1820; color: #edf2f5; font: 15px/1.45 system-ui, sans-serif; } main { display: flex; flex-direction: column; min-height: 100vh; } header, footer { padding: 16px 24px; } h1 { font-size: 23px; margin: 0 0 10px; } strong { display: block; padding: 10px; color: #241700; background: #ffd37b; } p { margin: 8px 0; max-width: 1000px; } .scene { height: 60vh; min-height: 300px; } canvas { display: block; width: 100%; height: 100%; } a { color: #9bd9ff; } [role=alert] { color: #ffb4a8; }
</style>
