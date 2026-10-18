/**
 * OWNER: spaces
 * TOGETHER IN A SPACE, the page's side (docs/SPACES-3D.md, phase 5; server/ws/spaces.ts). The 3D screen opens a socket of its own
 * while it is on screen (as the real-time games do: src/arena/client.ts), joins the space and sends one small tick at most
 * SPACE_HZ times a second, only when something changed: where the walker is, and from the host the models, the score and a line.
 * Every player has 600 socket frames a minute in all, so one combined tick it is.
 */
import type { SpacePeerFrame, SpaceRoomFrame } from '../../types/spaces.ts'

export const SPACE_HZ = 6

export interface TogetherListener {
  room(frame: SpaceRoomFrame): void
  peer(frame: SpacePeerFrame): void
  problem(reason: string): void
}
export interface Together { send(tick: { p: number[]; o?: number[][]; s?: number; say?: number[] }): void; leave(): void }

export function joinTogether(where: { target: 'home' | 'room'; host?: string; id?: string }, listener: TogetherListener): Together {
  let socket: WebSocket | null = null, left = false, retry = 0, lastSent = ''
  const connect = (): void => {
    const ws = socket = new WebSocket(`${location.protocol === 'https:' ? 'wss' : 'ws'}://${location.host}/socket`)
    ws.onopen = () => { if (socket === ws) { retry = 0; lastSent = ''; ws.send(JSON.stringify({ type: 'space-join', ...where })) } }
    ws.onmessage = (event: MessageEvent<string>) => {
      if (socket !== ws) return
      let frame: Record<string, unknown>
      try { frame = JSON.parse(event.data) as Record<string, unknown> } catch { return }
      if (frame['type'] === 'heartbeat') { if (ws.readyState === 1) ws.send('{"type":"heartbeat-ack"}'); return }
      if (frame['type'] === 'space-room') listener.room(frame as unknown as SpaceRoomFrame)
      else if (frame['type'] === 'space-peer') listener.peer(frame as unknown as SpacePeerFrame)
      else if (frame['type'] === 'error' && typeof frame['reason'] === 'string' && /^(space_|world_|visit_|not_admitted|home_)/.test(String(frame['code']))) listener.problem(frame['reason'])
    }
    ws.onclose = () => {
      if (socket !== ws || left) return
      socket = null
      // Back after a short wait, longer each time, so a dropped signal does not leave the walker alone for good.
      retry = Math.min(retry + 1, 5)
      window.setTimeout(() => { if (!left) connect() }, 1000 * retry * retry)
    }
  }
  connect()
  return {
    send(tick) {
      if (!socket || socket.readyState !== 1) return
      const text = JSON.stringify({ type: 'space-tick', ...tick })
      // Nothing changed: nothing sent.
      if (text === lastSent) return
      lastSent = text
      socket.send(text)
    },
    leave() {
      left = true
      if (socket && socket.readyState === 1) socket.send('{"type":"space-leave"}')
      socket?.close()
      socket = null
    },
  }
}
