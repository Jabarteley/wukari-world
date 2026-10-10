/**
 * The open-mode clock: server time runs `speed` times faster than the real one, so a flight, a shift or a cooldown that
 * takes minutes takes seconds. Game time is saved beside the data so a restart carries on from where it was (it never goes
 * back: lives saved at a later time than the clock would otherwise read are not settled backwards).
 */
import { readFileSync, writeFileSync } from 'node:fs';

export interface OpenClock { now(): number; save(): void; stop(): void }

export function openClock({ base, speed, file }: { base: () => number; speed: number; file: string | null }): OpenClock {
  const start = base();
  let saved = 0;
  if (file) { try { const at = Number((JSON.parse(readFileSync(file, 'utf8')) as { at?: unknown }).at); if (Number.isFinite(at)) saved = at; } catch { /* first run */ } }
  const origin = Math.max(start, saved);
  const now = (): number => Math.floor(origin + (base() - start) * speed);
  const save = (): void => { if (file) { try { writeFileSync(file, JSON.stringify({ at: now() })); } catch { /* the folder is gone: nothing to carry over */ } } };
  save();
  const timer = file ? setInterval(save, 2000) : null;
  timer?.unref();
  return { now, save, stop: () => { if (timer) clearInterval(timer); save(); } };
}
