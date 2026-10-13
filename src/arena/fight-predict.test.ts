// OWNER: games (real-time) — what the client draws for its own fighter before the server confirms.
import test from 'node:test'
import assert from 'node:assert/strict'
import { FightPredictor } from './fight-predict.ts'
import { ACT, BTN, MOVES } from './fight.ts'
import type { FighterSnap } from './fight.ts'

const idle = (x = 300): FighterSnap => [x, 0, 1, ACT.none, 0, 100, 0]

test('walking starts at once at the server speed and is not pulled back while inputs are in flight', () => {
  const p = new FightPredictor()
  p.frame(0, idle(), 700)
  p.hold(BTN.right); p.sent(1, 0)
  let f = idle()
  for (let t = 16; t <= 700; t += 16) f = p.frame(t, idle(), 700)
  assert.ok(f[0] > 300 + 110 && f[0] < 300 + 140, String(f[0]))
})

test('once the server has acked everything the fighter eases to the server position', () => {
  const p = new FightPredictor()
  p.frame(0, idle(), 900); p.hold(BTN.right); p.sent(1, 0)
  for (let t = 16; t <= 320; t += 16) p.frame(t, idle(), 900)
  p.hold(0); p.sent(2, 320); p.acked(2, 400)
  let f = idle()
  for (let t = 336; t <= 1200; t += 16) f = p.frame(t, idle(380), 900)
  assert.ok(Math.abs(f[0] - 380) < 1, String(f[0]))
  assert.ok(p.rtt > 100 && p.rtt < 160)
})

test('walls and the opponent stop the guess', () => {
  const p = new FightPredictor()
  p.frame(0, idle(50), 400); p.hold(BTN.left); p.sent(1, 0)
  let f = idle()
  for (let t = 16; t < 2000; t += 16) f = p.frame(t, idle(50), 400)
  assert.equal(f[0], 40)
  const q = new FightPredictor()
  q.frame(0, idle(300), 360); q.hold(BTN.right); q.sent(1, 0)
  for (let t = 16; t < 1000; t += 16) f = q.frame(t, idle(300), 360)
  assert.ok(360 - f[0] >= 43.9)
})

test('an attack animation starts at the press, ends at the real move length, and is not repeated from the server copy', () => {
  const p = new FightPredictor()
  p.frame(0, idle(), 600)
  p.press(BTN.punch, 10, idle())
  assert.equal(p.frame(20, idle(), 600)[3], ACT.punch)
  assert.equal(p.frame(10 + 3 * 50 + 5, idle(), 600)[4], 3)
  // The server's own punch arrives late (shown as a=punch) after the guess has ended: hidden.
  const end = 10 + MOVES[1].total * 50
  const late: FighterSnap = [300, 0, 1, ACT.punch, 3, 100, 0]
  assert.equal(p.frame(end + 20, late, 600)[3], ACT.none)
  // After the grace window the server's state is shown.
  assert.equal(p.frame(end + 2000, late, 600)[3], ACT.punch)
})

test('a press during your own recovery is ignored; being hit drops the guess', () => {
  const p = new FightPredictor()
  p.frame(0, idle(), 600)
  p.press(BTN.kick, 0, idle())
  p.press(BTN.punch, 100, idle())
  assert.equal(p.frame(120, idle(), 600)[3], ACT.kick)
  const hurt: FighterSnap = [290, 0, 1, ACT.hurt, 0, 90, 0]
  assert.equal(p.frame(140, hurt, 600)[3], ACT.hurt)
})

test('a jump arcs up and lands on its own clock', () => {
  const p = new FightPredictor()
  p.frame(0, idle(), 600); p.press(BTN.jump, 0, idle())
  const peak = Math.max(...[100, 200, 300, 400, 500, 600].map((t) => p.frame(t, idle(), 600)[1]))
  assert.ok(peak > 60 && peak < 100, String(peak))
  assert.equal(p.frame(1000, idle(), 600)[1], 0)
})
