<script setup lang="ts">
// Earn for the admins (server/routes/earn-admin.ts): this month's direct sales and Allworld's fees, and the creator pool month by month.
// Only the founder sends a payable month: one Bachs transfer per creator with a ready payout account, never twice. Audited.
import { onMounted, ref } from 'vue'
import { useAdmin } from './useAdmin.ts'
import { recordDone } from './adminUi.ts'
import type { EarnAdmin } from '../../../types/earn.ts'

const emit = defineEmits<{ player: [id: string] }>()
const api = useAdmin()
const data = ref<Omit<EarnAdmin, 'ok'> | null>(null), error = ref(''), busy = ref(false)
const naira = (n: number): string => `₦${n.toLocaleString('en-NG')}`
const day = (ms: number): string => new Date(ms).toISOString().slice(0, 10)
async function load(): Promise<void> {
  const r = await api.get<Omit<EarnAdmin, 'ok'>>('/api/admin/earn')
  if (r.ok) { data.value = r.data; error.value = '' } else error.value = r.error.reason
}
onMounted(load)
async function pay(month: string, total: number): Promise<void> {
  if (!confirm(`Send the creator pool for ${month} (${naira(total)}) from Allworld's Bachs balance? Transfers cannot be undone.`)) return
  busy.value = true
  const r = await api.post<{ paid: number; waiting: number }>('/api/admin/earn/pay', { month }, `earn-pay:${month}`)
  busy.value = false
  recordDone(r.ok ? `Sent ${r.data.paid}; ${r.data.waiting} still waiting for a payout account` : r.error.reason, r.ok)
  await load()
}
</script>

<template>
  <div class="adm-card" data-admin="earn">
    <div class="adm-row adm-between"><h3>Earn</h3><button class="adm-btn" type="button" @click="load">Refresh</button></div>
    <p v-if="error" class="adm-error" role="alert">{{ error }}</p>
    <template v-if="data">
      <p class="adm-sub"><template v-if="!data.open">Not open: needs the BACHS_API_KEY secret and the Earn setting. </template><template v-if="data.sandbox">Bachs test mode. </template>This month: {{ data.sales.count }} ticket and gig payments, {{ naira(data.sales.month) }} paid to players, {{ naira(data.sales.fees) }} Allworld fees.</p>
      <h4>Creator pool</h4>
      <p v-if="!data.months.length" class="adm-muted">No points yet.</p>
      <div v-for="m in data.months" :key="m.month" class="adm-line" style="display:block">
        <b>{{ m.month }}</b> · revenue {{ naira(m.revenue) }} · pool {{ naira(m.pot) }} · {{ m.closedAt ? (m.payable ? 'payable' : `held until ${day(m.payableAt)}`) : 'counting (estimate)' }}
        <button v-if="m.payable && m.creators.some((c) => c.ready && !c.paid)" class="adm-btn" type="button" :disabled="busy" @click="pay(m.month, m.creators.filter((c) => c.ready && !c.paid).reduce((n, c) => n + c.amount, 0))">Send</button>
        <p v-for="c in m.creators.slice(0, 40)" :key="c.id" class="adm-line"><span>{{ c.name }} · {{ naira(c.amount) }} · {{ c.paid ? `sent (${c.paid.status})` : c.ready ? 'ready' : 'no payout account yet' }}</span><button class="adm-btn" type="button" @click="emit('player', c.id)">Player</button></p>
      </div>
    </template>
  </div>
</template>
