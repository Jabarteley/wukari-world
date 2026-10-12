<script setup lang="ts">
// The "E-mail" rows of Settings: whether e-mails about the character are on, whether a Stay in touch address is confirmed,
// and the date of the last e-mail. Read-only; the button opens Stay in touch, where everything is changed.
import { computed } from 'vue'
import { useApp } from '../../state/app.ts'
import GameIcon from '../../ui/GameIcon.vue'
import { useAccountLite } from '../account/useAccountLite.ts'
import { MAIL_GUEST_LINE, mailRowKind, mailStatus } from './mailStatusModel.ts'
import { useGrowth } from './useGrowth.ts'

const { shell } = useApp()
const growth = useGrowth()
const account = useAccountLite()
const kind = computed(() => mailRowKind(account.state))
const status = computed(() => mailStatus(growth.state.hello?.contact))
</script>

<template>
  <template v-if="kind === 'row'">
    <h3 class="ui-section">E-mail</h3>
    <div class="ui-rows" data-mail-status>
      <div class="ui-row"><span class="ui-row-body"><b>E-mails about your character</b><small>{{ status?.character ?? '…' }}</small></span></div>
      <div class="ui-row"><span class="ui-row-body"><b>Stay in touch address</b><small>{{ status?.address ?? '…' }}</small></span></div>
      <div class="ui-row"><span class="ui-row-body"><b>Last e-mail sent to you</b><small>{{ status?.last ?? '…' }}</small></span></div>
      <button type="button" class="ui-row" data-mail-open @click="shell.open('touch')"><span class="ui-row-body"><b>Open Stay in touch</b><small>Change these there</small></span><span class="ui-row-end"><GameIcon inline name="chevron" /></span></button>
    </div>
  </template>
  <p v-else-if="kind === 'guest'" class="settings-note" data-mail-guest>{{ MAIL_GUEST_LINE }}</p>
</template>
