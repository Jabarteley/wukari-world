<script setup lang="ts">
// "Connect an AI agent": what it is, and two choices shown as cards. Each card's button asks the page to start the game and open Settings at the
// AI agents section (where the key is made, copied and revoked); the card's `controls-<id>` slot can still carry other controls. A link goes to the
// public Agent league. Nothing here talks to a server. The same words are in docs/AGENTS.md.
import { nextTick, onBeforeUnmount, onMounted, ref } from 'vue'
import { AGENT_CHOICES, AGENT_DOCS_URL, AGENT_LEAGUE_PATH, AGENT_WORDS } from './entryModel.ts'

const emit = defineEmits<{ close: []; choose: [id: 'mine' | 'own'] }>()
const sheet = ref<HTMLElement | null>(null)
const closer = ref<HTMLButtonElement | null>(null)
let before: Element | null = null

function onKey(event: KeyboardEvent): void {
  if (event.key === 'Escape') { event.preventDefault(); event.stopPropagation(); emit('close'); return }
  if (event.key !== 'Tab' || !sheet.value) return
  const items = [...sheet.value.querySelectorAll<HTMLElement>('a[href], button:not([disabled])')]
  const first = items[0], last = items[items.length - 1]
  if (!first || !last) return
  const active = document.activeElement
  if (event.shiftKey && active === first) { event.preventDefault(); last.focus() } else if (!event.shiftKey && active === last) { event.preventDefault(); first.focus() }
}
onMounted(() => { before = document.activeElement; window.addEventListener('keydown', onKey, true); void nextTick(() => closer.value?.focus()) })
onBeforeUnmount(() => { window.removeEventListener('keydown', onKey, true); if (before instanceof HTMLElement) before.focus({ preventScroll: true }) })
</script>

<template>
  <div class="ag-scrim" data-agent-sheet @click.self="emit('close')">
    <section ref="sheet" class="ag-sheet" role="dialog" aria-modal="true" aria-labelledby="ag-title">
      <header class="ag-head">
        <h2 id="ag-title">{{ AGENT_WORDS.title }}</h2>
        <button ref="closer" type="button" class="ag-close" :aria-label="AGENT_WORDS.close" data-key="agent-close" @click="emit('close')"><svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true"><path d="M6 6l12 12M18 6L6 18" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" /></svg></button>
      </header>
      <div class="ag-body">
        <p>{{ AGENT_WORDS.intro }}</p>
        <ul class="ag-rules"><li v-for="rule in AGENT_WORDS.rules" :key="rule">{{ rule }}</li></ul>
        <div class="ag-cards">
          <article v-for="choice in AGENT_CHOICES" :key="choice.id" class="ag-card" :data-agent-choice="choice.id">
            <h3>{{ choice.title }}</h3>
            <p>{{ choice.text }}</p>
            <slot :name="`controls-${choice.id}`" :choice="choice"><button type="button" class="ag-go" :data-key="`agent-${choice.id}`" :data-agent-go="choice.id" @click="emit('choose', choice.id)">{{ AGENT_WORDS.start }}</button></slot>
          </article>
        </div>
        <p class="ag-note">{{ AGENT_WORDS.startText }}</p>
        <a class="ag-docs" :href="AGENT_LEAGUE_PATH" data-agent-league>{{ AGENT_WORDS.league }}</a>
        <a class="ag-docs" :href="AGENT_DOCS_URL" target="_blank" rel="noopener noreferrer" data-agent-docs>{{ AGENT_WORDS.docs }}</a>
      </div>
    </section>
  </div>
</template>

<style scoped>
.ag-scrim { position: absolute; inset: 0; z-index: 5; display: grid; place-items: center; padding: 16px; background: #0b1a13b8; }
.ag-sheet { display: flex; flex-direction: column; width: min(100%, 36rem); max-height: 100%; overflow: hidden; border-radius: 24px; background: #fff; color: var(--c-ink); box-shadow: 0 24px 70px #000a; font-size: 15px; line-height: 1.45; }
.ag-head { display: flex; align-items: center; justify-content: space-between; gap: 12px; padding: 16px 12px 8px 20px; }
h2 { margin: 0; font-size: 20px; letter-spacing: -.3px; }
.ag-close { display: grid; place-items: center; width: var(--tap); height: var(--tap); border: 0; border-radius: 50%; background: var(--c-fill); color: var(--c-ink); cursor: pointer; }
.ag-close:focus-visible, .ag-docs:focus-visible { outline: var(--focus); outline-offset: 2px; }
.ag-body { display: flex; flex-direction: column; gap: 12px; overflow-y: auto; overscroll-behavior: contain; padding: 4px 20px max(20px, env(safe-area-inset-bottom)); }
.ag-body > p, .ag-rules, .ag-card h3, .ag-card p { margin: 0; }
.ag-rules { padding-left: 20px; color: var(--c-ink-2); }
.ag-cards { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; }
.ag-card { display: flex; flex-direction: column; align-items: flex-start; gap: 8px; padding: 14px; border: 1px solid var(--c-line); border-radius: 16px; background: var(--c-canvas); }
.ag-card h3 { font-size: 15px; line-height: 1.25; }
.ag-card p { color: var(--c-ink-2); font-size: 13.5px; }
.ag-go { margin-top: auto; min-height: var(--tap); padding: 0 16px; border: 0; border-radius: var(--r-pill); background: var(--c-green-dark); color: #fff; font: inherit; font-weight: 800; cursor: pointer; }
.ag-go:focus-visible { outline: var(--focus); outline-offset: 2px; }
.ag-note { color: var(--c-muted); font-size: 13.5px; }
.ag-docs { display: inline-flex; align-items: center; align-self: flex-start; min-height: var(--tap); color: var(--c-green-dark); font-weight: 700; text-decoration: underline; text-underline-offset: 3px; }
@media (max-width: 600px) {
  .ag-scrim { place-items: end center; padding: 0; }
  .ag-sheet { width: 100%; max-height: 92%; border-radius: 24px 24px 0 0; }
  .ag-cards { grid-template-columns: 1fr; }
}
</style>
