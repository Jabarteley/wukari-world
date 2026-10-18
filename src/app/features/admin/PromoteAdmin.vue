<script setup lang="ts">
// Allworld for Business for the admins (server/routes/promote-admin.ts): revenue, boost orders (mark a bank transfer paid, cancel), and
// listings (approve one the reviewer could not decide, remove one, restore it). Every change is in the audit log.
import { onMounted, ref } from 'vue'
import { useAdmin } from './useAdmin.ts'
import { relative } from './adminModel.ts'
import { recordDone } from './adminUi.ts'

interface Order { id: string; listingName: string; tier: string; weeks: number; amount: number; status: string; at: number; ref: string; by?: string; ownerName: string; arcon: string; shown: number; note: string }
interface Listing { id: string; name: string; categoryLabel: string; cityName: string; status: string; reason: string; contacts: number; tries: number; owner: { id: string; name: string } }
const emit = defineEmits<{ player: [id: string] }>()
const api = useAdmin()
const orders = ref<Order[]>([]), listings = ref<Listing[]>([]), revenue = ref({ month: 0, all: 0 }), error = ref('')
const naira = (n: number): string => `₦${n.toLocaleString('en-NG')}`
async function load(): Promise<void> {
  const r = await api.get<{ orders: Order[]; listings: Listing[]; revenue: { month: number; all: number } }>('/api/admin/promote')
  if (r.ok) { orders.value = r.data.orders; listings.value = r.data.listings; revenue.value = r.data.revenue; error.value = '' } else error.value = r.error.reason
}
onMounted(load)
async function act(body: Record<string, unknown>, done: string): Promise<void> {
  const r = await api.post('/api/admin/promote/act', body, `promote:${JSON.stringify(body)}`)
  recordDone(r.ok ? done : r.error.reason, r.ok)
  if (r.ok) await load()
}
</script>

<template>
  <div class="adm-card" data-admin="promote">
    <div class="adm-row adm-between"><h3>Businesses</h3><button class="adm-btn" type="button" @click="load">Refresh</button></div>
    <p class="adm-sub">Revenue this month {{ naira(revenue.month) }} · in all {{ naira(revenue.all) }}. Card payments start themselves; a bank transfer needs Mark paid once it is in the account.</p>
    <p v-if="error" class="adm-error" role="alert">{{ error }}</p>
    <h4>Boost orders</h4>
    <p v-if="!orders.length" class="adm-muted">No orders yet.</p>
    <p v-for="o in orders.slice(0, 50)" :key="o.id" class="adm-line"><span><b>{{ o.listingName }}</b> · {{ o.tier }} × {{ o.weeks }} · {{ naira(o.amount) }} · {{ o.status }}<template v-if="o.by"> ({{ o.by }})</template> · {{ o.ownerName }} · {{ relative(o.at, Date.now()) }}<br><small class="adm-muted">Reference {{ o.ref }}<template v-if="o.arcon"> · ARCON {{ o.arcon }}</template> · shown {{ o.shown }} times<template v-if="o.note"> · {{ o.note }}</template></small></span>
      <button v-if="o.status === 'pending'" class="adm-btn" type="button" @click="act({ order: o.id, action: 'paid' }, 'Marked paid: the boost is running')">Mark paid</button>
      <button v-if="o.status === 'pending' || o.status === 'paid'" class="adm-btn" type="button" @click="act({ order: o.id, action: 'cancel' }, 'Order stopped')">Cancel</button></p>
    <h4>Listings</h4>
    <p v-if="!listings.length" class="adm-muted">No listings yet.</p>
    <p v-for="l in listings.slice(0, 80)" :key="l.id" class="adm-line"><span><b>{{ l.name }}</b> · {{ l.categoryLabel }} · {{ l.cityName }} · {{ l.status }}<template v-if="l.tries"> (reviewer had no answer {{ l.tries }}×)</template> · {{ l.contacts }} opened<br><small v-if="l.reason" class="adm-muted">{{ l.reason }}</small></span>
      <button class="adm-btn" type="button" @click="emit('player', l.owner.id)">Owner</button>
      <button v-if="l.status !== 'live'" class="adm-btn" type="button" @click="act({ listing: l.id, action: 'approve' }, 'Listing is live')">Approve</button>
      <button v-if="l.status === 'live'" class="adm-btn" type="button" @click="act({ listing: l.id, action: 'remove', note: 'Removed by Allworld.' }, 'Listing removed')">Remove</button></p>
  </div>
</template>
