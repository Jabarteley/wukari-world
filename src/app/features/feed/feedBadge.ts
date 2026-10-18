// The Feed app's badge: how many lines of its inbox are unread. Tiny and eager on purpose (the register reads it); everything else of the
// feed is fetched when the app opens. The count comes from GET /api/feed/me and from `feed-inbox` frames on the social socket; the open
// Feed app watches it to read the new line.
import { ref } from 'vue'
import { onCallFrame } from '../social/useSocial.ts'

export const feedUnseen = ref(0)
onCallFrame((frame) => { if (frame.type === 'feed-inbox') feedUnseen.value = Number((frame as { unseen?: unknown }).unseen) || 0 })
