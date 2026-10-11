// Opens the 3D shop over the game. The room is its own small Vue app in its own element on the page, so the game's shell carries nothing
// of it: whoever opens a shop (the landing of a shop link, the Services app, My shop) fetches this file, and this file fetches the room.
import { createApp as createVue, h } from 'vue'
import ShopInside from './ShopInside.vue'
import type { RoomRequest } from './roomModel.ts'

let open: { close(): void } | null = null

/** Show the shop. `back` runs after the visitor leaves: it takes them back to where they came from (the Services app, for one). */
export function openShopRoom(request: RoomRequest, options: { back?: () => void } = {}): void {
  open?.close()
  const element = document.createElement('div')
  element.setAttribute('data-shop-room', '')
  document.body.append(element)
  const app = createVue({ render: () => h(ShopInside, { request, onClose: leave }) })
  const handle = { close(): void { if (open !== handle) return; open = null; app.unmount(); element.remove() } }
  function leave(): void { handle.close(); options.back?.() }
  open = handle
  app.mount(element)
}
export const closeShopRoom = (): void => open?.close()
export const shopRoomOpen = (): boolean => open !== null
