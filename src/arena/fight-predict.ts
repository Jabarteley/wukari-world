/**
 * OWNER: games (real-time)
 * Client-side prediction for the player's OWN fighter, so Fight feels immediate on a slow connection. The server stays the only
 * judge: this only decides what to DRAW for your own fighter between snapshots.
 *
 *  - Movement: your fighter walks the moment you press, at the server's speed, and is pulled back to the server's position
 *    once the server has caught up with everything you sent (the `a` acks of the snapshots). While inputs are still in flight
 *    it is trusted, unless it is far off (a collision or knockback), when it is eased toward the server.
 *  - Jump and attacks: the animation starts at the press (a jump arc, a punch or kick wind-up with the real move lengths) and
 *    runs on its own clock; a press made while your own last attack is still in recovery is ignored (the server would too).
 *    When the server says you were hit, the guess is dropped. The server's own copy of your attack, which arrives later, is
 *    hidden while the guess plays so it is not shown twice.
 */
import { ACT, BTN, MOVES, WALL_L, WALL_R } from './fight.ts'
import type { FighterSnap } from './fight.ts'

const TICK_MS = 50, WALK_PER_MS = 9 / TICK_MS, MIN_APART = 44, JUMP_V = 20, GRAVITY = 2.4

export class FightPredictor {
  private x: number | null = null
  private held = 0
  private lastNow = 0
  private lastN = 0
  private ackN = 0
  private readonly sentAt = new Map<number, number>()
  /** Smoothed round trip, ms. */
  rtt = 150
  private attack: { a: 1 | 2; at: number } | null = null
  private attackEnd = 0
  private jumpAt = -Infinity

  /** What is held right now (movement and block), at once. */
  hold(mask: number): void { this.held = mask }
  /** A tap: start the guess. `foeAct` is the opponent's action is not needed; `own` is the server's latest view of this fighter. */
  press(bits: number, now: number, own: FighterSnap | null): void {
    if (own && (own[3] === ACT.hurt || own[3] === ACT.ko)) return
    if ((bits & BTN.jump) && now - this.jumpAt > 16.7 * TICK_MS) this.jumpAt = now
    if (now >= this.attackEnd && (bits & (BTN.punch | BTN.kick))) {
      const a = bits & BTN.kick ? 2 : 1
      this.attack = { a, at: now }
      this.attackEnd = now + MOVES[a].total * TICK_MS
    }
  }
  /** An input frame with counter `n` went out. */
  sent(n: number, now: number): void { this.lastN = n; this.sentAt.set(n, now); if (this.sentAt.size > 64) this.sentAt.delete(this.sentAt.keys().next().value as number) }
  /** A snapshot frame carried this seat's ack. */
  acked(n: number, now: number): void {
    if (n <= this.ackN) return
    this.ackN = n
    const at = this.sentAt.get(n)
    if (at !== undefined) this.rtt = this.rtt * 0.8 + Math.max(0, now - at) * 0.2
    for (const key of this.sentAt.keys()) if (key <= n) this.sentAt.delete(key)
  }
  reset(): void { this.x = null; this.attack = null; this.attackEnd = 0; this.jumpAt = -Infinity; this.held = 0 }

  /** The own fighter to draw now, from the server's newest view of it and of the opponent's x. */
  frame(now: number, server: FighterSnap, foeX: number): FighterSnap {
    const dt = this.lastNow ? Math.min(100, Math.max(0, now - this.lastNow)) : 0
    this.lastNow = now
    if (this.x === null) this.x = server[0]
    const hurt = server[3] === ACT.hurt || server[3] === ACT.ko
    if (hurt) { this.attack = null; this.jumpAt = -Infinity; this.attackEnd = 0 }
    const attacking = this.attack !== null && now - this.attack.at < MOVES[this.attack.a].total * TICK_MS
    if (!attacking) this.attack = null
    const air = now - this.jumpAt < 16.7 * TICK_MS || server[6] & 2
    if (hurt) this.x += (server[0] - this.x) * Math.min(1, dt / 50)
    else {
      const dir = (this.held & BTN.right ? 1 : 0) - (this.held & BTN.left ? 1 : 0)
      const blocking = !air && (this.held & BTN.block) !== 0
      if (dir && !blocking && !attacking) this.x += dir * WALK_PER_MS * dt
      this.x = Math.max(WALL_L, Math.min(WALL_R, this.x))
      const gap = this.x - foeX
      if (Math.abs(gap) < MIN_APART) this.x = foeX + (gap >= 0 ? 1 : -1) * MIN_APART
      this.x = Math.max(WALL_L, Math.min(WALL_R, this.x))
      const settled = this.ackN >= this.lastN
      const err = server[0] - this.x
      if (settled) this.x += err * Math.min(1, dt / 120)
      else if (Math.abs(err) > 140) this.x += err * Math.min(1, dt / 100)
    }
    const flight = (now - this.jumpAt) / TICK_MS
    const jumping = flight >= 0 && flight < 16.7 && !hurt
    const y = jumping ? Math.max(0, JUMP_V * flight - (GRAVITY / 2) * flight * flight) : server[1]
    let a = server[3], at = server[4]
    if (this.attack) { a = this.attack.a; at = Math.floor((now - this.attack.at) / TICK_MS) }
    else if ((a === ACT.punch || a === ACT.kick) && now < this.attackEnd + this.rtt + 150) { a = ACT.none; at = 0 }
    const face = hurt || air ? server[2] : foeX >= this.x ? 1 : 0
    const blk = !hurt && !air && !attacking && (this.held & BTN.block) !== 0 ? 1 : 0
    return [this.x, y, face, a, at, server[5], blk | (jumping ? 2 : 0)]
  }
}
