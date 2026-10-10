// The life layer on top of the shipped clips: blinking, breathing, weight shift, look-at, moods and talking.
// Everything is applied after the clip is sampled, so it never accumulates.
import * as THREE from 'three';
import type { Rig } from './character.ts';

export type Mood = 'happy' | 'neutral' | 'uneasy';
type Weights = Record<string, number>;

const MOODS: Record<Mood, { mouth: Weights; brows: Weights; lids: Weights; head: [number, number]; spine: number; shoulders: number }> = {
  happy: { mouth: { smile: 0.85 }, brows: { browUp: 0.35 }, lids: { squint: 0.45 }, head: [0.03, 0.04], spine: -0.01, shoulders: 0 },
  neutral: { mouth: { mm: 0.18 }, brows: {}, lids: {}, head: [0, 0], spine: 0, shoulders: 0 },
  uneasy: { mouth: { frown: 0.8, mm: 0.1 }, brows: { browWorry: 0.95 }, lids: { wide: 0.35 }, head: [0.07, -0.05], spine: 0.045, shoulders: 0.05 },
};
/** The mouth shape of a character of text. */
const VISEME: Record<string, string> = { a: 'aa', e: 'ee', i: 'ee', o: 'oh', u: 'oh', y: 'ee', m: 'mm', b: 'mm', p: 'mm' };

export interface TalkCue { at: number; shape: string; amount: number; length: number }
export function cuesFor(text: string, pace = 0.085): TalkCue[] {
  const cues: TalkCue[] = [];
  let t = 0;
  for (const ch of text.toLowerCase()) {
    if (ch === ' ') { cues.push({ at: t, shape: 'mm', amount: 0.15, length: pace * 0.8 }); t += pace * 0.8; continue; }
    if (/[.,!?]/.test(ch)) { cues.push({ at: t, shape: 'mm', amount: 0, length: pace * 3 }); t += pace * 3; continue; }
    const shape = VISEME[ch];
    if (shape) { cues.push({ at: t, shape, amount: shape === 'mm' ? 0.9 : 0.55 + 0.4 * ((ch.charCodeAt(0) * 7) % 5) / 4, length: pace * (shape === 'mm' ? 0.9 : 1.25) }); t += pace * (shape === 'mm' ? 0.9 : 1.25); }
    else { cues.push({ at: t, shape: 'ee', amount: 0.22, length: pace * 0.75 }); t += pace * 0.75; }
  }
  return cues;
}

export class LifeDriver {
  rig: Rig;
  time = 0;
  mood: Mood = 'neutral';
  blinkAt = 1.4; blinkStart = -10; doubleBlink = false;
  /** Forced values for deterministic frames (a number replaces the automatic one). */
  forceBlink: number | null = null;
  target: THREE.Vector3 | null = null;
  talk: { cues: TalkCue[]; start: number } | null = null;
  forceViseme: { shape: string; amount: number } | null = null;
  enabled = { blink: true, breathe: true, shift: true, look: true };
  private smooth = new Map<string, number>();
  private gaze = new THREE.Vector2();
  private headAngles = new THREE.Vector2();
  private seed = 1;
  private base: { p: THREE.Vector3; q: THREE.Quaternion; s: THREE.Vector3 }[] = [];
  private clip: THREE.AnimationAction | null = null;
  playing = false;
  private lastHead = new THREE.Vector3(); private lag = new THREE.Vector3(); private hasLast = false;

  constructor(rig: Rig, seed = 1) { this.rig = rig; this.seed = seed; this.blinkAt = 1.2 + this.rand(0) * 2.5; }
  private rand(n: number): number { const x = Math.sin((this.seed + n) * 12.9898) * 43758.5453; return x - Math.floor(x); }

  /** Samples a clip at a time (or plays it on from there) and keeps that pose as the base the life layer is added to. */
  setClip(name: string, time: number, play: boolean): void {
    for (const a of this.rig.actions.values()) a.stop();
    const key = this.rig.look.body === 'female' && this.rig.actions.has(`${name}-female`) ? `${name}-female` : name;
    const action = this.rig.actions.get(key)!;
    action.play(); action.paused = true; action.time = time; this.clip = action; this.playing = play;
    this.sample();
  }
  private sample(): void {
    this.rig.mixer.update(0);
    this.base = this.rig.scene.getObjectByProperty('isBone', true) ? Object.values(this.rig.bones).map((b) => ({ p: b.position.clone(), q: b.quaternion.clone(), s: b.scale.clone() })) : [];
  }
  private restore(): void {
    Object.values(this.rig.bones).forEach((b, i) => { const r = this.base[i]; if (r && !b.name.startsWith('eye_')) { b.position.copy(r.p); b.quaternion.copy(r.q); b.scale.copy(r.s); } });
  }

  say(text: string): void { this.talk = { cues: cuesFor(text), start: this.time }; }
  get talking(): boolean { return !!this.talk && this.time - this.talk.start < this.talk.cues.reduce((e, c) => Math.max(e, c.at + c.length), 0) + 0.1; }

  private blinkAmount(): number {
    if (this.forceBlink !== null) return this.forceBlink;
    if (!this.enabled.blink) return 0;
    if (this.time >= this.blinkAt) { this.blinkStart = this.time; this.blinkAt = this.time + 2.2 + this.rand(this.time | 0) * 3.8; this.doubleBlink = this.rand(this.time * 3) > 0.78; }
    const p = this.time - this.blinkStart;
    const one = (q: number): number => q < 0 ? 0 : q < 0.07 ? q / 0.07 : q < 0.1 ? 1 : q < 0.2 ? 1 - (q - 0.1) / 0.1 : 0;
    return Math.max(one(p), this.doubleBlink ? one(p - 0.26) : 0);
  }

  private ease(name: string, target: number, dt: number, rate = 14): number {
    const cur = this.smooth.get(name) ?? 0;
    const next = cur + (target - cur) * (1 - Math.exp(-rate * dt));
    this.smooth.set(name, next); return next;
  }

  /** Call after the mixer has sampled the clip. */
  update(dt: number): void {
    this.time += dt;
    if (this.clip && this.playing) { this.clip.time = (this.clip.time + dt) % this.clip.getClip().duration; this.sample(); } else this.restore();
    const { bones, morphs } = this.rig;
    const t = this.time, mood = MOODS[this.mood];
    // --- face weights
    const mouthT: Weights = { ...mood.mouth };
    let talkPulse = 0;
    if (this.forceViseme) { mouthT[this.forceViseme.shape] = this.forceViseme.amount; mouthT['smile'] = (mouthT['smile'] ?? 0) * 0.35; mouthT['frown'] = (mouthT['frown'] ?? 0) * 0.35; talkPulse = this.forceViseme.amount; }
    else if (this.talk) {
      const local = t - this.talk.start;
      const cue = this.talk.cues.find((c) => local >= c.at && local < c.at + c.length);
      if (cue) {
        const q = (local - cue.at) / cue.length, env = Math.sin(Math.min(1, q) * Math.PI) ** 0.6;
        mouthT[cue.shape] = cue.amount * env; talkPulse = cue.amount * env;
        mouthT['smile'] = (mouthT['smile'] ?? 0) * 0.5; mouthT['frown'] = (mouthT['frown'] ?? 0) * 0.5; mouthT['mm'] = cue.shape === 'mm' ? cue.amount * env : 0;
      }
    }
    const lid: Weights = { ...mood.lids };
    lid['blink'] = this.blinkAmount();
    const brow: Weights = { ...mood.brows };
    if (talkPulse > 0.5) brow['browUp'] = Math.max(brow['browUp'] ?? 0, 0.15 + 0.2 * Math.sin(t * 3.1) ** 2);
    const apply = (mesh: THREE.SkinnedMesh | undefined, values: Weights, rate: number): void => {
      if (!mesh?.morphTargetDictionary) return;
      for (const [name, index] of Object.entries(mesh.morphTargetDictionary)) {
        const target = values[name] ?? 0;
        const rateFor = name === 'blink' ? 60 : rate;
        mesh.morphTargetInfluences![index] = this.ease(`${mesh.uuid}${name}`, target, dt, rateFor);
      }
    };
    apply(morphs.mouth, mouthT, this.talk || this.forceViseme ? 26 : 9);
    apply(morphs.lids, lid, 10);
    apply(morphs.brows, brow, 8);

    // --- body life: breathing, weight shift, mood posture
    const q = new THREE.Quaternion(), e = new THREE.Euler();
    // Rotations are given in the character's frame (x to its left, y up, z forward), whatever the bones' own axes are.
    this.rig.root.updateMatrixWorld(true);
    const rootInv = this.rig.root.getWorldQuaternion(new THREE.Quaternion()).invert();
    const pq = new THREE.Quaternion(), wq = new THREE.Quaternion();
    const addRot = (bone: THREE.Bone | undefined, x: number, y: number, z: number): void => {
      if (!bone || (x === 0 && y === 0 && z === 0)) return;
      bone.parent!.getWorldQuaternion(pq).premultiply(rootInv);
      wq.setFromEuler(e.set(x, y, z));
      bone.quaternion.premultiply(pq.clone().invert().multiply(wq).multiply(pq).normalize()); // = P^-1 R P * q
      bone.updateWorldMatrix(false, true);
    };
    // a narrower, more relaxed stance than the clip's
    const stance = this.rig.look.body === 'female' ? 0.15 : 0.13;
    addRot(bones['thigh_l'], 0, 0, -stance); addRot(bones['thigh_r'], 0, 0, stance);
    addRot(bones['calf_l'], 0, 0, stance * 0.6); addRot(bones['calf_r'], 0, 0, -stance * 0.6);
    if (this.enabled.breathe) {
      const b = Math.sin(t * 1.55 * Math.PI * 0.8 + this.seed), breath = b * 0.5 + 0.5;
      addRot(bones['spine_02'], -0.012 * breath, 0, 0); addRot(bones['spine_03'], -0.017 * breath, 0, 0); addRot(bones['neck_01'], 0.008 * breath, 0, 0);
      addRot(bones['clavicle_l'], 0, 0, 0.012 * breath); addRot(bones['clavicle_r'], 0, 0, -0.012 * breath);
      const chest = 1 + 0.012 * breath; bones['spine_03']?.scale.set(chest, 1, 1 + 0.01 * breath);
    }
    if (this.enabled.shift) {
      const s = Math.sin(t * 0.31 + this.seed) * 0.5 + Math.sin(t * 0.17 + 2 * this.seed) * 0.5;
      addRot(bones['pelvis'], 0, 0, 0.022 * s); addRot(bones['spine_01'], 0, 0, -0.012 * s); addRot(bones['spine_03'], 0, 0.01 * s, -0.01 * s);
      if (bones['pelvis']) bones['pelvis'].position.x += 0.006 * s;
    }
    const sp = this.ease('spine', mood.spine, dt, 4), sh = this.ease('shoulders', mood.shoulders, dt, 4);
    addRot(bones['spine_02'], sp, 0, 0); addRot(bones['spine_03'], sp * 0.8, 0, 0);
    addRot(bones['clavicle_l'], 0, 0, sh); addRot(bones['clavicle_r'], 0, 0, -sh);
    const mh0 = this.ease('headx', mood.head[0], dt, 4), mh1 = this.ease('heady', mood.head[1], dt, 4);

    // --- look-at: the head follows the target within limits, the eyes lead it and go further
    let wantYaw = 0, wantPitch = 0, eyeYaw = 0, eyePitch = 0;
    const head = bones['Head'];
    if (head && this.target && this.enabled.look) {
      this.rig.root.updateMatrixWorld(true);
      const local = head.parent!.worldToLocal(this.target.clone());
      const from = head.position;
      const d = local.sub(from);
      // the bones' local axes in this rig: the character looks along +z of the root, head local frame follows the clip's
      const yaw = Math.atan2(d.x, d.z), pitch = Math.atan2(d.y, Math.hypot(d.x, d.z));
      void yaw; void pitch;
      const rootInv = this.rig.root.matrixWorld.clone().invert();
      const hw = head.getWorldPosition(new THREE.Vector3());
      const dir = this.target.clone().applyMatrix4(rootInv).sub(hw.clone().applyMatrix4(rootInv));
      const ry = Math.atan2(dir.x, dir.z), rp = Math.atan2(dir.y, Math.hypot(dir.x, dir.z));
      const lim = (v: number, m: number): number => Math.max(-m, Math.min(m, v));
      wantYaw = lim(ry, 0.95); wantPitch = lim(-rp, 0.45);
      eyeYaw = lim(ry - this.headAngles.x * 0.7, 0.5); eyePitch = lim(-rp - this.headAngles.y * 0.7, 0.32);
    }
    this.headAngles.x += (wantYaw * 0.75 - this.headAngles.x) * (1 - Math.exp(-5 * dt));
    this.headAngles.y += (wantPitch * 0.7 - this.headAngles.y) * (1 - Math.exp(-5 * dt));
    this.gaze.x += (eyeYaw - this.gaze.x) * (1 - Math.exp(-22 * dt)); this.gaze.y += (eyePitch - this.gaze.y) * (1 - Math.exp(-22 * dt));
    const nod = this.talking ? Math.sin(t * 5.2) * 0.012 * talkPulse : 0;
    addRot(bones['neck_01'], this.headAngles.y * 0.35 + mh0 * 0.4 + nod, this.headAngles.x * 0.3, mh1 * 0.3);
    addRot(bones['Head'], this.headAngles.y * 0.65 + mh0 * 0.6 + nod, this.headAngles.x * 0.7, mh1 * 0.7);
    // eyes: the bones sit in the head's frame; pitch is about x, yaw about y
    for (const n of ['eye_l', 'eye_r']) { const b = bones[n]; if (b) { b.quaternion.setFromEuler(e.set(this.gaze.y * 0.9, this.gaze.x * 0.9, 0)); } }

    // --- hair sway: the head's own movement lags into the hair
    const hw = head ? head.getWorldPosition(new THREE.Vector3()) : this.lastHead;
    if (this.hasLast) this.lag.lerp(hw.clone().sub(this.lastHead).multiplyScalar(-1.2), 1 - Math.exp(-6 * dt)); this.hasLast = true;
    this.lastHead.copy(hw);
    this.rig.sway.uSway.value.set(THREE.MathUtils.clamp(this.lag.x, -0.012, 0.012), THREE.MathUtils.clamp(this.lag.y * 0.5, -0.008, 0.008), THREE.MathUtils.clamp(this.lag.z, -0.012, 0.012));
    this.rig.sway.uTime.value = t;
  }
}
