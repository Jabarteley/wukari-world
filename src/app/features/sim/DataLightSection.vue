<script setup lang="ts">
// The "Data and battery" section of Settings: the Light mode switch (src/lightMode.ts) and the data meter line (src/app/state/dataMeter.ts).
// Both are device-only: nothing is sent to the server. The meter is started when the game is ready; opening this section starts it too, so the
// line is never empty, and it counts up while the section is open.
import { computed, onBeforeUnmount, onMounted, ref } from 'vue'
import { lightChosen, lightOn, onLightChange } from '../../../lightControl.ts'
import { startMeter, usedLine } from '../../state/dataMeter.ts'
import { DATA_NOTE, LIGHT_AUTO_HINT, LIGHT_HINT, LIGHT_LABEL, LIGHT_NOT_SAVED, applyLight } from './lightSettingsModel.ts'

const light = ref(lightOn())
const warning = ref('')
const meter = startMeter()
const bytes = ref({ session: meter.session(), today: meter.today() })
const line = computed(() => usedLine(bytes.value.session, bytes.value.today))
const store = (): Storage | null => { try { return globalThis.localStorage ?? null } catch { return null } }
const chosen = ref(lightChosen(store()))
const automatic = computed(() => light.value && !chosen.value)
const refresh = (): void => { bytes.value = { session: meter.session(), today: meter.today() } }
const stopLight = onLightChange(() => { light.value = lightOn(); chosen.value = lightChosen(store()) })
let stopMeter: (() => void) | null = null
onMounted(() => { refresh(); stopMeter = meter.subscribe(refresh) })
onBeforeUnmount(() => { stopLight(); stopMeter?.() })
function toggle(on: boolean): void { warning.value = applyLight(on) ? '' : LIGHT_NOT_SAVED }
</script>

<template>
  <h3 class="ui-section" data-section="data">Data and battery</h3>
  <div class="ui-rows">
    <label class="ui-row settings-row"><span class="ui-row-body"><b>{{ LIGHT_LABEL }}</b><small>{{ LIGHT_HINT }}{{ automatic ? ' ' + LIGHT_AUTO_HINT : '' }}</small></span>
      <span class="settings-state">{{ light ? 'On' : 'Off' }}</span><input type="checkbox" role="switch" :checked="light" :aria-label="LIGHT_LABEL" data-light-mode @change="toggle(($event.target as HTMLInputElement).checked)"><i class="ui-switch" aria-hidden="true" /></label>
    <div class="ui-row" data-data-used role="status"><span class="ui-row-body"><b>{{ line }}</b><small>{{ DATA_NOTE }}</small></span></div>
  </div>
  <p v-if="warning" class="ui-error" role="alert">{{ warning }}</p>
</template>
