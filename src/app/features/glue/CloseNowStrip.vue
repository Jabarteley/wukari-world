<script setup lang="ts">
// Messages' strip of close friends who are somewhere now (docs/SOCIAL-GLUE.md): one tap opens the chat. Shows nothing when nobody shares.
import { onMounted } from 'vue'
import { useApp } from '../../state/app.ts'
import { glue, loadNow } from './glueStore.ts'

const { shell } = useApp()
onMounted(() => { void loadNow() })
</script>

<template>
  <div v-if="glue.now.length" class="glue-strip" data-glue="close-strip" aria-label="Close friends now">
    <button v-for="line in glue.now" :key="line.id" type="button" class="social-btn" @click="shell.open('messages', { to: line.id, name: line.name })">{{ line.line }}</button>
  </div>
</template>

<style scoped>
.glue-strip { display: flex; gap: 6px; overflow-x: auto; padding: 4px 0 8px; }
.glue-strip .social-btn { white-space: nowrap; }
</style>
